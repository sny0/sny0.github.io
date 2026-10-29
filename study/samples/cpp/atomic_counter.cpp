// C++20 — 非atomic/atomicカウンタの比較(docs/07_memory_and_runtime/04)
// 注意: 非atomic版はデータ競合(UB)のデモ。教材としてのみ実行する。
//       結果が「たまたま」一致する環境もある(UBは検出保証がない、の実例)。
// 検証環境(MinGW.org GCC 9.2)はstd::thread非対応のため、_WIN32ではWin32スレッドで代替。
#include <atomic>
#include <cstdio>

#if defined(_WIN32)
#include <windows.h>
using ThreadFn = DWORD(WINAPI*)(LPVOID);
static void RunTwo(ThreadFn fn, void* arg) {
    HANDLE h1 = CreateThread(nullptr, 0, fn, arg, 0, nullptr);
    HANDLE h2 = CreateThread(nullptr, 0, fn, arg, 0, nullptr);
    WaitForSingleObject(h1, INFINITE);
    WaitForSingleObject(h2, INFINITE);
    CloseHandle(h1);
    CloseHandle(h2);
}
#else
#include <thread>
template <class F>
static void RunTwoStd(F f) {
    std::thread t1(f), t2(f);
    t1.join();
    t2.join();
}
#endif

constexpr int kLoops = 100000;
std::atomic<int> g_safeCount{0};
int g_racyCount = 0;

#if defined(_WIN32)
static DWORD WINAPI SafeWork(LPVOID) {
    for (int i = 0; i < kLoops; ++i) g_safeCount.fetch_add(1, std::memory_order_relaxed);
    return 0;
}
static DWORD WINAPI RacyWork(LPVOID) {
    for (int i = 0; i < kLoops; ++i) ++g_racyCount;   // データ競合(UB)
    return 0;
}
#endif

int main() {
#if defined(_WIN32)
    RunTwo(SafeWork, nullptr);
    RunTwo(RacyWork, nullptr);
#else
    RunTwoStd([] { for (int i = 0; i < kLoops; ++i) g_safeCount.fetch_add(1, std::memory_order_relaxed); });
    RunTwoStd([] { for (int i = 0; i < kLoops; ++i) ++g_racyCount; });
#endif
    std::printf("atomic  : expected=%d actual=%d\n", kLoops * 2, g_safeCount.load());
    std::printf("racy(UB): expected=%d actual=%d %s\n", kLoops * 2, g_racyCount,
                g_racyCount == kLoops * 2 ? "(今回は偶然一致 — 保証はない)" : "(欠損を観察)");
    return 0;
}
