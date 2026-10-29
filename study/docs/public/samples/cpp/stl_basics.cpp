// C++20 — vector/unordered_map/sort/走査中削除(docs/05_cpp_language/17)
// 注: std::erase_if は GCC 9.2 未対応のため remove_if イディオムを使用
#include <algorithm>
#include <cstdio>
#include <string>
#include <unordered_map>
#include <vector>

struct Enemy { std::string name; int hp = 0; };

int main() {
    std::vector<Enemy> enemies{{"slime", 10}, {"bat", 0}, {"golem", 50}, {"imp", 0}};

    // ソート+ラムダ
    std::sort(enemies.begin(), enemies.end(),
              [](const Enemy& a, const Enemy& b) { return a.hp > b.hp; });
    std::printf("strongest=%s\n", enemies.front().name.c_str());

    // 走査中削除の正しい形(erase-removeイディオム。C++20のstd::erase_if相当)
    enemies.erase(std::remove_if(enemies.begin(), enemies.end(),
                                 [](const Enemy& e) { return e.hp <= 0; }),
                  enemies.end());
    std::printf("alive=%u\n", enemies.size());

    // ID→データ表
    std::unordered_map<int, std::string> itemNames{{1, "potion"}, {2, "sword"}};
    if (auto it = itemNames.find(2); it != itemNames.end())
        std::printf("item2=%s\n", it->second.c_str());

    // find_if
    auto boss = std::find_if(enemies.begin(), enemies.end(),
                             [](const Enemy& e) { return e.hp >= 50; });
    if (boss != enemies.end()) std::printf("boss=%s\n", boss->name.c_str());
    return 0;
}
