#include "shooter_model.hpp"
#include "raylib.h"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>

namespace {

shooter::FrameInput ReadInput() {
    shooter::FrameInput input;
    input.moveX = static_cast<float>((IsKeyDown(KEY_RIGHT) || IsKeyDown(KEY_D)) -
                                    (IsKeyDown(KEY_LEFT) || IsKeyDown(KEY_A)));
    input.moveY = static_cast<float>((IsKeyDown(KEY_DOWN) || IsKeyDown(KEY_S)) -
                                    (IsKeyDown(KEY_UP) || IsKeyDown(KEY_W)));
    input.shoot = IsKeyDown(KEY_SPACE);
    return input;
}

void DrawWorld(const shooter::World& world) {
    ClearBackground(Color{12, 19, 35, 255});
    for (int i = 0; i < 28; ++i)
        DrawPixel((i * 97 + 31) % shooter::kWidth, (i * 137 + 17) % shooter::kHeight,
                  Color{70, 87, 116, 255});

    for (const auto& bullet : world.bullets)
        DrawCircleV({bullet.position.x, bullet.position.y}, shooter::kBulletRadius, YELLOW);
    for (const auto& enemy : world.enemies) {
        DrawCircleV({enemy.position.x, enemy.position.y}, shooter::kEnemyRadius, RED);
        DrawCircleLines(static_cast<int>(enemy.position.x), static_cast<int>(enemy.position.y),
                        shooter::kEnemyRadius, MAROON);
    }
    const auto& p = world.player;
    if (p.invulnerabilityTicks == 0 || (p.invulnerabilityTicks / 4) % 2 == 0) {
        DrawCircleV({p.position.x, p.position.y}, shooter::kPlayerRadius, SKYBLUE);
        DrawTriangle({p.position.x, p.position.y - 20.0f},
                     {p.position.x - 12.0f, p.position.y + 10.0f},
                     {p.position.x + 12.0f, p.position.y + 10.0f}, BLUE);
    }

    DrawText(TextFormat("HP %d", p.hp), 16, 16, 24, GREEN);
    DrawText(TextFormat("SCORE %d", world.score), 420, 16, 24, YELLOW);
    DrawText("ARROWS / WASD: MOVE    SPACE: SHOT    R: RESTART", 16, 692, 16, LIGHTGRAY);
    if (world.gameOver) {
        DrawRectangle(90, 285, 460, 135, Fade(BLACK, 0.85f));
        DrawText("GAME OVER", 190, 305, 36, RAYWHITE);
        DrawText("Press R to restart", 200, 365, 24, LIGHTGRAY);
    }
}

} // namespace

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::strcmp(argv[1], "--smoke") == 0;
    if (smoke) SetConfigFlags(FLAG_WINDOW_HIDDEN);
    InitWindow(shooter::kWidth, shooter::kHeight, "Sny0 - Vertical Shooter (C++17 / raylib 5.5)");
    if (!IsWindowReady()) return 1;
    SetTargetFPS(120); // Rendering rate; the Model below still advances at 60 Hz.

    shooter::World world;
    constexpr double tick = 1.0 / 60.0;
    constexpr int maxTicksPerFrame = 5;
    double accumulator = 0.0;
    bool restartPending = false;
    int renderedFrames = 0;

    while (!WindowShouldClose() && (!smoke || renderedFrames < 5)) {
        auto input = ReadInput();
        restartPending = restartPending || IsKeyPressed(KEY_R);
        accumulator += std::min(static_cast<double>(GetFrameTime()), 0.1);

        int steps = 0;
        while (accumulator >= tick && steps < maxTicksPerFrame) {
            input.restart = restartPending;
            restartPending = false; // Consume the edge once, not once per catch-up tick.
            world.Tick(input);
            accumulator -= tick;
            ++steps;
        }
        if (accumulator >= tick) {
            // Explicit overload policy: discard whole unprocessed ticks, keep
            // only the fractional remainder. Simulation falls behind wall time.
            accumulator = std::fmod(accumulator, tick);
        }

        BeginDrawing();
        DrawWorld(world); // Latest state; no interpolation or extrapolation here.
        EndDrawing();
        ++renderedFrames;
    }
    CloseWindow();
    if (smoke) {
        if (renderedFrames != 5) return 1;
        std::puts("PASS: hidden raylib 5.5 window rendered 5 frames");
    }
    return 0;
}
