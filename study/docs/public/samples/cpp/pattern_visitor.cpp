// C++20 — Visitor(シーンノードへの操作追加)(docs/03_design_patterns/visitor.md)
#include <cstdio>
#include <memory>
#include <vector>

class SpriteNode;
class MeshNode;

class IVisitor {
public:
    virtual ~IVisitor() = default;
    virtual void Visit(SpriteNode& n) = 0;
    virtual void Visit(MeshNode& n) = 0;
};

class SceneNode {
public:
    virtual ~SceneNode() = default;
    virtual void Accept(IVisitor& v) = 0;
};
class SpriteNode : public SceneNode {
public:
    void Accept(IVisitor& v) override { v.Visit(*this); }   // 自分の型でVisitを呼び返す
    int layer = 0;
};
class MeshNode : public SceneNode {
public:
    void Accept(IVisitor& v) override { v.Visit(*this); }
    int polyCount = 1000;
};

// 操作の追加 = Visitorを1つ書くだけ(階層は無変更)
class PolygonCounter : public IVisitor {
public:
    void Visit(SpriteNode&) override { total_ += 2; }
    void Visit(MeshNode& m) override { total_ += m.polyCount; }
    int Total() const { return total_; }
private:
    int total_ = 0;
};
class NamePrinter : public IVisitor {
public:
    void Visit(SpriteNode& s) override { std::printf("sprite(layer=%d)\n", s.layer); }
    void Visit(MeshNode& m) override { std::printf("mesh(%d polys)\n", m.polyCount); }
};

int main() {
    std::vector<std::unique_ptr<SceneNode>> scene;
    scene.push_back(std::make_unique<SpriteNode>());
    scene.push_back(std::make_unique<MeshNode>());
    scene.push_back(std::make_unique<SpriteNode>());

    NamePrinter printer;
    PolygonCounter counter;
    for (auto& n : scene) { n->Accept(printer); n->Accept(counter); }
    std::printf("total polys=%d\n", counter.Total());
    return 0;
}
