using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;

internal static class Program
{
    private static int checks;
    private static bool cleanupFailed;
    private static readonly byte[] Expected =
        { 0x41, 0x42, 0x00, 0x0D, 0x0A, 0xE3, 0x81, 0x82, 0x10, 0x20, 0xFE, 0xFF };
    private static readonly byte[] ExpectedAfterSeek = { 0xE3, 0x81, 0x82 };

    private sealed class OwnedFixture : IDisposable
    {
        private readonly DirectoryInfo directory = Directory.CreateTempSubdirectory("file-read-observation-");
        private bool ownsFile;
        public string FilePath => Path.Combine(directory.FullName, "fixture.bin");
        public string MissingPath => Path.Combine(directory.FullName, "missing.bin");
        public void MarkFileOwned() => ownsFile = true;

        public void Dispose()
        {
            try
            {
                if (ownsFile) File.Delete(FilePath);
            }
            catch (Exception error)
            {
                cleanupFailed = true;
                Console.Error.WriteLine("CLEANUP FAIL: File.Delete " + error.GetType().Name);
            }
            try
            {
                directory.Delete(recursive: false); // Empty owned directory only; never recurse.
            }
            catch (Exception error)
            {
                cleanupFailed = true;
                Console.Error.WriteLine("CLEANUP FAIL: Directory.Delete " + error.GetType().Name);
            }
        }
    }

    private static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
    private static void Check(bool condition, string message)
    {
        Require(condition, message);
        ++checks;
    }

    private static void CreateFixture(OwnedFixture fixture)
    {
        using var output = new FileStream(fixture.FilePath, FileMode.CreateNew, FileAccess.Write,
            FileShare.None, bufferSize: 4096, options: FileOptions.None);
        fixture.MarkFileOwned();
        // Construct the file in segments; the independent expected array is above.
        output.Write(new byte[] { 0x41, 0x42, 0x00, 0x0D, 0x0A }.AsSpan());
        output.Write(new byte[] { 0xE3, 0x81, 0x82 }.AsSpan());
        output.Write(new byte[] { 0x10, 0x20, 0xFE, 0xFF }.AsSpan());
    }

    private static int ReadAndPrint(FileStream input, Span<byte> buffer, string label)
    {
        long before = input.Position;
        int actual = input.Read(buffer);
        long after = input.Position;
        Require(actual >= 0 && actual <= buffer.Length && after == before + actual,
            "Read count/position mismatch");
        string hex = actual == 0 ? "(empty)" : string.Join(" ",
            buffer.Slice(0, actual).ToArray().Select(value => value.ToString("X2", CultureInfo.InvariantCulture)));
        Console.WriteLine($"{label} requested={buffer.Length} actual={actual} position={before}->{after} hex={hex}");
        return actual;
    }

    private static void Observe(OwnedFixture fixture)
    {
        using var input = new FileStream(fixture.FilePath, FileMode.Open, FileAccess.Read,
            FileShare.Read, bufferSize: 4096, options: FileOptions.None);
        Check(input.Length == 12, "Fixture length must be 12");
        Check(input.Position == 0, "Initial position must be zero");
        Console.WriteLine("file_length=12 app_buffer=5 filestream_buffer_setting=4096 synchronous=true OS_cache_allowed=true");

        byte[] buffer = new byte[5];
        var collected = new List<byte>(Expected.Length);
        bool sawEof = false;
        for (int call = 0; call <= Expected.Length; ++call)
        {
            int actual = ReadAndPrint(input, buffer.AsSpan(), "read");
            if (actual == 0) { sawEof = true; break; }
            Require(collected.Count + actual <= Expected.Length, "Read beyond fixture expectation");
            for (int index = 0; index < actual; ++index) collected.Add(buffer[index]);
        }
        Check(collected.SequenceEqual(Expected), "Sequential bytes mismatch");
        Check(sawEof && input.Position == 12, "EOF must return zero and keep position at length");

        long moved = input.Seek(5, SeekOrigin.Begin);
        Check(moved == 5, "Seek must move to byte offset five");
        Console.WriteLine("seek offset=5");
        byte[] reread = new byte[3];
        int total = 0;
        while (total < reread.Length)
        {
            int actual = ReadAndPrint(input, reread.AsSpan(total), "seek_read");
            Require(actual > 0, "Unexpected EOF during seek reread");
            total += actual;
        }
        Check(reread.SequenceEqual(ExpectedAfterSeek) && input.Position == 8, "Seek bytes/position mismatch");
        Check(input.Length == 12, "Reading/seeking must not change file length");
        Console.WriteLine("after_seek file_length=12 position=8 reread_bytes=3");

        bool rejected = false;
        try
        {
            using var missing = new FileStream(fixture.MissingPath, FileMode.Open, FileAccess.Read,
                FileShare.Read, bufferSize: 4096, options: FileOptions.None);
        }
        catch (FileNotFoundException)
        {
            rejected = true;
        }
        Check(rejected, "Missing file must throw FileNotFoundException");
        Console.WriteLine("missing_file rejected=true exception=FileNotFoundException");
    }

    private static int Main()
    {
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            Console.WriteLine(RuntimeInformation.FrameworkDescription);
            using (var fixture = new OwnedFixture())
            {
                CreateFixture(fixture);
                Observe(fixture);
            }
            if (cleanupFailed) return 1;
            Console.WriteLine($"cleanup=complete PASS: {checks} checks");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error.GetType().Name);
            return 1;
        }
    }
}
