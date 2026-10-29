// C++20 — 均等グリッドの空間分割と総当たり比較(docs/04_game_patterns/optimization_patterns.md)
#include <chrono>
#include <cstdio>
#include <random>
#include <unordered_map>
#include <vector>

struct Point { float x, y; };

class Grid {
public:
    explicit Grid(float cellSize) : cell_(cellSize) {}
    void Insert(int id, const Point& p) { cells_[Key(p)].push_back(id); }
    // 近傍3x3セルの候補だけ返す
    std::vector<int> QueryNearby(const Point& p) const {
        std::vector<int> out;
        int cx = static_cast<int>(p.x / cell_), cy = static_cast<int>(p.y / cell_);
        for (int dy = -1; dy <= 1; ++dy)
            for (int dx = -1; dx <= 1; ++dx) {
                auto it = cells_.find(Pack(cx + dx, cy + dy));
                if (it != cells_.end())
                    out.insert(out.end(), it->second.begin(), it->second.end());
            }
        return out;
    }
private:
    long long Key(const Point& p) const {
        return Pack(static_cast<int>(p.x / cell_), static_cast<int>(p.y / cell_));
    }
    static long long Pack(int x, int y) {
        return (static_cast<long long>(x) << 32) ^ static_cast<unsigned>(y);
    }
    float cell_;
    std::unordered_map<long long, std::vector<int>> cells_;
};

int main() {
    const int N = 20000;
    std::mt19937 rng(7);
    std::uniform_real_distribution<float> dist(0.f, 1000.f);
    std::vector<Point> pts;
    for (int i = 0; i < N; ++i) pts.push_back({dist(rng), dist(rng)});

    Grid grid(16.f);
    for (int i = 0; i < N; ++i) grid.Insert(i, pts[i]);

    Point target = pts[123];
    auto t0 = std::chrono::steady_clock::now();
    int bruteNear = 0;
    for (const auto& p : pts) {                    // 総当たり
        float dx = p.x - target.x, dy = p.y - target.y;
        if (dx * dx + dy * dy < 16 * 16) ++bruteNear;
    }
    auto t1 = std::chrono::steady_clock::now();
    auto candidates = grid.QueryNearby(target);    // グリッド: 候補だけ精密判定
    int gridNear = 0;
    for (int id : candidates) {
        float dx = pts[id].x - target.x, dy = pts[id].y - target.y;
        if (dx * dx + dy * dy < 16 * 16) ++gridNear;
    }
    auto t2 = std::chrono::steady_clock::now();

    auto us = [](auto a, auto b) {
        return std::chrono::duration_cast<std::chrono::microseconds>(b - a).count();
    };
    std::printf("brute: %d near, %ldus (checked %d)\n", bruteNear,
                static_cast<long>(us(t0, t1)), N);
    std::printf("grid : %d near, %ldus (checked %u candidates)\n", gridNear,
                static_cast<long>(us(t1, t2)), candidates.size());
    return 0;
}
