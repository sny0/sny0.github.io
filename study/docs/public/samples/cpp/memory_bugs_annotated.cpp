// C++20 — メモリバグ図鑑の注釈付き教材(docs/07_memory_and_runtime/03)
// ★読む教材。危険な行はコメントアウトしてある。外して実行しないこと。
//   各バグの「予防(型・規約)」と「検出(ツール)」を対で覚えるのが目的。
#include <cstdio>
#include <memory>
#include <vector>

struct Enemy { int hp = 100; };

void UseAfterFree_Realloc() {
    std::vector<Enemy> v(1);
    Enemy* p = &v[0];
    for (int i = 0; i < 100; ++i) v.push_back({});   // 再確保でpは旧領域を指す
    // p->hp = 0;                    // UAF(予防: index/ハンドル参照。検出: ASan)
    (void)p;
}

void UseAfterFree_OwnerReset() {
    auto e = std::make_unique<Enemy>();
    Enemy* raw = e.get();
    e.reset();                       // 所有者が破棄
    // raw->hp = 0;                  // UAF(予防: 所有権設計+weak/ハンドル。検出: ASan)
    (void)raw;
}

void DoubleFree() {
    // Enemy* p = new Enemy();
    // delete p;
    // delete p;                     // 二重解放(予防: unique_ptr。検出: ASan)
}

void Leak() {
    // new Enemy();                  // ポインタを捨てた=リーク
    auto ok = std::make_unique<Enemy>();   // RAIIなら構造的に起きない
    (void)ok;
}

void BufferOverflow() {
    int table[4] = {};
    // for (int i = 0; i <= 4; ++i) table[i] = 0;   // off-by-one(検出: ASan, /RTC)
    for (int i = 0; i < 4; ++i) table[i] = 0;       // 正しい形
    (void)table;
}

void StackOverflowNote() {
    // float big[2048 * 2048];       // ローカル16MB → スタックオーバーフロー
    static std::vector<float> heap(64);   // 大きい物はヒープ(vector)へ
    (void)heap;
}

int main() {
    UseAfterFree_Realloc();
    UseAfterFree_OwnerReset();
    DoubleFree();
    Leak();
    BufferOverflow();
    StackOverflowNote();
    std::printf("memory_bugs_annotated: 安全化済みパスのみ実行\n");
    return 0;
}
