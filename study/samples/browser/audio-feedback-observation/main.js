import { renderFeedback } from "./feedback-engine.js";

const delaySelect = document.getElementById("delay-ms");
const feedbackSelect = document.getElementById("feedback-gain");
const renderButton = document.getElementById("render-feedback");
const feedbackStatus = document.getElementById("feedback-status");
const playbackStatus = document.getElementById("playback-status");
const dryButton = document.getElementById("play-dry");
const mixedButton = document.getElementById("play-mixed");
const stopButton = document.getElementById("stop-playback");
const canRender = typeof globalThis.OfflineAudioContext === "function";
const canPlay = typeof globalThis.AudioContext === "function";
const integerFormat = new Intl.NumberFormat("ja-JP");
const timeFormat = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 3 });
const svgNamespace = "http://www.w3.org/2000/svg";
const chart = { left: 50, top: 24, bottom: 152, width: 400, minimumDurationMs: 2100 };
let rendering = false;
let result = null;
let playback = null;

function setStatus(element, state, message) {
  element.dataset.state = state;
  element.textContent = message;
}

function hasCurrentResult() {
  return result?.delayMs === Number(delaySelect.value) && result.feedback === Number(feedbackSelect.value);
}

function updateControls() {
  const busy = rendering || playback !== null;
  delaySelect.disabled = !canRender || busy;
  feedbackSelect.disabled = !canRender || busy;
  renderButton.disabled = !canRender || busy;
  dryButton.disabled = !canPlay || busy || !hasCurrentResult();
  mixedButton.disabled = dryButton.disabled;
  stopButton.disabled = playback === null;
}

function markObserved() {
  setStatus(feedbackStatus, "observed", "現在の設定で測った結果を表示しています。");
  if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
}

function updateSettings() {
  if (hasCurrentResult()) {
    markObserved();
  } else if (result) {
    setStatus(feedbackStatus, "stale", "設定を変更しました。グラフと表は前回の測定結果です。");
    if (canPlay) setStatus(playbackStatus, "stale", "試聴するには現在の設定で計算してください。");
  }
  updateControls();
}

function tapRow({ index, timeMs, amplitude }) {
  const row = document.createElement("tr");
  const label = document.createElement("th");
  label.scope = "row";
  label.textContent = index === 0 ? "元の音" : `反響 ${index}`;
  const time = document.createElement("td");
  time.textContent = `${timeFormat.format(timeMs)} ms`;
  const value = document.createElement("td");
  value.textContent = amplitude.toFixed(4);
  row.append(label, time, value);
  return row;
}

function chartX(timeMs, durationMs) {
  return chart.left + chart.width * timeMs / durationMs;
}

function drawTimeAxis(durationMs) {
  const ticks = [];
  const tickStep = Math.ceil(durationMs / 2500) * 500;
  // Leave room for the label at the right edge, which includes the unit.
  for (let timeMs = 0; timeMs <= durationMs - tickStep / 2; timeMs += tickStep) {
    ticks.push(timeMs);
  }
  ticks.push(durationMs);
  const gridLines = ticks.map(timeMs => `M${chartX(timeMs, durationMs)} ${chart.top}V${chart.bottom}`);
  document.getElementById("time-grid").setAttribute("d", gridLines.join(" "));
  const labels = ticks.map(timeMs => {
    const atEnd = timeMs === durationMs;
    const label = document.createElementNS(svgNamespace, "text");
    label.setAttribute("x", atEnd ? 468 : chartX(timeMs, durationMs));
    label.setAttribute("y", 175);
    label.setAttribute("text-anchor", atEnd ? "end" : "middle");
    label.textContent = `${integerFormat.format(timeMs)}${atEnd ? " ms" : ""}`;
    return label;
  });
  document.getElementById("time-ticks").replaceChildren(...labels);
}

function drawImpulse(taps, observedDelay) {
  const latestTime = taps[taps.length - 1].timeMs;
  const durationMs = Math.max(chart.minimumDurationMs, Math.ceil((latestTime + 12) / 100) * 100);
  drawTimeAxis(durationMs);
  const stems = [];
  const points = [];
  for (const { timeMs, amplitude } of taps) {
    if (amplitude <= 0) continue;
    const x = chartX(timeMs, durationMs);
    const y = chart.bottom - (chart.bottom - chart.top) * amplitude;
    stems.push(`M${x} ${chart.bottom}V${y}`);
    const point = document.createElementNS(svgNamespace, "circle");
    point.setAttribute("cx", x);
    point.setAttribute("cy", y);
    point.setAttribute("r", 4);
    points.push(point);
  }
  document.getElementById("impulse-taps").setAttribute("d", stems.join(" "));
  document.getElementById("impulse-points").replaceChildren(...points);
  const echoLabel = observedDelay === null ? "反響なし。" :
    `実測した反響間隔は${observedDelay} ms。1回目の振幅は${taps[1].amplitude.toFixed(4)}。`;
  document.getElementById("impulse-chart").setAttribute("aria-label",
    `インパルス応答。元の音の振幅は${taps[0].amplitude.toFixed(4)}。${echoLabel}`);
}

function showResult(rendered) {
  const { delayMs, feedback, sampleRate, delayFrames, observedDelayFrames, taps } = rendered;
  const observedDelay = observedDelayFrames === null ? null :
    timeFormat.format(1000 * observedDelayFrames / sampleRate);
  document.getElementById("rendered-settings").textContent =
    `計算に使った設定は遅延 ${delayMs} ms、フィードバックのゲイン ${feedback}、サンプルレート ${integerFormat.format(sampleRate)} Hzです。`;
  document.getElementById("delay-frames").textContent = `${integerFormat.format(delayFrames)} フレーム（${delayMs} ms）`;
  document.getElementById("observed-delay-frames").textContent = observedDelay === null ? "反響なし" :
    `${integerFormat.format(observedDelayFrames)} フレーム（${observedDelay} ms）`;
  document.getElementById("loop-db").textContent = feedback === 0 ? "反響なし" :
    `${(20 * Math.log10(feedback)).toFixed(2).replace("-", "−")} dB`;
  document.getElementById("tap-caption").textContent = observedDelay === null ?
    "設定間隔ごとの時刻と振幅" : "反響のピーク時刻と振幅";
  document.getElementById("tap-results").replaceChildren(...taps.map(tapRow));
  drawImpulse(taps, observedDelay);
}

async function calculate() {
  rendering = true;
  updateControls();
  setStatus(feedbackStatus, "pending", "Web Audioで出力を計算しています。");
  try {
    const rendered = await renderFeedback({ delayMs: Number(delaySelect.value), feedback: Number(feedbackSelect.value) });
    showResult(rendered);
    result = rendered;
    markObserved();
  } catch (error) {
    const previous = result ? "前回の測定結果を表示しています。 " : "";
    setStatus(feedbackStatus, "error", `計算できませんでした。${previous}${error.message}`);
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

delaySelect.addEventListener("change", updateSettings);
feedbackSelect.addEventListener("change", updateSettings);
renderButton.addEventListener("click", () => void calculate());
dryButton.addEventListener("click", () => void playResult("dry", "元の音"));
mixedButton.addEventListener("click", () => void playResult("mixed", "反響付きの音"));
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => endPlayback(playback, "ready", "再生を停止しました。"));

if (!canRender) setStatus(feedbackStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
if (!canPlay) setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
updateControls();
