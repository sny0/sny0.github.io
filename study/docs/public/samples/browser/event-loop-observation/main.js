"use strict";

(() => {
  const runButtons = Array.from(document.querySelectorAll("[data-run]"));
  const cards = Array.from(document.querySelectorAll("[data-case]"));
  const eventLog = document.getElementById("event-log");
  const emptyLog = document.getElementById("empty-log");
  const runState = document.getElementById("run-state");
  const visibilityState = document.getElementById("visibility-state");
  const announcement = document.getElementById("announcement");
  const timers = new Set();
  let rafId = null;
  let generation = 0;
  let active = null;
  let sequence = 0;
  let runNumber = 0;

  function isCurrent(run) {
    return active === run && run.generation === generation && !run.finished;
  }

  function record(run, label, detail = "") {
    if (!isCurrent(run)) { return; }
    const time = performance.now();
    const item = document.createElement("li");
    item.value = ++sequence;
    item.dataset.case = run.name;
    item.dataset.event = label;
    const heading = document.createElement("code");
    heading.className = "entry-label";
    heading.textContent = label;
    const context = document.createElement("span");
    context.className = "entry-detail";
    context.textContent = `ケース${run.name} / 実行${run.number} / 記録時刻 ${time.toFixed(3)} ms${detail ? ` / ${detail}` : ""}`;
    item.append(heading, context);
    eventLog.append(item);
    emptyLog.hidden = true;
    while (eventLog.children.length > 40) { eventLog.firstElementChild.remove(); }
  }

  function finish(run) {
    if (!isCurrent(run)) { return; }
    run.finished = true;
    runButtons.forEach((button) => { button.disabled = false; });
    runState.textContent = `ケース${run.name}が完了しました。別のケースも実行できます。`;
    announcement.textContent = `ケース${run.name}が完了しました。`;
  }

  function scheduleTimer(run, callback) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (isCurrent(run)) { callback(); }
    }, 0);
    timers.add(id);
  }

  function scheduleFrame(run, callback) {
    const id = requestAnimationFrame((timestamp) => {
      if (rafId === id) { rafId = null; }
      if (isCurrent(run)) { callback(timestamp); }
    });
    rafId = id;
  }

  function caseA(run) {
    record(run, "sync:start");
    new Promise((resolve) => {
      record(run, "Promise:executor");
      resolve();
    }).then(() => {
      record(run, "Promise:then");
    });
    queueMicrotask(() => {
      record(run, "queueMicrotask");
    });
    async function continueAfterAwait() {
      record(run, "async:before-await");
      await Promise.resolve();
      record(run, "async:after-await");
    }
    void continueAfterAwait();
    scheduleTimer(run, () => {
      record(run, "timer:0ms");
      finish(run);
    });
    record(run, "sync:end");
  }

  function caseB(run) {
    record(run, "sync:start");
    queueMicrotask(() => {
      if (!isCurrent(run)) { return; }
      record(run, "microtask:1");
      queueMicrotask(() => {
        if (!isCurrent(run)) { return; }
        record(run, "microtask:2");
        queueMicrotask(() => {
          record(run, "microtask:3");
        });
      });
    });
    scheduleTimer(run, () => {
      record(run, "timer:0ms");
      finish(run);
    });
    record(run, "sync:end");
  }

  function caseC(run) {
    let timerDone = false;
    let frameDone = false;
    function updateCompletion() {
      if (!isCurrent(run)) { return; }
      if (timerDone && frameDone) {
        finish(run);
      } else {
        runState.textContent = timerDone
          ? "ケースC実行中。timerは完了、rAFのcallbackを待っています。非表示のタブでは遅延・抑制され得ます。"
          : "ケースC実行中。rAFは完了、timerのcallbackを待っています。";
      }
    }
    record(run, "sync:start");
    Promise.resolve().then(() => {
      record(run, "Promise:then");
    });
    // Reservation order here does not fix the relative execution order.
    scheduleFrame(run, (timestamp) => {
      record(run, "rAF:callback", `引数timestamp ${timestamp.toFixed(3)} ms / 画面表示完了の通知ではありません`);
      frameDone = true;
      updateCompletion();
    });
    scheduleTimer(run, () => {
      record(run, "timer:0ms");
      timerDone = true;
      updateCompletion();
    });
    record(run, "sync:end");
  }

  function start(name) {
    if (active && !active.finished) { return; }
    const run = { name, generation: ++generation, number: ++runNumber, finished: false };
    active = run;
    runButtons.forEach((button) => { button.disabled = true; });
    cards.forEach((card) => { card.classList.toggle("is-current", card.dataset.case === name); });
    runState.textContent = `ケース${name}を実行しています。初期化はいつでも使えます。`;
    announcement.textContent = `ケース${name}を開始しました。`;
    if (name === "A") { caseA(run); }
    if (name === "B") { caseB(run); }
    if (name === "C") { caseC(run); }
  }

  function updateVisibility() {
    visibilityState.textContent = `document.visibilityState: ${document.visibilityState}。非表示のタブではrAFが遅延・抑制され得ます。`;
  }

  function reset() {
    generation += 1;
    active = null;
    for (const id of timers) { clearTimeout(id); }
    timers.clear();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    sequence = 0;
    runNumber = 0;
    eventLog.replaceChildren();
    emptyLog.hidden = false;
    runButtons.forEach((button) => { button.disabled = false; });
    cards.forEach((card) => { card.classList.remove("is-current"); });
    runState.textContent = "待機中。ケースを一つ選んでください。";
    announcement.textContent = "ログと予約を初期化しました。";
    updateVisibility();
  }

  runButtons.forEach((button) => {
    button.addEventListener("click", () => start(button.dataset.run));
  });
  document.getElementById("reset").addEventListener("click", reset);
  document.addEventListener("visibilitychange", updateVisibility);
  updateVisibility();
})();
