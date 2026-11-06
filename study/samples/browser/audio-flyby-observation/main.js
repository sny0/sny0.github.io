import { renderFlyby } from "./flyby-engine.js";

const speedSelect = document.getElementById("speed");
const clearanceSelect = document.getElementById("clearance");
const renderButton = document.getElementById("render-flyby");
const renderStatus = document.getElementById("flyby-status");
const playButton = document.getElementById("play-flyby");
const stopButton = document.getElementById("stop-playback");
const playbackStatus = document.getElementById("playback-status");
const playhead = document.getElementById("playhead");
const motionChart = document.getElementById("motion-chart");
const timeChart = document.getElementById("time-chart");
const sourceDot = document.getElementById("source-dot");
const distanceLine = document.getElementById("distance-line");
const cursor = document.getElementById("time-cursor");
const pointTime = document.getElementById("point-time");
const pointDistance = document.getElementById("point-distance");
const pointRadial = document.getElementById("point-radial");
const pointHz = document.getElementById("point-hz");
const pointGain = document.getElementById("point-gain");

const canRender = typeof globalThis.OfflineAudioContext === "function";
const canPlay = typeof globalThis.AudioContext === "function";
const listenerX = 230;
const listenerY = 160;
const pixelsPerMeter = 4.5;
let rendering = false;
let result = null;
let playback = null;

function setStatus(element, state, message) {
  element.dataset.state = state;
  element.textContent = message;
}

function hasCurrentResult() {
  return result?.speed === Number(speedSelect.value) && result.clearance === Number(clearanceSelect.value);
}

function updateControls() {
  const busy = rendering || playback !== null;
  renderButton.disabled = !canRender || busy;
  speedSelect.disabled = renderButton.disabled;
  clearanceSelect.disabled = renderButton.disabled;
  playButton.disabled = !canPlay || busy || !hasCurrentResult();
  playhead.disabled = busy || !hasCurrentResult();
  stopButton.disabled = playback === null;
}

function markObserved() {
  setStatus(renderStatus, "observed", "現在の設定で計算した結果を表示しています。");
  if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
}

function updateSettings() {
  if (hasCurrentResult()) {
    markObserved();
  } else if (result) {
    setStatus(renderStatus, "stale", "設定を変更しました。図と数値は前回の計算結果です。");
    if (canPlay) setStatus(playbackStatus, "stale", "試聴するには現在の設定で計算してください。");
  }
  updateControls();
}

function signed(value) {
  const magnitude = Math.abs(value).toFixed(2);
  if (magnitude === "0.00") return magnitude;
  return (value < 0 ? "−" : "+") + magnitude;
}

function graphX(seconds, durationSec) {
  return 52 + 376 * seconds / durationSec;
}

function graphPath(timeline, durationSec, toY) {
  return timeline.map((point, index) => {
    const x = graphX(point.timeSec, durationSec).toFixed(2);
    const y = toY(point).toFixed(2);
    const command = index === 0 ? "M" : "L";
    return `${command}${x} ${y}`;
  }).join(" ");
}

function showPoint(timeSec) {
  const { timeline, durationSec, closestTimeSec } = result;
  const ratio = Math.max(0, Math.min(1, timeSec / durationSec));
  const point = timeline[Math.round(ratio * (timeline.length - 1))];
  const x = listenerX + pixelsPerMeter * point.x;
  const y = listenerY + pixelsPerMeter * point.z;
  const elapsed = `${signed(point.timeSec - closestTimeSec)} s`;
  const distance = `${point.distance.toFixed(2)} m`;
  const hz = `${point.predictedHz.toFixed(2)} Hz`;
  const gain = `${point.gain.toFixed(3)} 倍`;
  const side = point.x === 0 ? "正面" : point.x < 0 ? "左前方" : "右前方";
  const timeX = graphX(point.timeSec, durationSec);

  sourceDot.setAttribute("cx", x);
  sourceDot.setAttribute("cy", y);
  distanceLine.setAttribute("d", `M${listenerX} ${listenerY}L${x} ${y}`);
  cursor.setAttribute("d", `M${timeX} 34V104 M${timeX} 140V214`);
  motionChart.setAttribute("aria-label", `音源は聞き手の${side}、距離${distance}にあります。`);
  timeChart.setAttribute("aria-label",
    `最接近から${elapsed}では、周波数の予測は${hz}、距離ゲインの予測は${gain}です。`);

  playhead.value = point.timeSec;
  playhead.setAttribute("aria-valuetext", `最接近から ${elapsed}`);
  pointTime.textContent = elapsed;
  pointDistance.textContent = distance;
  pointRadial.textContent = `${signed(point.radialSpeed)} m/s`;
  pointHz.textContent = hz;
  pointGain.textContent = gain;
}

function showMeasurements(measurements, closestTimeSec) {
  const rows = measurements.map(point => {
    const row = document.createElement("tr");
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = `${signed(point.timeSec - closestTimeSec)} s`;
    row.append(heading);
    for (const value of [point.measuredHz.toFixed(2), point.leftGain.toFixed(3),
      point.rightGain.toFixed(3), point.totalGain.toFixed(3)]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    return row;
  });
  document.getElementById("measurements").replaceChildren(...rows);
}

function showResult() {
  const { speed, clearance, timeline, durationSec, closestTimeSec, measurements } = result;
  const y = listenerY - pixelsPerMeter * clearance;
  const x1 = listenerX - pixelsPerMeter * speed;
  const x2 = listenerX + pixelsPerMeter * speed;
  document.getElementById("rendered-settings").textContent =
    `音源の速さは ${speed} m/s、聞き手までの最短距離は ${clearance} mです。`;
  document.getElementById("trajectory").setAttribute("d",
    `M${x1} ${y}H${x2} M${x2 - 9} ${y - 5}L${x2} ${y}L${x2 - 9} ${y + 5}`);
  sourceDot.setAttribute("visibility", "visible");
  document.getElementById("pitch-curve").setAttribute("d",
    graphPath(timeline, durationSec, point => 104 - (point.predictedHz - 380) * 0.5));
  document.getElementById("gain-curve").setAttribute("d",
    graphPath(timeline, durationSec, point => 214 - point.gain * 74));
  showMeasurements(measurements, closestTimeSec);
  showPoint(0);
}

async function calculate() {
  rendering = true;
  updateControls();
  setStatus(renderStatus, "pending", "Web Audioで音を生成し、測定しています。");
  try {
    result = await renderFlyby({ speed: Number(speedSelect.value), clearance: Number(clearanceSelect.value) });
    showResult();
    markObserved();
  } catch (error) {
    const previous = result ? "前回の計算結果を表示しています。" : "";
    setStatus(renderStatus, "error", `計算できませんでした。${previous}${error.message}`);
  } finally {
    rendering = false;
    updateControls();
  }
}

function endPlayback(session, state, message) {
  if (!session || playback !== session) return;
  playback = null;
  clearTimeout(session.timeout);
  cancelAnimationFrame(session.animation);
  if (session.source) {
    session.source.onended = null;
    session.source.disconnect();
  }
  void session.context.close().catch(() => {});
  setStatus(playbackStatus, state, message);
  updateControls();
}

function animate(session) {
  if (session !== playback) return;
  showPoint(session.context.currentTime - session.startTime);
  session.animation = requestAnimationFrame(() => animate(session));
}

async function play() {
  let session;
  try {
    const context = new AudioContext();
    session = { context, source: null, timeout: null, animation: null, startTime: 0 };
    playback = session;
    updateControls();
    setStatus(playbackStatus, "pending", "再生を準備しています。");
    session.timeout = setTimeout(() => {
      endPlayback(session, "error", "音を出せませんでした。再生を選び直せます。");
    }, 5000);
    await context.resume();
    if (playback !== session) return;
    clearTimeout(session.timeout);

    const { left, right, sampleRate, durationSec } = result;
    const buffer = context.createBuffer(2, left.length, sampleRate);
    buffer.copyToChannel(left, 0);
    buffer.copyToChannel(right, 1);
    const source = context.createBufferSource();
    const volume = context.createGain();
    session.source = source;
    volume.gain.value = 0.4;
    source.buffer = buffer;
    source.connect(volume).connect(context.destination);
    source.onended = () => {
      if (session !== playback) return;
      showPoint(durationSec);
      endPlayback(session, "ready", "再生が終わりました。");
    };
    showPoint(0);
    session.startTime = context.currentTime;
    source.start(session.startTime);
    setStatus(playbackStatus, "playing", "通過音を再生しています。");
    animate(session);
  } catch (error) {
    const message = `再生できませんでした。${error.message}`;
    if (session) endPlayback(session, "error", message);
    else setStatus(playbackStatus, "error", message);
  }
}

speedSelect.addEventListener("change", updateSettings);
clearanceSelect.addEventListener("change", updateSettings);
renderButton.addEventListener("click", () => void calculate());
playhead.addEventListener("input", () => showPoint(Number(playhead.value)));
playButton.addEventListener("click", () => void play());
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => endPlayback(playback, "ready", "再生を停止しました。"));

if (!canRender) setStatus(renderStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
if (!canPlay) setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
updateControls();
