"use strict";

(() => {
  const fixture = document.getElementById("fixture");
  const stage = document.getElementById("stage");
  const rows = document.getElementById("measurements");
  const measurementState = document.getElementById("measurement-state");
  const eventLog = document.getElementById("event-log");
  const announcement = document.getElementById("announcement");
  const visibilityState = document.getElementById("visibility-state");
  const rafButton = document.getElementById("raf");
  const toggleButtons = Array.from(document.querySelectorAll("[data-toggle]"));
  const state = { text: false, width: false, color: false, transform: false, opacity: false };
  const settings = {
    text: { label: "textContent", values: ["Hello", "Browser"] },
    width: { label: "width", values: ["100px", "160px"], className: "is-wide" },
    color: { label: "background-color", values: ["青", "オレンジ"], className: "is-warm" },
    transform: { label: "transform", values: ["なし", "translateX(40px)"], className: "is-shifted" },
    opacity: { label: "opacity", values: ["1", "0.5"], className: "is-translucent" }
  };
  let previous = null;
  let measurementCount = 0;
  let logCount = 0;
  let rafId = null;

  function log(message) {
    const item = document.createElement("li");
    logCount += 1;
    item.value = logCount;
    item.textContent = `${performance.now().toFixed(1)} ms — ${message}`;
    eventLog.append(item);
    while (eventLog.children.length > 20) { eventLog.firstElementChild.remove(); }
  }

  function announce(message) { announcement.textContent = message; }

  function syncButton(button) {
    const key = button.dataset.toggle;
    button.setAttribute("aria-pressed", String(state[key]));
    button.querySelector("[data-current]").textContent = settings[key].values[Number(state[key])];
  }

  function mutate(key) {
    state[key] = !state[key];
    const setting = settings[key];
    if (key === "text") {
      fixture.textContent = setting.values[Number(state[key])];
    } else {
      fixture.classList.toggle(setting.className, state[key]);
    }
    toggleButtons.forEach(syncButton);
    const message = `${setting.label}を${setting.values[Number(state[key])]}へ変更。計測APIは未実行。`;
    log(message);
    measurementState.textContent = previous
      ? `表示中の値は計測${measurementCount}回目の記録です。変更後の値は再計測してください。`
      : "まだ計測していません。変更後の値は計測ボタンで読み取れます。";
    announce(message);
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }

  function display(value) { return typeof value === "number" ? formatNumber(value) : value; }

  function difference(value, before) {
    if (before === undefined) { return "初回"; }
    if (value === before) { return "変化なし"; }
    if (typeof value === "number" && typeof before === "number") {
      const delta = value - before;
      return `${delta >= 0 ? "+" : ""}${formatNumber(delta)}`;
    }
    return `${display(before)} → ${display(value)}`;
  }

  function measure() {
    // Read all values before changing the table. These reads may require updates.
    const computed = getComputedStyle(fixture);
    const snapshot = {
      "DOM textContent": fixture.textContent,
      "DOM childElementCount": fixture.childElementCount,
      "DOM childNodes.length": fixture.childNodes.length,
      "computed box-sizing": computed.boxSizing,
      "computed width": computed.width,
      "computed height": computed.height,
      "computed background-color": computed.backgroundColor,
      "computed transform": computed.transform,
      "computed opacity": computed.opacity,
      "offsetWidth": fixture.offsetWidth,
      "offsetHeight": fixture.offsetHeight
    };
    const rect = fixture.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    snapshot["rect.width"] = rect.width;
    snapshot["rect.height"] = rect.height;
    snapshot["rect.left (viewport)"] = rect.left;
    snapshot["rect.top (viewport)"] = rect.top;
    snapshot["rect.left − stage.left"] = rect.left - stageRect.left;

    const fragment = document.createDocumentFragment();
    for (const [label, value] of Object.entries(snapshot)) {
      const row = document.createElement("tr");
      const heading = document.createElement("th");
      heading.scope = "row";
      const code = document.createElement("code");
      code.textContent = label;
      heading.append(code);
      const current = document.createElement("td");
      current.textContent = display(value);
      const change = document.createElement("td");
      const before = previous ? previous[label] : undefined;
      change.textContent = difference(value, before);
      if (previous && value !== before) { row.classList.add("is-changed"); }
      row.append(heading, current, change);
      fragment.append(row);
    }
    rows.replaceChildren(fragment);
    previous = snapshot;
    measurementCount += 1;
    measurementState.textContent = `計測${measurementCount}回目。値を読み取ってから、この表を更新しました。`;
    log(`計測${measurementCount}回目。style・layoutの更新が必要になる場合があるAPIを読み取りました。`);
    announce(`計測${measurementCount}回目の表を更新しました。`);
  }

  function updateVisibility() {
    visibilityState.textContent = `現在のdocument.visibilityState: ${document.visibilityState}。rAFの実行時刻は保証しません。`;
  }

  function scheduleFrame() {
    if (rafId !== null) { return; }
    rafButton.disabled = true;
    rafButton.textContent = "rAFを待っています…";
    log("rAFを1回予約。callbackはまだ実行されていません。");
    announce("rAFを1回予約しました。非表示のタブでは遅延・抑制される場合があります。");
    rafId = requestAnimationFrame((timestamp) => {
      rafId = null;
      rafButton.disabled = false;
      rafButton.textContent = "rAFを1回予約する";
      log(`rAF callbackに入りました。引数timestamp=${timestamp.toFixed(1)} ms、visibility=${document.visibilityState}。描画・画面表示完了の通知ではありません。`);
      announce("rAF callbackを記録しました。画面表示の完了通知ではありません。");
    });
  }

  function reset() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    for (const key of Object.keys(state)) { state[key] = false; }
    fixture.className = "fixture";
    fixture.textContent = "Hello";
    toggleButtons.forEach(syncButton);
    rafButton.disabled = false;
    rafButton.textContent = "rAFを1回予約する";
    previous = null;
    measurementCount = 0;
    rows.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "「値を計測する」で値を表示します。";
    row.append(cell);
    rows.append(row);
    measurementState.textContent = "まだ計測していません。";
    eventLog.replaceChildren();
    logCount = 0;
    updateVisibility();
    log("初期化しました。未完了のrAF予約も取り消しました。計測APIは未実行です。");
    announce("変更、計測結果、ログ、rAF予約を初期化しました。");
  }

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => mutate(button.dataset.toggle));
  });
  document.getElementById("measure").addEventListener("click", measure);
  rafButton.addEventListener("click", scheduleFrame);
  document.getElementById("reset").addEventListener("click", reset);
  document.addEventListener("visibilitychange", () => {
    updateVisibility();
    log(`visibilitychange: ${document.visibilityState}。`);
  });
  reset();
})();
