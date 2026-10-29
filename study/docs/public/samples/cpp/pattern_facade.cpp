// C++20 — Facade(サブシステムはスタブ)(docs/03_design_patterns/facade.md)
#include <cstdio>
#include <string>

// ---- 複雑なサブシステム群(スタブ)----
struct SoundBank {
    bool IsLoaded(const std::string& n) const { return n == "bgm_town"; }
    void Load(const std::string& n) { std::printf("  bank: load %s\n", n.c_str()); }
};
struct Channel { int id = 0; };
struct ChannelPool { Channel Acquire() { std::printf("  pool: acquire ch\n"); return {1}; } };
struct Mixer { void RouteToBgm(Channel) { std::printf("  mixer: route to BGM bus\n"); } };
struct Fader {
    void CrossFade(Channel, Channel, float sec) { std::printf("  fader: crossfade %.1fs\n", sec); }
};

// ---- Facade: 正しい手順を1か所に ----
class AudioFacade {
public:
    AudioFacade(SoundBank& b, ChannelPool& p, Mixer& m, Fader& f)
        : bank_(b), pool_(p), mixer_(m), fader_(f) {}
    void PlayBgm(const std::string& name, float fadeSec = 2.0f) {
        std::printf("PlayBgm(%s):\n", name.c_str());
        if (!bank_.IsLoaded(name)) bank_.Load(name);
        Channel ch = pool_.Acquire();
        mixer_.RouteToBgm(ch);
        fader_.CrossFade(current_, ch, fadeSec);
        current_ = ch;                                // 状態管理もFacadeが一元化
    }
private:
    SoundBank& bank_; ChannelPool& pool_; Mixer& mixer_; Fader& fader_;
    Channel current_{};
};

int main() {
    SoundBank b; ChannelPool p; Mixer m; Fader f;
    AudioFacade audio(b, p, m, f);
    audio.PlayBgm("bgm_town");
    audio.PlayBgm("bgm_boss", 0.5f);                  // 利用側は常に1行
    return 0;
}
