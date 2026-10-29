// C++20 — Service Locator(Null Object付き)(docs/04_game_patterns/service_locator_and_di.md)
#include <cstdio>
#include <string>

class IAudio {
public:
    virtual ~IAudio() = default;
    virtual void Play(const std::string& id) = 0;
};

class Locator {
public:
    static void Provide(IAudio* audio) { audio_ = audio ? audio : &null_; }
    static IAudio& Audio() { return *audio_; }
private:
    class NullAudio : public IAudio {              // 未登録でも安全に動く
    public:
        void Play(const std::string&) override {}
    };
    inline static NullAudio null_{};
    inline static IAudio* audio_ = &null_;         // 非所有(提供側が寿命管理)
};

class FmodAudio : public IAudio {
public:
    void Play(const std::string& id) override { std::printf("[FMOD] play %s\n", id.c_str()); }
};
class RecordingFakeAudio : public IAudio {         // テスト用: 要求を記録するだけ
public:
    void Play(const std::string& id) override { std::printf("[Fake] recorded: %s\n", id.c_str()); ++count; }
    int count = 0;
};

void Explosion() { Locator::Audio().Play("boom"); }   // 利用側は抽象だけを知る

int main() {
    Explosion();                                    // 未登録 → NullAudioが黙って処理(落ちない)

    FmodAudio fmod;
    Locator::Provide(&fmod);
    Explosion();                                    // 本物で再生

    RecordingFakeAudio fake;                        // テスト時は差し替え
    Locator::Provide(&fake);
    Explosion();
    std::printf("fake captured %d call(s)\n", fake.count);
    return 0;
}
