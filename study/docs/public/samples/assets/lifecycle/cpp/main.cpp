#include <algorithm>
#include <array>
#include <climits>
#include <cstdint>
#include <cstdio>
#include <exception>
#include <limits>
#include <optional>
#include <span>
#include <stdexcept>

static_assert(CHAR_BIT == 8);
namespace {
using Generation = std::uint64_t;
using Bytes = std::array<unsigned char, 8>;
constexpr Bytes validBytes{0x41, 0x53, 0x30, 0x31, 0x10, 0x20, 0x30, 0x40};
enum class State { Requested, Reading, CpuReady, Registering, Ready, Released, Failed, Cancelled };
enum class Completion { Applied, Discarded, Rejected };
unsigned int checks = 0;
void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
void check(bool condition, const char* label) {
    require(condition, label);
    ++checks;
    std::printf("check %s: pass\n", label);
}

// Counts logical model tokens. This does not allocate/register a real engine/GPU asset.
class MockSink {
public:
    unsigned int createModelToken() {
        require(liveToken_ == 0, "MockSink already owns a token");
        require(created_ != std::numeric_limits<unsigned int>::max(), "Model token IDs exhausted");
        liveToken_ = ++created_;
        return liveToken_;
    }
    void releaseModelToken(unsigned int token) {
        require(token != 0 && token == liveToken_, "Invalid/duplicate model token release");
        liveToken_ = 0;
        ++released_;
    }
    unsigned int live() const noexcept { return liveToken_ == 0 ? 0U : 1U; }
    unsigned int created() const noexcept { return created_; }
    unsigned int released() const noexcept { return released_; }
private:
    unsigned int liveToken_ = 0;
    unsigned int created_ = 0;
    unsigned int released_ = 0;
};

// Single asset, deterministic injected events, no I/O, threads, decompressor or GPU.
// Budget counters describe logical staging ownership, not actual process/GPU memory.
class AssetLifecycleModel {
public:
    AssetLifecycleModel() = default;
    AssetLifecycleModel(const AssetLifecycleModel&) = delete;
    AssetLifecycleModel& operator=(const AssetLifecycleModel&) = delete;
    AssetLifecycleModel(AssetLifecycleModel&&) = delete;
    AssetLifecycleModel& operator=(AssetLifecycleModel&&) = delete;
    static constexpr unsigned int maxPending = 1;
    static constexpr unsigned int stagingBudget = 8;
    State state() const noexcept { return state_; }
    Generation generation() const noexcept { return generation_; }
    unsigned int pending() const noexcept {
        return (read_ ? 1U : 0U) + (registration_ ? 1U : 0U);
    }
    unsigned int stagingBytes() const noexcept { return (pending() + (cpu_ ? 1U : 0U)) * 8U; }
    unsigned int tokens() const noexcept { return sink_.live(); }
    unsigned int created() const noexcept { return sink_.created(); }
    unsigned int released() const noexcept { return sink_.released(); }
    unsigned int discarded() const noexcept { return discarded_; }
    bool resourcesZero() const noexcept { return pending() == 0 && stagingBytes() == 0 && tokens() == 0; }

    Generation request() {
        require(state_ == State::Released || state_ == State::Failed || state_ == State::Cancelled,
            "An active request must first be cancelled or released");
        require(generation_ != std::numeric_limits<Generation>::max(), "Generation exhausted");
        ++generation_;
        state_ = State::Requested; // At most one waiting request; no bytes reserved here.
        return generation_;
    }
    bool tryBeginRead(Generation id) {
        if (id != generation_ || state_ != State::Requested) return false;
        if (pending() >= maxPending || stagingBytes() + 8U > stagingBudget) return false;
        read_ = Slot{id, {}};
        state_ = State::Reading;
        return true;
    }
    Completion completeReadModel(Generation id, std::span<const unsigned char> bytes, bool succeeded = true) {
        if (!read_ || read_->id != id) return Completion::Rejected;
        Slot completed = *read_;
        read_.reset(); // Completion event has now returned ownership of the read slot.
        if (id != generation_ || state_ != State::Reading) {
            ++discarded_;
            return Completion::Discarded;
        }
        const bool valid = bytes.size() == 8 && bytes[0] == 0x41 && bytes[1] == 0x53
            && bytes[2] == 0x30 && bytes[3] == 0x31;
        if (!succeeded || !valid) {
            state_ = State::Failed;
            return Completion::Applied;
        }
        std::copy(bytes.begin(), bytes.end(), completed.bytes.begin());
        cpu_ = completed.bytes;
        state_ = State::CpuReady; // Length/magic checked; no decompression performed.
        return Completion::Applied;
    }
    bool tryBeginRegistrationModel(Generation id) {
        if (id != generation_ || state_ != State::CpuReady || !cpu_) return false;
        registration_ = Slot{id, *cpu_};
        cpu_.reset(); // Transfer staging ownership to the pending registration model.
        state_ = State::Registering;
        return true;
    }
    Completion completeRegistrationModel(Generation id, bool succeeded) {
        if (!registration_ || registration_->id != id) return Completion::Rejected;
        registration_.reset(); // Injected event models terminal completion, not cancellation request.
        const unsigned int token = succeeded ? sink_.createModelToken() : 0;
        if (id != generation_ || state_ != State::Registering) {
            if (token != 0) sink_.releaseModelToken(token); // Reclaim a late successful result.
            ++discarded_;
            return Completion::Discarded;
        }
        if (!succeeded) {
            state_ = State::Failed;
            return Completion::Applied;
        }
        readyToken_ = token;
        state_ = State::Ready; // Only a MockSink token, not actual GPU/engine readiness.
        return Completion::Applied;
    }
    bool cancel(Generation id) {
        if (id != generation_) return false;
        switch (state_) {
        case State::Requested:
        case State::Reading:
        case State::Registering:
            break; // Pending read/registration keeps its slot until a completion event.
        case State::CpuReady:
            cpu_.reset();
            break;
        default:
            return false;
        }
        state_ = State::Cancelled;
        return true;
    }
    bool tryUse(Generation id) const noexcept {
        return id == generation_ && state_ == State::Ready && readyToken_ != 0;
    }
    bool release(Generation id) {
        if (id != generation_ || state_ != State::Ready) return false;
        sink_.releaseModelToken(readyToken_);
        readyToken_ = 0;
        state_ = State::Released;
        return true;
    }
private:
    struct Slot { Generation id; Bytes bytes; };
    State state_ = State::Released;
    Generation generation_ = 0;
    std::optional<Slot> read_;
    std::optional<Bytes> cpu_;
    std::optional<Slot> registration_;
    unsigned int readyToken_ = 0;
    unsigned int discarded_ = 0;
    MockSink sink_;
};

Generation prepareRegistration(AssetLifecycleModel& model) {
    const Generation id = model.request();
    require(model.tryBeginRead(id), "Read setup");
    require(model.completeReadModel(id, validBytes) == Completion::Applied, "Read completion setup");
    require(model.tryBeginRegistrationModel(id), "Registration setup");
    return id;
}
void runScenarios() {
    AssetLifecycleModel model;
    std::puts("AssetLifecycleModel: single-thread, injected events, MockSink only");
    std::printf("budget: waiting_requests=1 pending_slots=%u staging_bytes=%u\n",
        AssetLifecycleModel::maxPending, AssetLifecycleModel::stagingBudget);
    Generation id = model.request();
    check(model.state() == State::Requested && !model.tryUse(id), "requested_not_usable");
    check(model.tryBeginRead(id) && model.state() == State::Reading
        && model.pending() == 1 && model.stagingBytes() == 8 && !model.tryUse(id), "reading_owns_slot");
    check(model.completeReadModel(id, validBytes) == Completion::Applied && model.state() == State::CpuReady
        && model.pending() == 0 && model.stagingBytes() == 8 && !model.tryUse(id), "validated_not_ready");
    check(model.tryBeginRegistrationModel(id) && model.state() == State::Registering
        && model.pending() == 1 && model.stagingBytes() == 8 && !model.tryUse(id), "registering_not_ready");
    check(model.completeRegistrationModel(id, true) == Completion::Applied && model.state() == State::Ready
        && model.tryUse(id) && model.tokens() == 1 && model.stagingBytes() == 0, "ready_owns_model_token");
    check(model.release(id) && model.state() == State::Released && model.resourcesZero(), "release_clears_resources");
    check(!model.release(id), "duplicate_release_rejected");

    id = model.request();
    require(model.tryBeginRead(id), "Short fixture setup");
    const std::array<unsigned char, 3> shortBytes{0x41, 0x53, 0x30};
    require(model.completeReadModel(id, shortBytes) == Completion::Applied, "Short completion");
    check(model.state() == State::Failed && model.resourcesZero() && !model.tryUse(id), "short_payload_failed");
    id = model.request();
    require(model.tryBeginRead(id), "Magic fixture setup");
    Bytes badMagic = validBytes;
    badMagic[0] = 0;
    require(model.completeReadModel(id, badMagic) == Completion::Applied, "Magic completion");
    check(model.state() == State::Failed && model.resourcesZero(), "bad_magic_failed");
    id = model.request();
    require(model.tryBeginRead(id), "Read failure setup");
    require(model.completeReadModel(id, {}, false) == Completion::Applied, "Read failure completion");
    check(model.state() == State::Failed && model.resourcesZero(), "read_failure_reclaimed");
    id = prepareRegistration(model);
    require(model.completeRegistrationModel(id, false) == Completion::Applied, "Registration failure completion");
    check(model.state() == State::Failed && model.resourcesZero(), "registration_failure_reclaimed");

    const Generation oldRead = model.request();
    require(model.tryBeginRead(oldRead), "Cancelled read setup");
    check(model.cancel(oldRead) && model.state() == State::Cancelled && model.pending() == 1
        && model.stagingBytes() == 8, "cancelled_read_keeps_slot");
    const Generation nextRead = model.request();
    check(nextRead > oldRead && !model.tryBeginRead(nextRead) && model.state() == State::Requested
        && model.pending() == 1 && model.stagingBytes() == 8, "read_backpressure_waits");
    check(model.completeReadModel(oldRead, validBytes) == Completion::Discarded
        && model.generation() == nextRead && model.state() == State::Requested
        && model.resourcesZero(), "stale_read_reclaimed");
    require(model.tryBeginRead(nextRead), "Resume read");
    require(model.completeReadModel(nextRead, validBytes) == Completion::Applied, "Resume completion");
    check(model.cancel(nextRead) && model.state() == State::Cancelled && model.resourcesZero(), "cpu_cancel_reclaims");

    const Generation oldRegistration = prepareRegistration(model);
    check(model.cancel(oldRegistration) && model.pending() == 1 && model.stagingBytes() == 8,
        "cancelled_registration_keeps_data");
    const Generation nextRegistration = model.request();
    check(nextRegistration > oldRegistration && !model.tryBeginRead(nextRegistration)
        && model.state() == State::Requested, "registration_backpressure_waits");
    const unsigned int createdBefore = model.created();
    const unsigned int releasedBefore = model.released();
    check(model.completeRegistrationModel(oldRegistration, true) == Completion::Discarded
        && model.state() == State::Requested && model.resourcesZero()
        && model.created() == createdBefore + 1 && model.released() == releasedBefore + 1,
        "stale_registration_token_released");
    require(model.tryBeginRead(nextRegistration), "Final read setup");
    require(model.completeReadModel(nextRegistration, validBytes) == Completion::Applied, "Final read completion");
    require(model.tryBeginRegistrationModel(nextRegistration), "Final registration setup");
    require(model.completeRegistrationModel(nextRegistration, true) == Completion::Applied, "Final registration completion");
    check(!model.tryUse(oldRegistration) && model.tryUse(nextRegistration), "generation_guards_use");
    check(model.release(nextRegistration) && model.resourcesZero(), "final_owner_releases");
    id = model.request();
    check(model.cancel(id) && model.resourcesZero(), "waiting_cancel_has_no_bytes");
    check(model.completeReadModel(id, validBytes) == Completion::Rejected && model.resourcesZero(),
        "unowned_completion_rejected");
    check(model.resourcesZero() && model.created() == 3 && model.released() == 3 && model.discarded() == 2,
        "all_resources_zero");
    std::printf("final: pending=%u staging_bytes=%u model_tokens=%u created=%u released=%u discarded=%u\n",
        model.pending(), model.stagingBytes(), model.tokens(), model.created(), model.released(), model.discarded());
}
} // namespace
int main() {
    try {
        runScenarios();
        std::printf("PASS: %u checks\n", checks);
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "FAIL: %s\n", error.what());
        return 1;
    }
}
