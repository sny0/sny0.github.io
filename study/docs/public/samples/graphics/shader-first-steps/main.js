const canvas = document.querySelector('#view');
const controls = document.querySelector('#controls');
const modeInput = document.querySelector('#mode');
const tintInput = document.querySelector('#tint');
const offsetInput = document.querySelector('#offset');
const offsetValue = document.querySelector('#offset-value');
const status = document.querySelector('#status');
const uniforms = document.querySelector('#uniforms');
const log = document.querySelector('#log');

function reportError(error) {
  controls.disabled = true;
  canvas.dataset.renderState = 'error';
  status.dataset.error = 'true';
  status.textContent = '描画を開始できませんでした。下の記録を確認してください。';
  log.textContent += `${error.message}\n`;
}

async function readShader(name) {
  const response = await fetch(new URL(name, import.meta.url));
  if (!response.ok) throw new Error(`${name} の取得に失敗しました (${response.status})。`);
  return response.text();
}

function compileShader(gl, type, source, label) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error(`${label} を作成できません。`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const info = gl.getShaderInfoLog(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error(`${label} のコンパイルに失敗しました。\n${info}`);
  }
  log.textContent += `${label}: コンパイル成功${info ? '\n' + info : ''}\n`;
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource, '頂点シェーダー');
  let fragment;
  let program;
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, 'フラグメントシェーダー');
    program = gl.createProgram();
    if (!program) throw new Error('プログラムを作成できません。');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`リンクに失敗しました。\n${gl.getProgramInfoLog(program)}`);
    }
    log.textContent += 'ステージ間のリンク成功\n';
    return program;
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

async function initialize() {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL 2を利用できません。対応するブラウザーと描画設定を確認してください。');

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    controls.disabled = true;
    canvas.dataset.renderState = 'lost';
    status.textContent = '描画用の接続が失われました。復旧するとページを再読み込みします。';
  });
  canvas.addEventListener('webglcontextrestored', () => window.location.reload());

  const [vertexSource, fragmentSource] = await Promise.all([
    readShader('triangle.vert'), readShader('triangle.frag'),
  ]);
  if (gl.isContextLost()) throw new Error('シェーダーの読み込み中に描画用の接続が失われました。');
  const program = createProgram(gl, vertexSource, fragmentSource);
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) {
    if (vao) gl.deleteVertexArray(vao);
    if (buffer) gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    throw new Error('頂点データを用意できません。');
  }

  // Each vertex contains position.xy followed by uv.xy.
  const vertices = new Float32Array([
    -0.75, -0.65, 0.0, 0.0,
     0.75, -0.65, 1.0, 0.0,
     0.00,  0.75, 0.5, 1.0,
  ]);
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
  gl.useProgram(program);

  const offset = gl.getUniformLocation(program, 'u_offset');
  const tint = gl.getUniformLocation(program, 'u_tint');
  const useUv = gl.getUniformLocation(program, 'u_useUv');
  if (offset === null || tint === null || useUv === null) {
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
    throw new Error('必要なuniformが見つかりません。シェーダーの宣言を確認してください。');
  }

  function render() {
    if (gl.isContextLost()) return;
    const hex = tintInput.value;
    const rgb = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255);
    const horizontalOffset = Number(offsetInput.value);
    const uvMode = Number(modeInput.value);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.04, 0.08, 0.12, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform1f(offset, horizontalOffset);
    gl.uniform3fv(tint, rgb);
    gl.uniform1f(useUv, uvMode);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      reportError(new Error(`WebGLの描画エラー ${error}`));
      return;
    }
    offsetValue.value = horizontalOffset.toFixed(2);
    uniforms.textContent = `u_offset = ${horizontalOffset.toFixed(2)}\nu_tint = (${rgb.map(value => value.toFixed(3)).join(', ')})\nu_useUv = ${uvMode.toFixed(1)}`;
    canvas.dataset.renderState = 'ready';
    status.textContent = '描画済み。頂点3個を使い、設定を変えたときに描き直します。';
  }

  controls.addEventListener('input', render);
  document.querySelector('#reset').addEventListener('click', () => {
    modeInput.value = '1';
    tintInput.value = '#ffffff';
    offsetInput.value = '0';
    render();
  });
  controls.disabled = false;
  render();
}

initialize().catch(reportError);
