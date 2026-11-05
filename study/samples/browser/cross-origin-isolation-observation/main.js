"use strict";

const CanUseWorker = ["http:", "https:"].includes(location.protocol) && typeof Worker === "function";
const WindowIsolated = window.crossOriginIsolated === true;
const HasSharedBuffer = typeof SharedArrayBuffer === "function";
const HasAtomics = typeof window.Atomics?.add === "function" && typeof window.Atomics?.load === "function";
const CanShare = CanUseWorker && WindowIsolated && HasSharedBuffer && HasAtomics;
const RunCopy = document.querySelector("#run-copy");
const RunShared = document.querySelector("#run-shared");
const WorkerIsolated = document.querySelector("#worker-isolated");

function showResult(panel, kind, message, values = {}) {
  panel.dataset.resultKind = kind;
  panel.querySelector("[data-result]").textContent = message;
  for (const name of ["parent-before", "worker-before", "worker-after", "parent-after"]) {
    panel.querySelector(`[data-${name}]`).textContent = values[name] ?? "—";
  }
}

function observeWorker(mode, buffer) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("worker.js");
    const timeout = setTimeout(() => finish(new Error("Workerから応答が届きませんでした。")), 5000);

    function finish(error, result) {
      clearTimeout(timeout);
      worker.terminate();
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }

    worker.addEventListener("message", ({data}) => {
      if (data?.mode !== mode || typeof data.isolated !== "boolean" ||
          !Number.isInteger(data.before) || !Number.isInteger(data.after)) {
        finish(new Error("Workerの観測値を受け取れませんでした。"));
        return;
      }
      finish(null, data);
    });
    worker.addEventListener("error", () => finish(new Error("Workerの実行に失敗しました。")));
    worker.addEventListener("messageerror", () => finish(new Error("Workerの応答を読み取れませんでした。")));

    try {
      worker.postMessage({mode, buffer});
    } catch {
      finish(new Error("Workerにデータを渡せませんでした。"));
    }
  });
}

async function runMemoryCase(mode) {
  const panel = document.querySelector(`[data-case="${mode}"]`);
  RunCopy.disabled = true;
  RunShared.disabled = true;
  WorkerIsolated.textContent = "—";
  showResult(panel, "pending", "Workerの応答を待っています。");

  try {
    const shared = mode === "shared";
    const buffer = shared ? new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)
      : new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const values = new Int32Array(buffer);
    const readParent = () => shared ? Atomics.load(values, 0) : values[0];
    const parentBefore = readParent();
    const result = await observeWorker(mode, buffer);
    const parentAfter = readParent();

    WorkerIsolated.textContent = String(result.isolated);
    showResult(panel, "observed", `Workerは${result.after}、ページ側は${parentAfter}です。`, {
      "parent-before": parentBefore,
      "worker-before": result.before,
      "worker-after": result.after,
      "parent-after": parentAfter,
    });
  } catch (error) {
    showResult(panel, "error", error.message);
  } finally {
    RunCopy.disabled = !CanUseWorker;
    RunShared.disabled = !CanShare;
  }
}

function observeImage(url) {
  return new Promise(resolve => {
    const image = new Image();
    const timeout = setTimeout(() => finish("timeout"), 5000);

    function finish(result) {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (result === "timeout") {
        image.removeAttribute("src");
      }
      resolve(result);
    }

    image.onload = () => finish("load");
    image.onerror = () => finish("error");
    image.src = url;
  });
}

function setupLocalModes() {
  const modes = new Map([
    ["plain", "ヘッダーなし"],
    ["coop-only", "COOPのみ"],
    ["coep-only", "COEPのみ"],
    ["isolated", "COOPとCOEP"],
  ]);
  const mode = /^\/([a-z-]+)\/(?:index\.html)?$/.exec(location.pathname)?.[1];
  if (location.origin !== "http://127.0.0.1:4194" || !modes.has(mode)) {
    return;
  }

  const nav = document.querySelector("#local-modes");
  for (const [name, label] of modes) {
    const link = document.createElement("a");
    link.href = `../${name}/index.html`;
    link.textContent = label;
    if (name === mode) {
      link.setAttribute("aria-current", "page");
    }
    nav.append(link);
  }
  nav.hidden = false;

  const button = document.querySelector("#run-images");
  const status = document.querySelector("#images-result");
  const unmarked = document.querySelector("#image-unmarked");
  const allowed = document.querySelector("#image-allowed");
  document.querySelector("#image-probe").hidden = false;
  button.disabled = false;

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.dataset.resultKind = "pending";
    status.textContent = "2つの画像を読み込んでいます。";
    unmarked.textContent = "—";
    allowed.textContent = "—";

    const [first, second] = await Promise.all([
      observeImage("http://127.0.0.1:4195/unmarked.svg"),
      observeImage("http://127.0.0.1:4195/allowed.svg"),
    ]);
    unmarked.textContent = first;
    allowed.textContent = second;
    status.dataset.resultKind = "observed";
    status.textContent = "ブラウザが通知した読み込み結果です。";
    button.disabled = false;
  });
}

document.querySelector("#secure-context").textContent = String(window.isSecureContext === true);
document.querySelector("#window-isolated").textContent = String(WindowIsolated);
document.querySelector("#shared-buffer").textContent = String(HasSharedBuffer);
document.querySelector("#atomics").textContent = String(HasAtomics);
document.querySelector("#environment").textContent = CanUseWorker
  ? "Workerの観測値は、コピーまたは共有の実行後に表示されます。"
  : "Workerを利用できません。HTTP(S)で開いていることとブラウザの対応を確認してください。";
document.querySelector("#shared-note").textContent = CanShare ? ""
  : "共有の操作にはクロスオリジン分離と対応APIが必要です。付属サーバーの「COOPとCOEP」で確認できます。";

RunCopy.disabled = !CanUseWorker;
RunShared.disabled = !CanShare;
RunCopy.addEventListener("click", () => void runMemoryCase("copy"));
RunShared.addEventListener("click", () => void runMemoryCase("shared"));
setupLocalModes();
