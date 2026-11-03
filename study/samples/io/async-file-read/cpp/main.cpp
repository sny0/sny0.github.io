#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>

#include <algorithm>
#include <array>
#include <cstdio>
#include <exception>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
unsigned int checks = 0;
bool cleanupFailed = false;
constexpr std::array<BYTE, 12> expected{
    0x41, 0x42, 0x00, 0x0D, 0x0A, 0xE3, 0x81, 0x82, 0x10, 0x20, 0xFE, 0xFF
};
struct Win32Failure { const char* operation; DWORD code; };
[[noreturn]] void failApi(const char* operation) {
    const DWORD code = GetLastError();
    throw Win32Failure{operation, code};
}
void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
void check(bool condition, const char* message) { require(condition, message); ++checks; }
void cleanupError(const char* operation, DWORD code) noexcept {
    cleanupFailed = true;
    std::fprintf(stderr, "CLEANUP FAIL: %s GetLastError=%lu\n", operation,
        static_cast<unsigned long>(code));
}
class UniqueHandle {
public:
    explicit UniqueHandle(HANDLE handle) noexcept : handle_(handle) {}
    ~UniqueHandle() noexcept {
        if (handle_ && handle_ != INVALID_HANDLE_VALUE && !CloseHandle(handle_))
            cleanupError("CloseHandle", GetLastError());
    }
    UniqueHandle(const UniqueHandle&) = delete;
    UniqueHandle& operator=(const UniqueHandle&) = delete;
    HANDLE get() const noexcept { return handle_; }
private:
    HANDLE handle_;
};

std::wstring tempPath() {
    std::vector<wchar_t> buffer(MAX_PATH + 1);
    for (unsigned int attempt = 0; attempt < 4; ++attempt) {
        const DWORD size = GetTempPathW(static_cast<DWORD>(buffer.size()), buffer.data());
        if (size == 0) failApi("GetTempPathW");
        if (size < buffer.size()) return std::wstring(buffer.data(), size);
        buffer.resize(static_cast<std::size_t>(size) + 1);
    }
    throw std::runtime_error("Temporary path kept changing");
}
class OwnedFixture {
public:
    OwnedFixture() {
        std::wstring base = tempPath();
        if (!base.empty() && base.back() != L'\\' && base.back() != L'/') base += L'\\';
        const std::wstring prefix = base + L"async-file-read-observation-"
            + std::to_wstring(GetCurrentProcessId()) + L"-" + std::to_wstring(GetTickCount64());
        for (unsigned int attempt = 0; attempt < 100; ++attempt) {
            directory_ = prefix + L"-" + std::to_wstring(attempt);
            file_ = directory_ + L"\\fixture.bin"; // Allocate before creating the directory.
            if (CreateDirectoryW(directory_.c_str(), nullptr)) return;
            const DWORD code = GetLastError();
            if (code != ERROR_ALREADY_EXISTS) throw Win32Failure{"CreateDirectoryW", code};
        }
        throw std::runtime_error("Could not create an exclusive temporary directory");
    }
    ~OwnedFixture() noexcept {
        if (ownsFile_ && !DeleteFileW(file_.c_str())) cleanupError("DeleteFileW", GetLastError());
        if (!RemoveDirectoryW(directory_.c_str())) cleanupError("RemoveDirectoryW", GetLastError());
    }
    OwnedFixture(const OwnedFixture&) = delete;
    OwnedFixture& operator=(const OwnedFixture&) = delete;
    const std::wstring& file() const noexcept { return file_; }
    void markFileOwned() noexcept { ownsFile_ = true; }
private:
    std::wstring directory_;
    std::wstring file_;
    bool ownsFile_ = false;
};
void writeAll(HANDLE file, std::span<const BYTE> bytes) {
    while (!bytes.empty()) {
        DWORD actual = 0;
        if (!WriteFile(file, bytes.data(), static_cast<DWORD>(bytes.size()), &actual, nullptr))
            failApi("WriteFile(fixture)");
        require(actual > 0 && actual <= bytes.size(), "Invalid fixture write progress");
        bytes = bytes.subspan(actual);
    }
}
void createFixture(OwnedFixture& fixture) {
    const HANDLE raw = CreateFileW(fixture.file().c_str(), GENERIC_WRITE, 0, nullptr,
        CREATE_NEW, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (raw == INVALID_HANDLE_VALUE) failApi("CreateFileW(CREATE_NEW)");
    const UniqueHandle file(raw);
    fixture.markFileOwned();
    constexpr std::array<BYTE, 5> header{0x41, 0x42, 0x00, 0x0D, 0x0A};
    constexpr std::array<BYTE, 3> utf8{0xE3, 0x81, 0x82};
    constexpr std::array<BYTE, 4> tail{0x10, 0x20, 0xFE, 0xFF};
    writeAll(file.get(), header);
    writeAll(file.get(), utf8);
    writeAll(file.get(), tail);
}
LONGLONG fileLength(HANDLE file) {
    LARGE_INTEGER size{};
    if (!GetFileSizeEx(file, &size)) failApi("GetFileSizeEx");
    return size.QuadPart;
}
LONGLONG syncPosition(HANDLE file) {
    LARGE_INTEGER zero{};
    LARGE_INTEGER position{};
    if (!SetFilePointerEx(file, zero, &position, FILE_CURRENT)) failApi("SetFilePointerEx");
    return position.QuadPart;
}
DWORD shortCalculation(DWORD seed) noexcept {
    DWORD checksum = seed;
    for (DWORD value = 1; value <= 64; ++value) checksum += value;
    return checksum;
}
struct ReadResult {
    DWORD actual = 0;
    DWORD checksum = 0;
    const char* submission = "sync";
    bool eofAtResult = false;
};

ReadResult readOverlapped(HANDLE file, BYTE* buffer, DWORD requested, DWORD offset) {
    const UniqueHandle event(CreateEventW(nullptr, TRUE, FALSE, nullptr));
    if (!event.get()) failApi("CreateEventW");
    OVERLAPPED operation{}; // New operation and unsignaled manual-reset event per request.
    operation.Offset = offset;
    operation.OffsetHigh = 0; // The fixture is only 12 bytes.
    operation.hEvent = event.get();
    ReadResult result;

    const BOOL immediate = ReadFile(file, buffer, requested, nullptr, &operation);
    const DWORD submitCode = immediate ? ERROR_SUCCESS : GetLastError();
    if (!immediate && submitCode != ERROR_IO_PENDING && submitCode != ERROR_HANDLE_EOF)
        throw Win32Failure{"ReadFile(overlapped submit)", submitCode};

    // While a request can be pending: no allocation, logging, validation, throwing,
    // buffer access or OVERLAPPED reuse. Only this noexcept integer calculation.
    result.checksum = shortCalculation(offset);
    if (immediate || submitCode == ERROR_IO_PENDING) {
        // This deliberately blocks. File/event handles stay private and valid;
        // nobody manually signals the event. Collect before any throwing work.
        const BOOL completed = GetOverlappedResult(file, &operation, &result.actual, TRUE);
        const DWORD completionCode = completed ? ERROR_SUCCESS : GetLastError();
        if (!completed && completionCode != ERROR_HANDLE_EOF)
            throw Win32Failure{"GetOverlappedResult", completionCode};
        if (completionCode == ERROR_HANDLE_EOF) {
            result.actual = 0;
            result.eofAtResult = true;
        }
        result.submission = immediate ? "immediate" : "pending";
    } else {
        result.submission = "eof"; // Synchronous EOF error at submission, no request pending.
    }
    return result; // Operation/event/buffer are no longer needed by this request.
}

std::vector<BYTE> readAll(const std::wstring& path, bool overlapped) {
    const char* label = overlapped ? "async" : "sync";
    const DWORD flags = FILE_ATTRIBUTE_NORMAL | (overlapped ? FILE_FLAG_OVERLAPPED : 0);
    const HANDLE raw = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr,
        OPEN_EXISTING, flags, nullptr);
    if (raw == INVALID_HANDLE_VALUE) failApi("CreateFileW(read)");
    const UniqueHandle file(raw);
    check(fileLength(file.get()) == 12, "Fixture length mismatch");
    std::printf("phase=%s file_length=12 app_buffer=5\n", label);
    std::vector<BYTE> collected;
    collected.reserve(expected.size());
    std::array<BYTE, 5> buffer{};
    DWORD offset = 0;
    bool eof = false;
    for (std::size_t call = 0; call <= expected.size(); ++call) {
        ReadResult result;
        if (overlapped) {
            result = readOverlapped(file.get(), buffer.data(), static_cast<DWORD>(buffer.size()), offset);
            require(result.checksum == offset + 2080, "Short calculation checksum mismatch");
        } else {
            require(syncPosition(file.get()) == offset, "Synchronous start position mismatch");
            if (!ReadFile(file.get(), buffer.data(), static_cast<DWORD>(buffer.size()), &result.actual, nullptr))
                failApi("ReadFile(sync)");
            require(syncPosition(file.get()) == static_cast<LONGLONG>(offset) + result.actual,
                "Synchronous end position mismatch");
        }
        // All request storage is safe to inspect/reuse now.
        require(result.actual <= buffer.size() && offset + result.actual <= expected.size(),
            "Read bounds mismatch");
        std::printf("%s offset=%lu requested=5 actual=%lu submit=%s eof_result=%s checksum=%lu hex=",
            label, static_cast<unsigned long>(offset), static_cast<unsigned long>(result.actual),
            result.submission, result.eofAtResult ? "true" : "false",
            static_cast<unsigned long>(result.checksum));
        if (result.actual == 0) std::printf("(empty)");
        for (DWORD index = 0; index < result.actual; ++index)
            std::printf("%s%02X", index == 0 ? "" : " ", static_cast<unsigned int>(buffer[index]));
        std::printf("\n");
        if (result.actual == 0) { eof = true; break; }
        collected.insert(collected.end(), buffer.begin(), buffer.begin() + result.actual);
        offset += result.actual;
    }
    check(collected.size() == expected.size()
        && std::equal(collected.begin(), collected.end(), expected.begin()), "Fixture bytes mismatch");
    check(eof && offset == 12 && fileLength(file.get()) == 12, "EOF/offset/length mismatch");
    return collected;
}
} // namespace

int main() {
    try {
        {
            OwnedFixture fixture;
            createFixture(fixture);
            const auto sync = readAll(fixture.file(), false);
            const auto async = readAll(fixture.file(), true);
            check(sync == async, "Synchronous/asynchronous result mismatch");
            std::printf("sync_bytes=%zu async_bytes=%zu match=true\n", sync.size(), async.size());
        }
        if (cleanupFailed) return 1;
        std::printf("cleanup=complete PASS: %u checks\n", checks);
        return 0;
    } catch (const Win32Failure& error) {
        std::fprintf(stderr, "FAIL: %s GetLastError=%lu\n", error.operation,
            static_cast<unsigned long>(error.code));
        return 1;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    }
}
