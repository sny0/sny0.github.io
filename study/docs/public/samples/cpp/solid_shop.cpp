// C++20 — 演習: ショップの2設計(docs/02_solid/exercises.md 問7)
#include <cstdio>
#include <functional>
#include <string>
#include <vector>

// ---- 案2: 要件が未確定なら、この単純さで十分 ----
namespace simple {
struct Item { std::string name; int price = 0; };
struct Player { int gold = 100; std::vector<std::string> items; };

bool TryBuy(Player& p, const Item& item) {
    if (p.gold < item.price) return false;
    p.gold -= item.price;
    p.items.push_back(item.name);
    return true;
}
}  // namespace simple

// ---- 案1: 「通貨追加・割引イベントが確定」なら先に開く価値がある ----
namespace designed {
enum class Currency { Gold, Gem };
struct Item { std::string name; int price = 0; Currency currency = Currency::Gold; };
struct Wallet {
    int balance[2] = {100, 5};                       // 通貨軸はテーブルで表現
    bool TrySpend(Currency c, int amount) {
        int& b = balance[static_cast<int>(c)];
        if (b < amount) return false;
        b -= amount;
        return true;
    }
};
using PriceModifier = std::function<int(int)>;       // 割引はパイプライン(OCP)

class PurchaseService {
public:
    void AddModifier(PriceModifier m) { mods_.push_back(std::move(m)); }
    bool TryBuy(Wallet& w, std::vector<std::string>& inventory, const Item& item) {
        int price = item.price;
        for (auto& m : mods_) price = m(price);
        if (!w.TrySpend(item.currency, price)) return false;
        inventory.push_back(item.name);
        std::printf("bought %s for %d\n", item.name.c_str(), price);
        return true;
    }
private:
    std::vector<PriceModifier> mods_;
};
}  // namespace designed

int main() {
    simple::Player p;
    std::printf("simple: buy sword=%d gold=%d\n",
                (int)simple::TryBuy(p, {"sword", 60}), p.gold);

    designed::Wallet w;
    std::vector<std::string> inv;
    designed::PurchaseService shop;
    shop.AddModifier([](int price) { return price * 80 / 100; });   // 20%オフイベント
    shop.TryBuy(w, inv, {"sword", 60, designed::Currency::Gold});
    shop.TryBuy(w, inv, {"gacha", 3, designed::Currency::Gem});
    std::printf("designed: gold=%d gem=%d items=%u\n",
                w.balance[0], w.balance[1], inv.size());
    return 0;
}
