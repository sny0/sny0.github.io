#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <winsock2.h>
#include <ws2tcpip.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cstdio>
#include <exception>
#include <ctime>
#include <map>
#include <string>
#include <vector>
#include <span>
#include <stdexcept>

namespace {
using Byte = unsigned char;
constexpr std::array<Byte, 9> expectedBody{0x48, 0x54, 0x54, 0x50, 0x20, 0xE3, 0x81, 0x82, 0x0A};
unsigned int checks = 0;
unsigned int liveSockets = 0;
unsigned int readinessWaits = 0;
bool cleanupFailed = false;
struct SocketFailure { const char* operation; int code; };
[[noreturn]] void failSocket(const char* operation) {
    const int code = WSAGetLastError();
    throw SocketFailure{operation, code};
}
void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
void check(bool condition, const char* label) { require(condition, label); ++checks; }

class WsaSession {
public:
    WsaSession() {
        WSADATA data{};
        const int code = WSAStartup(MAKEWORD(2, 2), &data);
        if (code != 0) throw SocketFailure{"WSAStartup", code};
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
class UniqueSocket {
public:
    explicit UniqueSocket(SOCKET socket) : socket_(socket) {
        if (socket_ == INVALID_SOCKET) failSocket("socket/accept");
        ++liveSockets;
    }
    ~UniqueSocket() noexcept {
        if (closesocket(socket_) == SOCKET_ERROR) {
            cleanupFailed = true;
            std::fprintf(stderr, "CLEANUP FAIL: closesocket code=%d\n", WSAGetLastError());
        } else --liveSockets;
    }
    UniqueSocket(const UniqueSocket&) = delete;
    UniqueSocket& operator=(const UniqueSocket&) = delete;
    SOCKET get() const noexcept { return socket_; }
private:
    SOCKET socket_;
};
class Deadline {
public:
    Deadline() : end_(std::chrono::steady_clock::now() + std::chrono::seconds(8)) {}
    void ensure() const { (void)remaining(); }
    timeval remaining() const {
        const auto now = std::chrono::steady_clock::now();
        if (now >= end_) throw std::runtime_error("Common I/O deadline expired");
        const auto micros = std::chrono::ceil<std::chrono::microseconds>(end_ - now).count();
        timeval timeout{};
        timeout.tv_sec = static_cast<long>(micros / 1000000);
        timeout.tv_usec = static_cast<long>(micros % 1000000);
        return timeout;
    }
private:
    std::chrono::steady_clock::time_point end_;
};
void nonblocking(SOCKET socket) {
    u_long enabled = 1;
    if (ioctlsocket(socket, FIONBIO, &enabled) == SOCKET_ERROR) failSocket("ioctlsocket");
}
int socketError(SOCKET socket) {
    int code = 0;
    int length = sizeof(code);
    if (getsockopt(socket, SOL_SOCKET, SO_ERROR, reinterpret_cast<char*>(&code), &length) == SOCKET_ERROR)
        failSocket("getsockopt(SO_ERROR)");
    return code;
}
void waitReady(SOCKET socket, bool writing, const Deadline& deadline) {
    fd_set ready{};
    fd_set errors{};
    FD_ZERO(&ready); FD_SET(socket, &ready);
    FD_ZERO(&errors); FD_SET(socket, &errors);
    timeval timeout = deadline.remaining();
    ++readinessWaits;
    const int count = select(0, writing ? nullptr : &ready, writing ? &ready : nullptr, &errors, &timeout);
    if (count == SOCKET_ERROR) failSocket("select");
    if (count == 0) throw std::runtime_error("Common I/O deadline timed out");
    if (FD_ISSET(socket, &errors)) {
        const int code = socketError(socket);
        if (code != 0) throw SocketFailure{"select exceptional readiness", code};
        throw std::runtime_error("Unexpected exceptional socket readiness");
    }
    require(FD_ISSET(socket, &ready) != 0, "Expected readiness absent");
}
sockaddr_in endpoint(SOCKET socket, bool peer = false) {
    sockaddr_in address{};
    int length = sizeof(address);
    const int result = peer ? getpeername(socket, reinterpret_cast<sockaddr*>(&address), &length)
        : getsockname(socket, reinterpret_cast<sockaddr*>(&address), &length);
    if (result == SOCKET_ERROR) failSocket("get socket endpoint");
    require(length == static_cast<int>(sizeof(address)) && address.sin_family == AF_INET, "Unexpected endpoint family");
    return address;
}
bool sameEndpoint(const sockaddr_in& a, const sockaddr_in& b) {
    return a.sin_addr.s_addr == b.sin_addr.s_addr && a.sin_port == b.sin_port;
}
void connectSelf(SOCKET client, const sockaddr_in& address, const Deadline& deadline) {
    deadline.ensure();
    if (connect(client, reinterpret_cast<const sockaddr*>(&address), sizeof(address)) == SOCKET_ERROR) {
        const int code = WSAGetLastError();
        if (code != WSAEWOULDBLOCK) throw SocketFailure{"connect", code};
        waitReady(client, true, deadline);
    }
    const int code = socketError(client);
    if (code != 0) throw SocketFailure{"connect SO_ERROR", code};
}
SOCKET acceptSelf(SOCKET listener, const Deadline& deadline) {
    for (;;) {
        deadline.ensure();
        const SOCKET accepted = accept(listener, nullptr, nullptr);
        if (accepted != INVALID_SOCKET) return accepted;
        const int code = WSAGetLastError();
        if (code != WSAEWOULDBLOCK) throw SocketFailure{"accept", code};
        waitReady(listener, false, deadline);
    }
}
struct Stats {
    const char* name;
    unsigned int sendCalls = 0, recvCalls = 0, sent = 0, received = 0, wouldBlock = 0;
};
void printHex(std::span<const Byte> bytes) {
    for (std::size_t index = 0; index < bytes.size(); ++index)
        std::printf("%s%02X", index == 0 ? "" : " ", static_cast<unsigned int>(bytes[index]));
    std::printf("\n");
}
void sendAll(SOCKET socket, std::span<const Byte> bytes, Stats& stats, const Deadline& deadline) {
    while (!bytes.empty()) {
        deadline.ensure();
        const int requested = static_cast<int>(std::min<std::size_t>(7, bytes.size()));
        ++stats.sendCalls;
        const int actual = send(socket, reinterpret_cast<const char*>(bytes.data()), requested, 0);
        if (actual == SOCKET_ERROR) {
            const int code = WSAGetLastError();
            if (code != WSAEWOULDBLOCK) throw SocketFailure{"send", code};
            ++stats.wouldBlock;
            waitReady(socket, true, deadline);
            continue;
        }
        require(actual > 0 && actual <= requested, "Invalid send progress");
        stats.sent += static_cast<unsigned int>(actual);
        std::printf("%s send requested=%d actual=%d\n", stats.name, requested, actual);
        bytes = bytes.subspan(static_cast<std::size_t>(actual));
    }
}
int receiveSome(SOCKET socket, std::span<Byte> bytes, Stats& stats, const Deadline& deadline) {
    require(!bytes.empty(), "Receive request must be positive");
    const int requested = static_cast<int>(std::min<std::size_t>(7, bytes.size()));
    for (;;) {
        deadline.ensure();
        ++stats.recvCalls;
        const int actual = recv(socket, reinterpret_cast<char*>(bytes.data()), requested, 0);
        if (actual == SOCKET_ERROR) {
            const int code = WSAGetLastError();
            if (code != WSAEWOULDBLOCK) throw SocketFailure{"recv", code};
            ++stats.wouldBlock;
            waitReady(socket, false, deadline);
            continue;
        }
        require(actual >= 0 && actual <= requested, "Receive bounds mismatch");
        stats.received += static_cast<unsigned int>(actual);
        std::printf("%s recv requested=%d actual=%d\n", stats.name, requested, actual);
        return actual; // Zero is graceful EOF; reset/timeout took the error path above.
    }
}
void shutdownSend(SOCKET socket) {
    if (shutdown(socket, SD_SEND) == SOCKET_ERROR) failSocket("shutdown(SD_SEND)");
}
void printStats(const Stats& stats) {
    std::printf("%s totals: send_calls=%u recv_calls=%u sent_bytes=%u received_bytes=%u would_block=%u\n",
        stats.name, stats.sendCalls, stats.recvCalls, stats.sent, stats.received, stats.wouldBlock);
}


constexpr std::size_t maxHeader = 2048;
constexpr std::size_t maxBody = 64;
std::string lowerAscii(std::string value) {
    for (char& c : value) if (c >= 'A' && c <= 'Z') c = static_cast<char>(c - 'A' + 'a');
    return value;
}
struct ParsedHeader { std::string startLine; std::map<std::string, std::string> fields; };
ParsedHeader parseHeader(const std::string& text) {
    require(text.size() <= maxHeader && text.size() >= 4 && text.ends_with("\r\n\r\n"), "Header delimiter/limit");
    for (std::size_t i = 0; i < text.size(); ++i) {
        const unsigned char c = static_cast<unsigned char>(text[i]);
        if (c == '\r') {
            require(i + 1 < text.size() && text[i + 1] == '\n', "Bare CR in header");
            ++i;
        } else require(c >= 0x20 && c <= 0x7E, "Only ASCII header bytes and CRLF accepted");
    }
    ParsedHeader parsed;
    const auto firstEnd = text.find("\r\n");
    require(firstEnd != std::string::npos && firstEnd > 0, "Missing start line");
    parsed.startLine = text.substr(0, firstEnd);
    std::size_t position = firstEnd + 2;
    while (position < text.size()) {
        const auto end = text.find("\r\n", position);
        require(end != std::string::npos, "Missing CRLF");
        if (end == position) {
            require(end + 2 == text.size(), "Bytes after header terminator");
            break;
        }
        const std::string line = text.substr(position, end - position);
        const auto colon = line.find(':');
        require(colon != std::string::npos && colon > 0, "Missing header colon");
        std::string name = lowerAscii(line.substr(0, colon));
        for (char c : name) require((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-', "Subset field name");
        require(name != "transfer-encoding", "Transfer-Encoding outside this subset");
        std::string value = line.substr(colon + 1);
        while (!value.empty() && value.front() == ' ') value.erase(0, 1);
        while (!value.empty() && value.back() == ' ') value.pop_back();
        require(parsed.fields.emplace(name, value).second, "Duplicate header outside this subset");
        position = end + 2;
    }
    return parsed;
}
const std::string& field(const ParsedHeader& header, const char* name) {
    const auto found = header.fields.find(name);
    require(found != header.fields.end(), "Required header absent");
    return found->second;
}
std::size_t contentLength(const std::string& value) {
    require(!value.empty(), "Empty Content-Length");
    std::size_t length = 0;
    for (char c : value) {
        require(c >= '0' && c <= '9', "Content-Length must be decimal digits");
        const auto digit = static_cast<std::size_t>(c - '0');
        require(length <= (maxBody - digit) / 10, "Content-Length exceeds body limit");
        length = length * 10 + digit;
    }
    return length;
}
bool dateShape(const std::string& value) {
    if (value.size() != 29 || value[3] != ',' || value[4] != ' ' || value[7] != ' '
        || value[11] != ' ' || value[16] != ' ' || value[19] != ':' || value[22] != ':'
        || value[25] != ' ' || value.substr(26) != "GMT") return false;
    for (const std::size_t i : {5U, 6U, 12U, 13U, 14U, 15U, 17U, 18U, 20U, 21U, 23U, 24U})
        if (value[i] < '0' || value[i] > '9') return false;
    return true;
}
std::string utcDate() {
    const std::time_t now = std::time(nullptr);
    require(now != static_cast<std::time_t>(-1), "Wall clock unavailable");
    std::tm utc{};
    require(gmtime_s(&utc, &now) == 0, "gmtime_s failed");
    constexpr std::array<const char*, 7> days{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
    constexpr std::array<const char*, 12> months{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
    require(utc.tm_wday >= 0 && utc.tm_wday < 7 && utc.tm_mon >= 0 && utc.tm_mon < 12
        && utc.tm_year >= -1900 && utc.tm_year <= 8099, "Date outside format range");
    std::array<char, 30> output{};
    const int count = std::snprintf(output.data(), output.size(), "%s, %02d %s %04d %02d:%02d:%02d GMT",
        days[static_cast<std::size_t>(utc.tm_wday)], utc.tm_mday, months[static_cast<std::size_t>(utc.tm_mon)],
        utc.tm_year + 1900, utc.tm_hour, utc.tm_min, utc.tm_sec);
    require(count == 29, "Date formatting failed");
    return output.data();
}
class BufferedReader {
public:
    BufferedReader(SOCKET socket, Stats& stats, const Deadline& deadline)
        : socket_(socket), stats_(stats), deadline_(deadline) {}
    std::string readHeader() {
        constexpr std::array<Byte, 4> delimiter{0x0D, 0x0A, 0x0D, 0x0A};
        for (;;) {
            const auto found = std::search(pending_.begin(), pending_.end(), delimiter.begin(), delimiter.end());
            if (found != pending_.end()) {
                const auto size = static_cast<std::size_t>(found - pending_.begin()) + 4;
                require(size <= maxHeader, "Header exceeds limit");
                std::string header(reinterpret_cast<const char*>(pending_.data()), size);
                pending_.erase(pending_.begin(), pending_.begin() + static_cast<std::ptrdiff_t>(size));
                std::printf("%s header_bytes=%zu carried_body_bytes=%zu\n", stats_.name, size, pending_.size());
                return header;
            }
            require(pending_.size() <= maxHeader, "Header exceeds limit");
            fill();
        }
    }
    std::vector<Byte> readBody(std::size_t size) {
        require(size <= maxBody, "Body exceeds limit");
        std::vector<Byte> output;
        output.reserve(size);
        while (output.size() < size) {
            if (pending_.empty()) fill();
            const auto count = std::min(size - output.size(), pending_.size());
            output.insert(output.end(), pending_.begin(), pending_.begin() + static_cast<std::ptrdiff_t>(count));
            pending_.erase(pending_.begin(), pending_.begin() + static_cast<std::ptrdiff_t>(count));
        }
        return output;
    }
    bool empty() const noexcept { return pending_.empty(); }
    bool receiveEof() {
        require(empty(), "Unexpected bytes after fixed HTTP message");
        std::array<Byte, 7> bytes{};
        return receiveSome(socket_, bytes, stats_, deadline_) == 0;
    }
private:
    void fill() {
        std::array<Byte, 7> bytes{};
        // First request six, then at most seven; this is not TCP packet segmentation.
        const std::span<Byte> target(bytes.data(), first_ ? 6U : 7U);
        first_ = false;
        const int actual = receiveSome(socket_, target, stats_, deadline_);
        require(actual > 0, "EOF inside HTTP header/body");
        pending_.insert(pending_.end(), bytes.begin(), bytes.begin() + actual);
    }
    SOCKET socket_;
    Stats& stats_;
    const Deadline& deadline_;
    std::vector<Byte> pending_;
    bool first_ = true;
};
template<class Action> void rejectedInMemory(Action action, const char* label) {
    bool rejected = false;
    try { action(); } catch (const std::runtime_error&) { rejected = true; }
    check(rejected, label);
}
void parserChecks() {
    const auto mixed = parseHeader("HTTP/1.1 200 OK\r\ncOnTeNt-LeNgTh: 9\r\n\r\n");
    check(contentLength(field(mixed, "content-length")) == 9, "Case-insensitive field name");
    rejectedInMemory([] { (void)parseHeader("HTTP/1.1 200 OK\r\nContent-Length: 9\r\ncontent-length: 9\r\n\r\n"); }, "Duplicate CL rejected");
    rejectedInMemory([] { (void)parseHeader("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n"); }, "TE outside subset");
    rejectedInMemory([] { (void)parseHeader("HTTP/1.1 200 OK\nContent-Length: 9\r\n\r\n"); }, "Bare LF outside subset");
    rejectedInMemory([] { (void)contentLength("+9"); }, "Nondecimal CL rejected");
    rejectedInMemory([] { (void)contentLength("65"); }, "Oversize body rejected");
}
void runCase(const Deadline& deadline) {
    parserChecks();
    const UniqueSocket listener(socket(AF_INET, SOCK_STREAM, IPPROTO_TCP));
    nonblocking(listener.get());
    const BOOL exclusive = TRUE;
    if (setsockopt(listener.get(), SOL_SOCKET, SO_EXCLUSIVEADDRUSE,
        reinterpret_cast<const char*>(&exclusive), sizeof(exclusive)) == SOCKET_ERROR) failSocket("exclusive bind");
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    address.sin_port = 0;
    if (bind(listener.get(), reinterpret_cast<const sockaddr*>(&address), sizeof(address)) == SOCKET_ERROR) failSocket("bind");
    if (listen(listener.get(), 1) == SOCKET_ERROR) failSocket("listen");
    address = endpoint(listener.get());
    check(address.sin_addr.s_addr == htonl(INADDR_LOOPBACK) && ntohs(address.sin_port) != 0, "Loopback endpoint");
    const unsigned int port = ntohs(address.sin_port);
    std::printf("listener=127.0.0.1:%u deadline_seconds=8\n", port);
    const UniqueSocket client(socket(AF_INET, SOCK_STREAM, IPPROTO_TCP));
    nonblocking(client.get());
    connectSelf(client.get(), address, deadline);
    const UniqueSocket server(acceptSelf(listener.get(), deadline));
    nonblocking(server.get());
    check(sameEndpoint(endpoint(server.get(), true), endpoint(client.get()))
        && sameEndpoint(endpoint(server.get()), address), "Self-client endpoints");
    Stats clientStats{"client"}, serverStats{"server"};
    BufferedReader serverReader(server.get(), serverStats, deadline);
    BufferedReader clientReader(client.get(), clientStats, deadline);
    const std::string host = "127.0.0.1:" + std::to_string(port);
    const std::string request = "GET /study-demo HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\n\r\n";
    sendAll(client.get(), std::span<const Byte>(reinterpret_cast<const Byte*>(request.data()), request.size()), clientStats, deadline);
    const auto requestHeader = parseHeader(serverReader.readHeader());
    check(requestHeader.startLine == "GET /study-demo HTTP/1.1" && requestHeader.fields.size() == 2
        && field(requestHeader, "host") == host && lowerAscii(field(requestHeader, "connection")) == "close", "Fixed request header");
    check(serverReader.empty(), "No carried request body");
    std::printf("server request_valid=true host=%s request_body_bytes=0\n", host.c_str());
    const std::string date = utcDate();
    const std::string responseHeader = "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 9\r\nConnection: close\r\nDate: " + date + "\r\n\r\n";
    std::vector<Byte> response(responseHeader.begin(), responseHeader.end());
    constexpr std::array<Byte, 5> bodyPrefix{0x48, 0x54, 0x54, 0x50, 0x20};
    constexpr std::array<Byte, 4> bodySuffix{0xE3, 0x81, 0x82, 0x0A};
    response.insert(response.end(), bodyPrefix.begin(), bodyPrefix.end());
    response.insert(response.end(), bodySuffix.begin(), bodySuffix.end());
    sendAll(server.get(), response, serverStats, deadline);
    shutdownSend(server.get());
    const auto parsed = parseHeader(clientReader.readHeader());
    check(parsed.startLine == "HTTP/1.1 200 OK" && parsed.fields.size() == 4
        && field(parsed, "content-type") == "text/plain; charset=utf-8"
        && lowerAscii(field(parsed, "connection")) == "close", "Fixed response header");
    check(dateShape(field(parsed, "date")) && field(parsed, "date") == date, "Generated UTC Date");
    const std::size_t size = contentLength(field(parsed, "content-length"));
    check(size == 9, "Content-Length counts body octets");
    const auto body = clientReader.readBody(size);
    check(body.size() == expectedBody.size() && std::equal(body.begin(), body.end(), expectedBody.begin()), "Exact body bytes");
    check(clientReader.empty(), "No extra bytes after body");
    std::printf("client status=200 content_length=%zu body_bytes=%zu message_complete=true\n", size, body.size());
    std::printf("client date=%s\n", date.c_str());
    std::printf("client body_hex="); printHex(body);
    check(clientReader.receiveEof(), "Client connection-close EOF after complete message");
    std::puts("client response_eof=true");
    shutdownSend(client.get());
    check(serverReader.receiveEof(), "Server request-direction EOF");
    std::puts("server request_eof=true");
    check(clientStats.sent == request.size() && serverStats.received == request.size()
        && serverStats.sent == response.size() && clientStats.received == response.size(), "HTTP cumulative byte totals");
    printStats(clientStats); printStats(serverStats);
}
} // namespace
int main() {
    try {
        {
            const WsaSession session;
            const Deadline deadline;
            runCase(deadline);
            check(liveSockets == 0 && !cleanupFailed, "All socket handles closed");
            deadline.ensure();
            check(true, "Common deadline satisfied");
            std::printf("closed_sockets=3 live_sockets=%u readiness_waits=%u\n", liveSockets, readinessWaits);
        }
        if (cleanupFailed) return 1;
        std::printf("PASS: %u checks\n", checks);
        return 0;
    } catch (const SocketFailure& error) {
        std::fprintf(stderr, "FAIL: %s WSAError=%d\n", error.operation, error.code); return 1;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what()); return 1;
    }
}
