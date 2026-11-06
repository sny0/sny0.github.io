#include <cstdio>

extern "C" int adjust(int score);

int main() {
    const int score = adjust(40);
    std::printf("Score: %d\n", score);
    return score == 42 ? 0 : 1;
}
