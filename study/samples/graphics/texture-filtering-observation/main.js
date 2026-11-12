const canvas = document.querySelector('#view');
const controls = document.querySelector('#controls');
const motionInput = document.querySelector('#motion');
const anisotropicInput = document.querySelector('input[value="anisotropic"]');
const anisotropyStatus = document.querySelector('#anisotropy-status');
const status = document.querySelector('#status');
const filterValues = document.querySelector('#filter-values');

const vertexSource = `#version 300 es
layout(location = 0) in vec2 a_floor;
uniform float u_aspect;
uniform float u_camera_x;
out vec2 v_uv;

void main() {
    // Transform the horizontal floor into the camera's frame, then project it.
    vec3 relative = vec3(a_floor.x - u_camera_x, -1.6, a_floor.y);
    float yaw = radians(13.0);
    float pitch = radians(12.0);
    float x = cos(yaw) * relative.x - sin(yaw) * relative.z;
    float forward = sin(yaw) * relative.x + cos(yaw) * relative.z;
    float y = cos(pitch) * relative.y + sin(pitch) * forward;
    float depth = -sin(pitch) * relative.y + cos(pitch) * forward;

    float focal = 1.0 / tan(radians(26.0));
    float nearPlane = 0.2;
    float farPlane = 155.0;
    float clipDepth = ((farPlane + nearPlane) * depth - 2.0 * farPlane * nearPlane)
        / (farPlane - nearPlane);
    gl_Position = vec4(x * focal / u_aspect, y * focal, clipDepth, depth);
    v_uv = a_floor / 3.2;
}
`;

const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D u_floor;
in vec2 v_uv;
out vec4 outColor;

void main() {
    outColor = texture(u_floor, v_uv);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('シェーダーを作成できませんでした。');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error('シェーダーをコンパイルできませんでした。');
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let fragment;
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('描画プログラムを作成できませんでした。');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      throw new Error('描画プログラムをリンクできませんでした。');
    }
    return program;
  } finally {
    gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

function createFloorTexture(gl) {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const light = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      const detail = x % 2 === 0 ? -13 : 13;
      if (x < 2 || y < 2) {
        pixels.set([172, 119, 63, 255], offset);
      } else if (light) {
        pixels.set([222 + detail, 232 + detail, 218 + detail, 255], offset);
      } else {
        pixels.set([34 + detail, 67 + detail, 86 + detail, 255], offset);
      }
    }
  }
  const texture = gl.createTexture();
  if (!texture) throw new Error('床のテクスチャを作成できませんでした。');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);
}

function initialize() {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('この環境ではWebGL 2を利用できません。描画できるブラウザーで開いてください。');

  let frame = 0;
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    controls.disabled = true;
    canvas.dataset.renderState = 'lost';
    status.textContent = '描画が中断されました。復旧するとページを再読み込みします。';
  });
  canvas.addEventListener('webglcontextrestored', () => window.location.reload());

  const program = createProgram(gl);
  const floor = gl.createBuffer();
  const vao = gl.createVertexArray();
  if (!floor || !vao) throw new Error('床の頂点データを用意できませんでした。');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, floor);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -120, -20,
     120, -20,
    -120,  80,
     120,  80,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, 'u_floor'), 0);
  const aspect = gl.getUniformLocation(program, 'u_aspect');
  const cameraX = gl.getUniformLocation(program, 'u_camera_x');

  gl.activeTexture(gl.TEXTURE0);
  createFloorTexture(gl);
  gl.clearColor(0.10, 0.18, 0.25, 1);
  if (gl.getError() !== gl.NO_ERROR) throw new Error('描画の準備に失敗しました。');

  const extension = gl.getExtension('EXT_texture_filter_anisotropic');
  const maximum = extension ? gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
  const anisotropy = Math.min(8, maximum);
  const supportsAnisotropy = anisotropy > 1;
  controls.querySelector('input[value="point"]').checked = true;
  motionInput.checked = false;
  anisotropicInput.disabled = !supportsAnisotropy;
  anisotropyStatus.textContent = supportsAnisotropy
    ? '異方性に対応しています。この比較での設定値は' + anisotropy + '、環境の上限は' + maximum + 'です。'
    : 'この環境では異方性フィルタを利用できません。ほかの3方式を比べられます。';

  const filters = {
    point: {
      min: 'NEAREST', mag: 'NEAREST',
      note: 'ポイント。手前の模様の縁と、奥の細かな模様を見比べます。',
    },
    bilinear: {
      min: 'LINEAR', mag: 'LINEAR',
      note: 'バイリニア。手前の縁が滑らかになり、奥も基準レベルから読みます。',
    },
    mipmap: {
      min: 'LINEAR_MIPMAP_LINEAR', mag: 'LINEAR',
      note: 'トライリニア。縮小時は前後のミップレベルの結果を混ぜます。',
    },
    anisotropic: {
      min: 'LINEAR_MIPMAP_LINEAR', mag: 'LINEAR',
      note: '異方性。奥で模様が残る範囲を、トライリニアと比べます。',
    },
  };

  let cameraOffset = 0;
  let motionStart;
  function draw() {
    if (gl.isContextLost()) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(aspect, gl.drawingBufferWidth / gl.drawingBufferHeight);
    gl.uniform1f(cameraX, cameraOffset);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function changeFilter() {
    const mode = controls.querySelector('input[name="filter"]:checked').value;
    const filter = filters[mode];
    const amount = mode === 'anisotropic' ? anisotropy : 1;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[filter.min]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[filter.mag]);
    if (extension) gl.texParameterf(gl.TEXTURE_2D, extension.TEXTURE_MAX_ANISOTROPY_EXT, amount);
    draw();
    status.textContent = filter.note;
    filterValues.textContent = 'MIN ' + filter.min + ' · MAG ' + filter.mag + ' · 異方性 ' + amount;
    canvas.dataset.filter = mode;
  }

  function animate(now) {
    motionStart ??= now;
    cameraOffset = 0.35 * Math.sin((now - motionStart) * 0.0012);
    draw();
    frame = requestAnimationFrame(animate);
  }

  controls.querySelectorAll('input[name="filter"]').forEach(input => input.addEventListener('change', changeFilter));
  motionInput.addEventListener('change', () => {
    if (motionInput.checked) {
      motionStart = undefined;
      frame = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(frame);
      cameraOffset = 0;
      draw();
    }
    canvas.dataset.motion = motionInput.checked ? 'on' : 'off';
  });
  new ResizeObserver(draw).observe(canvas);
  window.addEventListener('resize', draw);
  changeFilter();
  filterValues.hidden = false;
  controls.disabled = false;
  canvas.dataset.motion = 'off';
  canvas.dataset.renderState = 'ready';
}

try {
  initialize();
} catch (error) {
  canvas.dataset.renderState = 'error';
  status.dataset.error = 'true';
  status.textContent = error.message;
}
