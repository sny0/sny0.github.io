const SampleRate = 48_000;
const RenderFrames = 48_000;
const PeakAmplitude = 0.12;
const TimeoutMs = 10_000;
const ChartWidth = 720;
const ChartCenter = 60;
const WaveformBins = 240;
const Conditions = [
  { id: "without-lead", label: "先読みなし", leadFrames: 0 },
  { id: "with-lead", label: "100 ms先読み", leadFrames: 4_800 },
];

const CanRender = globalThis.isSecureContext &&
  (location.protocol === "https:" || location.protocol === "http:") &&
  typeof OfflineAudioContext === "function" && typeof AudioWorkletNode === "function";
const CanListen = typeof AudioContext === "function";
const NumberFormat = new Intl.NumberFormat("ja-JP");
const RenderButton = document.getElementById("render-audio");
const StopButton = document.getElementById("stop-playback");
let rendering = false;
let results = [];
let playback = null;

function setStatus(id, state, message) {
  const status = document.getElementById(id);
  status.dataset.state = state;
  status.textContent = message;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function updateControls() {
  RenderButton.disabled = !CanRender || rendering || playback !== null;
  StopButton.disabled = playback === null;
  Conditions.forEach(({ id }, index) => {
    document.getElementById(`listen-${id}`).disabled =
      !CanListen || rendering || playback !== null || !results[index];
  });
}

function makePcm() {
  const pcm = new Float32Array(RenderFrames);
  const fadeFrames = 480;
  for (let frame = 0; frame < pcm.length; frame += 1) {
    const seconds = frame / SampleRate;
    const fade = Math.min(1, frame / fadeFrames, (pcm.length - 1 - frame) / fadeFrames);
    const envelope = 0.75 + 0.25 * Math.sin(2 * Math.PI * 5 * seconds);
    pcm[frame] = PeakAmplitude * fade * envelope * Math.sin(2 * Math.PI * 220 * seconds);
  }
  return pcm;
}

async function withDeadline(promise, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), TimeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function checkResult(buffer, stats, leadFrames) {
  const counts = [stats.renderedFrames, stats.deliveredFrames, stats.missingFrames, stats.queuedFrames, stats.overflowFrames];
  if (buffer.sampleRate !== SampleRate || buffer.length !== RenderFrames || buffer.numberOfChannels !== 1 ||
      stats.leadFrames !== leadFrames || counts.some(value => !Number.isInteger(value) || value < 0) ||
      stats.renderedFrames !== buffer.length || stats.deliveredFrames + stats.missingFrames !== buffer.length) {
    throw new Error("出力とWorkletの報告が一致しませんでした。");
  }

  const samples = buffer.getChannelData(0);
  if (stats.missingFrames > 0) {
    const start = stats.firstMissingFrame;
    const end = stats.lastMissingFrameExclusive;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > samples.length ||
        end - start !== stats.missingFrames || samples.subarray(start, end).some(sample => sample !== 0)) {
      throw new Error("不足フレームの報告と出力の無音区間が一致しませんでした。");
    }
  }
}

async function renderCondition(pcm, leadFrames) {
  const context = new OfflineAudioContext(1, RenderFrames, SampleRate);
  if (!context.audioWorklet) throw new Error("このブラウザのオフライン環境ではAudioWorkletを利用できません。");
  await withDeadline(
    context.audioWorklet.addModule(new URL("./audio-processor.js", import.meta.url)),
    "Workletの読み込みが時間内に終わりませんでした。",
  );
  const node = new AudioWorkletNode(context, "audio-buffer-observation", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    processorOptions: { pcm, leadFrames },
  });
  try {
    node.connect(context.destination);
    const statsPromise = new Promise((resolve, reject) => {
      node.onprocessorerror = () => reject(new Error("Workletの処理中にエラーが起きました。"));
      node.port.onmessageerror = () => reject(new Error("Workletの報告を読み取れませんでした。"));
      node.port.onmessage = ({ data }) => {
        if (data?.type === "stats") resolve(data);
      };
    });
    const [buffer, stats] = await withDeadline(
      Promise.all([context.startRendering(), statsPromise]),
      "音の出力かWorkletの報告が時間内に届きませんでした。",
    );
    checkResult(buffer, stats, leadFrames);
    return { buffer, stats };
  } finally {
    node.port.close();
    node.disconnect();
  }
}

function waveformPath(samples) {
  const segments = [];
  const scale = (ChartCenter - 8) / PeakAmplitude;
  for (let bin = 0; bin < WaveformBins; bin += 1) {
    const start = Math.floor(bin * samples.length / WaveformBins);
    const end = Math.floor((bin + 1) * samples.length / WaveformBins);
    let minimum = Infinity;
    let maximum = -Infinity;
    for (let index = start; index < end; index += 1) {
      minimum = Math.min(minimum, samples[index]);
      maximum = Math.max(maximum, samples[index]);
    }
    const x = (bin + 0.5) * ChartWidth / WaveformBins;
    segments.push(`M${x} ${(ChartCenter - maximum * scale).toFixed(2)}V${(ChartCenter - minimum * scale).toFixed(2)}`);
  }
  return segments.join(" ");
}

function showResult(condition, { buffer, stats }) {
  const { id, label } = condition;
  const { firstMissingFrame, lastMissingFrameExclusive, missingFrames } = stats;
  const format = value => NumberFormat.format(value);
  const gap = missingFrames > 0
    ? `[${format(firstMissingFrame)}, ${format(lastMissingFrameExclusive)})`
    : "なし";
  const { firstQuantumFrames, lastQuantumFrames, maxQuantumFrames } = stats;
  const quantum = firstQuantumFrames === lastQuantumFrames && firstQuantumFrames === maxQuantumFrames
    ? format(firstQuantumFrames)
    : `${format(firstQuantumFrames)}（先頭） / ${format(lastQuantumFrames)}（末尾） / ${format(maxQuantumFrames)}（最大）`;
  setText(`${id}-missing`, format(missingFrames));
  setText(`${id}-delivered`, format(stats.deliveredFrames));
  setText(`${id}-gap`, gap);
  setText(`${id}-queued`, format(stats.queuedFrames));
  setText(`${id}-overflow`, format(stats.overflowFrames));
  setText(`${id}-quantum`, quantum);

  const chart = document.querySelector(`#${id} .wave-chart`);
  chart.querySelector(".waveform").setAttribute("d", waveformPath(buffer.getChannelData(0)));
  const band = chart.querySelector(".gap-band");
  band.setAttribute("x", missingFrames > 0 ? ChartWidth * firstMissingFrame / buffer.length : 0);
  band.setAttribute("width", ChartWidth * missingFrames / buffer.length);
  chart.setAttribute("aria-label", `${label}の出力波形。不足 ${format(missingFrames)} フレーム。区間 ${gap}。`);
}

async function renderComparison() {
  rendering = true;
  updateControls();
  setStatus("render-status", "pending", "二つの条件をレンダリングしています。");
  try {
    const pcm = makePcm();
    const comparison = [];
    for (const { leadFrames } of Conditions) {
      comparison.push(await renderCondition(pcm, leadFrames));
    }
    comparison.forEach((result, index) => showResult(Conditions[index], result));
    const { buffer } = comparison[0];
    setText("render-rate", NumberFormat.format(buffer.sampleRate));
    setText("render-frames", NumberFormat.format(buffer.length));
    setText("render-channels", buffer.numberOfChannels);
    results = comparison;
    setStatus("render-status", "observed", "両条件をレンダリングしました。不足区間と出力波形を比べられます。");
  } catch (error) {
    const previous = results.length > 0 ? " 表示中の波形は前回の結果です。" : "";
    setStatus("render-status", "error", `レンダリングできませんでした。 ${error.message}${previous}`);
  } finally {
    rendering = false;
    updateControls();
  }
}

function endPlayback(session, state, message) {
  if (!session || playback !== session) return;
  playback = null;
  if (session.source) {
    session.source.onended = null;
    session.source.disconnect();
  }
  void session.context.close().catch(() => {});
  setStatus("playback-status", state, message);
  updateControls();
}

async function listen(index) {
  let session;
  try {
    const context = new AudioContext();
    session = { context, source: null };
    playback = session;
    updateControls();
    setStatus("playback-status", "pending", "音の出力を準備しています。");
    await withDeadline(context.resume(), "ブラウザが音の再生を開始できませんでした。");
    if (playback !== session) return;
    const source = context.createBufferSource();
    session.source = source;
    source.buffer = results[index].buffer;
    source.connect(context.destination);
    source.onended = () => endPlayback(session, "ready", "再生が終わりました。");
    source.start();
    setStatus("playback-status", "playing", `${Conditions[index].label}の音を再生中です。`);
  } catch (error) {
    const message = `再生できませんでした。 ${error.message}`;
    if (session) endPlayback(session, "error", message);
    else setStatus("playback-status", "error", message);
  }
}

RenderButton.addEventListener("click", () => void renderComparison());
StopButton.addEventListener("click", () => endPlayback(playback, "ready", "再生を停止しました。"));
Conditions.forEach(({ id }, index) => {
  document.getElementById(`listen-${id}`).addEventListener("click", () => void listen(index));
});
if (!CanRender) {
  setStatus("render-status", "error", "この環境では実行できません。AudioWorkletに対応したブラウザで、HTTPSか付属の手順にあるローカルURLを開いてください。");
}
if (!CanListen) {
  setStatus("playback-status", "error", "この環境では音の再生を利用できません。");
}
updateControls();
