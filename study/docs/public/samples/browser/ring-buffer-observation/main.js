import { createQueueBuffer, snapshotQueue, tryDequeue, tryEnqueue } from "./ring-buffer.js";

const SampleValues = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const TransferCount = 12;
const QueueStatus = document.getElementById("queue-status");
const QueueLog = document.getElementById("queue-log");
const Slots = [...document.querySelectorAll("[data-slot]")];
const RunWorkers = document.getElementById("run-workers");
const WorkerStatus = document.getElementById("worker-status");
const WorkerFields = ["produced", "consumed", "order", "last", "full", "empty"];
const CanRunWorkers = globalThis.crossOriginIsolated === true &&
  (location.protocol === "http:" || location.protocol === "https:") &&
  typeof Worker === "function" && typeof SharedArrayBuffer === "function";

let queue = createQueueBuffer();
let nextValueIndex = 0;
let lastDequeued = null;

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderQueue({ read, write, slots }) {
  const size = slots.filter(value => value !== null).length;
  const capacity = slots.length - 1;
  const fifo = Array.from({ length: size }, (_, offset) => slots[(read + offset) % slots.length]);
  setText("read-index", read);
  setText("write-index", write);
  setText("queue-size", size);
  setText("queue-state", size === 0 ? "空" : size === capacity ? "満杯" : "未読あり");
  setText("queue-order", fifo.length ? fifo.join(" → ") : "なし");
  setText("next-value", SampleValues[nextValueIndex]);
  setText("last-dequeued", lastDequeued ?? "—");

  for (const [index, slot] of Slots.entries()) {
    slot.dataset.occupied = String(slots[index] !== null);
    slot.querySelector(".slot-value").textContent = slots[index] ?? "空き";
    slot.querySelector(".badge.read").hidden = index !== read;
    slot.querySelector(".badge.write").hidden = index !== write;
  }
}

function recordOperation(state, message, snapshot) {
  renderQueue(snapshot);
  QueueStatus.dataset.state = state;
  QueueStatus.textContent = message;
  const entry = document.createElement("li");
  entry.textContent = message;
  QueueLog.prepend(entry);
  if (QueueLog.children.length > 10) QueueLog.lastElementChild.remove();
}

function movedCursor(label, before, after) {
  return `${label} は ${before} → ${after}${after === 0 ? "（先頭へ折り返し）" : ""}。`;
}

function enqueue() {
  const value = SampleValues[nextValueIndex];
  const slot = tryEnqueue(queue, value);
  const snapshot = snapshotQueue(queue);
  if (slot === null) {
    recordOperation("full", `満杯のため ${value} を保留しました。R と W は変わりません。`, snapshot);
    return;
  }

  nextValueIndex = (nextValueIndex + 1) % SampleValues.length;
  recordOperation("enqueued", `${value} を枠 ${slot} に入れました。${movedCursor("W", slot, snapshot.write)}`, snapshot);
}

function dequeue() {
  const entry = tryDequeue(queue);
  const snapshot = snapshotQueue(queue);
  if (entry === null) {
    recordOperation("empty", "キューは空です。R と W は変わりません。", snapshot);
    return;
  }

  lastDequeued = entry.value;
  recordOperation("dequeued", `枠 ${entry.slot} から ${entry.value} を取り出しました。${movedCursor("R", entry.slot, snapshot.read)}`, snapshot);
}

function reset() {
  queue = createQueueBuffer();
  nextValueIndex = 0;
  lastDequeued = null;
  QueueLog.replaceChildren();
  recordOperation("ready", "初期状態に戻しました。R と W はどちらも 0 です。", snapshotQueue(queue));
}

async function observeWorkers() {
  const buffer = createQueueBuffer(true);
  const workers = [];
  let timeout;
  try {
    const results = ["producer", "consumer"].map(async role => {
      const worker = new Worker(new URL("./ring-worker.js", import.meta.url), { type: "module" });
      workers.push(worker);
      return new Promise((resolve, reject) => {
        worker.addEventListener("message", ({ data }) => {
          if (data?.role === role && data.result) {
            resolve(data.result);
          } else {
            reject(new Error(data?.error || "Workerから想定外の結果が届きました。"));
          }
        }, { once: true });
        worker.addEventListener("error", () => reject(new Error("Workerを読み込むか実行する途中で失敗しました。")), { once: true });
        worker.addEventListener("messageerror", () => reject(new Error("Workerの結果を読み取れませんでした。")), { once: true });
        worker.postMessage({ buffer, role, count: TransferCount });
      });
    });
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Workerの応答が時間内に届きませんでした。")), 8000);
    });
    return await Promise.race([Promise.all(results), deadline]);
  } finally {
    clearTimeout(timeout);
    for (const worker of workers) worker.terminate();
  }
}

async function runWorkers() {
  RunWorkers.disabled = true;
  for (const field of WorkerFields) setText(`worker-${field}`, "—");
  WorkerStatus.dataset.state = "pending";
  WorkerStatus.textContent = "2つのWorkerの完了を待っています。";
  try {
    const [producer, consumer] = await observeWorkers();
    setText("worker-produced", producer.transferred);
    setText("worker-consumed", consumer.transferred);
    setText("worker-order", consumer.ordered ? "1 → 12 の順" : "順序が不一致");
    setText("worker-last", consumer.last);
    setText("worker-full", producer.full);
    setText("worker-empty", consumer.empty);
    const complete = producer.transferred === TransferCount && consumer.transferred === TransferCount &&
      consumer.ordered && consumer.last === TransferCount;
    WorkerStatus.dataset.state = complete ? "observed" : "error";
    WorkerStatus.textContent = complete
      ? "12件を受け渡し、入れた順に取り出せました。"
      : "実行結果の件数か順序が想定と異なります。";
  } catch (error) {
    WorkerStatus.dataset.state = "error";
    WorkerStatus.textContent = error.message;
  } finally {
    RunWorkers.disabled = !CanRunWorkers;
  }
}

for (const [id, handler] of [["enqueue", enqueue], ["dequeue", dequeue], ["reset", reset]]) {
  const button = document.getElementById(id);
  button.addEventListener("click", handler);
  button.disabled = false;
}
renderQueue(snapshotQueue(queue));

const availability = document.getElementById("worker-availability");
availability.dataset.state = CanRunWorkers ? "available" : "unavailable";
availability.textContent = CanRunWorkers
  ? "このページでは共有メモリを使うWorkerを実行できます。"
  : "この配信環境では一手ずつ動かせます。Workerで試すには付属サーバーで開きます。";
document.getElementById("worker-note").hidden = CanRunWorkers;
RunWorkers.disabled = !CanRunWorkers;
RunWorkers.addEventListener("click", runWorkers);
