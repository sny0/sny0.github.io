# Read-only mapped-file observation (C# / .NET 10 / Windows)

This console sample compares the same 8 known bytes using ordinary
`FileStream.Read` and a read-only `MemoryMappedViewAccessor`.

## Build and run

Requires Windows and the .NET 10 SDK. No external packages are required.

```powershell
dotnet build -c Release
dotnet run -c Release --no-build
```

The project treats compiler warnings as errors. Other OSes exit with code 2;
the sample deliberately uses Win32 to observe Windows allocation granularity
and exclusively create its temporary directory. Unity is not tested.

## What it does

- Reads page size and allocation granularity `G` using `GetSystemInfo`.
- Exclusively creates its own temporary directory with `CreateDirectoryW`
  and writes only a new fixture with `FileMode.CreateNew`.
- Fully writes `G + 32` bytes. File offset `G + 5` contains the 8 known bytes
  `41 42 00 0D 0A E3 81 82`; other fixture bytes are zero.
- Reads 8 bytes normally, including a progress loop for short reads.
- Creates a read-only mapping from a read-only `FileStream`, then requests
  `CreateViewAccessor(G + 5, 8, MemoryMappedFileAccess.Read)`.
- Copies the requested bytes using `ReadArray<byte>` at accessor position 0.
  It does not add the native-view alignment delta a second time.
- Compares both arrays with independently specified expected bytes.
- Disposes the accessor, mapping and stream in that order. Deletes only its
  owned fixture and empty directory, never recursively.

`leaveOpen: true` keeps the stream under its own `using` owner; it does not
remove the need to dispose that stream. Only copied arrays escape, no raw
mapped pointer. The fixture limits `G` to `(5, 1 MiB]` to keep its size small.

## Verified scope

2026-11-04: Windows x64, .NET SDK 10.0.403, runtime 10.0.14, Release,
TreatWarningsAsErrors, three runs, no warnings/errors, exit 0,
`checks=6 PASS` each time. Observed page size 4096, `G=65536`, file length
65568, target offset 65541, accessor position 0, capacity 8, `PointerOffset=5`.

`PointerOffset=5` describes the observed Windows implementation's alignment
gap, not the absolute file offset and not a required result on all OSes.
The sample uses a fixed, unchanged file. The public Windows .NET v10.0.0
implementation aligns the native view and hides the leading extra bytes:
https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.IO.MemoryMappedFiles/src/System/IO/MemoryMappedFiles/MemoryMappedView.Windows.cs

All owned fixtures were removed. `mapped_access_error_observed=false` means
no mapped-access exception occurred, not that page faults were counted or
absent. The fixture was just written and read normally first; storage I/O,
cache residency and performance were not measured. `ReadArray` copies into
an array, so this is not a zero-copy sample. No writes, COW, truncation, flush,
failure injection, or general recovery from hardware faults is demonstrated.

Article: https://sny0.com/study/practice/io/mapped-file-observation.html
Reference: https://sny0.com/study/os/memory-mapped-files.html
