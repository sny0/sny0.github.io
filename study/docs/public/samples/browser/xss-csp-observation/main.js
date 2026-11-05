"use strict";

const ResultMessage = "sny0-study:xss-csp-observation";
const FrameCases = {
  "text-content": "frame-allow.html",
  "inner-html": "frame-allow.html",
  "with-csp": "frame-block.html",
};
const Panels = [...document.querySelectorAll("[data-case]")];
const Buttons = Panels.map(panel => panel.querySelector("button"));

function isFrameResult(data, caseName) {
  return data?.message === ResultMessage && data.caseName === caseName &&
    typeof data.button === "boolean" && typeof data.marker === "boolean" &&
    [null, "script-src-attr", "script-src"].includes(data.directive) &&
    typeof data.output === "string" && data.output.length <= 200;
}

function observeInFrame(caseName) {
  return new Promise(resolve => {
    const frame = document.createElement("iframe");
    frame.title = "HTML解釈とCSPの実験文書";
    frame.hidden = true;
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("credentialless", "");
    frame.src = new URL(`${FrameCases[caseName]}#${caseName}`, location.href);

    function finish(result) {
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
      frame.remove();
      resolve(result);
    }

    function receive(event) {
      if (event.source === frame.contentWindow && event.origin === "null" &&
          isFrameResult(event.data, caseName)) {
        finish(event.data);
      }
    }

    const timeout = setTimeout(() => finish(null), 8000);
    window.addEventListener("message", receive);
    document.body.append(frame);
  });
}

function updatePanel(panel, state, message, data = null) {
  panel.dataset.resultKind = state;
  panel.querySelector("[data-result]").textContent = message;
  panel.querySelector("[data-button]").textContent = data ? (data.button ? "あり" : "なし") : "—";
  panel.querySelector("[data-marker]").textContent = data ? (data.marker ? "あり" : "なし") : "—";
  panel.querySelector("[data-policy]").textContent = data ? (data.directive ?? "未観測") : "—";
  panel.querySelector("[data-output]").textContent = data?.output ?? "—";
}

async function runObservation(panel) {
  for (const button of Buttons) {
    button.disabled = true;
  }
  updatePanel(panel, "pending", "観察中");
  try {
    const data = await observeInFrame(panel.dataset.case);
    if (data) {
      updatePanel(panel, "observed", "観察が完了しました。", data);
    } else {
      updatePanel(panel, "timeout", "実験文書から結果を受け取れませんでした。もう一度試せます。");
    }
  } finally {
    for (const button of Buttons) {
      button.disabled = false;
    }
  }
}

if (["http:", "https:"].includes(location.protocol)) {
  document.querySelector("#environment").textContent = "下のボタンを押して、処理ごとの結果を見比べます。";
  for (const [index, panel] of Panels.entries()) {
    Buttons[index].addEventListener("click", () => void runObservation(panel));
    Buttons[index].disabled = false;
  }
}
