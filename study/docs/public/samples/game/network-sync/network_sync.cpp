#include <algorithm>
#include <initializer_list>
#include <iostream>
#include <optional>
#include <vector>

struct Input {
    int sequence;
    int movement;
};

struct Snapshot {
    int server_tick;
    int acknowledged_input;
    int position;
};

class PredictedPlayer {
public:
    void predict(Input input) {
        pending_.push_back(input);
        position_ += input.movement;
    }

    bool receive(Snapshot snapshot) {
        if (snapshot.server_tick <= last_server_tick_) {
            return false;
        }

        last_server_tick_ = snapshot.server_tick;
        std::erase_if(pending_, [snapshot](Input input) {
            return input.sequence <= snapshot.acknowledged_input;
        });

        position_ = snapshot.position;
        for (Input input : pending_) {
            position_ += input.movement;
        }
        return true;
    }

    int position() const { return position_; }

private:
    int position_ = 0;
    int last_server_tick_ = 0;
    std::vector<Input> pending_;
};

struct RemoteSample {
    int tick;
    double position;
};

std::optional<double> interpolate(RemoteSample before, RemoteSample after,
                                  double draw_tick) {
    if (before.tick >= after.tick || draw_tick < before.tick || draw_tick > after.tick) {
        return std::nullopt;
    }

    const double fraction = (draw_tick - before.tick) / (after.tick - before.tick);
    return before.position + (after.position - before.position) * fraction;
}

int main() {
    const Input first{1, 2};
    const Input second{2, 2};
    const Input third{3, -1};
    const Input fourth{4, 1};

    PredictedPlayer client;
    for (Input input : {first, second, third, fourth}) {
        client.predict(input);
    }
    const int predicted = client.position();

    // The server knows about a boundary at x = 3. The client has not learned it yet.
    constexpr int server_boundary = 3;
    const Snapshot older{11, first.sequence, std::min(first.movement, server_boundary)};
    const Snapshot newer{12, second.sequence,
                         std::min(older.position + second.movement, server_boundary)};

    // Deliver tick 12 before tick 11, then deliver tick 12 again.
    const bool accepted = client.receive(newer);
    const int reconciled = client.position();
    const bool accepted_stale = client.receive(older);
    const bool accepted_duplicate = client.receive(newer);

    // Tick 103 was lost. The surrounding received samples still cover draw tick 103.
    const RemoteSample before{100, 10.0};
    const RemoteSample after{106, 20.0};
    const auto remote_position = interpolate(before, after, 103.0);

    std::cout << "Local predicted: " << predicted << '\n'
              << "Snapshot: tick=" << newer.server_tick
              << " ack=" << newer.acknowledged_input << " x=" << newer.position << '\n'
              << "Local after replay: " << reconciled << '\n'
              << std::boolalpha << "Accepted stale: " << accepted_stale << '\n'
              << "Accepted duplicate: " << accepted_duplicate << '\n';
    if (remote_position) {
        std::cout << "Remote at draw tick 103: " << *remote_position << '\n';
    }

    const bool passed = predicted == 4 && accepted && reconciled == 3
        && !accepted_stale && !accepted_duplicate && client.position() == reconciled
        && remote_position && *remote_position == 15.0
        && !interpolate(before, after, 107.0);
    return passed ? 0 : 1;
}
