#include "enemy.h"
#include <cstdio>
#include <utility>

namespace {                            // 無名namespace: この翻訳単位専用(内部リンケージ)
int ClampDamage(int d) { return d < 0 ? 0 : d; }
}

Enemy::Enemy(std::string name) : name_(std::move(name)) {}

void Enemy::TakeDamage(int amount) {
    hp_ -= ClampDamage(amount);
    std::printf("%s takes %d damage\n", name_.c_str(), amount);
}
