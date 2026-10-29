// C++20 — 固定タイムステップ+補間のゲームループ(docs/04_game_patterns/game_loop_and_update.md)
// デモ用に「実時間」を擬似的に進める(実ゲームはClock::now()を使う)
#include <algorithm>
#include <cstdio>

int main() {
    constexpr float kFixedDt = 1.0f / 60.0f;
    constexpr int kMaxStepsPerFrame = 5;          // 死のスパイラル防止の上限

    float accumulator = 0.0f;
    float simTime = 0.0f;
    float pos = 0.0f, vel = 60.0f;                // 60単位/秒で移動する物体

    // 擬似フレーム時間列(重いフレームが混ざる想定)
    const float frameTimes[] = {0.016f, 0.016f, 0.100f, 0.016f, 0.033f};

    for (float frameDt : frameTimes) {
        accumulator += frameDt;
        int steps = 0;
        while (accumulator >= kFixedDt && steps < kMaxStepsPerFrame) {
            pos += vel * kFixedDt;                // 更新の時間刻みを1/60秒にそろえる。決定性にはほかの条件も必要
            simTime += kFixedDt;
            accumulator -= kFixedDt;
            ++steps;
        }
        // 消化上限で残ったaccumulatorは捨てず、次のフレームへ持ち越す。
        // 残積算が1ステップ以上なら、描画は外挿せず最新状態を使う方針(alpha=1)。
        // このデモは係数を表示するだけで、状態間の補間描画自体は省略している。
        float alpha = std::min(accumulator / kFixedDt, 1.0f);
        std::printf("frame(dt=%.3f): steps=%d simTime=%.3f pos=%.2f renderAlpha=%.2f\n",
                    frameDt, steps, simTime, pos, alpha);
    }
    return 0;
}
