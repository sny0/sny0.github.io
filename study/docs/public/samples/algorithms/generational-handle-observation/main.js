const maxGeneration = 3;
const savedHandle = { index: 0, generation: 0 };

export function createSlot(policy) {
  return { policy, generation: 0, objectId: 1, nextId: 2, retired: false };
}

export function release(slot) {
  if (slot.objectId === null) return slot;
  if (slot.generation === maxGeneration && slot.policy === 'retire') {
    return { ...slot, objectId: null, retired: true };
  }
  return { ...slot, objectId: null, generation: (slot.generation + 1) % (maxGeneration + 1) };
}

export function allocate(slot) {
  if (slot.objectId !== null || slot.retired) return slot;
  return { ...slot, objectId: slot.nextId, nextId: slot.nextId + 1 };
}

export function resolveHandle(slot, { index, generation }) {
  return index === 0 && slot.generation === generation ? slot.objectId : null;
}

function mount() {
  const policy = document.getElementById('policy');
  const releaseButton = document.getElementById('release');
  const allocateButton = document.getElementById('allocate');
  const replaceButton = document.getElementById('replace');
  const slotInfo = document.getElementById('slot');
  const byIndex = document.getElementById('by-index');
  const byHandle = document.getElementById('by-handle');
  let slot = createSlot(policy.value);

  function showResult(element, objectId, absentMessage) {
    const message = element.querySelector('.result');
    if (objectId === null) {
      element.dataset.status = 'unavailable';
      message.textContent = absentMessage;
    } else if (objectId === 1) {
      element.dataset.status = 'same';
      message.textContent = '最初のオブジェクト1が見つかる';
    } else {
      element.dataset.status = 'different';
      message.textContent = `別のオブジェクト${objectId}が見つかる`;
    }
  }

  function render() {
    const occupied = slot.objectId !== null;
    const state = slot.retired ? '退役済み' : occupied ? `オブジェクト${slot.objectId}が使用中` : '空き';
    slotInfo.textContent = `スロット 0・世代 ${slot.generation} ／ ${state}`;
    releaseButton.disabled = !occupied;
    replaceButton.disabled = !occupied;
    allocateButton.disabled = occupied || slot.retired;

    const absent = slot.retired ? 'スロットは退役済み' : '対象がない';
    showResult(byIndex, slot.objectId, absent);
    showResult(byHandle, resolveHandle(slot, savedHandle), occupied ? '世代が違うため無効' : absent);
  }

  function reset() {
    slot = createSlot(policy.value);
    render();
  }

  policy.addEventListener('change', reset);
  document.getElementById('reset').addEventListener('click', reset);
  releaseButton.addEventListener('click', () => { slot = release(slot); render(); });
  allocateButton.addEventListener('click', () => { slot = allocate(slot); render(); });
  replaceButton.addEventListener('click', () => { slot = allocate(release(slot)); render(); });
  render();
}

if (typeof document !== 'undefined') mount();
