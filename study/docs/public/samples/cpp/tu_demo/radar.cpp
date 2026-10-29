#include "radar.h"
#include "enemy.h"                    // 実装側ではメンバを呼ぶので完全な定義が必要
#include <cstdio>

void Radar::Track(Enemy* target) { target_ = target; }

void Radar::Report() const {
    if (target_) std::printf("radar: tracking %s\n", Description(*target_).c_str());
    else std::printf("radar: no target\n");
}
