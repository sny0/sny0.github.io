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
constexpr std::array<BYTE, 8> expected{0x41, 0x42, 0x00, 0x0D, 0x0A, 0xE3, 0x81, 0x82};
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
class UniqueView {
public:
    explicit UniqueView(const void* address) noexcept : address_(address) {}
    ~UniqueView() noexcept {
        if (address_ && !UnmapViewOfFile(address_))
            cleanupError("UnmapViewOfFile", GetLastError());
    }
    UniqueView(const UniqueView&) = delete;
    UniqueView& operator=(const UniqueView&) = delete;
    const BYTE* bytes() const noexcept { return static_cast<const BYTE*>(address_); }
private:
    const void* address_;
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
        const std::wstring prefix = base + L"mapped-file-observation-"
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
void createFixture(OwnedFixture& fixture, DWORD granularity) {
    const HANDLE raw = CreateFileW(fixture.file().c_str(), GENERIC_WRITE, 0, nullptr,
        CREATE_NEW, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (raw == INVALID_HANDLE_VALUE) failApi("CreateFileW(CREATE_NEW)");
    const UniqueHandle file(raw);
    fixture.markFileOwned();
    // A small fully written file; no sparse-file assumptions or uninitialized bytes.
    std::vector<BYTE> bytes(static_cast<std::size_t>(granularity) + 32, 0);
    const std::size_t target = static_cast<std::size_t>(granularity) + 5;
    constexpr std::array<BYTE, 5> header{0x41, 0x42, 0x00, 0x0D, 0x0A};
    constexpr std::array<BYTE, 3> tail{0xE3, 0x81, 0x82};
    std::copy(header.begin(), header.end(), bytes.begin() + target);
    std::copy(tail.begin(), tail.end(), bytes.begin() + target + header.size());
    writeAll(file.get(), bytes);
}
LONGLONG fileLength(HANDLE file) {
    LARGE_INTEGER size{};
    if (!GetFileSizeEx(file, &size)) failApi("GetFileSizeEx");
    return size.QuadPart;
}
std::array<BYTE, 8> ordinaryRead(const std::wstring& path, DWORD granularity) {
    const HANDLE raw = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr,
        OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (raw == INVALID_HANDLE_VALUE) failApi("CreateFileW(ordinary read)");
    const UniqueHandle file(raw);
    check(fileLength(file.get()) == static_cast<LONGLONG>(granularity) + 32,
        "Unexpected file length");
    LARGE_INTEGER target{};
    target.QuadPart = static_cast<LONGLONG>(granularity) + 5;
    if (!SetFilePointerEx(file.get(), target, nullptr, FILE_BEGIN)) failApi("SetFilePointerEx");
    std::array<BYTE, 8> result{};
    std::size_t filled = 0;
    while (filled < result.size()) {
        DWORD actual = 0;
        if (!ReadFile(file.get(), result.data() + filled,
            static_cast<DWORD>(result.size() - filled), &actual, nullptr)) failApi("ReadFile");
        require(actual > 0 && actual <= result.size() - filled, "Unexpected short file");
        filled += actual;
    }
    check(result == expected, "Ordinary read differs from known bytes");
    return result;
}

// Keep SEH in a small leaf with no C++ objects requiring stack unwinding.
// Catch only an in-page error whose fault address is within this read range.
int mappedReadFilter(EXCEPTION_POINTERS* exception, const BYTE* source, SIZE_T count) noexcept {
    const EXCEPTION_RECORD* record = exception->ExceptionRecord;
    if (record->ExceptionCode != EXCEPTION_IN_PAGE_ERROR || record->NumberParameters < 2)
        return EXCEPTION_CONTINUE_SEARCH;
    const ULONG_PTR address = record->ExceptionInformation[1];
    const ULONG_PTR begin = reinterpret_cast<ULONG_PTR>(source);
    return address >= begin && address - begin < count
        ? EXCEPTION_EXECUTE_HANDLER : EXCEPTION_CONTINUE_SEARCH;
}
bool copyMappedBytes(const BYTE* source, BYTE* destination, SIZE_T count, DWORD* error) noexcept {
    __try {
        for (SIZE_T index = 0; index < count; ++index) destination[index] = source[index];
        return true;
    } __except (mappedReadFilter(GetExceptionInformation(), source, count)) {
        *error = GetExceptionCode();
        return false;
    }
}
std::array<BYTE, 8> mappedRead(const std::wstring& path, DWORD granularity) {
    const HANDLE raw = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr,
        OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (raw == INVALID_HANDLE_VALUE) failApi("CreateFileW(mapping)");
    const UniqueHandle file(raw);
    const UniqueHandle mapping(CreateFileMappingW(file.get(), nullptr, PAGE_READONLY, 0, 0, nullptr));
    if (!mapping.get()) failApi("CreateFileMappingW");

    const ULONGLONG offset = static_cast<ULONGLONG>(granularity) + 5;
    const ULONGLONG baseOffset = (offset / granularity) * granularity;
    const SIZE_T delta = static_cast<SIZE_T>(offset - baseOffset);
    const SIZE_T viewLength = delta + expected.size();
    check(baseOffset == granularity && delta == 5 && viewLength == 13,
        "Unexpected alignment calculation");
    const UniqueView view(MapViewOfFile(mapping.get(), FILE_MAP_READ,
        static_cast<DWORD>(baseOffset >> 32), static_cast<DWORD>(baseOffset), viewLength));
    if (!view.bytes()) failApi("MapViewOfFile");
    std::array<BYTE, 8> result{};
    DWORD exceptionCode = 0;
    if (!copyMappedBytes(view.bytes() + delta, result.data(), result.size(), &exceptionCode))
        throw Win32Failure{"mapped access (SEH exception code, not GetLastError)", exceptionCode};
    check(result == expected, "Mapped read differs from known bytes");
    std::printf("map_base_file_offset=%llu delta=%zu requested_view_bytes=%zu\n",
        baseOffset, delta, viewLength);
    return result; // Copy survives; pointers into the view do not escape.
}
void printBytes(const char* label, const std::array<BYTE, 8>& bytes) {
    std::printf("%s=", label);
    for (const BYTE value : bytes) std::printf(" %02X", static_cast<unsigned int>(value));
    std::printf("\n");
}
void run() {
    SYSTEM_INFO info{};
    GetSystemInfo(&info);
    // Bound this teaching fixture's allocation; do not hardcode G=65536.
    require(info.dwAllocationGranularity > 5 && info.dwAllocationGranularity <= 1024 * 1024,
        "Unsupported allocation granularity for this small fixture");
    require(info.dwPageSize > 0, "Invalid page size");
    std::printf("page_size=%lu allocation_granularity=%lu\n",
        static_cast<unsigned long>(info.dwPageSize), static_cast<unsigned long>(info.dwAllocationGranularity));
    std::printf("file_length=%llu target_file_offset=%llu requested_bytes=8\n",
        static_cast<ULONGLONG>(info.dwAllocationGranularity) + 32,
        static_cast<ULONGLONG>(info.dwAllocationGranularity) + 5);
    OwnedFixture fixture;
    // The directory owner stays alive until every view and handle has closed.
    createFixture(fixture, info.dwAllocationGranularity);
    const auto baseline = ordinaryRead(fixture.file(), info.dwAllocationGranularity);
    const auto mapped = mappedRead(fixture.file(), info.dwAllocationGranularity);
    check(baseline == mapped, "Ordinary and mapped bytes differ");
    printBytes("ordinary", baseline);
    printBytes("mapped", mapped);
    std::printf("pointer_escaped=false mapped_access_error_observed=false\n");
}
}

int main() {
    try {
        run();
        if (cleanupFailed) return 1;
        std::printf("cleanup=complete checks=%u PASS\n", checks);
        return 0;
    } catch (const Win32Failure& error) {
        std::fprintf(stderr, "FAIL: %s code=%lu\n", error.operation, static_cast<unsigned long>(error.code));
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
    }
    return 1;
}
