// C++20 — アクセスパターンとキャッシュの簡易ベンチ(docs/06_cpp_internals/10)
// 同じ合計計算を「連続アクセス」と「シャッフルされた間接アクセス」で比較する。
#include <algorithm>
#include <chrono>
#include <cstdio>
#include <numeric>
#include <random>
#include <vector>

int main() {
    const std::size_t N = 1u << 22;              // 約400万要素(L3を超えるサイズ)
    std::vector<int> data(N, 1);
    std::vector<std::size_t> index(N);
    std::iota(index.begin(), index.end(), 0u);

    std::mt19937 rng(12345);
    std::vector<std::size_t> shuffled = index;
    std::shuffle(shuffled.begin(), shuffled.end(), rng);

    auto bench = [&](const char* name, const std::vector<std::size_t>& idx) {
        auto t0 = std::chrono::steady_clock::now();
        long long sum = 0;
        for (std::size_t i : idx) sum += data[i];
        auto t1 = std::chrono::steady_clock::now();
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count();
        std::printf("%-12s sum=%ld time=%ldms\n", name, static_cast<long>(sum), static_cast<long>(ms));
    };

    bench("sequential", index);      // 連続: プリフェッチが効く
    bench("shuffled", shuffled);     // ランダム: キャッシュミスの嵐(数倍遅いはず)
    return 0;
}
