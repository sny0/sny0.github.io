// C++20 — Memento(チェックポイントと復元)(docs/03_design_patterns/memento.md)
#include <cstdio>
#include <vector>

class Player {
public:
    class Snapshot {                               // 中身はPlayerだけが知る(不透明)
    private:
        friend class Player;
        int hp = 0;
        float x = 0, y = 0;
        std::vector<int> items;
    };

    Snapshot CreateSnapshot() const {
        Snapshot s;
        s.hp = hp_; s.x = x_; s.y = y_; s.items = items_;   // 深いコピー(vectorは値)
        return s;
    }
    void Restore(const Snapshot& s) { hp_ = s.hp; x_ = s.x; y_ = s.y; items_ = s.items; }

    void TakeDamage(int d) { hp_ -= d; }
    void MoveTo(float x, float y) { x_ = x; y_ = y; }
    void Pickup(int id) { items_.push_back(id); }
    void Print() const {
        std::printf("hp=%d pos=(%.0f,%.0f) items=%u\n", hp_, x_, y_, items_.size());
    }
private:
    int hp_ = 100;
    float x_ = 0, y_ = 0;
    std::vector<int> items_;
};

class CheckpointStore {                            // Caretaker: 中身に触れない
public:
    void Push(Player::Snapshot s) { history_.push_back(std::move(s)); }
    Player::Snapshot PopLast() {
        auto s = std::move(history_.back());
        history_.pop_back();
        return s;
    }
private:
    std::vector<Player::Snapshot> history_;
};

int main() {
    Player p;
    CheckpointStore checkpoints;

    p.MoveTo(10, 5);
    p.Pickup(42);
    checkpoints.Push(p.CreateSnapshot());          // 部屋の入口でセーブ
    std::printf("checkpoint: ");
    p.Print();

    p.TakeDamage(90);                              // ボス戦でボロボロに
    p.MoveTo(99, 99);
    std::printf("after boss: ");
    p.Print();

    p.Restore(checkpoints.PopLast());              // リトライ
    std::printf("restored  : ");
    p.Print();
    return 0;
}
