// C++20 — constexprによるコンパイル時テーブル生成(docs/05_cpp_language/13)
#include <array>
#include <cstdio>

constexpr int ExpForLevel(int level) {           // コンパイル時にも実行時にも使える
    int exp = 0;
    for (int i = 1; i < level; ++i) exp += i * 100;
    return exp;
}

constexpr auto MakeExpTable() {
    std::array<int, 100> t{};
    for (int i = 0; i < 100; ++i) t[i] = ExpForLevel(i);
    return t;
}

constexpr auto kExpTable = MakeExpTable();       // 実行ファイルに完成品が焼き込まれる

static_assert(kExpTable[0] == 0);
static_assert(kExpTable[2] > kExpTable[1]);      // データの整合性をビルド時に検証

int main() {
    std::printf("exp for lv10=%d lv50=%d lv99=%d\n",
                kExpTable[10], kExpTable[50], kExpTable[99]);
    int runtimeLevel = 7;                        // 実行時の値にも同じ関数が使える
    std::printf("runtime lv%d=%d\n", runtimeLevel, ExpForLevel(runtimeLevel));
    return 0;
}
