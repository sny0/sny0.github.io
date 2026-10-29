// C++20 — Componentパターン(docs/04_game_patterns/component_and_ecs.md)
#include <cstdio>
#include <memory>
#include <vector>

class Entity;

class Component {
public:
    virtual ~Component() = default;
    virtual void Update(Entity& owner, float dt) = 0;
};

class Entity {
public:
    explicit Entity(const char* name) : name_(name) {}
    void Add(std::unique_ptr<Component> c) { components_.push_back(std::move(c)); }
    void Update(float dt) {
        for (auto& c : components_) c->Update(*this, dt);
    }
    float x = 0, y = 0;
    const char* name_;
private:
    std::vector<std::unique_ptr<Component>> components_;
};

class MoveRight : public Component {
public:
    explicit MoveRight(float speed) : speed_(speed) {}
    void Update(Entity& e, float dt) override { e.x += speed_ * dt; }
private:
    float speed_;
};
class Gravity : public Component {
public:
    void Update(Entity& e, float dt) override { e.y -= 9.8f * dt; }
};
class DebugDraw : public Component {
public:
    void Update(Entity& e, float) override { std::printf("%s at (%.2f, %.2f)\n", e.name_, e.x, e.y); }
};

int main() {
    std::vector<std::unique_ptr<Entity>> world;

    auto bird = std::make_unique<Entity>("bird");     // 飛ぶ: 移動+描画(重力なし)
    bird->Add(std::make_unique<MoveRight>(5.f));
    bird->Add(std::make_unique<DebugDraw>());

    auto rock = std::make_unique<Entity>("rock");     // 落ちるだけ: 重力+描画
    rock->Add(std::make_unique<Gravity>());
    rock->Add(std::make_unique<DebugDraw>());

    world.push_back(std::move(bird));
    world.push_back(std::move(rock));

    for (int frame = 0; frame < 3; ++frame) {
        std::printf("-- frame %d --\n", frame);
        for (auto& e : world) e->Update(0.1f);        // 組み合わせは自由(継承ツリー不要)
    }
    return 0;
}
