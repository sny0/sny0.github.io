// C++20 — Chain of Responsibility(ダメージ軽減の段階処理)(docs/03_design_patterns/chain_of_responsibility.md)
#include <algorithm>
#include <cstdio>
#include <memory>

struct DamageContext { int amount = 0; bool finished = false; };

class DamageHandler {
public:
    virtual ~DamageHandler() = default;
    void SetNext(std::unique_ptr<DamageHandler> next) { next_ = std::move(next); }
    void Handle(DamageContext& ctx) {
        Process(ctx);
        if (!ctx.finished && next_) next_->Handle(ctx);
    }
protected:
    virtual void Process(DamageContext& ctx) = 0;
private:
    std::unique_ptr<DamageHandler> next_;
};

class ShieldHandler : public DamageHandler {
protected:
    void Process(DamageContext& ctx) override {
        int absorbed = std::min(ctx.amount, shield_);
        shield_ -= absorbed;
        ctx.amount -= absorbed;
        std::printf("shield absorbs %d (left %d)\n", absorbed, shield_);
        if (ctx.amount <= 0) ctx.finished = true;
    }
private:
    int shield_ = 30;
};
class ArmorHandler : public DamageHandler {
protected:
    void Process(DamageContext& ctx) override {
        ctx.amount = ctx.amount * 70 / 100;
        std::printf("armor reduces to %d\n", ctx.amount);
    }
};
class HpHandler : public DamageHandler {
protected:
    void Process(DamageContext& ctx) override {
        hp_ -= ctx.amount;
        ctx.finished = true;
        std::printf("hp takes %d (hp=%d)\n", ctx.amount, hp_);
    }
private:
    int hp_ = 100;
};

int main() {
    auto chain = std::make_unique<ShieldHandler>();
    auto armor = std::make_unique<ArmorHandler>();
    armor->SetNext(std::make_unique<HpHandler>());
    chain->SetNext(std::move(armor));

    std::printf("-- hit 20(盾で止まる) --\n");
    DamageContext c1{20};
    chain->Handle(c1);
    std::printf("-- hit 50(盾10残→貫通) --\n");
    DamageContext c2{50};
    chain->Handle(c2);
    return 0;
}
