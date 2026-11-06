const SampleRate = 48_000;
const FrameCount = SampleRate;
const TonePeak = 0.35;
const EdgeFadeFrames = 480;
const FadeStartFrame = 9_600;
const FadeEndFrame = 38_400;
const CurvePoints = 257;
const ReferenceWindow = Object.freeze({ startFrame: 4_560, endFrame: 5_040 });
const MidpointWindow = Object.freeze({ startFrame: 23_760, endFrame: 24_240 });

function createTone(context, frequency) {
  const buffer = context.createBuffer(1, FrameCount, SampleRate);
  const samples = buffer.getChannelData(0);
  const framesPerCycle = SampleRate / frequency;
  for (let frame = 0; frame < samples.length; frame += 1) {
    const phase = (frame % framesPerCycle) / framesPerCycle;
    const edgeGain = Math.min(1, frame / EdgeFadeFrames, (FrameCount - 1 - frame) / EdgeFadeFrames);
    samples[frame] = TonePeak * edgeGain * Math.sin(2 * Math.PI * phase);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

function gainCurves(equalPower) {
  const outgoing = new Float32Array(CurvePoints);
  const incoming = new Float32Array(CurvePoints);
  for (let point = 0; point < CurvePoints; point += 1) {
    const position = point / (CurvePoints - 1);
    outgoing[point] = equalPower ? Math.cos(Math.PI * position / 2) : 1 - position;
    incoming[point] = equalPower ? Math.sin(Math.PI * position / 2) : position;
  }
  outgoing[CurvePoints - 1] = 0;
  return [outgoing, incoming];
}

function connectWithCurve(context, source, merger, channel, curve) {
  const node = context.createGain();
  const startSeconds = FadeStartFrame / SampleRate;
  const durationSeconds = (FadeEndFrame - FadeStartFrame) / SampleRate;
  node.gain.setValueAtTime(curve[0], 0);
  node.gain.setValueCurveAtTime(curve, startSeconds, durationSeconds);
  source.connect(node);
  node.connect(merger, 0, channel);
}

function rms(samples, { startFrame, endFrame }) {
  let sumSquares = 0;
  for (let frame = startFrame; frame < endFrame; frame += 1) {
    sumSquares += samples[frame] ** 2;
  }
  return Math.sqrt(sumSquares / (endFrame - startFrame));
}

function analyze(samples) {
  const referenceRms = rms(samples, ReferenceWindow);
  const midpointRms = rms(samples, MidpointWindow);
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  return {
    samples,
    referenceRms,
    midpointRms,
    midpointDb: 20 * Math.log10(midpointRms / referenceRms),
    peak
  };
}

export async function renderCrossfade({ relation = "different" } = {}) {
  if (relation !== "different" && relation !== "same") {
    throw new RangeError("音源の組み合わせを選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const context = new OfflineAudioContext(2, FrameCount, SampleRate);
  const sourceA = createTone(context, 400);
  const sourceB = createTone(context, relation === "same" ? 400 : 600);
  const merger = context.createChannelMerger(2);

  // Each diagnostic channel sums the outgoing and incoming tones for one curve.
  const [linearA, linearB] = gainCurves(false);
  connectWithCurve(context, sourceA, merger, 0, linearA);
  connectWithCurve(context, sourceB, merger, 0, linearB);
  const [equalPowerA, equalPowerB] = gainCurves(true);
  connectWithCurve(context, sourceA, merger, 1, equalPowerA);
  connectWithCurve(context, sourceB, merger, 1, equalPowerB);
  merger.connect(context.destination);
  sourceA.start(0);
  sourceB.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 2 || rendered.length !== FrameCount || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }

  return {
    relation,
    sampleRate: rendered.sampleRate,
    frameCount: rendered.length,
    fadeStartFrame: FadeStartFrame,
    fadeEndFrame: FadeEndFrame,
    referenceWindow: ReferenceWindow,
    midpointWindow: MidpointWindow,
    linear: analyze(rendered.getChannelData(0)),
    equalPower: analyze(rendered.getChannelData(1))
  };
}
