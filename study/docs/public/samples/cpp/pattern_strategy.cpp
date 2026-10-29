// C++20 — Strategy(移動アルゴリズムの差し替え)(docs/03_design_patterns/strategy.md)
#include <cmath>
#include <cstdio>
#include <memory>

struct Vec2 { float x = 0, y = 0; };

class IMoveStrategy {
public:
    virtual ~IMoveStrategy() = default;
    virtual Vec2 NextStep(const Vec2& self, const Vec2& target) = 0;
    virtual const char* Name() const = 0;
};

class DirectChase : public IMoveStrategy {
public:
    Vec2 NextStep(const Vec2& s, const Vec2& t) override {
        float dx = t.x - s.x, dy = t.y - s.y;
        float len = std::sqrt(dx * dx + dy * dy);
        if (len < 0.001f) return s;
        return {s.x + dx / len, s.y + dy / len};
    }
    const char* Name() const override { return "DirectChase"; }
};
class KeepDistance : public IMoveStrategy {
public:
    explicit KeepDistance(float d) : distance_(d) {}
    Vec2 NextStep(const Vec2& s, const Vec2& t) override {
        float dx = t.x - s.x, dy = t.y - s.y;
        float len = std::sqrt(dx * dx + dy * dy);
        float dir = (len > distance_) ? 1.f : -1.f;         // 遠ければ近づき、近ければ離れる
        if (len < 0.001f) return s;
        return {s.x + dir * dx / len, s.y + dir * dy / len};
    }
    const char* Name() const override { return "KeepDistance"; }
private:
    float distance_;
};

class Enemy {
public:
    explicit Enemy(std::unique_ptr<IMoveStrategy> move) : move_(std::move(move)) {}
    void Update(const Vec2& playerPos) {
        pos_ = move_->NextStep(pos_, playerPos);
        std::printf("%s -> (%.1f, %.1f)\n", move_->Name(), pos_.x, pos_.y);
    }
    void SetStrategy(std::unique_ptr<IMoveStrategy> m) { move_ = std::move(m); }  // 実行時差し替え
private:
    Vec2 pos_{};
    std::unique_ptr<IMoveStrategy> move_;
};

int main() {
    Vec2 player{10, 0};
    Enemy melee(std::make_unique<DirectChase>());
    Enemy sniper(std::make_unique<KeepDistance>(8.f));

    for (int i = 0; i < 3; ++i) { melee.Update(player); sniper.Update(player); }

    std::printf("-- HP低下で戦略切替(外部が差し替える=Strategy) --\n");
    melee.SetStrategy(std::make_unique<KeepDistance>(15.f));
    melee.Update(player);
    return 0;
}
