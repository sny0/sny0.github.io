// C++20 — 入力の意図構造体+差し替え可能なソース(docs/04_game_patterns/command_buffer_and_input.md)
#include <cstdio>
#include <memory>
#include <vector>

struct FrameInput {                                // デバイス非依存の「意図」
    float moveX = 0;
    bool jump = false;
};

class IInputSource {
public:
    virtual ~IInputSource() = default;
    virtual FrameInput Poll() = 0;
};

class ScriptedSource : public IInputSource {       // 本物のキーボードの代わりの決め打ち入力
public:                                            // (実ゲームではKeyboardSourceがここに入る)
    explicit ScriptedSource(std::vector<FrameInput> frames) : frames_(std::move(frames)) {}
    FrameInput Poll() override {
        if (cursor_ < frames_.size()) return frames_[cursor_++];
        return {};
    }
private:
    std::vector<FrameInput> frames_;
    std::size_t cursor_ = 0;
};

class ReplaySource : public IInputSource {         // 記録の再生(同じ型で差し替え可能)
public:
    explicit ReplaySource(const std::vector<FrameInput>& rec) : rec_(rec) {}
    FrameInput Poll() override { return cursor_ < rec_.size() ? rec_[cursor_++] : FrameInput{}; }
private:
    const std::vector<FrameInput>& rec_;
    std::size_t cursor_ = 0;
};

struct Player {
    float x = 0;
    int jumps = 0;
    void Update(const FrameInput& in) {            // Playerは意図しか見ない
        x += in.moveX;
        if (in.jump) ++jumps;
    }
};

int main() {
    std::vector<FrameInput> record;
    Player p1;
    ScriptedSource live({{1, false}, {1, true}, {0.5f, false}});
    for (int f = 0; f < 3; ++f) {
        FrameInput in = live.Poll();
        record.push_back(in);                      // 記録=Pollの結果を保存するだけ
        p1.Update(in);
    }
    std::printf("live  : x=%.1f jumps=%d\n", p1.x, p1.jumps);

    Player p2;
    ReplaySource replay(record);                   // 再生=ソース差し替えだけ
    for (int f = 0; f < 3; ++f) p2.Update(replay.Poll());
    std::printf("replay: x=%.1f jumps=%d (一致=決定的)\n", p2.x, p2.jumps);
    return 0;
}
