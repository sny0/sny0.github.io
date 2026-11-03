# Read-only mapped-file observation (C++20 / Windows / MSVC)

This console sample compares the same 8 known bytes using ordinary `ReadFile`
and a read-only mapped view. It is not a performance or physical-I/O benchmark.

## Build and run

Requires Windows, Visual Studio 2022 C++ tools, and CMake 3.20 or later.
MSVC is required because a small mapped-read helper uses Windows SEH.

```powershell
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
.\build\Release\mapped_file_observation.exe
```

Compiler options include C++20, `/W4 /WX /permissive- /EHsc /utf-8`.
No external dependencies, input arguments, network operations, or windows.

## What it does

- Obtains page size and allocation granularity `G` with `GetSystemInfo`.
- Exclusively creates its own temporary directory using `CreateDirectoryW` and
  a new file using `CREATE_NEW`; no existing user file is opened for writing.
- Fully writes `G + 32` bytes. Bytes at file offset `G + 5` are
  `41 42 00 0D 0A E3 81 82`; all other fixture bytes are zero.
- Reads those 8 bytes with ordinary `ReadFile`, including a progress loop.
- Creates `PAGE_READONLY` / `FILE_MAP_READ`, maps from file offset `G` for 13
  requested bytes, and copies `view[5..12]` into an independent array.
- Compares both arrays with the independently specified expected bytes.
- Unmaps the view and closes mapping/file handles using RAII, then deletes
  only its owned file and empty directory (no recursive deletion).

The fixture deliberately limits supported `G` to `(5, 1 MiB]` to keep the file
small. It does not assume `G` is always 65536. Pointer arithmetic is confined
to the requested mapped range. No pointer into the view escapes its owner.

`copyMappedBytes` is a small SEH leaf with no C++ objects needing unwinding.
Its filter handles only `EXCEPTION_IN_PAGE_ERROR` with a fault address in the
source range. It does not catch access violations or arbitrary exceptions.
The failure branch is not exercised by intentional I/O failure injection.

## Verified scope

2026-11-04: Windows x64, MSVC 19.35.32217.1, SDK 10.0.22000.0, x64 Release,
three runs, no compiler warnings, exit 0, `checks=5 PASS` each time. Observed
page size 4096, `G=65536`, file length 65568, target offset 65541, map offset
65536, delta 5, requested map length 13. All owned fixtures were removed.

`mapped_access_error_observed=false` means no mapped-access exception was
observed, not that there were zero page faults. The file was just created and
read normally first; cache residency, page-fault counts and storage activity
were not traced. No speedup, zero-copy, or all-resident claim is made.
No COW, shared writes, truncation, flush, failure injection, or Unity testing.

Article: https://sny0.com/study/practice/io/mapped-file-observation.html
Reference: https://sny0.com/study/os/memory-mapped-files.html
