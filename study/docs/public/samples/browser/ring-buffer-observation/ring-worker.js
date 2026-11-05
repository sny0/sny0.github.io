import { QueueBytes, tryDequeue, tryEnqueue } from "./ring-buffer.js";

const WaitLimitMs = 6000;
const MaxCount = 256;

function waitForRetry(deadline) {
  if (performance.now() >= deadline) {
    throw new Error("制限時間内にキューの操作を完了できませんでした。");
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function produce(buffer, count, deadline) {
  let full = 0;
  for (let value = 1; value <= count;) {
    if (tryEnqueue(buffer, value) === null) {
      full += 1;
      await waitForRetry(deadline);
    } else {
      value += 1;
    }
  }
  return { transferred: count, full };
}

async function consume(buffer, count, deadline) {
  let empty = 0;
  let ordered = true;
  let last = null;
  for (let expected = 1; expected <= count;) {
    const entry = tryDequeue(buffer);
    if (entry === null) {
      empty += 1;
      await waitForRetry(deadline);
    } else {
      last = entry.value;
      ordered = ordered && last === expected;
      expected += 1;
    }
  }
  return { transferred: count, empty, ordered, last };
}

self.addEventListener("message", async ({ data }) => {
  const { role, buffer, count } = data ?? {};
  try {
    if (typeof SharedArrayBuffer !== "function" ||
        !(buffer instanceof SharedArrayBuffer) || buffer.byteLength !== QueueBytes) {
      throw new Error("実測用の共有キューバッファが必要です。");
    }
    if (!Number.isInteger(count) || count < 1 || count > MaxCount) {
      throw new Error(`試す件数は1〜${MaxCount}の整数で指定してください。`);
    }
    if (role !== "producer" && role !== "consumer") {
      throw new Error("生産側または消費側の役割を指定してください。");
    }
    const run = role === "producer" ? produce : consume;
    const result = await run(buffer, count, performance.now() + WaitLimitMs);
    self.postMessage({ role, result });
  } catch (error) {
    self.postMessage({ role, error: error.message });
  }
}, { once: true });
