"use strict";

const PageSize = 65_536;
const MaximumPages = 2;
const ArenaBase = 1024;
const ArrayFixture = [10, -2, 32];
const TextFixture = "A猫🎮";
const ArraySize = ArrayFixture.length * Int32Array.BYTES_PER_ELEMENT;
const CanLoad = ["http:", "https:"].includes(location.protocol) &&
  typeof globalThis.WebAssembly?.instantiate === "function";

const LoadButton = document.querySelector("#load-module");
const ArrayButton = document.querySelector("#send-array");
const TextButton = document.querySelector("#send-text");
const CapacityButton = document.querySelector("#try-capacity");
const GrowButton = document.querySelector("#grow-memory");
const ResetButton = document.querySelector("#reset-arena");
const Status = document.querySelector("#operation-status");
const Panels = [...document.querySelectorAll("[data-case]")];

let arena = null;
let loading = false;

function setStatus(kind, message) {
  Status.dataset.resultKind = kind;
  Status.textContent = message;
}

function showResult(name, kind, message, values = {}) {
  const panel = Panels.find(element => element.dataset.case === name);
  panel.dataset.resultKind = kind;
  panel.querySelector("[data-result]").textContent = message;
  for (const field of panel.querySelectorAll("[data-field]")) {
    field.textContent = values[field.dataset.field] ?? "—";
  }
}

function clearResults() {
  for (const panel of Panels) {
    showResult(panel.dataset.case, "idle", "未実行");
  }
}

function showMemory() {
  const size = arena?.memory.buffer.byteLength;
  document.querySelector("#memory-pages").textContent = arena ? size / PageSize : "—";
  document.querySelector("#memory-size").textContent = size ?? "—";
  document.querySelector("#current-cursor").textContent = arena ? arena.cursor() : "—";
}

function updateButtons() {
  const ready = arena !== null && !loading;
  const atMaximum = ready && arena.memory.buffer.byteLength >= MaximumPages * PageSize;
  LoadButton.disabled = !CanLoad || loading;
  ArrayButton.disabled = TextButton.disabled = CapacityButton.disabled = ResetButton.disabled = !ready;
  GrowButton.disabled = !ready || atMaximum;
  document.querySelector("#grow-note").textContent = atMaximum
    ? "上限の2ページに達しました。"
    : ready ? "このモジュールの上限は2ページです。" : "読み込み後に実行できます。";
}

async function loadArena() {
  loading = true;
  arena = null;
  clearResults();
  showMemory();
  updateButtons();
  setStatus("pending", "モジュールを読み込んでいます。");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("arena.wasm", {
      signal: controller.signal,
      credentials: "omit",
      mode: "same-origin",
      redirect: "error",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const { instance } = await WebAssembly.instantiate(await response.arrayBuffer());
    const exports = instance.exports;
    if (!(exports.memory instanceof WebAssembly.Memory) ||
        !(exports.memory.buffer instanceof ArrayBuffer) ||
        exports.memory.buffer.byteLength !== PageSize ||
        !["alloc", "cursor", "reset", "sum_i32", "sum_u8"].every(name => typeof exports[name] === "function") ||
        exports.cursor() !== ArenaBase) {
      throw new Error("教材で使うモジュールの公開項目と初期値を確認できませんでした。");
    }
    arena = exports;
    showMemory();
    setStatus("ready", "新しいインスタンスを作りました。");
  } catch (error) {
    const detail = error.name === "AbortError" ? "取得が時間内に終わりませんでした。" : error.message;
    setStatus("error", `読み込みに失敗しました。 ${detail}`);
  } finally {
    clearTimeout(timeout);
    loading = false;
    updateButtons();
  }
}

function hexBytes(buffer, start, size) {
  const view = new Uint8Array(buffer, start, size);
  return Array.from(view, byte => byte.toString(16).padStart(2, "0")).join(" ");
}

function observeAllocation(name, size, transfer) {
  let fields = {};
  try {
    const before = arena.cursor();
    const memoryBefore = arena.memory.buffer.byteLength;
    const start = arena.alloc(size);
    fields = {
      before,
      start,
      size,
      after: arena.cursor(),
      padding: start === 0 ? null : start - before,
      "memory-before": memoryBefore,
      "memory-after": arena.memory.buffer.byteLength,
    };
    if (start === 0) {
      showResult(name, "rejected", "空きに収まらず、allocは0を返しました。", fields);
      return;
    }
    const data = transfer ? transfer(start) : {};
    showResult(name, "observed", transfer
      ? "確保した位置に書き、Wasmの関数で読み取りました。"
      : "1ページ分の領域を確保しました。", { ...fields, ...data });
  } catch (error) {
    showResult(name, "error", `操作に失敗しました。 ${error.message}`, fields);
  } finally {
    showMemory();
  }
}

function sendArray() {
  observeAllocation("array", ArraySize, start => {
    const view = new DataView(arena.memory.buffer);
    ArrayFixture.forEach((value, index) => {
      view.setInt32(start + index * Int32Array.BYTES_PER_ELEMENT, value, true);
    });
    return {
      bytes: hexBytes(view.buffer, start, ArraySize),
      call: `sum_i32(${start}, ${ArrayFixture.length})`,
      value: arena.sum_i32(start, ArrayFixture.length),
    };
  });
}

function sendText() {
  const bytes = new TextEncoder().encode(TextFixture);
  observeAllocation("text", bytes.length, start => {
    const view = new Uint8Array(arena.memory.buffer);
    view.set(bytes, start);
    return {
      "code-units": TextFixture.length,
      "code-points": Array.from(TextFixture).length,
      bytes: hexBytes(view.buffer, start, bytes.length),
      call: `sum_u8(${start}, ${bytes.length})`,
      value: arena.sum_u8(start, bytes.length),
    };
  });
}

function growMemory() {
  const before = arena.cursor();
  const memoryBefore = arena.memory.buffer.byteLength;
  try {
    arena.memory.grow(1);
    showResult("grow", "observed", "線形メモリの容量が増えました。", {
      before,
      after: arena.cursor(),
      "memory-before": memoryBefore,
      "memory-after": arena.memory.buffer.byteLength,
    });
  } catch (error) {
    showResult("grow", "error", `メモリを拡張できませんでした。 ${error.message}`);
  }
  showMemory();
  updateButtons();
}

function resetArena() {
  const before = arena.cursor();
  const bytesBefore = hexBytes(arena.memory.buffer, ArenaBase, ArraySize);
  arena.reset();
  clearResults();
  showResult("reset", "observed", "カーソルを戻しました。表示しているのは同じ位置の生バイトです。", {
    before,
    after: arena.cursor(),
    "bytes-before": bytesBefore,
    "bytes-after": hexBytes(arena.memory.buffer, ArenaBase, ArraySize),
  });
  showMemory();
}

if (CanLoad) {
  setStatus("idle", "インスタンスを作って実験を始めます。");
} else if (["http:", "https:"].includes(location.protocol)) {
  setStatus("error", "この環境ではWebAssemblyを実行できません。");
}

LoadButton.addEventListener("click", () => void loadArena());
ArrayButton.addEventListener("click", sendArray);
TextButton.addEventListener("click", sendText);
CapacityButton.addEventListener("click", () => observeAllocation("capacity", PageSize));
GrowButton.addEventListener("click", growMemory);
ResetButton.addEventListener("click", resetArena);
updateButtons();
