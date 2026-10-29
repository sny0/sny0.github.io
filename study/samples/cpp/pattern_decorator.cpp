// C++20 — Decorator(入れ子版とリスト版)(docs/03_design_patterns/decorator.md)
#include <cstdio>
#include <functional>
#include <memory>
#include <vector>

// ---- 入れ子版(GoF古典形)----
class IDamageCalculator {
public:
    virtual ~IDamageCalculator() = default;
    virtual int Calc(int baseAttack) const = 0;
};
class BaseDamage : public IDamageCalculator {
public:
    int Calc(int baseAttack) const override { return baseAttack; }
};
class DamageDecorator : public IDamageCalculator {
public:
    explicit DamageDecorator(std::unique_ptr<IDamageCalculator> inner) : inner_(std::move(inner)) {}
protected:
    std::unique_ptr<IDamageCalculator> inner_;
};
class CriticalBoost : public DamageDecorator {
public:
    using DamageDecorator::DamageDecorator;
    int Calc(int a) const override { return static_cast<int>(inner_->Calc(a) * 1.5f); }
};
class FlatBuff : public DamageDecorator {
public:
    FlatBuff(std::unique_ptr<IDamageCalculator> inner, int bonus)
        : DamageDecorator(std::move(inner)), bonus_(bonus) {}
    int Calc(int a) const override { return inner_->Calc(a) + bonus_; }
private:
    int bonus_;
};

// ---- リスト版(ゲームのバフ管理の実用形)----
class DamagePipeline {
public:
    void Add(std::function<int(int)> m) { mods_.push_back(std::move(m)); }
    int Calc(int base) const {
        for (const auto& m : mods_) base = m(base);
        return base;
    }
private:
    std::vector<std::function<int(int)>> mods_;
};

int main() {
    std::unique_ptr<IDamageCalculator> calc = std::make_unique<BaseDamage>();
    calc = std::make_unique<FlatBuff>(std::move(calc), 10);        // まず+10
    calc = std::make_unique<CriticalBoost>(std::move(calc));       // その結果を1.5倍
    std::printf("nested: (100+10)*1.5 = %d\n", calc->Calc(100));

    DamagePipeline pipe;
    pipe.Add([](int d) { return d + 10; });
    pipe.Add([](int d) { return static_cast<int>(d * 1.5f); });
    std::printf("list  : %d\n", pipe.Calc(100));
    return 0;
}
