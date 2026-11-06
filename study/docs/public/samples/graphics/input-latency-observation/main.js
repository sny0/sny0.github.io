const inputAt = 7;
const cpuMs = 2;
const gpuMs = 4;
const axisEnd = 70;

export function calculateLatency({ pollMs, queueMs, refreshHz, rowPercent }) {
  const pollAt = Math.ceil(inputAt / pollMs) * pollMs;
  const submitAt = pollAt + cpuMs;
  const gpuAt = submitAt + queueMs;
  const readyAt = gpuAt + gpuMs;
  // These refresh rates divide 3000 evenly. Compare in units of 1/3 ms.
  const refreshUnits = 3000 / refreshHz;
  const scanAt = Math.ceil(readyAt * 3 / refreshUnits) * refreshUnits / 3;
  const rowAt = scanAt + (refreshUnits / 3) * (rowPercent / 100);
  return { pollAt, submitAt, gpuAt, readyAt, scanAt, rowAt, latency: rowAt - inputAt };
}

function milliseconds(value) {
  return `${value.toFixed(2)} ms`;
}

function createSegment([label, start, end, kind]) {
  const item = document.createElement('li');
  const name = document.createElement('span');
  name.textContent = label;
  const track = document.createElement('span');
  track.className = 'track';
  track.setAttribute('aria-hidden', 'true');
  const bar = document.createElement('span');
  bar.className = `bar ${kind}`;
  bar.style.setProperty('--start', `${start / axisEnd * 100}%`);
  bar.style.setProperty('--width', `${(end - start) / axisEnd * 100}%`);
  track.append(bar);
  const interval = document.createElement('span');
  interval.className = 'interval';
  interval.textContent = `${start.toFixed(2)}〜${milliseconds(end)}（${milliseconds(end - start)}）`;
  item.append(name, track, interval);
  return item;
}

function render() {
  const value = (id) => Number(document.getElementById(id).value);
  const queueMs = value('queue');
  const rowPercent = value('row');
  const { pollAt, submitAt, gpuAt, readyAt, scanAt, rowAt, latency } = calculateLatency({
    pollMs: value('polling'), queueMs, refreshHz: value('refresh'), rowPercent,
  });
  const segments = [
    ['入力の待ち', inputAt, pollAt, 'wait'],
    ['CPU処理', pollAt, submitAt, 'work'],
    ['GPUの待ち', submitAt, gpuAt, 'wait'],
    ['GPU描画', gpuAt, readyAt, 'work'],
    ['表示の待ち', readyAt, scanAt, 'wait'],
    ['対象行まで', scanAt, rowAt, 'scan'],
  ];
  document.getElementById('timeline').replaceChildren(...segments.map(createSegment));
  document.getElementById('queue-value').textContent = `${queueMs} ms`;
  document.getElementById('row-value').textContent = `上から${rowPercent}%`;
  document.getElementById('ready-at').textContent = milliseconds(readyAt);
  document.getElementById('scan-at').textContent = milliseconds(scanAt);
  document.getElementById('row-at').textContent = milliseconds(rowAt);
  document.getElementById('latency').textContent = milliseconds(latency);
}

if (typeof document !== 'undefined') {
  const settings = document.getElementById('settings');
  settings.addEventListener('input', render);
  document.getElementById('reset-settings').addEventListener('click', () => {
    settings.reset();
    render();
  });
  render();
}
