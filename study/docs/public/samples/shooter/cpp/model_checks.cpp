#include "shooter_model.hpp"

#include <cmath>
#include <cstdio>
#include <cstdlib>

namespace {

int checks = 0;

void Check(bool condition, const char* message) {
    ++checks;
    if (!condition) {
        std::fprintf(stderr, "FAILED: %s\n", message);
        std::exit(EXIT_FAILURE);
    }
}

bool Near(float a, float b) { return std::fabs(a - b) < 0.001f; }

void Advance(shooter::World& w, int count, shooter::FrameInput input = {}) {
    for (int i = 0; i < count; ++i) w.Tick(input);
}

// Arrange an overlap after this tick's movement phase.
shooter::Enemy ContactEnemy(const shooter::World& w) {
    return {{w.player.position.x,
             w.player.position.y - shooter::kEnemySpeed * shooter::kTickSeconds}, true};
}

shooter::Bullet BulletAtAfterMove(float x, float y) {
    return {{x, y + shooter::kBulletSpeed * shooter::kTickSeconds}, true};
}

void InitialMovementAndBounds() {
    shooter::World w;
    Check(w.player.hp == 3 && w.score == 0 && !w.gameOver, "initial HP/score/state");
    Check(Near(w.player.position.x, 320) && Near(w.player.position.y, 650), "initial player center");
    Check(w.bullets.empty() && w.enemies.empty(), "initial object lists");
    w.Tick({1, 1, false, false});
    const float dx = w.player.position.x - 320;
    const float dy = w.player.position.y - 650;
    Check(Near(std::sqrt(dx * dx + dy * dy), shooter::kPlayerSpeed * shooter::kTickSeconds),
          "diagonal movement is normalized");
    Advance(w, 300, {1, 1, false, false});
    Check(Near(w.player.position.x, 622) && Near(w.player.position.y, 702), "right/bottom radius bounds");
    w.Reset();
    Advance(w, 300, {-1, -1, false, false});
    Check(Near(w.player.position.x, 18) && Near(w.player.position.y, 18), "left/top radius bounds");
    Check(shooter::CirclesOverlap({0, 0}, 5, {21, 0}, 16), "touching circles count as contact");
    Check(!shooter::CirclesOverlap({0, 0}, 5, {21.1f, 0}, 16), "separated circles do not contact");
}

void ShotAndSpawnTiming() {
    shooter::World w;
    const shooter::FrameInput heldShot{0, 0, true, false};
    w.Tick(heldShot);
    Check(w.bullets.size() == 1, "first held shot is immediate");
    Check(Near(w.bullets[0].position.y, 650 - 24 - 520 * shooter::kTickSeconds),
          "shot starts at playerY-24 and moves in its creation tick");
    Advance(w, 8, heldShot);
    Check(w.bullets.size() == 1, "no second shot before nine elapsed ticks");
    w.Tick(heldShot);
    Check(w.bullets.size() == 2, "second shot at tick 10");
    Advance(w, 9, heldShot);
    Check(w.bullets.size() == 3, "third shot at tick 19");

    w.Reset();
    Advance(w, 38);
    Check(w.enemies.empty(), "no spawn before 0.65 seconds");
    w.Tick({});
    Check(w.enemies.size() == 1 && Near(w.enemies[0].position.x, 64), "first spawn at tick 39");
    Check(Near(w.enemies[0].position.y, -16 + 110 * shooter::kTickSeconds), "spawn moves in creation tick");
    Advance(w, 39 * 5);
    Check(w.enemies.size() == 6, "six scheduled spawns");
    for (std::size_t i = 0; i < shooter::kEnemySpawnX.size(); ++i)
        Check(Near(w.enemies[i].position.x, shooter::kEnemySpawnX[i]), "spawn x sequence");
    Advance(w, 39);
    Check(w.enemies.size() == 7 && Near(w.enemies.back().position.x, 64), "spawn x sequence wraps");
}

void CollisionOrderAndSingleHit() {
    shooter::World w;
    w.bullets.push_back(BulletAtAfterMove(200, 200));
    w.enemies.push_back({{200, 200 - shooter::kEnemySpeed * shooter::kTickSeconds}, true});
    w.enemies.push_back(w.enemies.front());
    w.Tick({});
    Check(w.score == 100 && w.bullets.empty() && w.enemies.size() == 1,
          "one bullet cannot hit two overlapping enemies");

    w.Reset();
    w.bullets.push_back(BulletAtAfterMove(200, 200));
    w.bullets.push_back(w.bullets.front());
    w.enemies.push_back({{200, 200 - shooter::kEnemySpeed * shooter::kTickSeconds}, true});
    w.Tick({});
    Check(w.score == 100 && w.enemies.empty() && w.bullets.size() == 1,
          "two bullets cannot score twice against the same enemy");

    w.Reset();
    w.bullets.push_back(BulletAtAfterMove(320, 650));
    w.enemies.push_back(ContactEnemy(w));
    w.Tick({});
    Check(w.score == 100 && w.player.hp == 3 && w.enemies.empty(),
          "bullet collision is resolved before enemy/player contact");
}

void DamageFreezeAndRestart() {
    shooter::World w;
    w.enemies.push_back(ContactEnemy(w));
    w.enemies.push_back(w.enemies.front());
    w.Tick({});
    Check(w.player.hp == 2 && w.player.invulnerabilityTicks == 48 && w.enemies.empty(),
          "same-tick contacts cause one damage but remove all contacting enemies");
    for (int i = 0; i < 47; ++i) {
        w.enemies.push_back(ContactEnemy(w));
        w.Tick({});
        Check(w.player.hp == 2, "invulnerability prevents repeated damage");
    }
    w.enemies.push_back(ContactEnemy(w));
    w.Tick({});
    Check(w.player.hp == 1 && w.player.invulnerabilityTicks == 48, "damage allowed after 48 elapsed ticks");

    w.player.invulnerabilityTicks = 0; // Valid fixture immediately before lethal contact.
    w.bullets.push_back({{20, 300}, true});
    w.enemies.push_back(ContactEnemy(w));
    w.Tick({});
    Check(w.player.hp == 0 && w.gameOver, "HP zero enters GameOver");
    const float bulletY = w.bullets[0].position.y;
    const auto enemyCount = w.enemies.size();
    const auto bulletCount = w.bullets.size();
    const int spawnCountdown = w.spawnCountdownTicks;
    const int invulnerability = w.player.invulnerabilityTicks;
    const float playerX = w.player.position.x;
    Advance(w, 100, {1, 0, true, false});
    Check(w.bullets.size() == bulletCount && w.enemies.size() == enemyCount &&
          Near(w.bullets[0].position.y, bulletY) && Near(w.player.position.x, playerX) &&
          w.spawnCountdownTicks == spawnCountdown && w.player.invulnerabilityTicks == invulnerability,
          "GameOver freezes positions, spawn, shots and invulnerability");
    w.score = 900;
    w.Tick({1, 1, true, true});
    Check(w.player.hp == 3 && w.score == 0 && !w.gameOver && w.bullets.empty() && w.enemies.empty(),
          "restart resets gameplay state and returns without firing");
    Check(Near(w.player.position.x, 320) && Near(w.player.position.y, 650) &&
          w.shotCooldownTicks == 0 && w.spawnCountdownTicks == 39 && w.nextSpawnIndex == 0,
          "restart resets position and timers");
    w.Tick({0, 0, true, false});
    Check(w.bullets.size() == 1, "immediate first shot after restart");
}

void LimitsAndCleanup() {
    shooter::World w;
    for (std::size_t i = 0; i < shooter::kMaxBullets; ++i)
        w.bullets.push_back({{20, 400}, true});
    for (std::size_t i = 0; i < shooter::kMaxEnemies; ++i)
        w.enemies.push_back({{600, 100}, true});
    w.spawnCountdownTicks = 1;
    w.Tick({0, 0, true, false});
    Check(w.bullets.size() == 64 && w.enemies.size() == 32, "capacity limits skip additions");
    Check(w.shotCooldownTicks == 9 && w.spawnCountdownTicks == 39 && w.nextSpawnIndex == 1,
          "skipped additions still consume timers and spawn cycle");

    w.Reset();
    w.bullets.push_back({{10, -10}, true});
    w.bullets.push_back({{20, 100}, false});
    w.enemies.push_back({{100, 740}, true});
    w.enemies.push_back({{150, 100}, false});
    w.Tick({});
    Check(w.bullets.empty() && w.enemies.empty() && w.player.hp == 3 && w.score == 0,
          "offscreen/dead objects are removed without score or damage");
}

} // namespace

int main() {
    InitialMovementAndBounds();
    ShotAndSpawnTiming();
    CollisionOrderAndSingleHit();
    DamageFreezeAndRestart();
    LimitsAndCleanup();
    std::printf("PASS: %d shooter model checks\n", checks);
    return 0;
}
