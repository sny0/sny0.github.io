"use strict";

(() => {
  const WorkerCount = 2;
  const QueueLimit = 4;
  const HistoryLimit = 20;
  const SoftTimeoutMs = 8000;
  const hosted = location.protocol === "http:" || location.protocol === "https:";
  const supported = typeof Worker === "function";
  const stats = { accepted: 0, completed: 0, rejected: 0, queuedCancelled: 0, discarded: 0, aborted: 0 };
  const live = new Map();
  const history = [];
  const queue = [];
  const terminalCounters = { completed: "completed", "queued-cancelled": "queuedCancelled",
    discarded: "discarded", aborted: "aborted" };
  const labels = { queued: "待機", running: "実行中", "discard-pending": "結果破棄待ち",
    completed: "採用完了", rejected: "受付拒否", "queued-cancelled": "待機取消",
    discarded: "結果破棄", aborted: "停止打切り" };
  const stateLabels = { stopped: "停止", starting: "起動中（ready待ち）", idle: "ready・空き",
    active: "要求を処理中", error: "エラー（poolは停止済み）" };
  let current = null;
  let state = "stopped";
  let generation = 0;
  let nextId = 0;
  let sequence = 0;
  let counter = 0;

  const element = (id) => document.getElementById(id);
  function text(id, value) { element(id).textContent = String(value); }

  function log(message) {
    const item = document.createElement("li");
    item.value = ++sequence;
    item.textContent = `${performance.now().toFixed(1)} ms — ${message}`;
    element("event-log").append(item);
    while (element("event-log").children.length > 60) { element("event-log").firstElementChild.remove(); }
  }

  function owns(pool, slot, worker) {
    return current === pool && pool.generation === generation &&
      pool.slots.includes(slot) && slot.worker === worker;
  }

  function runningCount() {
    return current ? current.slots.filter((slot) => slot.job !== null).length : 0;
  }

  function terminalTotal() {
    return stats.completed + stats.queuedCancelled + stats.discarded + stats.aborted;
  }

  function remember(job) {
    history.push(job);
    while (history.length > HistoryLimit) { history.shift(); }
  }

  function finalize(job, status, detail) {
    if (live.get(job.id) !== job) { return false; }
    const counterName = terminalCounters[status];
    if (!counterName) { throw new Error("invalid-terminal-status"); }
    live.delete(job.id);
    job.status = status;
    job.detail = detail;
    stats[counterName] += 1;
    remember(job);
    return true;
  }

  function checkModel() {
    const running = runningCount();
    if (running > WorkerCount || queue.length > QueueLimit ||
        live.size !== running + queue.length || stats.accepted !== running + queue.length + terminalTotal()) {
      throw new Error("accounting-invariant-failed");
    }
    const seen = new Set();
    for (const job of queue) {
      if (seen.has(job.id) || live.get(job.id) !== job || job.status !== "queued") {
        throw new Error("queue-invariant-failed");
      }
      seen.add(job.id);
    }
    if (current) {
      for (const slot of current.slots) {
        const job = slot.job;
        if (!job) { continue; }
        if (!slot.ready || seen.has(job.id) || live.get(job.id) !== job ||
            (job.status !== "running" && job.status !== "discard-pending") || job.slot !== slot.index) {
          throw new Error("slot-invariant-failed");
        }
        seen.add(job.id);
      }
    }
    if (seen.size !== live.size) { throw new Error("live-job-invariant-failed"); }
  }

  function render() {
    if (current) {
      state = current.slots.length === WorkerCount && current.slots.every((slot) => slot.ready)
        ? (live.size === 0 ? "idle" : "active") : "starting";
    }
    element("pool-state").dataset.state = state;
    text("pool-state", `状態：${stateLabels[state]}`);
    element("start").disabled = !hosted || !supported || current !== null;
    element("stop").disabled = current === null;
    element("batch").disabled = state !== "idle";
    element("cancel-queued").disabled = !current || queue.length === 0;
    element("discard-running").disabled = !current || !current.slots.some((slot) => slot.job && !slot.job.discardPending);
    text("counter-value", counter);
    text("next-id", nextId + 1);
    const running = runningCount();
    text("ready-count", current ? current.slots.filter((slot) => slot.ready).length : 0);
    text("running-count", running);
    text("waiting-count", queue.length);
    for (const [name, value] of Object.entries(stats)) { text(`stat-${name}`, value); }
    const accounted = running + queue.length + terminalTotal();
    text("invariant-state", `不変条件：${stats.accepted} = ${accounted}${stats.accepted === accounted ? "（一致）" : "（不一致）"}`);
    for (let index = 0; index < WorkerCount; index += 1) {
      const slot = current && current.slots.find((item) => item.index === index);
      const job = slot && slot.job;
      const slotState = !slot ? "stopped" : !slot.ready ? "starting" : job ? job.status : "idle";
      element(`slot-${index}`).dataset.state = slotState;
      text(`slot-${index}-state`, !slot ? "停止" : !slot.ready ? "ready待ち" : job ? labels[job.status] : "ready / 空き");
      text(`slot-${index}-job`, job ? `要求${job.id}${job.discardPending ? "：結果を回収するまで枠を保持" : "：返信待ち"}` : "要求なし");
    }
    const fragment = document.createDocumentFragment();
    const jobs = [...history, ...live.values()].sort((a, b) => b.id - a.id);
    for (const job of jobs) {
      const row = document.createElement("tr");
      row.dataset.id = job.id;
      row.dataset.status = job.status;
      const values = [job.id, `${labels[job.status]} (${job.status})`,
        `${job.slot === null ? "未送信" : `slot ${job.slot}`} / ${job.detail}`,
        job.status === "completed" ? `count=${job.count}, sum=${job.sum}` : "—"];
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) { cell.scope = "row"; }
        cell.textContent = String(value);
        row.append(cell);
      });
      fragment.append(row);
    }
    if (jobs.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "要求はまだありません。";
      row.append(cell);
      fragment.append(row);
    }
    element("job-rows").replaceChildren(fragment);
  }

  function stopPool(nextState, message) {
    const old = current;
    generation += 1;
    current = null;
    if (old) {
      for (const slot of old.slots) {
        clearTimeout(slot.startupTimer);
        clearTimeout(slot.jobTimer);
        slot.worker.terminate();
        slot.job = null;
      }
    }
    for (const job of Array.from(live.values())) { finalize(job, "aborted", "pool停止で打切り"); }
    queue.length = 0;
    state = nextState;
    text("operation-state", message);
    text("announcement", message);
    log(message);
  }

  function perform(action) {
    try {
      action();
      checkModel();
      render();
    } catch (error) {
      stopPool("error", `エラーでpool全停止：${error.name} / ${error.message}`);
      render();
    }
  }

  function dispatch(pool, slot, job) {
    job.slot = slot.index;
    job.status = "running";
    job.detail = "dispatch済み・返信待ち";
    slot.job = job;
    // The job timeout starts at dispatch, never while waiting in the queue.
    slot.jobTimer = setTimeout(() => {
      if (owns(pool, slot, slot.worker) && slot.job === job) {
        perform(() => stopPool("error", `要求${job.id}：dispatch後8秒のsoft timeoutでpool全停止。`));
      }
    }, SoftTimeoutMs);
    slot.worker.postMessage({ type: "run", id: job.id, slot: slot.index,
      generation: pool.generation, values: Array.from({ length: 16 }, (_, index) => index) });
    log(`要求${job.id}をslot ${slot.index}へdispatch。job timeoutはここから8秒。`);
  }

  function pump(pool) {
    if (current !== pool || !pool.slots.every((slot) => slot.ready)) { return; }
    for (const slot of pool.slots) {
      if (!slot.job && queue.length > 0) { dispatch(pool, slot, queue.shift()); }
    }
  }

  function receive(pool, slot, worker, event) {
    if (!owns(pool, slot, worker)) { return; }
    perform(() => {
      const data = event.data;
      if (!data || typeof data !== "object" || typeof data.type !== "string") {
        throw new Error("malformed-worker-message");
      }
      if (data.type === "ready") {
        if (slot.ready || slot.job || data.protocol !== 1) { throw new Error("unexpected-or-duplicate-ready"); }
        clearTimeout(slot.startupTimer);
        slot.startupTimer = null;
        slot.ready = true;
        log(`世代${pool.generation}：slot ${slot.index}のreadyを受信。`);
        if (pool.slots.length === WorkerCount && pool.slots.every((item) => item.ready)) {
          text("operation-state", "ready 2/2。一括依頼を受け付けます。");
          text("announcement", "2つのWorkerがreadyになりました。");
        }
        return;
      }
      if (data.type === "protocol-error") { throw new Error("worker-protocol-error"); }
      const job = slot.job;
      if (data.type !== "result" || !job || !Number.isSafeInteger(data.id) || data.id !== job.id ||
          data.slot !== slot.index || data.generation !== pool.generation || data.count !== 16 || data.sum !== 120) {
        throw new Error("unexpected-duplicate-or-invalid-result");
      }
      clearTimeout(slot.jobTimer);
      slot.jobTimer = null;
      const terminal = job.discardPending ? "discarded" : "completed";
      if (!job.discardPending) { job.count = data.count; job.sum = data.sum; }
      if (!finalize(job, terminal, job.discardPending ? "返信を回収して結果を破棄" : "count16・sum120を採用")) {
        throw new Error("job-already-terminal");
      }
      slot.job = null;
      log(`要求${job.id}：${terminal}。slot ${slot.index}を解放。`);
      pump(pool);
      if (live.size === 0) {
        text("operation-state", "受付済みの全要求が終端に達しました。次の一括依頼が可能です。");
        text("announcement", "一括依頼の処理が完了しました。");
      }
    });
  }

  function startPool() {
    if (!hosted || !supported || current) { return; }
    const pool = { generation: ++generation, slots: [] };
    current = pool;
    state = "starting";
    text("operation-state", "2つのworker.jsを起動し、各readyを待っています。");
    for (let index = 0; index < WorkerCount; index += 1) {
      const worker = new Worker("./worker.js");
      const slot = { index, worker, ready: false, job: null, startupTimer: null, jobTimer: null };
      pool.slots.push(slot);
      worker.addEventListener("message", (event) => receive(pool, slot, worker, event));
      worker.addEventListener("error", (event) => {
        if (!owns(pool, slot, worker)) { return; }
        event.preventDefault();
        perform(() => stopPool("error", `slot ${index}のworker errorでpool全停止。`));
      });
      worker.addEventListener("messageerror", () => {
        if (owns(pool, slot, worker)) { perform(() => stopPool("error", `slot ${index}のmessageerrorでpool全停止。`)); }
      });
      slot.startupTimer = setTimeout(() => {
        if (owns(pool, slot, worker) && !slot.ready) {
          perform(() => stopPool("error", `slot ${index}：ready待ち8秒のsoft timeoutでpool全停止。`));
        }
      }, SoftTimeoutMs);
      log(`世代${pool.generation}：slot ${index}のWorkerを生成。`);
    }
  }

  function submit(pool) {
    const id = ++nextId;
    const idle = pool.slots.some((slot) => slot.ready && !slot.job);
    if (!idle && queue.length >= QueueLimit) {
      stats.rejected += 1;
      remember({ id, status: "rejected", slot: null, detail: "待機4件が満杯" });
      log(`要求${id}を受付拒否。実行2/2・待機4/4。`);
      return;
    }
    const job = { id, status: "queued", slot: null, detail: "FIFO待機・未送信", discardPending: false };
    live.set(id, job);
    stats.accepted += 1;
    queue.push(job);
    log(`要求${id}を受付。`);
    pump(pool);
  }

  function batch() {
    const pool = current;
    if (!pool || state !== "idle" || live.size !== 0) { return; }
    const acceptedBefore = stats.accepted;
    const rejectedBefore = stats.rejected;
    // One synchronous handler fixes the initial 2 running + 4 waiting + 1 rejected.
    for (let index = 0; index < 7; index += 1) { submit(pool); }
    text("last-batch", `直近の7件：accepted=${stats.accepted - acceptedBefore} / rejected=${stats.rejected - rejectedBefore}`);
    text("operation-state", "7件をまとめて依頼しました。実行2件・待機4件・受付拒否1件です。");
    text("announcement", "6件を受け付け、1件を拒否しました。");
  }

  function cancelQueued() {
    if (!current || queue.length === 0) { return; }
    const job = queue.shift();
    if (!finalize(job, "queued-cancelled", "未送信のまま待機を取消し")) { throw new Error("queued-job-already-terminal"); }
    log(`要求${job.id}を待機先頭から取消し。workerへ未送信です。`);
    text("announcement", `待機中の要求${job.id}を取り消しました。`);
    pump(current);
  }

  function discardRunning() {
    if (!current) { return; }
    const slot = current.slots.find((item) => item.job && !item.job.discardPending);
    if (!slot) { return; }
    const job = slot.job;
    job.discardPending = true;
    job.status = "discard-pending";
    job.detail = "返信まで実行枠を保持";
    log(`要求${job.id}を結果破棄待ちにしました。実行枠はまだ解放しません。`);
    text("announcement", `要求${job.id}は返信後に結果を破棄します。`);
  }

  function reset() {
    stopPool("stopped", "初期化のためpoolを停止しました。");
    Object.keys(stats).forEach((key) => { stats[key] = 0; });
    history.length = 0;
    counter = 0;
    sequence = 0;
    element("event-log").replaceChildren();
    text("last-batch", "一括依頼はまだ実行していません。");
    text("operation-state", "集計・履歴を初期化しました。要求IDは再利用しません。");
    text("announcement", "停止して初期化しました。要求IDは保持しています。");
  }

  element("start").addEventListener("click", () => perform(startPool));
  element("stop").addEventListener("click", () => perform(() => {
    if (current) { stopPool("stopped", "poolを停止し、実行中と待機中の要求をabortedにしました。"); }
  }));
  element("reset").addEventListener("click", () => perform(reset));
  element("batch").addEventListener("click", () => perform(batch));
  element("cancel-queued").addEventListener("click", () => perform(cancelQueued));
  element("discard-running").addEventListener("click", () => perform(discardRunning));
  element("counter-button").addEventListener("click", () => perform(() => {
    counter += 1;
    log(`mainカウンター=${counter}。`);
  }));
  if (!hosted) {
    text("hosting-note", "file://では起動しません。HTTP(s)で5ファイルを同じoriginから配信してください。");
  } else if (!supported) {
    text("hosting-note", "この環境ではWorker APIを利用できません。対応ブラウザで開いてください。");
  }
  render();
})();
