// C++20 — Bytecode(最小のスタックマシン)(docs/04_game_patterns/type_object_and_sandbox.md)
#include <cstdint>
#include <cstdio>
#include <vector>

enum class Op : std::uint8_t { PushConst, ReadStat, Add, Mul };

int Execute(const std::vector<std::uint8_t>& code, const std::vector<int>& stats) {
    std::vector<int> stack;
    for (std::size_t pc = 0; pc < code.size(); ++pc) {
        switch (static_cast<Op>(code[pc])) {
            case Op::PushConst: stack.push_back(code[++pc]); break;
            case Op::ReadStat:  stack.push_back(stats[code[++pc]]); break;
            case Op::Add: { int b = stack.back(); stack.pop_back(); stack.back() += b; break; }
            case Op::Mul: { int b = stack.back(); stack.pop_back(); stack.back() *= b; break; }
        }
    }
    return stack.back();
}

int main() {
    // 「attack * 2 + 5」をバイト列で表現(データとして保存・配信できる)
    std::vector<std::uint8_t> damageFormula{
        static_cast<std::uint8_t>(Op::ReadStat), 0,     // stats[0] = attack
        static_cast<std::uint8_t>(Op::PushConst), 2,
        static_cast<std::uint8_t>(Op::Mul),
        static_cast<std::uint8_t>(Op::PushConst), 5,
        static_cast<std::uint8_t>(Op::Add),
    };

    std::vector<int> weakStats{10};
    std::vector<int> strongStats{50};
    std::printf("weak : %d\n", Execute(damageFormula, weakStats));    // 25
    std::printf("strong: %d\n", Execute(damageFormula, strongStats)); // 105
    std::printf("formula size=%u bytes(式ツリーよりコンパクト)\n", damageFormula.size());
    return 0;
}
