const SampleRate = 48_000;
const ClipFrames = 38_400;
const Wall = { z: -2.5, minX: -2, maxX: 2 };
const Locations = {
  open: { x: 4.8, z: -3.6 },
  blocked: { x: 0, z: -6 }
};
const LowHz = 250;
const HighHz = 4_000;

function intersectsWall(source) {
  // The listener is at (0, 0). Interpolate along the segment to the source.
  const t = Wall.z / source.z;
  const hitX = t * source.x;
  return t > 0 && t < 1 && hitX >= Wall.minX && hitX <= Wall.maxX;
}

function makeProbe() {
  const samples = new Float32Array(ClipFrames);
  for (const [offset, duration] of [[0.035, 0.24], [0.40, 0.30]]) {
    const start = Math.round(offset * SampleRate);
    const length = Math.round(duration * SampleRate);
    for (let frame = 0; frame < length; frame += 1) {
      const phase = 2 * Math.PI * frame / SampleRate;
      const envelope = Math.sin(Math.PI * frame / (length - 1)) ** 2;
      samples[start + frame] = 0.12 * envelope * (Math.sin(LowHz * phase) + Math.sin(HighHz * phase));
    }
  }
  return samples;
}

function measureResponse(filter, gain) {
  const plotFrequencies = Array.from({ length: 101 }, (_, index) => 100 * 80 ** (index / 100));
  const frequencies = Float32Array.from([...plotFrequencies, LowHz, HighHz]);
  const magnitudes = new Float32Array(frequencies.length);
  if (filter) {
    filter.getFrequencyResponse(frequencies, magnitudes, new Float32Array(frequencies.length));
  } else {
    magnitudes.fill(1);
  }
  const db = Array.from(magnitudes, magnitude => 20 * Math.log10(gain * magnitude));
  return {
    points: plotFrequencies.map((frequencyHz, index) => ({ frequencyHz, db: db[index] })),
    lowDb: db.at(-2),
    highDb: db.at(-1)
  };
}

export async function renderOcclusion({ location = "blocked", mode = "gain-lowpass" } = {}) {
  if (!Object.hasOwn(Locations, location) || !["gain", "gain-lowpass"].includes(mode)) {
    throw new RangeError("音源の位置と遮蔽時の処理を選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const position = { ...Locations[location] };
  const blocked = intersectsWall(position);
  const gain = blocked ? 0.5 : 1;
  const cutoffHz = blocked && mode === "gain-lowpass" ? 1_000 : null;
  const context = new OfflineAudioContext(2, ClipFrames, SampleRate);
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, ClipFrames, SampleRate);
  source.buffer.copyToChannel(makeProbe(), 0);
  const level = context.createGain();
  level.gain.value = gain;
  const merger = context.createChannelMerger(2);

  let filter = null;
  source.connect(merger, 0, 0);
  source.connect(level);
  if (cutoffHz !== null) {
    filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoffHz;
    // For this Web Audio filter type, Q is specified in decibels.
    filter.Q.value = 20 * Math.log10(Math.SQRT1_2);
    level.connect(filter);
    filter.connect(merger, 0, 1);
  } else {
    level.connect(merger, 0, 1);
  }
  merger.connect(context.destination);
  source.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 2 || rendered.length !== ClipFrames || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }

  return {
    location,
    mode,
    sampleRate: rendered.sampleRate,
    source: position,
    blocked,
    gain,
    cutoffHz,
    ...measureResponse(filter, gain),
    dry: rendered.getChannelData(0),
    processed: rendered.getChannelData(1)
  };
}
