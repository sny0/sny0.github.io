// C++20 — Prototype(docs/03_design_patterns/prototype.md)
#include <cstdio>
#include <memory>
#include <string>
#include <unordered_map>

class Enemy {
public:
    virtual ~Enemy() = default;
    virtual std::unique_ptr<Enemy> Clone() const = 0;
    int hp = 10;
    std::string color = "green";
};
class Goblin : public Enemy {
public:
    std::unique_ptr<Enemy> Clone() const override {
        return std::make_unique<Goblin>(*this);     // コピーコンストラクタで複製
    }
};

class PrototypeRegistry {
public:
    void Register(const std::string& id, std::unique_ptr<Enemy> proto) {
        protos_[id] = std::move(proto);
    }
    std::unique_ptr<Enemy> Spawn(const std::string& id) const { return protos_.at(id)->Clone(); }
private:
    std::unordered_map<std::string, std::unique_ptr<Enemy>> protos_;
};

int main() {
    PrototypeRegistry reg;
    reg.Register("goblin", std::make_unique<Goblin>());

    auto elite = std::make_unique<Goblin>();        // 調整済みの見本を「新しい種類」として登録
    elite->hp = 50;
    elite->color = "red";
    reg.Register("elite_goblin", std::move(elite));

    auto a = reg.Spawn("goblin");
    auto b = reg.Spawn("elite_goblin");
    auto c = reg.Spawn("elite_goblin");
    c->hp = 1;                                       // 複製は独立(bに影響しない)
    std::printf("a: hp=%d %s\n", a->hp, a->color.c_str());
    std::printf("b: hp=%d %s\n", b->hp, b->color.c_str());
    std::printf("c: hp=%d %s\n", c->hp, c->color.c_str());
    return 0;
}
