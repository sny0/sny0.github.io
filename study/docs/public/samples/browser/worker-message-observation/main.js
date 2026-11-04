"use strict";

(() => {
  const startButton = document.getElementById("start");
  const stopButton = document.getElementById("stop");
  const jobButtons = Array.from(document.querySelectorAll("[data-job]"));
  const workerState = document.getElementById("worker-state");
  const jobState = document.getElementById("job-state");
  const caption = document.getElementById("table-caption");
  const eventLog = document.getElementById("event-log");
  const announcement = document.getElementById("announcement");
  const fieldIds = ["sender-before", "sender-after", "sender-first", "worker-length",
    "worker-first", "worker-sum", "result-length", "result-first", "worker-after",
    "delay-result", "clone-error"];
  const hosted = location.protocol === "http:" || location.protocol === "https:";
  const supported = typeof Worker === "function";
  const stateLabels = { stopped: "停止", starting: "起動中（ready待ち）", ready: "ready",
    pending: "返信待ち", error: "エラー（workerは停止済み）" };
  let state = "stopped";
  let current = null;
  let generation = 0;
  let nextId = 0;
  let sequence = 0;
  let counter = 0;

  function field(id, value) { document.getElementById(id).textContent = String(value); }

  function log(message) {
    const item = document.createElement("li");
    item.value = ++sequence;
    item.textContent = `${performance.now().toFixed(1)} ms — ${message}`;
    eventLog.append(item);
    while (eventLog.children.length > 40) { eventLog.firstElementChild.remove(); }
  }

  function setState(next) {
    state = next;
    workerState.dataset.state = next;
    workerState.textContent = `状態：${stateLabels[next]}`;
    startButton.disabled = !hosted || !supported || current !== null;
    stopButton.disabled = current === null;
    jobButtons.forEach((button) => { button.disabled = next !== "ready"; });
  }

  function owns(session) {
    return current === session && current.worker === session.worker && session.generation === generation;
  }

  function disposeSession(session) {
    clearTimeout(session.startupTimer);
    if (session.job) { clearTimeout(session.job.timer); }
    session.job = null;
    session.worker.terminate();
  }

  function endSession(nextState, message) {
    const old = current;
    generation += 1;
    current = null;
    if (old) { disposeSession(old); }
    setState(nextState);
    jobState.textContent = message;
    log(message);
    announcement.textContent = message;
  }

  function fail(session, message) {
    if (owns(session)) { endSession("error", message); }
  }

  function finishJob(session, message) {
    if (!owns(session) || !session.job) { return; }
    const id = session.job.id;
    clearTimeout(session.job.timer);
    session.job = null;
    setState("ready");
    jobState.textContent = `要求${id}が完了しました。${message}`;
    log(`要求${id} 完了：${message}`);
    announcement.textContent = `要求${id}が完了しました。`;
  }

  function validResultBuffer(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== 16) { return false; }
    return new Uint8Array(buffer).every((value, index) => value === (index === 0 ? 255 : index));
  }

  function handleMessage(session, event) {
    if (!owns(session)) { return; }
    const data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") {
      fail(session, "mainが不正なメッセージ形式を受信しました。");
      return;
    }
    if (data.type === "ready") {
      if (state !== "starting" || data.protocol !== 1) {
        fail(session, "想定外のreadyメッセージを受信しました。");
        return;
      }
      clearTimeout(session.startupTimer);
      setState("ready");
      jobState.textContent = "readyを受信しました。一件ずつ要求できます。";
      log(`世代${session.generation}：workerのreadyを受信。`);
      announcement.textContent = "Workerがreadyになりました。";
      return;
    }
    const job = session.job;
    if (data.type === "protocol-error") {
      const code = typeof data.code === "string" ? data.code.slice(0, 80) : "invalid-error-code";
      fail(session, `workerのプロトコルエラー：id=${String(data.id)} / ${code}`);
      return;
    }
    if (!job || !Number.isSafeInteger(data.id) || data.id !== job.id) {
      fail(session, "実行中の要求とtype/idが一致しない返信を受信しました。");
      return;
    }
    if (data.type === "delay-result") {
      if (job.mode !== "delay" || data.requestedDelayMs !== 3000) {
        fail(session, "遅延応答の内容が契約と一致しません。");
        return;
      }
      field("delay-result", `timer要求3000ms / main経過 ${(performance.now() - job.startedAt).toFixed(1)}ms`);
      finishJob(session, "workerのtimerから返信を受信しました。");
      return;
    }
    if (data.type === "transfer-state") {
      if (job.mode !== "transfer" || job.transferStateReceived || data.byteLength !== 0) {
        fail(session, "transfer返却後の状態が契約と一致しません。");
        return;
      }
      job.transferStateReceived = true;
      field("worker-after", data.byteLength);
      log(`要求${job.id} transfer-state：workerの返却後byteLength=0。`);
      if (job.resultReceived) { finishJob(session, "返信bufferとtransfer-stateの両方を確認しました。"); }
      return;
    }
    if (data.type !== "result" || (job.mode !== "copy" && job.mode !== "transfer") ||
        data.mode !== job.mode || job.resultReceived || data.lengthBefore !== 16 ||
        data.firstBefore !== 0 || data.sumBefore !== 120 || !validResultBuffer(data.buffer)) {
      fail(session, "buffer返信のtype/id・内容が契約と一致しません。");
      return;
    }
    if (job.mode === "copy" && (job.sender.byteLength !== 16 || new Uint8Array(job.sender)[0] !== 0)) {
      fail(session, "copyの送信元が変更されていました。");
      return;
    }
    if (job.mode === "transfer" && job.sender.byteLength !== 0) {
      fail(session, "transferの送信元がdetachedではありません。");
      return;
    }
    job.resultReceived = true;
    field("worker-length", data.lengthBefore);
    field("worker-first", data.firstBefore);
    field("worker-sum", data.sumBefore);
    field("result-length", data.buffer.byteLength);
    field("result-first", new Uint8Array(data.buffer)[0]);
    log(`要求${job.id} result：worker変更前16/0/120、返信16バイト・先頭255を確認。`);
    if (job.mode === "copy") {
      field("sender-after", job.sender.byteLength);
      field("sender-first", new Uint8Array(job.sender)[0]);
      field("worker-after", "transfer対象外");
      finishJob(session, "copyの送信元は16バイト・先頭0のままです。");
    } else if (job.transferStateReceived) {
      finishJob(session, "返信bufferとtransfer-stateの両方を確認しました。");
    }
  }

  function start() {
    if (!hosted || !supported || current) { return; }
    setState("starting");
    try {
      const worker = new Worker("./worker.js");
      const session = { worker, generation: ++generation, startupTimer: null, job: null };
      current = session;
      setState("starting");
      jobState.textContent = "worker.jsを起動し、readyメッセージを待っています。";
      log(`世代${session.generation}：new Worker('./worker.js')。`);
      session.startupTimer = setTimeout(() => {
        fail(session, "起動のsoft timeout：8秒でreadyを確認できずworkerを停止しました。");
      }, 8000);
      worker.addEventListener("message", (event) => handleMessage(session, event));
      worker.addEventListener("error", (event) => {
        if (!owns(session)) { return; }
        event.preventDefault();
        fail(session, `workerのerrorイベント：${event.message || "script error"}`);
      });
      worker.addEventListener("messageerror", () => fail(session, "mainのmessageerrorイベント：返信の復元に失敗しました。"));
    } catch (error) {
      endSession("error", `new Workerの同期例外：${error.name}`);
    }
  }

  function sendJob(mode) {
    const session = current;
    if (!session || state !== "ready" || session.job) { return; }
    fieldIds.forEach((id) => field(id, "—"));
    const job = { id: ++nextId, mode, sender: null, resultReceived: false,
      transferStateReceived: false, startedAt: performance.now(), timer: null };
    session.job = job;
    setState("pending");
    caption.textContent = `要求${job.id} / ${mode} の記録`;
    jobState.textContent = `要求${job.id}（${mode}）を送信し、返信を待ちます。`;
    job.timer = setTimeout(() => fail(session, `要求${job.id}のsoft timeout：workerを停止しました。`), 8000);
    if (mode === "function") {
      try {
        session.worker.postMessage({ type: "cannot-clone", id: job.id, value: () => 1 });
        fail(session, "期待した同期DataCloneErrorが発生しませんでした。");
      } catch (error) {
        if (error.name === "DataCloneError") {
          field("clone-error", error.name);
          log(`要求${job.id}：mainのpostMessageが同期DataCloneError。workerのerrorイベントとは別です。`);
          finishJob(session, "関数を送れない期待結果を確認しました。");
        } else {
          fail(session, `postMessageの想定外の同期例外：${error.name}`);
        }
      }
      return;
    }
    try {
      if (mode === "delay") {
        session.worker.postMessage({ type: "delay", id: job.id });
        log(`要求${job.id}：workerのtimerへ3000msを要求。mainカウンターと停止を操作できます。`);
        return;
      }
      const buffer = new ArrayBuffer(16);
      const bytes = new Uint8Array(buffer);
      bytes.forEach((_, index) => { bytes[index] = index; });
      job.sender = buffer;
      field("sender-before", buffer.byteLength);
      if (mode === "transfer") {
        session.worker.postMessage({ type: mode, id: job.id, buffer }, [buffer]);
        field("sender-after", buffer.byteLength);
        field("sender-first", "detached（読まない）");
        if (buffer.byteLength !== 0) { throw new Error("sender-not-detached"); }
      } else {
        session.worker.postMessage({ type: mode, id: job.id, buffer });
        field("sender-after", buffer.byteLength);
        field("sender-first", new Uint8Array(buffer)[0]);
        if (buffer.byteLength !== 16 || new Uint8Array(buffer)[0] !== 0) { throw new Error("copy-sender-changed"); }
      }
      log(`要求${job.id} ${mode}送信直後：sender.byteLength=${buffer.byteLength}。`);
    } catch (error) {
      fail(session, `送信の同期例外または検査失敗：${error.name}。workerを停止しました。`);
    }
  }

  startButton.addEventListener("click", start);
  stopButton.addEventListener("click", () => {
    if (current) { endSession("stopped", "Worker.terminate()を呼びました。未完了の要求を破棄し、古い返信による表示を無効にしました。"); }
  });
  jobButtons.forEach((button) => button.addEventListener("click", () => sendJob(button.dataset.job)));
  document.getElementById("counter-button").addEventListener("click", () => {
    counter += 1;
    field("counter-value", counter);
    log(`mainカウンター=${counter}（worker状態=${state}）。`);
  });
  document.getElementById("clear-log").addEventListener("click", () => {
    eventLog.replaceChildren();
    sequence = 0;
    announcement.textContent = "表示ログを消しました。workerと要求の状態は変えていません。";
  });
  if (!hosted) {
    document.getElementById("hosting-note").textContent = "file://等では起動しません。HTTPまたはHTTPSで5ファイルを同じoriginから配信してください。";
  } else if (!supported) {
    document.getElementById("hosting-note").textContent = "この環境ではWorker APIを利用できません。対応するブラウザで開いてください。";
  }
  setState("stopped");
})();
