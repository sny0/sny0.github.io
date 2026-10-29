// C++20 — キャスト4種と暗黙変換の罠(docs/05_cpp_language/15)
#include <cstdio>

class Enemy {
public:
    virtual ~Enemy() = default;
    virtual const char* Name() const { return "Enemy"; }
};
class Boss : public Enemy {
public:
    const char* Name() const override { return "Boss"; }
    void EnterRage() { std::printf("RAGE!\n"); }
};

int main() {
    // 整数除算の罠
    int a = 7, b = 2;
    float wrong = a / b;                              // 3.0(int除算が先)
    float right = static_cast<float>(a) / b;          // 3.5
    std::printf("wrong=%.1f right=%.1f\n", wrong, right);

    Boss boss;
    Enemy plain;
    Enemy* e1 = &boss;
    Enemy* e2 = &plain;

    // dynamic_cast: 実行時検査つきダウンキャスト(失敗でnullptr)
    if (auto* p = dynamic_cast<Boss*>(e1)) { std::printf("e1 is %s -> ", p->Name()); p->EnterRage(); }
    if (dynamic_cast<Boss*>(e2) == nullptr) std::printf("e2 is not Boss (safely detected)\n");

    // static_castのダウンキャストは無検査(確信がある時だけ)
    Boss* fast = static_cast<Boss*>(e1);              // e1は本当にBossなのでOK
    std::printf("static_cast ok: %s\n", fast->Name());
    // static_cast<Boss*>(e2) は「コンパイルは通るが使えばUB」— 書かないこと

    return 0;
}
