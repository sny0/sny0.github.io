// C++20 — 関数テンプレートと非型テンプレート引数(docs/05_cpp_language/09)
// 注: concepts/rangesは検証環境(GCC 9.2)非対応のため未使用(本文参照)
#include <cstdio>

template <typename T>
T Max(T a, T b) { return a < b ? b : a; }     // 使用時に型ごとの実体が生成される

template <typename T>
T Clamp(T v, T lo, T hi) { return v < lo ? lo : (hi < v ? hi : v); }

template <typename T, int N>
class FixedRing {                               // 固定長リングバッファ(ヒープ確保なし)
public:
    void Push(const T& v) {
        data_[head_] = v;
        head_ = (head_ + 1) % N;
        if (count_ < N) ++count_;
    }
    int Count() const { return count_; }
    // 直近i番目(0=最新)
    const T& Recent(int i) const { return data_[((head_ - 1 - i) % N + N) % N]; }
private:
    T data_[N] = {};
    int head_ = 0, count_ = 0;
};

int main() {
    std::printf("Max(3,5)=%d Max(1.5,0.5)=%.1f\n", Max(3, 5), Max(1.5, 0.5));
    std::printf("Clamp(15,0,10)=%d\n", Clamp(15, 0, 10));

    FixedRing<int, 4> inputs;                  // 入力履歴4フレーム分
    for (int f = 1; f <= 6; ++f) inputs.Push(f);
    std::printf("count=%d recent0=%d recent1=%d\n",
                inputs.Count(), inputs.Recent(0), inputs.Recent(1));
    return 0;
}
