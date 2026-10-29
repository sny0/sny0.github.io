// C++20 — AoS vs SoA の簡易ベンチ(docs/07_memory_and_runtime/05)
// 「移動処理は位置・速度しか使わない」のに、AoSは色などの無駄な同乗者を運ぶ。
#include <chrono>
#include <cstdio>
#include <vector>

struct ParticleAoS {
    float x = 0, y = 0, z = 0;
    float vx = 1, vy = 1, vz = 1;
    float r = 0, g = 0, b = 0, a = 0;   // 移動では使わない16バイト
    float lifetime = 0;
    int textureId = 0;
};

struct ParticlesSoA {
    std::vector<float> x, y, z, vx, vy, vz;
    std::vector<float> r, g, b, a, lifetime;
    std::vector<int> textureId;
    void Resize(std::size_t n) {
        x.assign(n, 0); y.assign(n, 0); z.assign(n, 0);
        vx.assign(n, 1); vy.assign(n, 1); vz.assign(n, 1);
        r.assign(n, 0); g.assign(n, 0); b.assign(n, 0); a.assign(n, 0);
        lifetime.assign(n, 0); textureId.assign(n, 0);
    }
};

int main() {
    const std::size_t N = 2'000'000;
    const int kIters = 20;
    const float dt = 0.016f;

    std::vector<ParticleAoS> aos(N);
    ParticlesSoA soa; soa.Resize(N);

    auto t0 = std::chrono::steady_clock::now();
    for (int it = 0; it < kIters; ++it)
        for (auto& p : aos) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
    auto t1 = std::chrono::steady_clock::now();
    for (int it = 0; it < kIters; ++it)
        for (std::size_t i = 0; i < N; ++i) {
            soa.x[i] += soa.vx[i] * dt; soa.y[i] += soa.vy[i] * dt; soa.z[i] += soa.vz[i] * dt;
        }
    auto t2 = std::chrono::steady_clock::now();

    auto ms = [](auto a, auto b) {
        return std::chrono::duration_cast<std::chrono::milliseconds>(b - a).count();
    };
    std::printf("AoS: %ldms  SoA: %ldms  (check: %.2f / %.2f)\n",
                static_cast<long>(ms(t0, t1)), static_cast<long>(ms(t1, t2)),
                aos[0].x, soa.x[0]);
    return 0;
}
