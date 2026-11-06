import { world, makeScene, makeQuery, buildGrid, buildBvh, compareQueries } from './spatial-query.js';

const scene = document.getElementById('scene');
const controls = document.getElementById('controls');
const layout = document.getElementById('layout');
const method = document.getElementById('method');
const cellSize = document.getElementById('cell-size');
const queryX = document.getElementById('query-x');
const queryY = document.getElementById('query-y');
const queryWidth = document.getElementById('query-width');

let circles = makeScene(layout.value);
let grid = buildGrid(circles, Number(cellSize.value));
let bvh = buildBvh(circles);

function svgElement(name, attributes) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function rectangle({ left, top, right, bottom }, kind) {
  return svgElement('rect', { x: left, y: top, width: right - left, height: bottom - top, class: kind });
}

function draw(results, query) {
  const selected = results[method.value];
  const marks = [];
  let note = '総当たりでは、48個すべてが詳細判定の候補です。';
  if (method.value === 'grid') {
    marks.push(...selected.cells.map(cell => rectangle(cell, 'visited-cell')));
    for (let x = grid.size; x < world.width; x += grid.size) {
      marks.push(svgElement('line', { x1: x, y1: 0, x2: x, y2: world.height, class: 'grid-line' }));
    }
    for (let y = grid.size; y < world.height; y += grid.size) {
      marks.push(svgElement('line', { x1: 0, y1: y, x2: world.width, y2: y, class: 'grid-line' }));
    }
    note = '淡い青で塗ったセルを読みます。同じ円が複数セルにいても、詳細判定は1回です。';
  } else if (method.value === 'bvh') {
    marks.push(...selected.boxes.map(box => rectangle(box, 'visited-box')));
    note = '青い破線は、検索範囲と重なったノードの境界箱です。外れた枝の中は調べません。';
  }
  marks.push(rectangle(query, 'query-area'));
  const candidates = new Set(selected.candidates);
  const hits = new Set(selected.hits);
  for (const circle of circles) {
    const kind = hits.has(circle) ? 'hit' : candidates.has(circle) ? 'candidate' : 'object';
    marks.push(svgElement('circle', { cx: circle.x, cy: circle.y, r: circle.r, class: kind }));
  }
  scene.replaceChildren(...marks);
  scene.setAttribute('aria-label', `${method.selectedOptions[0].textContent}。検索範囲に触れる円は${hits.size}個。詳細判定は${candidates.size}回。`);
  document.getElementById('structure-note').textContent = note;
}

function render() {
  document.getElementById('x-value').textContent = queryX.value;
  document.getElementById('y-value').textContent = queryY.value;
  document.getElementById('width-value').textContent = queryWidth.value;
  const query = makeQuery(Number(queryX.value), Number(queryY.value), Number(queryWidth.value));
  const results = compareQueries(circles, grid, bvh, query);
  draw(results, query);

  for (const [key, result] of Object.entries(results)) {
    const row = document.getElementById(`stats-${key}`);
    row.classList.toggle('selected', key === method.value);
    row.querySelector('.tested').textContent = result.candidates.length;
    row.querySelector('.hit-count').textContent = result.hits.length;
  }
  const ids = result => result.hits.map(circle => circle.id).sort((a, b) => a - b).join(',');
  const expected = ids(results.brute);
  const agrees = ids(results.grid) === expected && ids(results.bvh) === expected;
  document.getElementById('agreement').textContent = agrees
    ? `3方式の命中が一致しました（${results.brute.hits.length}個）。`
    : '命中した円のIDが一致しませんでした。';
  const { cells, registrations } = results.grid;
  const duplicates = registrations - results.grid.candidates.length;
  document.getElementById('grid-detail').textContent =
    `グリッドは${cells.length}セルを読み、延べ${registrations}件の登録から重複${duplicates}件を除きました。`;
  document.getElementById('bvh-detail').textContent =
    `BVHは${results.bvh.nodesTested}ノードの境界箱を調べました。`;
}

controls.addEventListener('input', event => {
  if (event.target === layout) {
    circles = makeScene(layout.value);
    bvh = buildBvh(circles);
  }
  if (event.target === layout || event.target === cellSize) grid = buildGrid(circles, Number(cellSize.value));
  render();
});

scene.addEventListener('click', event => {
  const matrix = scene.getScreenCTM();
  if (!matrix) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  queryX.value = String(Math.round(point.x));
  queryY.value = String(Math.round(point.y));
  render();
});

render();
