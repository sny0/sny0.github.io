const canvas = document.querySelector('#view');
const controls = document.querySelector('#controls');
const auto = document.querySelector('#auto');
const step = document.querySelector('#step');
const reset = document.querySelector('#reset-history');
const status = document.querySelector('#status');
const historyInfo = document.querySelector('#history');
const slots = [...document.querySelectorAll('#phase-grid [data-phase]')];

const vertexSource = `#version 300 es
void main() {
    vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

const sceneSource = `#version 300 es
precision highp float;
uniform vec2 u_output_size;
uniform float u_scale;
uniform vec2 u_offset;
out vec4 outColor;

void main() {
    // Express every sample position in the same output-pixel coordinate system.
    vec2 uv = (gl_FragCoord.xy * u_scale + u_offset) / u_output_size;
    const float horizon = 0.62;
    vec3 color = mix(vec3(0.12, 0.25, 0.35), vec3(0.045, 0.105, 0.18), uv.y);

    if (uv.y < horizon) {
        float z = 0.8 / max(horizon - uv.y, 0.002);
        float x = (uv.x - 0.46) * z * 1.75;
        vec2 tiled = mat2(0.98, 0.20, -0.20, 0.98) * vec2(x, z) * 2.0;
        float checker = mod(floor(tiled.x) + floor(tiled.y), 2.0);
        vec3 floorColor = mix(vec3(0.10, 0.24, 0.31), vec3(0.76, 0.87, 0.83), checker);
        if (abs(abs(x) - 0.56) < 0.026) {
            floorColor = vec3(0.95, 0.67, 0.22);
        }
        color = mix(floorColor, vec3(0.34, 0.47, 0.51), smoothstep(7.0, 30.0, z));
    }

    // Thin rails and posts make differences along the diagonal easy to see.
    float railY = 0.49 - 0.58 * (uv.x - 0.59);
    if (uv.x > 0.59 && uv.x < 0.96) {
        float localY = uv.y - railY;
        float post = abs(fract((uv.x - 0.59) * 31.0) - 0.5);
        bool onRail = abs(localY) < 0.0034 || abs(localY - 0.049) < 0.0032;
        bool onPost = post < 0.067 && localY > -0.018 && localY < 0.049;
        if (onRail || onPost) color = vec3(1.0, 0.83, 0.43);
    }

    // A slanted sign adds another high-contrast edge at a different angle.
    vec2 signPosition = uv - vec2(0.30, 0.60);
    signPosition.y += 0.32 * signPosition.x;
    if (abs(signPosition.x) < 0.125 && abs(signPosition.y) < 0.079) {
        color = vec3(0.06, 0.15, 0.20);
        if (abs(signPosition.x) > 0.114 || abs(signPosition.y) > 0.067) {
            color = vec3(0.89, 0.94, 0.82);
        } else if (abs(signPosition.y) < 0.029) {
            float stripe = fract((signPosition.x + 0.58 * signPosition.y) * 59.0);
            if (stripe < 0.47) color = vec3(1.0, 0.75, 0.27);
        }
    }
    outColor = vec4(color, 1.0);
}
`;

const resolveSource = `#version 300 es
precision highp float;
uniform vec2 u_output_size;
uniform vec2 u_offset;
uniform int u_phase;
uniform sampler2D u_current;
uniform sampler2D u_history;
out vec4 outColor;

void main() {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    int slot = (pixel.x & 1) + 2 * (pixel.y & 1);

    if (slot == u_phase) {
        outColor = texelFetch(u_current, pixel / 2, 0);
    } else if (slot < u_phase) {
        outColor = texelFetch(u_history, pixel, 0);
    } else {
        // Estimate the missing positions on the current low-resolution lattice.
        vec2 lowUV = (gl_FragCoord.xy - u_offset) / u_output_size;
        outColor = textureLod(u_current, lowUV, 0.0);
    }
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('シェーダーを作成できませんでした。');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('シェーダーをコンパイルできませんでした。' + (log ? ' ' + log : ''));
  }
  return shader;
}

function createProgram(gl, vertex, fragmentSource, names) {
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  try {
    const program = gl.createProgram();
    if (!program) throw new Error('描画プログラムを作成できませんでした。');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error('描画プログラムをリンクできませんでした。' + (log ? ' ' + log : ''));
    }
    const uniforms = Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, 'u_' + name)]));
    return { program, uniforms };
  } finally {
    gl.deleteShader(fragment);
  }
}

function createTarget(gl, width, height, filter) {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) throw new Error('描画先を用意できませんでした。');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('描画先が利用できません。');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { texture, framebuffer };
}

function initialize() {
  const gl = canvas.getContext('webgl2', {
    alpha: true, antialias: false, depth: false, preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('この環境ではWebGL 2を利用できません。描画できるブラウザーで開いてください。');

  const width = canvas.width;
  const height = canvas.height;
  const lowWidth = width / 2;
  const lowHeight = height / 2;
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let scene;
  let resolve;
  try {
    scene = createProgram(gl, vertex, sceneSource, ['output_size', 'scale', 'offset']);
    resolve = createProgram(gl, vertex, resolveSource, ['output_size', 'offset', 'phase', 'current', 'history']);
  } finally {
    gl.deleteShader(vertex);
  }
  const geometry = gl.createVertexArray();
  if (!geometry) throw new Error('全画面描画を準備できませんでした。');
  gl.bindVertexArray(geometry);
  gl.disable(gl.DITHER);

  const input = createTarget(gl, lowWidth, lowHeight, gl.LINEAR);
  const history = [
    createTarget(gl, width, height, gl.NEAREST),
    createTarget(gl, width, height, gl.NEAREST),
  ];

  let mode = 'native';
  let historyIndex = 0;
  let historyFrames = 0;
  let timer;

  function renderScene(target, scale, x, y) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, width / scale, height / scale);
    gl.useProgram(scene.program);
    gl.uniform2f(scene.uniforms.output_size, width, height);
    gl.uniform1f(scene.uniforms.scale, scale);
    gl.uniform2f(scene.uniforms.offset, x, y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function reconstruct(target, phase, x, y) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, width, height);
    gl.useProgram(resolve.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, input.texture);
    gl.uniform1i(resolve.uniforms.current, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, history[historyIndex].texture);
    gl.uniform1i(resolve.uniforms.history, 1);
    gl.uniform2f(resolve.uniforms.output_size, width, height);
    gl.uniform2f(resolve.uniforms.offset, x, y);
    gl.uniform1i(resolve.uniforms.phase, phase);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function drawBilinear() {
    renderScene(input.framebuffer, 2, 0, 0);
    reconstruct(null, -1, 0, 0);
  }

  function update() {
    const temporal = mode === 'temporal';
    canvas.dataset.mode = mode;
    canvas.dataset.historyFrames = historyFrames;
    step.disabled = !temporal || historyFrames === 4;
    reset.disabled = !temporal;
    historyInfo.hidden = !temporal;
    if (mode === 'native') {
      status.textContent = 'ネイティブ描画 · 入力384×216 → 出力384×216';
    } else if (mode === 'bilinear') {
      status.textContent = 'バイリニア拡大 · 入力192×108 → 出力384×216';
    } else {
      status.textContent = '時間方向のアップスケーリング · 入力192×108 → 出力384×216 · 履歴 ' + historyFrames + '/4';
      for (const slot of slots) {
        const filled = Number(slot.dataset.phase) < historyFrames;
        slot.classList.toggle('filled', filled);
        slot.querySelector('span').textContent = filled ? '取得済み' : '未取得';
      }
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (mode === 'temporal' && auto.checked && historyFrames < 4) {
      timer = setTimeout(advance, 550);
    }
  }

  function advance() {
    if (mode !== 'temporal' || historyFrames === 4) return;
    const phase = historyFrames;
    const x = (phase % 2) - 0.5;
    const y = Math.floor(phase / 2) - 0.5;
    renderScene(input.framebuffer, 2, x, y);
    const next = 1 - historyIndex;
    reconstruct(history[next].framebuffer, phase, x, y);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, history[next].framebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    historyIndex = next;
    historyFrames++;
    update();
    schedule();
  }

  function chooseMode() {
    clearTimeout(timer);
    mode = controls.querySelector('input[name="mode"]:checked').value;
    historyFrames = 0;
    historyIndex = 0;
    if (mode === 'temporal') {
      advance();
    } else {
      if (mode === 'native') renderScene(null, 1, 0, 0);
      else drawBilinear();
      update();
    }
  }

  controls.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener('change', chooseMode));
  auto.addEventListener('change', schedule);
  step.addEventListener('click', advance);
  reset.addEventListener('click', () => {
    historyFrames = 0;
    historyIndex = 0;
    drawBilinear();
    update();
    schedule();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    clearTimeout(timer);
    controls.disabled = true;
    canvas.dataset.renderState = 'lost';
    status.textContent = '描画が中断されました。復旧するとページを再読み込みします。';
  });
  canvas.addEventListener('webglcontextrestored', () => window.location.reload());

  chooseMode();
  if (gl.getError() !== gl.NO_ERROR) throw new Error('シーンを描画できませんでした。');
  controls.disabled = false;
  canvas.dataset.renderState = 'ready';
}

try {
  initialize();
} catch (error) {
  canvas.dataset.renderState = 'error';
  status.dataset.error = 'true';
  status.textContent = error.message;
}
