// C++20 — enum class と namespace(docs/05_cpp_language/11)
#include <cstdint>
#include <cstdio>

enum class Element : std::uint8_t { Fire, Water, Wind };

const char* Name(Element e) {
    switch (e) {                       // defaultを書かない→列挙子追加時に-Wallが漏れを警告
        case Element::Fire:  return "Fire";
        case Element::Water: return "Water";
        case Element::Wind:  return "Wind";
    }
    return "?";
}

namespace game::combat {
    struct DamageInfo { int amount = 0; };
    int Calc(const DamageInfo& d) { return d.amount * 2; }
}

namespace {                            // 無名namespace: この翻訳単位専用(内部リンケージ)
    int LocalHelper() { return 7; }
}

int main() {
    Element e = Element::Water;
    // int x = e;                      // エラー: 暗黙変換なし(旧enumとの違い)
    int x = static_cast<int>(e);       // 変換は明示
    std::printf("elem=%s as_int=%d sizeof=%u\n", Name(e), x, sizeof(Element));

    namespace gc = game::combat;       // 別名
    std::printf("calc=%d helper=%d\n", gc::Calc({21}), LocalHelper());
    return 0;
}
