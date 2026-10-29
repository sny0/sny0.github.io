// C++20 — Event Queue(遅延処理と集約)(docs/04_game_patterns/event_queue_and_pubsub.md)
#include <cstdio>
#include <queue>
#include <variant>
#include <vector>

struct EnemyDied { int enemyId; int score; };       // 必要な値を全部積む(処理時に元は無いかも)
struct PlaySeRequest { int seId; };
using Event = std::variant<EnemyDied, PlaySeRequest>;

class EventQueue {
public:
    void Push(Event e) { queue_.push(std::move(e)); }
    template <class Handler>
    void DrainAll(Handler&& handle) {
        while (!queue_.empty()) {
            handle(queue_.front());
            queue_.pop();
        }
    }
private:
    std::queue<Event> queue_;
};

int main() {
    EventQueue q;
    // ゲームロジック中: 積むだけ(処理は起きない)
    q.Push(EnemyDied{1, 100});
    q.Push(PlaySeRequest{7});
    q.Push(PlaySeRequest{7});                       // 同じSEが同フレームに重複
    q.Push(EnemyDied{2, 250});
    q.Push(PlaySeRequest{7});

    // フレーム末尾: まとめて処理(SEは重複除去)
    int totalScore = 0;
    std::vector<int> seToPlay;
    q.DrainAll([&](const Event& e) {
        if (const auto* died = std::get_if<EnemyDied>(&e)) {
            totalScore += died->score;
            std::printf("enemy %d died (+%d)\n", died->enemyId, died->score);
        } else if (const auto* se = std::get_if<PlaySeRequest>(&e)) {
            bool dup = false;
            for (int id : seToPlay) dup = dup || (id == se->seId);
            if (!dup) seToPlay.push_back(se->seId);   // 集約: 遅延配送だからできる
        }
    });
    std::printf("score=%d, SE requests=3 -> played=%u(重複除去)\n", totalScore, seToPlay.size());
    return 0;
}
