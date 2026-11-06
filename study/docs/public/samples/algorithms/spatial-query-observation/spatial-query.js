export const world = { width: 640, height: 384 };

export function makeScene(layout) {
  let seed = 20;
  function randomInt(low, high) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return low + ((seed >>> 8) % (high - low + 1));
  }

  return Array.from({ length: 48 }, (_, id) => {
    const x = 42 + id % 8 * 79 + randomInt(-16, 16);
    const y = 33 + Math.floor(id / 8) * 64 + randomInt(-13, 13);
    const r = randomInt(6, 15);
    if (layout === 'clustered' && id < 40) {
      return { id, x: randomInt(138, 246), y: randomInt(75, 169), r };
    }
    return { id, x, y, r };
  });
}

export function makeQuery(x, y, width) {
  const halfHeight = width * 3 / 8;
  return {
    left: Math.max(0, x - width / 2), top: Math.max(0, y - halfHeight),
    right: Math.min(world.width - 1, x + width / 2),
    bottom: Math.min(world.height - 1, y + halfHeight),
  };
}

function circleBounds({ x, y, r }) {
  return { left: x - r, top: y - r, right: x + r, bottom: y + r };
}

function rectsOverlap(a, b) {
  return a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;
}

function circleIntersectsRect({ x, y, r }, rect) {
  const nearestX = Math.max(rect.left, Math.min(x, rect.right));
  const nearestY = Math.max(rect.top, Math.min(y, rect.bottom));
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= r ** 2;
}

function cellCoordinates(rect, size) {
  const cells = [];
  // The rectangles are closed. If a maximum is on a grid line, include that cell too.
  for (let y = Math.floor(rect.top / size); y <= Math.floor(rect.bottom / size); y++) {
    for (let x = Math.floor(rect.left / size); x <= Math.floor(rect.right / size); x++) {
      cells.push({ key: `${x},${y}`, left: x * size, top: y * size,
        right: (x + 1) * size, bottom: (y + 1) * size });
    }
  }
  return cells;
}

export function buildGrid(circles, size) {
  const buckets = new Map();
  for (const circle of circles) {
    for (const { key } of cellCoordinates(circleBounds(circle), size)) {
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(circle);
    }
  }
  return { size, buckets };
}

export function buildBvh(circles) {
  if (circles.length === 0) return null;
  const boxes = circles.map(circleBounds);
  const bounds = {
    left: Math.min(...boxes.map(box => box.left)), top: Math.min(...boxes.map(box => box.top)),
    right: Math.max(...boxes.map(box => box.right)), bottom: Math.max(...boxes.map(box => box.bottom)),
  };
  if (circles.length <= 4) return { bounds, circles };

  const axis = bounds.right - bounds.left >= bounds.bottom - bounds.top ? 'x' : 'y';
  const ordered = circles.slice().sort((a, b) => a[axis] - b[axis] || a.id - b.id);
  const middle = Math.floor(ordered.length / 2);
  return { bounds, children: [buildBvh(ordered.slice(0, middle)), buildBvh(ordered.slice(middle))] };
}

function gridCandidates(grid, rect) {
  const cells = cellCoordinates(rect, grid.size);
  const candidates = new Set();
  let registrations = 0;
  for (const { key } of cells) {
    const bucket = grid.buckets.get(key) ?? [];
    registrations += bucket.length;
    for (const circle of bucket) candidates.add(circle);
  }
  return { candidates: [...candidates], cells, registrations };
}

function bvhCandidates(bvh, rect) {
  const pending = bvh ? [bvh] : [];
  const candidates = [];
  const boxes = [];
  let nodesTested = 0;
  while (pending.length) {
    const node = pending.pop();
    nodesTested++;
    if (!rectsOverlap(node.bounds, rect)) continue;
    boxes.push(node.bounds);
    if (node.circles) candidates.push(...node.circles);
    else pending.push(...node.children);
  }
  return { candidates, boxes, nodesTested };
}

export function compareQueries(circles, grid, bvh, rect) {
  const results = {
    brute: { candidates: circles },
    grid: gridCandidates(grid, rect),
    bvh: bvhCandidates(bvh, rect),
  };
  for (const result of Object.values(results)) {
    result.hits = result.candidates.filter(circle => circleIntersectsRect(circle, rect));
  }
  return results;
}
