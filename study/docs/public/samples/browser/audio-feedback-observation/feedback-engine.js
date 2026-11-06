const SampleRate = 48_000;
const EchoesToMeasure = 5;
const PercussionFrames = 2_160;
const AttackFrames = 96;
const TailAmplitude = 10 ** (-48 / 20);
const EchoSearchRadius = 512;
const TailSilenceFrames = 128;

function createSource(context, frames) {
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, frames, SampleRate);
  return source;
}

function createPercussion(context) {
  const source = createSource(context, PercussionFrames);
  const samples = source.buffer.getChannelData(0);
  for (let frame = 1; frame < samples.length - 1; frame += 1) {
    const time = frame / SampleRate;
    const phase = 2 * Math.PI * (680 * time - 2_000 * time * time);
    const attack = Math.min(1, frame / AttackFrames);
    const decay = (1 - frame / (samples.length - 1)) ** 3;
    samples[frame] = attack * decay * (0.25 * Math.sin(phase) + 0.06 * Math.sin(2 * phase));
  }
  return source;
}

function connectFeedback(context, source, merger, channel, delayMs, feedback) {
  const sum = context.createGain();
  const delay = context.createDelay();
  const returnGain = context.createGain();
  delay.delayTime.setValueAtTime(delayMs / 1_000, 0);
  returnGain.gain.setValueAtTime(feedback, 0);

  source.connect(sum);
  sum.connect(merger, 0, channel);
  sum.connect(delay);
  delay.connect(returnGain);
  returnGain.connect(sum);
}

function readTap(impulse, index, frame) {
  return { index, frame, timeMs: frame * 1_000 / SampleRate, amplitude: impulse[frame] };
}

function locateEcho(impulse, index, expectedFrame) {
  let peakFrame = expectedFrame;
  const lastFrame = Math.min(impulse.length - 1, expectedFrame + EchoSearchRadius);
  for (let frame = expectedFrame - EchoSearchRadius; frame <= lastFrame; frame += 1) {
    if (Math.abs(impulse[frame]) > Math.abs(impulse[peakFrame])) peakFrame = frame;
  }
  const tap = readTap(impulse, index, peakFrame);
  if (!(Math.abs(tap.amplitude) >= 1e-6)) {
    throw new Error(`${index}回目の反響を測定できませんでした。`);
  }
  return tap;
}

export async function renderFeedback({ delayMs = 200, feedback = 0.7 } = {}) {
  if (![100, 200, 400].includes(delayMs) || ![0, 0.4, 0.7].includes(feedback)) {
    throw new RangeError("遅延時間とフィードバックゲインを選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const delayFrames = delayMs * SampleRate / 1_000;
  const audibleEchoes = feedback === 0 ? 0 : Math.ceil(Math.log(TailAmplitude) / Math.log(feedback));
  const lastEchoIndex = Math.max(EchoesToMeasure, audibleEchoes);
  // Allow for a browser to return a block of the cycle later than the set delay.
  const renderFrames = feedback === 0
    ? EchoesToMeasure * delayFrames + 1
    : lastEchoIndex * (delayFrames + EchoSearchRadius) + EchoSearchRadius + PercussionFrames + TailSilenceFrames;
  const context = new OfflineAudioContext(3, renderFrames, SampleRate);
  const impulseSource = createSource(context, 1);
  const percussion = createPercussion(context);
  const merger = context.createChannelMerger(3);
  impulseSource.buffer.getChannelData(0)[0] = 1;

  // Separate channels retain the impulse response, dry audio, and wet-plus-dry audio.
  connectFeedback(context, impulseSource, merger, 0, delayMs, feedback);
  percussion.connect(merger, 0, 1);
  connectFeedback(context, percussion, merger, 2, delayMs, feedback);
  merger.connect(context.destination);
  impulseSource.start(0);
  percussion.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 3 || rendered.length !== renderFrames || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }
  const impulse = rendered.getChannelData(0);
  const taps = [readTap(impulse, 0, 0)];
  let observedDelayFrames = null;
  let mixedFrames = PercussionFrames;
  if (feedback === 0) {
    for (let index = 1; index <= EchoesToMeasure; index += 1) {
      taps.push(readTap(impulse, index, index * delayFrames));
    }
  } else {
    const firstEcho = locateEcho(impulse, 1, delayFrames);
    observedDelayFrames = firstEcho.frame;
    taps.push(firstEcho);
    for (let index = 2; index <= EchoesToMeasure; index += 1) {
      taps.push(locateEcho(impulse, index, index * observedDelayFrames));
    }
    const lastEcho = locateEcho(impulse, audibleEchoes, audibleEchoes * observedDelayFrames);
    mixedFrames = lastEcho.frame + PercussionFrames + TailSilenceFrames;
  }

  return {
    delayMs,
    feedback,
    sampleRate: rendered.sampleRate,
    delayFrames,
    observedDelayFrames,
    taps,
    dry: rendered.getChannelData(1).slice(0, PercussionFrames),
    mixed: rendered.getChannelData(2).slice(0, mixedFrames)
  };
}
