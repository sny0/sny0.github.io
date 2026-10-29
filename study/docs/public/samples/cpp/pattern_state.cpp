// C++20 — State(プレイヤーの立ち/ジャンプ/しゃがみ)(docs/03_design_patterns/state.md)
#include <cstdio>
#include <memory>

struct Input { bool jump = false, down = false, downReleased = false; };
class Player;

class IPlayerState {
public:
    virtual ~IPlayerState() = default;
    virtual std::unique_ptr<IPlayerState> HandleInput(Player& p, const Input& in) = 0;
    virtual void OnEnter(Player&) {}
    virtual const char* Name() const = 0;
};

class StandingState;
class JumpingState;
class CrouchState;

class Player {
public:
    Player();
    void HandleInput(const Input& in);
    void Land();                                  // 着地イベント(デモ用に外部から)
    const char* StateName() const;
private:
    friend class JumpingState;
    void ChangeState(std::unique_ptr<IPlayerState> next);
    std::unique_ptr<IPlayerState> state_;
};

class StandingState : public IPlayerState {
public:
    const char* Name() const override { return "Standing"; }
    std::unique_ptr<IPlayerState> HandleInput(Player&, const Input& in) override;
};
class JumpingState : public IPlayerState {
public:
    const char* Name() const override { return "Jumping"; }
    void OnEnter(Player&) override { std::printf("  (play jump anim)\n"); }
    std::unique_ptr<IPlayerState> HandleInput(Player&, const Input&) override { return nullptr; }
};
class CrouchState : public IPlayerState {
public:
    const char* Name() const override { return "Crouch"; }
    std::unique_ptr<IPlayerState> HandleInput(Player&, const Input& in) override {
        if (in.downReleased) return std::make_unique<StandingState>();
        return nullptr;                            // しゃがみ中はジャンプ不可(何もしない)
    }
};
std::unique_ptr<IPlayerState> StandingState::HandleInput(Player&, const Input& in) {
    if (in.jump) return std::make_unique<JumpingState>();
    if (in.down) return std::make_unique<CrouchState>();
    return nullptr;
}

Player::Player() : state_(std::make_unique<StandingState>()) {}
void Player::HandleInput(const Input& in) {
    if (auto next = state_->HandleInput(*this, in)) ChangeState(std::move(next));
}
void Player::Land() { ChangeState(std::make_unique<StandingState>()); }
const char* Player::StateName() const { return state_->Name(); }
void Player::ChangeState(std::unique_ptr<IPlayerState> next) {
    state_ = std::move(next);
    state_->OnEnter(*this);
    std::printf("-> %s\n", state_->Name());
}

int main() {
    Player p;
    std::printf("start: %s\n", p.StateName());
    p.HandleInput({.jump = true});                // Standing -> Jumping
    p.HandleInput({.jump = true});                // 空中では無視される(無効な遷移が存在しない)
    p.Land();                                     // -> Standing
    p.HandleInput({.down = true});                // -> Crouch
    p.HandleInput({.jump = true});                // しゃがみ中はジャンプ不可
    p.HandleInput({.downReleased = true});        // -> Standing
    return 0;
}
