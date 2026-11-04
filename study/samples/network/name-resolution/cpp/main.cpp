#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0602
#endif
#include <winsock2.h>
#include <ws2tcpip.h>

#include <array>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cwchar>
#include <exception>
#include <stdexcept>
#include <string>

namespace {
constexpr DWORD cancelAfterMs = 8000;
unsigned int callerRequests = 0;
bool cleanupFailed = false;
struct ApiFailure { const char* operation; unsigned long code; };
void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
class WsaSession {
public:
    WsaSession() {
        WSADATA data{};
        const int code = WSAStartup(MAKEWORD(2, 2), &data);
        if (code != 0) throw ApiFailure{"WSAStartup", static_cast<unsigned long>(code)};
        if (LOBYTE(data.wVersion) != 2 || HIBYTE(data.wVersion) != 2) {
            if (WSACleanup() == SOCKET_ERROR) cleanupFailed = true;
            throw std::runtime_error("Winsock 2.2 unavailable");
        }
    }
    ~WsaSession() noexcept {
        if (WSACleanup() == SOCKET_ERROR) {
            cleanupFailed = true;
            std::fprintf(stderr, "CLEANUP FAIL: WSACleanup code=%d\n", WSAGetLastError());
        }
    }
    WsaSession(const WsaSession&) = delete;
    WsaSession& operator=(const WsaSession&) = delete;
};

// Every caller-owned parameter remains at a stable address until terminal completion.
struct QueryOwner {
    std::wstring name;
    ADDRINFOEXW hints{};
    PADDRINFOEXW results = nullptr;
    OVERLAPPED operation{};
    HANDLE cancelHandle = nullptr; // Opaque cancellation handle; do not CloseHandle it.
    HANDLE event = nullptr;
    bool pending = false;
    QueryOwner(const wchar_t* input, bool numeric) : name(input) {
        event = CreateEventW(nullptr, TRUE, FALSE, nullptr);
        if (!event) throw ApiFailure{"CreateEventW", GetLastError()};
        operation.hEvent = event;
        hints.ai_family = AF_UNSPEC;
        hints.ai_socktype = SOCK_STREAM;
        hints.ai_protocol = IPPROTO_TCP;
        hints.ai_flags = numeric ? AI_NUMERICHOST : 0;
        ++callerRequests;
    }
    ~QueryOwner() noexcept {
        // A fundamental wait/handle failure must not unwind still-pending storage.
        if (pending) std::abort();
        if (results) FreeAddrInfoExW(results);
        if (!CloseHandle(event)) {
            cleanupFailed = true;
            std::fprintf(stderr, "CLEANUP FAIL: CloseHandle code=%lu\n", GetLastError());
        }
        --callerRequests;
    }
    QueryOwner(const QueryOwner&) = delete;
    QueryOwner& operator=(const QueryOwner&) = delete;
};

struct Outcome {
    int code = 0;
    int cancelCode = 0;
    DWORD waitError = 0;
    bool wasPending = false;
    bool cancelRequested = false;
    bool cancelDeadlineReached = false;
};
[[noreturn]] void failWithoutUnwinding(const char* message) noexcept {
    std::fprintf(stderr, "FATAL: %s; pending caller storage cannot be released\n", message);
    std::abort();
}
Outcome issueAndDrain(QueryOwner& query) noexcept {
    Outcome outcome;
    // pTimeout=nullptr: use one caller cancellation-request deadline, then drain.
    const int start = GetAddrInfoExW(query.name.c_str(), nullptr, NS_ALL, nullptr, &query.hints,
        &query.results, nullptr, &query.operation, nullptr, &query.cancelHandle);
    if (start != WSA_IO_PENDING) {
        outcome.code = start; // Immediate success or direct failure, no pending request.
        return outcome;
    }
    outcome.wasPending = true;
    query.pending = true;
    DWORD waited = WaitForSingleObject(query.event, cancelAfterMs);
    if (waited != WAIT_OBJECT_0) {
        outcome.cancelDeadlineReached = waited == WAIT_TIMEOUT;
        outcome.waitError = waited == WAIT_FAILED ? GetLastError() : 0;
        outcome.cancelRequested = true;
        outcome.cancelCode = GetAddrInfoExCancel(&query.cancelHandle);
        // Cancel success signals user completion. Already-completed races may give
        // WSA_INVALID_HANDLE. Either way collect completion before releasing owners.
        waited = WaitForSingleObject(query.event, INFINITE);
        if (waited != WAIT_OBJECT_0) failWithoutUnwinding("Completion drain wait failed");
    }
    outcome.code = GetAddrInfoExOverlappedResult(&query.operation);
    if (outcome.code == WSAEINPROGRESS) failWithoutUnwinding("Event did not establish terminal completion");
    query.pending = false;
    return outcome;
}

struct AddressSummary {
    unsigned int count = 0;
    bool allValid = true;
    bool allMatchNumeric = true;
    bool hasLoopback = false;
};
AddressSummary inspect(const QueryOwner& query, int numericFamily) {
    AddressSummary summary;
    for (const ADDRINFOEXW* entry = query.results; entry; entry = entry->ai_next) {
        std::array<char, INET6_ADDRSTRLEN> text{};
        bool valid = false, loopback = false, numericMatch = false;
        unsigned long scope = 0;
        const char* family = "other";
        if (entry->ai_family == AF_INET && entry->ai_addr && entry->ai_addrlen >= sizeof(sockaddr_in)) {
            const auto* address = reinterpret_cast<const sockaddr_in*>(entry->ai_addr);
            family = "IPv4";
            valid = InetNtopA(AF_INET, const_cast<IN_ADDR*>(&address->sin_addr), text.data(), text.size()) != nullptr;
            loopback = (ntohl(address->sin_addr.s_addr) >> 24U) == 127U;
            numericMatch = numericFamily == AF_INET && address->sin_addr.s_addr == htonl(INADDR_LOOPBACK);
        } else if (entry->ai_family == AF_INET6 && entry->ai_addr && entry->ai_addrlen >= sizeof(sockaddr_in6)) {
            const auto* address = reinterpret_cast<const sockaddr_in6*>(entry->ai_addr);
            family = "IPv6";
            valid = InetNtopA(AF_INET6, const_cast<IN6_ADDR*>(&address->sin6_addr), text.data(), text.size()) != nullptr;
            loopback = IN6_IS_ADDR_LOOPBACK(&address->sin6_addr) != 0;
            numericMatch = numericFamily == AF_INET6 && loopback;
            scope = address->sin6_scope_id;
        }
        ++summary.count;
        summary.allValid = summary.allValid && valid;
        summary.hasLoopback = summary.hasLoopback || loopback;
        if (numericFamily != AF_UNSPEC) summary.allMatchNumeric = summary.allMatchNumeric && numericMatch;
        std::printf("  address family=%s value=%s scope=%lu loopback=%s\n", family,
            valid ? text.data() : "invalid", scope, loopback ? "true" : "false");
    }
    return summary;
}
bool observe(const wchar_t* input, const char* label, int numericFamily, bool localhost) {
    const auto started = std::chrono::steady_clock::now();
    QueryOwner query(input, numericFamily != AF_UNSPEC);
    const Outcome outcome = issueAndDrain(query);
    const double elapsed = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started).count();
    const char* status = outcome.code == 0 ? "success" : outcome.code == WSA_E_CANCELLED
        ? "cancelled" : outcome.code == WSAETIMEDOUT ? "resolver_timeout" : "resolver_failure";
    if (outcome.waitError != 0) status = "wait_failure_after_drain";
    std::printf("query=%s start=%s api_status=%s code=%d cancel_requested=%s cancel_code=%d cancel_deadline_reached=%s elapsed_ms=%.3f\n",
        label, outcome.wasPending ? "pending" : "immediate", status, outcome.code,
        outcome.cancelRequested ? "true" : "false", outcome.cancelCode,
        outcome.cancelDeadlineReached ? "true" : "false", elapsed);
    if (outcome.code != 0 || outcome.waitError != 0) return false;
    const AddressSummary result = inspect(query, numericFamily);
    const bool valid = result.count > 0 && result.allValid
        && (numericFamily == AF_UNSPEC || result.allMatchNumeric) && (!localhost || result.hasLoopback);
    std::printf("result=%s addresses=%u valid=%s has_loopback=%s numeric_match=%s\n", label, result.count,
        valid ? "true" : "false", result.hasLoopback ? "true" : "false",
        numericFamily == AF_UNSPEC ? "n/a" : result.allMatchNumeric ? "true" : "false");
    return valid;
}
} // namespace
int wmain(int argc, wchar_t* argv[]) {
    const bool live = argc == 2 && std::wcscmp(argv[1], L"--live") == 0;
    if (argc != 1 && !live) {
        std::fputs("usage: name_resolution_observation.exe [--live]\n", stderr);
        return 2;
    }
    try {
        unsigned int succeeded = 0;
        const unsigned int apiCalls = live ? 4U : 3U;
        {
            const WsaSession session;
            std::printf("mode=%s cancel_request_deadline_seconds=8 per_query=true namespace=NS_ALL\n", live ? "live" : "default");
            if (observe(L"127.0.0.1", "numeric_ipv4", AF_INET, false)) ++succeeded;
            if (observe(L"::1", "numeric_ipv6", AF_INET6, false)) ++succeeded;
            if (observe(L"localhost", "localhost", AF_UNSPEC, true)) ++succeeded;
            if (live && observe(L"example.com.", "example.com.", AF_UNSPEC, false)) ++succeeded;
            require(callerRequests == 0, "Caller request owners still live");
        }
        std::printf("summary api_calls=%u succeeded=%u failed_or_cancelled=%u caller_objects=released\n",
            apiCalls, succeeded, apiCalls - succeeded);
        if (cleanupFailed || succeeded != apiCalls) return 1;
        std::puts("PASS: address validation; no wire/cache/connect claim");
        return 0;
    } catch (const ApiFailure& error) {
        std::fprintf(stderr, "FAIL: %s code=%lu\n", error.operation, error.code); return 1;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what()); return 1;
    }
}
