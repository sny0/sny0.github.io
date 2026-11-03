#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>

#include <algorithm>
#include <atomic>
#include <cstddef>
#include <cstdio>
#include <cwchar>
#include <exception>
#include <stdexcept>
#include <string>
#include <thread>
#include <utility>
#include <vector>

namespace {
enum class StartupEvent : unsigned { none, namespaceConstructor };
// Volatile keeps this startup marker observable; it is NOT thread synchronization.
volatile StartupEvent startupEvent = StartupEvent::none;
struct StartupRecorder {
    StartupRecorder() noexcept { startupEvent = StartupEvent::namespaceConstructor; }
};
StartupRecorder startupRecorder;
bool cleanupFailed = false;
constexpr DWORD childWaitMs = 5000;
constexpr DWORD cleanupWaitMs = 2000;
constexpr unsigned incrementsPerThread = 1000;

struct Win32Failure { const char* operation; DWORD error; };
[[noreturn]] void failApi(const char* operation) {
    const DWORD error = GetLastError();
    throw Win32Failure{operation, error};
}
void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
void cleanupError(const char* operation, DWORD error) noexcept {
    cleanupFailed = true;
    std::fprintf(stderr, "CLEANUP FAIL: %s; GetLastError=%lu\n", operation,
                 static_cast<unsigned long>(error));
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

class JobAttributes {
public:
    explicit JobAttributes(HANDLE job) : job_(job) {
        SIZE_T bytes = 0;
        const BOOL query = InitializeProcThreadAttributeList(nullptr, 1, 0, &bytes);
        const DWORD error = GetLastError();
        if (query || error != ERROR_INSUFFICIENT_BUFFER || bytes == 0)
            throw Win32Failure{"InitializeProcThreadAttributeList(size)", error};
        storage_.resize(bytes);
        list_ = reinterpret_cast<LPPROC_THREAD_ATTRIBUTE_LIST>(storage_.data());
        if (!InitializeProcThreadAttributeList(list_, 1, 0, &bytes))
            failApi("InitializeProcThreadAttributeList");
        initialized_ = true;
    }
    ~JobAttributes() noexcept {
        if (initialized_) DeleteProcThreadAttributeList(list_);
    }
    JobAttributes(const JobAttributes&) = delete;
    JobAttributes& operator=(const JobAttributes&) = delete;
    void setJob() {
        // job_ must remain alive until DeleteProcThreadAttributeList.
        if (!UpdateProcThreadAttribute(list_, 0, PROC_THREAD_ATTRIBUTE_JOB_LIST,
                &job_, sizeof(job_), nullptr, nullptr))
            failApi("UpdateProcThreadAttribute(JOB_LIST)");
    }
    LPPROC_THREAD_ATTRIBUTE_LIST get() const noexcept { return list_; }
private:
    HANDLE job_;
    std::vector<std::byte> storage_;
    LPPROC_THREAD_ATTRIBUTE_LIST list_ = nullptr;
    bool initialized_ = false;
};

// This guard is destroyed before its referenced process and job handles.
class ChildExitGuard {
public:
    ChildExitGuard(HANDLE job, HANDLE process) noexcept : job_(job), process_(process) {}
    ~ChildExitGuard() noexcept {
        if (exitObserved_) return;
        std::fprintf(stderr, "Cleanup: stopping this sample's child job.\n");
        if (!TerminateJobObject(job_, 1))
            cleanupError("TerminateJobObject", GetLastError());
        const DWORD wait = WaitForSingleObject(process_, cleanupWaitMs);
        if (wait == WAIT_FAILED) cleanupError("cleanup WaitForSingleObject", GetLastError());
        else if (wait != WAIT_OBJECT_0) {
            cleanupFailed = true;
            std::fprintf(stderr, "Cleanup wait did not observe exit; last job handle will close.\n");
        }
        // UniqueHandle closes our only job handle after this guard. KILL_ON_JOB_CLOSE
        // remains the fallback even if the explicit termination/wait failed.
    }
    void markExited() noexcept { exitObserved_ = true; }
    ChildExitGuard(const ChildExitGuard&) = delete;
    ChildExitGuard& operator=(const ChildExitGuard&) = delete;
private:
    HANDLE job_;
    HANDLE process_;
    bool exitObserved_ = false;
};

std::wstring executablePath() {
    DWORD capacity = 260;
    constexpr DWORD maximumCapacity = 32768;
    for (;;) {
        std::vector<wchar_t> buffer(capacity);
        const DWORD length = GetModuleFileNameW(nullptr, buffer.data(), capacity);
        if (length == 0) failApi("GetModuleFileNameW");
        if (length < capacity) return std::wstring(buffer.data(), length);
        if (capacity == maximumCapacity)
            throw Win32Failure{"GetModuleFileNameW(path too long)", ERROR_INSUFFICIENT_BUFFER};
        capacity = (std::min)(capacity * 2, maximumCapacity);
    }
}

class JoinedThread {
public:
    template<class Action>
    explicit JoinedThread(Action&& action) : thread_(std::forward<Action>(action)) {}
    ~JoinedThread() noexcept {
        if (thread_.joinable()) {
            try { thread_.join(); }
            catch (...) { std::terminate(); }
        }
    }
    void join() { thread_.join(); }
    JoinedThread(const JoinedThread&) = delete;
    JoinedThread& operator=(const JoinedThread&) = delete;
private:
    std::thread thread_;
};

void observeWorker(DWORD mainPid, DWORD mainTid) {
    std::atomic<unsigned> sharedCounter{0};
    struct Observation { DWORD pid = 0; DWORD tid = 0; const void* sharedAddress = nullptr; } worker;
    JoinedThread thread([&] {
        worker.pid = GetCurrentProcessId();
        worker.tid = GetCurrentThreadId();
        worker.sharedAddress = &sharedCounter;
        for (unsigned i = 0; i < incrementsPerThread; ++i)
            sharedCounter.fetch_add(1, std::memory_order_relaxed);
    });
    for (unsigned i = 0; i < incrementsPerThread; ++i)
        sharedCounter.fetch_add(1, std::memory_order_relaxed);
    thread.join(); // Makes the worker's ordinary Observation fields safe to read.
    require(worker.pid == mainPid, "Worker must share the parent's PID");
    require(worker.tid != 0 && worker.tid != mainTid, "Worker must have a different live TID");
    require(worker.sharedAddress == &sharedCounter, "Worker must use the same atomic object");
    require(sharedCounter.load(std::memory_order_relaxed) == incrementsPerThread * 2,
            "Atomic increments were lost");
    // Print worker results only after join: output order is not a scheduling trace.
    std::printf("[worker after join] PID=%lu TID=%lu shared_object=%p counter=%u\n",
                static_cast<unsigned long>(worker.pid), static_cast<unsigned long>(worker.tid),
                const_cast<void*>(worker.sharedAddress), sharedCounter.load(std::memory_order_relaxed));
}

void observeChild(DWORD parentPid, DWORD parentTid) {
    const std::wstring path = executablePath();
    require(path.find(L'"') == std::wstring::npos, "Unexpected quote in executable path");
    const std::wstring command = L"\"" + path + L"\" --child";
    require(command.size() + 1 <= 32767, "Child command line is too long");
    std::vector<wchar_t> mutableCommand(command.begin(), command.end());
    mutableCommand.push_back(L'\0');

    UniqueHandle job(CreateJobObjectW(nullptr, nullptr));
    if (!job.get()) failApi("CreateJobObjectW");
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
    limits.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_ACTIVE_PROCESS;
    limits.BasicLimitInformation.ActiveProcessLimit = 1;
    if (!SetInformationJobObject(job.get(), JobObjectExtendedLimitInformation,
                                 &limits, static_cast<DWORD>(sizeof(limits))))
        failApi("SetInformationJobObject");
    JobAttributes attributes(job.get());
    attributes.setJob();
    STARTUPINFOEXW startup{};
    startup.StartupInfo.cb = sizeof(startup);
    startup.lpAttributeList = attributes.get();
    PROCESS_INFORMATION information{};
    std::fflush(stdout);
    if (!CreateProcessW(path.c_str(), mutableCommand.data(), nullptr, nullptr, FALSE,
                       EXTENDED_STARTUPINFO_PRESENT, nullptr, nullptr,
                       &startup.StartupInfo, &information))
        failApi("CreateProcessW");
    // These constructors cannot throw, so both returned handles are immediately owned.
    UniqueHandle process(information.hProcess);
    UniqueHandle initialThread(information.hThread);
    ChildExitGuard childGuard(job.get(), process.get());
    const DWORD handlePid = GetProcessId(process.get());
    if (handlePid == 0) failApi("GetProcessId");
    const DWORD handleTid = GetThreadId(initialThread.get());
    if (handleTid == 0) failApi("GetThreadId");
    require(information.dwProcessId == handlePid && handlePid != parentPid,
            "Child process identity mismatch");
    require(information.dwThreadId == handleTid && handleTid != parentTid,
            "Child initial-thread identity mismatch");
    std::printf("[parent PROCESS_INFORMATION] child_PID=%lu initial_TID=%lu\n",
                static_cast<unsigned long>(information.dwProcessId),
                static_cast<unsigned long>(information.dwThreadId));
    const DWORD wait = WaitForSingleObject(process.get(), childWaitMs);
    if (wait == WAIT_FAILED) failApi("WaitForSingleObject(child)");
    if (wait == WAIT_TIMEOUT) throw std::runtime_error("Child exceeded the 5000 ms wait");
    require(wait == WAIT_OBJECT_0, "Unexpected child wait result");
    childGuard.markExited();
    DWORD exitCode = 0;
    if (!GetExitCodeProcess(process.get(), &exitCode)) failApi("GetExitCodeProcess");
    require(exitCode == 0, "Child returned a nonzero exit code");
    std::printf("[parent] child exit=%lu; waited for the process, not only its initial thread\n",
                static_cast<unsigned long>(exitCode));
}
} // namespace

int wmain(int argc, wchar_t* argv[]) {
    const StartupEvent firstMainObservation = startupEvent;
    const bool child = argc == 2 && std::wcscmp(argv[1], L"--child") == 0;
    if (argc != 1 && !child) {
        std::fprintf(stderr, "Usage: process_observation.exe [--child]\n");
        return 2;
    }
    int result = 1;
    try {
        require(firstMainObservation == StartupEvent::namespaceConstructor,
                "Namespace-scope initializer was not recorded");
        const DWORD pid = GetCurrentProcessId();
        const DWORD tid = GetCurrentThreadId();
        require(pid != 0 && tid != 0, "Expected nonzero PID and TID");
        std::printf("[%s wmain] PID=%lu TID=%lu startup_event=namespace_constructor\n",
                    child ? "child" : "parent", static_cast<unsigned long>(pid),
                    static_cast<unsigned long>(tid));
        if (child) {
            std::printf("[child] done; child mode never starts another process\n");
        } else {
            observeWorker(pid, tid);
            observeChild(pid, tid);
            require(!cleanupFailed, "A handle cleanup operation failed");
            std::printf("PASS: worker/process identities and child exit verified\n");
        }
        result = 0;
    } catch (const Win32Failure& failure) {
        std::fprintf(stderr, "FAIL: %s; GetLastError=%lu\n", failure.operation,
                     static_cast<unsigned long>(failure.error));
    } catch (const std::exception& failure) {
        std::fprintf(stderr, "FAIL: %s\n", failure.what());
    }
    return cleanupFailed ? 1 : result;
}
