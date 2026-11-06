#include <winsock2.h>

#include <array>
#include <cstdio>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>

void fail(const char* operation, int code) {
    throw std::runtime_error(std::string(operation) + " failed (Winsock " + std::to_string(code) + ")");
}

class Winsock {
public:
    Winsock() {
        WSADATA data{};
        const int code = WSAStartup(MAKEWORD(2, 2), &data);
        if (code != 0) fail("WSAStartup", code);
    }
    ~Winsock() { WSACleanup(); }
    Winsock(const Winsock&) = delete;
    Winsock& operator=(const Winsock&) = delete;
};

class UdpSocket {
public:
    UdpSocket() : handle_(socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)) {
        if (handle_ == INVALID_SOCKET) fail("socket", WSAGetLastError());
    }
    ~UdpSocket() { closesocket(handle_); }
    UdpSocket(const UdpSocket&) = delete;
    UdpSocket& operator=(const UdpSocket&) = delete;
    SOCKET get() const { return handle_; }

private:
    SOCKET handle_;
};

sockaddr_in bind_loopback(SOCKET handle) {
    sockaddr_in local{};
    local.sin_family = AF_INET;
    local.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    local.sin_port = 0;  // Ask Winsock to choose an available port.
    if (bind(handle, reinterpret_cast<const sockaddr*>(&local), sizeof(local)) == SOCKET_ERROR) {
        fail("bind", WSAGetLastError());
    }
    int length = sizeof(local);
    if (getsockname(handle, reinterpret_cast<sockaddr*>(&local), &length) == SOCKET_ERROR) {
        fail("getsockname", WSAGetLastError());
    }
    return local;
}

void send_packet(SOCKET sender, const sockaddr_in& target, std::string_view data) {
    const auto size = static_cast<int>(data.size());
    const int sent = sendto(sender, data.data(), size, 0,
                            reinterpret_cast<const sockaddr*>(&target), sizeof(target));
    if (sent == SOCKET_ERROR) fail("sendto", WSAGetLastError());
    if (sent != size) throw std::runtime_error("unexpected UDP send length");
}

struct Received {
    int length;
    int error;
};

Received receive_packet(SOCKET receiver, const sockaddr_in& expected_peer, std::span<char> bytes) {
    sockaddr_in peer{};
    int peer_length = sizeof(peer);
    const int count = recvfrom(receiver, bytes.data(), static_cast<int>(bytes.size()), 0,
                               reinterpret_cast<sockaddr*>(&peer), &peer_length);
    if (count == SOCKET_ERROR) return {0, WSAGetLastError()};
    if (peer_length != sizeof(peer) || peer.sin_family != AF_INET ||
        peer.sin_addr.s_addr != expected_peer.sin_addr.s_addr || peer.sin_port != expected_peer.sin_port) {
        throw std::runtime_error("unexpected sender address or port");
    }
    return {count, 0};
}

std::string read_packet(SOCKET receiver, const sockaddr_in& expected_peer) {
    std::array<char, 16> bytes{};
    const auto packet = receive_packet(receiver, expected_peer, bytes);
    if (packet.error != 0) fail("recvfrom", packet.error);
    return std::string(bytes.data(), static_cast<std::size_t>(packet.length));
}

int main() {
    try {
        const Winsock winsock;
        const UdpSocket receiver;
        const UdpSocket sender;
        const auto target = bind_loopback(receiver.get());
        const auto peer = bind_loopback(sender.get());
        constexpr DWORD timeout_ms = 2000;
        if (setsockopt(receiver.get(), SOL_SOCKET, SO_RCVTIMEO,
                       reinterpret_cast<const char*>(&timeout_ms), sizeof(timeout_ms)) == SOCKET_ERROR) {
            fail("setsockopt(SO_RCVTIMEO)", WSAGetLastError());
        }

        send_packet(sender.get(), target, "ABC");
        send_packet(sender.get(), target, "xy");
        const auto first = read_packet(receiver.get(), peer);
        const auto second = read_packet(receiver.get(), peer);
        if (!((first == "ABC" && second == "xy") || (first == "xy" && second == "ABC"))) {
            throw std::runtime_error("expected two separate datagrams");
        }
        std::printf("separate datagrams: %s (%zu), %s (%zu)\n",
                    first.c_str(), first.size(), second.c_str(), second.size());

        send_packet(sender.get(), target, "12345678");
        std::array<char, 4> short_buffer{};
        const auto truncated = receive_packet(receiver.get(), peer, short_buffer);
        if (truncated.error != WSAEMSGSIZE) throw std::runtime_error("expected WSAEMSGSIZE");
        std::puts("8-byte datagram into 4-byte buffer: WSAEMSGSIZE");
        send_packet(sender.get(), target, "after");
        if (read_packet(receiver.get(), peer) != "after") throw std::runtime_error("expected next datagram");
        std::puts("next datagram: after (5)");

        send_packet(sender.get(), target, "");
        if (!read_packet(receiver.get(), peer).empty()) throw std::runtime_error("expected empty datagram");
        std::puts("empty datagram: recvfrom returned 0");
        send_packet(sender.get(), target, "still");
        if (read_packet(receiver.get(), peer) != "still") throw std::runtime_error("expected further datagram");
        std::puts("same socket still receives: still (5)");
    } catch (const std::exception& error) {
        std::fprintf(stderr, "error: %s\n", error.what());
        return 1;
    }
    return 0;
}
