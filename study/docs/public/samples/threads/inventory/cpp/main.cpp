#include <array>
#include <cstdio>
#include <exception>
#include <mutex>
#include <stdexcept>
#include <thread>
#include <vector>

namespace {
constexpr int initialStock = 17;
constexpr int workerCount = 4;
constexpr int attemptsPerWorker = 10;
unsigned int checks = 0;

struct InventorySnapshot {
    int remaining;
    int consumed;
};

class Inventory {
public:
    explicit Inventory(int initial) : remaining_(initial) {
        if (initial < 0) throw std::invalid_argument("Negative initial stock");
    }

    bool tryConsume() {
        const std::lock_guard lock(mutex_);
        // Check and both updates form one critical section.
        if (remaining_ == 0) return false;
        --remaining_;
        ++consumed_;
        return true;
    }

    InventorySnapshot snapshot() const {
        const std::lock_guard lock(mutex_);
        return {remaining_, consumed_}; // Copy while holding the same mutex.
    }

private:
    mutable std::mutex mutex_;
    int remaining_;
    int consumed_ = 0;
};

struct WorkerResult {
    int successes = 0;
    int failures = 0;
    int snapshotChecks = 0;
    std::exception_ptr error;
};

void check(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
    ++checks; // Only the parent thread calls this function.
}

void runWorker(Inventory& inventory, WorkerResult& result) noexcept {
    try {
        for (int attempt = 0; attempt < attemptsPerWorker; ++attempt) {
            if (inventory.tryConsume()) ++result.successes;
            else ++result.failures;

            const InventorySnapshot state = inventory.snapshot();
            if (state.remaining < 0 || state.remaining + state.consumed != initialStock) {
                throw std::runtime_error("Worker snapshot invariant failed");
            }
            ++result.snapshotChecks;
        }
    } catch (...) {
        result.error = std::current_exception();
    }
}

void checkSingleThreadCases() {
    Inventory empty(0);
    check(!empty.tryConsume(), "Empty inventory must reject consumption");
    const InventorySnapshot emptyState = empty.snapshot();
    check(emptyState.remaining == 0 && emptyState.consumed == 0, "Empty snapshot");

    Inventory one(1);
    check(one.tryConsume(), "First consumption must succeed");
    check(!one.tryConsume(), "Second consumption must fail");
    const InventorySnapshot oneState = one.snapshot();
    check(oneState.remaining == 0 && oneState.consumed == 1, "One-item snapshot");

    bool rejected = false;
    try {
        Inventory invalid(-1);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, "Negative initial stock must throw");
    std::puts("single_thread_cases: passed");
}

void observeWorkers() {
    // Shared objects outlive the inner thread scope, including during unwinding.
    Inventory inventory(initialStock);
    std::array<WorkerResult, workerCount> results{};
    {
        std::vector<std::jthread> workers;
        workers.reserve(workerCount);
        for (std::size_t index = 0; index < results.size(); ++index) {
            workers.emplace_back([&inventory, &results, index] {
                runWorker(inventory, results[index]);
            });
        }
        // If construction throws, existing jthreads are joined by destruction.
        // Workers do not wait for a start gate or for any not-yet-created worker.
        for (std::jthread& worker : workers) worker.join();
    }

    // join completed before the parent reads any worker-owned result slot.
    int successes = 0;
    int failures = 0;
    int snapshotChecks = 0;
    for (std::size_t index = 0; index < results.size(); ++index) {
        const WorkerResult& result = results[index];
        if (result.error) std::rethrow_exception(result.error);
        check(result.successes >= 0 && result.failures >= 0
            && result.successes + result.failures == attemptsPerWorker
            && result.snapshotChecks == attemptsPerWorker, "Worker result totals");
        successes += result.successes;
        failures += result.failures;
        snapshotChecks += result.snapshotChecks;
        std::printf("worker %zu: success=%d fail=%d snapshots=%d\n",
            index, result.successes, result.failures, result.snapshotChecks);
    }

    const InventorySnapshot finalState = inventory.snapshot();
    check(successes + failures == workerCount * attemptsPerWorker, "Total attempts");
    check(finalState.remaining >= 0
        && finalState.remaining + finalState.consumed == initialStock, "Final invariant");
    check(successes == initialStock && failures == 23
        && finalState.remaining == 0 && finalState.consumed == successes,
        "Expected final inventory and success/failure counts");
    std::printf("final: remaining=%d consumed=%d total_success=%d total_fail=%d total_attempts=%d snapshots=%d\n",
        finalState.remaining, finalState.consumed, successes, failures,
        successes + failures, snapshotChecks);
}
} // namespace

int main() {
    try {
        std::printf("inventory synchronization: initial=%d workers=%d attempts_per_worker=%d\n",
            initialStock, workerCount, attemptsPerWorker);
        checkSingleThreadCases();
        observeWorkers();
        std::printf("PASS: %u parent checks; 40 worker snapshots validated\n", checks);
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    } catch (...) {
        std::fputs("FAIL: non-standard exception\n", stderr);
        return 1;
    }
}
