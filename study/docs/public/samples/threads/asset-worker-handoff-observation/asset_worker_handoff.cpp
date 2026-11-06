#include <algorithm>
#include <array>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstddef>
#include <cstdio>
#include <mutex>
#include <optional>
#include <stdexcept>
#include <thread>

// The sample's jobs and results are small, copyable records.
template<class T, std::size_t Capacity>
class BoundedQueue {
public:
    bool push(const T& item) {
        std::unique_lock lock(mutex_);
        not_full_.wait(lock, [this] { return closed_ || size_ < Capacity; });
        if (closed_) return false;
        slots_[(first_ + size_) % Capacity] = item;
        ++size_;
        peak_ = std::max(peak_, size_);
        lock.unlock();
        not_empty_.notify_one();
        return true;
    }

    std::optional<T> pop() {
        std::unique_lock lock(mutex_);
        not_empty_.wait(lock, [this] { return closed_ || size_ != 0; });
        if (size_ == 0) return std::nullopt;
        return take_first(lock);
    }

    std::optional<T> try_pop() {
        std::unique_lock lock(mutex_);
        if (size_ == 0) return std::nullopt;
        return take_first(lock);
    }

    void close() {
        {
            std::lock_guard lock(mutex_);
            closed_ = true;
        }
        not_empty_.notify_all();
        not_full_.notify_all();
    }

    bool drained() const {
        std::lock_guard lock(mutex_);
        return closed_ && size_ == 0;
    }

    std::size_t peak() const {
        std::lock_guard lock(mutex_);
        return peak_;
    }

private:
    static_assert(Capacity > 0);

    T take_first(std::unique_lock<std::mutex>& lock) {
        const auto item = slots_[first_];
        first_ = (first_ + 1) % Capacity;
        --size_;
        lock.unlock();
        not_full_.notify_one();
        return item;
    }

    mutable std::mutex mutex_;
    std::condition_variable not_empty_;
    std::condition_variable not_full_;
    std::array<T, Capacity> slots_{};
    std::size_t first_ = 0;
    std::size_t size_ = 0;
    std::size_t peak_ = 0;
    bool closed_ = false;
};

struct Job {
    unsigned asset;
    unsigned generation;
    std::array<int, 3> vertex_x;
};

struct Bounds {
    int min_x;
    int max_x;
    bool operator==(const Bounds&) const = default;
};

struct Result {
    unsigned asset;
    unsigned generation;
    Bounds bounds;
};

int main() {
    constexpr unsigned worker_count = 2;
    BoundedQueue<Job, 2> jobs;
    BoundedQueue<Result, 1> results;
    std::atomic<unsigned> workers_left{worker_count};
    std::array<std::optional<Bounds>, 3> published{};
    unsigned stale = 0;

    std::array<std::jthread, worker_count> workers;
    std::jthread producer;
    try {
        // The first request is outstanding when the scene changes.
        unsigned active_generation = 1;
        jobs.push({0, active_generation, {-9, -2, 9}});
        ++active_generation;

        for (auto& worker : workers) {
            worker = std::jthread([&] {
                while (const auto job = jobs.pop()) {
                    // Do the work on a local copy, outside either queue's lock.
                    const auto [lo, hi] = std::minmax_element(job->vertex_x.begin(), job->vertex_x.end());
                    if (!results.push({job->asset, job->generation, {*lo, *hi}})) break;
                }
                if (workers_left.fetch_sub(1) == 1) results.close();
            });
        }

        producer = std::jthread([&, generation = active_generation] {
            const std::array<Job, 3> next_scene{{{0, generation, {-3, 0, 2}},
                                                 {1, generation, {5, 9, 7}},
                                                 {2, generation, {-2, 4, 1}}}};
            for (const auto& job : next_scene) {
                if (!jobs.push(job)) break;
            }
            jobs.close();
        });

        while (!results.drained()) {
            // Simulate a render loop with a budget of one result per frame.
            if (const auto result = results.try_pop()) {
                if (result->generation != active_generation) {
                    ++stale;
                } else {
                    if (result->asset >= published.size() || published[result->asset]) {
                        throw std::runtime_error("unexpected asset result");
                    }
                    published[result->asset] = result->bounds;
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds{1});
        }

        producer.join();
        for (auto& worker : workers) worker.join();

        constexpr std::array expected{Bounds{-3, 2}, Bounds{5, 9}, Bounds{-2, 4}};
        for (unsigned i = 0; i < published.size(); ++i) {
            if (published[i] != expected[i]) throw std::runtime_error("missing or incorrect bounds");
            std::printf("asset %u generation %u x=[%d,%d]\n", i, active_generation,
                        published[i]->min_x, published[i]->max_x);
        }
        if (stale != 1 || results.peak() != 1) throw std::runtime_error("unexpected queue outcome");
        std::printf("published=%zu stale=%u result_queue_peak=%zu\n",
                    published.size(), stale, results.peak());
    } catch (const std::exception& error) {
        // Release waiters before the jthreads join during cleanup.
        jobs.close();
        results.close();
        std::fprintf(stderr, "error: %s\n", error.what());
        return 1;
    }
    return 0;
}
