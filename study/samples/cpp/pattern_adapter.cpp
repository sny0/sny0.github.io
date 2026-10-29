// C++20 — Adapter(docs/03_design_patterns/adapter.md)— SDKはスタブで代用
#include <cstdio>
#include <memory>
#include <string>

// ---- Adaptee: 変更できない外部SDK(スタブ)----
struct FmodEventInstance {
    void setVolume(float v) { std::printf("  [FMOD] setVolume(%.1f)\n", v); }
    void start() { std::printf("  [FMOD] start\n"); }
    void release() { std::printf("  [FMOD] release\n"); }
};
struct FmodSystem {
    FmodEventInstance createEventInstance(const char* path) {
        std::printf("  [FMOD] createEventInstance(%s)\n", path);
        return {};
    }
};

// ---- Target: ゲーム側の語彙 ----
class IAudioPlayer {
public:
    virtual ~IAudioPlayer() = default;
    virtual void PlayOneShot(const std::string& soundId, float volume) = 0;
};

// ---- Adapter: SDKの作法をここに閉じ込める ----
class FmodAudioAdapter : public IAudioPlayer {
public:
    explicit FmodAudioAdapter(FmodSystem& system) : system_(system) {}
    void PlayOneShot(const std::string& soundId, float volume) override {
        auto ev = system_.createEventInstance(("event:/" + soundId).c_str());
        ev.setVolume(volume);
        ev.start();
        ev.release();                              // release必須というSDK作法は1か所だけが知る
    }
private:
    FmodSystem& system_;                           // 参照: SDK本体は起動側が所有
};

int main() {
    FmodSystem fmod;
    std::unique_ptr<IAudioPlayer> audio = std::make_unique<FmodAudioAdapter>(fmod);
    audio->PlayOneShot("explosion", 0.8f);         // ゲームコードはTargetしか知らない
    return 0;
}
