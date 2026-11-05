"use strict";

const Counter = 0;
const Ready = 1;
const Payload = 2;
const SlotBytes = 3 * Int32Array.BYTES_PER_ELEMENT;
const WaitLimitMs = 2000;

let snapshot = null;

function waitForPayload(slots, id) {
  let flag = Atomics.load(slots, Ready);
  let status = "already-ready";
  const deadline = performance.now() + WaitLimitMs;
  if (flag === 0) {
    self.postMessage({ id, type: "waiting", action: "wait", value: flag });
  }

  while (flag === 0) {
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      status = "timed-out";
      break;
    }
    status = Atomics.wait(slots, Ready, 0, remaining);
    flag = Atomics.load(slots, Ready);
  }

  // Read the payload only after observing the writer's ready flag.
  return { flag, payload: flag === 1 ? slots[Payload] : null, status };
}

function execute(action, slots, id) {
  switch (action) {
    case "read":
      snapshot = Atomics.load(slots, Counter);
      return { value: snapshot };
    case "write": {
      if (snapshot === null) throw new Error("先にカウンターを読み取ってください。");
      const value = Atomics.store(slots, Counter, snapshot + 1);
      snapshot = null;
      return { value };
    }
    case "add": {
      const before = Atomics.add(slots, Counter, 1);
      return { before, value: before + 1 };
    }
    case "wait":
      return waitForPayload(slots, id);
    case "publish": {
      const payload = 42;
      slots[Payload] = payload;
      const flag = Atomics.store(slots, Ready, 1);
      const woken = Atomics.notify(slots, Ready, 1);
      return { flag, payload, woken };
    }
    default:
      throw new Error("実験で使う操作を指定してください。");
  }
}

self.addEventListener("message", ({ data }) => {
  const { id, action, buffer } = data ?? {};
  try {
    if (!(buffer instanceof SharedArrayBuffer) || buffer.byteLength !== SlotBytes) {
      throw new Error("12バイトの共有領域が必要です。");
    }
    const slots = new Int32Array(buffer);
    self.postMessage({ id, type: "result", action, ...execute(action, slots, id) });
  } catch (error) {
    self.postMessage({ id, type: "error", action, message: error.message });
  }
});
