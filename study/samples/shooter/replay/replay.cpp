#include "shooter_model.hpp"

#include <algorithm>
#include <cstddef>
#include <iomanip>
#include <iostream>
#include <optional>
#include <string>
#include <utility>
#include <vector>

using shooter::FrameInput;
using shooter::World;

constexpr int kTicksPerSecond = 60;
constexpr std::size_t kRecordedTicks = 60;
constexpr std::size_t kPulseTick = 10;
static_assert(shooter::kTickSeconds == 1.0f / kTicksPerSecond,
              "Replay and shooter model must use the same tick duration");

struct Recording {
    World initial;
    std::vector<FrameInput> inputs;
};

struct ReplayResult {
    std::vector<World> statesAfterTick;
    std::vector<int> ticksPerFrame;
};

ReplayResult Replay(const Recording& recording, int framesPerSecond) {
    World world = recording.initial;
    ReplayResult result;
    std::size_t tick = 0;
    int credit = 0;

    while (tick < recording.inputs.size()) {
        credit += kTicksPerSecond;
        int ticksThisFrame = 0;
        while (credit >= framesPerSecond && tick < recording.inputs.size()) {
            world.Tick(recording.inputs[tick]);
            result.statesAfterTick.push_back(world);
            ++tick;
            ++ticksThisFrame;
            credit -= framesPerSecond;
        }
        result.ticksPerFrame.push_back(ticksThisFrame);
    }
    return result;
}

template <typename Object>
std::string FirstObjectDifference(const std::vector<Object>& a,
                                  const std::vector<Object>& b,
                                  const std::string& name) {
    if (a.size() != b.size()) return name + ".size";
    for (std::size_t i = 0; i < a.size(); ++i) {
        const std::string item = name + "[" + std::to_string(i) + "]";
        if (a[i].position.x != b[i].position.x) return item + ".position.x";
        if (a[i].position.y != b[i].position.y) return item + ".position.y";
        if (a[i].alive != b[i].alive) return item + ".alive";
    }
    return {};
}

std::string FirstStateDifference(const World& a, const World& b) {
    if (a.player.position.x != b.player.position.x) return "player.position.x";
    if (a.player.position.y != b.player.position.y) return "player.position.y";
    if (a.player.hp != b.player.hp) return "player.hp";
    if (a.player.invulnerabilityTicks != b.player.invulnerabilityTicks)
        return "player.invulnerabilityTicks";
    if (a.score != b.score) return "score";
    if (a.gameOver != b.gameOver) return "gameOver";
    if (a.shotCooldownTicks != b.shotCooldownTicks) return "shotCooldownTicks";
    if (a.spawnCountdownTicks != b.spawnCountdownTicks) return "spawnCountdownTicks";
    if (a.nextSpawnIndex != b.nextSpawnIndex) return "nextSpawnIndex";
    const auto bullets = FirstObjectDifference(a.bullets, b.bullets, "bullets");
    if (!bullets.empty()) return bullets;
    return FirstObjectDifference(a.enemies, b.enemies, "enemies");
}

struct Difference {
    std::size_t tick;
    std::string field;
};

std::optional<Difference> FindFirstDifference(const std::vector<World>& a,
                                              const std::vector<World>& b) {
    const auto commonTicks = std::min(a.size(), b.size());
    for (std::size_t tick = 0; tick < commonTicks; ++tick) {
        auto field = FirstStateDifference(a[tick], b[tick]);
        if (!field.empty()) return Difference{tick, std::move(field)};
    }
    if (a.size() != b.size()) return Difference{commonTicks, "tick count"};
    return std::nullopt;
}

void PrintSchedule(int framesPerSecond, const ReplayResult& replay) {
    const auto& frames = replay.ticksPerFrame;
    std::cout << framesPerSecond << " FPS: " << frames.size() << " frames, "
              << replay.statesAfterTick.size() << " ticks (0/1/2 per frame: "
              << std::count(frames.begin(), frames.end(), 0) << '/'
              << std::count(frames.begin(), frames.end(), 1) << '/'
              << std::count(frames.begin(), frames.end(), 2) << ")\n";
}

int main() {
    World live;
    live.player.position.x = 300.0f;
    live.shotCooldownTicks = 2;
    Recording recording{live, {}};
    std::vector<World> reference;

    // A scripted input source lets everyone record the same tick inputs.
    for (std::size_t tick = 0; tick < kRecordedTicks; ++tick) {
        FrameInput input;
        input.shoot = true;
        if (tick == kPulseTick) input.moveX = 1.0f;
        recording.inputs.push_back(input);
        live.Tick(input);
        reference.push_back(live);
    }

    std::cout << std::fixed << std::setprecision(3);
    std::cout << "Recorded: " << recording.inputs.size()
              << " ticks, initial player.x=" << recording.initial.player.position.x << '\n';
    const auto at30 = Replay(recording, 30);
    const auto at120 = Replay(recording, 120);
    PrintSchedule(30, at30);
    PrintSchedule(120, at120);

    if (at30.ticksPerFrame != std::vector<int>(30, 2) || at120.ticksPerFrame.size() != 120) {
        std::cerr << "Unexpected replay schedule\n";
        return 1;
    }
    for (std::size_t frame = 0; frame < at120.ticksPerFrame.size(); ++frame) {
        if (at120.ticksPerFrame[frame] != static_cast<int>(frame % 2)) {
            std::cerr << "Unexpected 120 FPS schedule at frame " << frame << '\n';
            return 1;
        }
    }

    for (const auto* run : {&at30, &at120}) {
        if (const auto difference = FindFirstDifference(reference, run->statesAfterTick)) {
            std::cerr << "Unexpected difference at tick " << difference->tick
                      << " in " << difference->field << '\n';
            return 1;
        }
    }
    std::cout << "Same input log: all " << reference.size()
              << " states match at both rates\n";

    Recording delayed = recording;
    std::swap(delayed.inputs[kPulseTick], delayed.inputs[kPulseTick + 1]);
    const auto changed = Replay(delayed, 120);
    const auto difference = FindFirstDifference(reference, changed.statesAfterTick);
    if (!difference || difference->tick != kPulseTick || difference->field != "player.position.x") {
        std::cerr << "Expected the delayed pulse to first change player.position.x at tick "
                  << kPulseTick << '\n';
        return 1;
    }

    const auto tick = difference->tick;
    std::cout << "Input pulse delayed " << kPulseTick << " -> " << kPulseTick + 1
              << ": first difference after tick " << tick << " at " << difference->field
              << " (" << reference[tick].player.position.x << " vs "
              << changed.statesAfterTick[tick].player.position.x << ")\n";
}
