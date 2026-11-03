#include <array>
#include <bit>
#include <cfenv>
#include <cinttypes>
#include <climits>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <exception>
#include <limits>
#include <stdexcept>

#if CHAR_BIT != 8
#error This sample requires an 8-bit C++ byte.
#endif
#if !defined(UINT32_MAX)
#error This sample requires the optional exact-width uint32_t type.
#endif
#if !defined(FE_TONEAREST)
#error This sample requires FE_TONEAREST support.
#endif

using FloatLimits = std::numeric_limits<float>;
static_assert(sizeof(float) == 4 && sizeof(std::uint32_t) == 4);
static_assert(std::numeric_limits<std::uint32_t>::digits == 32);
static_assert(FloatLimits::is_iec559 && FloatLimits::radix == 2 && FloatLimits::digits == 24);
static_assert(FloatLimits::min_exponent == -125 && FloatLimits::max_exponent == 128);
static_assert(FloatLimits::has_denorm == std::denorm_present);
static_assert(FloatLimits::has_infinity && FloatLimits::has_quiet_NaN);

namespace {
unsigned checks = 0;
bool environmentRestoreFailed = false;
void check(bool condition, const char* message) {
    ++checks;
    if (!condition) throw std::runtime_error(message);
}

class NearestEnvironment {
public:
    NearestEnvironment() {
        if (std::fegetenv(&saved_) != 0) throw std::runtime_error("fegetenv failed");
        if (std::fesetround(FE_TONEAREST) != 0) {
            if (std::fesetenv(&saved_) != 0) environmentRestoreFailed = true;
            throw std::runtime_error("FE_TONEAREST could not be established");
        }
    }
    ~NearestEnvironment() noexcept {
        if (std::fesetenv(&saved_) != 0) {
            environmentRestoreFailed = true;
            std::fputs("FAIL: floating-point environment restore failed\n", stderr);
        }
    }
    NearestEnvironment(const NearestEnvironment&) = delete;
    NearestEnvironment& operator=(const NearestEnvironment&) = delete;
private:
    std::fenv_t saved_{};
};

std::uint32_t rawWord(float value) noexcept { return std::bit_cast<std::uint32_t>(value); }
const char* className(float value) {
    switch (std::fpclassify(value)) {
    case FP_ZERO: return "zero";
    case FP_SUBNORMAL: return "subnormal";
    case FP_NORMAL: return "normal";
    case FP_INFINITE: return "infinity";
    case FP_NAN: return "NaN";
    default: return "unknown";
    }
}
void printValue(const char* label, float value) {
    const auto word = rawWord(value);
    const std::uintmax_t wide = word;
    const auto sign = static_cast<unsigned>(wide >> 31u);
    const auto exponent = static_cast<unsigned>((wide >> 23u) & 0xFFu);
    const auto fraction = static_cast<std::uint32_t>(wide & 0x7FFFFFu);
    std::printf("%-12s decimal=%.*g hexfloat=%a raw=0x%08" PRIX32
                " sign=%u E=%u fraction=0x%06" PRIX32 " class=%s\n",
                label, FloatLimits::max_digits10, static_cast<double>(value),
                static_cast<double>(value), word, sign, exponent, fraction, className(value));
}

void observeValues() {
    struct Fixture { const char* label; float value; std::uint32_t word; };
    const std::array<Fixture, 7> fixtures{{
        {"0.1f", 0.1f, UINT32_C(0x3DCCCCCD)},
        {"1.0f", 1.0f, UINT32_C(0x3F800000)},
        {"1.5f", 1.5f, UINT32_C(0x3FC00000)},
        {"2.0f", 2.0f, UINT32_C(0x40000000)},
        {"-0.0f", -0.0f, UINT32_C(0x80000000)},
        {"denorm_min", FloatLimits::denorm_min(), UINT32_C(0x00000001)},
        {"infinity", FloatLimits::infinity(), UINT32_C(0x7F800000)}
    }};
    // These words test our target-layout assumption, not a universal float/uint mapping.
    // Do not decode sign/E/fraction on a host whose relative object layouts differ.
    for (const auto& fixture : fixtures)
        check(rawWord(fixture.value) == fixture.word,
              "Unsupported native float/uint32 mapping for this binary32 field decoder");
    std::printf("Field layout matched the tested binary32/uint32 word convention.\n");
    for (const auto& fixture : fixtures) printValue(fixture.label, fixture.value);

    check(-0.0f == 0.0f && std::signbit(-0.0f), "Negative zero classification failed");
    check(FloatLimits::denorm_min() > 0.0f &&
          std::fpclassify(FloatLimits::denorm_min()) == FP_SUBNORMAL,
          "Subnormal observation requires non-flushed input values");
    check(std::isinf(FloatLimits::infinity()), "Infinity classification failed");
    const float quietNaN = FloatLimits::quiet_NaN();
    check(std::isnan(quietNaN), "quiet_NaN was not recognized by isnan");
    printValue("quiet_NaN", quietNaN); // NaN sign/payload are displayed, not fixed expectations.
}

void observeSpacing() {
    struct Fixture { float value; double down; double up; };
    // Independent expected gaps, all exact powers of two.
    constexpr std::array<Fixture, 5> fixtures{{
        {1.0f,       0x1p-24, 0x1p-23},
        {2.0f,       0x1p-23, 0x1p-22},
        {65536.0f,   0x1p-8,  0x1p-7},
        {100000.0f,  0x1p-7,  0x1p-7},
        {16777216.0f, 1.0,     2.0}
    }};
    const float infinity = FloatLimits::infinity();
    for (const auto& fixture : fixtures) {
        const float previous = std::nextafter(fixture.value, -infinity);
        const float next = std::nextafter(fixture.value, infinity);
        const double down = static_cast<double>(fixture.value) - static_cast<double>(previous);
        const double up = static_cast<double>(next) - static_cast<double>(fixture.value);
        check(previous < fixture.value && next > fixture.value, "nextafter direction mismatch");
        check(down == fixture.down, "Gap below x differs from the binary32 expectation");
        check(up == fixture.up, "Gap above x differs from the binary32 expectation");
        std::printf("spacing x=%.*g prev=%.*g next=%.*g gap_down=%.17g gap_up=%.17g\n",
                    FloatLimits::max_digits10, static_cast<double>(fixture.value),
                    FloatLimits::max_digits10, static_cast<double>(previous),
                    FloatLimits::max_digits10, static_cast<double>(next), down, up);
    }
    check(FloatLimits::epsilon() == 0x1p-23f, "Unexpected binary32 epsilon");
    std::printf("epsilon=%.*g (gap above 1, not a universal tolerance)\n",
                FloatLimits::max_digits10, static_cast<double>(FloatLimits::epsilon()));
}

void observeRuntimeRounding() {
    // Volatile operands distinguish runtime additions from constant expressions.
    volatile float base = 16777216.0f;
    volatile float one = 1.0f;
    volatile float two = 2.0f;
    volatile float three = 3.0f;
    const float plusOne = base + one;
    const float plusTwo = base + two;
    const float plusThree = base + three;
    check(plusOne == 16777216.0f, "2^24 + 1 did not round to the even lower significand");
    check(plusTwo == 16777218.0f, "2^24 + 2 should be exactly representable");
    check(plusThree == 16777220.0f, "2^24 + 3 did not round to the even upper significand");
    std::printf("runtime nearest-even: 2^24+1=%.0f; +2=%.0f; +3=%.0f\n",
                static_cast<double>(plusOne), static_cast<double>(plusTwo), static_cast<double>(plusThree));
}

void observe() {
    NearestEnvironment environment;
    check(std::fegetround() == FE_TONEAREST, "Runtime rounding mode is not FE_TONEAREST");
    std::printf("sizeof(float)=%zu CHAR_BIT=%d radix=%d digits=%d max_digits10=%d\n",
                sizeof(float), CHAR_BIT, FloatLimits::radix, FloatLimits::digits, FloatLimits::max_digits10);
    std::printf("rounding=FE_TONEAREST (code=%d); use the supplied strict-FP build settings\n",
                std::fegetround());
    observeValues();
    observeSpacing();
    observeRuntimeRounding();
}
} // namespace

int main() {
    try {
        const int originalRounding = std::fegetround();
        check(originalRounding >= 0, "Initial rounding mode is unavailable");
        observe(); // Its RAII object restores the original floating-point environment.
        check(!environmentRestoreFailed, "Could not restore the floating-point environment");
        check(std::fegetround() == originalRounding, "Original rounding mode was not restored");
        std::printf("environment restored; PASS: %u checks\n", checks);
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    }
}
