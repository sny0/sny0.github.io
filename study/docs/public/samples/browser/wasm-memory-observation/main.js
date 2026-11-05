"use strict";

const PageSize = 65_536;
const MaximumPages = 2;
const Offset = 16;
const IntSize = 4;
const ModuleUrl = new URL("memory.wasm", location.href);
const LoadModule = document.getElementById("load-module");
const LoadBytes = document.getElementById("load-bytes");
const AddOne = document.getElementById("add-one");
const TrapAccess = document.getElementById("trap-access");
const GrowMemory = document.getElementById("grow-memory");
const OperationStatus = document.getElementById("operation-status");
const CanLoad = ["http:", "https:"].includes(location.protocol) &&
  typeof globalThis.WebAssembly?.instantiate === "function";

let current = null;
let loading = false;

function writeFields(fields) {
  for (const [id, value] of Object.entries(fields)) {
    document.getElementById(id).textContent = value ?? "—";
  }
}

function showStatus(kind, message) {
  OperationStatus.dataset.resultKind = kind;
  OperationStatus.textContent = message;
}

function showCase(name, kind, message, fields) {
  const panel = document.querySelector(`[data-case="${name}"]`);
  panel.dataset.resultKind = kind;
  panel.querySelector("[data-result]").textContent = message;
  writeFields(fields);
}

function resetResults() {
  showCase("add", "idle", "未実行", { "add-before": null, "add-return": null, "add-after": null });
  showCase("trap", "idle", "未実行", {
    "trap-offset": null, "trap-error": null, "trap-value": null, "trap-size": null,
  });
  showCase("grow", "idle", "未実行", {
    "grow-return": null, "old-view-length-before": null, "old-view-length": null,
    "new-view-length": null, "grow-value": null, "new-page-bytes": null,
  });
}

function readValue(memory) {
  return new DataView(memory.buffer).getInt32(Offset, true);
}

function hexBytes(buffer, offset) {
  const bytes = new Uint8Array(buffer, offset, IntSize);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(" ");
}

function showMemory() {
  const memory = current?.memory;
  const size = memory?.buffer.byteLength;
  writeFields({
    "memory-pages": size === undefined ? null : size / PageSize,
    "memory-size": size,
    "current-value": memory ? readValue(memory) : null,
    "current-bytes": memory ? hexBytes(memory.buffer, Offset) : null,
  });
}

function updateButtons() {
  const ready = current !== null && !loading;
  const atMaximum = ready && current.memory.buffer.byteLength === MaximumPages * PageSize;
  LoadModule.disabled = LoadBytes.disabled = loading || !CanLoad;
  AddOne.disabled = TrapAccess.disabled = !ready;
  GrowMemory.disabled = !ready || atMaximum;
  writeFields({
    "grow-note": atMaximum ? "上限の2ページです。もう一度読み込むと初期状態に戻ります。"
      : ready ? "このモジュールのメモリは2ページまで拡張できます。" : "読み込み後に実行できます。",
  });
}

async function loadModule(useBytes) {
  loading = true;
  current = null;
  updateButtons();
  resetResults();
  showMemory();
  writeFields({ "response-mime": null, "load-method": null });
  showStatus("pending", "モジュールを取得しています。");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(ModuleUrl, {
      signal: controller.signal, credentials: "omit", redirect: "error",
    });
    const mime = response.headers.get("Content-Type")?.trim();
    writeFields({ "response-mime": mime ?? "指定なし" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const hasStreaming = typeof WebAssembly.instantiateStreaming === "function";
    const isWasmMime = mime?.toLowerCase() === "application/wasm";
    const useStreaming = !useBytes && hasStreaming && isWasmMime;
    writeFields({ "load-method": useStreaming
      ? "WebAssembly.instantiateStreaming()" : "WebAssembly.instantiate(ArrayBuffer)" });

    const { instance } = useStreaming
      ? await WebAssembly.instantiateStreaming(response)
      : await WebAssembly.instantiate(await response.arrayBuffer());
    const { memory, add_at } = instance.exports;
    if (!(memory instanceof WebAssembly.Memory) || !(memory.buffer instanceof ArrayBuffer) ||
        memory.buffer.byteLength !== PageSize || typeof add_at !== "function") {
      throw new Error("教材で使うメモリまたは関数を確認できませんでした。");
    }

    new DataView(memory.buffer).setInt32(Offset, 41, true);
    current = { memory, addAt: add_at };
    showMemory();
    let detail = "";
    if (!useBytes && !useStreaming) {
      detail = hasStreaming
        ? " 応答のContent-Typeに合わせてArrayBuffer経由で読み込みました。"
        : " ストリーミングAPIがないためArrayBuffer経由で読み込みました。";
    }
    showStatus("ready", `インスタンスを作り、位置16に41を書きました。${detail}`);
  } catch (error) {
    const message = error.name === "AbortError" ? "取得が時間内に終わりませんでした。" : error.message;
    showStatus("error", `読み込みに失敗しました。 ${message}`);
  } finally {
    clearTimeout(timeout);
    loading = false;
    updateButtons();
  }
}

function runAdd() {
  const { memory, addAt } = current;
  const before = readValue(memory);
  let returned;
  try {
    returned = addAt(Offset, 1);
  } catch (error) {
    showCase("add", "error", `関数を実行できませんでした。 ${error.message}`, {
      "add-before": before, "add-return": null, "add-after": null,
    });
    return;
  }
  const after = readValue(memory);
  showCase("add", "observed", "Wasmで更新した位置をJavaScriptから読みました。", {
    "add-before": before, "add-return": returned, "add-after": after,
  });
  showMemory();
}

function runTrap() {
  const { memory, addAt } = current;
  const size = memory.buffer.byteLength;
  const before = readValue(memory);
  const offset = size - (IntSize - 1);
  let caught;
  try {
    addAt(offset, 1);
  } catch (error) {
    caught = error;
  }
  const after = readValue(memory);
  const afterSize = memory.buffer.byteLength;
  const observed = caught instanceof WebAssembly.RuntimeError && before === after && size === afterSize;
  showCase("trap", observed ? "observed" : "error", observed
    ? "範囲外の読み取りがトラップになり、位置16の値とバイト長は同じでした。"
    : "期待した境界トラップとメモリの状態を確認できませんでした。", {
    "trap-offset": offset, "trap-error": caught?.name ?? "なし",
    "trap-value": `${before} → ${after}`, "trap-size": `${size} → ${afterSize}`,
  });
  showMemory();
}

function runGrow() {
  const { memory } = current;
  const oldView = new Uint8Array(memory.buffer);
  const oldLength = oldView.byteLength;
  const before = readValue(memory);
  let previousPages;
  try {
    previousPages = memory.grow(1);
  } catch (error) {
    showCase("grow", "error", `メモリを拡張できませんでした。 ${error.message}`, {});
    return;
  }
  const newView = new Uint8Array(memory.buffer);
  showCase("grow", "observed", "拡張後のバッファから新しいビューを作りました。", {
    "grow-return": previousPages, "old-view-length-before": oldLength,
    "old-view-length": oldView.byteLength, "new-view-length": newView.byteLength,
    "grow-value": `${before} → ${readValue(memory)}`,
    "new-page-bytes": hexBytes(newView.buffer, oldLength),
  });
  showMemory();
  updateButtons();
}

writeFields({ "module-url": ModuleUrl.href });
if (CanLoad) {
  showStatus("idle", "読み込み方法を選んでください。");
  LoadModule.addEventListener("click", () => void loadModule(false));
  LoadBytes.addEventListener("click", () => void loadModule(true));
  AddOne.addEventListener("click", runAdd);
  TrapAccess.addEventListener("click", runTrap);
  GrowMemory.addEventListener("click", runGrow);
}
updateButtons();
