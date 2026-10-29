// C++20 — vptrによるサイズ変化の観察(docs/06_cpp_internals/06)
#include <cstdio>

struct Plain { int hp = 0; };                      // ただのデータ

struct OneVirtual {                                // 仮想関数1つ → vptrが足される
    virtual ~OneVirtual() = default;
    int hp = 0;
};

struct FiveVirtuals {                              // 仮想関数5つでもvptrは1つ(表は型ごと)
    virtual ~FiveVirtuals() = default;
    virtual void A() {}
    virtual void B() {}
    virtual void C() {}
    virtual void D() {}
    int hp = 0;
};

int main() {
    std::printf("sizeof(Plain)       =%u\n", sizeof(Plain));
    std::printf("sizeof(OneVirtual)  =%u (vptr + int + padding)\n", sizeof(OneVirtual));
    std::printf("sizeof(FiveVirtuals)=%u (仮想関数の数はサイズに影響しない)\n", sizeof(FiveVirtuals));
    return 0;
}
