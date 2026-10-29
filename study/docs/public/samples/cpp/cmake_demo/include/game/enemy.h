#pragma once
#include <string>

namespace game {
struct Enemy {
    std::string name;
    int hp = 100;
    int defense = 5;
};
}  // namespace game
