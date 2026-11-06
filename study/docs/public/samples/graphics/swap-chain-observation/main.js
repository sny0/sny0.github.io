import { buildPresentation } from './presentation-engine.js';

const { frames, scans } = buildPresentation();
const modes = [
  { key: 'fifo', title: 'FIFO', rule: '走査の境目で、待っている最も古い絵を選ぶ。' },
  { key: 'mailbox', title: 'MAILBOX', rule: '走査の境目で、待っている最新の絵を選ぶ。' },
  { key: 'immediate', title: 'IMMEDIATE', rule: '絵が用意された時点で切り替える。' },
];

const comparison = document.querySelector('#mode-comparison');
const template = document.querySelector('#mode-template');
const scanSelector = document.querySelector('#scan-index');
const scanTime = document.querySelector('#scan-time');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const playback = document.querySelector('#playback');
const status = document.querySelector('#status');

const screenWidth = 300;
const screenHeight = 144;
const lastScan = scans.length - 1;
let selectedIndex = 1;
let timer = null;

function milliseconds(value) {
  return `${value.toFixed(2)} ms`;
}

function timeRange(scan) {
  return `${scan.startMs.toFixed(2)}–${milliseconds(scan.endMs)}`;
}

function svgElement(name, attributes, content = '') {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.textContent = content;
  return element;
}

function drawScreen(screen, bands, description) {
  const strips = bands.map(({ frameId, startRow, endRow }) => {
    const y = startRow * screenHeight;
    const height = (endRow - startRow) * screenHeight;
    // Draw the same moving edge only across the rows supplied by this frame.
    const edge = 51 + frames.findIndex((frame) => frame.id === frameId) * 26;
    const group = svgElement('g', { 'data-frame': frameId });
    group.append(
      svgElement('rect', { class: 'screen-base', x: 0, y, width: screenWidth, height }),
      svgElement('rect', { class: 'screen-right', x: edge, y, width: screenWidth - edge, height }),
      svgElement('rect', { class: 'screen-edge', x: edge, y, width: 13, height }),
      svgElement('rect', { class: 'screen-trim', x: edge + 13, y, width: 6, height }),
    );
    if (height >= 22) {
      group.append(svgElement('text', { class: 'screen-frame', x: 12, y: y + height / 2 + 6 }, frameId));
    }
    return group;
  });
  const seams = bands.slice(1).map(({ startRow }) => {
    const y = startRow * screenHeight;
    return svgElement('line', { class: 'screen-seam', x1: 0, x2: screenWidth, y1: y, y2: y });
  });
  screen.replaceChildren(...strips, ...seams);
  screen.setAttribute('aria-label', description);
}

function createModeView({ key, title, rule }) {
  const card = template.content.firstElementChild.cloneNode(true);
  const heading = card.querySelector('.mode-title');
  card.id = `mode-${key}`;
  heading.id = `${card.id}-heading`;
  heading.textContent = title;
  card.setAttribute('aria-labelledby', heading.id);
  card.querySelector('.mode-rule').textContent = rule;
  comparison.append(card);
  return {
    key, title,
    screen: card.querySelector('.screen'),
    order: card.querySelector('.scan-order'),
    seams: card.querySelector('.seams'),
    pending: card.querySelector('.pending'),
    skipped: card.querySelector('.skipped'),
    firstVisible: card.querySelector('.first-visible'),
  };
}

const views = modes.map(createModeView);

function renderMode(view, state) {
  const order = state.bands.map((band) => band.frameId).join(' → ');
  const seams = state.bands.slice(1).map(({ startRow }) => `${Math.round(startRow * 100)}%`);
  view.order.textContent = `上から ${order}`;
  view.seams.textContent = seams.length ? `上端から ${seams.join('・')} の位置で切り替え` : '走査の途中で切り替わらない';
  drawScreen(view.screen, state.bands, `${view.title}。${view.order.textContent}。${view.seams.textContent}。`);
  view.pending.textContent = state.pending.join(' → ') || 'なし';
  view.skipped.textContent = state.skipped.join('、') || 'なし';
  const arrivals = state.firstVisible.map(({ frameId, visibleMs, latencyMs }) => {
    const entry = document.createElement('span');
    entry.textContent = `${frameId} · ${milliseconds(visibleMs)}（入力から ${milliseconds(latencyMs)}）`;
    return entry;
  });
  view.firstVisible.replaceChildren(...(arrivals.length ? arrivals : ['なし']));
}

function renderScan(index) {
  selectedIndex = index;
  const scan = scans[index];
  scanSelector.value = String(index);
  scanTime.textContent = timeRange(scan);
  for (const view of views) renderMode(view, scan.modes[view.key]);
  previous.disabled = index === 0;
  next.disabled = index === lastScan;
  status.textContent = `第${index + 1}走査／全${scans.length}回。画面の縦の位置が、走査内の時刻に対応します。`;
}

function stopPlayback() {
  clearInterval(timer);
  timer = null;
  playback.textContent = '順に再生';
}

playback.addEventListener('click', () => {
  if (timer !== null) {
    stopPlayback();
    return;
  }
  if (selectedIndex === lastScan) renderScan(0);
  playback.textContent = '一時停止';
  timer = setInterval(() => {
    renderScan(selectedIndex + 1);
    if (selectedIndex === lastScan) stopPlayback();
  }, 950);
});

function chooseScan(index) {
  stopPlayback();
  renderScan(index);
}

previous.addEventListener('click', () => chooseScan(selectedIndex - 1));
next.addEventListener('click', () => chooseScan(selectedIndex + 1));
scanSelector.addEventListener('change', () => chooseScan(Number(scanSelector.value)));

function appendRow(table, heading, cells) {
  const row = table.insertRow();
  const label = document.createElement('th');
  label.scope = 'row';
  label.textContent = heading;
  row.append(label);
  for (const content of cells) row.insertCell().textContent = content;
}

const latencyBody = document.querySelector('#latency-summary tbody');
for (const { key, title } of modes) {
  const result = scans.flatMap((scan) => scan.modes[key].firstVisible).find((entry) => entry.frameId === 'G');
  const values = result ? [milliseconds(result.visibleMs), milliseconds(result.latencyMs)] : ['なし', 'なし'];
  appendRow(latencyBody, title, values);
}

const scheduleBody = document.querySelector('#frame-schedule tbody');
for (const frame of frames) {
  const input = frame.inputMs === null ? '開始前から表示' : milliseconds(frame.inputMs);
  appendRow(scheduleBody, frame.id, [input, milliseconds(frame.readyMs)]);
}

for (const scan of scans) {
  const option = document.createElement('option');
  option.value = String(scan.index);
  option.textContent = `第${scan.index + 1}走査（${timeRange(scan)}）`;
  scanSelector.append(option);
}
scanSelector.disabled = false;
playback.disabled = false;
renderScan(selectedIndex);
