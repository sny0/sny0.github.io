// C++20 — Composite(シーングラフ)(docs/03_design_patterns/composite.md)
#include <cstdio>
#include <memory>
#include <vector>

class SceneNode {
public:
    virtual ~SceneNode() = default;
    virtual void Draw(float px, float py, int depth) const = 0;
    float x = 0, y = 0;                            // 親からの相対位置
};

class Sprite : public SceneNode {                  // Leaf
public:
    explicit Sprite(const char* n) : name_(n) {}
    void Draw(float px, float py, int depth) const override {
        std::printf("%*ssprite %s at (%.0f,%.0f)\n", depth * 2, "", name_, px + x, py + y);
    }
private:
    const char* name_;
};

class Group : public SceneNode {                   // Composite
public:
    explicit Group(const char* n) : name_(n) {}
    Group* Add(std::unique_ptr<SceneNode> c) { children_.push_back(std::move(c)); return this; }
    void Draw(float px, float py, int depth) const override {
        std::printf("%*sgroup %s\n", depth * 2, "", name_);
        for (const auto& c : children_) c->Draw(px + x, py + y, depth + 1);   // 再帰
    }
private:
    const char* name_;
    std::vector<std::unique_ptr<SceneNode>> children_;   // 親が子を所有
};

int main() {
    Group root("root");
    auto boss = std::make_unique<Group>("boss");
    boss->x = 100;
    boss->Add(std::make_unique<Sprite>("body"));
    auto arm = std::make_unique<Group>("arm");
    arm->x = 20;
    arm->Add(std::make_unique<Sprite>("claw"));
    boss->Add(std::move(arm));
    root.Add(std::move(boss));
    root.Add(std::make_unique<Sprite>("player"));

    root.Draw(0, 0, 0);          // 個も集まりも同じ1呼び出し
    return 0;
}
