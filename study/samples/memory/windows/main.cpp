#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <psapi.h>

#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <exception>
#include <limits>
#include <stdexcept>

namespace {
constexpr SIZE_T sampleBytes = 16u * 1024u * 1024u;

struct Win32Failure {
    const char* operation;
    DWORD error;
};

[[noreturn]] void failApi(const char* operation) {
    const DWORD error = GetLastError();
    throw Win32Failure{operation, error};
}

void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}

class ReservedRegion {
public:
    explicit ReservedRegion(SIZE_T bytes) : bytes_(bytes) {
        base_ = VirtualAlloc(nullptr, bytes_, MEM_RESERVE, PAGE_NOACCESS);
        if (!base_) failApi("VirtualAlloc(MEM_RESERVE)");
    }
    ~ReservedRegion() noexcept {
        if (base_ && !VirtualFree(base_, 0, MEM_RELEASE)) {
            const DWORD error = GetLastError();
            std::fprintf(stderr, "Cleanup VirtualFree failed: GetLastError=%lu\n",
                         static_cast<unsigned long>(error));
        }
    }
    ReservedRegion(const ReservedRegion&) = delete;
    ReservedRegion& operator=(const ReservedRegion&) = delete;

    void* data() const noexcept { return base_; }
    void commit() {
        void* committed = VirtualAlloc(base_, bytes_, MEM_COMMIT, PAGE_READWRITE);
        if (!committed) failApi("VirtualAlloc(MEM_COMMIT)");
        require(committed == base_, "Commit returned an unexpected address");
    }
    void decommit() {
        if (!VirtualFree(base_, bytes_, MEM_DECOMMIT))
            failApi("VirtualFree(MEM_DECOMMIT)");
    }
    void release() {
        if (!VirtualFree(base_, 0, MEM_RELEASE))
            failApi("VirtualFree(MEM_RELEASE)");
        base_ = nullptr;
    }
private:
    void* base_ = nullptr;
    SIZE_T bytes_;
};

PROCESS_MEMORY_COUNTERS_EX processCounters() {
    PROCESS_MEMORY_COUNTERS_EX counters{};
    counters.cb = sizeof(counters);
    if (!GetProcessMemoryInfo(GetCurrentProcess(),
            reinterpret_cast<PROCESS_MEMORY_COUNTERS*>(&counters),
            static_cast<DWORD>(sizeof(counters)))) {
        failApi("GetProcessMemoryInfo");
    }
    return counters;
}

const char* stateName(DWORD state) {
    switch (state) {
    case MEM_RESERVE: return "MEM_RESERVE";
    case MEM_COMMIT: return "MEM_COMMIT";
    case MEM_FREE: return "MEM_FREE";
    default: return "unexpected";
    }
}

struct RangeInfo {
    MEMORY_BASIC_INFORMATION first{};
    SIZE_T queriedRegions = 0;
};

// Query every region covering the whole range; never dereference the address.
RangeInfo inspectRange(std::uintptr_t begin, SIZE_T bytes, DWORD expected) {
    require(bytes <= (std::numeric_limits<std::uintptr_t>::max)() - begin,
            "Address range overflow");
    const std::uintptr_t end = begin + bytes;
    std::uintptr_t cursor = begin;
    RangeInfo result;
    while (cursor < end) {
        MEMORY_BASIC_INFORMATION info{};
        const SIZE_T returned = VirtualQuery(reinterpret_cast<const void*>(cursor),
                                             &info, sizeof(info));
        if (!returned) failApi("VirtualQuery");
        require(returned == sizeof(info), "Incomplete VirtualQuery result");
        const auto regionBegin = reinterpret_cast<std::uintptr_t>(info.BaseAddress);
        require(info.RegionSize <= (std::numeric_limits<std::uintptr_t>::max)() - regionBegin,
                "Queried region overflow");
        const std::uintptr_t regionEnd = regionBegin + info.RegionSize;
        require(regionBegin <= cursor && cursor < regionEnd,
                "VirtualQuery did not cover the queried address");
        require(info.State == expected, "Unexpected page state in sample range");
        if (expected != MEM_FREE) {
            require(reinterpret_cast<std::uintptr_t>(info.AllocationBase) == begin,
                    "Unexpected allocation owner in sample range");
            require(info.Type == MEM_PRIVATE, "Expected private virtual memory");
        }
        if (expected == MEM_COMMIT)
            require(info.Protect == PAGE_READWRITE, "Expected PAGE_READWRITE");
        // Protect is undefined for MEM_RESERVE. For MEM_FREE, AllocationBase,
        // AllocationProtect, Protect and Type are undefined; do not test them.
        if (result.queriedRegions == 0) result.first = info;
        ++result.queriedRegions;
        cursor = (std::min)(regionEnd, end);
    }
    return result;
}

void printCounters(const PROCESS_MEMORY_COUNTERS_EX& now,
                   const PROCESS_MEMORY_COUNTERS_EX& baseline) {
    const auto privateDelta = static_cast<long long>(now.PrivateUsage)
                            - static_cast<long long>(baseline.PrivateUsage);
    const auto workingDelta = static_cast<long long>(now.WorkingSetSize)
                            - static_cast<long long>(baseline.WorkingSetSize);
    std::printf("  PrivateUsage=%llu bytes (baseline delta %+lld)\n",
                static_cast<unsigned long long>(now.PrivateUsage), privateDelta);
    std::printf("  WorkingSetSize=%llu bytes (baseline delta %+lld)\n",
                static_cast<unsigned long long>(now.WorkingSetSize), workingDelta);
}

void observe(const char* stage, std::uintptr_t address, SIZE_T bytes, DWORD expected,
             const PROCESS_MEMORY_COUNTERS_EX& baseline) {
    const RangeInfo range = inspectRange(address, bytes, expected);
    const auto now = processCounters();
    const auto& info = range.first;
    std::printf("\n[%s]\n", stage);
    std::printf("  query_address=%p; first BaseAddress=%p; RegionSize=%llu bytes\n",
                reinterpret_cast<void*>(address), info.BaseAddress,
                static_cast<unsigned long long>(info.RegionSize));
    std::printf("  State=%s; verified_range=%llu bytes; queried_regions=%llu\n",
                stateName(info.State), static_cast<unsigned long long>(bytes),
                static_cast<unsigned long long>(range.queriedRegions));
    if (expected == MEM_FREE) {
        std::printf("  AllocationBase/AllocationProtect/Protect/Type: undefined (MEM_FREE)\n");
    } else {
        std::printf("  AllocationBase=%p; AllocationProtect=0x%08lX; Type=MEM_PRIVATE\n",
                    info.AllocationBase, static_cast<unsigned long>(info.AllocationProtect));
        if (expected == MEM_COMMIT)
            std::printf("  Protect=0x%08lX (PAGE_READWRITE)\n",
                        static_cast<unsigned long>(info.Protect));
        else std::printf("  Protect: undefined (MEM_RESERVE)\n");
    }
    printCounters(now, baseline);
}
} // namespace

int main() {
    try {
        SYSTEM_INFO system{};
        GetSystemInfo(&system);
        require(system.dwPageSize != 0 && system.dwAllocationGranularity != 0,
                "Invalid page size or allocation granularity");
        require(sampleBytes % system.dwPageSize == 0,
                "Sample size must be a multiple of page size");
        std::printf("Windows virtual-memory observation (C++17)\n");
        std::printf("page_size=%lu bytes; allocation_granularity=%lu bytes; range=%llu bytes\n",
                    static_cast<unsigned long>(system.dwPageSize),
                    static_cast<unsigned long>(system.dwAllocationGranularity),
                    static_cast<unsigned long long>(sampleBytes));
        const auto baseline = processCounters();
        std::printf("\n[0 baseline: no sample region]\n");
        printCounters(baseline, baseline);

        ReservedRegion region(sampleBytes);
        const auto address = reinterpret_cast<std::uintptr_t>(region.data());
        observe("1 reserve", address, sampleBytes, MEM_RESERVE, baseline);
        region.commit();
        observe("2 commit, not touched", address, sampleBytes, MEM_COMMIT, baseline);

        // First access is a write to one byte in each committed page.
        // Volatile prevents the compiler from removing these writes.
        auto* touch = static_cast<volatile unsigned char*>(region.data());
        for (SIZE_T offset = 0; offset < sampleBytes; offset += system.dwPageSize)
            touch[offset] = 0xA5;
        observe("3 first write to every page", address, sampleBytes, MEM_COMMIT, baseline);

        region.decommit();
        observe("4 decommit", address, sampleBytes, MEM_RESERVE, baseline);
        region.release();
        // Keep only the numerical address for VirtualQuery, not for data access.
        observe("5 release", address, sampleBytes, MEM_FREE, baseline);
        std::printf("\nPASS: full-range states verified; no process-counter delta was asserted.\n");
        return 0;
    } catch (const Win32Failure& failure) {
        std::fprintf(stderr, "FAIL: %s; GetLastError=%lu\n", failure.operation,
                     static_cast<unsigned long>(failure.error));
    } catch (const std::exception& failure) {
        std::fprintf(stderr, "FAIL: %s\n", failure.what());
    }
    return 1;
}
