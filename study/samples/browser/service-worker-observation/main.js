"use strict";

(() => {
  const ScopeUrl = new URL("./", location.href).href;
  const ScriptUrl = new URL("./sw.js", ScopeUrl).href;
  const PayloadUrl = new URL("./payload.json", ScopeUrl).href;
  const SimulatedUrl = `${PayloadUrl}?mode=offline`;
  const CacheName = "sny0-study-service-worker-observation-v1";
  const FixtureMessage = "Service Workerの固定テスト";
  const loopback = location.hostname === "localhost" || location.hostname.endsWith(".localhost") ||
    location.hostname === "127.0.0.1" || location.hostname === "[::1]" || location.hostname === "::1";
  const contextAllowed = window.isSecureContext &&
    (location.protocol === "https:" || (location.protocol === "http:" && loopback));
  const container = contextAllowed && "serviceWorker" in navigator ? navigator.serviceWorker : null;
  const element = (id) => document.getElementById(id);
  const observedRegistrations = new WeakSet();
  const observedWorkers = new WeakSet();
  const knownControllers = new WeakSet();
  let registration = null;
  let checked = false;
  let busy = false;
  let inspection = 0;
  let sequence = 0;

  function text(id, value) { element(id).textContent = String(value); }
  function log(message) {
    const item = document.createElement("li");
    item.value = ++sequence;
    item.textContent = `${performance.now().toFixed(1)} ms — ${message}`;
    element("event-log").append(item);
    while (element("event-log").children.length > 60) { element("event-log").firstElementChild.remove(); }
  }
  function workers(value) {
    return value ? [value.installing, value.waiting, value.active].filter(Boolean) : [];
  }
  function owns(value) {
    if (!value || value.scope !== ScopeUrl) { return false; }
    const items = workers(value);
    return items.length > 0 && items.every((worker) => worker.scriptURL === ScriptUrl);
  }
  function controllerKind(value = registration) {
    const controller = container && container.controller;
    if (!controller) { return "none"; }
    if (controller.scriptURL === ScriptUrl &&
        ((owns(value) && value.active === controller) || knownControllers.has(controller))) {
      knownControllers.add(controller);
      return "owned";
    }
    return "foreign";
  }
  function removable(value) {
    return owns(value) && !value.installing && !value.waiting && value.active?.state === "activated";
  }
  function status(state, message) {
    element("operation-status").dataset.state = state;
    text("operation-status", message);
  }
  function render() {
    const owner = owns(registration);
    const kind = !checked ? "unknown" : registration ? (owner ? "owned" : "foreign") : "none";
    element("registration-state").dataset.kind = kind;
    text("registration-state", { unknown: "未確認", none: "該当する登録なし", owned: "この実験の登録",
      foreign: "同一scopeに別scriptまたは所有未確認の登録" }[kind]);
    text("lifecycle-state", owner ? `installing=${registration.installing?.state || "なし"} / ` +
      `waiting=${registration.waiting?.state || "なし"} / active=${registration.active?.state || "なし"}` : "—");
    const control = controllerKind();
    element("controller-state").dataset.kind = control;
    text("controller-state", control === "none" ? "null（現在のページにcontrollerなし）" :
      `${control === "owned" ? "この実験のWorker" : "別Workerまたは所有未確認のWorker"}：${container.controller.scriptURL}`);
    const permitted = Boolean(container) && checked && !busy && kind !== "foreign" && control !== "foreign";
    element("register").disabled = !permitted || registration !== null || control !== "none";
    element("unregister").disabled = !permitted || !removable(registration);
    element("network").disabled = !permitted;
    element("simulate-offline").disabled = !permitted || control !== "owned";
    element("cleanup-cache").disabled = !permitted || registration !== null || control !== "none";
    element("refresh").disabled = !container || busy;
    element("reload").disabled = busy;
    text("guard-state", control === "foreign" || kind === "foreign"
      ? "所有を確認できない登録・controllerがあるため、登録変更・試験要求・cache削除はできません。"
      : "登録・解除・cache削除は、実験の専用scopeとscriptを確認してから実行します。");
  }

  function observe(value) {
    if (!owns(value)) { return; }
    if (!observedRegistrations.has(value)) {
      observedRegistrations.add(value);
      value.addEventListener("updatefound", () => {
        if (registration !== value) { return; }
        log("updatefoundを観測しました。");
        observe(value);
        render();
      });
    }
    for (const worker of workers(value)) {
      if (observedWorkers.has(worker)) { continue; }
      observedWorkers.add(worker);
      worker.addEventListener("statechange", () => {
        if (registration !== value && !workers(registration).includes(worker)) { return; }
        log(`worker.state=${worker.state}`);
        observe(registration);
        render();
        if (worker.state === "redundant") { inspectInBackground(); }
      });
    }
  }

  async function inspect() {
    const ticket = ++inspection;
    try {
      const candidate = await container.getRegistration(ScopeUrl);
      const exact = candidate && candidate.scope === ScopeUrl ? candidate : null;
      if (ticket === inspection) {
        registration = exact;
        checked = true;
        observe(exact);
        render();
      }
      return exact;
    } catch (error) {
      if (ticket === inspection) { checked = false; render(); }
      throw error;
    }
  }

  function inspectInBackground() {
    void inspect().catch((error) => { log(`登録の確認に失敗しました（${error.name}）。`); });
  }

  function checkGuards(exact) {
    if ((exact && !owns(exact)) || controllerKind(exact) === "foreign") {
      throw new Error("所有を確認できない登録またはcontrollerがあります。");
    }
  }

  async function operate(label, action) {
    if (!container || busy) { return; }
    busy = true;
    render();
    status("busy", `${label}を処理中`);
    try {
      const message = await action();
      status("success", message);
      log(message);
      text("announcement", message);
    } catch (error) {
      const message = `${label}に失敗しました（${error.name}）。${error.message || ""}`;
      status("error", message);
      log(message);
      text("announcement", `${label}に失敗しました。`);
    } finally {
      busy = false;
      render();
    }
  }

  async function register() {
    const existing = await inspect();
    checkGuards(existing);
    if (existing || container.controller) { throw new Error("既存の登録・controllerが残っています。"); }
    const created = await container.register("./sw.js", { scope: "./" });
    if (!owns(created)) { throw new Error("登録結果のscopeとscriptを確認できません。"); }
    registration = created;
    checked = true;
    observe(created);
    await inspect();
    return "registerのPromiseがfulfilledになりました。install/activateと現在のcontrollerを別欄で確認します。";
  }

  async function unregister() {
    const existing = await inspect();
    checkGuards(existing);
    if (!removable(existing)) { throw new Error("解除できる実験用のactive登録がありません。"); }
    const removed = await existing.unregister();
    await inspect();
    return `unregister返値=${removed}。現在のcontrollerを確認し、実験タブを閉じるか再読み込みしてください。`;
  }

  async function cleanupCache() {
    const existing = await inspect();
    checkGuards(existing);
    if (existing || container.controller) { throw new Error("登録を解除し、実験タブを閉じるか再読み込みしてください。"); }
    if (!("caches" in window)) { throw new Error("Cache APIを利用できません。"); }
    if (!await window.caches.has(CacheName)) { return "専用cacheが見つかりませんでした。"; }
    const cache = await window.caches.open(CacheName);
    const deleted = await cache.delete(PayloadUrl);
    return `専用cache内の固定entryの削除返値=${deleted}。cacheコンテナは残ります。`;
  }

  async function requestPayload(simulated) {
    const existing = await inspect();
    checkGuards(existing);
    if (simulated && controllerKind(existing) !== "owned") { throw new Error("先に再読み込みして、この実験のcontrollerを確認してください。"); }
    const url = simulated ? SimulatedUrl : PayloadUrl;
    text("request-url", url);
    text("request-status", "応答待ち");
    text("response-source", "—");
    text("response-reason", "—");
    text("response-body", "—");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        method: "GET", cache: "no-store", redirect: "error", credentials: "omit", signal: controller.signal
      });
      const source = response.headers.get("X-Sny0-Study-Source");
      const reason = response.headers.get("X-Sny0-Study-Reason");
      text("request-status", `HTTP ${response.status}`);
      text("response-source", source || "観測ヘッダーなし");
      text("response-reason", reason || "—");
      const data = await response.json();
      text("response-body", JSON.stringify(data, null, 2));
      if (!response.ok) { throw new Error(`HTTP ${response.status} / ${source || "観測ヘッダーなし"}`); }
      if (!data || data.version !== 1 || data.message !== FixtureMessage) { throw new Error("固定payloadと一致しません。"); }
      return `固定GETの応答を確認しました。HTTP ${response.status} / ${source || "観測ヘッダーなし"}。`;
    } catch (error) {
      if (element("request-status").textContent === "応答待ち") { text("request-status", "応答なし"); }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  element("register").addEventListener("click", () => { void operate("登録", register); });
  element("unregister").addEventListener("click", () => { void operate("登録解除", unregister); });
  element("network").addEventListener("click", () => { void operate("通常の固定GET", () => requestPayload(false)); });
  element("simulate-offline").addEventListener("click", () => { void operate("疑似オフラインの固定GET", () => requestPayload(true)); });
  element("cleanup-cache").addEventListener("click", () => { void operate("専用cacheの削除", cleanupCache); });
  element("refresh").addEventListener("click", () => { void operate("登録の再確認", async () => {
    await inspect();
    return "exact scopeの登録状態を確認しました。";
  }); });
  element("reload").addEventListener("click", () => { if (!busy) { location.reload(); } });
  element("clear-log").addEventListener("click", () => {
    element("event-log").replaceChildren();
    sequence = 0;
    text("announcement", "表示ログを消しました。");
  });
  text("scope-value", ScopeUrl);
  text("script-value", ScriptUrl);
  text("payload-value", PayloadUrl);
  text("cache-name", CacheName);
  if (container) {
    container.addEventListener("controllerchange", () => {
      log("controllerchangeを観測しました。");
      render();
      inspectInBackground();
    });
    void container.ready.then((ready) => {
      const matching = owns(ready);
      element("ready-state").dataset.kind = matching ? "owned" : "foreign";
      text("ready-state", `fulfilled（${matching ? "この実験のscope" : "別scopeまたは所有未確認"}）：${ready.scope}`);
      log("readyがfulfilledになりました。現在のcontrollerとは別の観測です。");
      inspectInBackground();
    }).catch((error) => log(`readyの観測に失敗しました（${error.name}）。`));
    inspectInBackground();
  } else {
    status("unavailable", "HTTPSまたはsecure contextのlocalhost HTTPで開いてください。file://は操作対象外です。");
    element("ready-state").dataset.kind = "unavailable";
    text("ready-state", "利用不可");
  }
  render();
})();
