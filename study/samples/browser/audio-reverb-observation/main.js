import { renderReverb } from "./reverb-engine.js";

const presetSelect = document.getElementById("reverb-preset");
const gainSelect = document.getElementById("wet-gain");
const renderButton = document.getElementById("render-reverb");
const reverbStatus = document.getElementById("reverb-status");
const playbackStatus = document.getElementById("playback-status");
const dryButton = document.getElementById("play-dry");
const mixedButton = document.getElementById("play-mixed");
const stopButton = document.getElementById("stop-playback");
const canRender = typeof globalThis.OfflineAudioContext === "function";
const canPlay = typeof globalThis.AudioContext === "function";
const timeFormat = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 });
const timeAxisMs = 1260;
const chartLeft = 40;
const chartWidth = 446;
let rendering = false;
let result = null;
let playback = null;

function setStatus(element, state, message) {
  element.dataset.state = state;
  element.textContent = message;
}

function hasCurrentResult() {
  return result?.preset === presetSelect.value && result.wetGain === Number(gainSelect.value);
}

function updateControls() {
  const busy = rendering || playback !== null;
  presetSelect.disabled = !canRender || busy;
  gainSelect.disabled = !canRender || busy;
  renderButton.disabled = !canRender || busy;
  dryButton.disabled = !canPlay || busy || !hasCurrentResult();
  mixedButton.disabled = dryButton.disabled;
  stopButton.disabled = playback === null;
}

function markObserved() {
  setStatus(reverbStatus, "observed", "現在の設定で計算した結果を表示しています。");
  if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
}

function updateSettings() {
  if (hasCurrentResult()) {
    markObserved();
  } else if (result) {
    setStatus(reverbStatus, "stale", "設定を変更しました。グラフと数値は前回の計算結果です。");
    if (canPlay) setStatus(playbackStatus, "stale", "試聴するには現在の設定で計算してください。");
  }
  updateControls();
}

function frameTime(frame, sampleRate) {
  return timeFormat.format(frame * 1000 / sampleRate);
}

function peakMagnitude(samples) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  return peak;
}

function wavePath(samples, sampleRate, centerY, halfHeight, scale) {
  const axisFrames = Math.round(timeAxisMs * sampleRate / 1000);
  const segments = [];
  for (let column = 0; column < chartWidth; column += 1) {
    const start = Math.floor(column * axisFrames / chartWidth);
    if (start >= samples.length) break;
    const end = Math.min(samples.length, Math.floor((column + 1) * axisFrames / chartWidth));
    let min = samples[start];
    let max = min;
    for (let frame = start + 1; frame < end; frame += 1) {
      min = Math.min(min, samples[frame]);
      max = Math.max(max, samples[frame]);
    }
    if (min === 0 && max === 0) continue;
    const x = chartLeft + column + 0.5;
    const top = (centerY - max * halfHeight / scale).toFixed(2);
    const bottom = (centerY - min * halfHeight / scale).toFixed(2);
    segments.push(`M${x} ${top}V${bottom}`);
  }
  return segments.join(" ");
}

function drawWaveforms({ impulse, dry, mixed, sampleRate, dryFrames }, reflectionTime, tailLabel) {
  const impulseScale = Math.max(0.6, Math.ceil(peakMagnitude(impulse) * 10) / 10);
  const outputScale = Math.max(0.3, Math.ceil(Math.max(peakMagnitude(dry), peakMagnitude(mixed)) * 10) / 10);
  document.getElementById("impulse-max").textContent = impulseScale;
  document.getElementById("impulse-min").textContent = `−${impulseScale}`;
  for (const label of document.querySelectorAll(".output-max")) label.textContent = outputScale;
  for (const label of document.querySelectorAll(".output-min")) label.textContent = `−${outputScale}`;

  document.getElementById("impulse-wave").setAttribute("d", wavePath(impulse, sampleRate, 100, 75, impulseScale));
  document.getElementById("dry-wave").setAttribute("d", wavePath(dry, sampleRate, 55, 30, outputScale));
  document.getElementById("mixed-wave").setAttribute("d", wavePath(mixed, sampleRate, 145, 30, outputScale));
  const dryEndX = chartLeft + chartWidth * (dryFrames * 1000 / sampleRate) / timeAxisMs;
  document.getElementById("dry-end").setAttribute("d", `M${dryEndX} 25V85 M${dryEndX} 115V175`);

  document.getElementById("impulse-chart").setAttribute("aria-label",
    `インパルス応答の波形。最初の反射は${reflectionTime} msです。`);
  document.getElementById("output-chart").setAttribute("aria-label",
    `元の音と響きを足した音の波形。元の打音が終わった後の実効値は${tailLabel}です。`);
}

function showResult(rendered) {
  const { preset, wetGain, impulse, firstReflectionFrame, dryFrames, mixed, sampleRate } = rendered;
  const reflectionTime = frameTime(firstReflectionFrame, sampleRate);
  let sumSquares = 0;
  for (let frame = dryFrames; frame < mixed.length; frame += 1) {
    sumSquares += mixed[frame] ** 2;
  }
  const rms = Math.sqrt(sumSquares / (mixed.length - dryFrames));
  const tailLabel = rms === 0 ? "無音" : `${(20 * Math.log10(rms)).toFixed(2).replace("-", "−")} dBFS`;
  const presetLabel = preset === "room" ? "小部屋" : "ホール";

  document.getElementById("rendered-settings").textContent =
    `${presetLabel}のインパルス応答を使い、元の音をそのまま、響きを ${wetGain} 倍して足しました。`;
  document.getElementById("impulse-duration").textContent = `${frameTime(impulse.length, sampleRate)} ms`;
  document.getElementById("first-reflection").textContent = `${reflectionTime} ms`;
  document.getElementById("output-duration").textContent = `${frameTime(mixed.length, sampleRate)} ms`;
  document.getElementById("tail-rms").textContent = tailLabel;
  document.getElementById("tail-summary").textContent =
    "実効値は元の打音が終わった後から、計算した出力の末尾までの値です。dBFSではデジタル信号の振幅1を基準にします。";
  drawWaveforms(rendered, reflectionTime, tailLabel);
}

async function calculate() {
  rendering = true;
  updateControls();
  setStatus(reverbStatus, "pending", "Web Audioで出力を計算しています。");
  try {
    const rendered = await renderReverb({ preset: presetSelect.value, wetGain: Number(gainSelect.value) });
    showResult(rendered);
    result = rendered;
    markObserved();
  } catch (error) {
    const previous = result ? "前回の計算結果を表示しています。 " : "";
    setStatus(reverbStatus, "error", `計算できませんでした。${previous}${error.message}`);
  } finally {
    rendering = false;
    updateControls();
  }
}

function endPlayback(session, state, message) {
  if (!session || playback !== session) return;
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

async function playResult(key, label) {
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

    const samples = key === "dry" ? result.dry.subarray(0, result.dryFrames) : result.mixed;
    const buffer = context.createBuffer(1, samples.length, result.sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    const volume = context.createGain();
    session.source = source;
    volume.gain.value = 0.25;
    source.buffer = buffer;
    source.connect(volume).connect(context.destination);
    source.onended = () => endPlayback(session, "ready", "再生が終わりました。");
    source.start();
    setStatus(playbackStatus, "playing", `${label}を再生しています。`);
  } catch (error) {
    const message = `再生できませんでした。${error.message}`;
    if (session) endPlayback(session, "error", message);
    else setStatus(playbackStatus, "error", message);
  }
}

presetSelect.addEventListener("change", updateSettings);
gainSelect.addEventListener("change", updateSettings);
renderButton.addEventListener("click", () => void calculate());
dryButton.addEventListener("click", () => void playResult("dry", "元の音"));
mixedButton.addEventListener("click", () => void playResult("mixed", "響きを足した音"));
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => endPlayback(playback, "ready", "再生を停止しました。"));

if (!canRender) setStatus(reverbStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
if (!canPlay) setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
updateControls();
