// C++20 — Type Object(種類をデータで表す)(docs/04_game_patterns/type_object_and_sandbox.md)
#include <cstdio>
#include <string>
#include <unordered_map>
#include <vector>

struct EnemyType {                                 // 「種類」はデータ(JSON等からロードできる)
    std::string name;
    int maxHp = 10;
    std::string weakness;
};

class Enemy {                                      // 個体=タイプへの非所有参照+個体状態
public:
    explicit Enemy(const EnemyType& type) : type_(&type), hp_(type.maxHp) {}
    const EnemyType& Type() const { return *type_; }
    int Hp() const { return hp_; }
    void TakeDamage(int d) { hp_ -= d; }
private:
    const EnemyType* type_;                        // テーブルが所有し個体より長生き
    int hp_;
};

int main() {
    // 種類テーブル(データ追加=クラス追加不要)
    std::unordered_map<std::string, EnemyType> table{
        {"slime", {"Slime", 10, "fire"}},
        {"dragon", {"Dragon", 500, "ice"}},
        {"elite_slime", {"Elite Slime", 60, "fire"}},   // データ1行で新種
    };

    std::vector<Enemy> wave;
    wave.emplace_back(table.at("slime"));
    wave.emplace_back(table.at("dragon"));
    wave.emplace_back(table.at("elite_slime"));

    for (auto& e : wave)
        std::printf("%s hp=%d weak=%s\n", e.Type().name.c_str(), e.Hp(),
                    e.Type().weakness.c_str());

    // バランス調整はテーブルの書き換えだけで全個体(以降の生成)に反映される
    return 0;
}
