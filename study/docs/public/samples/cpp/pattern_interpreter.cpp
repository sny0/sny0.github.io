// C++20 — Interpreter(ダメージ式の式ツリー)(docs/03_design_patterns/interpreter.md)
#include <cstdio>
#include <memory>
#include <string>
#include <unordered_map>

using Context = std::unordered_map<std::string, int>;

class Expr {
public:
    virtual ~Expr() = default;
    virtual int Evaluate(const Context& ctx) const = 0;
};
class Num : public Expr {
public:
    explicit Num(int v) : v_(v) {}
    int Evaluate(const Context&) const override { return v_; }
private:
    int v_;
};
class Var : public Expr {
public:
    explicit Var(std::string name) : name_(std::move(name)) {}
    int Evaluate(const Context& ctx) const override { return ctx.at(name_); }
private:
    std::string name_;
};
class Add : public Expr {
public:
    Add(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l_(std::move(l)), r_(std::move(r)) {}
    int Evaluate(const Context& c) const override { return l_->Evaluate(c) + r_->Evaluate(c); }
private:
    std::unique_ptr<Expr> l_, r_;
};
class Mul : public Expr {
public:
    Mul(std::unique_ptr<Expr> l, std::unique_ptr<Expr> r) : l_(std::move(l)), r_(std::move(r)) {}
    int Evaluate(const Context& c) const override { return l_->Evaluate(c) * r_->Evaluate(c); }
private:
    std::unique_ptr<Expr> l_, r_;
};

int main() {
    // "attack * 2 + level"(実際はデータファイルからパースして構築する)
    auto damage = std::make_unique<Add>(
        std::make_unique<Mul>(std::make_unique<Var>("attack"), std::make_unique<Num>(2)),
        std::make_unique<Var>("level"));

    Context weak{{"attack", 10}, {"level", 5}};
    Context strong{{"attack", 50}, {"level", 30}};
    std::printf("weak: %d\n", damage->Evaluate(weak));      // 25
    std::printf("strong: %d\n", damage->Evaluate(strong));  // 130
    return 0;
}
