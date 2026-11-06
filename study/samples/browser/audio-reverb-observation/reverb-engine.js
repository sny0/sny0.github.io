const SampleRate = 48_000;
const DryFrames = 2_880;
const Presets = {
  room: {
    lengthMs: 300,
    reflections: [[12, 0.58], [23, -0.29], [36, 0.24], [52, 0.16]],
    tailStartMs: 48,
    tailLevel: 0.032
  },
  hall: {
    lengthMs: 1_200,
    reflections: [[40, 0.54], [67, 0.31], [96, -0.26], [133, 0.21], [178, 0.15]],
    tailStartMs: 108,
    tailLevel: 0.044
  }
};

function frameAt(ms) {
  return Math.round(ms * SampleRate / 1_000);
}

function makeNoise(seed) {
  return () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 2 ** 31 - 1;
  };
}

function makePercussion() {
  const samples = new Float32Array(DryFrames);
  const noise = makeNoise(102);
  for (let frame = 1; frame < samples.length - 1; frame += 1) {
    const time = frame / SampleRate;
    const phase = 2 * Math.PI * (650 * time - 2_300 * time * time);
    const attack = Math.min(1, frame / frameAt(1));
    const decay = (1 - frame / (samples.length - 1)) ** 3;
    const tone = 0.21 * Math.sin(phase) + 0.055 * Math.sin(1.83 * phase);
    samples[frame] = attack * decay * (tone + 0.12 * Math.exp(-time / 0.008) * noise());
  }
  return samples;
}

function makeImpulseResponse({ lengthMs, reflections, tailStartMs, tailLevel }) {
  const impulse = new Float32Array(frameAt(lengthMs));
  const tailStart = frameAt(tailStartMs);
  const tailSpan = impulse.length - tailStart - 1;
  const noise = makeNoise(lengthMs);
  let low = 0;

  // Add a dense, deterministic tail after the first discrete reflections.
  for (let frame = tailStart; frame < impulse.length; frame += 1) {
    const elapsed = frame - tailStart;
    const progress = elapsed / tailSpan;
    const white = noise();
    low += 0.18 * (white - low);
    const attack = Math.min(1, elapsed / frameAt(8));
    const decay = Math.exp(-4.8 * progress) * Math.min(1, (1 - progress) / 0.06);
    impulse[frame] = tailLevel * attack * decay * (0.65 * white + 0.35 * low);
  }
  for (const [ms, amplitude] of reflections) {
    impulse[frameAt(ms)] += amplitude;
  }
  return impulse;
}

export async function renderReverb({ preset = "room", wetGain = 0.35 } = {}) {
  if (!Object.hasOwn(Presets, preset) || ![0, 0.35, 0.7].includes(wetGain)) {
    throw new RangeError("インパルス応答と反響のゲインを選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const settings = Presets[preset];
  const percussion = makePercussion();
  const impulse = makeImpulseResponse(settings);
  const renderFrames = percussion.length + impulse.length - 1;
  const context = new OfflineAudioContext(2, renderFrames, SampleRate);

  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, percussion.length, SampleRate);
  source.buffer.copyToChannel(percussion, 0);

  const convolver = context.createConvolver();
  const impulseBuffer = context.createBuffer(1, impulse.length, SampleRate);
  impulseBuffer.copyToChannel(impulse, 0);
  convolver.normalize = false;
  convolver.buffer = impulseBuffer;

  // Record the direct and convolved signals in separate channels.
  const merger = context.createChannelMerger(2);
  source.connect(merger, 0, 0);
  source.connect(convolver);
  convolver.connect(merger, 0, 1);
  merger.connect(context.destination);
  source.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 2 || rendered.length !== renderFrames || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }

  const dry = rendered.getChannelData(0);
  const wet = rendered.getChannelData(1);
  const mixed = new Float32Array(renderFrames);
  for (let frame = 0; frame < renderFrames; frame += 1) {
    mixed[frame] = dry[frame] + wetGain * wet[frame];
  }

  return {
    preset,
    wetGain,
    sampleRate: rendered.sampleRate,
    dryFrames: percussion.length,
    impulse,
    firstReflectionFrame: frameAt(settings.reflections[0][0]),
    dry,
    wet,
    mixed
  };
}
