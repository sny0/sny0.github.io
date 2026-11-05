"use strict";

(() => {
  const Namespace = "sny0-study-storage-observation-v1";
  const LocalKey = `${Namespace}:record`;
  const DatabaseName = Namespace;
  const StoreName = "records";
  const RecordKey = "fixed-record";
  const CacheName = Namespace;
  const CacheUrl = new URL(`./__${Namespace}-record__`, location.href).href;
  const Sample = Object.freeze({ version: 1, message: "保存の仕組みを観察" });
  const loopback = location.hostname === "localhost" || location.hostname.endsWith(".localhost") ||
    location.hostname === "127.0.0.1" || location.hostname === "[::1]" || location.hostname === "::1";
  const contextAllowed = window.isSecureContext &&
    (location.protocol === "https:" || (location.protocol === "http:" && loopback));
  const buttons = Array.from(document.querySelectorAll("[data-backend]"));
  const element = (id) => document.getElementById(id);
  const backendNames = { local: "localStorage", idb: "IndexedDB", cache: "Cache API" };
  const actionNames = { save: "保存", read: "読出し", delete: "サンプルだけ削除" };
  let active = null;
  let operationNumber = 0;
  let sequence = 0;

  function text(id, value) { element(id).textContent = String(value); }
  function namedError(name, message) {
    const error = new Error(message);
    error.name = name;
    return error;
  }
  function describe(value) {
    if (value === undefined) { return "undefined"; }
    if (value === null) { return "null"; }
    let output;
    try { output = typeof value === "string" ? value : JSON.stringify(value); }
    catch { output = "JSON化できない値"; }
    return String(output).slice(0, 512);
  }
  function log(context, message) {
    if (context && active !== context) { return; }
    const item = document.createElement("li");
    item.value = ++sequence;
    item.textContent = `${performance.now().toFixed(1)} ms — ${context ? `操作${context.number} ${backendNames[context.backend]}：` : ""}${message}`;
    element("event-log").append(item);
    while (element("event-log").children.length > 60) { element("event-log").firstElementChild.remove(); }
  }
  function setGlobalState(state, message) {
    element("operation-status").dataset.state = state;
    text("operation-status", message);
  }
  function renderButtons() {
    buttons.forEach((button) => { button.disabled = !contextAllowed || active !== null; });
    element("reload").disabled = active !== null;
  }
  function phase(context, message) {
    if (active !== context) { return; }
    text(`${context.backend}-completion`, message);
    log(context, message);
  }
  function apiResult(context, label, value) {
    if (active !== context) { return; }
    const detail = `${label} → ${describe(value)}`;
    text(`${context.backend}-api-return`, detail);
    log(context, detail);
  }
  function validateRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1 ||
        value.message !== Sample.message || Object.keys(value).length !== 2) {
      throw namedError("InvalidSampleData", "専用keyの値がこのサンプルの固定レコードと一致しません。");
    }
    return value;
  }
  function parseRecord(value) {
    if (typeof value !== "string" || value.length > 4096) {
      throw namedError("InvalidSampleData", "保存値の形式またはサイズが想定外です。");
    }
    let record;
    try { record = JSON.parse(value); }
    catch { throw namedError("InvalidSampleData", "保存値がJSONではありません。"); }
    return validateRecord(record);
  }
  function classify(error) {
    const name = error && typeof error.name === "string" ? error.name : "UnknownError";
    const labels = { QuotaExceededError: "容量制限", SecurityError: "アクセス制限",
      UnavailableError: "API利用不可", NotSupportedError: "API未対応", AbortError: "中断",
      VersionError: "DBバージョン不一致", InvalidSampleData: "サンプルデータ不一致" };
    return `${labels[name] || "処理エラー"} (${name})`;
  }

  async function localOperation(context) {
    const storage = window.localStorage;
    if (!storage) { throw namedError("UnavailableError", "localStorageを利用できません。"); }
    if (context.action === "save") {
      const result = storage.setItem(LocalKey, JSON.stringify(Sample));
      apiResult(context, "setItem返値", result);
      return { kind: "saved", record: Sample, completion: "同期setItemの呼出し完了" };
    }
    const value = storage.getItem(LocalKey);
    apiResult(context, "getItem返値", value);
    if (value === null) { return { kind: "not-found", completion: "getItemがnull：対象なし" }; }
    if (context.action === "read") {
      return { kind: "found", record: parseRecord(value), completion: "同期getItemとデータ検査の完了" };
    }
    const result = storage.removeItem(LocalKey);
    apiResult(context, "removeItem返値", result);
    return { kind: "deleted", completion: "専用key一つのremoveItem完了" };
  }

  function openDatabase(context) {
    return new Promise((resolve, reject) => {
      const factory = window.indexedDB;
      if (!factory) { reject(namedError("UnavailableError", "IndexedDBを利用できません。")); return; }
      const request = factory.open(DatabaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        phase(context, "upgradeneeded：専用DB/storeを準備。固定レコードはまだ保存しません。");
        try {
          if (!database.objectStoreNames.contains(StoreName)) { database.createObjectStore(StoreName); }
        } catch (error) {
          context.upgradeError = error;
          request.transaction.abort();
        }
      };
      request.onblocked = () => {
        if (active !== context) { return; }
        setGlobalState("blocked", "IndexedDB openがblocked。別タブ等の接続を閉じてください。native終端を待機中です。");
        phase(context, "blockedは完了ではありません。open取消APIはなく、この操作はbusyのまま待機します。");
      };
      request.onerror = () => reject(context.upgradeError || request.error || namedError("UnknownError", "DB open失敗"));
      request.onsuccess = () => {
        const database = request.result;
        context.database = database;
        database.onversionchange = () => {
          context.versionChangeError = new DOMException("versionchangeで接続を閉じました。", "AbortError");
          if (context.transaction) {
            try { context.transaction.abort(); } catch { /* It may already be finished. */ }
          }
          database.close();
          phase(context, "versionchange：自分のtransactionを中断し、接続をcloseします。");
        };
        if (!database.objectStoreNames.contains(StoreName)) {
          database.close();
          reject(namedError("InvalidSampleData", "専用storeがありません。"));
          return;
        }
        if (active === context) { setGlobalState("busy", "IndexedDB：open成功。transactionの完了を待っています。"); }
        phase(context, "DB open success。これから固定keyのtransactionを開始します。");
        resolve(database);
      };
    });
  }

  async function idbOperation(context) {
    let database;
    try {
      database = await openDatabase(context);
      const result = await new Promise((resolve, reject) => {
        const transaction = database.transaction(StoreName, context.action === "read" ? "readonly" : "readwrite");
        context.transaction = transaction;
        const store = transaction.objectStore(StoreName);
        let pendingError = null;
        let outcome = null;
        function observe(request, label, onSuccess) {
          request.onsuccess = () => {
            apiResult(context, `${label} request.success結果（tx未完了）`, request.result);
            try { onSuccess(request.result); }
            catch (error) {
              pendingError = error;
              transaction.abort();
            }
          };
          request.onerror = () => {
            pendingError = request.error;
            phase(context, `${label} request.error。transactionの終端を待ちます。`);
          };
        }
        transaction.onerror = () => {
          pendingError = pendingError || transaction.error;
          phase(context, "transaction.error。成功表示せずabort/completeの終端を待ちます。");
        };
        transaction.onabort = () => {
          context.transaction = null;
          phase(context, "transaction.abort：操作は成功していません。");
          reject(context.versionChangeError || pendingError || transaction.error || new DOMException("transaction中断", "AbortError"));
        };
        transaction.oncomplete = () => {
          context.transaction = null;
          phase(context, "transaction.complete：ここで初めて操作完了を確認します。");
          if (!outcome) { reject(namedError("UnknownError", "transaction結果がありません。")); return; }
          resolve({ ...outcome, completion: "transaction.complete確認済み" });
        };
        if (context.action === "save") {
          observe(store.put(Sample, RecordKey), "put", () => { outcome = { kind: "saved", record: Sample }; });
        } else {
          observe(store.getKey(RecordKey), "getKey", (key) => {
            if (key === undefined) { outcome = { kind: "not-found" }; return; }
            // Queue dependent requests inside the native success callback.
            // No fetch/timer/external await is inserted into an active transaction.
            if (context.action === "read") {
              observe(store.get(RecordKey), "get", (record) => { outcome = { kind: "found", record }; });
            } else {
              observe(store.delete(RecordKey), "delete", () => { outcome = { kind: "deleted" }; });
            }
          });
        }
      });
      if (result.record !== undefined) { validateRecord(result.record); }
      if (result.kind === "found" && result.record === undefined) { validateRecord(undefined); }
      return result;
    } finally {
      const owned = database || context.database;
      if (owned) {
        owned.onversionchange = null;
        owned.close();
        phase(context, "今回開いたDB接続をcloseしました。");
      }
      context.transaction = null;
      context.database = null;
    }
  }

  async function cacheOperation(context) {
    const storage = window.caches;
    if (!storage || typeof storage.has !== "function") { throw namedError("UnavailableError", "Cache APIを利用できません。"); }
    const request = new Request(CacheUrl, { method: "GET" });
    if (context.action !== "save") {
      const exists = await storage.has(CacheName);
      apiResult(context, "caches.has返値", exists);
      if (!exists) { return { kind: "not-found", completion: "専用cacheなし。openしていません" }; }
    }
    const cache = await storage.open(CacheName);
    phase(context, "専用cacheのopen Promiseがfulfilledになりました。");
    if (context.action === "save") {
      const response = new Response(JSON.stringify(Sample), { status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" } });
      const toStore = response.clone();
      const result = await cache.put(request.clone(), toStore);
      apiResult(context, "cache.put fulfilled値", result);
      phase(context, `ローカルResponseをcloneしてput。元bodyUsed=${response.bodyUsed} / put用clone.bodyUsed=${toStore.bodyUsed}。`);
      return { kind: "saved", record: Sample, completion: "cache.putのPromise fulfilled確認済み" };
    }
    if (context.action === "delete") {
      const deleted = await cache.delete(request);
      apiResult(context, "cache.delete fulfilled値", deleted);
      return { kind: deleted ? "deleted" : "not-found", completion: "専用entryのdelete Promise fulfilled確認済み" };
    }
    const response = await cache.match(request);
    apiResult(context, "cache.match fulfilled値", response ? `Response(status=${response.status})` : undefined);
    if (!response) { return { kind: "not-found", completion: "専用entryなし" }; }
    const toRead = response.clone();
    const value = await toRead.text();
    phase(context, `matchのResponseをcloneしてtextを一度consume。元bodyUsed=${response.bodyUsed} / 読出clone.bodyUsed=${toRead.bodyUsed}。`);
    return { kind: "found", record: parseRecord(value), completion: "matchとclone.textのPromise fulfilled確認済み" };
  }

  async function operate(backend, action) {
    if (active || !contextAllowed) { return; }
    const context = { backend, action, number: ++operationNumber, transaction: null, database: null };
    active = context;
    renderButtons();
    setGlobalState("busy", `${backendNames[backend]}：${actionNames[action]}を処理中`);
    text(`${backend}-api-return`, "返値を待っています。");
    text(`${backend}-result`, "操作中。成功はまだ確認していません。");
    phase(context, "開始。APIの返値と操作の完了を分けて記録します。");
    try {
      const operations = { local: localOperation, idb: idbOperation, cache: cacheOperation };
      const outcome = await operations[backend](context);
      text(`${backend}-completion`, outcome.completion);
      if (outcome.kind === "not-found") {
        setGlobalState("not-found", `${backendNames[backend]}：専用レコードはありません。`);
        text(`${backend}-result`, "対象なし（not found）。エラーや保存済みとは区別します。");
      } else {
        setGlobalState("success", `${backendNames[backend]}：${actionNames[action]}の完了を確認しました。`);
        const deleted = {
          local: "専用のlocalStorage key一つだけを削除しました。",
          idb: "専用の固定レコードだけを削除しました。空のDB/storeコンテナは残ります。",
          cache: "専用の固定entryだけを削除しました。空のcacheコンテナは残ります。"
        };
        text(`${backend}-result`, outcome.record ? JSON.stringify(outcome.record, null, 2) : deleted[backend]);
      }
      log(context, `最終結果=${outcome.kind}。${outcome.completion}`);
      text("announcement", `${backendNames[backend]}：${outcome.kind === "not-found" ? "対象なし" : "操作完了"}。`);
    } catch (error) {
      const label = classify(error);
      setGlobalState("error", `${backendNames[backend]}：${label}`);
      text(`${backend}-completion`, "失敗。完了成功として扱いません。");
      text(`${backend}-result`, label);
      log(context, `失敗：${label}`);
      text("announcement", `${backendNames[backend]}：${label}`);
    } finally {
      active = null;
      renderButtons();
    }
  }

  buttons.forEach((button) => button.addEventListener("click", () => {
    void operate(button.dataset.backend, button.dataset.action);
  }));
  element("reload").addEventListener("click", () => { if (!active) { location.reload(); } });
  element("clear-log").addEventListener("click", () => {
    element("event-log").replaceChildren();
    sequence = 0;
    text("announcement", "表示ログだけを消しました。保存データは操作していません。");
  });
  text("origin-value", location.origin);
  text("local-key", LocalKey);
  text("idb-name", `${DatabaseName} / ${StoreName} / ${RecordKey}`);
  text("cache-name", CacheName);
  text("cache-key", CacheUrl);
  text("sample-record", JSON.stringify(Sample, null, 2));
  if (!contextAllowed) {
    setGlobalState("unavailable", "file://等では操作しません。HTTPSまたはsecure contextのlocalhost HTTPで開いてください。");
  }
  renderButtons();
})();
