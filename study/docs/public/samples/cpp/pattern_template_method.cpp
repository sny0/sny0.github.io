// C++20 — Template Method(ゲームモードの骨格)(docs/03_design_patterns/template_method.md)
#include <cstdio>

class GameMode {
public:
    virtual ~GameMode() = default;
    void RunMatch() {                              // 骨格: 非virtual(順序を子に触らせない)
        LoadStage();
        Setup();                                   // 必須フック
        SpawnPlayers();                            // 任意フック
        int guard = 0;
        while (!IsMatchOver() && guard++ < 10) Tick();
        ShowResult();
    }
protected:
    virtual void Setup() = 0;
    virtual void SpawnPlayers() { std::printf("  spawn: standard\n"); }
    virtual bool IsMatchOver() const = 0;
    virtual void Tick() = 0;
private:
    void LoadStage() { std::printf("  load stage(共通)\n"); }
    void ShowResult() { std::printf("  show result(共通)\n"); }
};

class DeathmatchMode : public GameMode {
protected:
    void Setup() override { kills_ = 0; std::printf("  setup: deathmatch\n"); }
    bool IsMatchOver() const override { return kills_ >= 3; }
    void Tick() override { std::printf("  tick: kill! (%d)\n", ++kills_); }
private:
    int kills_ = 0;
};
class RaceMode : public GameMode {
protected:
    void Setup() override { pos_ = 0; std::printf("  setup: race\n"); }
    void SpawnPlayers() override { std::printf("  spawn: on starting grid\n"); }   // 上書き
    bool IsMatchOver() const override { return pos_ >= 5; }
    void Tick() override { pos_ += 2; std::printf("  tick: pos=%d\n", pos_); }
private:
    int pos_ = 0;
};

int main() {
    std::printf("== Deathmatch ==\n");
    DeathmatchMode dm;
    dm.RunMatch();
    std::printf("== Race ==\n");
    RaceMode race;
    race.RunMatch();
    return 0;
}
