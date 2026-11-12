const canvas = document.querySelector('#view');
const controls = document.querySelector('#controls');
const msaaInput = document.querySelector('#msaa');
const motionInput = document.querySelector('#motion');
const msaaStatus = document.querySelector('#msaa-status');
const status = document.querySelector('#status');

const vertexSource = `#version 300 es
layout(location = 0) in vec2 a_position;
uniform bool u_floor;
uniform float u_camera_x;
out vec2 v_uv;

void main() {
    if (u_floor) {
        vec3 relative = vec3(a_position.x - u_camera_x, -1.6, a_position.y);
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
        gl_Position = vec4(x * focal / (16.0 / 9.0), y * focal, clipDepth, depth);
        v_uv = a_position / 3.2;
    } else {
        // The triangle faces the camera at a fixed depth, so the shift is linear.
        gl_Position = vec4(a_position.x - u_camera_x * 0.28, a_position.y, 0.0, 1.0);
        v_uv = vec2(0.0);
    }
}
`;

const fragmentSource = `#version 300 es
precision highp float;
uniform bool u_floor;
uniform sampler2D u_checker;
in vec2 v_uv;
out vec4 outColor;

void main() {
    outColor = u_floor ? texture(u_checker, v_uv) : vec4(255.0, 195.0, 80.0, 255.0) / 255.0;
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
      const light = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      const color = light ? [225, 237, 225, 255] : [41, 76, 102, 255];
      pixels.set(color, (y * size + x) * 4);
    }
  }
  const texture = gl.createTexture();
  if (!texture) throw new Error('床のテクスチャを作成できませんでした。');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

function createColorTarget(gl, width, height, samples) {
  const framebuffer = gl.createFramebuffer();
  const color = gl.createRenderbuffer();
  let actualSamples = 0;
  let complete = false;

  if (framebuffer && color) {
    gl.bindRenderbuffer(gl.RENDERBUFFER, color);
    if (samples > 1) {
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, width, height);
      actualSamples = gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_SAMPLES);
    } else {
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, width, height);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);
    const targetStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    complete = gl.getError() === gl.NO_ERROR && targetStatus === gl.FRAMEBUFFER_COMPLETE;
  }

  if (complete && (samples <= 1 || actualSamples > 1)) {
    return { framebuffer, samples: actualSamples };
  }
  if (framebuffer) gl.deleteFramebuffer(framebuffer);
  if (color) gl.deleteRenderbuffer(color);
  return null;
}

function chooseSampleCount(gl) {
  const counts = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES) ?? [];
  const supported = Array.from(counts).filter(samples => samples > 1).sort((a, b) => b - a);
  return supported.find(samples => samples <= 4) ?? supported.at(-1) ?? 0;
}

function initialize() {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('この環境ではWebGL 2を利用できません。描画できるブラウザーで開いてください。');
  const width = canvas.width;
  const height = canvas.height;
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
  const vertices = gl.createBuffer();
  const vao = gl.createVertexArray();
  if (!vertices || !vao) throw new Error('頂点データを用意できませんでした。');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -120, -20, 120, -20, -120, 80, 120, 80,
    -0.68, -0.40, 0.62, 0.26, -0.22, 0.83,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);
  const isFloor = gl.getUniformLocation(program, 'u_floor');
  const cameraX = gl.getUniformLocation(program, 'u_camera_x');
  gl.uniform1i(gl.getUniformLocation(program, 'u_checker'), 0);

  gl.activeTexture(gl.TEXTURE0);
  createFloorTexture(gl);
  gl.clearColor(24 / 255, 43 / 255, 62 / 255, 1);
  gl.viewport(0, 0, width, height);
  if (gl.getError() !== gl.NO_ERROR) throw new Error('描画の準備に失敗しました。');
  const single = createColorTarget(gl, width, height, 0);
  if (!single) throw new Error('描画先を用意できませんでした。');
  const requestedSamples = chooseSampleCount(gl);
  const multi = requestedSamples > 1 ? createColorTarget(gl, width, height, requestedSamples) : null;
  msaaInput.checked = false;
  motionInput.checked = false;
  msaaInput.disabled = !multi;
  msaaStatus.textContent = multi
    ? 'この環境では、オンにすると' + multi.samples + 'サンプル／画素で描画します。'
    : 'この環境ではMSAAの描画先を用意できません。オフの状態で床と輪郭を観察できます。';

  let cameraOffset = 0;
  let motionStart;

  function copyColor(source, destination) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, source);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destination);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }

  function draw() {
    if (gl.isContextLost()) return;
    const useMsaa = Boolean(multi && msaaInput.checked);
    gl.bindFramebuffer(gl.FRAMEBUFFER, useMsaa ? multi.framebuffer : single.framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(cameraX, cameraOffset);
    gl.uniform1i(isFloor, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform1i(isFloor, 0);
    gl.drawArrays(gl.TRIANGLES, 4, 3);

    // Resolve into a same-size RGBA8 target before displaying it.
    if (useMsaa) copyColor(multi.framebuffer, single.framebuffer);
    copyColor(single.framebuffer, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function changeMsaa() {
    draw();
    const useMsaa = Boolean(multi && msaaInput.checked);
    const samples = useMsaa ? multi.samples : 1;
    canvas.dataset.msaa = useMsaa ? 'on' : 'off';
    canvas.dataset.samples = samples;
    status.textContent = 'MSAA ' + (useMsaa ? 'オン' : 'オフ') + ' · ' + samples + 'サンプル／画素';
  }

  function animate(now) {
    motionStart ??= now;
    cameraOffset = 0.45 * Math.sin((now - motionStart) * 0.0012);
    draw();
    frame = requestAnimationFrame(animate);
  }

  msaaInput.addEventListener('change', changeMsaa);
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
  changeMsaa();
  if (gl.getError() !== gl.NO_ERROR) throw new Error('シーンを描画できませんでした。');
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
