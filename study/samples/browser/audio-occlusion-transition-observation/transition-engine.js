const SampleRate = 48_000;
const ClipFrames = SampleRate;
const TransitionSeconds = 0.4;
const InitialGain = 0.5;
const OpenGain = 1;
const InitialCutoff = 1_000;
const OpenCutoff = 8_000;

function makeProbe() {
  const samples = new Float32Array(ClipFrames);
  const fadeFrames = Math.round(0.025 * SampleRate);
  for (let frame = 0; frame < samples.length; frame += 1) {
    const edge = Math.min(1, frame / fadeFrames, (samples.length - 1 - frame) / fadeFrames);
    const envelope = (1 - Math.cos(Math.PI * edge)) / 2;
    const phase = 2 * Math.PI * frame / SampleRate;
    samples[frame] = 0.08 * envelope * (Math.cos(250 * phase) + Math.cos(4_000 * phase));
  }
  return samples;
}

function scheduleChange(param, initial, target, timeConstant) {
  param.setValueAtTime(initial, 0);
  if (timeConstant === 0) {
    param.setValueAtTime(target, TransitionSeconds);
  } else {
    param.setTargetAtTime(target, TransitionSeconds, timeConstant);
  }
}

function connectPath(context, source, merger, channel, timeConstant) {
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  // Web Audio expresses Q in decibels for low-pass filters.
  filter.Q.value = 20 * Math.log10(Math.SQRT1_2);
  scheduleChange(filter.frequency, InitialCutoff, OpenCutoff, timeConstant);

  const level = context.createGain();
  scheduleChange(level.gain, InitialGain, OpenGain, timeConstant);
  source.connect(filter);
  filter.connect(level);
  level.connect(merger, 0, channel);
}

export async function renderTransition({ timeConstantMs = 20 } = {}) {
  if (![20, 60].includes(timeConstantMs)) {
    throw new RangeError("時定数は20 msまたは60 msを選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const context = new OfflineAudioContext(3, ClipFrames, SampleRate);
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, ClipFrames, SampleRate);
  source.buffer.copyToChannel(makeProbe(), 0);

  const merger = context.createChannelMerger(3);
  const timeConstant = timeConstantMs / 1_000;
  connectPath(context, source, merger, 0, 0);
  connectPath(context, source, merger, 1, timeConstant);

  // With an input of 1, each output sample is the scheduled gain itself.
  const one = context.createConstantSource();
  one.offset.value = 1;
  const gainProbe = context.createGain();
  scheduleChange(gainProbe.gain, InitialGain, OpenGain, timeConstant);
  one.connect(gainProbe);
  gainProbe.connect(merger, 0, 2);

  merger.connect(context.destination);
  source.start(0);
  one.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 3 || rendered.length !== ClipFrames || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }

  return {
    timeConstantMs,
    sampleRate: rendered.sampleRate,
    eventFrame: Math.round(TransitionSeconds * rendered.sampleRate),
    step: rendered.getChannelData(0),
    smooth: rendered.getChannelData(1),
    gainTrace: rendered.getChannelData(2)
  };
}
