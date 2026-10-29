// C++20 — Flyweight(共有データと個体データの分離)(docs/03_design_patterns/flyweight.md)
#include <cstdio>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

struct TreeType {                                  // 共有される不変データ(本来は重いメッシュ等)
    std::string name;
    float baseRadius = 1.0f;
};

struct TreeInstance {                              // 個体: 軽い外因的状態+共有への非所有ポインタ
    float x = 0, y = 0, scale = 1.0f;
    const TreeType* type = nullptr;                // Registryが所有し個体より長生きする前提
};

class TreeTypeRegistry {                           // FlyweightFactory
public:
    const TreeType* GetOrCreate(const std::string& name) {
        auto it = types_.find(name);
        if (it == types_.end())
            it = types_.emplace(name, std::make_unique<TreeType>(TreeType{name, 1.f})).first;
        return it->second.get();
    }
    std::size_t TypeCount() const { return types_.size(); }
private:
    std::unordered_map<std::string, std::unique_ptr<TreeType>> types_;
};

int main() {
    TreeTypeRegistry reg;
    std::vector<TreeInstance> forest;
    for (int i = 0; i < 10000; ++i)
        forest.push_back({i * 1.f, 0.f, 1.f, reg.GetOrCreate(i % 2 ? "oak" : "pine")});

    std::printf("instances=%u types=%u\n", forest.size(), reg.TypeCount());
    std::printf("sizeof(TreeInstance)=%u (共有部分は持たない)\n", sizeof(TreeInstance));
    std::printf("sample: %s at x=%.0f\n", forest[3].type->name.c_str(), forest[3].x);
    return 0;
}
