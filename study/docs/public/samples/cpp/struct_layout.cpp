// C++20 — パディングとメンバ順序によるサイズ変化(docs/05_cpp_language/04, 06_cpp_internals/08)
#include <cstddef>
#include <cstdio>

struct Bad {          // 並びが悪い例
    char a;           // 1
    double d;         // 8(7バイトのパディングの後)
    char b;           // 1(末尾パディング7)
};
struct Good {         // 大きい順
    double d;
    char a;
    char b;
};
struct WithVptr {     // 仮想関数でvptrが足される(docs/06_cpp_internals/06)
    virtual ~WithVptr() = default;
    int x = 0;
};
struct NoVptr { int x = 0; };

int main() {
    std::printf("sizeof(Bad)=%u sizeof(Good)=%u\n", sizeof(Bad), sizeof(Good));
    std::printf("Bad offsets: a=%u d=%u b=%u\n",
                offsetof(Bad, a), offsetof(Bad, d), offsetof(Bad, b));
    std::printf("Good offsets: d=%u a=%u b=%u\n",
                offsetof(Good, d), offsetof(Good, a), offsetof(Good, b));
    std::printf("sizeof(NoVptr)=%u sizeof(WithVptr)=%u (vptr分の差)\n",
                sizeof(NoVptr), sizeof(WithVptr));
    return 0;
}
