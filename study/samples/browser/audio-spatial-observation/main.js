import { renderSpatial } from "./spatial-engine.js";

const angleSelect = document.getElementById("source-angle");
const distanceSelect = document.getElementById("source-distance");
const measureButton = document.getElementById("render-spatial");
const spatialStatus = document.getElementById("spatial-status");
const playbackStatus = document.getElementById("playback-status");
const playButton = document.getElementById("play-spatial");
const stopButton = document.getElementById("stop-playback");
const canRender = typeof globalThis.OfflineAudioContext === "function";
const canPlay = typeof globalThis.AudioContext === "function";
let measuring = false;
let result = null;
let playback = null;

function setStatus(element, state, message) {
  element.dataset.state = state;
  element.textContent = message;
}

function hasCurrentResult() {
  return result?.angle === Number(angleSelect.value) && result.distance === Number(distanceSelect.value);
}

function updateControls() {
  const busy = measuring || playback !== null;
  angleSelect.disabled = !canRender || busy;
  distanceSelect.disabled = !canRender || busy;
  measureButton.disabled = !canRender || busy;
  playButton.disabled = !canPlay || busy || !hasCurrentResult();
  stopButton.disabled = playback === null;
}

function markObserved() {
  setStatus(spatialStatus, "observed", "現在の位置で測定した結果を表示しています。");
  if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
}

function updateSettings() {
  if (hasCurrentResult()) {
    markObserved();
  } else if (result) {
    setStatus(spatialStatus, "stale", "設定を変更しました。図と数値は前回の測定結果です。");
    if (canPlay) setStatus(playbackStatus, "stale", "試聴するには現在の位置で測定してください。");
  }
  updateControls();
}

function decimal(value, places) {
  const rounded = Number(value.toFixed(places));
  return rounded.toFixed(places).replace("-", "−");
}

function showResult({ angle, distance, position, leftGain, rightGain, totalGain, totalDb }) {
  const angleLabel = (angle > 0 ? "+" : "") + String(angle).replace("-", "−") + "°";
  document.getElementById("rendered-settings").textContent = `方位角 ${angleLabel}、距離 ${distance} で測定しました。`;
  const positionLabel = `x = ${decimal(position.x, 3)}、y = ${decimal(position.y, 3)}、z = ${decimal(position.z, 3)}`;
  document.getElementById("source-position").textContent = `音源の座標  ${positionLabel}`;

  const originX = 220;
  const originY = 214;
  const unitsToPixels = 20;
  const x = originX + unitsToPixels * position.x;
  const y = originY + unitsToPixels * position.z;
  const point = document.getElementById("source-point");
  point.setAttribute("cx", x);
  point.setAttribute("cy", y);
  point.setAttribute("visibility", "visible");
  document.getElementById("source-line").setAttribute("d", `M${originX} ${originY}L${x} ${y}`);
  document.getElementById("position-chart").setAttribute("aria-label",
    `上から見た聞き手と音源。方位角 ${angleLabel}、距離 ${distance}。音源の座標は ${positionLabel}。`);

  const leftLabel = decimal(leftGain, 3);
  const rightLabel = decimal(rightGain, 3);
  document.getElementById("left-gain").textContent = leftLabel;
  document.getElementById("right-gain").textContent = rightLabel;
  document.getElementById("total-gain").textContent = decimal(totalGain, 3);
  document.getElementById("total-db").textContent = Number.isFinite(totalDb) ? `${decimal(totalDb, 2)} dB` : "−∞ dB";
  const maxBarWidth = 304;
  document.getElementById("left-bar").setAttribute("width", maxBarWidth * Math.min(1, leftGain));
  document.getElementById("right-bar").setAttribute("width", maxBarWidth * Math.min(1, rightGain));
  document.getElementById("gain-chart").setAttribute("aria-label",
    `左右の出力の実効値を入力の実効値と比較した比。左 ${leftLabel}、右 ${rightLabel}。`);
}

async function measure() {
  measuring = true;
  updateControls();
  setStatus(spatialStatus, "pending", "Web Audioで左右の出力を計算しています。");
  try {
    const measured = await renderSpatial({ angle: Number(angleSelect.value), distance: Number(distanceSelect.value) });
    showResult(measured);
    result = measured;
    markObserved();
  } catch (error) {
    const previous = result ? "前回の測定結果を表示しています。" : "";
    setStatus(spatialStatus, "error", `測定できませんでした。${previous}${error.message}`);
  } finally {
    measuring = false;
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

    const { left, right, sampleRate } = result;
    const buffer = context.createBuffer(2, left.length, sampleRate);
    buffer.copyToChannel(left, 0);
    buffer.copyToChannel(right, 1);
    const source = context.createBufferSource();
    const volume = context.createGain();
    session.source = source;
    volume.gain.value = 0.25;
    source.buffer = buffer;
    source.connect(volume).connect(context.destination);
    source.onended = () => endPlayback(session, "ready", "再生が終わりました。");
    source.start();
    setStatus(playbackStatus, "playing", "測定した音を再生しています。");
  } catch (error) {
    const message = `再生できませんでした。${error.message}`;
    if (session) endPlayback(session, "error", message);
    else setStatus(playbackStatus, "error", message);
  }
}

angleSelect.addEventListener("change", updateSettings);
distanceSelect.addEventListener("change", updateSettings);
measureButton.addEventListener("click", () => void measure());
playButton.addEventListener("click", () => void playResult());
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => endPlayback(playback, "ready", "再生を停止しました。"));

if (!canRender) setStatus(spatialStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
if (!canPlay) setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
updateControls();
