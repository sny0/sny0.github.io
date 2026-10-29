// C++20 — Builder(docs/03_design_patterns/builder.md)
#include <cstdio>
#include <string>
#include <utility>
#include <vector>

struct Character {
    std::string name;
    std::string job;
    int hp = 100;
    std::vector<std::string> skills;
};

class CharacterBuilder {
public:
    CharacterBuilder& Name(std::string v) { c_.name = std::move(v); return *this; }
    CharacterBuilder& Job(std::string v) { c_.job = std::move(v); return *this; }
    CharacterBuilder& Hp(int v) { c_.hp = v; return *this; }
    CharacterBuilder& AddSkill(std::string v) { c_.skills.push_back(std::move(v)); return *this; }
    Character Build() {
        if (c_.job.empty()) c_.job = "Novice";     // 完成時の検証・補完
        return std::move(c_);
    }
private:
    Character c_;
};

// C++20の代替: 集約+指示付き初期化(Builderが不要なケースも多い)
struct CharacterDesc { std::string name; std::string job = "Novice"; int hp = 100; };

int main() {
    Character hero = CharacterBuilder{}
                         .Name("Hero").Job("Warrior").AddSkill("Slash").AddSkill("Guard")
                         .Build();
    std::printf("%s(%s) hp=%d skills=%u\n",
                hero.name.c_str(), hero.job.c_str(), hero.hp, hero.skills.size());

    CharacterDesc d{.name = "Mage", .hp = 60};     // designated initializer
    std::printf("%s(%s) hp=%d\n", d.name.c_str(), d.job.c_str(), d.hp);
    return 0;
}
