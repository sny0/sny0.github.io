// C++20 — Command(Undo付き盤面操作)(docs/03_design_patterns/command.md)
#include <cstdio>
#include <memory>
#include <vector>

struct Board {
    int unitPos[3] = {0, 0, 0};      // ユニットID→位置(単純化)
    void Print() const { std::printf("positions: %d %d %d\n", unitPos[0], unitPos[1], unitPos[2]); }
};

class ICommand {
public:
    virtual ~ICommand() = default;
    virtual void Execute(Board& b) = 0;
    virtual void Undo(Board& b) = 0;
};

class MoveUnit : public ICommand {
public:
    MoveUnit(int id, int to) : id_(id), to_(to) {}
    void Execute(Board& b) override { from_ = b.unitPos[id_]; b.unitPos[id_] = to_; }
    void Undo(Board& b) override { b.unitPos[id_] = from_; }   // 逆操作(文脈は自分で保持)
private:
    int id_, to_, from_ = 0;
};

class History {
public:
    void Do(std::unique_ptr<ICommand> c, Board& b) {
        c->Execute(b);
        done_.push_back(std::move(c));
    }
    void UndoLast(Board& b) {
        if (done_.empty()) return;
        done_.back()->Undo(b);
        done_.pop_back();
    }
private:
    std::vector<std::unique_ptr<ICommand>> done_;
};

int main() {
    Board board;
    History hist;
    hist.Do(std::make_unique<MoveUnit>(0, 5), board);
    hist.Do(std::make_unique<MoveUnit>(1, 3), board);
    hist.Do(std::make_unique<MoveUnit>(0, 7), board);
    board.Print();                    // 7 3 0
    hist.UndoLast(board);
    board.Print();                    // 5 3 0
    hist.UndoLast(board);
    board.Print();                    // 5 0 0
    return 0;
}
