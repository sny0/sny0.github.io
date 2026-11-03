using System;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

internal static class Program
{
    private static int checks;

    // Policy for binary32 inputs, not an all-double comparator or an ordering relation.
    private static bool NearlyEqual(float a, float b, double absTol, double relTol)
    {
        // Validate even when a == b or an input is NaN.
        if (!double.IsFinite(absTol) || absTol < 0.0)
            throw new ArgumentOutOfRangeException(nameof(absTol), "Invalid tolerance");
        if (!double.IsFinite(relTol) || relTol < 0.0 || relTol >= 1.0)
            throw new ArgumentOutOfRangeException(nameof(relTol), "Invalid tolerance");
        if (float.IsNaN(a) || float.IsNaN(b)) return false;
        if (a == b) return true; // Includes signed zeros and same-sign infinities.
        if (!float.IsFinite(a) || !float.IsFinite(b)) return false;

        double da = a;
        double db = b;
        double diff = Math.Abs(da - db);
        double scale = Math.Max(Math.Abs(da), Math.Abs(db));
        return diff <= Math.Max(absTol, relTol * scale);
    }

    private static void Check(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
        ++checks;
    }

    private static string Text(bool value) => value ? "true" : "false";

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static float AddAtRuntime(float a, float b) => a + b;

    private static void Observe()
    {
        var cases = new (string Label, float A, float B, double AbsTol, double RelTol, bool Expected)[]
        {
            ("exact_equal", 1.5f, 1.5f, 0.0, 0.0, true),
            ("signed_zero", 0.0f, -0.0f, 0.0, 0.0, true),
            ("zero_tolerance", 1.0f, 1.25f, 0.0, 0.0, false),
            ("absolute_inside", 0.0f, 0.125f, 0.25, 0.0, true),
            ("absolute_boundary", 0.0f, 0.25f, 0.25, 0.0, true),
            ("absolute_outside", 0.0f, 0.5f, 0.25, 0.0, false),
            ("relative_inside", 1024.0f, 1152.0f, 0.0, 0.125, true),
            ("relative_boundary", 896.0f, 1024.0f, 0.0, 0.125, true),
            ("relative_outside", 880.0f, 1024.0f, 0.0, 0.125, false),
            ("large_coordinates", 1048576.0f, 1048608.0f, 0.0, 1.0 / 32768.0, true),
            ("opposite_max_false", float.MaxValue, -float.MaxValue, 1.0, 0.5, false),
            ("opposite_max_wide_tol", float.MaxValue, -float.MaxValue, double.MaxValue, 0.0, true),
            ("nan_left", float.NaN, 1.0f, 1.0, 0.0, false),
            ("nan_right", 1.0f, float.NaN, 1.0, 0.0, false),
            ("same_positive_inf", float.PositiveInfinity, float.PositiveInfinity, 0.0, 0.0, true),
            ("same_negative_inf", float.NegativeInfinity, float.NegativeInfinity, 0.0, 0.0, true),
            ("opposite_inf", float.PositiveInfinity, float.NegativeInfinity, 1.0, 0.5, false),
            ("finite_then_inf", float.MaxValue, float.PositiveInfinity, 1.0, 0.5, false),
            ("inf_then_finite", float.PositiveInfinity, float.MaxValue, 1.0, 0.5, false)
        };
        foreach (var item in cases)
        {
            bool actual = NearlyEqual(item.A, item.B, item.AbsTol, item.RelTol);
            Check(actual == item.Expected, item.Label);
            Console.WriteLine($"case {item.Label}: actual={Text(actual)} expected={Text(item.Expected)}");
        }

        var invalid = new (string Label, double AbsTol, double RelTol, bool UseNan)[]
        {
            ("negative_abs", -1.0, 0.0, false),
            ("nan_abs", double.NaN, 0.0, false),
            ("infinite_abs", double.PositiveInfinity, 0.0, false),
            ("negative_rel", 0.0, -0.125, true),
            ("nan_rel", 0.0, double.NaN, true),
            ("infinite_rel", 0.0, double.PositiveInfinity, true),
            ("relative_one", 0.0, 1.0, true)
        };
        foreach (var item in invalid)
        {
            bool rejected = false;
            try
            {
                _ = NearlyEqual(item.UseNan ? float.NaN : 1.0f, 1.0f, item.AbsTol, item.RelTol);
            }
            catch (ArgumentOutOfRangeException)
            {
                rejected = true;
            }
            Check(rejected, item.Label);
            Console.WriteLine($"invalid {item.Label}: rejected={Text(rejected)}");
        }

        bool ab = NearlyEqual(0.0f, 0.75f, 1.0, 0.0);
        bool bc = NearlyEqual(0.75f, 1.5f, 1.0, 0.0);
        bool ac = NearlyEqual(0.0f, 1.5f, 1.0, 0.0);
        Check(ab && bc && !ac, "Non-transitivity fixture");
        Console.WriteLine($"nontransitive: AB={Text(ab)} BC={Text(bc)} AC={Text(ac)}");

        float start = 16777216.0f;
        float rounded = AddAtRuntime(start, 1.0f);
        double lostDiff = (double)rounded - (double)start;
        Check(rounded == 16777216.0f && lostDiff == 0.0, "Runtime rounded coordinate");
        bool lostNear = NearlyEqual(start, rounded, 0.0, 0.0);
        Check(lostNear, "Comparison cannot recover a lost difference");
        Console.WriteLine($"rounded_coordinate: base={start:G9} after_plus_one={rounded:G9} double_diff={lostDiff:G17} near={Text(lostNear)}");

        double endpointDiff = (double)float.MaxValue - (double)(-float.MaxValue);
        Check(double.IsFinite(endpointDiff) && endpointDiff > (double)float.MaxValue,
            "Finite binary32 endpoints must use a wide difference");
        Console.WriteLine($"finite_endpoints: double_diff={endpointDiff:G17}");
        double gapAboveOne = (double)MathF.BitIncrement(1.0f) - 1.0;
        Check(gapAboveOne == 1.0 / 8388608.0, "Gap above one");
        Console.WriteLine($"epsilon: gap_above_one={gapAboveOne:G17} Single.Epsilon={(double)float.Epsilon:G17}");
    }

    private static int Main()
    {
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            Console.WriteLine(RuntimeInformation.FrameworkDescription);
            Console.WriteLine("binary32 inputs -> binary64 difference/scale; runtime rounding observed below");
            Observe();
            Console.WriteLine($"PASS: {checks} checks");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error.GetType().Name);
            return 1;
        }
    }
}
