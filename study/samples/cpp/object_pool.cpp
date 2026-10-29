// C++20 — Object Pool(フリーリスト方式)(docs/04_game_patterns/object_pool.md)
#include <cstdio>
#include <vector>

struct Bullet {
    float x = 0, y = 0, dx = 0, dy = 0;
    bool alive = false;
};

class BulletPool {
public:
    explicit BulletPool(std::size_t capacity) : bullets_(capacity) {
        free_.reserve(capacity);
        for (std::size_t i = 0; i < capacity; ++i) free_.push_back(capacity - 1 - i);
    }
    Bullet* Acquire(float x, float y, float dx, float dy) {
        if (free_.empty()) return nullptr;          // 満杯ポリシー: 失敗を返す
        Bullet& b = bullets_[free_.back()];
        free_.pop_back();
        b = {x, y, dx, dy, true};                   // ★完全リセット(前回の状態を残さない)
        return &b;
    }
    void Release(Bullet* b) {
        b->alive = false;
        free_.push_back(static_cast<std::size_t>(b - bullets_.data()));
    }
    void UpdateAll(float dt) {                      // 連続メモリの走査(キャッシュに優しい)
        for (auto& b : bullets_)
            if (b.alive) { b.x += b.dx * dt; b.y += b.dy * dt; }
    }
    std::size_t FreeCount() const { return free_.size(); }
private:
    std::vector<Bullet> bullets_;                   // 起動時に一括確保、以後ヒープ操作なし
    std::vector<std::size_t> free_;
};

int main() {
    BulletPool pool(4);
    Bullet* a = pool.Acquire(0, 0, 1, 0);
    Bullet* b = pool.Acquire(0, 0, 0, 1);
    std::printf("acquired 2, free=%u\n", pool.FreeCount());

    pool.UpdateAll(1.0f);
    std::printf("a=(%.0f,%.0f) b=(%.0f,%.0f)\n", a->x, a->y, b->x, b->y);

    pool.Release(a);
    std::printf("released 1, free=%u\n", pool.FreeCount());

    for (int i = 0; i < 4; ++i)                     // 満杯まで取得してみる
        std::printf("acquire -> %s\n", pool.Acquire(0, 0, 0, 0) ? "ok" : "POOL FULL");
    return 0;
}
