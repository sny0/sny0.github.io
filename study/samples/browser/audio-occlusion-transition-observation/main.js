import { renderTransition } from "./transition-engine.js";

const timeConstantSelect = document.getElementById("time-constant");
const renderButton = document.getElementById("render-transition");
const transitionStatus = document.getElementById("transition-status");
const playbackStatus = document.getElementById("playback-status");
const stepButton = document.getElementById("play-step");
const smoothButton = document.getElementById("play-smooth");
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
  return result?.timeConstantMs === Number(timeConstantSelect.value);
}

function updateControls() {
  const busy = rendering || playback !== null;
  timeConstantSelect.disabled = !canRender || busy;
  renderButton.disabled = !canRender || busy;
  stepButton.disabled = !canPlay || busy || !hasCurrentResult();
  smoothButton.disabled = stepButton.disabled;
  stopButton.disabled = playback === null;
}

function markObserved() {
  setStatus(transitionStatus, "observed", "現在の設定で計算した結果を表示しています。");
  if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
}

function updateSettings() {
  if (hasCurrentResult()) {
    markObserved();
  } else if (result) {
    setStatus(transitionStatus, "stale", "時定数を変更しました。図と数値は前回の計算結果です。");
    if (canPlay) setStatus(playbackStatus, "stale", "試聴するには現在の設定で波形を計算してください。");
  }
  updateControls();
}

function xAt(timeMs, startMs, endMs) {
  return 52 + 376 * (timeMs - startMs) / (endMs - startMs);
}

function gainY(value) {
  return 205 - 173 * (value - 0.45) / 0.6;
}

function drawGain({ gainTrace, eventFrame, sampleRate, timeConstantMs }) {
  const frameAt = timeMs => eventFrame + Math.round(timeMs * sampleRate / 1000);
  const x = timeMs => xAt(timeMs, -20, 200);
  const commands = [];
  for (let timeMs = -20; timeMs <= 200; timeMs += 0.5) {
    const command = timeMs === -20 ? "M" : "L";
    commands.push(`${command}${x(timeMs).toFixed(2)} ${gainY(gainTrace[frameAt(timeMs)]).toFixed(2)}`);
  }
  document.getElementById("smooth-gain-curve").setAttribute("d", commands.join(" "));
  document.getElementById("step-gain-curve").setAttribute("d",
    `M${x(-20)} ${gainY(0.5)}H${x(0)}V${gainY(1)}H${x(200)}`);

  const measurements = [
    { offset: timeConstantMs, marker: "tau-marker", time: "tau-offset", gain: "gain-at-tau" },
    { offset: 3 * timeConstantMs, marker: "three-tau-marker", time: "three-tau-offset", gain: "gain-at-three-tau" }
  ];
  for (const { offset, marker, time, gain } of measurements) {
    const value = gainTrace[frameAt(offset)];
    const point = document.getElementById(marker);
    point.setAttribute("cx", x(offset));
    point.setAttribute("cy", gainY(value));
    point.setAttribute("visibility", "visible");
    document.getElementById(time).textContent = `+${offset} ms`;
    document.getElementById(gain).textContent = `${value.toFixed(3)} 倍`;
  }
  const tauValue = gainTrace[frameAt(timeConstantMs)].toFixed(3);
  const threeTauValue = gainTrace[frameAt(3 * timeConstantMs)].toFixed(3);
  document.getElementById("gain-chart").setAttribute("aria-label",
    `瞬時のゲインは扉が開くと0.5倍から1倍になります。なめらかな切り替えの実測値は、開いて${timeConstantMs} ms後で${tauValue}倍、${3 * timeConstantMs} ms後で${threeTauValue}倍です。`);
}

function drawWaveforms({ step, smooth, eventFrame, sampleRate }) {
  const startFrame = eventFrame - Math.round(5 * sampleRate / 1000);
  const endFrame = eventFrame + Math.round(10 * sampleRate / 1000);
  let peak = 0.25;
  for (let frame = startFrame; frame <= endFrame; frame += 1) {
    peak = Math.max(peak, Math.abs(step[frame]), Math.abs(smooth[frame]));
  }
  const amplitude = Math.ceil(peak * 20) / 20;
  for (const label of document.querySelectorAll(".positive-amplitude")) {
    label.textContent = `+${amplitude.toFixed(2)}`;
  }
  for (const label of document.querySelectorAll(".negative-amplitude")) {
    label.textContent = `−${amplitude.toFixed(2)}`;
  }
  const traces = [
    { samples: step, center: 83, id: "step-waveform" },
    { samples: smooth, center: 181, id: "smooth-waveform" }
  ];
  for (const { samples, center, id } of traces) {
    const commands = [];
    for (let frame = startFrame; frame <= endFrame; frame += 1) {
      const timeMs = (frame - eventFrame) * 1000 / sampleRate;
      const command = frame === startFrame ? "M" : "L";
      const y = center - 32 * samples[frame] / amplitude;
      commands.push(`${command}${xAt(timeMs, -5, 10).toFixed(2)} ${y.toFixed(2)}`);
    }
    document.getElementById(id).setAttribute("d", commands.join(" "));
  }
  document.getElementById("waveform-chart").setAttribute("aria-label",
    "扉が開く5 ms前から10 ms後までの出力波形。上が瞬時、下がなめらかな切り替えです。");
}

async function measure() {
  rendering = true;
  updateControls();
  setStatus(transitionStatus, "pending", "Web Audioで波形を計算しています。");
  try {
    const measured = await renderTransition({ timeConstantMs: Number(timeConstantSelect.value) });
    drawGain(measured);
    drawWaveforms(measured);
    result = measured;
    document.getElementById("rendered-settings").textContent =
      `扉が開くのは開始から${result.eventFrame * 1000 / result.sampleRate} ms、なめらかな切り替えの時定数は${result.timeConstantMs} msです。`;
    markObserved();
  } catch (error) {
    const previous = result ? "前回の計算結果を表示しています。" : "";
    setStatus(transitionStatus, "error", `計算できませんでした。${previous}${error.message}`);
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

timeConstantSelect.addEventListener("change", updateSettings);
renderButton.addEventListener("click", () => void measure());
stepButton.addEventListener("click", () => void playResult("step", "瞬時に切り替える音"));
smoothButton.addEventListener("click", () => void playResult("smooth", "なめらかに切り替える音"));
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => endPlayback(playback, "ready", "再生を停止しました。"));

if (!canRender) setStatus(transitionStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
if (!canPlay) setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
updateControls();
