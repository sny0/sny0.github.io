// C++20 — 仮想関数・override・スライシングの観察(docs/05_cpp_language/07)
#include <cstdio>
#include <memory>
#include <vector>

class Enemy {
public:
    virtual ~Enemy() = default;              // 基底経由deleteのための仮想デストラクタ
    virtual void Attack() const { std::printf("Enemy: basic attack\n"); }
    void TakeDamage(int d) { hp_ -= d; }     // 非仮想(全員共通)
    int Hp() const { return hp_; }
protected:
    int hp_ = 100;
};

class Dragon : public Enemy {
public:
    void Attack() const override { std::printf("Dragon: breath!\n"); }   // overrideで検査
};

int main() {
    // 多態はポインタ/参照経由でのみ働く
    std::vector<std::unique_ptr<Enemy>> enemies;
    enemies.push_back(std::make_unique<Enemy>());
    enemies.push_back(std::make_unique<Dragon>());
    for (const auto& e : enemies) e->Attack();   // 実行時の型で分岐

    // スライシング: 値コピーはEnemy部分だけを写す
    std::vector<Enemy> sliced;
    sliced.push_back(Dragon{});
    std::printf("sliced: ");
    sliced[0].Attack();    // "basic attack"(Dragon情報は切り落とされた)
    return 0;
}
