using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

internal static class Program
{
    private static int checks;
    private static bool cleanupFailed;
    private static readonly byte[] Expected =
        { 0x41, 0x42, 0x00, 0x0D, 0x0A, 0xE3, 0x81, 0x82, 0x10, 0x20, 0xFE, 0xFF };

    private sealed class OwnedFixture : IDisposable
    {
        private readonly DirectoryInfo directory = Directory.CreateTempSubdirectory("async-file-read-observation-");
        private bool ownsFile;
        public string FilePath => Path.Combine(directory.FullName, "fixture.bin");
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
                directory.Delete(recursive: false);
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
    private static void Check(bool condition, string message) { Require(condition, message); ++checks; }
    private static void CreateFixture(OwnedFixture fixture)
    {
        using var output = new FileStream(fixture.FilePath, FileMode.CreateNew, FileAccess.Write,
            FileShare.None, bufferSize: 4096, options: FileOptions.None);
        fixture.MarkFileOwned();
        output.Write(new byte[] { 0x41, 0x42, 0x00, 0x0D, 0x0A }.AsSpan());
        output.Write(new byte[] { 0xE3, 0x81, 0x82 }.AsSpan());
        output.Write(new byte[] { 0x10, 0x20, 0xFE, 0xFF }.AsSpan());
    }
    private static uint ShortCalculation(uint seed)
    {
        uint checksum = seed;
        for (uint value = 1; value <= 64; ++value) checksum = unchecked(checksum + value);
        return checksum;
    }

    private static async Task<byte[]> ReadAllAsync(string path, bool useAsync)
    {
        string label = useAsync ? "async" : "sync";
        using var input = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read,
            bufferSize: 4096, options: useAsync ? FileOptions.Asynchronous : FileOptions.None);
        Check(input.Length == 12, "Fixture length mismatch");
        Console.WriteLine($"phase={label} file_length=12 app_buffer=5 filestream_buffer_setting=4096");
        byte[] buffer = new byte[5];
        var collected = new List<byte>(Expected.Length);
        bool eof = false;
        long offset = 0;
        for (int call = 0; call <= Expected.Length; ++call)
        {
            Require(input.Position == offset, "Start position mismatch");
            int actual;
            bool completedAtCheck = true;
            uint checksum = 0;
            if (useAsync)
            {
                ValueTask<int> request = input.ReadAsync(buffer.AsMemory());
                completedAtCheck = request.IsCompleted; // Checked after return, not at its exact instant.
                // Do not inspect/reuse the buffer, query Position, log or throw here.
                checksum = ShortCalculation((uint)offset);
                actual = await request.ConfigureAwait(false); // Consume this ValueTask once.
                Require(checksum == (uint)offset + 2080U, "Short calculation checksum mismatch");
            }
            else
            {
                actual = input.Read(buffer.AsSpan()); // Synchronous baseline on a separate stream.
            }
            // Completion (or an exception from await) precedes buffer/stream disposal.
            Require(actual >= 0 && actual <= buffer.Length && offset + actual <= Expected.Length,
                "Read bounds mismatch");
            Require(input.Position == offset + actual, "End position mismatch");
            string hex = actual == 0 ? "(empty)" : string.Join(" ",
                buffer.AsSpan(0, actual).ToArray().Select(value => value.ToString("X2", CultureInfo.InvariantCulture)));
            string completedText = useAsync ? completedAtCheck.ToString().ToLowerInvariant() : "n/a";
            Console.WriteLine($"{label} offset={offset} requested=5 actual={actual} completed_at_check={completedText} checksum={checksum} hex={hex}");
            if (actual == 0) { eof = true; break; }
            for (int index = 0; index < actual; ++index) collected.Add(buffer[index]);
            offset += actual;
        }
        Check(collected.SequenceEqual(Expected), "Fixture bytes mismatch");
        Check(eof && offset == 12 && input.Length == 12, "EOF/offset/length mismatch");
        return collected.ToArray();
    }

    private static async Task<int> Main()
    {
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            Console.WriteLine(RuntimeInformation.FrameworkDescription);
            using (var fixture = new OwnedFixture())
            {
                CreateFixture(fixture);
                byte[] sync = await ReadAllAsync(fixture.FilePath, useAsync: false);
                byte[] asyncBytes = await ReadAllAsync(fixture.FilePath, useAsync: true);
                Check(sync.SequenceEqual(asyncBytes), "Synchronous/asynchronous result mismatch");
                Console.WriteLine($"sync_bytes={sync.Length} async_bytes={asyncBytes.Length} match=true");
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
