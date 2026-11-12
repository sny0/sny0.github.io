const UNITS_PER_MS = 3;
const SCAN_UNITS = 50;
const VRR_MAX_INTERVAL = 75;
const SLOW_SPEED = 0.045;
const completionTimes = [0, 20, 40, 58, 80, 100, 120, 142, 160, 180, 202, 220, 240];
const frames = completionTimes.map((ms, index) => ({
  id: String.fromCharCode(65 + index),
  index,
  ready: ms * UNITS_PER_MS,
}));
const finalTime = completionTimes.at(-1);
const modes = [
  { id: 'off', title: 'VSync オフ', fill: '#ffebdd', stroke: '#a55226' },
  { id: 'on', title: 'VSync オン', fill: '#e3effb', stroke: '#286995' },
  { id: 'vrr', title: 'VRR', fill: '#e1f3e8', stroke: '#287450' },
];

function latestFrame(at) {
  return frames.findLast(frame => frame.ready <= at);
}

function makeScan(start, bands, previous) {
  const end = start + SCAN_UNITS;
  return {
    start,
    end,
    bands,
    repeated: bands.length === 1 && previous?.bands.at(-1).frame === bands[0].frame,
  };
}

function fixedScans(immediate) {
  const scans = [];
  for (let start = 0; start <= finalTime * UNITS_PER_MS; start += SCAN_UNITS) {
    const end = start + SCAN_UNITS;
    const current = latestFrame(start);
    const arrivals = immediate ? frames.filter(frame => frame.ready > start && frame.ready < end) : [];
    const bands = [current, ...arrivals].map((frame, index) => ({
      frame,
      from: index === 0 ? start : frame.ready,
      to: arrivals[index]?.ready ?? end,
    }));
    scans.push(makeScan(start, bands, scans.at(-1)));
  }
  return scans;
}

function variableScans() {
  const scans = [];
  let start = 0;
  while (start <= finalTime * UNITS_PER_MS) {
    const frame = latestFrame(start);
    scans.push(makeScan(start, [{ frame, from: start, to: start + SCAN_UNITS }], scans.at(-1)));
    const nextReady = frames[frame.index + 1]?.ready ?? Infinity;
    // Wait between scans. The short and long bounds model 60 Hz and 40 Hz.
    start = Math.min(Math.max(start + SCAN_UNITS, nextReady), start + VRR_MAX_INTERVAL);
  }
  return scans;
}

const scansByMode = {
  off: fixedScans(true),
  on: fixedScans(false),
  vrr: variableScans(),
};

const canvas = document.querySelector('#view');
const timeline = document.querySelector('#timeline');
const status = document.querySelector('#status');
const modeControls = document.querySelector('#modes');
const playButton = document.querySelector('#play');
const stepButton = document.querySelector('#step');
const exampleButton = document.querySelector('#example');
const timeInput = document.querySelector('#time');
const timeLabel = document.querySelector('#time-label');
const context = canvas.getContext('2d');
const { width, height } = canvas;
const SVG_NS = 'http://www.w3.org/2000/svg';

function ms(units) {
  return units / UNITS_PER_MS;
}

function drawScene(frame) {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#1b3d56');
  sky.addColorStop(1, '#52788a');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#325369';
  for (let x = 0; x < width; x += 72) {
    context.fillRect(x, 103 + (x % 168) / 4, 50, 130);
  }
  context.fillStyle = '#223f4d';
  context.fillRect(0, 204, width, 84);
  context.fillStyle = '#47616a';
  context.fillRect(0, 232, width, 5);
  context.fillRect(0, 259, width, 5);
  context.fillStyle = '#89a1a9';
  for (let x = 24; x < width; x += 48) context.fillRect(x, 253, 2, 15);

  const left = 49 + frame.index * 40;
  context.fillStyle = '#182c3d';
  context.fillRect(left + 8, 211, 160, 15);
  context.fillStyle = '#f3b34e';
  context.beginPath();
  context.roundRect(left, 18, 176, 196, 13);
  context.fill();
  context.fillStyle = '#f9d998';
  context.fillRect(left + 5, 37, 166, 9);
  context.fillStyle = '#193951';
  context.fillRect(left + 15, 57, 143, 74);
  context.fillStyle = '#6094ad';
  context.fillRect(left + 20, 62, 61, 62);
  context.fillRect(left + 90, 62, 63, 62);
  context.fillStyle = '#ca7b31';
  context.fillRect(left, 151, 176, 16);
  context.fillStyle = '#152b3c';
  for (const wheel of [left + 32, left + 143]) {
    context.beginPath();
    context.arc(wheel, 222, 13, 0, Math.PI * 2);
    context.fill();
  }
}

function drawScreen(scan) {
  for (const band of scan.bands) {
    const top = Math.round((band.from - scan.start) * height / SCAN_UNITS);
    const bottom = Math.round((band.to - scan.start) * height / SCAN_UNITS);
    context.save();
    context.beginPath();
    context.rect(0, top, width, bottom - top);
    context.clip();
    drawScene(band.frame);
    context.restore();
  }
  for (const band of scan.bands.slice(1)) {
    const row = Math.round((band.from - scan.start) * height / SCAN_UNITS);
    context.fillStyle = '#ffe3ab';
    context.fillRect(0, row, width, 2);
  }
}

function svgElement(name, attributes, content) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (content !== undefined) element.textContent = content;
  return element;
}

function buildTimeline(startMs, selectedMode) {
  const span = 80;
  const start = startMs * UNITS_PER_MS;
  const end = (startMs + span) * UNITS_PER_MS;
  const left = 111;
  const scale = 512 / (span * UNITS_PER_MS);
  const x = at => left + (at - start) * scale;
  timeline.replaceChildren();
  timeline.dataset.windowStart = startMs;

  for (let t = startMs; t <= startMs + span; t += 20) {
    const tickX = x(t * UNITS_PER_MS);
    timeline.append(
      svgElement('path', { d: 'M' + tickX + ' 22V150', stroke: '#aabccc', 'stroke-dasharray': '3 4' }),
      svgElement('text', { x: tickX, y: 17, 'text-anchor': t === startMs + span ? 'end' : 'middle', fill: '#41576c', 'font-size': 14 }, t + ' ms'),
    );
  }
  timeline.append(svgElement('text', { x: 10, y: 42, fill: '#203248', 'font-size': 15 }, '描画完了'));
  for (const frame of frames.filter(frame => frame.ready >= start && frame.ready <= end)) {
    const markerX = x(frame.ready);
    timeline.append(
      svgElement('circle', { cx: markerX, cy: 37, r: 4, fill: '#344d68' }),
      svgElement('text', { x: markerX + 8, y: 42, fill: '#203248', 'font-size': 14 }, frame.id),
    );
  }

  modes.forEach((mode, index) => {
    const y = 51 + index * 33;
    timeline.append(svgElement('text', {
      x: 10, y: y + 17, fill: mode.stroke, 'font-size': 15, 'font-weight': selectedMode === mode.id ? 750 : 500,
    }, mode.title));
    for (const scan of scansByMode[mode.id].filter(scan => scan.end > start && scan.start < end)) {
      const scanStart = x(Math.max(scan.start, start));
      const scanEnd = x(Math.min(scan.end, end));
      timeline.append(svgElement('rect', {
        x: scanStart, y, width: scanEnd - scanStart, height: 25, fill: mode.fill, stroke: mode.stroke,
        'stroke-width': selectedMode === mode.id ? 1.6 : 1,
      }));
      for (const band of scan.bands.filter(band => band.to > start && band.from < end)) {
        const bandStart = x(Math.max(band.from, start));
        const bandEnd = x(Math.min(band.to, end));
        if (bandStart > scanStart) {
          timeline.append(svgElement('path', { d: 'M' + bandStart + ' ' + y + 'v25', stroke: mode.stroke, 'stroke-dasharray': '2 2' }));
        }
        if (bandEnd - bandStart < 13) continue;
        const label = band.frame.id + (scan.repeated && bandEnd - bandStart >= 27 ? '↻' : '');
        timeline.append(svgElement('text', {
          x: (bandStart + bandEnd) / 2, y: y + 17, 'text-anchor': 'middle', fill: '#203248', 'font-size': 14,
        }, label));
      }
    }
  });
  const cursor = svgElement('path', { stroke: '#203248', 'stroke-width': 2, 'data-cursor': '' });
  timeline.append(cursor);
  return { cursor, x };
}

function initialize() {
  let requestedFrame;
  let lastWallTime;
  let timeMs = Number(timeInput.value);
  let shownMode;
  let shownScan;
  let wasScanning;
  let chartStart;
  let chartMode;
  let chart;

  function render() {
    const mode = modeControls.querySelector('input:checked').value;
    const at = timeMs * UNITS_PER_MS;
    const scan = scansByMode[mode].findLast(candidate => candidate.start <= at);
    const scanning = at < scan.end;
    const frameIds = scan.bands.map(band => band.frame.id);
    const seams = scan.bands.slice(1).map(band => (band.from - scan.start) / SCAN_UNITS);
    timeInput.value = timeMs;
    timeLabel.value = timeMs.toFixed(1) + ' ms';

    if (scan !== shownScan || mode !== shownMode) {
      drawScreen(scan);
      Object.assign(canvas.dataset, {
        mode, scanStart: ms(scan.start), scanEnd: ms(scan.end), frameIds: frameIds.join(','), seams: seams.join(','),
      });
    }
    if (scan !== shownScan || mode !== shownMode || scanning !== wasScanning) {
      canvas.dataset.scanning = String(scanning);
      const interval = ms(scan.start).toFixed(2) + '〜' + ms(scan.end).toFixed(2) + ' msの走査';
      const result = seams.length
        ? '上から ' + frameIds.join(' → ') + '。継ぎ目は上から ' + seams.map(seam => Math.round(seam * 100) + '%').join('、') + '。'
        : '画面全体が ' + frameIds[0] + (scan.repeated ? '（同じ絵を再表示）。' : '。');
      status.textContent = (scanning ? interval : '次の走査を待機中。直前は' + interval) + '。' + result;
      shownScan = scan;
      shownMode = mode;
      wasScanning = scanning;
    }

    const windowStart = Math.min(160, Math.floor(timeMs / 80) * 80);
    if (windowStart !== chartStart || mode !== chartMode) {
      chart = buildTimeline(windowStart, mode);
      chartStart = windowStart;
      chartMode = mode;
    }
    chart.cursor.setAttribute('d', 'M' + chart.x(at) + ' 23V148');
  }

  function pause() {
    if (requestedFrame !== undefined) cancelAnimationFrame(requestedFrame);
    requestedFrame = undefined;
    lastWallTime = undefined;
    playButton.textContent = 'スロー再生';
    status.setAttribute('aria-live', 'polite');
  }

  function play(now) {
    if (lastWallTime !== undefined) timeMs = Math.min(finalTime, timeMs + (now - lastWallTime) * SLOW_SPEED);
    lastWallTime = now;
    render();
    if (timeMs >= finalTime) {
      pause();
    } else {
      requestedFrame = requestAnimationFrame(play);
    }
  }

  function jump(target) {
    pause();
    timeMs = target;
    render();
  }

  playButton.addEventListener('click', () => {
    if (requestedFrame !== undefined) {
      pause();
      return;
    }
    if (timeMs >= finalTime) timeMs = 0;
    playButton.textContent = '一時停止';
    status.setAttribute('aria-live', 'off');
    requestedFrame = requestAnimationFrame(play);
  });
  stepButton.addEventListener('click', () => jump(completionTimes.find(ms => ms > timeMs) ?? 0));
  exampleButton.addEventListener('click', () => jump(20));
  timeInput.addEventListener('input', () => jump(Number(timeInput.value)));
  modeControls.addEventListener('change', render);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  render();
  canvas.dataset.renderState = 'ready';
  modeControls.disabled = false;
  for (const control of [playButton, stepButton, exampleButton, timeInput]) control.disabled = false;
}

if (context) {
  initialize();
} else {
  canvas.dataset.renderState = 'error';
  status.dataset.error = 'true';
  status.textContent = 'このブラウザーではCanvas 2Dを利用できません。実践の解説で走査の違いを確認できます。';
  timeline.hidden = true;
}
