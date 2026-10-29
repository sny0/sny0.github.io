#pragma once
#include "game/enemy.h"

namespace game {
int CalcDamage(int attack, const Enemy& target);
void ApplyDamage(Enemy& target, int damage);
}  // namespace game
