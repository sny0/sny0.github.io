// C++20 — staticの各文脈とinline(docs/05_cpp_language/14)
#include <cstdio>

inline float Clamp01(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }  // ヘッダー相当の定義

class Enemy {
public:
    Enemy() { ++count_; }
    ~Enemy() { --count_; }
    static int AliveCount() { return count_; }     // クラスstatic(C#と同じ概念)
private:
    inline static int count_ = 0;                  // C++17: クラス内で初期化可
};

int NextId() {
    static int id = 0;                             // 関数内static: 呼び出しを跨いで生存
    return ++id;
}

namespace {                                        // 無名namespace(旧: ファイルstatic)
    int fileLocal = 42;
}

int main() {
    { Enemy a, b; std::printf("alive=%d\n", Enemy::AliveCount()); }
    std::printf("alive after scope=%d\n", Enemy::AliveCount());
    std::printf("ids: %d %d %d\n", NextId(), NextId(), NextId());
    std::printf("clamp=%.2f fileLocal=%d\n", Clamp01(1.5f), fileLocal);
    return 0;
}
