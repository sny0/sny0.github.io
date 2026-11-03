using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;

internal static class Program
{
    private static readonly UTF8Encoding StrictUtf8 = new UTF8Encoding(false, true);
    private static readonly UnicodeEncoding StrictUtf16Le = new UnicodeEncoding(false, false, true);
    private static readonly UnicodeEncoding StrictUtf16Be = new UnicodeEncoding(true, false, true);
    private static int checks;

    private sealed class Fixture
    {
        public string Label { get; }
        public string Text { get; }
        public byte[] Utf8 { get; }
        public int[] Utf16 { get; }
        public int[] Scalars { get; }
        public byte[] Utf16Le { get; }
        public byte[] Utf16Be { get; }

        public Fixture(string label, string text, byte[] utf8, int[] utf16, int[] scalars,
            byte[] utf16Le, byte[] utf16Be)
        {
            Label = label;
            Text = text;
            Utf8 = utf8;
            Utf16 = utf16;
            Scalars = scalars;
            Utf16Le = utf16Le;
            Utf16Be = utf16Be;
        }
    }

    private static void Check(bool condition, string message)
    {
        if (!condition)
            throw new InvalidOperationException(message);
        ++checks;
    }

    private static void ExpectRejected<TException>(Action action, string label)
        where TException : Exception
    {
        try
        {
            action();
        }
        catch (TException)
        {
            ++checks;
            Console.WriteLine("rejected: " + label + " (" + typeof(TException).Name + ")");
            return;
        }
        throw new InvalidOperationException("Invalid input was accepted: " + label);
    }

    private static void Observe(Fixture fixture)
    {
        // Validate UTF-16 through the strict encoder before Rune enumeration.
        // EnumerateRunes alone replaces ill-formed UTF-16; it is not validation.
        byte[] utf8 = StrictUtf8.GetBytes(fixture.Text);
        // GetBytes does not automatically prepend GetPreamble().
        byte[] utf16Le = StrictUtf16Le.GetBytes(fixture.Text);
        byte[] utf16Be = StrictUtf16Be.GetBytes(fixture.Text);
        int[] units = fixture.Text.Select(value => (int)value).ToArray();
        var scalars = new List<int>();
        foreach (Rune scalar in fixture.Text.EnumerateRunes())
            scalars.Add(scalar.Value);
        int graphemes = new StringInfo(fixture.Text).LengthInTextElements;

        Check(utf8.SequenceEqual(fixture.Utf8), "UTF-8 mismatch");
        Check(units.SequenceEqual(fixture.Utf16), "UTF-16 mismatch");
        Check(scalars.SequenceEqual(fixture.Scalars), "Scalar mismatch");
        Check(StrictUtf8.GetString(fixture.Utf8) == fixture.Text, "UTF-8 decode mismatch");
        Check(graphemes == 1, "Grapheme fixture mismatch");
        Check(utf16Le.SequenceEqual(fixture.Utf16Le), "UTF-16LE bytes mismatch");
        Check(utf16Be.SequenceEqual(fixture.Utf16Be), "UTF-16BE bytes mismatch");
        Console.WriteLine($"{fixture.Label} utf8_bytes={utf8.Length} utf16_units={fixture.Text.Length} scalars={scalars.Count} graphemes={graphemes}");
        Console.WriteLine("  UTF-8: " + string.Join(" ", utf8.Select(value => value.ToString("X2", CultureInfo.InvariantCulture))));
        Console.WriteLine("  UTF-16 units: " + string.Join(" ", units.Select(value => value.ToString("X4", CultureInfo.InvariantCulture))));
        Console.WriteLine("  scalars: " + string.Join(" ", scalars.Select(value => value.ToString("X4", CultureInfo.InvariantCulture))));
        Console.WriteLine("  UTF-16LE bytes: " + string.Join(" ", utf16Le.Select(value => value.ToString("X2", CultureInfo.InvariantCulture))));
        Console.WriteLine("  UTF-16BE bytes: " + string.Join(" ", utf16Be.Select(value => value.ToString("X2", CultureInfo.InvariantCulture))));
    }

    private static int Main()
    {
        try
        {
            Console.WriteLine(RuntimeInformation.FrameworkDescription);
            Console.WriteLine("Strict UTF-8 / UTF-16LE / UTF-16BE, no BOM; GetBytes does not prepend a preamble.");
            Console.WriteLine("StringInfo uses this runtime's segmentation rules.");
            Fixture[] fixtures =
            {
                new Fixture("A", "A", new byte[] { 0x41 }, new[] { 0x0041 }, new[] { 0x0041 },
                    new byte[] { 0x41, 0x00 }, new byte[] { 0x00, 0x41 }),
                new Fixture("U+3042", "\u3042", new byte[] { 0xE3, 0x81, 0x82 }, new[] { 0x3042 }, new[] { 0x3042 },
                    new byte[] { 0x42, 0x30 }, new byte[] { 0x30, 0x42 }),
                new Fixture("U+1F600", "\U0001F600", new byte[] { 0xF0, 0x9F, 0x98, 0x80 }, new[] { 0xD83D, 0xDE00 }, new[] { 0x1F600 },
                    new byte[] { 0x3D, 0xD8, 0x00, 0xDE }, new byte[] { 0xD8, 0x3D, 0xDE, 0x00 }),
                new Fixture("U+0065+U+0301", "e\u0301", new byte[] { 0x65, 0xCC, 0x81 }, new[] { 0x0065, 0x0301 }, new[] { 0x0065, 0x0301 },
                    new byte[] { 0x65, 0x00, 0x01, 0x03 }, new byte[] { 0x00, 0x65, 0x03, 0x01 })
            };
            foreach (Fixture fixture in fixtures)
                Observe(fixture);

            ExpectRejected<DecoderFallbackException>(() => { _ = StrictUtf8.GetString(new byte[] { 0xC0, 0xAF }); }, "overlong UTF-8");
            ExpectRejected<DecoderFallbackException>(() => { _ = StrictUtf8.GetString(new byte[] { 0xF0, 0x9F, 0x98 }); }, "truncated UTF-8");
            ExpectRejected<DecoderFallbackException>(() => { _ = StrictUtf8.GetString(new byte[] { 0xED, 0xA0, 0x80 }); }, "UTF-8 surrogate");
            ExpectRejected<DecoderFallbackException>(() => { _ = StrictUtf8.GetString(new byte[] { 0xF4, 0x90, 0x80, 0x80 }); }, "above U+10FFFF");
            ExpectRejected<EncoderFallbackException>(() => { _ = StrictUtf8.GetBytes("\uD800"); }, "lone high surrogate");
            ExpectRejected<EncoderFallbackException>(() => { _ = StrictUtf8.GetBytes("\uDC00"); }, "lone low surrogate");
            ExpectRejected<EncoderFallbackException>(() => { _ = StrictUtf8.GetBytes("\uD800A"); }, "high surrogate followed by A");

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
