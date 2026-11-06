const REFRESH_HZ = 60;
const UNITS_PER_MS = 3;
const SCAN_UNITS = 1000 * UNITS_PER_MS / REFRESH_HZ;
const SCAN_COUNT = 7;

function toMs(units) {
  return units / UNITS_PER_MS;
}

function readyUnits(frame) {
  return frame.readyMs * UNITS_PER_MS;
}

function makeBand(frame, from, to, scanStart) {
  return {
    frameId: frame.id,
    fromMs: toMs(from),
    toMs: toMs(to),
    startRow: (from - scanStart) / SCAN_UNITS,
    endRow: (to - scanStart) / SCAN_UNITS,
  };
}

function visibleEvent(frame, at) {
  return {
    frameId: frame.id,
    visibleMs: toMs(at),
    latencyMs: toMs(at - frame.inputMs * UNITS_PER_MS),
  };
}

function scanSynchronized(state, ready, start, end, replacePending) {
  state.pending.push(...ready);
  if (replacePending && state.pending.length > 1) {
    const replaced = state.pending.splice(0, state.pending.length - 1);
    state.skipped.push(...replaced.map((frame) => frame.id));
  }
  const next = state.pending.shift();
  if (next) state.front = next;

  return {
    bands: [makeBand(state.front, start, end, start)],
    pending: state.pending.map((frame) => frame.id),
    skipped: state.skipped.slice(),
    firstVisible: next ? [visibleEvent(next, start)] : [],
  };
}

function scanImmediate(state, ready, start, end) {
  const bands = [];
  const firstVisible = [];
  let from = start;

  function appendBand(to) {
    if (from >= to) return;
    const frame = state.front;
    bands.push(makeBand(frame, from, to, start));
    if (frame.inputMs !== null && from === readyUnits(frame)) {
      firstVisible.push(visibleEvent(frame, from));
    }
  }

  for (const frame of ready) {
    const at = readyUnits(frame);
    appendBand(at);
    state.front = frame;
    from = at;
  }
  appendBand(end);

  return { bands, pending: [], skipped: [], firstVisible };
}

export function buildPresentation() {
  const frames = [
    { id: 'A', inputMs: null, readyMs: 0 },
    { id: 'B', inputMs: 0, readyMs: 4 },
    { id: 'C', inputMs: 7, readyMs: 11 },
    { id: 'D', inputMs: 19, readyMs: 23 },
    { id: 'E', inputMs: 26, readyMs: 30 },
    { id: 'F', inputMs: 35, readyMs: 39 },
    { id: 'G', inputMs: 43, readyMs: 47 },
  ];
  const [initial, ...arrivals] = frames;
  const fifo = { front: initial, pending: [], skipped: [] };
  const mailbox = { front: initial, pending: [], skipped: [] };
  const immediate = { front: initial };

  const scans = Array.from({ length: SCAN_COUNT }, (_, index) => {
    const start = index * SCAN_UNITS;
    const end = start + SCAN_UNITS;
    // A completion on the boundary can be selected for this scan.
    const readyAtBoundary = arrivals.filter((frame) => (
      readyUnits(frame) > start - SCAN_UNITS && readyUnits(frame) <= start
    ));
    const readyDuringScan = arrivals.filter((frame) => (
      readyUnits(frame) >= start && readyUnits(frame) < end
    ));

    return {
      index,
      startMs: toMs(start),
      endMs: toMs(end),
      modes: {
        fifo: scanSynchronized(fifo, readyAtBoundary, start, end, false),
        mailbox: scanSynchronized(mailbox, readyAtBoundary, start, end, true),
        immediate: scanImmediate(immediate, readyDuringScan, start, end),
      },
    };
  });

  return { refreshHz: REFRESH_HZ, frames, scans };
}
