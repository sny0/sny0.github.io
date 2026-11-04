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
#include <span>
#include <stdexcept>

namespace {
using Byte = unsigned char;
constexpr std::array<Byte, 14> wire{0x00, 0x06, 0x41, 0x42, 0x00, 0xE3, 0x81, 0x82,
    0x00, 0x04, 0x10, 0x20, 0x30, 0x40};
constexpr std::array<Byte, 6> firstBody{0x41, 0x42, 0x00, 0xE3, 0x81, 0x82};
constexpr std::array<Byte, 4> secondBody{0x10, 0x20, 0x30, 0x40};
constexpr std::array<Byte, 4> applicationAck{0x4F, 0x4B, 0x00, 0x01};
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
        const int requested = static_cast<int>(std::min<std::size_t>(3, bytes.size()));
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
    const int requested = static_cast<int>(std::min<std::size_t>(3, bytes.size()));
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
void receiveExact(SOCKET socket, std::span<Byte> bytes, Stats& stats, const Deadline& deadline) {
    while (!bytes.empty()) {
        const int actual = receiveSome(socket, bytes, stats, deadline);
        require(actual != 0, "Unexpected EOF inside frame/ACK");
        bytes = bytes.subspan(static_cast<std::size_t>(actual));
    }
}
unsigned int decodeLength(const std::array<Byte, 2>& header) {
    const unsigned int length = (static_cast<unsigned int>(header[0]) << 8U) | header[1];
    if (length > 8) throw std::runtime_error("Frame body length exceeds limit eight");
    return length;
}
void shutdownSend(SOCKET socket) {
    if (shutdown(socket, SD_SEND) == SOCKET_ERROR) failSocket("shutdown(SD_SEND)");
}
void printStats(const Stats& stats) {
    std::printf("%s totals: send_calls=%u recv_calls=%u sent_bytes=%u received_bytes=%u would_block=%u\n",
        stats.name, stats.sendCalls, stats.recvCalls, stats.sent, stats.received, stats.wouldBlock);
}

void runCase(const Deadline& deadline) {
    const UniqueSocket listener(socket(AF_INET, SOCK_STREAM, IPPROTO_TCP));
    nonblocking(listener.get());
    const BOOL exclusive = TRUE;
    if (setsockopt(listener.get(), SOL_SOCKET, SO_EXCLUSIVEADDRUSE,
        reinterpret_cast<const char*>(&exclusive), sizeof(exclusive)) == SOCKET_ERROR) failSocket("exclusive bind");
    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    address.sin_port = 0;
    if (bind(listener.get(), reinterpret_cast<const sockaddr*>(&address), sizeof(address)) == SOCKET_ERROR)
        failSocket("bind(loopback port zero)");
    if (listen(listener.get(), 1) == SOCKET_ERROR) failSocket("listen");
    address = endpoint(listener.get());
    check(address.sin_addr.s_addr == htonl(INADDR_LOOPBACK) && ntohs(address.sin_port) != 0, "Loopback/port assignment");
    std::printf("listener=127.0.0.1:%u deadline_seconds=8\n", static_cast<unsigned int>(ntohs(address.sin_port)));
    const UniqueSocket client(socket(AF_INET, SOCK_STREAM, IPPROTO_TCP));
    nonblocking(client.get());
    connectSelf(client.get(), address, deadline);
    const UniqueSocket server(acceptSelf(listener.get(), deadline));
    nonblocking(server.get());
    check(sameEndpoint(endpoint(server.get(), true), endpoint(client.get()))
        && sameEndpoint(endpoint(server.get()), address) && sameEndpoint(endpoint(client.get(), true), address),
        "Accepted self-client endpoints");

    bool rejected = false;
    try { (void)decodeLength({0x00, 0x09}); }
    catch (const std::runtime_error&) { rejected = true; }
    check(rejected, "Oversize length rejected in memory");
    Stats clientStats{"client"}, serverStats{"server"};
    sendAll(client.get(), wire, clientStats, deadline);
    shutdownSend(client.get());
    std::puts("client shutdown_send=complete");
    bool nulPreserved = false;
    for (unsigned int frame = 0; frame < 2; ++frame) {
        std::array<Byte, 2> header{};
        receiveExact(server.get(), header, serverStats, deadline);
        const unsigned int length = decodeLength(header);
        const std::span<const Byte> expectedBody = frame == 0
            ? std::span<const Byte>(firstBody) : std::span<const Byte>(secondBody);
        check(length == expectedBody.size(), "Big-endian frame length");
        std::array<Byte, 8> body{};
        const std::span<Byte> payload(body.data(), length);
        receiveExact(server.get(), payload, serverStats, deadline);
        check(std::equal(payload.begin(), payload.end(), expectedBody.begin()), "Frame body bytes");
        if (frame == 0) nulPreserved = payload[2] == 0;
        std::printf("server frame=%u length=%u hex=", frame + 1, length);
        printHex(payload);
    }
    check(nulPreserved, "Binary NUL preserved");
    std::array<Byte, 3> eofBuffer{};
    check(receiveSome(server.get(), eofBuffer, serverStats, deadline) == 0, "Server graceful EOF after client half-close");
    std::puts("server eof=true; reverse direction remains usable");
    sendAll(server.get(), applicationAck, serverStats, deadline);
    shutdownSend(server.get());
    std::puts("server shutdown_send=complete");
    std::array<Byte, 4> receivedAck{};
    receiveExact(client.get(), receivedAck, clientStats, deadline);
    check(receivedAck == applicationAck, "Application ACK exact bytes");
    std::printf("client application_ack hex="); printHex(receivedAck);
    check(receiveSome(client.get(), eofBuffer, clientStats, deadline) == 0, "Client graceful EOF after server half-close");
    std::puts("client eof=true");
    check(clientStats.sent == 14 && serverStats.received == 14
        && serverStats.sent == 4 && clientStats.received == 4, "Cumulative byte totals");
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
        std::fprintf(stderr, "FAIL: %s WSAError=%d\n", error.operation, error.code);
        return 1;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    }
}
