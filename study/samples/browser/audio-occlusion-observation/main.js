import { renderOcclusion } from "./occlusion-engine.js";

const locationSelect = document.getElementById("source-location");
const modeSelect = document.getElementById("processing-mode");
const measureButton = document.getElementById("render-occlusion");
const occlusionStatus = document.getElementById("occlusion-status");
const playbackStatus = document.getElementById("playback-status");
const dryButton = document.getElementById("play-dry");
const processedButton = document.getElementById("play-processed");
const stopButton = document.getElementById("stop-playback");
const canRender = typeof globalThis.OfflineAudioContext === "function";
const canPlay = typeof globalThis.AudioContext === "function";
const formatFrequency = new Intl.NumberFormat("ja-JP");
let measuring = false;
let result = null;
let playback = null;

function setStatus(element, state, message) {
  element.dataset.state = state;
  element.textContent = message;
}

function hasCurrentResult() {
  return result?.location === locationSelect.value && result.mode === modeSelect.value;
}

function updateControls() {
  const busy = measuring || playback !== null;
  locationSelect.disabled = !canRender || busy;
  modeSelect.disabled = !canRender || busy;
  measureButton.disabled = !canRender || busy;
  dryButton.disabled = !canPlay || busy || !hasCurrentResult();
  processedButton.disabled = dryButton.disabled;
  stopButton.disabled = playback === null;
}

function markObserved() {
  setStatus(occlusionStatus, "observed", "現在の設定で測定した結果を表示しています。");
  if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
}

function updateSettings() {
  if (hasCurrentResult()) {
    markObserved();
  } else if (result) {
    setStatus(occlusionStatus, "stale", "設定を変更しました。図と数値は前回の測定結果です。");
    if (canPlay) setStatus(playbackStatus, "stale", "試聴するには現在の設定で測定してください。");
  }
  updateControls();
}

function drawPath({ source, blocked }) {
  const originX = 217;
  const originY = 224;
  const unitsToPixels = 29;
  const x = originX + unitsToPixels * source.x;
  const y = originY + unitsToPixels * source.z;
  const line = document.getElementById("source-line");
  line.setAttribute("d", `M${originX} ${originY}L${x} ${y}`);
  line.dataset.blocked = String(blocked);

  const point = document.getElementById("source-point");
  point.setAttribute("cx", x);
  point.setAttribute("cy", y);
  point.setAttribute("visibility", "visible");
  const sourceLabel = document.getElementById("source-label");
  sourceLabel.setAttribute("x", x + 12);
  sourceLabel.setAttribute("y", y + 5);
  sourceLabel.setAttribute("visibility", "visible");

  const hit = document.getElementById("wall-hit");
  if (blocked) {
    const fraction = -2.5 / source.z;
    hit.setAttribute("cx", originX + unitsToPixels * fraction * source.x);
  }
  hit.setAttribute("visibility", blocked ? "visible" : "hidden");
  const pathLabel = blocked ? "直接の経路が壁と交わります。" : "直接の経路が壁の横を通ります。";
  document.getElementById("path-state").textContent = pathLabel;
  document.getElementById("path-chart").setAttribute("aria-label", `聞き手と音源を上から見た図。${pathLabel}`);
}

function plotX(frequencyHz) {
  return 58 + 380 * Math.log(frequencyHz / 100) / Math.log(8000 / 100);
}

function plotY(db) {
  return 32 - 192 * Math.max(-60, Math.min(0, db)) / 60;
}

function formatDb(value) {
  const rounded = Number(value.toFixed(2));
  return `${rounded.toFixed(2).replace("-", "−")} dB`;
}

function drawResponse({ points, lowDb, highDb }) {
  const path = points.map(({ frequencyHz, db }, index) => {
    return `${index ? "L" : "M"}${plotX(frequencyHz).toFixed(2)} ${plotY(db).toFixed(2)}`;
  }).join(" ");
  document.getElementById("response-curve").setAttribute("d", path);

  const lowMarker = document.getElementById("low-marker");
  const highMarker = document.getElementById("high-marker");
  lowMarker.setAttribute("cy", plotY(lowDb));
  highMarker.setAttribute("cy", plotY(highDb));
  lowMarker.setAttribute("visibility", "visible");
  highMarker.setAttribute("visibility", "visible");

  const lowLabel = formatDb(lowDb);
  const highLabel = formatDb(highDb);
  document.getElementById("low-db").textContent = lowLabel;
  document.getElementById("high-db").textContent = highLabel;
  document.getElementById("response-chart").setAttribute("aria-label",
    `処理前に対する振幅の変化。250 Hzで${lowLabel}、4,000 Hzで${highLabel}。`);
}

function showResult(measured) {
  const locationLabel = measured.location === "blocked" ? "壁の向こう" : "壁の横";
  const modeLabel = measured.mode === "gain" ? "ゲインのみ" : "ゲイン＋ローパス";
  document.getElementById("rendered-settings").textContent = `音源は「${locationLabel}」、処理の設定は「${modeLabel}」です。`;
  document.getElementById("path-gain").textContent = `${measured.gain.toFixed(3)} 倍`;
  document.getElementById("cutoff-frequency").textContent = measured.cutoffHz === null
    ? "なし"
    : `${formatFrequency.format(measured.cutoffHz)} Hz`;
  drawPath(measured);
  drawResponse(measured);
}

async function measure() {
  measuring = true;
  updateControls();
  setStatus(occlusionStatus, "pending", "Web Audioで出力を計算しています。");
  try {
    const measured = await renderOcclusion({ location: locationSelect.value, mode: modeSelect.value });
    showResult(measured);
    result = measured;
    markObserved();
  } catch (error) {
    const previous = result ? "前回の測定結果を表示しています。" : "";
    setStatus(occlusionStatus, "error", `測定できませんでした。${previous}${error.message}`);
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

    const samples = result[key];
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

locationSelect.addEventListener("change", updateSettings);
modeSelect.addEventListener("change", updateSettings);
measureButton.addEventListener("click", () => void measure());
dryButton.addEventListener("click", () => void playResult("dry", "処理前の音"));
processedButton.addEventListener("click", () => void playResult("processed", "処理後の音"));
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => endPlayback(playback, "ready", "再生を停止しました。"));

if (!canRender) setStatus(occlusionStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
if (!canPlay) setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
updateControls();
