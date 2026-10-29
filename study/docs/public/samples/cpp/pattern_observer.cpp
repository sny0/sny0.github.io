// C++20 — Observer(std::functionリスト+解除+RAII購読トークン)(docs/03_design_patterns/observer.md)
#include <algorithm>
#include <cstdio>
#include <functional>
#include <utility>
#include <vector>

class PlayerHealth {
public:
    using Listener = std::function<void(int newHp, int damage)>;

    int Subscribe(Listener l) {
        listeners_.emplace_back(nextId_, std::move(l));
        return nextId_++;
    }
    void Unsubscribe(int id) {
        listeners_.erase(std::remove_if(listeners_.begin(), listeners_.end(),
                                        [id](const auto& e) { return e.first == id; }),
                         listeners_.end());
    }
    void TakeDamage(int amount) {
        hp_ -= amount;
        auto copy = listeners_;                 // 通知中の購読/解除に耐えるコピー走査
        for (auto& [id, l] : copy) l(hp_, amount);
    }
private:
    int hp_ = 100;
    int nextId_ = 0;
    std::vector<std::pair<int, Listener>> listeners_;
};

class Subscription {                            // RAII購読トークン(解除忘れを型で防ぐ)
public:
    Subscription(PlayerHealth& h, int id) : h_(&h), id_(id) {}
    ~Subscription() {
        if (h_) { h_->Unsubscribe(id_); std::printf("(auto-unsubscribed #%d)\n", id_); }
    }
    Subscription(const Subscription&) = delete;
    Subscription& operator=(const Subscription&) = delete;
    Subscription(Subscription&& o) noexcept : h_(o.h_), id_(o.id_) { o.h_ = nullptr; }
private:
    PlayerHealth* h_;
    int id_;
};

int main() {
    PlayerHealth health;
    health.Subscribe([](int hp, int d) { std::printf("[UI] hp=%d (-%d)\n", hp, d); });
    {
        Subscription shake(health,
            health.Subscribe([](int, int d) { std::printf("[Shake] power=%d\n", d); }));
        health.TakeDamage(10);          // UIとShakeの両方が反応
    }                                    // shakeのスコープ終了→自動解除
    health.TakeDamage(20);              // UIだけが反応
    return 0;
}
