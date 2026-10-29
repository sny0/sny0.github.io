// C++20 — Iterator(begin/endの提供と走査中削除)(docs/03_design_patterns/iterator.md)
#include <algorithm>
#include <cstdio>
#include <vector>

struct Enemy { int id = 0; int hp = 0; };

class EnemyManager {                               // 内部表現を隠しつつ走査だけ公開
public:
    void Add(Enemy e) { enemies_.push_back(e); }
    auto begin() { return enemies_.begin(); }
    auto end() { return enemies_.end(); }
    auto begin() const { return enemies_.begin(); }
    auto end() const { return enemies_.end(); }

    void RemoveDead() {                            // 走査中削除の正しい形(erase-remove)
        enemies_.erase(std::remove_if(enemies_.begin(), enemies_.end(),
                                      [](const Enemy& e) { return e.hp <= 0; }),
                       enemies_.end());
    }
    std::size_t Count() const { return enemies_.size(); }
private:
    std::vector<Enemy> enemies_;
};

int main() {
    EnemyManager mgr;
    mgr.Add({1, 10});
    mgr.Add({2, 0});
    mgr.Add({3, 30});
    mgr.Add({4, 0});

    for (Enemy& e : mgr)                           // begin/endがあるのでrange-forに乗る
        std::printf("enemy %d hp=%d\n", e.id, e.hp);

    mgr.RemoveDead();
    std::printf("after RemoveDead: %u alive\n", mgr.Count());
    for (const Enemy& e : mgr) std::printf("  id=%d\n", e.id);
    return 0;
}
