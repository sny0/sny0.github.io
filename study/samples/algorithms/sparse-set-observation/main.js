export class SparseSet {
  constructor(capacity) {
    this.dense = [];
    this.sparse = Array(capacity).fill(-1);
  }

  validId(id) {
    return Number.isInteger(id) && id >= 0 && id < this.sparse.length;
  }

  has(id) {
    if (!this.validId(id)) return false;
    const index = this.sparse[id];
    return index >= 0 && index < this.dense.length && this.dense[index] === id;
  }

  add(id) {
    if (!this.validId(id) || this.has(id)) return false;
    this.sparse[id] = this.dense.length;
    this.dense.push(id);
    return true;
  }

  remove(id) {
    if (!this.has(id)) return false;
    const index = this.sparse[id];
    const lastIndex = this.dense.length - 1;
    if (index !== lastIndex) {
      const lastId = this.dense[lastIndex];
      this.dense[index] = lastId;
      this.sparse[lastId] = index;
    }
    // The old index is harmless: has() checks the dense array in both directions.
    this.dense.pop();
    return true;
  }
}

function initialSet() {
  const set = new SparseSet(8);
  for (const id of [2, 7, 4]) set.add(id);
  return set;
}

function makeCell(label, value, { selected, empty, stale }) {
  const cell = document.createElement('li');
  cell.classList.toggle('selected', selected);
  cell.classList.toggle('empty', empty);
  cell.classList.toggle('stale', stale);
  const name = document.createElement('span');
  name.textContent = label;
  const number = document.createElement('strong');
  number.textContent = empty ? '—' : String(value);
  const note = document.createElement('span');
  note.className = 'note';
  note.textContent = stale ? '古い位置' : '\u00a0';
  cell.append(name, number, note);
  return cell;
}

function mount() {
  let set = initialSet();
  const selector = document.getElementById('entity-id');
  const dense = document.getElementById('dense');
  const sparse = document.getElementById('sparse');
  const operation = document.getElementById('operation');
  const lookup = document.getElementById('lookup');

  function render() {
    const id = Number(selector.value);
    const index = set.sparse[id];
    dense.replaceChildren(...set.sparse.map((_, position) => makeCell(
      `位置 ${position}`, set.dense[position],
      { selected: position === index, empty: position >= set.dense.length, stale: false },
    )));
    sparse.replaceChildren(...set.sparse.map((position, candidate) => makeCell(
      `ID ${candidate}`, position,
      { selected: candidate === id, empty: position < 0, stale: position >= 0 && !set.has(candidate) },
    )));
    const destination = index < 0 ? '位置なし' : `位置 ${index} → ${index < set.dense.length ? `ID ${set.dense[index]}` : '現在の範囲外'}`;
    lookup.textContent = `ID ${id} → ${destination}。判定 ${set.has(id) ? '含まれる' : '含まれない'}`;
  }

  selector.addEventListener('change', render);
  document.getElementById('insert-id').addEventListener('click', () => {
    const id = Number(selector.value);
    operation.textContent = set.add(id)
      ? `ID ${id}を末尾の位置 ${set.sparse[id]} に追加しました。`
      : `ID ${id}はすでに入っています。`;
    render();
  });
  document.getElementById('remove-id').addEventListener('click', () => {
    const id = Number(selector.value);
    const lastId = set.dense.at(-1);
    const index = set.sparse[id];
    if (!set.remove(id)) operation.textContent = `ID ${id}は入っていません。`;
    else if (id === lastId) operation.textContent = `末尾のID ${id}を削除しました。`;
    else operation.textContent = `ID ${id}を削除し、末尾のID ${lastId}を位置 ${index} に移しました。`;
    render();
  });
  document.getElementById('reset-set').addEventListener('click', () => {
    set = initialSet();
    selector.value = '7';
    operation.textContent = '最初の状態に戻しました。';
    render();
  });
  render();
}

if (typeof document !== 'undefined') mount();
