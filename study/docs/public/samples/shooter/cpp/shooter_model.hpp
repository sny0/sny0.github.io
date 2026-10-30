#ifndef SNY0_SHOOTER_MODEL_HPP
#define SNY0_SHOOTER_MODEL_HPP

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <vector>

namespace shooter {

inline constexpr int kWidth = 640;
inline constexpr int kHeight = 720;
inline constexpr float kTickSeconds = 1.0f / 60.0f;
inline constexpr float kPlayerRadius = 18.0f;
inline constexpr float kPlayerSpeed = 280.0f;
inline constexpr float kBulletRadius = 5.0f;
inline constexpr float kBulletSpeed = 520.0f;
inline constexpr float kEnemyRadius = 16.0f;
inline constexpr float kEnemySpeed = 110.0f;
inline constexpr int kShotCooldownTicks = 9;     // 0.15 seconds at 60 Hz
inline constexpr int kEnemySpawnTicks = 39;      // 0.65 seconds at 60 Hz
inline constexpr int kInvulnerabilityTicks = 48; // 0.8 seconds at 60 Hz
inline constexpr std::size_t kMaxBullets = 64;
inline constexpr std::size_t kMaxEnemies = 32;
inline constexpr std::array<float, 6> kEnemySpawnX{64, 160, 256, 352, 448, 544};

struct Vec2 {
    float x = 0.0f;
    float y = 0.0f;
};

struct FrameInput {
    float moveX = 0.0f;
    float moveY = 0.0f;
    bool shoot = false;
    bool restart = false;
};

struct Player {
    Vec2 position{320.0f, 650.0f};
    int hp = 3;
    int invulnerabilityTicks = 0;
};

struct Bullet {
    Vec2 position;
    bool alive = true;
};

struct Enemy {
    Vec2 position;
    bool alive = true;
};

inline bool CirclesOverlap(Vec2 a, float radiusA, Vec2 b, float radiusB) {
    const float dx = a.x - b.x;
    const float dy = a.y - b.y;
    const float radii = radiusA + radiusB;
    return dx * dx + dy * dy <= radii * radii;
}

// Value state for this small teaching example. The adapter only mutates it via
// Tick/Reset, and its renderer accepts const World&. Checks arrange valid state
// directly to exercise collisions without waiting for a particular game scene.
struct World {
    Player player;
    std::vector<Bullet> bullets;
    std::vector<Enemy> enemies;
    int score = 0;
    bool gameOver = false;
    int shotCooldownTicks = 0;
    int spawnCountdownTicks = kEnemySpawnTicks;
    std::size_t nextSpawnIndex = 0;

    World() { Reset(); }

    void Reset() {
        player = Player{};
        bullets.clear();
        enemies.clear();
        bullets.reserve(kMaxBullets);
        enemies.reserve(kMaxEnemies);
        score = 0;
        gameOver = false;
        shotCooldownTicks = 0;
        spawnCountdownTicks = kEnemySpawnTicks;
        nextSpawnIndex = 0;
    }

    // No clocks, input devices, graphics, random generator or variable dt here.
    // Every call advances exactly one simulation tick, unless frozen/reset.
    void Tick(FrameInput input) {
        if (input.restart) {
            Reset();
            return;
        }
        if (gameOver) return;

        if (shotCooldownTicks > 0) --shotCooldownTicks;
        if (player.invulnerabilityTicks > 0) --player.invulnerabilityTicks;

        const float lengthSquared = input.moveX * input.moveX + input.moveY * input.moveY;
        if (lengthSquared > 0.0f) {
            const float scale = kPlayerSpeed * kTickSeconds / std::sqrt(lengthSquared);
            player.position.x += input.moveX * scale;
            player.position.y += input.moveY * scale;
        }
        player.position.x = std::clamp(player.position.x, kPlayerRadius, kWidth - kPlayerRadius);
        player.position.y = std::clamp(player.position.y, kPlayerRadius, kHeight - kPlayerRadius);

        if (input.shoot && shotCooldownTicks == 0) {
            if (bullets.size() < kMaxBullets)
                bullets.push_back({{player.position.x, player.position.y - 24.0f}, true});
            // A skipped shot still consumes its scheduled cooldown.
            shotCooldownTicks = kShotCooldownTicks;
        }

        --spawnCountdownTicks;
        if (spawnCountdownTicks == 0) {
            const float x = kEnemySpawnX[nextSpawnIndex];
            nextSpawnIndex = (nextSpawnIndex + 1) % kEnemySpawnX.size();
            if (enemies.size() < kMaxEnemies)
                enemies.push_back({{x, -kEnemyRadius}, true});
            // A skipped spawn still consumes its interval and x-cycle entry.
            spawnCountdownTicks = kEnemySpawnTicks;
        }

        // New objects also move in the tick in which they are created.
        for (auto& bullet : bullets)
            if (bullet.alive) bullet.position.y -= kBulletSpeed * kTickSeconds;
        for (auto& enemy : enemies)
            if (enemy.alive) enemy.position.y += kEnemySpeed * kTickSeconds;

        // Bullet/enemy collisions precede enemy/player contacts.
        for (auto& bullet : bullets) {
            if (!bullet.alive) continue;
            for (auto& enemy : enemies) {
                if (!enemy.alive) continue;
                if (CirclesOverlap(bullet.position, kBulletRadius, enemy.position, kEnemyRadius)) {
                    bullet.alive = false;
                    enemy.alive = false;
                    score += 100;
                    break; // One bullet cannot score against several enemies.
                }
            }
        }
        for (auto& enemy : enemies) {
            if (!enemy.alive) continue;
            if (CirclesOverlap(enemy.position, kEnemyRadius, player.position, kPlayerRadius)) {
                enemy.alive = false; // Contact removes the enemy even while invulnerable.
                if (player.invulnerabilityTicks == 0 && player.hp > 0) {
                    --player.hp;
                    player.invulnerabilityTicks = kInvulnerabilityTicks;
                    if (player.hp == 0) gameOver = true;
                }
            }
        }

        for (auto& bullet : bullets)
            if (bullet.position.y + kBulletRadius < 0.0f) bullet.alive = false;
        for (auto& enemy : enemies)
            if (enemy.position.y - kEnemyRadius > kHeight) enemy.alive = false;

        // Mark first, erase once. References used by the loops above are gone.
        bullets.erase(std::remove_if(bullets.begin(), bullets.end(),
                      [](const Bullet& b) { return !b.alive; }), bullets.end());
        enemies.erase(std::remove_if(enemies.begin(), enemies.end(),
                      [](const Enemy& e) { return !e.alive; }), enemies.end());
    }
};

} // namespace shooter

#endif
