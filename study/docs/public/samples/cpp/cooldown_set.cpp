// C++20 — 演習: クールダウン管理(docs/05_cpp_language/exercises 問7)
#include <cstdio>
#include <unordered_map>

enum class SkillId { Fireball, Dash, Ult };

class CooldownSet {
public:
    void Start(SkillId id, float seconds) { remaining_[id] = seconds; }
    void Update(float dt) {
        for (auto& [id, t] : remaining_)
            if (t > 0) t = (t - dt > 0) ? t - dt : 0;
    }
    bool IsReady(SkillId id) const {                       // constメンバ(読み取り契約)
        auto it = remaining_.find(id);
        return it == remaining_.end() || it->second <= 0;  // 未登録=Ready
    }
private:
    std::unordered_map<SkillId, float> remaining_;         // メンバはコンテナのみ=Rule of Zero
};

int main() {
    CooldownSet cd;
    cd.Start(SkillId::Fireball, 1.0f);
    std::printf("t=0.0 fireball ready=%d dash ready=%d\n",
                (int)cd.IsReady(SkillId::Fireball), (int)cd.IsReady(SkillId::Dash));
    cd.Update(0.5f);
    std::printf("t=0.5 fireball ready=%d\n", (int)cd.IsReady(SkillId::Fireball));
    cd.Update(0.6f);
    std::printf("t=1.1 fireball ready=%d\n", (int)cd.IsReady(SkillId::Fireball));
    return 0;
}
