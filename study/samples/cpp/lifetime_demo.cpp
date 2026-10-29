// C++20 — 記憶域期間と破棄順の観察(docs/07_memory_and_runtime/01)
#include <cstdio>

struct Tracer {
    explicit Tracer(const char* n) : name(n) { std::printf("+%s\n", n); }
    ~Tracer() { std::printf("-%s\n", name); }
    const char* name;
};

Tracer g_static("global(静的: main前に構築、main後に破棄)");

void Counter() {
    static Tracer local("function-static(初回呼び出しで構築)");
    static int n = 0;
    std::printf("  call #%d\n", ++n);
}

// 危険例(読むだけ): ローカルの参照を返す
// const int& Bad() { int x = 42; return x; }   // xは関数終了で死ぬ → dangling参照

int main() {
    std::printf("main start\n");
    {
        Tracer a("a(自動)");
        Tracer b("b(自動)");
        std::printf("scope end -> 生成の逆順(b, a)で破棄:\n");
    }
    Counter();
    Counter();   // function-staticは再構築されない
    std::printf("main end\n");
    return 0;
}
