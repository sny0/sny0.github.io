// C++20 — 未定義動作カタログ(docs/05_cpp_language/18)
// ★これは「読む教材」。コンパイルは通るが、実行しないこと。
//   各例に「検出できる道具」を注記(warning / ASan / UBSan / MSan)。
#include <climits>
#include <cstdio>

int g_sink = 0;   // 「使ったことにする」ための受け皿

void ArrayOutOfBounds() {
    int a[3] = {1, 2, 3};
    // g_sink = a[3];              // UB: 範囲外読み(検出: ASan / 一部はwarning)
    g_sink = a[2];
}

void NullDeref(int* p) {
    // g_sink = *p;                // p==nullptrならUB(検出: UBSan -fsanitize=null / ASan)
    if (p) g_sink = *p;            // 正しい形
}

void SignedOverflow(int x) {
    // int y = x + 1;              // x==INT_MAXならUB(検出: UBSan -fsanitize=signed-integer-overflow)
    long long y = static_cast<long long>(x) + 1;   // 広い型で受ければ定義済み
    g_sink = static_cast<int>(y % 100);
}

void Uninitialized() {
    // int total;                  // 未初期化
    // g_sink = total;             // UB(検出: -Wuninitialized / MSan)
    int total = 0;                 // 常に初期化する習慣
    g_sink = total;
}

void DanglingReturn() {
    // ローカルの参照/ポインタを返すのもUBの入口(検出: -Wreturn-local-addr)
    // static にする・値で返す・呼び出し側所有にする、が対処
}

int main() {
    ArrayOutOfBounds();
    NullDeref(&g_sink);
    SignedOverflow(INT_MAX);
    Uninitialized();
    DanglingReturn();
    std::printf("ub_examples: 安全化済みパスのみ実行 sink=%d\n", g_sink);
    return 0;
}
