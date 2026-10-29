// C++20 — 演習: 拾えるものの2実装(enum+switch / インターフェース)(docs/01_design_basics/exercises.md 問7)
#include <cstdio>
#include <memory>
#include <vector>

struct Player { int coins = 0; int hp = 80; bool hasKey = false; };

// ---- (a) enum + switch 版 ----
enum class PickupType { Coin, Potion, Key };
void ApplyPickup(PickupType t, Player& p) {
    switch (t) {
        case PickupType::Coin:   p.coins += 10; break;
        case PickupType::Potion: p.hp += 20; break;
        case PickupType::Key:    p.hasKey = true; break;
    }
}

// ---- (b) インターフェース版 ----
class IPickup {
public:
    virtual ~IPickup() = default;
    virtual void OnPickedUp(Player& p) = 0;
};
class Coin : public IPickup {
public:
    void OnPickedUp(Player& p) override { p.coins += 10; }
};
class Potion : public IPickup {
public:
    void OnPickedUp(Player& p) override { p.hp += 20; }
};
class Key : public IPickup {
public:
    void OnPickedUp(Player& p) override { p.hasKey = true; }
};

int main() {
    Player a;
    ApplyPickup(PickupType::Coin, a);
    ApplyPickup(PickupType::Potion, a);
    ApplyPickup(PickupType::Key, a);
    std::printf("(a) coins=%d hp=%d key=%d\n", a.coins, a.hp, (int)a.hasKey);

    Player b;
    std::vector<std::unique_ptr<IPickup>> field;
    field.push_back(std::make_unique<Coin>());
    field.push_back(std::make_unique<Potion>());
    field.push_back(std::make_unique<Key>());
    for (auto& item : field) item->OnPickedUp(b);
    std::printf("(b) coins=%d hp=%d key=%d\n", b.coins, b.hp, (int)b.hasKey);

    // 演習: 「10秒間速度2倍のブーツ」を両方式に追加してみる。
    // どちらも「拾った瞬間」しか表現できず、継続効果には別の仕組み(効果リスト)が要る
    // ことに気づくのが狙い(docs/11_case_studies/04_status_effects.md 参照)。
    return 0;
}
