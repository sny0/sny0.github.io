#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <cstdio>
#include <string>
#include <string_view>

namespace {
constexpr char message[] = "child: hello through the pipe\n";
constexpr DWORD messageSize = sizeof(message) - 1;

class Handle {
public:
    explicit Handle(HANDLE value) : value_(value) {}
    ~Handle() { close(); }

    Handle(const Handle&) = delete;
    Handle& operator=(const Handle&) = delete;

    HANDLE get() const { return value_; }

    void close() {
        if (value_ && value_ != INVALID_HANDLE_VALUE) CloseHandle(value_);
        value_ = nullptr;
    }

private:
    HANDLE value_;
};

int fail(const char* operation, DWORD code) {
    std::fprintf(stderr, "%s failed (%lu)\n", operation, code);
    return 1;
}

int childMain() {
    DWORD written = 0;
    const HANDLE output = GetStdHandle(STD_OUTPUT_HANDLE);
    return WriteFile(output, message, messageSize, &written, nullptr) && written == messageSize ? 0 : 1;
}

DWORD startChild(HANDLE input, HANDLE output, PROCESS_INFORMATION& process) {
    std::wstring executable(32768, L'\0');
    const DWORD length = GetModuleFileNameW(nullptr, executable.data(), static_cast<DWORD>(executable.size()));
    if (length == 0 || length >= executable.size()) return GetLastError();
    executable.resize(length);
    std::wstring command = L"\"" + executable + L"\" --child";

    SIZE_T bytes = 0;
    InitializeProcThreadAttributeList(nullptr, 1, 0, &bytes);
    if (bytes == 0) return GetLastError();
    HANDLE heap = GetProcessHeap();
    auto* attributes = static_cast<LPPROC_THREAD_ATTRIBUTE_LIST>(HeapAlloc(heap, 0, bytes));
    if (!attributes) return ERROR_NOT_ENOUGH_MEMORY;
    if (!InitializeProcThreadAttributeList(attributes, 1, 0, &bytes)) {
        const DWORD error = GetLastError();
        HeapFree(heap, 0, attributes);
        return error;
    }

    HANDLE inherited[] = {input, output};
    STARTUPINFOEXW startup{};
    startup.StartupInfo.cb = sizeof(startup);
    startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
    startup.StartupInfo.hStdInput = input;
    startup.StartupInfo.hStdOutput = output;
    startup.StartupInfo.hStdError = output;
    startup.lpAttributeList = attributes;

    BOOL launched = FALSE;
    if (UpdateProcThreadAttribute(attributes, 0, PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
                                  inherited, sizeof(inherited), nullptr, nullptr)) {
        launched = CreateProcessW(executable.c_str(), command.data(), nullptr, nullptr, TRUE,
                                  EXTENDED_STARTUPINFO_PRESENT, nullptr, nullptr, &startup.StartupInfo, &process);
    }
    const DWORD error = launched ? ERROR_SUCCESS : GetLastError();
    DeleteProcThreadAttributeList(attributes);
    HeapFree(heap, 0, attributes);
    return error;
}

int parentMain() {
    SECURITY_ATTRIBUTES security{sizeof(SECURITY_ATTRIBUTES), nullptr, TRUE};
    HANDLE rawReader = nullptr;
    HANDLE rawWriter = nullptr;
    if (!CreatePipe(&rawReader, &rawWriter, &security, 4096)) return fail("CreatePipe", GetLastError());
    Handle reader(rawReader);
    Handle writer(rawWriter);
    if (!SetHandleInformation(reader.get(), HANDLE_FLAG_INHERIT, 0)) {
        return fail("SetHandleInformation", GetLastError());
    }
    Handle input(CreateFileW(L"NUL", GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE,
                             &security, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr));
    if (input.get() == INVALID_HANDLE_VALUE) return fail("CreateFileW(NUL)", GetLastError());

    PROCESS_INFORMATION processInfo{};
    const DWORD launchError = startChild(input.get(), writer.get(), processInfo);
    if (launchError != ERROR_SUCCESS) return fail("startChild", launchError);
    Handle process(processInfo.hProcess);
    Handle thread(processInfo.hThread);
    input.close();
    thread.close();

    // The child writes one small fixed message. Keep the parent's writer open for the experiment.
    const DWORD wait = WaitForSingleObject(process.get(), 10000);
    if (wait != WAIT_OBJECT_0) return fail("WaitForSingleObject", wait == WAIT_FAILED ? GetLastError() : wait);
    DWORD exitCode = 0;
    if (!GetExitCodeProcess(process.get(), &exitCode)) return fail("GetExitCodeProcess", GetLastError());
    if (exitCode != 0) return fail("child", exitCode);

    DWORD available = 0;
    if (!PeekNamedPipe(reader.get(), nullptr, 0, nullptr, &available, nullptr)) return fail("PeekNamedPipe", GetLastError());
    if (available != messageSize) return fail("expected child output", ERROR_INVALID_DATA);

    char buffer[messageSize];
    DWORD received = 0;
    if (!ReadFile(reader.get(), buffer, available, &received, nullptr)) return fail("ReadFile", GetLastError());
    if (std::string_view(buffer, received) != std::string_view(message, messageSize)) {
        return fail("unexpected child output", ERROR_INVALID_DATA);
    }
    std::printf("parent received: %.*s", static_cast<int>(received), buffer);

    if (!PeekNamedPipe(reader.get(), nullptr, 0, nullptr, &available, nullptr)) return fail("PeekNamedPipe", GetLastError());
    if (available != 0) return fail("expected an empty pipe", ERROR_INVALID_DATA);
    std::puts("child exited, buffer empty, parent writer still open");

    writer.close();
    if (ReadFile(reader.get(), buffer, 1, &received, nullptr)) return fail("expected pipe end", ERROR_INVALID_DATA);
    const DWORD end = GetLastError();
    if (end != ERROR_BROKEN_PIPE) return fail("ReadFile after last writer closed", end);
    std::puts("parent writer closed: ERROR_BROKEN_PIPE");
    return 0;
}
}

int wmain(int argc, wchar_t* argv[]) {
    return argc == 2 && std::wstring_view(argv[1]) == L"--child" ? childMain() : parentMain();
}
