const canvas = document.querySelector('#view');
const controls = document.querySelector('#controls');
const taaInput = document.querySelector('#taa');
const cameraInput = document.querySelector('#camera-motion');
const objectInput = document.querySelector('#object-motion');
const rejectInput = document.querySelector('#reject-history');
const resetButton = document.querySelector('#reset-history');
const status = document.querySelector('#status');

const vertexSource = `#version 300 es
void main() {
    vec2 uv = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}
`;

const sceneGeometry = `
const float horizon = 0.37;
const float cameraHeight = 2.4;
const float horizontalScale = 0.65;
const float objectDepth = 5.8;
const float objectBottom = horizon - cameraHeight / objectDepth;
const int sky = 0;
const int floorSurface = 1;
const int objectSurface = 2;

float floorDepth(vec2 position) {
    return cameraHeight / (horizon - position.y);
}

int surfaceAt(vec2 position, vec2 pose) {
    float localY = (position.y - objectBottom) / 0.54;
    float worldX = position.x * objectDepth * horizontalScale + pose.x;
    float localX = (worldX - pose.y) / 0.70 + 0.20 * (localY - 0.5);
    if (localY > 0.0 && localY < 1.0 && abs(localX) < 1.0) return objectSurface;
    return position.y < horizon ? floorSurface : sky;
}
`;

const currentSource = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_pose;
uniform vec2 u_jitter;
uniform sampler2D u_checker;
out vec4 outColor;
` + sceneGeometry + `
void main() {
    vec2 position = (gl_FragCoord.xy + u_jitter) / u_resolution * 2.0 - 1.0;
    int surface = surfaceAt(position, u_pose);
    vec3 color = vec3(0.094, 0.169, 0.243);
    if (surface == objectSurface) {
        color = vec3(1.0, 0.70, 0.23);
    } else if (surface == floorSurface) {
        float depth = floorDepth(position);
        vec2 world = vec2(position.x * depth * horizontalScale + u_pose.x, depth);
        color = textureLod(u_checker, world / 4.6, 0.0).rgb;
    }
    outColor = vec4(color, 1.0);
}
`;

const resolveSource = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_pose;
uniform vec2 u_previous_pose;
uniform bool u_has_history;
uniform bool u_reject;
uniform sampler2D u_current;
uniform sampler2D u_history;
out vec4 outColor;
` + sceneGeometry + `
void main() {
    vec2 position = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;
    int surface = surfaceAt(position, u_pose);
    vec3 color = texelFetch(u_current, ivec2(gl_FragCoord.xy), 0).rgb;
    float surfaceCode = float(surface) * 0.5;

    if (u_has_history) {
        // A pose is (camera x, object x). Reproject the same point of the surface.
        vec2 previousPosition = position;
        float cameraDelta = u_pose.x - u_previous_pose.x;
        if (surface == floorSurface) {
            previousPosition.x += cameraDelta / (floorDepth(position) * horizontalScale);
        } else if (surface == objectSurface) {
            float objectDelta = u_previous_pose.y - u_pose.y;
            previousPosition.x += (cameraDelta + objectDelta) / (objectDepth * horizontalScale);
        }

        vec2 previousUV = previousPosition * 0.5 + 0.5;
        if (all(greaterThanEqual(previousUV, vec2(0.0))) && all(lessThan(previousUV, vec2(1.0)))) {
            ivec2 previousPixel = ivec2(previousUV * u_resolution);
            float previousSurface = texelFetch(u_history, previousPixel, 0).a;
            if (!u_reject || abs(previousSurface - surfaceCode) < 0.25) {
                color = mix(color, textureLod(u_history, previousUV, 0.0).rgb, 0.90);
            }
        }
    }

    // Alpha identifies the surface at this output position for the next frame.
    outColor = vec4(color, surfaceCode);
}
`;

const displaySource = `#version 300 es
precision highp float;
uniform sampler2D u_image;
out vec4 outColor;
void main() {
    outColor = vec4(texelFetch(u_image, ivec2(gl_FragCoord.xy), 0).rgb, 1.0);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('シェーダーを作成できませんでした。');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  throw new Error('シェーダーをコンパイルできませんでした。');
}

function createProgram(gl, vertex, source, uniforms) {
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, source);
  const program = gl.createProgram();
  try {
    if (!program) throw new Error('描画プログラムを作成できませんでした。');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      throw new Error('描画プログラムをリンクできませんでした。');
    }
    return {
      program,
      uniforms: Object.fromEntries(uniforms.map(name => [name, gl.getUniformLocation(program, 'u_' + name)])),
    };
  } finally {
    gl.deleteShader(fragment);
  }
}

function createTexture(gl, width, height, filtering, wrapping, pixels) {
  const texture = gl.createTexture();
  if (!texture) throw new Error('画像の保存領域を作成できませんでした。');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapping);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapping);
  return texture;
}

function createChecker(gl) {
  const size = 64;
  const light = [219, 228, 199, 255];
  const dark = [31, 69, 87, 255];
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const odd = (Math.floor(x / 4) + Math.floor(y / 4)) % 2;
      pixels.set(odd ? dark : light, (y * size + x) * 4);
    }
  }
  return createTexture(gl, size, size, gl.NEAREST, gl.REPEAT, pixels);
}

function createTarget(gl, width, height, filtering) {
  const texture = createTexture(gl, width, height, filtering, gl.CLAMP_TO_EDGE, null);
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('描画先を作成できませんでした。');
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('描画先を用意できませんでした。');
  }
  return { framebuffer, texture };
}

function halton(index, base) {
  let offset = 0;
  let weight = 1 / base;
  while (index > 0) {
    offset += (index % base) * weight;
    index = Math.floor(index / base);
    weight /= base;
  }
  return offset;
}

function initialize() {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('この環境ではWebGL 2を利用できません。描画できるブラウザーで開いてください。');
  const { width, height } = canvas;
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let current;
  let resolve;
  let display;
  try {
    current = createProgram(gl, vertex, currentSource, ['resolution', 'pose', 'jitter', 'checker']);
    resolve = createProgram(gl, vertex, resolveSource,
      ['resolution', 'pose', 'previous_pose', 'has_history', 'reject', 'current', 'history']);
    display = createProgram(gl, vertex, displaySource, ['image']);
  } finally {
    gl.deleteShader(vertex);
  }

  const geometry = gl.createVertexArray();
  if (!geometry) throw new Error('全画面描画を準備できませんでした。');
  gl.bindVertexArray(geometry);
  const checker = createChecker(gl);
  const currentFrame = createTarget(gl, width, height, gl.NEAREST);
  const history = [createTarget(gl, width, height, gl.LINEAR), createTarget(gl, width, height, gl.LINEAR)];
  gl.viewport(0, 0, width, height);
  gl.disable(gl.DITHER);

  const jitter = Array.from({ length: 8 }, (_, index) => [
    halton(index + 1, 2) - 0.5, halton(index + 1, 3) - 0.5,
  ]);
  let historyIndex = 0;
  let historyFrames = 0;
  let renderedFrames = 0;
  let previousCamera = 0;
  let previousObject = 0;
  let cameraTime = 0;
  let objectTime = 0;
  let frameRequest = null;
  let lastTimestamp = null;

  function use(pass, target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    gl.useProgram(pass.program);
  }

  function bind(unit, texture, sampler) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(sampler, unit);
  }

  function draw(camera, object) {
    const taa = taaInput.checked;
    const offset = taa ? jitter[historyFrames % jitter.length] : [0, 0];
    use(current, currentFrame);
    bind(0, checker, current.uniforms.checker);
    gl.uniform2f(current.uniforms.resolution, width, height);
    gl.uniform2f(current.uniforms.pose, camera, object);
    gl.uniform2f(current.uniforms.jitter, ...offset);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    let output = currentFrame.texture;
    if (taa) {
      const next = 1 - historyIndex;
      use(resolve, history[next]);
      bind(0, currentFrame.texture, resolve.uniforms.current);
      bind(1, history[historyIndex].texture, resolve.uniforms.history);
      gl.uniform2f(resolve.uniforms.resolution, width, height);
      gl.uniform2f(resolve.uniforms.pose, camera, object);
      gl.uniform2f(resolve.uniforms.previous_pose, previousCamera, previousObject);
      gl.uniform1i(resolve.uniforms.has_history, historyFrames > 0);
      gl.uniform1i(resolve.uniforms.reject, rejectInput.checked);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      historyIndex = next;
      historyFrames++;
      output = history[historyIndex].texture;
    }
    previousCamera = camera;
    previousObject = object;

    use(display, null);
    bind(0, output, display.uniforms.image);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.frame = ++renderedFrames;
    canvas.dataset.historyFrames = historyFrames;
    canvas.dataset.cameraX = camera.toFixed(4);
    canvas.dataset.objectX = object.toFixed(4);
  }

  function schedule() {
    if (frameRequest === null) frameRequest = requestAnimationFrame(animate);
  }

  function animate(now) {
    frameRequest = null;
    if (gl.isContextLost()) return;
    const dt = lastTimestamp === null ? 0 : Math.min((now - lastTimestamp) / 1000, 0.05);
    lastTimestamp = now;
    if (cameraInput.checked) cameraTime += dt;
    if (objectInput.checked) objectTime += dt;
    draw(0.56 * Math.sin(cameraTime * 1.7), 2.10 * Math.sin(objectTime * 1.85));
    if (taaInput.checked || cameraInput.checked || objectInput.checked) schedule();
    else lastTimestamp = null;
  }

  function updateControls() {
    const taa = taaInput.checked;
    rejectInput.disabled = !taa;
    resetButton.disabled = !taa;
    canvas.dataset.taa = taa ? 'on' : 'off';
    canvas.dataset.cameraMotion = cameraInput.checked ? 'on' : 'off';
    canvas.dataset.objectMotion = objectInput.checked ? 'on' : 'off';
    canvas.dataset.rejectHistory = taa && rejectInput.checked ? 'on' : 'off';
    status.textContent = taa
      ? 'TAA オン · ジッターあり · 面が異なる履歴を' + (rejectInput.checked ? '捨てる' : '使う')
      : 'TAA オフ · 現在の画像を表示';
  }

  function resetHistory() {
    historyFrames = 0;
    updateControls();
    schedule();
  }

  taaInput.addEventListener('change', resetHistory);
  rejectInput.addEventListener('change', resetHistory);
  resetButton.addEventListener('click', resetHistory);
  for (const input of [cameraInput, objectInput]) {
    input.addEventListener('change', () => {
      updateControls();
      schedule();
    });
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frameRequest);
    controls.disabled = true;
    canvas.dataset.renderState = 'lost';
    status.textContent = '描画が中断されました。復旧するとページを再読み込みします。';
  });
  canvas.addEventListener('webglcontextrestored', () => window.location.reload());

  for (const input of [taaInput, cameraInput, objectInput, rejectInput]) input.checked = false;
  draw(0, 0);
  if (gl.getError() !== gl.NO_ERROR) throw new Error('シーンを描画できませんでした。');
  updateControls();
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
