const REFRESH_HZ = 120;
const FRAME_COUNT = 120;
const TARGET_TICKS = 2;

function ticksToMs(ticks) {
  return (ticks * 1000) / REFRESH_HZ;
}

function makeIntervals(mode) {
  switch (mode) {
    case 'regular':
      return Array(FRAME_COUNT).fill(TARGET_TICKS);
    case 'spike': {
      const intervals = Array(FRAME_COUNT).fill(TARGET_TICKS);
      for (const index of [30, 90]) {
        // A six-tick hold and four one-tick holds still use ten ticks.
        intervals.splice(index, 5, 6, 1, 1, 1, 1);
      }
      return intervals;
    }
    case 'alternating':
      return Array.from({ length: FRAME_COUNT }, (_, index) => index % 2 === 0 ? 1 : 3);
    default:
      throw new RangeError(`Unknown frame pacing mode: ${mode}`);
  }
}

export function buildPacing(mode) {
  const intervals = makeIntervals(mode);
  let endTick = 0;
  const frames = intervals.map((ticks, index) => {
    const startTick = endTick;
    endTick += ticks;
    return {
      index,
      startTick,
      endTick,
      ticks,
      startMs: ticksToMs(startTick),
      durationMs: ticksToMs(ticks),
    };
  });

  const durationMs = ticksToMs(endTick);
  const sortedTicks = intervals.slice().sort((a, b) => a - b);
  const p99Index = Math.ceil(sortedTicks.length * 0.99) - 1;
  return {
    mode,
    refreshHz: REFRESH_HZ,
    durationMs,
    frames,
    metrics: {
      fps: (frames.length * 1000) / durationMs,
      meanMs: durationMs / frames.length,
      p99Ms: ticksToMs(sortedTicks[p99Index]),
      maxMs: ticksToMs(sortedTicks.at(-1)),
      overBudget: intervals.filter((ticks) => ticks > TARGET_TICKS).length,
    },
  };
}

export function frameAtTime(series, elapsedMs) {
  // An exact boundary belongs to the next frame. At the end, keep the last frame visible.
  return series.frames.find((frame) => elapsedMs < ticksToMs(frame.endTick)) ?? series.frames.at(-1);
}
