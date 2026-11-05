const ReadIndex = 0;
const WriteIndex = 1;
const PayloadStart = 2;
const SlotCount = 4;
export const QueueBytes = (PayloadStart + SlotCount) * Int32Array.BYTES_PER_ELEMENT;

function next(index) {
  return (index + 1) % SlotCount;
}

export function createQueueBuffer(shared = false) {
  return shared ? new SharedArrayBuffer(QueueBytes) : new ArrayBuffer(QueueBytes);
}

export function tryEnqueue(buffer, value) {
  if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) {
    throw new RangeError("符号付き32ビット整数を指定してください。");
  }
  const cells = new Int32Array(buffer);
  const write = Atomics.load(cells, WriteIndex);
  const nextWrite = next(write);
  if (nextWrite === Atomics.load(cells, ReadIndex)) return null;

  cells[PayloadStart + write] = value;
  // Publish the written slot by advancing the write index.
  Atomics.store(cells, WriteIndex, nextWrite);
  return write;
}

export function tryDequeue(buffer) {
  const cells = new Int32Array(buffer);
  const read = Atomics.load(cells, ReadIndex);
  if (read === Atomics.load(cells, WriteIndex)) return null;

  const value = cells[PayloadStart + read];
  // Release this slot for reuse after reading it.
  Atomics.store(cells, ReadIndex, next(read));
  return { slot: read, value };
}

export function snapshotQueue(buffer) {
  // The interactive view owns a normal buffer. The live Workers own the shared queue.
  if (!(buffer instanceof ArrayBuffer)) {
    throw new TypeError("表示用のスナップショットには通常のArrayBufferを指定してください。");
  }
  const cells = new Int32Array(buffer);
  const read = Atomics.load(cells, ReadIndex);
  const write = Atomics.load(cells, WriteIndex);
  const slots = Array(SlotCount).fill(null);
  for (let index = read; index !== write; index = next(index)) {
    slots[index] = cells[PayloadStart + index];
  }
  return { read, write, slots };
}
