// C++20 — Meyers' Singleton(docs/03_design_patterns/singleton.md)
// 乱用注意はページ本文を参照。ここでは仕組みの確認のみ。
#include <cstdio>
#include <string>

class AudioManager {
public:
    static AudioManager& Instance() {
        static AudioManager instance;              // 初回呼び出し時に構築(C++11以降スレッドセーフ)
        return instance;
    }
    AudioManager(const AudioManager&) = delete;
    AudioManager& operator=(const AudioManager&) = delete;

    void Play(const std::string& name) { std::printf("play: %s (calls=%d)\n", name.c_str(), ++calls_); }
private:
    AudioManager() { std::printf("AudioManager constructed\n"); }
    int calls_ = 0;
};

int main() {
    std::printf("before first use\n");
    AudioManager::Instance().Play("explosion");    // ここで初めて構築される(遅延初期化)
    AudioManager::Instance().Play("coin");
    auto& a = AudioManager::Instance();
    auto& b = AudioManager::Instance();
    std::printf("same instance: %s\n", (&a == &b) ? "yes" : "no");
    return 0;
}
