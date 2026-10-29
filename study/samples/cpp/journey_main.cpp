// C++20 — 「main.cppからCPU命令までの旅」の観察素材(docs/06_cpp_internals/01)
// 試すこと:
//   g++ -E  journey_main.cpp | wc -l     … プリプロセス後の行数(includeの展開)
//   g++ -O2 -S journey_main.cpp          … アセンブリ(Damageが定数畳み込みされる様子)
//   g++ -c journey_main.cpp && nm journey_main.o   … シンボル表
#include <cstdio>
#define MAX_HP 100

int Damage(int hp, int amount) { return hp - amount; }

int main() {
    int hp = MAX_HP;
    hp = Damage(hp, 30);
    std::printf("hp=%d\n", hp);   // -O2では70が直接埋め込まれているはず
    return 0;
}
