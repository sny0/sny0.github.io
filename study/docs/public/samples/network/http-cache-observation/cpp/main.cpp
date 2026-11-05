#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <winhttp.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cstddef>
#include <iostream>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace {
constexpr std::size_t BodyLimit = 4096;
constexpr std::array<BYTE, 10> Expected = {0x43, 0x61, 0x63, 0x68, 0x65, 0x20, 0xe3, 0x81, 0x82, 0x0a};

class ApiError final : public std::runtime_error {
public:
    ApiError(const char* operation, DWORD value) : std::runtime_error(operation), code(value) {}
    DWORD code;
};

void Require(BOOL ok, const char* operation) {
    if (!ok) { throw ApiError(operation, GetLastError()); }
}
void Expect(bool ok, const char* reason) { if (!ok) { throw std::runtime_error(reason); } }

class InternetHandle final {
public:
    InternetHandle(HINTERNET value, const char* operation) : value_(value) {
        if (!value_) { throw ApiError(operation, GetLastError()); }
    }
    ~InternetHandle() { if (value_) { WinHttpCloseHandle(value_); } }
    InternetHandle(const InternetHandle&) = delete;
    InternetHandle& operator=(const InternetHandle&) = delete;
    HINTERNET get() const noexcept { return value_; }
private:
    HINTERNET value_;
};

class Budget final {
public:
    Budget() : end_(Clock::now() + std::chrono::seconds(30)) {}
    void Check() const { Expect(Clock::now() < end_, "overall_budget_expired"); }
    void Apply(HINTERNET handle) const {
        Check();
        const auto remaining = std::chrono::duration_cast<std::chrono::milliseconds>(end_ - Clock::now()).count();
        const int timeout = static_cast<int>(std::clamp(remaining, 1LL, 8000LL));
        Require(WinHttpSetTimeouts(handle, timeout, timeout, timeout, timeout), "WinHttpSetTimeouts");
    }
private:
    using Clock = std::chrono::steady_clock;
    Clock::time_point end_;
};

std::optional<INTERNET_PORT> ParsePort(std::string_view input) {
    if (input.empty() || input.size() > 5) { return std::nullopt; }
    unsigned int value = 0;
    for (char digit : input) {
        if (digit < '0' || digit > '9') { return std::nullopt; }
        value = value * 10U + static_cast<unsigned int>(digit - '0');
    }
    if (value == 0 || value > 65535U) { return std::nullopt; }
    return static_cast<INTERNET_PORT>(value);
}

std::optional<std::wstring> Header(HINTERNET request, const wchar_t* name) {
    std::array<wchar_t, 1025> buffer{};
    DWORD size = static_cast<DWORD>(sizeof(buffer));
    if (!WinHttpQueryHeaders(request, WINHTTP_QUERY_CUSTOM, name, buffer.data(), &size, WINHTTP_NO_HEADER_INDEX)) {
        const DWORD error = GetLastError();
        if (error == ERROR_WINHTTP_HEADER_NOT_FOUND) { return std::nullopt; }
        throw ApiError("WinHttpQueryHeaders", error);
    }
    return std::wstring(buffer.data());
}

std::string Ascii(std::wstring_view value) {
    std::string output;
    output.reserve(value.size());
    for (wchar_t character : value) {
        Expect(character >= 0x20 && character <= 0x7e, "unexpected_non_ascii_header");
        output.push_back(static_cast<char>(character));
    }
    return output;
}

struct Response {
    DWORD status = 0;
    std::wstring etag;
    std::vector<BYTE> body;
};

Response Get(HINTERNET connection, const Budget& budget, std::wstring_view validator) {
    InternetHandle request(WinHttpOpenRequest(connection, L"GET", L"/resource", L"HTTP/1.1",
        WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, 0), "WinHttpOpenRequest");
    DWORD disabled = WINHTTP_DISABLE_REDIRECTS | WINHTTP_DISABLE_AUTHENTICATION | WINHTTP_DISABLE_COOKIES;
    Require(WinHttpSetOption(request.get(), WINHTTP_OPTION_DISABLE_FEATURE, &disabled, sizeof(disabled)), "disable_features");
    const std::wstring headers = validator.empty() ? L"" : L"If-None-Match: " + std::wstring(validator) + L"\r\n";
    budget.Apply(request.get());
    Require(WinHttpSendRequest(request.get(), headers.empty() ? WINHTTP_NO_ADDITIONAL_HEADERS : headers.c_str(),
        static_cast<DWORD>(headers.size()), WINHTTP_NO_REQUEST_DATA, 0, 0, 0), "WinHttpSendRequest");
    budget.Check();
    budget.Apply(request.get());
    Require(WinHttpReceiveResponse(request.get(), nullptr), "WinHttpReceiveResponse");
    budget.Check();
    Response result;
    DWORD size = sizeof(result.status);
    Require(WinHttpQueryHeaders(request.get(), WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
        WINHTTP_HEADER_NAME_BY_INDEX, &result.status, &size, WINHTTP_NO_HEADER_INDEX), "query_status");
    const auto etag = Header(request.get(), L"ETag");
    Expect(etag.has_value(), "missing_etag");
    result.etag = *etag;
    Expect(Header(request.get(), L"Cache-Control") == std::optional<std::wstring>(L"no-cache"), "cache_control_mismatch");
    const auto date = Header(request.get(), L"Date");
    Expect(date.has_value() && !date->empty(), "missing_date");
    const auto length = Header(request.get(), L"Content-Length");
    if (result.status == 200) { Expect(length == std::optional<std::wstring>(L"10"), "content_length_mismatch"); }
    if (result.status == 304) { Expect(!length.has_value(), "unexpected_304_content_length"); }
    std::array<BYTE, 512> buffer{};
    for (;;) {
        budget.Apply(request.get());
        const DWORD requested = static_cast<DWORD>(std::min(buffer.size(), BodyLimit - result.body.size() + 1U));
        DWORD received = 0;
        Require(WinHttpReadData(request.get(), buffer.data(), requested, &received), "WinHttpReadData");
        budget.Check();
        Expect(received <= requested && received <= BodyLimit - result.body.size(), "body_limit_or_count_invalid");
        result.body.insert(result.body.end(), buffer.begin(), buffer.begin() + static_cast<std::ptrdiff_t>(received));
        if (received == 0) { break; }
    }
    return result;
}

bool ExpectedBody(const std::vector<BYTE>& body) {
    return body.size() == Expected.size() && std::equal(body.begin(), body.end(), Expected.begin());
}

void Observe(int step, const Response& response, DWORD status, bool reuse, const std::vector<BYTE>& effective) {
    Expect(response.status == status, "unexpected_http_status");
    Expect(response.etag == L"\"study-v1\"", "unexpected_etag");
    Expect(status == 304 ? response.body.empty() : ExpectedBody(response.body), "wire_body_mismatch");
    Expect(ExpectedBody(effective), "effective_cached_body_mismatch");
    std::cout << "step=" << step << " status=" << response.status
              << " received_body_bytes=" << response.body.size() << " etag=" << Ascii(response.etag)
              << " reuse_saved_body=" << (reuse ? "true" : "false")
              << " effective_body_bytes=" << effective.size() << '\n';
}

void Run(INTERNET_PORT port) {
    const Budget budget;
    InternetHandle session(WinHttpOpen(L"Sny0StudyHttpCache/1.0", WINHTTP_ACCESS_TYPE_NO_PROXY,
        WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0), "WinHttpOpen");
    DWORD protocols = 0;
    Require(WinHttpSetOption(session.get(), WINHTTP_OPTION_ENABLE_HTTP_PROTOCOL, &protocols, sizeof(protocols)), "http_protocol_policy");
    budget.Apply(session.get());
    InternetHandle connection(WinHttpConnect(session.get(), L"127.0.0.1", port, 0), "WinHttpConnect");
    std::cout << "target=http://127.0.0.1:" << port << "/resource cache_model=explicit_client_memory\n";
    const Response first = Get(connection.get(), budget, L"");
    std::vector<BYTE> cachedBody = first.body;
    const std::wstring cachedEtag = first.etag;
    Observe(1, first, 200, false, cachedBody);
    const Response second = Get(connection.get(), budget, cachedEtag);
    Observe(2, second, 304, true, cachedBody);
    const Response third = Get(connection.get(), budget, L"\"other,tag\", W/" + cachedEtag);
    Observe(3, third, 304, true, cachedBody);
    const Response fourth = Get(connection.get(), budget, L"\"study-old\"");
    cachedBody = fourth.body;
    Observe(4, fourth, 200, false, cachedBody);
    std::cout << "observations=4 result=passed\n";
}
} // namespace

int main(int argc, char* argv[]) {
    const auto port = argc == 2 ? ParsePort(argv[1]) : std::nullopt;
    if (!port) {
        std::cerr << "usage: http_cache_observation <port_1_to_65535>\n";
        return 2;
    }
    try {
        Run(*port);
        std::cout << "caller_scope=finished\n";
        return 0;
    } catch (const ApiError& error) {
        std::cerr << "api_status=failed operation=" << error.what() << " win32_error=" << error.code << '\n';
    } catch (const std::exception& error) {
        std::cerr << "observation_status=failed reason=" << error.what() << '\n';
    }
    return 1;
}
