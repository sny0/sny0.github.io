#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <memory>
#include <numeric>
#include <string_view>

constexpr wchar_t fixture[] = L"study-io-fixture.bin";
constexpr DWORD block_size = 1024 * 1024;
constexpr DWORD block_count = 64;
constexpr LONGLONG fixture_size = static_cast<LONGLONG>(block_size) * block_count;

class File {
public:
    explicit File(HANDLE handle) : handle_(handle) {}
    ~File() { if (valid()) CloseHandle(handle_); }
    File(const File&) = delete;
    File& operator=(const File&) = delete;
    bool valid() const { return handle_ != INVALID_HANDLE_VALUE; }
    HANDLE get() const { return handle_; }

private:
    HANDLE handle_;
};

int fail(const char* operation, DWORD error) {
    std::fprintf(stderr, "%s failed (Windows error %lu)\n", operation, error);
    return 1;
}

int prepare(std::uint8_t* buffer) {
    const File file{CreateFileW(fixture, GENERIC_WRITE, 0, nullptr, CREATE_NEW,
                                FILE_ATTRIBUTE_NORMAL, nullptr)};
    if (!file.valid()) return fail("CreateFileW (prepare)", GetLastError());

    std::uint32_t state = 0x12345678;
    std::uint64_t checksum = 0;
    for (DWORD block = 0; block < block_count; ++block) {
        std::generate_n(buffer, block_size, [&] {
            // Deterministic test data with few repeated runs of bytes.
            state ^= state << 13;
            state ^= state >> 17;
            state ^= state << 5;
            return static_cast<std::uint8_t>(state);
        });
        DWORD written = 0;
        if (!WriteFile(file.get(), buffer, block_size, &written, nullptr)) {
            return fail("WriteFile", GetLastError());
        }
        if (written != block_size) {
            std::fputs("Short write: prepare did not finish.\n", stderr);
            return 1;
        }
        checksum = std::accumulate(buffer, buffer + block_size, checksum);
    }
    if (!FlushFileBuffers(file.get())) return fail("FlushFileBuffers", GetLastError());
    std::printf("prepared study-io-fixture.bin bytes=%lld checksum=%llu\n", fixture_size,
                static_cast<unsigned long long>(checksum));
    return 0;
}

void log_marker(DWORD pass, const char* phase) {
    SYSTEMTIME utc{};
    GetSystemTime(&utc);
    std::printf("%04hu-%02hu-%02huT%02hu:%02hu:%02hu.%03huZ pid=%lu pass=%lu %s\n",
                utc.wYear, utc.wMonth, utc.wDay, utc.wHour, utc.wMinute,
                utc.wSecond, utc.wMilliseconds, GetCurrentProcessId(), pass, phase);
    std::fflush(stdout);
}

bool aligned(std::uintptr_t value, DWORD unit) {
    return unit != 0 && value % unit == 0;
}

int read_twice(std::uint8_t* buffer, bool unbuffered) {
    const DWORD flags = unbuffered ? FILE_FLAG_NO_BUFFERING : FILE_ATTRIBUTE_NORMAL;
    const File file{CreateFileW(fixture, GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING,
                                flags, nullptr)};
    if (!file.valid()) return fail("CreateFileW (read)", GetLastError());
    LARGE_INTEGER size{};
    if (!GetFileSizeEx(file.get(), &size)) return fail("GetFileSizeEx", GetLastError());
    if (size.QuadPart != fixture_size) {
        std::fputs("Expected a 64 MiB fixture. Run prepare in a new working folder.\n", stderr);
        return 1;
    }
    if (unbuffered) {
        FILE_STORAGE_INFO info{};
        if (!GetFileInformationByHandleEx(file.get(), FileStorageInfo, &info, sizeof(info))) {
            return fail("GetFileInformationByHandleEx (FileStorageInfo)", GetLastError());
        }
        const auto address = reinterpret_cast<std::uintptr_t>(buffer);
        // All offsets are multiples of block_size, starting at zero.
        if (!aligned(block_size, info.LogicalBytesPerSector) ||
            !aligned(address, info.PhysicalBytesPerSectorForPerformance) ||
            !aligned(address, info.PhysicalBytesPerSectorForAtomicity)) {
            std::fputs("Storage alignment does not fit this fixture. Use buffered mode.\n", stderr);
            return 1;
        }
    }

    using Clock = std::chrono::steady_clock;
    std::uint64_t first_checksum = 0;
    for (DWORD pass = 1; pass <= 2; ++pass) {
        LARGE_INTEGER start{};
        if (!SetFilePointerEx(file.get(), start, nullptr, FILE_BEGIN)) {
            return fail("SetFilePointerEx", GetLastError());
        }
        Clock::duration time_in_reads{};
        std::uint64_t checksum = 0;
        std::uint64_t bytes = 0;
        log_marker(pass, "begin");
        for (DWORD call = 0; call < block_count; ++call) {
            DWORD received = 0;
            const auto before = Clock::now();
            if (!ReadFile(file.get(), buffer, block_size, &received, nullptr)) {
                return fail("ReadFile", GetLastError());
            }
            time_in_reads += Clock::now() - before;
            if (received != block_size) {
                std::fputs("Short read: expected a complete 1 MiB block.\n", stderr);
                return 1;
            }
            bytes += received;
            checksum = std::accumulate(buffer, buffer + received, checksum);
        }
        log_marker(pass, "end");
        const auto milliseconds = std::chrono::duration<double, std::milli>(time_in_reads).count();
        std::printf("pass=%lu mode=%s calls=%lu bytes=%llu checksum=%llu read_ms=%.3f\n",
                    pass, unbuffered ? "unbuffered" : "buffered", block_count,
                    static_cast<unsigned long long>(bytes),
                    static_cast<unsigned long long>(checksum), milliseconds);
        std::fflush(stdout);
        if (pass == 1) {
            first_checksum = checksum;
            Sleep(750);  // Separate the passes in the trace, outside the read timings.
        } else if (checksum != first_checksum) {
            std::fputs("The two checksums differ.\n", stderr);
            return 1;
        }
    }
    return 0;
}

int main(int argc, char** argv) {
    const std::string_view verb = argc >= 2 ? argv[1] : "";
    const std::string_view mode = argc == 3 ? argv[2] : "buffered";
    const bool preparing = argc == 2 && verb == "prepare";
    const bool reading = (argc == 2 || argc == 3) && verb == "read" &&
                         (mode == "buffered" || mode == "unbuffered");
    if (!preparing && !reading) {
        std::fputs("Usage: file_io_trace prepare | read [buffered|unbuffered]\n", stderr);
        return 2;
    }
    const auto free_buffer = [](std::uint8_t* p) { VirtualFree(p, 0, MEM_RELEASE); };
    const std::unique_ptr<std::uint8_t, decltype(free_buffer)> buffer{
        static_cast<std::uint8_t*>(VirtualAlloc(nullptr, block_size, MEM_RESERVE | MEM_COMMIT,
                                                PAGE_READWRITE)), free_buffer};
    if (!buffer) return fail("VirtualAlloc", GetLastError());
    return preparing ? prepare(buffer.get()) : read_twice(buffer.get(), mode == "unbuffered");
}
