// C++20 — Bytecode(最小のスタックマシン)(docs/04_game_patterns/type_object_and_sandbox.md)
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <limits>
#include <optional>
#include <vector>

enum class Op : std::uint8_t { PushConst, ReadStat, Add, Mul };

std::optional<std::int32_t> Execute(const std::vector<std::uint8_t>& code,
                                    const std::vector<std::int32_t>& stats) {
    // ジャンプがないので、バイト数の上限で命令数とスタック深さも制限する。
    constexpr std::size_t maxCodeBytes = 256;
    if (code.size() > maxCodeBytes) return std::nullopt;

    std::vector<std::int32_t> stack;
    for (std::size_t pc = 0; pc < code.size();) {
        const auto op = static_cast<Op>(code[pc++]);
        switch (op) {
            case Op::PushConst:
                if (pc == code.size()) return std::nullopt;
                stack.push_back(code[pc++]);
                break;
            case Op::ReadStat: {
                if (pc == code.size()) return std::nullopt;
                const std::size_t index = code[pc++];
                if (index >= stats.size()) return std::nullopt;
                stack.push_back(stats[index]);
                break;
            }
            case Op::Add:
            case Op::Mul: {
                if (stack.size() < 2) return std::nullopt;
                const std::int64_t rhs = stack.back();
                stack.pop_back();
                const std::int64_t lhs = stack.back();
                const std::int64_t value = op == Op::Add ? lhs + rhs : lhs * rhs;
                if (value < std::numeric_limits<std::int32_t>::min() ||
                    value > std::numeric_limits<std::int32_t>::max()) {
                    return std::nullopt;
                }
                stack.back() = static_cast<std::int32_t>(value);
                break;
            }
            default:
                return std::nullopt;
        }
    }
    if (stack.size() != 1) return std::nullopt;
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

    const std::vector<std::int32_t> weakStats{10};
    const std::vector<std::int32_t> strongStats{50};
    const auto weakDamage = Execute(damageFormula, weakStats);
    const auto strongDamage = Execute(damageFormula, strongStats);
    if (!weakDamage || !strongDamage) {
        std::cerr << "invalid formula\n";
        return 1;
    }
    std::cout << "weak: " << *weakDamage << '\n';      // 25
    std::cout << "strong: " << *strongDamage << '\n';  // 105
    std::cout << "formula size=" << damageFormula.size() << " bytes\n";
    return 0;
}
