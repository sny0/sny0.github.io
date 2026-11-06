const SampleRate = 48_000;
const FrameCount = SampleRate;
const ToneFrequency = 400;
const TonePeak = 0.65;

function createTone(context) {
  const buffer = context.createBuffer(1, FrameCount, SampleRate);
  const samples = buffer.getChannelData(0);
  const framesPerCycle = SampleRate / ToneFrequency;
  for (let frame = 0; frame < samples.length; frame += 1) {
    const phase = (frame % framesPerCycle) / framesPerCycle;
    samples[frame] = TonePeak * Math.sin(2 * Math.PI * phase);
  }
  return buffer;
}

function connectTone(context, buffer, gainValue, master) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  const gain = context.createGain();
  gain.gain.value = gainValue;
  source.connect(gain);
  gain.connect(master);
  return source;
}

export async function renderMix({ gainA, gainB, masterGain } = {}) {
  if (![gainA, gainB, masterGain].every(gain => Number.isFinite(gain) && gain >= 0 && gain <= 1)) {
    throw new RangeError("ゲインは0から1までの数値で指定してください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const context = new OfflineAudioContext(2, FrameCount, SampleRate);
  const tone = createTone(context);
  const master = context.createGain();
  master.gain.value = masterGain;
  const sourceA = connectTone(context, tone, gainA, master);
  const sourceB = connectTone(context, tone, gainB, master);

  const shaper = context.createWaveShaper();
  shaper.curve = new Float32Array([-1, 1]);
  shaper.oversample = "none";
  const merger = context.createChannelMerger(2);
  // Save the master output and the shaped output as separate diagnostic channels.
  master.connect(merger, 0, 0);
  master.connect(shaper);
  shaper.connect(merger, 0, 1);
  merger.connect(context.destination);

  sourceA.start(0);
  sourceB.start(0);
  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 2 || rendered.length !== FrameCount || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }

  const raw = rendered.getChannelData(0);
  const clipped = rendered.getChannelData(1);
  let rawPeak = 0;
  let clippedPeak = 0;
  let overRangeCount = 0;
  for (let frame = 0; frame < rendered.length; frame += 1) {
    const magnitude = Math.abs(raw[frame]);
    rawPeak = Math.max(rawPeak, magnitude);
    clippedPeak = Math.max(clippedPeak, Math.abs(clipped[frame]));
    if (magnitude > 1) overRangeCount += 1;
  }
  return { sampleRate: rendered.sampleRate, frameCount: rendered.length, raw, clipped, rawPeak, clippedPeak, overRangeCount };
}
