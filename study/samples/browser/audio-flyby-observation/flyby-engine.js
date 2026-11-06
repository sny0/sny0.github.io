const SampleRate = 48_000;
const DurationSec = 2;
const ClosestTimeSec = 1;
const ClipFrames = SampleRate * DurationSec;
const SoundSpeed = 343;
const SourceHz = 440;
const ReferenceDistance = 5;
const CurveIntervals = 200;
const ToneLevel = 0.14;
const FadeSeconds = 0.025;

export function pointAtTime(speed, clearance, timeSec) {
  const x = speed * (timeSec - ClosestTimeSec);
  const z = -clearance;
  const distance = Math.hypot(x, z);
  const radialSpeed = speed * (0 - x) / distance;
  const predictedHz = SourceHz * SoundSpeed / (SoundSpeed - radialSpeed);
  const gain = ReferenceDistance / distance;
  return { timeSec, x, z, distance, radialSpeed, predictedHz, gain };
}

function makeTone(context) {
  // Three seconds covers the full output window even at the maximum playback rate.
  const buffer = context.createBuffer(1, 3 * SampleRate, SampleRate);
  const samples = buffer.getChannelData(0);
  for (let frame = 0; frame < samples.length; frame += 1) {
    samples[frame] = Math.sin(2 * Math.PI * SourceHz * frame / SampleRate);
  }
  return buffer;
}

function createPanner(context, speed, clearance) {
  // The default listener is at the origin, facing −Z with +Y up.
  const panner = context.createPanner();
  panner.channelCount = 1;
  panner.channelCountMode = "explicit";
  panner.panningModel = "equalpower";
  panner.distanceModel = "inverse";
  panner.refDistance = ReferenceDistance;
  panner.rolloffFactor = 1;
  panner.coneInnerAngle = 360;
  panner.coneOuterAngle = 360;
  panner.coneOuterGain = 1;
  panner.positionX.setValueAtTime(-speed * ClosestTimeSec, 0);
  panner.positionX.linearRampToValueAtTime(speed * (DurationSec - ClosestTimeSec), DurationSec);
  panner.positionY.setValueAtTime(0, 0);
  panner.positionZ.setValueAtTime(-clearance, 0);
  return panner;
}

function measureFrequency(samples, firstFrame, endFrame) {
  let firstCrossing = 0;
  let lastCrossing = 0;
  let crossingCount = 0;
  for (let frame = firstFrame + 1; frame < endFrame; frame += 1) {
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
  return (crossingCount - 1) * SampleRate / (lastCrossing - firstCrossing);
}

function sumSquares(samples, firstFrame, endFrame) {
  let energy = 0;
  for (let frame = firstFrame; frame < endFrame; frame += 1) {
    energy += samples[frame] ** 2;
  }
  return energy;
}

function measureAt(point, dry, left, right) {
  const center = Math.round(point.timeSec * SampleRate);
  const halfWindow = Math.round(0.01 * SampleRate);
  const firstFrame = center - halfWindow;
  const endFrame = center + halfWindow;
  const dryEnergy = sumSquares(dry, firstFrame, endFrame);
  const leftGain = Math.sqrt(sumSquares(left, firstFrame, endFrame) / dryEnergy);
  const rightGain = Math.sqrt(sumSquares(right, firstFrame, endFrame) / dryEnergy);
  return {
    ...point,
    measuredHz: measureFrequency(dry, firstFrame, endFrame),
    leftGain,
    rightGain,
    totalGain: Math.hypot(leftGain, rightGain)
  };
}

export async function renderFlyby({ speed = 40, clearance = 10 } = {}) {
  if (![20, 40].includes(speed) || ![5, 10, 20].includes(clearance)) {
    throw new RangeError("音源の速さと最接近距離を選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const timeline = Array.from({ length: CurveIntervals + 1 }, (_, index) =>
    pointAtTime(speed, clearance, DurationSec * index / CurveIntervals)
  );
  const context = new OfflineAudioContext(3, ClipFrames, SampleRate);
  const source = context.createBufferSource();
  source.buffer = makeTone(context);
  const rates = Float32Array.from(timeline, point => point.predictedHz / SourceHz);
  source.playbackRate.setValueCurveAtTime(rates, 0, DurationSec);

  const level = context.createGain();
  level.gain.setValueAtTime(0, 0);
  level.gain.linearRampToValueAtTime(ToneLevel, FadeSeconds);
  level.gain.setValueAtTime(ToneLevel, DurationSec - FadeSeconds);
  level.gain.linearRampToValueAtTime(0, (ClipFrames - 1) / SampleRate);

  const panner = createPanner(context, speed, clearance);
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(3);
  source.connect(level);
  level.connect(panner);
  panner.connect(splitter);
  splitter.connect(merger, 0, 0);
  splitter.connect(merger, 1, 1);
  // Keep a separate mono probe after the pitch change, before panning and distance gain.
  level.connect(merger, 0, 2);
  merger.connect(context.destination);
  source.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 3 || rendered.length !== ClipFrames || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }
  const left = rendered.getChannelData(0);
  const right = rendered.getChannelData(1);
  const dry = rendered.getChannelData(2);
  const measurements = [0.5, 1, 1.5].map(timeSec =>
    measureAt(pointAtTime(speed, clearance, timeSec), dry, left, right)
  );

  return {
    speed,
    clearance,
    sampleRate: rendered.sampleRate,
    durationSec: DurationSec,
    closestTimeSec: ClosestTimeSec,
    timeline,
    measurements,
    left,
    right
  };
}
