// C++20 — unique_ptr / shared_ptr / weak_ptr と循環参照(docs/05_cpp_language/16)
#include <cstdio>
#include <memory>
#include <utility>

struct Loud {
    explicit Loud(const char* n) : name(n) { std::printf("+%s\n", n); }
    ~Loud() { std::printf("-%s\n", name); }
    const char* name;
};

struct Node {                                        // 循環参照のデモ用
    explicit Node(const char* n) : tag(n) { std::printf("+Node %s\n", n); }
    ~Node() { std::printf("-Node %s\n", tag); }
    const char* tag;
    std::shared_ptr<Node> strongOther;               // 循環の原因
    std::weak_ptr<Node> weakOther;                   // 循環を切る側
};

int main() {
    std::printf("-- unique_ptr: 所有権の移動 --\n");
    auto u1 = std::make_unique<Loud>("boss");
    auto u2 = std::move(u1);                         // 譲渡(u1は空)
    std::printf("u1=%s u2=%s\n", u1 ? "alive" : "null", u2 ? "alive" : "null");

    std::printf("-- shared_ptr: カウント --\n");
    auto s1 = std::make_shared<Loud>("texture");
    { auto s2 = s1; std::printf("use_count=%ld\n", s1.use_count()); }
    std::printf("use_count=%ld\n", s1.use_count());

    std::printf("-- 循環参照: 解放されない --\n");
    {
        auto a = std::make_shared<Node>("A");
        auto b = std::make_shared<Node>("B");
        a->strongOther = b;
        b->strongOther = a;                          // A⇄B: どちらも-Nodeが出ない(リーク)
    }
    std::printf("(上でA,Bのデストラクタが出ていない=リーク)\n");

    std::printf("-- weak_ptrで循環を切る --\n");
    {
        auto a = std::make_shared<Node>("C");
        auto b = std::make_shared<Node>("D");
        a->strongOther = b;
        b->weakOther = a;                            // 片方をweakに → 正しく解放される
        if (auto locked = b->weakOther.lock())       // 使用時は生存確認
            std::printf("weak lock ok: %s\n", locked->tag);
    }
    return 0;
}
