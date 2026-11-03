#include <array>
#include <bit>
#include <bitset>
#include <cinttypes>
#include <climits>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <exception>
#include <limits>
#include <stdexcept>
#include <string>
#include <type_traits>

#if CHAR_BIT != 8
#error This sample requires an 8-bit C++ byte.
#endif
#if !defined(UINT32_MAX) || !defined(INT32_MAX)
#error This sample requires the optional exact-width uint32_t and int32_t types.
#endif

static_assert(sizeof(std::uint32_t) == 4 && sizeof(std::int32_t) == 4);
static_assert(std::numeric_limits<std::uint32_t>::digits == 32);
static_assert(std::numeric_limits<std::int32_t>::digits == 31);

namespace {
using Bytes32 = std::array<unsigned char, 4>;
unsigned checks = 0;

void check(bool condition, const char* message) {
    ++checks;
    if (!condition) throw std::runtime_error(message);
}

// Wire format: byte order is specified here, independently of the host.
constexpr Bytes32 encodeLittle(std::uint32_t value) noexcept {
    Bytes32 bytes{};
    const std::uintmax_t wide = value;
    for (std::size_t i = 0; i < bytes.size(); ++i)
        bytes[i] = static_cast<unsigned char>((wide >> (8u * i)) & 0xFFu);
    return bytes;
}
constexpr Bytes32 encodeBig(std::uint32_t value) noexcept {
    Bytes32 bytes{};
    const std::uintmax_t wide = value;
    for (std::size_t i = 0; i < bytes.size(); ++i)
        bytes[bytes.size() - 1 - i] = static_cast<unsigned char>((wide >> (8u * i)) & 0xFFu);
    return bytes;
}
constexpr std::uint32_t decodeLittle(const Bytes32& bytes) noexcept {
    std::uintmax_t value = 0;
    for (std::size_t i = 0; i < bytes.size(); ++i)
        value |= std::uintmax_t{bytes[i]} << (8u * i);
    return static_cast<std::uint32_t>(value);
}
constexpr std::uint32_t decodeBig(const Bytes32& bytes) noexcept {
    std::uintmax_t value = 0;
    for (unsigned char byte : bytes)
        value = (value << 8u) | std::uintmax_t{byte};
    return static_cast<std::uint32_t>(value);
}

template<class T>
std::array<unsigned char, sizeof(T)> objectBytes(const T& value) noexcept {
    static_assert(std::is_trivially_copyable_v<T>);
    std::array<unsigned char, sizeof(T)> bytes{};
    std::memcpy(bytes.data(), &value, sizeof(value));
    return bytes;
}

template<std::size_t N>
void printBytes(const char* label, const std::array<unsigned char, N>& bytes) {
    std::printf("%s:", label);
    for (unsigned char byte : bytes)
        std::printf(" %02X", static_cast<unsigned>(byte));
    std::printf("\n");
}

void verifyCodecs() {
    struct Fixture { std::uint32_t value; Bytes32 little; Bytes32 big; };
    // Literal expectations, not calculated by the codecs under test.
    constexpr std::array<Fixture, 5> fixtures{{
        {UINT32_C(0),          {0x00, 0x00, 0x00, 0x00}, {0x00, 0x00, 0x00, 0x00}},
        {UINT32_C(1),          {0x01, 0x00, 0x00, 0x00}, {0x00, 0x00, 0x00, 0x01}},
        {UINT32_C(0x12345678), {0x78, 0x56, 0x34, 0x12}, {0x12, 0x34, 0x56, 0x78}},
        {UINT32_C(0x80000000), {0x00, 0x00, 0x00, 0x80}, {0x80, 0x00, 0x00, 0x00}},
        {UINT32_C(0xFFFFFFFF), {0xFF, 0xFF, 0xFF, 0xFF}, {0xFF, 0xFF, 0xFF, 0xFF}}
    }};
    for (const auto& fixture : fixtures) {
        check(encodeLittle(fixture.value) == fixture.little, "Little-endian encoding mismatch");
        check(encodeBig(fixture.value) == fixture.big, "Big-endian encoding mismatch");
        check(decodeLittle(fixture.little) == fixture.value, "Little-endian literal decoding mismatch");
        check(decodeBig(fixture.big) == fixture.value, "Big-endian literal decoding mismatch");
        check(decodeLittle(encodeLittle(fixture.value)) == fixture.value, "Little-endian round trip failed");
        check(decodeBig(encodeBig(fixture.value)) == fixture.value, "Big-endian round trip failed");
    }
}

void observeFlags() {
    // Keep these operands unsigned even on hosts with unusual integral promotions.
    constexpr std::uintmax_t visible = std::uintmax_t{1} << 0u;
    constexpr std::uintmax_t enabled = std::uintmax_t{1} << 5u;
    std::uintmax_t flags = 0;
    flags |= visible;
    flags |= enabled;
    check(flags == 0x21u, "Setting flags failed");
    check((flags & enabled) != 0, "Enabled flag was not set");
    flags &= ~visible;
    check(flags == 0x20u, "Clearing one flag changed another flag");
    check((flags & visible) == 0, "Visible flag was not cleared");
    std::printf("flags after set/clear: 0x%08" PRIX32 " (enabled=1, visible=0)\n",
                static_cast<std::uint32_t>(flags));
}
} // namespace

int main() {
    try {
        verifyCodecs();
        constexpr std::uint32_t value = UINT32_C(0x12345678);
        const std::string bits = std::bitset<32>{static_cast<unsigned long long>(value)}.to_string();
        std::printf("value decimal=%" PRIu32 " hex=0x%08" PRIX32 "\n", value, value);
        std::printf("value bits (most significant first)=%s\n", bits.c_str());
        std::printf("sizeof(uint32_t)=%zu C++ bytes; CHAR_BIT=%d\n", sizeof(value), CHAR_BIT);
        const auto native = objectBytes(value);
        const auto little = encodeLittle(value);
        const auto big = encodeBig(value);
        if constexpr (std::endian::native == std::endian::little) {
            std::printf("std::endian::native=little\n");
            check(native == little, "Native little-endian bytes mismatch");
        } else if constexpr (std::endian::native == std::endian::big) {
            std::printf("std::endian::native=big\n");
            check(native == big, "Native big-endian bytes mismatch");
        } else {
            std::printf("std::endian::native=other/mixed (observation only)\n");
        }
        printBytes("native object bytes (in increasing address order)", native);
        printBytes("explicit little-endian bytes", little);
        printBytes("explicit big-endian bytes", big);

        constexpr Bytes32 wire{0x12, 0x34, 0x56, 0x78};
        printBytes("same wire bytes", wire);
        const auto asLittle = decodeLittle(wire);
        const auto asBig = decodeBig(wire);
        check(asLittle == UINT32_C(0x78563412), "Opposite byte-order interpretation mismatch");
        check(asBig == UINT32_C(0x12345678) && asLittle != asBig, "Wire byte orders were not distinguished");
        std::printf("wire decoded as LE=0x%08" PRIX32 "; as BE=0x%08" PRIX32 "\n", asLittle, asBig);

        const std::int32_t negative = -1;
        const std::uint32_t converted = static_cast<std::uint32_t>(negative);
        check(converted == UINT32_C(0xFFFFFFFF), "Signed-to-unsigned value conversion mismatch");
        std::printf("signed value=%" PRId32 "; converted uint32_t=%" PRIu32 " (0x%08" PRIX32 ")\n",
                    negative, converted, converted);
        printBytes("signed -1 native object bytes (separate observation)", objectBytes(negative));
        observeFlags();
        std::printf("PASS: %u checks; no signed overflow or out-of-range shift executed\n", checks);
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    }
}
