#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#define SECURITY_WIN32
#include <windows.h>
#include <security.h>
#include <schannel.h>
#include <winhttp.h>
#include <wincrypt.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cstddef>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <string>
#include <string_view>

namespace {
constexpr std::size_t BodyLimit = 64U * 1024U;

class ApiError final : public std::runtime_error {
public:
    ApiError(const char* operation, DWORD value)
        : std::runtime_error(operation), code(value) {}
    DWORD code;
};

void Require(BOOL ok, const char* operation) {
    if (!ok) { throw ApiError(operation, GetLastError()); }
}

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

class Certificate final {
public:
    explicit Certificate(HINTERNET request) {
        DWORD size = sizeof(value_);
        Require(WinHttpQueryOption(request, WINHTTP_OPTION_SERVER_CERT_CONTEXT,
                                   &value_, &size), "server_certificate");
        if (!value_) { throw std::runtime_error("null_server_certificate"); }
    }
    ~Certificate() { if (value_) { CertFreeCertificateContext(value_); } }
    Certificate(const Certificate&) = delete;
    Certificate& operator=(const Certificate&) = delete;
    PCCERT_CONTEXT get() const noexcept { return value_; }
private:
    PCCERT_CONTEXT value_ = nullptr;
};

class Budget final {
public:
    Budget() : start_(Clock::now()), end_(start_ + std::chrono::seconds(30)) {}
    void Check() const {
        if (Clock::now() >= end_) { throw std::runtime_error("overall_budget_expired"); }
    }
    void Apply(HINTERNET request) const {
        Check();
        const auto remaining = std::chrono::duration_cast<std::chrono::milliseconds>(
            end_ - Clock::now()).count();
        const int timeout = static_cast<int>(std::clamp(remaining, 1LL, 8000LL));
        Require(WinHttpSetTimeouts(request, timeout, timeout, timeout, timeout),
                "WinHttpSetTimeouts");
    }
    long long ElapsedMs() const {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            Clock::now() - start_).count();
    }
private:
    using Clock = std::chrono::steady_clock;
    Clock::time_point start_;
    Clock::time_point end_;
};

void SetDword(HINTERNET handle, DWORD option, DWORD value, const char* operation) {
    Require(WinHttpSetOption(handle, option, &value, sizeof(value)), operation);
}

std::string CertificateSha256(PCCERT_CONTEXT certificate) {
    std::array<BYTE, 32> hash{};
    DWORD size = static_cast<DWORD>(hash.size());
    Require(CryptHashCertificate2(L"SHA256", 0, nullptr,
                                  certificate->pbCertEncoded, certificate->cbCertEncoded,
                                  hash.data(), &size), "certificate_sha256");
    if (size != hash.size()) { throw std::runtime_error("unexpected_sha256_length"); }
    constexpr char digits[] = "0123456789ABCDEF";
    std::string text;
    text.reserve(hash.size() * 2U);
    for (const auto value : hash) {
        text.push_back(digits[value >> 4U]);
        text.push_back(digits[value & 15U]);
    }
    return text;
}

const char* ProtocolName(DWORD protocol) noexcept {
    switch (protocol) {
    case SP_PROT_TLS1_3_CLIENT: return "TLS1.3";
    case SP_PROT_TLS1_2_CLIENT: return "TLS1.2";
    case SP_PROT_TLS1_1_CLIENT: return "TLS1.1";
    case SP_PROT_TLS1_CLIENT: return "TLS1.0";
    default: return "other_platform_value";
    }
}

void PrintSecurity(HINTERNET request) {
    WINHTTP_SECURITY_INFO info{};
    DWORD size = sizeof(info);
    if (WinHttpQueryOption(request, WINHTTP_OPTION_SECURITY_INFO, &info, &size)) {
        std::cout << "tls_info=available protocol=" << ProtocolName(info.ConnectionInfo.dwProtocol)
                  << " protocol_code=0x" << std::hex << info.ConnectionInfo.dwProtocol
                  << " cipher_suite=0x" << info.CipherInfo.dwCipherSuite << std::dec
                  << " cipher_bits=" << info.ConnectionInfo.dwCipherStrength << '\n';
    } else {
        // An unavailable observation does not disable or bypass TLS validation.
        const DWORD error = GetLastError();
        std::cout << "tls_info=unavailable win32_error=" << error << '\n';
    }
    Certificate certificate(request);
    std::cout << "peer_certificate_sha256=" << CertificateSha256(certificate.get()) << '\n';
}

int RunLive() {
    const Budget budget;
    InternetHandle session(WinHttpOpen(L"Sny0StudyHttpsObservation/1.0",
        WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY, WINHTTP_NO_PROXY_NAME,
        WINHTTP_NO_PROXY_BYPASS, 0), "WinHttpOpen");
    // No advanced HTTP versions: HTTP/1.1 or earlier, checked below.
    SetDword(session.get(), WINHTTP_OPTION_ENABLE_HTTP_PROTOCOL, 0, "http_protocol_policy");
    budget.Apply(session.get());
    InternetHandle connection(WinHttpConnect(session.get(), L"example.com",
        INTERNET_DEFAULT_HTTPS_PORT, 0), "WinHttpConnect");
    InternetHandle request(WinHttpOpenRequest(connection.get(), L"GET", L"/", L"HTTP/1.1",
        WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE),
        "WinHttpOpenRequest");
    SetDword(request.get(), WINHTTP_OPTION_DISABLE_FEATURE,
        WINHTTP_DISABLE_REDIRECTS | WINHTTP_DISABLE_AUTHENTICATION | WINHTTP_DISABLE_COOKIES,
        "disable_redirect_auth_cookies");
    SetDword(request.get(), WINHTTP_OPTION_AUTOLOGON_POLICY,
        WINHTTP_AUTOLOGON_SECURITY_LEVEL_HIGH, "disable_default_credentials");
    // No security-ignore flags, custom trust, client certificate or credentials.
    std::cout << "mode=live target=https://example.com/ api=WinHTTP\n"
              << "certificate_validation=platform_default_no_override\n"
              << "revocation_policy=platform_default_no_explicit_enable\n";
    budget.Apply(request.get());
    Require(WinHttpSendRequest(request.get(), WINHTTP_NO_ADDITIONAL_HEADERS, 0,
        WINHTTP_NO_REQUEST_DATA, 0, 0, 0), "WinHttpSendRequest");
    budget.Check();
    budget.Apply(request.get());
    Require(WinHttpReceiveResponse(request.get(), nullptr), "WinHttpReceiveResponse");
    budget.Check();
    DWORD status = 0;
    DWORD statusSize = sizeof(status);
    Require(WinHttpQueryHeaders(request.get(), WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
        WINHTTP_HEADER_NAME_BY_INDEX, &status, &statusSize, WINHTTP_NO_HEADER_INDEX), "http_status");
    std::array<wchar_t, 32> version{};
    DWORD versionSize = static_cast<DWORD>(sizeof(version));
    Require(WinHttpQueryHeaders(request.get(), WINHTTP_QUERY_VERSION,
        WINHTTP_HEADER_NAME_BY_INDEX, version.data(), &versionSize,
        WINHTTP_NO_HEADER_INDEX), "http_version");
    if (std::wstring_view(version.data()) != L"HTTP/1.1") {
        throw std::runtime_error("unexpected_http_version");
    }
    std::cout << "api_status=response_headers http_version=1.1 http_status=" << status << '\n';
    PrintSecurity(request.get());

    std::array<BYTE, 4096> buffer{};
    std::size_t total = 0;
    std::size_t reads = 0;
    for (;;) {
        budget.Apply(request.get());
        // One extra byte can detect an oversized body even at the limit.
        const DWORD requested = static_cast<DWORD>(std::min(buffer.size(), BodyLimit - total + 1U));
        DWORD received = 0;
        Require(WinHttpReadData(request.get(), buffer.data(), requested, &received), "WinHttpReadData");
        budget.Check();
        ++reads;
        if (received > requested) { throw std::runtime_error("invalid_read_count"); }
        if (received > BodyLimit - total) { throw std::runtime_error("body_limit_exceeded"); }
        total += received;
        if (received == 0) { break; }
    }
    const bool success = status >= 200 && status < 300;
    std::cout << "api_status=response_complete body_bytes=" << total
              << " body_limit=" << BodyLimit << " read_calls=" << reads
              << " elapsed_ms=" << budget.ElapsedMs() << '\n'
              << "http_success=" << (success ? "true" : "false") << '\n';
    return success ? 0 : 1;
}
} // namespace

int main(int argc, char* argv[]) {
    if (argc == 1) {
        std::cout << "usage: https_observation --live\n"
                  << "target=https://example.com/ network_request=not_started\n";
        return 0;
    }
    if (argc != 2 || std::string_view(argv[1]) != "--live") {
        std::cerr << "error=invalid_arguments expected=--live\n";
        return 2;
    }
    try {
        const int result = RunLive();
        std::cout << "caller_scope=finished\n";
        return result;
    } catch (const ApiError& error) {
        std::cerr << "api_status=failed operation=" << error.what()
                  << " win32_error=" << error.code << " caller_scope=finished\n";
    } catch (const std::exception& error) {
        std::cerr << "observation_status=failed reason=" << error.what()
                  << " caller_scope=finished\n";
    }
    return 1;
}
