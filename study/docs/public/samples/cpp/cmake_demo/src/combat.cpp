#include "game/combat.h"

namespace game {

int CalcDamage(int attack, const Enemy& target) {
    int base = attack * 2 - target.defense;
    return base < 1 ? 1 : base;
}

void ApplyDamage(Enemy& target, int damage) {
    target.hp -= damage;
    if (target.hp < 0) target.hp = 0;
}

}  // namespace game
