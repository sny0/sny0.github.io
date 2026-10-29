// C++20 — ラムダ・キャプチャ・std::function(docs/05_cpp_language/10)
#include <algorithm>
#include <cstdio>
#include <functional>
#include <vector>

struct Enemy { int attack = 0; };

int main() {
    int threshold = 50;
    std::vector<Enemy> enemies{{30}, {70}, {90}};

    // 値キャプチャ: コピーを保持(後でthresholdが変わっても影響なし)
    auto isStrong = [threshold](const Enemy& e) { return e.attack > threshold; };
    auto n = std::count_if(enemies.begin(), enemies.end(), isStrong);
    std::printf("strong=%ld\n", static_cast<long>(n));

    // 危険例(コメントで読むだけ): 参照キャプチャを「後で実行」に使うとdangling
    // std::function<int()> f;
    // { int local = 42; f = [&local]{ return local; }; }  // localは死んだ
    // f();  // 未定義動作

    // std::functionのリスト = 簡易イベント(docs/03_design_patterns/observer)
    std::vector<std::function<void(int)>> onDamaged;
    onDamaged.push_back([](int d) { std::printf("UI: -%d\n", d); });
    onDamaged.push_back([](int d) { std::printf("Sound: hit(%d)\n", d); });
    for (auto& h : onDamaged) h(25);

    // キャプチャなしラムダは関数ポインタに変換可能
    int (*fp)(int, int) = [](int a, int b) { return a + b; };
    std::printf("fp(2,3)=%d\n", fp(2, 3));
    return 0;
}
