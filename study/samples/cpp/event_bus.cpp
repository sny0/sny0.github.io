// C++20 — 型ベースのイベントバス(Pub/Sub)(docs/04_game_patterns/event_queue_and_pubsub.md)
#include <cstdio>
#include <functional>
#include <string>
#include <typeindex>
#include <unordered_map>
#include <vector>

class EventBus {
public:
    template <class E>
    void Subscribe(std::function<void(const E&)> handler) {
        handlers_[typeid(E)].push_back(
            [h = std::move(handler)](const void* e) { h(*static_cast<const E*>(e)); });
    }
    template <class E>
    void Publish(const E& e) {
        auto it = handlers_.find(typeid(E));
        if (it == handlers_.end()) return;
        for (auto& h : it->second) h(&e);
    }
private:
    std::unordered_map<std::type_index, std::vector<std::function<void(const void*)>>> handlers_;
};

struct EnemyDied { int enemyId; std::string type; };
struct ItemPicked { int itemId; };

int main() {
    EventBus bus;

    // 購読者は発行者を知らない(実績・クエスト・統計が独立に反応)
    bus.Subscribe<EnemyDied>([](const EnemyDied& e) {
        std::printf("[Achievements] kill count++ (%s)\n", e.type.c_str());
    });
    bus.Subscribe<EnemyDied>([](const EnemyDied& e) {
        std::printf("[Quest] check kill objective (id=%d)\n", e.enemyId);
    });
    bus.Subscribe<ItemPicked>([](const ItemPicked& e) {
        std::printf("[Quest] check collect objective (item=%d)\n", e.itemId);
    });

    // 発行者は購読者を知らない
    bus.Publish(EnemyDied{42, "slime"});
    bus.Publish(ItemPicked{7});
    return 0;
}
