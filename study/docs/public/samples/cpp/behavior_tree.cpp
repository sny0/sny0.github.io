// C++20 — 最小のBehavior Tree+Blackboard(docs/04_game_patterns/behavior_tree_and_blackboard.md)
#include <cstdio>
#include <functional>
#include <memory>
#include <vector>

enum class BtStatus { Success, Failure, Running };

struct Blackboard {                                // AIの共有知識
    float selfHp = 100;
    bool canSeePlayer = false;
    float distToPlayer = 100.f;
};

class BtNode {
public:
    virtual ~BtNode() = default;
    virtual BtStatus Tick(Blackboard& bb) = 0;
};

class Selector : public BtNode {                   // 優先度順に試し、成功/Runningで確定
public:
    Selector* Add(std::unique_ptr<BtNode> c) { children_.push_back(std::move(c)); return this; }
    BtStatus Tick(Blackboard& bb) override {
        for (auto& c : children_) {
            BtStatus s = c->Tick(bb);
            if (s != BtStatus::Failure) return s;
        }
        return BtStatus::Failure;
    }
private:
    std::vector<std::unique_ptr<BtNode>> children_;
};
class Sequence : public BtNode {                   // 順に全部。1つ失敗で失敗
public:
    Sequence* Add(std::unique_ptr<BtNode> c) { children_.push_back(std::move(c)); return this; }
    BtStatus Tick(Blackboard& bb) override {
        for (auto& c : children_) {
            BtStatus s = c->Tick(bb);
            if (s != BtStatus::Success) return s;
        }
        return BtStatus::Success;
    }
private:
    std::vector<std::unique_ptr<BtNode>> children_;
};
class Leaf : public BtNode {                       // Condition/Actionを関数で
public:
    explicit Leaf(std::function<BtStatus(Blackboard&)> f) : f_(std::move(f)) {}
    BtStatus Tick(Blackboard& bb) override { return f_(bb); }
private:
    std::function<BtStatus(Blackboard&)> f_;
};
std::unique_ptr<Leaf> Cond(bool (*pred)(const Blackboard&)) {
    return std::make_unique<Leaf>([pred](Blackboard& bb) {
        return pred(bb) ? BtStatus::Success : BtStatus::Failure;
    });
}
std::unique_ptr<Leaf> Act(const char* name) {
    return std::make_unique<Leaf>([name](Blackboard&) {
        std::printf("  action: %s\n", name);
        return BtStatus::Success;
    });
}

int main() {
    // Selector[ Sequence[HP低い? → 逃げる], Sequence[見える? → 近づく → 攻撃], 巡回 ]
    auto root = std::make_unique<Selector>();
    auto flee = std::make_unique<Sequence>();
    flee->Add(Cond([](const Blackboard& b) { return b.selfHp < 30; }))->Add(Act("flee!"));
    auto combat = std::make_unique<Sequence>();
    combat->Add(Cond([](const Blackboard& b) { return b.canSeePlayer; }))
          ->Add(Act("approach"))->Add(Act("attack"));
    root->Add(std::move(flee))->Add(std::move(combat))->Add(Act("patrol"));

    Blackboard bb;
    std::printf("tick1(平常):\n");
    root->Tick(bb);
    bb.canSeePlayer = true;
    std::printf("tick2(発見):\n");
    root->Tick(bb);
    bb.selfHp = 10;                                // 毎フレーム根から評価するので
    std::printf("tick3(瀕死 — 遷移を書いていないのに割り込みが起きる):\n");
    root->Tick(bb);
    return 0;
}
