import { renderCrossfade } from "./crossfade-engine.js";

const relationSelect = document.getElementById("signal-relation");
const renderButton = document.getElementById("render-crossfade");
const stopButton = document.getElementById("stop-playback");
const crossfadeStatus = document.getElementById("crossfade-status");
const playbackStatus = document.getElementById("playback-status");
const comparisons = [
  { key: "linear", id: "linear", label: "等ゲイン", play: document.getElementById("play-linear") },
  { key: "equalPower", id: "equal-power", label: "等電力", play: document.getElementById("play-equal-power") }
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
  return result?.relation === relationSelect.value;
}

function updateControls() {
  const busy = rendering || playback !== null;
  relationSelect.disabled = !canRender || busy;
  renderButton.disabled = !canRender || busy;
  for (const { play } of comparisons) play.disabled = !canPlay || busy || !hasCurrentResult();
  stopButton.disabled = playback === null;
}

function updateRelation() {
  if (hasCurrentResult()) {
    setStatus(crossfadeStatus, "observed", "現在の音源で計算した結果を表示しています。");
  } else if (result) {
    setStatus(crossfadeStatus, "stale", "音源Bを変更しました。今のグラフは前回の計算結果です。");
  }
  updateControls();
}

function drawEnvelope(id, samples, windowFrames) {
  const points = [];
  const stepFrames = windowFrames / 2;
  for (let start = 0; start + windowFrames <= samples.length; start += stepFrames) {
    let squares = 0;
    for (let frame = start; frame < start + windowFrames; frame += 1) {
      squares += samples[frame] * samples[frame];
    }
    const rms = Math.sqrt(squares / windowFrames);
    const x = 44 + 362 * (start + stepFrames) / samples.length;
    const y = 134 - 110 * rms / 0.4;
    points.push(`${start === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  document.getElementById(`${id}-wave`).setAttribute("d", points.join(" "));
}

function formatDb(value) {
  if (Math.abs(value) < 0.005) return "0.00 dB";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)} dB`;
}

function showResult(rendered) {
  const { relation, sampleRate, midpointWindow } = rendered;
  const frequencyB = relation === "same" ? "400 Hz・同位相" : "600 Hz";
  document.getElementById("rendered-settings").textContent =
    `計算に使った音源はAが400 Hz、Bが${frequencyB}です。サンプルレートは${integerFormat.format(sampleRate)} Hzです。`;
  for (const { key, id, label } of comparisons) {
    const track = rendered[key];
    const db = formatDb(track.midpointDb);
    document.getElementById(`${id}-reference`).textContent = track.referenceRms.toFixed(4);
    document.getElementById(`${id}-midpoint`).textContent = track.midpointRms.toFixed(4);
    document.getElementById(`${id}-db`).textContent = db;
    document.getElementById(`${id}-peak`).textContent = track.peak.toFixed(4);
    drawEnvelope(id, track.samples, midpointWindow.endFrame - midpointWindow.startFrame);
    document.getElementById(`${id}-chart`).setAttribute("aria-label",
      `${label}の実効値の時間変化。切り替え前と比べた中点の変化は${db}。`);
  }
}

async function calculateCrossfade() {
  rendering = true;
  updateControls();
  setStatus(crossfadeStatus, "pending", "Web Audioで波形を計算しています。");
  try {
    const rendered = await renderCrossfade({ relation: relationSelect.value });
    showResult(rendered);
    result = rendered;
    setStatus(crossfadeStatus, "observed", "現在の音源で計算した結果を表示しています。");
    if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
  } catch (error) {
    setStatus(crossfadeStatus, "error", `計算できませんでした。 ${error.message}`);
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
  const { sampleRate } = result;
  const { samples } = result[key];
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
    setStatus(playbackStatus, "playing", `${label}の音を再生しています。`);
  } catch (error) {
    const message = `再生できませんでした。 ${error.message}`;
    if (session) endPlayback(session, "error", message);
    else setStatus(playbackStatus, "error", message);
  }
}

relationSelect.addEventListener("change", updateRelation);
renderButton.addEventListener("click", () => void calculateCrossfade());
for (const { key, label, play } of comparisons) {
  play.addEventListener("click", () => void playResult(key, label));
}
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => {
  if (playback) endPlayback(playback, "ready", "再生を停止しました。");
});

if (!canRender) {
  setStatus(crossfadeStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
}
if (!canPlay) {
  setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
}
updateControls();
