// C++20 — Factory Method(docs/03_design_patterns/factory_method.md)
#include <cstdio>
#include <memory>
#include <vector>

class Enemy {
public:
    virtual ~Enemy() = default;
    virtual const char* Name() const = 0;
};
class Goblin : public Enemy { public: const char* Name() const override { return "Goblin"; } };
class FireImp : public Enemy { public: const char* Name() const override { return "FireImp"; } };

class Spawner {
public:
    virtual ~Spawner() = default;
    void SpawnWave(std::vector<std::unique_ptr<Enemy>>& out) {   // 共通の流れ
        for (int i = 0; i < 3; ++i) out.push_back(CreateEnemy()); // 可変点だけ子に委ねる
    }
protected:
    virtual std::unique_ptr<Enemy> CreateEnemy() = 0;             // Factory Method
};
class ForestSpawner : public Spawner {
protected:
    std::unique_ptr<Enemy> CreateEnemy() override { return std::make_unique<Goblin>(); }
};
class VolcanoSpawner : public Spawner {
protected:
    std::unique_ptr<Enemy> CreateEnemy() override { return std::make_unique<FireImp>(); }
};

int main() {
    std::vector<std::unique_ptr<Enemy>> wave;
    ForestSpawner forest;
    VolcanoSpawner volcano;
    forest.SpawnWave(wave);
    volcano.SpawnWave(wave);
    for (const auto& e : wave) std::printf("%s ", e->Name());
    std::printf("\n");
    return 0;
}
