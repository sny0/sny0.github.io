const modes = [
  {
    id: 'normals', title: '法線と接空間',
    sliders: [['法線の強さ', 0, 1, 0.01, 0.55], ['光の角度', -85, 85, 1, 35, '°']],
    hint: '強さを0に戻すと球面だけが見えます。強さを上げると同じ輪郭の内側に陰影の模様が出ます。',
  },
  {
    id: 'brdf', title: 'GGXと材質',
    sliders: [['粗さ', 0.08, 1, 0.01, 0.33], ['メタリック', 0, 1, 0.01, 0]],
    hint: '粗さを変え、ハイライトの広がりを見ます。メタリックを1にすると拡散反射が消え、鏡面反射に色が付きます。',
  },
  {
    id: 'hdr', title: '露出とトーンマッピング',
    sliders: [['露出補正', -4, 4, 0.25, 0, ' EV'], ['発光の強さ', 1, 16, 0.25, 6]],
    hint: '左が1でクリップ、右がReinhardです。露出を上げ、どちらで明るい領域の濃淡が残るかを比べます。',
  },
  {
    id: 'noise', title: 'fBmとドメインワープ',
    sliders: [['オクターブ数', 1, 6, 1, 4], ['ワープ量', 0, 3, 0.05, 0.9]],
    hint: '左は座標をそのまま使い、右はノイズで座標をずらします。オクターブを増やすと細かい模様が加わります。',
  },
  {
    id: 'toon', title: 'トゥーンとリムライト',
    sliders: [['陰影の段数', 2, 8, 1, 3], ['リムの強さ', 0, 1, 0.01, 0.3]],
    hint: '球の明暗の境界と、視線に対して浅い角度になる輪郭付近の明るさを別々に変えます。',
  },
  {
    id: 'sdf', title: 'SDFの合成と影',
    sliders: [['合成の幅', 0, 0.65, 0.01, 0.26], ['影の硬さ', 4, 48, 1, 14]],
    hint: '幅が0なら距離の小さい方を選びます。幅を増やして接合部を見ます。影の硬さは床の影の境界に効きます。',
  },
  {
    id: 'water', title: '水面の法線と深さ',
    sliders: [['波の強さ', 0, 1, 0.01, 0.38], ['吸収の強さ', 0, 2, 0.02, 0.7]],
    hint: '波で反射の向きが変わります。吸収を強めると、水中を長く通る光ほど海底の模様が暗くなります。',
  },
]

const mode = document.querySelector('#mode')
const canvas = document.querySelector('canvas')
const status = document.querySelector('#status')
const controls = ['first', 'second'].map(id => ({
  input: document.querySelector('#' + id),
  label: document.querySelector('#' + id + '-label'),
  output: document.querySelector('#' + id + '-value'),
}))

for (const item of modes) mode.add(new Option(item.title, item.id))
const initial = new URL(location.href).searchParams.get('mode')
mode.value = modes.some(item => item.id === initial) ? initial : modes[0].id

function setMode() {
  const item = modes[mode.selectedIndex]
  for (const [i, control] of controls.entries()) {
    const [label, min, max, step, value] = item.sliders[i]
    control.label.textContent = label
    Object.assign(control.input, { min, max, step, value })
  }
  document.querySelector('#hint').textContent = item.hint
}

function readSliders() {
  return controls.map(({ input, output }, index) => {
    const [, , , , , unit = ''] = modes[mode.selectedIndex].sliders[index]
    output.value = input.value + unit
    return input.valueAsNumber
  })
}

async function start() {
  if (!navigator.gpu) throw new Error('このブラウザではWebGPUを利用できません。')
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) throw new Error('WebGPUのアダプターを取得できませんでした。')
  const device = await adapter.requestDevice()
  const context = canvas.getContext('webgpu')
  if (!context) throw new Error('WebGPUの描画先を作成できませんでした。')

  const source = await fetch('./shader.wgsl')
  if (!source.ok) throw new Error('WGSLファイルを読み込めませんでした。')
  const module = device.createShaderModule({ code: await source.text() })
  const compilation = await module.getCompilationInfo()
  const errors = compilation.messages.filter(message => message.type === 'error')
  if (errors.length) throw new Error(errors.map(message => message.message).join(' / '))

  const format = navigator.gpu.getPreferredCanvasFormat()
  const pipeline = await device.createRenderPipelineAsync({
    layout: 'auto',
    vertex: { module, entryPoint: 'vsMain' },
    fragment: { module, entryPoint: 'fsMain', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  })
  context.configure({ device, format, alphaMode: 'opaque' })
  const uniform = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniform } }],
  })

  let lost = false
  device.lost.then(() => {
    lost = true
    status.textContent = 'GPUとの接続が失われました。ページを再読み込みしてください。'
    mode.disabled = true
    for (const { input } of controls) input.disabled = true
  })

  function draw() {
    if (lost) return
    const [first, second] = readSliders()
    device.queue.writeBuffer(uniform, 0, new Float32Array([
      mode.selectedIndex, first, second, canvas.width / canvas.height,
    ]))
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    })
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.draw(3)
    pass.end()
    device.queue.submit([encoder.finish()])
  }

  mode.addEventListener('change', () => {
    const url = new URL(location.href)
    url.searchParams.set('mode', mode.value)
    history.replaceState(null, '', url)
    setMode()
    draw()
  })
  for (const { input } of controls) input.addEventListener('input', draw)
  draw()
  await device.queue.onSubmittedWorkDone()
  if (lost) return
  status.textContent = 'WebGPUで描画中'
  mode.disabled = false
  for (const { input } of controls) input.disabled = false
}

setMode()
readSliders()
start().catch(error => {
  console.error(error)
  status.textContent = '描画できませんでした。' + error.message
})
