import { buildPacing, frameAtTime } from './pacing-engine.js';

const tracks = document.querySelector('#tracks');
const template = document.querySelector('#track-template');
const playButton = document.querySelector('#playback');
const resetButton = document.querySelector('#reset');
const inspectButton = document.querySelector('#inspect');
const pattern = document.querySelector('#pattern');
const speed = document.querySelector('#speed');
const playhead = document.querySelector('#playhead');
const time = document.querySelector('#time');
const status = document.querySelector('#status');

const intervalFormat = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const clockFormat = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const titles = {
  regular: '一定の表示間隔',
  spike: 'ときどき長く止まる',
  alternating: '短い間隔と長い間隔が交互',
};
const plotWidth = 480;
const plotHeight = 100;
const maxPlotMs = 50;

function createTrack(letter, mode) {
  const element = template.content.firstElementChild.cloneNode(true);
  const title = element.querySelector('h2');
  title.id = `track-${letter.toLowerCase()}-title`;
  element.setAttribute('aria-labelledby', title.id);
  element.querySelector('.badge').textContent = letter;
  element.classList.toggle('compared', letter === 'B');
  tracks.append(element);

  const view = {
    element,
    title: element.querySelector('.track-title'),
    graph: element.querySelector('.intervals'),
    trace: element.querySelector('.trace'),
    area: element.querySelector('.area'),
    selection: element.querySelector('.selection'),
    cursor: element.querySelector('.cursor'),
    position: element.querySelector('.position'),
    frameInfo: element.querySelector('.frame-info'),
    frameRange: element.querySelector('.frame-range'),
  };
  setPattern(view, mode);
  return view;
}

function setPattern(view, mode) {
  const series = buildPacing(mode);
  view.series = series;
  view.activeFrame = null;
  view.title.textContent = titles[mode];

  // Each horizontal run spans the actual hold time on the virtual display.
  const totalTicks = series.frames.at(-1).endTick;
  const segments = series.frames.map((frame, index) => {
    const startX = frame.startTick / totalTicks * plotWidth;
    const endX = frame.endTick / totalTicks * plotWidth;
    const y = (1 - frame.durationMs / maxPlotMs) * plotHeight;
    return `${index === 0 ? 'M' : 'L'}${startX} ${y}H${endX}`;
  }).join(' ');
  view.trace.setAttribute('d', segments);
  view.area.setAttribute('d', `${segments}V${plotHeight}H0Z`);

  const { fps, meanMs, p99Ms, maxMs, overBudget } = series.metrics;
  const metrics = {
    fps: String(fps),
    meanMs: `${intervalFormat.format(meanMs)} ms`,
    p99Ms: `${intervalFormat.format(p99Ms)} ms`,
    maxMs: `${intervalFormat.format(maxMs)} ms`,
    overBudget: `${overBudget} 回`,
  };
  for (const [key, value] of Object.entries(metrics)) {
    view.element.querySelector(`[data-metric="${key}"]`).textContent = value;
  }
  view.graph.setAttribute('aria-label', `${titles[mode]}のグラフ。表示時刻は0から2,000 ms、最長間隔は${metrics.maxMs}。`);
}

const regular = createTrack('A', 'regular');
const compared = createTrack('B', pattern.value);
const durationMs = regular.series.durationMs;

let elapsedMs = 0;
let animationFrame = null;
let previousTimestamp = null;

function renderTrack(view) {
  const { series } = view;
  const x = elapsedMs / durationMs * plotWidth;
  view.cursor.setAttribute('d', `M${x} 0V${plotHeight}`);

  const frame = frameAtTime(series, elapsedMs);
  if (frame === view.activeFrame) return;

  // The point keeps the position captured when this frame began.
  const totalTicks = series.frames.at(-1).endTick;
  const position = frame.startTick / totalTicks;
  view.position.setAttribute('d', `M${12 + position * 456} 21v0.01`);
  view.selection.setAttribute('x', position * plotWidth);
  view.selection.setAttribute('width', frame.ticks / totalTicks * plotWidth);
  view.frameInfo.textContent = `フレーム ${frame.index + 1} · ${intervalFormat.format(frame.durationMs)} ms（更新 ${frame.ticks} 回分）`;
  const endMs = frame.endTick * 1000 / series.refreshHz;
  view.frameRange.textContent = `${intervalFormat.format(frame.startMs)}–${intervalFormat.format(endMs)} ms`;
  view.activeFrame = frame;
}

function render(nextMs) {
  elapsedMs = nextMs;
  time.textContent = `${clockFormat.format(elapsedMs)} ms`;
  playhead.value = String(Math.round(elapsedMs));
  renderTrack(regular);
  renderTrack(compared);
}

function setPlaybackLabel() {
  if (animationFrame !== null) playButton.textContent = '一時停止';
  else if (elapsedMs === durationMs) playButton.textContent = '最初から再生';
  else if (elapsedMs === 0) playButton.textContent = '再生する';
  else playButton.textContent = 'ここから再生';
}

function stopPlayback() {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  previousTimestamp = null;
}

function onFrame(timestamp) {
  if (previousTimestamp !== null) {
    const deltaMs = timestamp - previousTimestamp;
    render(Math.min(durationMs, elapsedMs + deltaMs * Number(speed.value)));
  }
  if (elapsedMs === durationMs) {
    stopPlayback();
    setPlaybackLabel();
    status.textContent = '2秒間の表示を最後まで再生しました。';
    return;
  }
  previousTimestamp = timestamp;
  animationFrame = requestAnimationFrame(onFrame);
}

playButton.addEventListener('click', () => {
  if (animationFrame !== null) {
    stopPlayback();
    status.textContent = `${clockFormat.format(elapsedMs)} msで一時停止しました。`;
  } else {
    if (elapsedMs === durationMs) render(0);
    animationFrame = requestAnimationFrame(onFrame);
    status.textContent = '同じ時刻で二つの表示を再生中です。';
  }
  setPlaybackLabel();
});

resetButton.addEventListener('click', () => {
  stopPlayback();
  render(0);
  setPlaybackLabel();
  status.textContent = '先頭に戻りました。';
});

inspectButton.addEventListener('click', () => {
  stopPlayback();
  const { frames, metrics } = compared.series;
  const longest = frames.find((frame) => frame.durationMs === metrics.maxMs);
  render(longest.startMs + longest.durationMs / 2);
  setPlaybackLabel();
  status.textContent = `Bの最長フレーム（${longest.index + 1}番、${intervalFormat.format(longest.durationMs)} ms）を表示しています。`;
});

pattern.addEventListener('change', () => {
  stopPlayback();
  setPattern(compared, pattern.value);
  render(elapsedMs);
  setPlaybackLabel();
  status.textContent = `Bを「${titles[pattern.value]}」に切り替えました。`;
});

speed.addEventListener('change', () => {
  previousTimestamp = null;
  status.textContent = `再生速度を「${speed.selectedOptions[0].textContent}」に切り替えました。`;
});

playhead.addEventListener('input', () => {
  const wasPlaying = animationFrame !== null;
  stopPlayback();
  render(Number(playhead.value));
  setPlaybackLabel();
  if (wasPlaying) status.textContent = '時刻を動かしたので再生を一時停止しました。';
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden || animationFrame === null) return;
  stopPlayback();
  setPlaybackLabel();
  status.textContent = 'ページが非表示になったため一時停止しました。';
});

render(0);
status.textContent = '再生するか、最長のフレームに移動して比べられます。';
for (const control of [playButton, resetButton, inspectButton, pattern, speed, playhead]) {
  control.disabled = false;
}
