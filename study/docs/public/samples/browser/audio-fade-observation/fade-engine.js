const SampleRate = 48_000;
const FrameCount = 24_000;
const ToneFrequency = 400;
const TonePeak = 0.4;
const AttackSeconds = 0.01;
const StopSeconds = 0.25;
const StopFrame = StopSeconds * SampleRate;

export const FadeDurationsMs = Object.freeze([1, 5, 10, 20, 50]);

function createTone(context) {
  const buffer = context.createBuffer(1, FrameCount, SampleRate);
  const samples = buffer.getChannelData(0);
  const framesPerCycle = SampleRate / ToneFrequency;
  for (let frame = 0; frame < samples.length; frame += 1) {
    const phase = (frame % framesPerCycle) / framesPerCycle;
    samples[frame] = TonePeak * Math.cos(2 * Math.PI * phase);
  }
  return buffer;
}

function connectWithAttack(context, source, merger, channel) {
  const node = context.createGain();
  node.gain.setValueAtTime(0, 0);
  node.gain.linearRampToValueAtTime(1, AttackSeconds);
  source.connect(node);
  node.connect(merger, 0, channel);
  return node.gain;
}

export async function renderFade({ fadeMs = 10 } = {}) {
  if (!FadeDurationsMs.includes(fadeMs)) {
    throw new RangeError("フェード時間は1、5、10、20、50 msのいずれかを指定してください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const fadeEndFrame = StopFrame + fadeMs * SampleRate / 1_000;
  const context = new OfflineAudioContext(2, FrameCount, SampleRate);
  const source = context.createBufferSource();
  source.buffer = createTone(context);

  // Channel 0 records the abrupt mute. Channel 1 records the linear fade.
  const merger = context.createChannelMerger(2);
  const abruptGain = connectWithAttack(context, source, merger, 0);
  const fadedGain = connectWithAttack(context, source, merger, 1);
  abruptGain.setValueAtTime(0, StopSeconds);
  fadedGain.setValueAtTime(1, StopSeconds);
  fadedGain.linearRampToValueAtTime(0, fadeEndFrame / SampleRate);
  merger.connect(context.destination);
  source.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 2 || rendered.length !== FrameCount || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }

  const abrupt = rendered.getChannelData(0);
  const faded = rendered.getChannelData(1);
  return {
    sampleRate: rendered.sampleRate,
    frameCount: rendered.length,
    stopFrame: StopFrame,
    fadeEndFrame,
    fadeMs,
    abrupt,
    faded,
    abruptJump: Math.abs(abrupt[StopFrame] - abrupt[StopFrame - 1]),
    fadedJump: Math.abs(faded[StopFrame] - faded[StopFrame - 1])
  };
}
