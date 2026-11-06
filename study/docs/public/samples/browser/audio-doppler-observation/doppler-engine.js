const SampleRate = 48_000;
const ClipSeconds = 0.8;
const ClipFrames = Math.round(ClipSeconds * SampleRate);
const FadeSeconds = 0.02;
const ToneLevel = 0.12;
const SoundSpeed = 343;
const SourceHz = 440;
const Speeds = [0, 20, 40, 60];
const Directions = ["approach", "recede"];

function makeTone(context) {
  // At the fastest rate, 0.8 seconds reads about 0.97 seconds of the source.
  const buffer = context.createBuffer(1, SampleRate, SampleRate);
  const samples = buffer.getChannelData(0);
  for (let frame = 0; frame < samples.length; frame += 1) {
    samples[frame] = Math.sin(2 * Math.PI * SourceHz * frame / SampleRate);
  }
  return buffer;
}

function startTone(context, buffer, rate, merger, channel) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(rate, 0);
  source.connect(merger, 0, channel);
  source.start(0);
}

function measureFrequency(samples, sampleRate) {
  // Measure the stable middle of the tone, away from both output fades.
  const marginFrames = Math.round(0.1 * sampleRate);
  let firstCrossing = 0;
  let lastCrossing = 0;
  let crossingCount = 0;
  for (let frame = marginFrames + 1; frame < samples.length - marginFrames; frame += 1) {
    const previous = samples[frame - 1];
    const current = samples[frame];
    if (previous <= 0 && current > 0) {
      const crossing = frame - 1 - previous / (current - previous);
      if (crossingCount === 0) firstCrossing = crossing;
      lastCrossing = crossing;
      crossingCount += 1;
    }
  }
  if (crossingCount < 2) {
    throw new Error("出力波形の周期を測れませんでした。");
  }
  return (crossingCount - 1) * sampleRate / (lastCrossing - firstCrossing);
}

export async function renderDoppler({ direction = "approach", speed = 40 } = {}) {
  if (!Directions.includes(direction) || !Speeds.includes(speed)) {
    throw new RangeError("音源の向きと速さを選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const signedSpeed = direction === "approach" || speed === 0 ? speed : -speed;
  const playbackRate = SoundSpeed / (SoundSpeed - signedSpeed);
  const context = new OfflineAudioContext(2, ClipFrames, SampleRate);
  const buffer = makeTone(context);
  const merger = context.createChannelMerger(2);
  const level = context.createGain();
  level.gain.setValueAtTime(0, 0);
  level.gain.linearRampToValueAtTime(ToneLevel, FadeSeconds);
  level.gain.setValueAtTime(ToneLevel, ClipSeconds - FadeSeconds);
  level.gain.linearRampToValueAtTime(0, (ClipFrames - 1) / SampleRate);
  merger.connect(level);
  level.connect(context.destination);
  startTone(context, buffer, 1, merger, 0);
  startTone(context, buffer, playbackRate, merger, 1);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 2 || rendered.length !== ClipFrames || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }
  const reference = rendered.getChannelData(0);
  const shifted = rendered.getChannelData(1);
  return {
    direction,
    speed,
    signedSpeed,
    sampleRate: rendered.sampleRate,
    soundSpeed: SoundSpeed,
    sourceHz: SourceHz,
    playbackRate,
    predictedHz: SourceHz * playbackRate,
    referenceHz: measureFrequency(reference, rendered.sampleRate),
    measuredHz: measureFrequency(shifted, rendered.sampleRate),
    reference,
    shifted
  };
}
