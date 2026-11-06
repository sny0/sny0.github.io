import { renderFade } from "./fade-engine.js";

const durationSelect = document.getElementById("fade-duration");
const renderButton = document.getElementById("render-fade");
const stopButton = document.getElementById("stop-playback");
const fadeStatus = document.getElementById("fade-status");
const playbackStatus = document.getElementById("playback-status");
const comparisons = [
  { key: "abrupt", label: "瞬時に止める音", play: document.getElementById("play-abrupt") },
  { key: "faded", label: "フェードで止める音", play: document.getElementById("play-faded") }
];
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

function hasCurrentResult() {
  return result?.fadeMs === Number(durationSelect.value);
}

function updateControls() {
  const busy = rendering || playback !== null;
  durationSelect.disabled = !canRender || busy;
  renderButton.disabled = !canRender || busy;
  for (const { play } of comparisons) play.disabled = !canPlay || busy || !hasCurrentResult();
  stopButton.disabled = playback === null;
}

function updateDuration() {
  if (hasCurrentResult()) {
    setStatus(fadeStatus, "observed", "現在の設定で計算した波形を表示しています。");
  } else if (result) {
    setStatus(fadeStatus, "stale", "フェード時間を変更しました。今の波形は前回の計算結果です。");
  }
  updateControls();
}

function setMarker(chart, type, position, time) {
  const line = chart.querySelector(`.${type}-marker`);
  line.setAttribute("x1", position);
  line.setAttribute("x2", position);
  line.removeAttribute("visibility");
  const label = chart.querySelector(`.${type}-time`);
  label.setAttribute("x", position);
  label.textContent = time;
}

function drawWaveform(key, samples, { sampleRate, stopFrame, fadeEndFrame }) {
  const chart = document.getElementById(`${key}-chart`);
  const marginFrames = Math.round(sampleRate * 0.005);
  const first = Math.max(0, stopFrame - marginFrames);
  const last = Math.min(samples.length - 1, fadeEndFrame + marginFrames);
  const timeMs = frame => Math.round(1000 * frame / sampleRate);
  const x = frame => 44 + 362 * (frame - first) / (last - first);
  const points = [];
  for (let frame = first; frame <= last; frame += 1) {
    const y = 79 - 55 * samples[frame] / 0.4;
    points.push(`${frame === first ? "M" : "L"}${x(frame).toFixed(2)} ${y.toFixed(2)}`);
  }
  document.getElementById(`${key}-wave`).setAttribute("d", points.join(" "));
  setMarker(chart, "start", x(stopFrame), timeMs(stopFrame));
  setMarker(chart, "end", x(fadeEndFrame), timeMs(fadeEndFrame));
  chart.querySelector(".first-time").textContent = timeMs(first);
  chart.querySelector(".last-time").textContent = timeMs(last);
}

function showResult(rendered) {
  const { sampleRate, stopFrame, fadeEndFrame, fadeMs } = rendered;
  document.getElementById("rendered-settings").textContent =
    `計算に使ったフェード時間 ${fadeMs} ms ／ サンプルレート ${integerFormat.format(sampleRate)} Hz`;
  document.getElementById("edge-frames").textContent =
    `${integerFormat.format(stopFrame - 1)} → ${integerFormat.format(stopFrame)}`;
  document.getElementById("fade-end").textContent =
    `${Math.round(1000 * fadeEndFrame / sampleRate)} ms（フレーム ${integerFormat.format(fadeEndFrame)}）`;
  for (const { key, label } of comparisons) {
    const samples = rendered[key];
    const before = samples[stopFrame - 1].toFixed(6);
    const after = samples[stopFrame].toFixed(6);
    const jump = rendered[`${key}Jump`].toFixed(6);
    document.getElementById(`${key}-before`).textContent = before;
    document.getElementById(`${key}-after`).textContent = after;
    document.getElementById(`${key}-jump`).textContent = jump;
    drawWaveform(key, samples, rendered);
    document.getElementById(`${key}-chart`).setAttribute("aria-label",
      `${label}の波形。ミュート開始直前は ${before}、開始時は ${after}。差の絶対値は ${jump}。`);
  }
}

async function calculateFade() {
  rendering = true;
  updateControls();
  setStatus(fadeStatus, "pending", "Web Audioで波形を計算しています。");
  try {
    const rendered = await renderFade({ fadeMs: Number(durationSelect.value) });
    showResult(rendered);
    result = rendered;
    setStatus(fadeStatus, "observed", "現在の設定で計算した波形を表示しています。");
    if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
  } catch (error) {
    setStatus(fadeStatus, "error", `計算できませんでした。 ${error.message}`);
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

async function playResult(key, label) {
  const samples = result[key];
  const { sampleRate } = result;
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
    const buffer = context.createBuffer(1, samples.length, sampleRate);
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
    const message = `再生できませんでした。 ${error.message}`;
    if (session) endPlayback(session, "error", message);
    else setStatus(playbackStatus, "error", message);
  }
}

durationSelect.addEventListener("change", updateDuration);
renderButton.addEventListener("click", () => void calculateFade());
for (const { key, label, play } of comparisons) {
  play.addEventListener("click", () => void playResult(key, label));
}
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => {
  if (playback) endPlayback(playback, "ready", "再生を停止しました。");
});

if (!canRender) {
  setStatus(fadeStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
}
if (!canPlay) {
  setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
}
updateControls();
