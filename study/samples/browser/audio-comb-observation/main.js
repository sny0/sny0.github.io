import { renderComb } from "./comb-engine.js";

const delaySelect = document.getElementById("delay-ms");
const gainSelect = document.getElementById("relative-gain");
const renderButton = document.getElementById("render-comb");
const combStatus = document.getElementById("comb-status");
const playbackStatus = document.getElementById("playback-status");
const dryButton = document.getElementById("play-dry");
const mixedButton = document.getElementById("play-mixed");
const stopButton = document.getElementById("stop-playback");
const canRender = typeof globalThis.OfflineAudioContext === "function";
const canPlay = typeof globalThis.AudioContext === "function";
const integerFormat = new Intl.NumberFormat("ja-JP");
const floorDb = -60;
const chart = { left: 46, top: 22, bottom: 132, width: 355 };
let rendering = false;
let result = null;
let playback = null;

function setStatus(element, state, message) {
  element.dataset.state = state;
  element.textContent = message;
}

function hasCurrentResult() {
  return result?.delayMs === Number(delaySelect.value) && result.relativeGain === Number(gainSelect.value);
}

function updateControls() {
  const busy = rendering || playback !== null;
  delaySelect.disabled = !canRender || busy;
  gainSelect.disabled = !canRender || busy;
  renderButton.disabled = !canRender || busy;
  dryButton.disabled = !canPlay || busy || !hasCurrentResult();
  mixedButton.disabled = dryButton.disabled;
  stopButton.disabled = playback === null;
}

function updateSettings() {
  if (hasCurrentResult()) {
    setStatus(combStatus, "observed", "現在の設定で計算した結果を表示しています。");
    if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
  } else if (result) {
    setStatus(combStatus, "stale", "設定を変更しました。今のグラフは前回の計算結果です。");
    if (canPlay) setStatus(playbackStatus, "stale", "試聴するには現在の設定で計算してください。");
  }
  updateControls();
}

function chartX(position, maximum) {
  return (chart.left + chart.width * position / maximum).toFixed(2);
}

function chartY(fraction) {
  return (chart.bottom - (chart.bottom - chart.top) * fraction).toFixed(2);
}

function formatDb(db) {
  if (db < floorDb) return "−60 dB未満";
  if (Math.abs(db) < 0.005) return "0.00 dB";
  return `${db.toFixed(2).replace("-", "−")} dB`;
}

function showResult(rendered) {
  const { delayMs, relativeGain, sampleRate, delayFrame, dryTap, delayedTap, firstDipHz, firstDipDb, response } = rendered;
  const sampleRateLabel = integerFormat.format(sampleRate);
  document.getElementById("rendered-settings").textContent =
    `計算に使った設定は遅延 ${delayMs} ms、コピーの相対ゲイン ${relativeGain}、サンプルレート ${sampleRateLabel} Hzです。`;

  const delayedX = chartX(1000 * delayFrame / sampleRate, 10);
  const dryStem = `M${chart.left} ${chart.bottom}V${chartY(dryTap)}`;
  const delayedStem = delayedTap > 0 ? ` M${delayedX} ${chart.bottom}V${chartY(delayedTap)}` : "";
  document.getElementById("impulse-taps").setAttribute("d", dryStem + delayedStem);
  document.getElementById("impulse-chart").setAttribute("aria-label",
    `インパルス応答。0 msの振幅は${dryTap.toFixed(3)}、${delayMs} ms後の振幅は${delayedTap.toFixed(3)}。`);
  document.getElementById("dry-tap").textContent = dryTap.toFixed(3);
  document.getElementById("delayed-tap").textContent = delayedTap.toFixed(3);
  document.getElementById("delay-frames").textContent = `${integerFormat.format(delayFrame)} フレーム`;

  const curve = response.map(({ frequencyHz, db }, index) => {
    const level = Math.min(0, Math.max(floorDb, db));
    return `${index === 0 ? "M" : "L"}${chartX(frequencyHz, 2000)} ${chartY(1 - level / floorDb)}`;
  });
  document.getElementById("response-curve").setAttribute("d", curve.join(" "));

  const hasDip = relativeGain > 0;
  const dipFrequency = hasDip ? `${integerFormat.format(firstDipHz)} Hz` : "なし";
  const dipLevel = hasDip ? formatDb(firstDipDb) : "—";
  const dipX = hasDip ? chartX(firstDipHz, 2000) : "";
  document.getElementById("first-dip-marker").setAttribute("d", hasDip ? `M${dipX} ${chart.top}V${chart.bottom}` : "");
  document.getElementById("first-dip-frequency").textContent = dipFrequency;
  document.getElementById("first-dip-level").textContent = dipLevel;
  document.getElementById("dip-note").textContent = hasDip
    ? "破線は遅延時間から求めた最初の谷の位置です。"
    : "コピーのゲインが0なので、全周波数で入力と同じ振幅（0 dB）になり、谷はありません。";
  document.getElementById("response-chart").setAttribute("aria-label", hasDip
    ? `周波数応答。最初の谷の予測位置は${dipFrequency}、その位置での実測値は${dipLevel}。`
    : "周波数応答。0 Hzから2,000 Hzまで一様に0 dB。谷はありません。");
}

async function calculateComb() {
  rendering = true;
  updateControls();
  setStatus(combStatus, "pending", "Web Audioで出力を計算しています。");
  try {
    const rendered = await renderComb({ delayMs: Number(delaySelect.value), relativeGain: Number(gainSelect.value) });
    showResult(rendered);
    result = rendered;
    setStatus(combStatus, "observed", "現在の設定で計算した結果を表示しています。");
    if (canPlay) setStatus(playbackStatus, "ready", "再生していません。");
  } catch (error) {
    const previous = result ? "前回の結果を表示しています。" : "";
    setStatus(combStatus, "error", `計算できませんでした。${previous} ${error.message}`);
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
    const message = `再生できませんでした。 ${error.message}`;
    if (session) endPlayback(session, "error", message);
    else setStatus(playbackStatus, "error", message);
  }
}

delaySelect.addEventListener("change", updateSettings);
gainSelect.addEventListener("change", updateSettings);
renderButton.addEventListener("click", () => void calculateComb());
dryButton.addEventListener("click", () => void playResult("dry", "元の音"));
mixedButton.addEventListener("click", () => void playResult("mixed", "重ねた音"));
stopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
window.addEventListener("pagehide", () => endPlayback(playback, "ready", "再生を停止しました。"));

if (!canRender) {
  setStatus(combStatus, "error", "このブラウザはOfflineAudioContextに対応していません。");
}
if (!canPlay) {
  setStatus(playbackStatus, "error", "このブラウザでは音を再生できません。");
}
updateControls();
