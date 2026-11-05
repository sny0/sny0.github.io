"use strict";

const Panels = [...document.querySelectorAll("[data-case]")];
const Buttons = Panels.map(panel => panel.querySelector("button"));

document.querySelector("#page-origin").textContent = window.origin;
document.querySelector("#payload-url").textContent = PayloadUrl.href;

function isFrameResult(result) {
  if (!result || typeof result !== "object") {
    return false;
  }
  if (result.kind === "failed" || result.kind === "timeout") {
    return true;
  }
  if (result.kind !== "response") {
    return false;
  }
  if (result.type === "opaque") {
    return result.status === 0 && result.body === null;
  }
  return result.type === "cors" && Number.isInteger(result.status)
    && result.status >= 200 && result.status <= 599
    && typeof result.body === "string" && result.body.length <= 120;
}

function observeInFrame(caseName) {
  return new Promise(resolve => {
    const frame = document.createElement("iframe");
    frame.title = "固定テキスト取得用のサンドボックス";
    frame.hidden = true;
    frame.setAttribute("sandbox", "allow-scripts");
    frame.src = new URL(`frame.html#${caseName}`, location.href);

    function finish(result) {
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
      frame.remove();
      resolve(result);
    }

    function receive(event) {
      if (event.source !== frame.contentWindow || event.origin !== "null") {
        return;
      }
      const data = event.data;
      if (data?.message === ObservationMessage && data.caseName === caseName && isFrameResult(data.result)) {
        finish(data.result);
      }
    }

    const timeout = setTimeout(() => finish({kind: "frame-timeout"}), 8000);
    window.addEventListener("message", receive);
    document.body.append(frame);
  });
}

function showResult(panel, result) {
  const messages = {
    pending: "取得中",
    failed: "Fetchまたは本文の読み取りに失敗",
    timeout: "取得をタイムアウトで中止",
    "frame-timeout": "iframeからの観測結果を待つ時間を超過",
  };
  const hasResponse = result.kind === "response";
  const isOpaque = result.type === "opaque";
  let message = messages[result.kind];
  if (hasResponse) {
    message = isOpaque ? "応答の詳細は非公開" : "応答を読み取り可能";
  }

  panel.dataset.resultKind = result.kind;
  panel.querySelector("[data-result]").textContent = message;
  panel.querySelector("[data-type]").textContent = hasResponse ? result.type : "—";
  panel.querySelector("[data-status]").textContent = hasResponse ? String(result.status) : "—";
  panel.querySelector("[data-body]").textContent = isOpaque ? "読み取り不可" : result.body ?? "—";
}

async function runObservation(panel) {
  const caseName = panel.dataset.case;
  for (const button of Buttons) {
    button.disabled = true;
  }
  showResult(panel, {kind: "pending"});

  try {
    const result = caseName === "same-origin"
      ? await observeFetch({mode: "same-origin"})
      : await observeInFrame(caseName);
    showResult(panel, result);
  } finally {
    for (const button of Buttons) {
      button.disabled = false;
    }
  }
}

for (const panel of Panels) {
  panel.querySelector("button").addEventListener("click", () => void runObservation(panel));
}
