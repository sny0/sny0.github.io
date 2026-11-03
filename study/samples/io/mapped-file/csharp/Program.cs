using System;
using System.ComponentModel;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;

internal static class Program
{
    private static int checks;
    private static bool cleanupFailed;
    private static readonly byte[] Expected = { 0x41, 0x42, 0x00, 0x0D, 0x0A, 0xE3, 0x81, 0x82 };

    [StructLayout(LayoutKind.Sequential)]
    private struct SystemInfo
    {
        public ushort ProcessorArchitecture;
        public ushort Reserved;
        public uint PageSize;
        public nint MinimumApplicationAddress;
        public nint MaximumApplicationAddress;
        public nuint ActiveProcessorMask;
        public uint NumberOfProcessors;
        public uint ProcessorType;
        public uint AllocationGranularity;
        public ushort ProcessorLevel;
        public ushort ProcessorRevision;
    }
    [DllImport("kernel32.dll")]
    private static extern void GetSystemInfo(out SystemInfo info);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CreateDirectoryW(string path, nint securityAttributes);

    private static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
    private static void Check(bool condition, string message)
    {
        Require(condition, message);
        ++checks;
    }
    private sealed class OwnedFixture : IDisposable
    {
        private readonly string directory;
        public string FilePath { get; }
        private bool ownsFile;
        private bool disposed;
        public OwnedFixture()
        {
            for (int attempt = 0; attempt < 100; ++attempt)
            {
                string candidate = Path.Combine(Path.GetTempPath(),
                    "mapped-file-observation-" + Guid.NewGuid().ToString("N"));
                string candidateFile = Path.Combine(candidate, "fixture.bin");
                // Directory.CreateDirectory allows an existing directory; use exclusive Win32 creation.
                if (CreateDirectoryW(candidate, 0))
                {
                    directory = candidate;
                    FilePath = candidateFile;
                    return;
                }
                int error = Marshal.GetLastWin32Error();
                if (error != 183) throw new Win32Exception(error, "CreateDirectoryW failed");
            }
            throw new IOException("Could not create an exclusive temporary directory");
        }
        public void MarkFileOwned() => ownsFile = true;
        public void Dispose()
        {
            if (disposed) return;
            disposed = true;
            try
            {
                if (ownsFile) File.Delete(FilePath);
            }
            catch (Exception error)
            {
                cleanupFailed = true;
                Console.Error.WriteLine("CLEANUP FAIL: owned file: " + error.Message);
            }
            try
            {
                Directory.Delete(directory, recursive: false);
            }
            catch (Exception error)
            {
                cleanupFailed = true;
                Console.Error.WriteLine("CLEANUP FAIL: owned empty directory: " + error.Message);
            }
        }
    }
    private static void CreateFixture(OwnedFixture fixture, int granularity)
    {
        using var stream = new FileStream(fixture.FilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        fixture.MarkFileOwned();
        byte[] bytes = new byte[checked(granularity + 32)];
        int target = checked(granularity + 5);
        ReadOnlySpan<byte> header = new byte[] { 0x41, 0x42, 0x00, 0x0D, 0x0A };
        ReadOnlySpan<byte> tail = new byte[] { 0xE3, 0x81, 0x82 };
        header.CopyTo(bytes.AsSpan(target));
        tail.CopyTo(bytes.AsSpan(target + header.Length));
        stream.Write(bytes);
    }
    private static byte[] OrdinaryRead(string path, int granularity)
    {
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        Check(stream.Length == (long)granularity + 32, "Unexpected file length");
        stream.Position = (long)granularity + 5;
        byte[] result = new byte[8];
        int filled = 0;
        while (filled < result.Length)
        {
            int actual = stream.Read(result.AsSpan(filled));
            Require(actual > 0, "Unexpected short file");
            filled += actual;
        }
        Check(result.AsSpan().SequenceEqual(Expected), "Ordinary read differs from known bytes");
        return result;
    }
    private static byte[] MappedRead(string path, int granularity)
    {
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var mapping = MemoryMappedFile.CreateFromFile(stream, mapName: null, capacity: 0,
            MemoryMappedFileAccess.Read, HandleInheritability.None, leaveOpen: true);
        long offset = (long)granularity + 5;
        using var accessor = mapping.CreateViewAccessor(offset, 8, MemoryMappedFileAccess.Read);
        // Position 0 is relative to the requested offset, not a raw native view pointer.
        byte[] result = new byte[8];
        int actual = accessor.ReadArray(0, result, 0, result.Length);
        Check(actual == 8 && accessor.Capacity == 8, "Unexpected accessor count or capacity");
        Check(accessor.PointerOffset == 5, "Unexpected Windows native-view alignment delta");
        Check(result.AsSpan().SequenceEqual(Expected), "Mapped read differs from known bytes");
        Console.WriteLine($"accessor_file_offset={offset} accessor_position=0 capacity={accessor.Capacity} pointer_offset={accessor.PointerOffset}");
        return result; // A copied array escapes; the accessor is disposed first, then mapping and stream.
    }
    private static void Run()
    {
        GetSystemInfo(out SystemInfo info);
        Require(info.AllocationGranularity > 5 && info.AllocationGranularity <= 1024 * 1024,
            "Unsupported allocation granularity for this small fixture");
        Require(info.PageSize > 0, "Invalid page size");
        int granularity = checked((int)info.AllocationGranularity);
        Console.WriteLine($"page_size={info.PageSize} allocation_granularity={granularity}");
        Console.WriteLine($"file_length={(long)granularity + 32} target_file_offset={(long)granularity + 5} requested_bytes=8");
        using var fixture = new OwnedFixture();
        CreateFixture(fixture, granularity);
        byte[] baseline = OrdinaryRead(fixture.FilePath, granularity);
        byte[] mapped = MappedRead(fixture.FilePath, granularity);
        Check(baseline.AsSpan().SequenceEqual(mapped), "Ordinary and mapped bytes differ");
        Console.WriteLine("ordinary= " + BitConverter.ToString(baseline).Replace('-', ' '));
        Console.WriteLine("mapped= " + BitConverter.ToString(mapped).Replace('-', ' '));
        Console.WriteLine("pointer_escaped=false mapped_access_error_observed=false");
    }
    private static int Main()
    {
        if (!OperatingSystem.IsWindows())
        {
            Console.Error.WriteLine("This sample requires Windows.");
            return 2;
        }
        try
        {
            Run();
            if (cleanupFailed) return 1;
            Console.WriteLine($"cleanup=complete checks={checks} PASS");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error);
            return 1;
        }
    }
}
