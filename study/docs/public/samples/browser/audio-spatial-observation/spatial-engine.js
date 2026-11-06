const SampleRate = 48_000;
const ClipFrames = SampleRate / 2;
const Angles = [-90, -45, 0, 45, 90];
const Distances = [0.5, 1, 2, 4, 8];

function makeProbe() {
  const samples = new Float32Array(ClipFrames);
  // Two short, gently shaped chirps make the stereo position easy to compare.
  for (const [offset, duration, frequency] of [[0.035, 0.14, 560], [0.24, 0.18, 820]]) {
    const firstFrame = Math.round(offset * SampleRate);
    const frames = Math.round(duration * SampleRate);
    for (let frame = 0; frame < frames; frame += 1) {
      const seconds = frame / SampleRate;
      const progress = frame / (frames - 1);
      const envelope = Math.sin(Math.PI * progress) ** 2;
      const phase = 2 * Math.PI * (frequency * seconds - 460 * seconds ** 2);
      samples[firstFrame + frame] = envelope * (0.27 * Math.sin(phase) + 0.06 * Math.sin(2.1 * phase));
    }
  }
  return samples;
}

function measureRms(samples) {
  let squares = 0;
  for (const sample of samples) squares += sample * sample;
  return Math.sqrt(squares / samples.length);
}

export async function renderSpatial({ angle = 0, distance = 1 } = {}) {
  if (!Angles.includes(angle) || !Distances.includes(distance)) {
    throw new RangeError("方位角と距離を選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const context = new OfflineAudioContext(2, ClipFrames, SampleRate);
  const listener = context.listener;
  listener.positionX.setValueAtTime(0, 0);
  listener.positionY.setValueAtTime(0, 0);
  listener.positionZ.setValueAtTime(0, 0);
  listener.forwardX.setValueAtTime(0, 0);
  listener.forwardY.setValueAtTime(0, 0);
  listener.forwardZ.setValueAtTime(-1, 0);
  listener.upX.setValueAtTime(0, 0);
  listener.upY.setValueAtTime(1, 0);
  listener.upZ.setValueAtTime(0, 0);

  const radians = angle * Math.PI / 180;
  const position = { x: distance * Math.sin(radians), y: 0, z: -distance * Math.cos(radians) };
  const panner = context.createPanner();
  panner.channelCount = 1;
  panner.channelCountMode = "explicit";
  panner.panningModel = "equalpower";
  panner.distanceModel = "inverse";
  panner.refDistance = 1;
  panner.rolloffFactor = 1;
  panner.coneInnerAngle = 360;
  panner.coneOuterAngle = 360;
  panner.coneOuterGain = 1;
  panner.positionX.setValueAtTime(position.x, 0);
  panner.positionY.setValueAtTime(position.y, 0);
  panner.positionZ.setValueAtTime(position.z, 0);

  const input = makeProbe();
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, input.length, SampleRate);
  source.buffer.copyToChannel(input, 0);
  source.connect(panner);
  panner.connect(context.destination);
  source.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 2 || rendered.length !== ClipFrames || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }

  const left = rendered.getChannelData(0);
  const right = rendered.getChannelData(1);
  const inputRms = measureRms(input);
  const leftRms = measureRms(left);
  const rightRms = measureRms(right);
  const leftGain = leftRms / inputRms;
  const rightGain = rightRms / inputRms;
  const totalGain = Math.hypot(leftGain, rightGain);
  return {
    angle,
    distance,
    sampleRate: rendered.sampleRate,
    position,
    inputRms,
    leftRms,
    rightRms,
    leftGain,
    rightGain,
    totalGain,
    totalDb: 20 * Math.log10(totalGain),
    left,
    right
  };
}
