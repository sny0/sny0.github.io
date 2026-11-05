"use strict";

(() => {
  const ChunkCount = 8;
  const SinkDelayMs = 600;
  const supported = typeof ReadableStream === "function" && typeof WritableStream === "function" &&
    typeof CountQueuingStrategy === "function" && typeof AbortController === "function";
  const element = (id) => document.getElementById(id);
  const stateLabels = { idle: "待機中", running: "接続中", aborting: "中断要求済み・終端待ち",
    completed: "pipeTo fulfilled", aborted: "中断によるpipeTo rejected", error: "エラー" };
  let current = null;
  let generation = 0;
  let runNumber = 0;
  let counter = 0;
  let sequence = 0;

  function text(id, value) { element(id).textContent = String(value); }
  function owns(run) { return current === run && run.generation === generation; }
  function busy() { return current !== null && !current.settled; }
  function errorName(error) { return error && typeof error.name === "string" ? error.name : "unknown-reason"; }

  function log(run, message) {
    if (run && !owns(run)) { return; }
    const item = document.createElement("li");
    item.value = ++sequence;
    item.textContent = `${performance.now().toFixed(1)} ms — ${run ? `実行${run.number}：` : ""}${message}`;
    element("event-log").append(item);
    while (element("event-log").children.length > 60) { element("event-log").firstElementChild.remove(); }
  }

  function displaySize(value) { return value === null ? "null" : String(value); }

  function render() {
    const run = current;
    const stats = run ? run.stats : { generated: 0, started: 0, completed: 0, interrupted: 0, sourceCancel: 0, sinkAbort: 0 };
    const state = run ? run.state : "idle";
    element("stream-state").dataset.state = state;
    text("stream-state", `状態：${stateLabels[state]}`);
    element("start").disabled = !supported || busy();
    element("abort").disabled = !busy() || run.abortController.signal.aborted;
    text("counter-value", counter);
    for (const name of ["generated", "started", "completed", "interrupted"]) { text(`${name}-count`, stats[name]); }
    text("outstanding-count", stats.generated - stats.completed);
    text("not-started-count", stats.generated - stats.started);
    text("active-chunk", run && run.activeChunk !== null ? run.activeChunk : "なし");
    text("source-cancel-count", stats.sourceCancel);
    text("sink-abort-count", stats.sinkAbort);
    text("pipe-outcome", run ? run.pipeOutcome : "未開始");
    text("readable-locked", run && run.readable ? run.readable.locked : "未作成");
    text("writable-locked", run && run.writable ? run.writable.locked : "未作成");
    const records = run ? run.enqueueRecords : [];
    const last = records[records.length - 1];
    text("latest-desired", last ? `${displaySize(last.before)} → ${displaySize(last.after)}` : "未記録");
    const fragment = document.createDocumentFragment();
    for (const record of records) {
      const row = document.createElement("tr");
      row.dataset.chunk = record.id;
      [record.id, displaySize(record.before), displaySize(record.after)].forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) { cell.scope = "row"; }
        cell.textContent = String(value);
        row.append(cell);
      });
      fragment.append(row);
    }
    if (records.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = "まだ生成していません。";
      row.append(cell);
      fragment.append(row);
    }
    element("enqueue-rows").replaceChildren(fragment);
  }

  function checkCounts(run) {
    const stats = run.stats;
    const active = stats.started - stats.completed - stats.interrupted;
    if (stats.generated > ChunkCount || stats.started > stats.generated || stats.completed > stats.started ||
        active < 0 || active > 1 || (run.activeChunk === null) !== (active === 0)) {
      throw new Error("stream-model-counts-inconsistent");
    }
  }

  function cancelPendingDelay(run, reason) {
    if (run.pendingDelay) { run.pendingDelay.cancel(reason); }
  }

  function waitForSink(run) {
    if (run.pendingDelay) { throw new Error("concurrent-sink-write"); }
    return new Promise((resolve, reject) => {
      const signal = run.abortController.signal;
      let done = false;
      const pending = { timer: null, cancel: null, onAbort: null };
      function settle(interrupted, reason) {
        if (done) { return; }
        done = true;
        clearTimeout(pending.timer);
        signal.removeEventListener("abort", pending.onAbort);
        if (run.pendingDelay === pending) { run.pendingDelay = null; }
        if (interrupted) { reject(reason); } else { resolve(); }
      }
      pending.cancel = (reason) => settle(true, reason === undefined
        ? signal.aborted ? signal.reason : new DOMException("待機を取り消しました。", "AbortError")
        : reason);
      pending.onAbort = () => pending.cancel(signal.reason);
      run.pendingDelay = pending;
      pending.timer = setTimeout(() => settle(false), SinkDelayMs);
      signal.addEventListener("abort", pending.onAbort, { once: true });
      if (signal.aborted) { pending.cancel(signal.reason); }
    });
  }

  function requestAbort(run) {
    if (!owns(run) || run.settled || run.abortController.signal.aborted) { return; }
    run.state = "aborting";
    text("operation-state", "中断を要求しました。進行中writeの待機を片付け、pipeToの終端を待っています。");
    log(run, "AbortController.abort()を呼びます。要求しただけで再実行可能にはしません。");
    run.abortController.abort(new DOMException("この実行を中断しました。", "AbortError"));
    render();
  }

  async function execute(run) {
    let outcome = "error";
    let pipeFulfilled = false;
    try {
      run.readable = new ReadableStream({
        pull(controller) {
          if (!owns(run) || run.settled || run.abortController.signal.aborted) { return; }
          const id = run.stats.generated + 1;
          if (id > ChunkCount) { throw new Error("too-many-pulls"); }
          const before = controller.desiredSize;
          controller.enqueue(new Uint8Array([id, 10, 20, 30]));
          const after = controller.desiredSize;
          run.stats.generated += 1;
          run.enqueueRecords.push({ id, before, after });
          log(run, `pull → chunk ${id}をenqueue。desiredSize ${displaySize(before)} → ${displaySize(after)}。`);
          if (id === ChunkCount) {
            controller.close();
            log(run, "8chunkを生成しsource.closeを要求。pipeTo全体の完了ではありません。");
          }
          checkCounts(run);
          render();
        },
        cancel(reason) {
          run.stats.sourceCancel += 1;
          log(run, `source.cancel callback。reason=${errorName(reason)}。`);
          if (owns(run)) { render(); }
        }
      }, new CountQueuingStrategy({ highWaterMark: 2 }));

      run.writable = new WritableStream({
        write(chunk) {
          if (!(chunk instanceof Uint8Array) || chunk.length !== 4 ||
              chunk[0] !== run.stats.started + 1 || chunk[1] !== 10 || chunk[2] !== 20 || chunk[3] !== 30) {
            throw new Error("invalid-or-out-of-order-chunk");
          }
          const id = chunk[0];
          run.stats.started += 1;
          run.activeChunk = id;
          log(run, `sink.write chunk ${id}を開始。timerへ${SinkDelayMs}msを指定。`);
          checkCounts(run);
          if (owns(run)) { render(); }
          // The same signal settles this wait directly; sink.abort is not awaited
          // to cancel the timer, because pipe shutdown can first await this write.
          function interruptedWrite(reason) {
            run.activeChunk = null;
            run.stats.interrupted += 1;
            log(run, `chunk ${id}の待機を片付け、writeをreject。通常消費完了へは数えません。`);
            checkCounts(run);
            if (owns(run)) { render(); }
            throw reason;
          }
          return waitForSink(run).then(() => {
            // An abort can occur after the timer resolves but before this reaction.
            if (run.abortController.signal.aborted) {
              return interruptedWrite(run.abortController.signal.reason);
            }
            run.activeChunk = null;
            run.stats.completed += 1;
            log(run, `chunk ${id}を通常消費完了。`);
            checkCounts(run);
            if (owns(run)) { render(); }
          }, interruptedWrite);
        },
        close() {
          log(run, "sink.close callback。まだpipeToのfulfilled表示は行いません。");
        },
        abort(reason) {
          cancelPendingDelay(run, reason);
          run.stats.sinkAbort += 1;
          log(run, `sink.abort callback。reason=${errorName(reason)}。`);
          if (owns(run)) { render(); }
        }
      }, new CountQueuingStrategy({ highWaterMark: 1 }));

      log(run, "Readable HWM2 → pipeTo(signal) → Writable HWM1を接続。");
      run.pipeOutcome = "pending";
      const pipePromise = run.readable.pipeTo(run.writable, { signal: run.abortController.signal });
      run.pipeStarted = true;
      render();
      await pipePromise;
      pipeFulfilled = true;
      run.pipeOutcome = "fulfilled";
      log(run, "pipeTo Promiseがfulfilled。ここで通常完了を確認します。");
      if (run.stats.generated !== ChunkCount || run.stats.started !== ChunkCount ||
          run.stats.completed !== ChunkCount || run.stats.interrupted !== 0) {
        throw new Error("incomplete-normal-consumption");
      }
      outcome = "completed";
    } catch (error) {
      if (!pipeFulfilled) {
        run.pipeOutcome = `${run.pipeStarted ? "rejected" : "開始失敗"} / ${errorName(error)}`;
      }
      outcome = run.abortController.signal.aborted && error === run.abortController.signal.reason ? "aborted" : "error";
      log(run, `${pipeFulfilled ? "pipeTo fulfilled後の教材検査エラー" : "終端をcatch"}：${errorName(error)}。`);
      if (!run.pipeStarted) {
        // Construction failure has no pipe to clean up the unlocked endpoints.
        const cleanup = [];
        if (run.readable && !run.readable.locked) { cleanup.push(run.readable.cancel(error)); }
        if (run.writable && !run.writable.locked) { cleanup.push(run.writable.abort(error)); }
        await Promise.allSettled(cleanup);
      }
    } finally {
      cancelPendingDelay(run);
      run.settled = true;
      run.state = outcome;
      if (owns(run)) {
        log(run, `利用者側の待機timerを片付けました。locked: readable=${run.readable ? run.readable.locked : "未作成"}, writable=${run.writable ? run.writable.locked : "未作成"}。`);
        if (run.resetAfterSettled) {
          clearView();
        } else {
          text("operation-state", "pipeToの終端を回収しました。表示はこの実行の記録です。再実行できます。");
          text("announcement", outcome === "completed" ? "8chunkの通常完了を確認しました。" : "処理の終端を回収しました。");
          render();
        }
      }
    }
  }

  function start() {
    if (!supported || busy()) { return; }
    const run = { generation: ++generation, number: ++runNumber, abortController: new AbortController(),
      state: "running", settled: false, resetAfterSettled: false, pendingDelay: null, activeChunk: null,
      readable: null, writable: null, pipeStarted: false, pipeOutcome: "未接続", enqueueRecords: [],
      stats: { generated: 0, started: 0, completed: 0, interrupted: 0, sourceCancel: 0, sinkAbort: 0 } };
    current = run;
    sequence = 0;
    element("event-log").replaceChildren();
    text("operation-state", "8chunkを生成し、遅いsinkへ接続します。mainカウンターは操作できます。");
    text("announcement", "ストリーム処理を開始しました。");
    render();
    void execute(run).catch((error) => {
      // Covers an unexpected failure in terminal UI/cleanup, not just pipe rejection.
      cancelPendingDelay(run);
      if (owns(run)) {
        run.settled = true;
        run.state = "error";
        text("stream-state", `状態：予期しない後片付けエラー ${errorName(error)}`);
        element("stream-state").dataset.state = "error";
        text("announcement", "後片付け中のエラーを記録しました。");
      }
    });
  }

  function clearView() {
    if (busy()) { return; }
    generation += 1;
    current = null;
    counter = 0;
    sequence = 0;
    element("event-log").replaceChildren();
    text("operation-state", "表示を初期化しました。新しい実行を開始できます。");
    text("announcement", "処理の終端後に表示を初期化しました。");
    render();
  }

  element("start").addEventListener("click", start);
  element("abort").addEventListener("click", () => {
    if (current) { requestAbort(current); }
  });
  element("reset").addEventListener("click", () => {
    if (busy()) {
      current.resetAfterSettled = true;
      requestAbort(current);
    } else {
      clearView();
    }
  });
  element("counter-button").addEventListener("click", () => {
    counter += 1;
    log(current, `mainカウンター=${counter}。`);
    render();
  });
  if (!supported) { text("support-note", "必要なStreams API等を利用できない環境です。対応するブラウザで開いてください。"); }
  render();
})();
