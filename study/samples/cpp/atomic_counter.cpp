// C++20: two workers increment one atomic counter without a data race.
// Build with a C++20 standard library that provides std::jthread.
// relaxed is enough for this counter; it does not publish unrelated data.
// The parent reads the result only after both workers have been joined.
#include <atomic>
#include <cstdio>
#include <exception>
#include <thread>

int main() {
    try {
        constexpr int loops = 100000;
        constexpr int expected = loops * 2;
        // Declared before the workers so it also survives constructor failure.
        std::atomic<int> count{0};
        const auto increment = [&count]() noexcept {
            for (int i = 0; i < loops; ++i) {
                count.fetch_add(1, std::memory_order_relaxed);
            }
        };
        std::jthread first(increment);
        std::jthread second(increment);
        first.join();
        second.join();
        const int actual = count.load(std::memory_order_relaxed);
        std::printf("atomic RMW: expected=%d actual=%d %s\n",
                    expected, actual, actual == expected ? "PASS" : "FAIL");
        return actual == expected ? 0 : 1;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    }
}
