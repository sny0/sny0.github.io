#include <algorithm>
#include <array>
#include <cfenv>
#include <climits>
#include <cmath>
#include <cstdio>
#include <exception>
#include <limits>
#include <stdexcept>

#if !defined(FE_TONEAREST)
#error This sample requires FE_TONEAREST.
#endif

using FloatLimits = std::numeric_limits<float>;
using DoubleLimits = std::numeric_limits<double>;
static_assert(CHAR_BIT == 8 && sizeof(float) == 4 && sizeof(double) == 8);
static_assert(FloatLimits::is_iec559 && FloatLimits::radix == 2 && FloatLimits::digits == 24);
static_assert(FloatLimits::min_exponent == -125 && FloatLimits::max_exponent == 128);
static_assert(FloatLimits::has_infinity && FloatLimits::has_quiet_NaN);
static_assert(FloatLimits::has_denorm == std::denorm_present);
static_assert(DoubleLimits::is_iec559 && DoubleLimits::radix == 2 && DoubleLimits::digits == 53);
static_assert(DoubleLimits::min_exponent == -1021 && DoubleLimits::max_exponent == 1024);

namespace {
unsigned int checks = 0;
bool restoreFailed = false;

void check(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
    ++checks;
}

class NearestEnvironment {
public:
    NearestEnvironment() {
        if (std::fegetenv(&saved_) != 0) throw std::runtime_error("fegetenv failed");
        if (std::fesetround(FE_TONEAREST) != 0) {
            if (std::fesetenv(&saved_) != 0) restoreFailed = true;
            throw std::runtime_error("fesetround failed");
        }
    }
    ~NearestEnvironment() noexcept {
        if (std::fesetenv(&saved_) != 0) {
            restoreFailed = true;
            std::fputs("FAIL: floating-point environment restore failed\n", stderr);
        }
    }
    NearestEnvironment(const NearestEnvironment&) = delete;
    NearestEnvironment& operator=(const NearestEnvironment&) = delete;
private:
    std::fenv_t saved_{};
};

// Policy for binary32 inputs, not an all-double comparator or an ordering relation.
bool nearlyEqual(float a, float b, double absTol, double relTol) {
    // Validate even when a == b or an input is NaN.
    if (!std::isfinite(absTol) || absTol < 0.0
        || !std::isfinite(relTol) || relTol < 0.0 || relTol >= 1.0) {
        throw std::invalid_argument("Invalid tolerance");
    }
    if (std::isnan(a) || std::isnan(b)) return false;
    if (a == b) return true; // Includes signed zeros and same-sign infinities.
    if (!std::isfinite(a) || !std::isfinite(b)) return false;

    const double da = static_cast<double>(a);
    const double db = static_cast<double>(b);
    const double diff = std::fabs(da - db);
    const double scale = std::max(std::fabs(da), std::fabs(db));
    return diff <= std::max(absTol, relTol * scale);
}

const char* text(bool value) { return value ? "true" : "false"; }

void observe() {
    constexpr float infinity = FloatLimits::infinity();
    constexpr float nan = FloatLimits::quiet_NaN();
    constexpr float maximum = FloatLimits::max();
    struct Case {
        const char* label;
        float a;
        float b;
        double absTol;
        double relTol;
        bool expected;
    };
    const std::array<Case, 19> cases{{
        {"exact_equal", 1.5f, 1.5f, 0.0, 0.0, true},
        {"signed_zero", 0.0f, -0.0f, 0.0, 0.0, true},
        {"zero_tolerance", 1.0f, 1.25f, 0.0, 0.0, false},
        {"absolute_inside", 0.0f, 0.125f, 0.25, 0.0, true},
        {"absolute_boundary", 0.0f, 0.25f, 0.25, 0.0, true},
        {"absolute_outside", 0.0f, 0.5f, 0.25, 0.0, false},
        {"relative_inside", 1024.0f, 1152.0f, 0.0, 0.125, true},
        {"relative_boundary", 896.0f, 1024.0f, 0.0, 0.125, true},
        {"relative_outside", 880.0f, 1024.0f, 0.0, 0.125, false},
        {"large_coordinates", 1048576.0f, 1048608.0f, 0.0, 0x1p-15, true},
        {"opposite_max_false", maximum, -maximum, 1.0, 0.5, false},
        {"opposite_max_wide_tol", maximum, -maximum, DoubleLimits::max(), 0.0, true},
        {"nan_left", nan, 1.0f, 1.0, 0.0, false},
        {"nan_right", 1.0f, nan, 1.0, 0.0, false},
        {"same_positive_inf", infinity, infinity, 0.0, 0.0, true},
        {"same_negative_inf", -infinity, -infinity, 0.0, 0.0, true},
        {"opposite_inf", infinity, -infinity, 1.0, 0.5, false},
        {"finite_then_inf", maximum, infinity, 1.0, 0.5, false},
        {"inf_then_finite", infinity, maximum, 1.0, 0.5, false}
    }};
    for (const Case& item : cases) {
        const bool actual = nearlyEqual(item.a, item.b, item.absTol, item.relTol);
        check(actual == item.expected, item.label);
        std::printf("case %s: actual=%s expected=%s\n",
            item.label, text(actual), text(item.expected));
    }

    struct Invalid { const char* label; double absTol; double relTol; bool useNan; };
    const double doubleNan = DoubleLimits::quiet_NaN();
    const double doubleInf = DoubleLimits::infinity();
    const std::array<Invalid, 7> invalid{{
        {"negative_abs", -1.0, 0.0, false},
        {"nan_abs", doubleNan, 0.0, false},
        {"infinite_abs", doubleInf, 0.0, false},
        {"negative_rel", 0.0, -0.125, true},
        {"nan_rel", 0.0, doubleNan, true},
        {"infinite_rel", 0.0, doubleInf, true},
        {"relative_one", 0.0, 1.0, true}
    }};
    for (const Invalid& item : invalid) {
        bool rejected = false;
        try {
            (void)nearlyEqual(item.useNan ? nan : 1.0f, 1.0f, item.absTol, item.relTol);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        check(rejected, item.label);
        std::printf("invalid %s: rejected=%s\n", item.label, text(rejected));
    }

    const bool ab = nearlyEqual(0.0f, 0.75f, 1.0, 0.0);
    const bool bc = nearlyEqual(0.75f, 1.5f, 1.0, 0.0);
    const bool ac = nearlyEqual(0.0f, 1.5f, 1.0, 0.0);
    check(ab && bc && !ac, "Non-transitivity fixture");
    std::printf("nontransitive: AB=%s BC=%s AC=%s\n", text(ab), text(bc), text(ac));

    volatile float base = 16777216.0f;
    volatile float step = 1.0f;
    const float rounded = base + step;
    const double lostDiff = static_cast<double>(rounded) - static_cast<double>(base);
    check(rounded == 16777216.0f && lostDiff == 0.0, "Runtime rounded coordinate");
    const bool lostNear = nearlyEqual(base, rounded, 0.0, 0.0);
    check(lostNear, "Comparison cannot recover a lost difference");
    std::printf("rounded_coordinate: base=%.9g after_plus_one=%.9g double_diff=%.17g near=%s\n",
        static_cast<double>(base), static_cast<double>(rounded), lostDiff, text(lostNear));

    const double endpointDiff = static_cast<double>(maximum) - static_cast<double>(-maximum);
    check(std::isfinite(endpointDiff) && endpointDiff > static_cast<double>(maximum),
        "Finite binary32 endpoints must use a wide difference");
    std::printf("finite_endpoints: double_diff=%.17g\n", endpointDiff);
    check(static_cast<double>(FloatLimits::epsilon()) == 0x1p-23, "Gap above one");
    std::printf("epsilon: C++ epsilon=%.17g denorm_min=%.17g\n",
        static_cast<double>(FloatLimits::epsilon()), static_cast<double>(FloatLimits::denorm_min()));
}
} // namespace

int main() {
    try {
        {
            const NearestEnvironment environment;
            if (std::fegetround() != FE_TONEAREST) throw std::runtime_error("Rounding mode mismatch");
            std::puts("binary32 inputs -> binary64 difference/scale; FE_TONEAREST; strict-FP build");
            observe();
        }
        if (restoreFailed) return 1;
        std::printf("environment restored; PASS: %u checks\n", checks);
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    }
}
