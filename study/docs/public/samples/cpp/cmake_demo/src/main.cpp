#include "game/combat.h"
#include "game/enemy.h"
#include <cstdio>

int main() {
    game::Enemy slime{"Slime", 30, 4};
    int dmg = game::CalcDamage(10, slime);
    game::ApplyDamage(slime, dmg);
    std::printf("%s: took %d, hp=%d\n", slime.name.c_str(), dmg, slime.hp);
    return 0;
}
