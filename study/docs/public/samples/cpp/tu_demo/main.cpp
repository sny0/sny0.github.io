#include "enemy.h"
#include "radar.h"
#include <cstdio>

int main() {
    Enemy slime("Slime");
    Radar radar;
    radar.Report();
    radar.Track(&slime);
    slime.TakeDamage(30);
    radar.Report();
    std::printf("%s\n", Description(slime).c_str());
    return 0;
}
