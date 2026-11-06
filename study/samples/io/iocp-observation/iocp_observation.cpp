#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <array>
#include <cstddef>
#include <exception>
#include <iostream>

class Handle {
public:
    explicit Handle(HANDLE value = nullptr) : value_(value) {}
    ~Handle() { if (valid()) CloseHandle(value_); }
    Handle(const Handle&) = delete;
    Handle& operator=(const Handle&) = delete;
    HANDLE get() const { return value_; }
    bool valid() const { return value_ != nullptr && value_ != INVALID_HANDLE_VALUE; }

private:
    HANDLE value_;
};

struct Request {
    OVERLAPPED overlapped{};  // The zero offset means the start of the file.
    char data[2]{};
    Handle event{CreateEventW(nullptr, TRUE, FALSE, nullptr)};
    bool submitted = false;
    bool received = false;
};

int fail(const char* where, DWORD error) {
    std::cerr << where << ": Windows error " << error << '\n';
    return 1;
}

int main() {
    std::array<wchar_t, 32768> path{};
    const auto capacity = static_cast<DWORD>(path.size());
    const DWORD length = GetModuleFileNameW(nullptr, path.data(), capacity);
    if (length == 0) return fail("GetModuleFileNameW", GetLastError());
    if (length >= capacity) return fail("GetModuleFileNameW", ERROR_INSUFFICIENT_BUFFER);

    const Handle port{CreateIoCompletionPort(INVALID_HANDLE_VALUE, nullptr, 0, 1)};
    if (!port.valid()) return fail("CreateIoCompletionPort (create)", GetLastError());
    const Handle file{CreateFileW(path.data(), GENERIC_READ, FILE_SHARE_READ, nullptr,
                                 OPEN_EXISTING, FILE_FLAG_OVERLAPPED, nullptr)};
    if (!file.valid()) return fail("CreateFileW", GetLastError());
    constexpr ULONG_PTR file_key = 42;
    if (!CreateIoCompletionPort(file.get(), port.get(), file_key, 0)) {
        return fail("CreateIoCompletionPort (associate)", GetLastError());
    }

    std::array<Request, 2> requests{};
    for (auto& request : requests) {
        if (!request.event.valid()) {
            std::cerr << "Could not create a request event\n";
            return 1;
        }
        // Keep the low bit clear: this event does not suppress the IOCP packet.
        request.overlapped.hEvent = request.event.get();
    }

    std::size_t remaining = 0;
    bool failed = false;
    for (std::size_t i = 0; i < requests.size(); ++i) {
        auto& request = requests[i];
        const BOOL immediate = ReadFile(file.get(), request.data, sizeof(request.data),
                                        nullptr, &request.overlapped);
        const DWORD error = immediate ? ERROR_SUCCESS : GetLastError();
        if (!immediate && error != ERROR_IO_PENDING) {
            fail("ReadFile (submission)", error);
            failed = true;
            break;  // Still drain any requests submitted earlier.
        }
        request.submitted = true;
        ++remaining;
        std::cout << "submit " << i << ": " << (immediate ? "immediate" : "pending") << '\n';
    }

    while (remaining != 0) {
        DWORD bytes = 0;
        ULONG_PTR key = 0;
        OVERLAPPED* overlapped = nullptr;
        const BOOL ok = GetQueuedCompletionStatus(port.get(), &bytes, &key, &overlapped, INFINITE);
        const DWORD error = ok ? ERROR_SUCCESS : GetLastError();
        if (!overlapped) {
            fail("GetQueuedCompletionStatus (no I/O packet)", error);
            break;
        }

        std::size_t i = 0;
        while (i < requests.size() && overlapped != &requests[i].overlapped) ++i;
        if (i == requests.size() || !requests[i].submitted || requests[i].received) {
            std::cerr << "Unexpected completion pointer\n";
            break;
        }
        auto& request = requests[i];
        request.received = true;
        --remaining;
        if (!ok) {
            fail("ReadFile (completion)", error);
            failed = true;
        } else if (key != file_key || bytes != sizeof(request.data) ||
                   request.data[0] != 'M' || request.data[1] != 'Z') {
            std::cerr << "Unexpected key, byte count, or file signature\n";
            failed = true;
        } else {
            std::cout << "complete " << i << ": key=" << key << ", bytes=" << bytes
                      << ", signature=" << request.data[0] << request.data[1] << '\n';
        }
    }

    if (remaining != 0) {
        // Abandon the port loop only after the kernel is done with each buffer.
        for (const auto& request : requests) {
            if (request.submitted && !request.received &&
                WaitForSingleObject(request.event.get(), INFINITE) != WAIT_OBJECT_0) {
                std::terminate();  // Never unwind live request storage.
            }
        }
        return 1;
    }
    return failed ? 1 : 0;
}
