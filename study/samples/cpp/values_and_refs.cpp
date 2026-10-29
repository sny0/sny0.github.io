// C++20 — 値・参照・ポインタの基本(docs/05_cpp_language/01)
#include <cstdio>

struct Enemy { int hp = 100; };

void HealByValue(Enemy e)        { e.hp += 10; }   // コピーに作用(呼び出し元は不変)
void HealByRef(Enemy& e)         { e.hp += 10; }   // 本人に作用
int  ReadOnly(const Enemy& e)    { return e.hp; }  // コピーなしで読むだけ

int main() {
    Enemy a{};
    Enemy b = a;          // コピー(C#のclassと違い別実体)
    b.hp = 50;
    std::printf("a.hp=%d b.hp=%d (bの変更はaに影響しない)\n", a.hp, b.hp);

    Enemy& r = a;         // 参照: aの別名
    r.hp = 30;
    std::printf("a.hp=%d (参照経由の変更はaに反映)\n", a.hp);

    Enemy* p = &a;        // ポインタ: アドレスを保持
    p->hp = 10;
    std::printf("a.hp=%d (ポインタ経由)\n", a.hp);

    HealByValue(a);
    std::printf("値渡し後 a.hp=%d (変わらない)\n", a.hp);
    HealByRef(a);
    std::printf("参照渡し後 a.hp=%d (変わる)\n", a.hp);
    std::printf("ReadOnly=%d\n", ReadOnly(a));

    std::printf("sizeof(Enemy)=%u sizeof(Enemy*)=%u\n", sizeof(Enemy), sizeof(Enemy*));
    return 0;
}
