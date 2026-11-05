"use strict";

// These traces illustrate one ordering. The live section runs actual Workers.
const ModelSteps = {
  split: [
    ["A が load で 0 を読み取る。", {a: 0}],
    ["B も load で 0 を読み取る。", {b: 0}],
    ["A が読み取った 0 に 1 を足し、store で 1 を書く。", {counter: 1}],
    ["B も読み取った 0 から計算した 1 を書く。共有値は 1 のまま。", {counter: 1}],
  ],
  add: [
    ["A の add が 0 を 1 に更新し、更新前の 0 を返す。", {counter: 1, a: 0}],
    ["B の add が 1 を 2 に更新し、更新前の 1 を返す。", {counter: 2, b: 1}],
  ],
  wait: [
    ["読み手がフラグ 0 を確認し、wait で待機に入る。", {reader: "待機中"}],
    ["書き手が共有データに 42 を書く。", {payload: 42}],
    ["書き手が store でフラグを 1 にする。", {flag: 1}],
    ["書き手が notify で読み手を起こす。この順番では戻り値は 1。", {reader: "起床できる"}],
    ["読み手が load でフラグ 1 を確認し、共有データの 42 を読む。", {reader: "読み取り完了", read: 42}],
  ],
};

function setupModel(panel) {
  const steps = ModelSteps[panel.dataset.model];
  const fields = Array.from(panel.querySelectorAll("[data-field]"));
  const initialValues = fields.map(field => field.textContent);
  const next = panel.querySelector("[data-step]");
  const reset = panel.querySelector("[data-reset]");
  const status = panel.querySelector("[data-status]");
  const log = panel.querySelector("[data-log]");
  let position = 0;

  function updateControls(message = "") {
    next.disabled = position === steps.length;
    reset.disabled = position === 0;
    status.dataset.state = position === steps.length ? "complete" : "ready";
    status.textContent = `${position} / ${steps.length} 手順${message ? `。 ${message}` : ""}`;
  }

  next.addEventListener("click", () => {
    const [message, changes] = steps[position];
    for (const field of fields) {
      const value = changes[field.dataset.field];
      if (value !== undefined) field.textContent = value;
    }
    const item = document.createElement("li");
    item.textContent = message;
    log.append(item);
    position += 1;
    updateControls(message);
  });
  reset.addEventListener("click", () => {
    fields.forEach((field, index) => { field.textContent = initialValues[index]; });
    log.replaceChildren();
    position = 0;
    updateControls();
  });
  updateControls();
}

const Counter = 0;
const Isolated = window.crossOriginIsolated === true;
const CanRunWorkers = Isolated &&
  ["http:", "https:"].includes(location.protocol) &&
  typeof Worker === "function" &&
  typeof SharedArrayBuffer === "function" &&
  typeof window.Atomics?.wait === "function";

function observeWorkers(mode) {
  return new Promise((resolve, reject) => {
    const buffer = new SharedArrayBuffer(3 * Int32Array.BYTES_PER_ELEMENT);
    const values = new Int32Array(buffer);
    const workers = [];
    const requests = new Map();
    let nextId = 0;
    let finished = false;
    const timer = setTimeout(() => finish(new Error("Workerの応答が時間内に届きませんでした。")), 8000);

    function finish(error, result) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      for (const worker of workers) worker.terminate();
      if (error) {
        for (const request of requests.values()) request.reject(error);
        requests.clear();
        reject(error);
      } else {
        resolve(result);
      }
    }

    function openWorker() {
      const worker = new Worker("./worker.js");
      workers.push(worker);
      worker.addEventListener("error", () => finish(new Error("Workerを読み込むか実行する途中で失敗しました。")));
      worker.addEventListener("messageerror", () => finish(new Error("Workerのメッセージを読み取れませんでした。")));
      worker.addEventListener("message", ({data}) => {
        const request = requests.get(data?.id);
        if (!request || request.worker !== worker || request.action !== data.action) {
          finish(new Error("Workerから想定外のメッセージが届きました。"));
          return;
        }
        if (data.type === "waiting" && request.onWaiting) {
          const publish = request.onWaiting;
          request.onWaiting = undefined;
          publish();
        } else if (data.type === "result") {
          requests.delete(data.id);
          request.resolve(data);
        } else {
          finish(new Error(data.message || "Workerの操作に失敗しました。"));
        }
      });
      return worker;
    }

    function command(worker, action, onWaiting) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        requests.set(id, {worker, action, onWaiting, resolve, reject});
        try {
          worker.postMessage({id, action, buffer});
        } catch (error) {
          requests.delete(id);
          reject(error);
        }
      });
    }

    async function execute() {
      const a = openWorker();
      const b = openWorker();
      if (mode === "split") {
        const [aRead, bRead] = await Promise.all([command(a, "read"), command(b, "read")]);
        // Both reads have completed before either Worker can store.
        await Promise.all([command(a, "write"), command(b, "write")]);
        return {a: aRead.value, b: bRead.value, counter: Atomics.load(values, Counter)};
      }
      if (mode === "add") {
        const [aAdd, bAdd] = await Promise.all([command(a, "add"), command(b, "add")]);
        return {a: aAdd.before, b: bAdd.before, counter: Atomics.load(values, Counter)};
      }

      let publication;
      const received = await command(a, "wait", () => {
        // The message confirms the reader saw 0. It may still be about to call wait.
        publication = command(b, "publish");
        publication.catch(finish);
      });
      if (!publication) throw new Error("フラグ0を確認した読み手のメッセージが届きませんでした。");
      const sent = await publication;
      return {waitResult: received.status, woken: sent.woken, flag: received.flag, read: received.payload};
    }

    execute().then(result => finish(null, result), finish);
  });
}

const ModelPanels = Array.from(document.querySelectorAll("[data-model]"));
const WorkerPanels = Array.from(document.querySelectorAll("[data-worker]"));
const WorkerButtons = Array.from(document.querySelectorAll("[data-run]"));

function showWorkerResult(panel, state, message, values = {}) {
  const status = panel.querySelector("[data-status]");
  status.dataset.state = state;
  status.textContent = message;
  for (const field of panel.querySelectorAll("[data-field]")) {
    field.textContent = values[field.dataset.field] ?? "—";
  }
}

async function runWorkerCase(panel) {
  const mode = panel.dataset.worker;
  for (const button of WorkerButtons) button.disabled = true;
  showWorkerResult(panel, "pending", "Workerの応答を待っています。");
  try {
    const values = await observeWorkers(mode);
    if (mode !== "wait") {
      showWorkerResult(panel, "observed", `共有カウンターは ${values.counter} です。`, values);
    } else if (values.flag === 1) {
      showWorkerResult(panel, "observed", `読み手はフラグ1を確認し、${values.read}を取得しました。`, values);
    } else {
      showWorkerResult(panel, "observed", "読み手の待機時間内にフラグが1にならず、データの読み取りは行いませんでした。", values);
    }
  } catch (error) {
    showWorkerResult(panel, "error", error.message);
  } finally {
    for (const button of WorkerButtons) button.disabled = !CanRunWorkers;
  }
}

ModelPanels.forEach(setupModel);
document.querySelector("#cross-origin-isolated").textContent = String(Isolated);
const availability = document.querySelector("#worker-availability");
availability.dataset.state = CanRunWorkers ? "available" : "unavailable";
availability.textContent = CanRunWorkers
  ? "共有メモリを使うWorkerを実行できます。各実行は新しい共有メモリで始まります。"
  : "この配信環境では手順モデルを利用できます。Workerで実行するには付属サーバーで開きます。";
document.querySelector("#worker-note").hidden = CanRunWorkers;
for (const panel of WorkerPanels) {
  const button = panel.querySelector("[data-run]");
  button.disabled = !CanRunWorkers;
  button.addEventListener("click", () => void runWorkerCase(panel));
}
