import { renderMix } from "./mix-engine.js";

const settings = [
  { key: "gainA", input: document.getElementById("gain-a") },
  { key: "gainB", input: document.getElementById("gain-b") },
  { key: "masterGain", input: document.getElementById("master-gain") }
];
const renderButton = document.getElementById("render-mix");
const overPreset = document.getElementById("preset-over");
const headroomPreset = document.getElementById("preset-headroom");
const playButton = document.getElementById("play-mix");
const stopButton = document.getElementById("stop-playback");
const mixStatus = document.getElementById("mix-status");
const playbackStatus = document.getElementById("playback-status");
const canRender = typeof globalThis.OfflineAudioContext === "function";
const canPlay = typeof globalThis.AudioContext === "function";
const integerFormat = new Intl.NumberFormat("ja-JP");
let rendering = false;
let result = null;
let playback = null;

function setStatus(element, state, message) {
  element.dataset.state = state;
  element.textContent = message;
}

function readSettings() {
  return Object.fromEntries(settings.map(({ key, input }) => [key, input.valueAsNumber]));
}

function hasCurrentResult() {
  return result !== null && settings.every(({ key, input }) => result.gains[key] === input.valueAsNumber);
}

function updateControls() {
  const busy = rendering || playback !== null;
  for (const { input } of settings) input.disabled = busy;
  overPreset.disabled = busy;
  headroomPreset.disabled = busy;
  renderButton.disabled = !canRender || busy;
  playButton.disabled = !canPlay || busy || !hasCurrentResult();
  stopButton.disabled = playback === null;
}

function updateSettings() {
  for (const { input } of settings) {
    document.getElementById(`${input.id}-value`).textContent = input.valueAsNumber.toFixed(2);
  }
  if (canRender) {
    if (hasCurrentResult()) {
      setStatus(mixStatus, "observed", "現在の設定で計算した波形を表示しています。");
    } else if (result) {
      setStatus(mixStatus, "stale", "ゲインを変更しました。今の波形は前回の計算結果です。");
    } else {
      setStatus(mixStatus, "ready", "「ミックスを計算」で波形を表示します。");
    }
  }
  updateControls();
}

function selectPreset(masterGain) {
  const gains = { gainA: 1, gainB: 1, masterGain };
  for (const { key, input } of settings) input.value = gains[key];
  updateSettings();
}

function waveformPath(samples, sampleRate) {
  const frameCount = Math.min(Math.round(sampleRate * 0.005), samples.length);
  const points = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    const x = 36 + 350 * frame / frameCount;
    const y = 80 - 46 * samples[frame];
    points.push(`${frame === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ");
}

function showResult({ gains, raw, clipped, rawPeak, clippedPeak, overRangeCount, sampleRate, frameCount }) {
  document.getElementById("rendered-settings").textContent =
    `計算に使ったゲイン　A ${gains.gainA.toFixed(2)} ／ B ${gains.gainB.toFixed(2)} ／ マスター ${gains.masterGain.toFixed(2)}`;
  document.getElementById("raw-peak").textContent = rawPeak.toFixed(2);
  document.getElementById("clipped-peak").textContent = clippedPeak.toFixed(2);
  document.getElementById("over-range-count").textContent =
    `${integerFormat.format(overRangeCount)} / ${integerFormat.format(frameCount)}`;
  document.getElementById("raw-wave").setAttribute("d", waveformPath(raw, sampleRate));
  document.getElementById("clipped-wave").setAttribute("d", waveformPath(clipped, sampleRate));
  document.getElementById("raw-chart").setAttribute("aria-label",
    `処理前の波形。ピークは ${rawPeak.toFixed(2)}。絶対値が1を超えたフレームは ${integerFormat.format(overRangeCount)}。`);
  document.getElementById("clipped-chart").setAttribute("aria-label",
    `クリップ後の波形。ピークは ${clippedPeak.toFixed(2)}。`);
}

async function calculateMix() {
  rendering = true;
  const gains = readSettings();
  updateControls();
  setStatus(mixStatus, "pending", "Web Audioで計算しています。");
  try {
    result = { ...await renderMix(gains), gains };
    showResult(result);
    setStatus(mixStatus, "observed", "現在の設定で計算した波形を表示しています。");
    if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
  } catch (error) {
    setStatus(mixStatus, "error", `計算できませんでした。 ${error.message}`);
  } finally {
    rendering = false;
    updateControls();
  }
}

function endPlayback(session, state, message) {
  if (playback !== session) return;
  playback = null;
  clearTimeout(session.timeout);
  if (session.source) {
    session.source.onended = null;
    session.source.disconnect();
  }
  void session.context.close().catch(() => {});
  setStatus(playbackStatus, state, message);
  updateControls();
}

async function playResult() {
  let session;
  try {
    const context = new AudioContext();
    session = { context, source: null, timeout: null };
    playback = session;
    updateControls();
    setStatus(playbackStatus, "pending", "再生を準備しています。");
    session.timeout = setTimeout(() => {
      endPlayback(session, "error", "音を出せませんでした。再生を選び直せます。");
    }, 5000);
    await context.resume();
    if (playback !== session) return;
    clearTimeout(session.timeout);
    const buffer = context.createBuffer(1, result.clipped.length, result.sampleRate);
    buffer.copyToChannel(result.clipped, 0);
    const source = context.createBufferSource();
    const volume = context.createGain();
    session.source = source;
    volume.gain.value = 0.12;
    source.buffer = buffer;
    source.connect(volume).connect(context.destination);
    source.onended = () => endPlayback(session, "ready", "再生が終わりました。");
    source.start();
    setStatus(playbackStatus, "playing", "処理後の音を再生しています。");
  } catch (error) {
    const message = `再生できませんでした。 ${error.message}`;
    if (session) endPlayback(session, "error", message);
    else setStatus(playbackStatus, "error", message);
  }
}

for (const { input } of settings) input.addEventListener("input", updateSettings);
overPreset.addEventListener("click", () => selectPreset(1));
headroomPreset.addEventListener("click", () => selectPreset(0.5));
renderButton.addEventListener("click", () => void calculateMix());
playButton.addEventListener("click", () => void playResult());
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => {
  if (playback) endPlayback(playback, "ready", "再生を停止しました。");
});

if (!canRender) {
  setStatus(mixStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
}
if (!canPlay) {
  setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
}
updateControls();
