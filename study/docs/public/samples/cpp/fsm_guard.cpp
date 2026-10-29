// C++20 — enum+switchの有限ステートマシン(docs/04_game_patterns/state_machines.md)
#include <cstdio>

enum class GuardState { Patrol, Chase, Attack };

struct Guard {
    GuardState state = GuardState::Patrol;
    float distToPlayer = 100.f;
    bool canSeePlayer = false;
};

const char* Name(GuardState s) {
    switch (s) {
        case GuardState::Patrol: return "Patrol";
        case GuardState::Chase:  return "Chase";
        case GuardState::Attack: return "Attack";
    }
    return "?";
}

void UpdateGuard(Guard& g) {
    GuardState before = g.state;
    switch (g.state) {
        case GuardState::Patrol:
            if (g.canSeePlayer) g.state = GuardState::Chase;
            break;
        case GuardState::Chase:
            if (g.distToPlayer < 2.f) g.state = GuardState::Attack;
            else if (!g.canSeePlayer) g.state = GuardState::Patrol;
            break;
        case GuardState::Attack:
            if (g.distToPlayer >= 2.f) g.state = GuardState::Chase;
            break;
    }
    if (g.state != before)
        std::printf("  transition: %s -> %s\n", Name(before), Name(g.state));
}

int main() {
    Guard g;
    struct Step { bool see; float dist; };
    const Step scenario[] = {{false, 100}, {true, 50}, {true, 10}, {true, 1.5f},
                             {true, 1.0f}, {true, 5}, {false, 30}};
    for (const auto& s : scenario) {
        g.canSeePlayer = s.see;
        g.distToPlayer = s.dist;
        std::printf("see=%d dist=%.1f state=%s\n", (int)s.see, s.dist, Name(g.state));
        UpdateGuard(g);
    }
    return 0;
}
