// C++20 — 一辺16のセルで、距離16未満にある点を検索する。
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <random>
#include <unordered_map>
#include <vector>

struct Point { float x, y; };

class Grid {
public:
    explicit Grid(float cellSize) : cell_(cellSize) {}
    void Insert(int id, const Point& p) { cells_[Key(p)].push_back(id); }
    // この点検索では距離の上限がセルの一辺と同じなので、周囲3×3で足りる。
    std::vector<int> QueryNearby(const Point& p) const {
        std::vector<int> out;
        const int cx = CellOf(p.x), cy = CellOf(p.y);
        for (int dy = -1; dy <= 1; ++dy)
            for (int dx = -1; dx <= 1; ++dx) {
                auto it = cells_.find(Pack(cx + dx, cy + dy));
                if (it != cells_.end())
                    out.insert(out.end(), it->second.begin(), it->second.end());
            }
        return out;
    }
private:
    int CellOf(float position) const {
        return static_cast<int>(std::floor(position / cell_));
    }
    std::uint64_t Key(const Point& p) const {
        return Pack(CellOf(p.x), CellOf(p.y));
    }
    static std::uint64_t Pack(int x, int y) {
        return (std::uint64_t{static_cast<std::uint32_t>(x)} << 32) | static_cast<std::uint32_t>(y);
    }
    float cell_;
    std::unordered_map<std::uint64_t, std::vector<int>> cells_;
};

int main() {
    const int N = 20000;
    std::mt19937 rng(7);
    std::uniform_real_distribution<float> dist(-500.f, 500.f);
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
    std::printf("grid : %d near, %ldus (checked %zu candidates)\n", gridNear,
                static_cast<long>(us(t1, t2)), candidates.size());
    return bruteNear == gridNear ? 0 : 1;
}
