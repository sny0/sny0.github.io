import { renderDoppler } from "./doppler-engine.js";

const directionSelect = document.getElementById("direction");
const speedSelect = document.getElementById("speed");
const renderButton = document.getElementById("render-doppler");
const dopplerStatus = document.getElementById("doppler-status");
const playbackStatus = document.getElementById("playback-status");
const referenceButton = document.getElementById("play-reference");
const shiftedButton = document.getElementById("play-shifted");
const stopButton = document.getElementById("stop-playback");
const canRender = typeof globalThis.OfflineAudioContext === "function";
const canPlay = typeof globalThis.AudioContext === "function";
let rendering = false;
let result = null;
let playback = null;

function setStatus(element, state, message) {
  element.dataset.state = state;
  element.textContent = message;
}

function hasCurrentResult() {
  return result?.direction === directionSelect.value && result.speed === Number(speedSelect.value);
}

function updateControls() {
  const busy = rendering || playback !== null;
  directionSelect.disabled = !canRender || busy;
  speedSelect.disabled = directionSelect.disabled;
  renderButton.disabled = directionSelect.disabled;
  referenceButton.disabled = !canPlay || busy || !hasCurrentResult();
  shiftedButton.disabled = referenceButton.disabled;
  stopButton.disabled = playback === null;
}

function markObserved() {
  setStatus(dopplerStatus, "observed", "現在の設定で測定した結果を表示しています。");
  if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
}

function updateSettings() {
  if (hasCurrentResult()) {
    markObserved();
  } else if (result) {
    setStatus(dopplerStatus, "stale", "設定を変更しました。図と数値は前回の測定結果です。");
    if (canPlay) setStatus(playbackStatus, "stale", "試聴するには現在の設定で測定してください。");
  }
  updateControls();
}

function drawMotion({ speed, signedSpeed }) {
  const motionChart = document.getElementById("motion-chart");
  const arrow = document.getElementById("motion-arrow");
  const label = document.getElementById("motion-label");
  if (speed === 0) {
    arrow.setAttribute("d", "");
    arrow.setAttribute("visibility", "hidden");
    label.textContent = "静止（0 m/s）";
    motionChart.setAttribute("aria-label", "音源は左、聞き手は右。どちらも静止しています。");
    return;
  }
  const approaching = signedSpeed > 0;
  arrow.setAttribute("d", approaching
    ? "M135 81H245 M234 72L245 81L234 90"
    : "M245 81H135 M146 72L135 81L146 90");
  arrow.setAttribute("visibility", "visible");
  const movement = approaching ? "近づく" : "遠ざかる";
  label.textContent = `${movement}（${speed} m/s）`;
  motionChart.setAttribute("aria-label",
    `音源は左、止まっている聞き手は右。音源が${speed} m/sで${movement}向きに移動します。`);
}

function waveformPath(samples, sampleRate, center) {
  const startFrame = Math.round(sampleRate * 0.1);
  const span = Math.round(sampleRate * 0.016);
  const points = [];
  for (let offset = 0; offset <= span; offset += 1) {
    const x = 52 + 376 * offset / span;
    const y = center - 32 * samples[startFrame + offset] / 0.15;
    const command = offset === 0 ? "M" : "L";
    points.push(`${command}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return points.join(" ");
}

function showResult(measured) {
  const { direction, speed, sampleRate, soundSpeed, playbackRate,
    predictedHz, referenceHz, measuredHz, reference, shifted } = measured;
  const movement = speed === 0 ? "音源は静止" : direction === "approach"
    ? `音源は${speed} m/sで近づく` : `音源は${speed} m/sで遠ざかる`;
  document.getElementById("rendered-settings").textContent =
    `音速は${soundSpeed} m/s、${movement}設定です。`;
  document.getElementById("reference-hz").textContent = `${referenceHz.toFixed(2)} Hz`;
  document.getElementById("predicted-hz").textContent = `${predictedHz.toFixed(2)} Hz`;
  document.getElementById("measured-hz").textContent = `${measuredHz.toFixed(2)} Hz`;
  document.getElementById("playback-rate").textContent = `${playbackRate.toFixed(4)} 倍`;
  drawMotion(measured);
  document.getElementById("reference-waveform").setAttribute("d", waveformPath(reference, sampleRate, 82));
  document.getElementById("shifted-waveform").setAttribute("d", waveformPath(shifted, sampleRate, 179));
  document.getElementById("waveform-chart").setAttribute("aria-label",
    `同じ16 msを描いた出力波形です。上の基準は${referenceHz.toFixed(2)} Hz、下の設定した動きは${measuredHz.toFixed(2)} Hzです。`);
}

async function measure() {
  rendering = true;
  updateControls();
  setStatus(dopplerStatus, "pending", "Web Audioで波形を測定しています。");
  try {
    const measured = await renderDoppler({ direction: directionSelect.value, speed: Number(speedSelect.value) });
    showResult(measured);
    result = measured;
    markObserved();
  } catch (error) {
    const previous = result ? "前回の測定結果を表示しています。" : "";
    setStatus(dopplerStatus, "error", `測定できませんでした。${previous}${error.message}`);
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

directionSelect.addEventListener("change", updateSettings);
speedSelect.addEventListener("change", updateSettings);
renderButton.addEventListener("click", () => void measure());
referenceButton.addEventListener("click", () => void playResult("reference", "基準の音"));
shiftedButton.addEventListener("click", () => void playResult("shifted", "設定した動きの音"));
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => endPlayback(playback, "ready", "再生を停止しました。"));

if (!canRender) setStatus(dopplerStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
if (!canPlay) setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
updateControls();
