// C++20 — 最小のECS風構造(教育用)(docs/04_game_patterns/component_and_ecs.md)
// データ(Component)とロジック(System)を分離し、連続配列で一括処理する。
#include <cstdio>
#include <vector>

struct Position { float x = 0, y = 0; };           // Componentはただのデータ
struct Velocity { float dx = 0, dy = 0; };
struct Lifetime { float remaining = 0; };

struct World {                                      // 同じindex=同じEntity(単純化)
    std::vector<Position> positions;
    std::vector<Velocity> velocities;
    std::vector<Lifetime> lifetimes;

    void Spawn(Position p, Velocity v, float life) {
        positions.push_back(p);
        velocities.push_back(v);
        lifetimes.push_back({life});
    }
    std::size_t Count() const { return positions.size(); }
};

void MoveSystem(World& w, float dt) {               // Systemはロジックだけ(状態なし)
    for (std::size_t i = 0; i < w.Count(); ++i) {
        w.positions[i].x += w.velocities[i].dx * dt;
        w.positions[i].y += w.velocities[i].dy * dt;
    }
}
void LifetimeSystem(World& w, float dt) {           // swap-and-popで除去(順序は保たれない)
    for (std::size_t i = 0; i < w.Count();) {
        w.lifetimes[i].remaining -= dt;
        if (w.lifetimes[i].remaining <= 0) {
            std::size_t last = w.Count() - 1;
            w.positions[i] = w.positions[last];  w.positions.pop_back();
            w.velocities[i] = w.velocities[last]; w.velocities.pop_back();
            w.lifetimes[i] = w.lifetimes[last];  w.lifetimes.pop_back();
        } else {
            ++i;
        }
    }
}

int main() {
    World w;
    w.Spawn({0, 0}, {1, 0}, 0.25f);
    w.Spawn({5, 5}, {0, 1}, 1.0f);
    w.Spawn({9, 9}, {-1, -1}, 0.15f);

    for (int frame = 0; frame < 3; ++frame) {
        MoveSystem(w, 0.1f);
        LifetimeSystem(w, 0.1f);
        std::printf("frame %d: alive=%u", frame, w.Count());
        for (std::size_t i = 0; i < w.Count(); ++i)
            std::printf("  (%.1f,%.1f)", w.positions[i].x, w.positions[i].y);
        std::printf("\n");
    }
    return 0;
}
