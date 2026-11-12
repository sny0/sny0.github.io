const canvas = document.querySelector('#view');
const controls = document.querySelector('#controls');
const generationInput = document.querySelector('#frame-generation');
const slowInput = document.querySelector('#slow-motion');
const actionButton = document.querySelector('#toggle-color');
const status = document.querySelector('#status');
const announcement = document.querySelector('#announcement');
const context = canvas.getContext('2d', { alpha: false });

const baseRate = 30;
const basePeriod = 1000 / baseRate;
const epsilon = 0.0001;
const paintColors = { blue: '#1784a4', orange: '#c36121' };

function drawTrack(context) {
  const sky = context.createLinearGradient(0, 0, 0, 145);
  sky.addColorStop(0, '#152b40');
  sky.addColorStop(1, '#356078');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, 145);

  context.fillStyle = '#294752';
  context.fillRect(0, 145, canvas.width, 71);
  context.fillStyle = '#3a6572';
  context.fillRect(0, 145, canvas.width, 3);
  context.fillStyle = '#36515f';
  context.fillRect(0, 185, canvas.width, 31);

  for (let x = 24; x < canvas.width; x += 24) {
    const major = x % 96 === 0;
    context.fillStyle = major ? '#718fa0' : '#4c6e80';
    context.fillRect(x, 151, 1, major ? 11 : 6);
    context.fillStyle = major ? '#95adad' : '#6d9196';
    context.fillRect(x, 184, 1, major ? 13 : 8);
  }
}

function drawRobot(context, x, color) {
  context.save();
  context.translate(x, 0);

  context.fillStyle = '#1d353e';
  context.beginPath();
  context.ellipse(0, 168, 37, 5, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#12283a';
  context.fillRect(-17, 120, 34, 23);
  context.fillRect(-25, 140, 50, 16);
  context.fillStyle = '#8cabb1';
  context.fillRect(-17, 144, 6, 7);
  context.fillRect(11, 144, 6, 7);

  context.fillStyle = '#9ab8c8';
  context.fillRect(-2, 54, 4, 16);
  context.fillRect(-5, 51, 10, 5);
  context.fillRect(-19, 66, 38, 26);
  context.fillRect(-24, 89, 48, 40);
  context.fillStyle = paintColors[color];
  context.fillRect(-16, 69, 32, 20);
  context.fillRect(-21, 92, 42, 34);
  context.fillStyle = '#142a3b';
  context.fillRect(-12, 74, 24, 10);
  context.fillStyle = '#a0e4f2';
  context.fillRect(-8, 77, 5, 4);
  context.fillRect(3, 77, 5, 4);
  context.restore();
}

function createBuffer() {
  const image = document.createElement('canvas');
  image.width = canvas.width;
  image.height = canvas.height;
  const drawing = image.getContext('2d', { alpha: false });
  return drawing ? { image, drawing } : null;
}

function setup(track, baseBuffers) {
  drawTrack(track.drawing);
  function paintScene(drawing, frame) {
    drawing.drawImage(track.image, 0, 0);
    drawRobot(drawing, frame.x, frame.color);
  }

  let anchorWallMs;
  let anchorSimMs = 0;
  let speed = 1;
  let current = makeBaseFrame(0, 'blue', baseBuffers[0]);
  let previous = current;
  let pending;
  let measuredInput;
  let lastMode;
  let lastDisplayTick;

  function makeBaseFrame(tick, color, buffer) {
    const phase = tick * 2 * Math.PI / (baseRate * 5);
    const frame = { tick, color, x: 76 + 488 * (1 - Math.cos(phase)) / 2, kind: 'base', buffer };
    paintScene(buffer.drawing, frame);
    return frame;
  }

  function modelTime(now) {
    return anchorWallMs === undefined ? 0 : anchorSimMs + Math.max(0, now - anchorWallMs) * speed;
  }

  function tickAt(time) {
    return Math.floor((time + epsilon) / basePeriod);
  }

  function simulateTo(tick) {
    if (tick <= current.tick) return;
    let color = current.color;
    let previousColor = color;
    if (pending && tick >= pending.sampleTick) {
      color = color === 'blue' ? 'orange' : 'blue';
      if (tick > pending.sampleTick) previousColor = color;
      measuredInput = { ...pending, color };
      pending = undefined;
    }
    const nextBuffer = current.buffer === baseBuffers[0] ? baseBuffers[1] : baseBuffers[0];
    previous = tick === current.tick + 1 ? current : makeBaseFrame(tick - 1, previousColor, current.buffer);
    current = makeBaseFrame(tick, color, nextBuffer);
  }

  function chooseDisplayFrame(time, useGeneration) {
    if (!useGeneration) return current;
    if (current.tick === 0 || time + epsilon < (current.tick + 0.5) * basePeriod) return previous;
    // Both source frames are available. Interpolate motion and carry A's discrete color.
    return {
      tick: previous.tick + 0.5,
      color: previous.color,
      x: (previous.x + current.x) / 2,
      kind: 'generated',
    };
  }

  function setInputWaiting(waiting) {
    generationInput.disabled = waiting;
    slowInput.disabled = waiting;
    actionButton.setAttribute('aria-disabled', String(waiting));
  }

  function recordPresentation(frame) {
    if (!measuredInput || frame.color !== measuredInput.color) return;
    const input = measuredInput;
    const elapsedMs = Math.max(0, performance.now() - input.wallMs);
    const scheduledDelayMs = input.sampleTick * basePeriod + input.queueMs - input.inputSimMs;
    const row = document.querySelector('#measurement-' + input.mode);
    Object.assign(row.dataset, {
      inputSimMs: input.inputSimMs,
      sampleTick: input.sampleTick,
      shownTick: frame.tick,
      scheduledDelayMs,
      elapsedMs,
    });
    const value = elapsedMs.toFixed(1) + ' ms' + (input.speed < 1 ? '（スロー）' : '');
    row.querySelector('.elapsed').textContent = value;
    announcement.textContent = 'フレーム生成' + (input.mode === 'on' ? 'オン' : 'オフ') + 'の計測結果 ' + value;
    measuredInput = undefined;
    setInputWaiting(false);
  }

  function updateStatus(frame, useGeneration) {
    const label = frame.kind === 'generated' ? '生成フレーム' : '基礎フレーム';
    const color = frame.color === 'blue' ? '青' : 'オレンジ';
    const outputRate = baseRate * (useGeneration ? 2 : 1) * speed;
    status.textContent = label + 'を表示中 · 色 ' + color + ' · 表示予定 ' + outputRate + ' 枚/秒';
  }

  function animate(now) {
    anchorWallMs ??= now;
    const time = modelTime(now);
    simulateTo(tickAt(time));
    const useGeneration = generationInput.checked;
    const frame = chooseDisplayFrame(time, useGeneration);
    const mode = useGeneration ? 'on' : 'off';

    Object.assign(canvas.dataset, {
      mode,
      frameKind: frame.kind,
      simulationTick: current.tick,
      displayTick: frame.tick,
      robotX: frame.x,
      color: frame.color,
      queueMs: useGeneration ? basePeriod : 0,
      speed,
    });
    if (frame.tick !== lastDisplayTick || mode !== lastMode) {
      if (frame.buffer) {
        context.drawImage(frame.buffer.image, 0, 0);
      } else {
        paintScene(context, frame);
      }
      updateStatus(frame, useGeneration);
      recordPresentation(frame);
      lastDisplayTick = frame.tick;
      lastMode = mode;
    }
    requestAnimationFrame(animate);
  }

  function changeSpeed() {
    const now = performance.now();
    anchorSimMs = modelTime(now);
    anchorWallMs = now;
    speed = slowInput.checked ? 0.25 : 1;
    lastDisplayTick = undefined;
  }

  function queueColorChange() {
    if (pending || measuredInput) return;
    const wallMs = performance.now();
    const inputSimMs = modelTime(wallMs);
    const useGeneration = generationInput.checked;
    pending = {
      mode: useGeneration ? 'on' : 'off',
      wallMs,
      inputSimMs,
      sampleTick: Math.max(tickAt(inputSimMs), current.tick) + 1,
      queueMs: useGeneration ? basePeriod : 0,
      speed,
    };
    setInputWaiting(true);
  }

  slowInput.addEventListener('change', changeSpeed);
  actionButton.addEventListener('click', queueColorChange);
  window.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat || event.target.closest?.('button, input, a')) return;
    event.preventDefault();
    queueColorChange();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pending = undefined;
      measuredInput = undefined;
      setInputWaiting(false);
    }
  });
  generationInput.checked = false;
  slowInput.checked = false;
  controls.disabled = false;
  canvas.dataset.renderState = 'ready';
  requestAnimationFrame(animate);
}

const buffers = context ? [createBuffer(), createBuffer(), createBuffer()] : [];
if (buffers.length > 0 && buffers.every(Boolean)) {
  const [track, ...baseBuffers] = buffers;
  setup(track, baseBuffers);
} else {
  canvas.dataset.renderState = 'error';
  status.dataset.error = 'true';
  status.textContent = 'このブラウザーではCanvas 2Dを利用できません。実践の解説で表示順を確認できます。';
}
