const SampleRate = 48_000;
const ImpulseFrames = 1_024;
const NoiseFrames = SampleRate;
const NoisePeak = 0.35;
const EdgeFadeFrames = 480;

function createSource(context, frameCount) {
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, frameCount, SampleRate);
  return source;
}

function createNoise(context) {
  const source = createSource(context, NoiseFrames);
  const samples = source.buffer.getChannelData(0);
  let seed = 12345;
  for (let frame = 0; frame < NoiseFrames; frame += 1) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const noise = 2 * seed / 2 ** 32 - 1;
    const edgeGain = Math.min(1, frame / EdgeFadeFrames, (NoiseFrames - 1 - frame) / EdgeFadeFrames);
    samples[frame] = NoisePeak * edgeGain * noise;
  }
  return source;
}

function connectComb(context, source, merger, channel, delayMs, relativeGain) {
  const delay = context.createDelay();
  delay.delayTime.setValueAtTime(delayMs / 1000, 0);
  const direct = context.createGain();
  direct.gain.setValueAtTime(1 / (1 + relativeGain), 0);
  const delayed = context.createGain();
  delayed.gain.setValueAtTime(relativeGain / (1 + relativeGain), 0);

  source.connect(direct);
  direct.connect(merger, 0, channel);
  source.connect(delay);
  delay.connect(delayed);
  delayed.connect(merger, 0, channel);
}

function measureResponse(impulse, frequencyHz) {
  const radiansPerFrame = 2 * Math.PI * frequencyHz / SampleRate;
  let real = 0;
  let imaginary = 0;
  for (let frame = 0; frame < impulse.length; frame += 1) {
    const sample = impulse[frame];
    if (sample === 0) continue;
    real += sample * Math.cos(radiansPerFrame * frame);
    imaginary -= sample * Math.sin(radiansPerFrame * frame);
  }
  const magnitude = Math.hypot(real, imaginary);
  return { frequencyHz, magnitude, db: 20 * Math.log10(magnitude) };
}

export async function renderComb({ delayMs = 2, relativeGain = 1 } = {}) {
  if (![1, 2, 5, 10].includes(delayMs) || ![0, 0.5, 1].includes(relativeGain)) {
    throw new RangeError("遅延時間と遅延側の相対ゲインを選んでください。");
  }
  if (typeof OfflineAudioContext !== "function") {
    throw new Error("このブラウザではオフライン音声処理を利用できません。");
  }

  const delayFrame = delayMs * SampleRate / 1000;
  const frameCount = NoiseFrames + delayFrame;
  const context = new OfflineAudioContext(3, frameCount, SampleRate);
  const impulseSource = createSource(context, 1);
  impulseSource.buffer.getChannelData(0)[0] = 1;
  const noiseSource = createNoise(context);
  const merger = context.createChannelMerger(3);

  // Capture the impulse response, dry noise, and processed noise separately.
  connectComb(context, impulseSource, merger, 0, delayMs, relativeGain);
  noiseSource.connect(merger, 0, 1);
  connectComb(context, noiseSource, merger, 2, delayMs, relativeGain);
  merger.connect(context.destination);
  impulseSource.start(0);
  noiseSource.start(0);

  const rendered = await context.startRendering();
  if (rendered.numberOfChannels !== 3 || rendered.length !== frameCount || rendered.sampleRate !== SampleRate) {
    throw new Error("レンダリングした音声の形式が実験の設定と一致しませんでした。");
  }

  const impulse = rendered.getChannelData(0).subarray(0, ImpulseFrames);
  const response = [];
  for (let frequencyHz = 0; frequencyHz <= 2_000; frequencyHz += 5) {
    response.push(measureResponse(impulse, frequencyHz));
  }
  const firstDipHz = 1000 / (2 * delayMs);
  const firstDip = measureResponse(impulse, firstDipHz);

  return {
    delayMs,
    relativeGain,
    sampleRate: rendered.sampleRate,
    delayFrame,
    dryTap: impulse[0],
    delayedTap: impulse[delayFrame],
    firstDipHz,
    firstDipMagnitude: firstDip.magnitude,
    firstDipDb: firstDip.db,
    response,
    dry: rendered.getChannelData(1),
    mixed: rendered.getChannelData(2)
  };
}
