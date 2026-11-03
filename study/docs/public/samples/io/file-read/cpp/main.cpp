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
constexpr std::array<BYTE, 3> expectedAfterSeek{0xE3, 0x81, 0x82};

struct Win32Failure { const char* operation; DWORD code; };
[[noreturn]] void failApi(const char* operation) {
    const DWORD code = GetLastError();
    throw Win32Failure{operation, code};
}
void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
void check(bool condition, const char* message) {
    require(condition, message);
    ++checks;
}
void cleanupError(const char* operation, DWORD code) noexcept {
    cleanupFailed = true;
    std::fprintf(stderr, "CLEANUP FAIL: %s GetLastError=%lu\n", operation,
        static_cast<unsigned long>(code));
}

class UniqueHandle {
public:
    explicit UniqueHandle(HANDLE handle) noexcept : handle_(handle) {}
    ~UniqueHandle() noexcept {
        if (handle_ != INVALID_HANDLE_VALUE && !CloseHandle(handle_))
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
        const DWORD length = GetTempPathW(static_cast<DWORD>(buffer.size()), buffer.data());
        if (length == 0) failApi("GetTempPathW");
        if (length < buffer.size()) return std::wstring(buffer.data(), length);
        buffer.resize(static_cast<std::size_t>(length) + 1);
    }
    throw std::runtime_error("Temporary path kept changing");
}

class OwnedFixture {
public:
    OwnedFixture() {
        std::wstring base = tempPath();
        if (!base.empty() && base.back() != L'\\' && base.back() != L'/') base += L'\\';
        const std::wstring prefix = base + L"file-read-observation-"
            + std::to_wstring(GetCurrentProcessId()) + L"-" + std::to_wstring(GetTickCount64());
        for (unsigned int attempt = 0; attempt < 100; ++attempt) {
            directory_ = prefix + L"-" + std::to_wstring(attempt);
            // Complete all potentially allocating path work before creating the directory.
            file_ = directory_ + L"\\fixture.bin";
            missing_ = directory_ + L"\\missing.bin";
            if (CreateDirectoryW(directory_.c_str(), nullptr)) return;
            const DWORD code = GetLastError();
            if (code != ERROR_ALREADY_EXISTS) throw Win32Failure{"CreateDirectoryW", code};
        }
        throw std::runtime_error("Could not create an exclusive temporary directory");
    }
    ~OwnedFixture() noexcept {
        if (ownsFile_ && !DeleteFileW(file_.c_str())) cleanupError("DeleteFileW", GetLastError());
        // Never recurse and never delete a file that failed CREATE_NEW.
        if (!RemoveDirectoryW(directory_.c_str())) cleanupError("RemoveDirectoryW", GetLastError());
    }
    OwnedFixture(const OwnedFixture&) = delete;
    OwnedFixture& operator=(const OwnedFixture&) = delete;
    const std::wstring& file() const noexcept { return file_; }
    const std::wstring& missing() const noexcept { return missing_; }
    void markFileOwned() noexcept { ownsFile_ = true; }
private:
    std::wstring directory_;
    std::wstring file_;
    std::wstring missing_;
    bool ownsFile_ = false;
};

void writeAll(HANDLE file, std::span<const BYTE> bytes) {
    while (!bytes.empty()) {
        DWORD actual = 0;
        if (!WriteFile(file, bytes.data(), static_cast<DWORD>(bytes.size()), &actual, nullptr))
            failApi("WriteFile(fixture)");
        require(actual > 0 && actual <= bytes.size(), "Fixture write made invalid progress");
        bytes = bytes.subspan(actual);
    }
}

void createFixture(OwnedFixture& fixture) {
    const HANDLE raw = CreateFileW(fixture.file().c_str(), GENERIC_WRITE, 0, nullptr,
        CREATE_NEW, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (raw == INVALID_HANDLE_VALUE) failApi("CreateFileW(CREATE_NEW)");
    const UniqueHandle file(raw);
    fixture.markFileOwned();
    // Construct the file in segments; the independent expected array is above.
    constexpr std::array<BYTE, 5> header{0x41, 0x42, 0x00, 0x0D, 0x0A};
    constexpr std::array<BYTE, 3> utf8{0xE3, 0x81, 0x82};
    constexpr std::array<BYTE, 4> tail{0x10, 0x20, 0xFE, 0xFF};
    writeAll(file.get(), header);
    writeAll(file.get(), utf8);
    writeAll(file.get(), tail);
}

LONGLONG position(HANDLE file) {
    LARGE_INTEGER zero{};
    LARGE_INTEGER current{};
    if (!SetFilePointerEx(file, zero, &current, FILE_CURRENT)) failApi("SetFilePointerEx(query)");
    return current.QuadPart;
}
LONGLONG length(HANDLE file) {
    LARGE_INTEGER size{};
    if (!GetFileSizeEx(file, &size)) failApi("GetFileSizeEx");
    return size.QuadPart;
}
DWORD readAndPrint(HANDLE file, BYTE* buffer, DWORD requested, const char* label) {
    const LONGLONG before = position(file);
    DWORD actual = 0;
    if (!ReadFile(file, buffer, requested, &actual, nullptr)) failApi("ReadFile");
    const LONGLONG after = position(file);
    require(actual <= requested && after == before + actual, "Read count/position mismatch");
    std::printf("%s requested=%lu actual=%lu position=%lld->%lld hex=",
        label, static_cast<unsigned long>(requested), static_cast<unsigned long>(actual), before, after);
    if (actual == 0) std::printf("(empty)");
    for (DWORD index = 0; index < actual; ++index)
        std::printf("%s%02X", index == 0 ? "" : " ", static_cast<unsigned int>(buffer[index]));
    std::printf("\n");
    return actual;
}

void observe(const OwnedFixture& fixture) {
    const HANDLE raw = CreateFileW(fixture.file().c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr,
        OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (raw == INVALID_HANDLE_VALUE) failApi("CreateFileW(OPEN_EXISTING)");
    const UniqueHandle file(raw);
    check(length(file.get()) == 12, "Fixture length must be 12");
    check(position(file.get()) == 0, "Initial position must be zero");
    std::puts("file_length=12 app_buffer=5 synchronous=true OS_cache_allowed=true");

    std::array<BYTE, 5> buffer{};
    std::vector<BYTE> collected;
    collected.reserve(expected.size());
    bool sawEof = false;
    for (std::size_t call = 0; call <= expected.size(); ++call) {
        const DWORD actual = readAndPrint(file.get(), buffer.data(), static_cast<DWORD>(buffer.size()), "read");
        if (actual == 0) { sawEof = true; break; }
        require(collected.size() + actual <= expected.size(), "Read beyond fixture expectation");
        collected.insert(collected.end(), buffer.begin(), buffer.begin() + actual);
    }
    check(collected.size() == expected.size()
        && std::equal(collected.begin(), collected.end(), expected.begin()), "Sequential bytes mismatch");
    check(sawEof && position(file.get()) == 12, "EOF must return zero and keep position at length");

    LARGE_INTEGER offset{};
    offset.QuadPart = 5;
    LARGE_INTEGER moved{};
    if (!SetFilePointerEx(file.get(), offset, &moved, FILE_BEGIN)) failApi("SetFilePointerEx(seek)");
    check(moved.QuadPart == 5, "Seek must move to byte offset five");
    std::puts("seek offset=5");
    std::array<BYTE, 3> reread{};
    std::size_t total = 0;
    while (total < reread.size()) {
        const DWORD actual = readAndPrint(file.get(), reread.data() + total,
            static_cast<DWORD>(reread.size() - total), "seek_read");
        require(actual > 0, "Unexpected EOF during seek reread");
        total += actual;
    }
    check(reread == expectedAfterSeek && position(file.get()) == 8, "Seek bytes/position mismatch");
    check(length(file.get()) == 12, "Reading/seeking must not change file length");
    std::puts("after_seek file_length=12 position=8 reread_bytes=3");

    const HANDLE missingRaw = CreateFileW(fixture.missing().c_str(), GENERIC_READ, FILE_SHARE_READ,
        nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    const DWORD missingCode = missingRaw == INVALID_HANDLE_VALUE ? GetLastError() : ERROR_SUCCESS;
    const UniqueHandle missing(missingRaw);
    check(missingRaw == INVALID_HANDLE_VALUE && missingCode == ERROR_FILE_NOT_FOUND,
        "Missing file must fail with ERROR_FILE_NOT_FOUND");
    std::printf("missing_file rejected=true GetLastError=%lu\n", static_cast<unsigned long>(missingCode));
}
} // namespace

int main() {
    try {
        {
            OwnedFixture fixture;
            createFixture(fixture);
            observe(fixture);
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
