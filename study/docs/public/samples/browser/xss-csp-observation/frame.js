"use strict";

const FixedMarkup = `<button type="button" onclick="this.dataset.ran='yes'">教材ボタン</button>`;
const ResultMessage = "sny0-study:xss-csp-observation";
const FrameCases = {
  "text-content": "frame-allow.html",
  "inner-html": "frame-allow.html",
  "with-csp": "frame-block.html",
};

async function observe() {
  const caseName = location.hash.slice(1);
  if (window.parent === window || window.origin !== "null" ||
      !Object.hasOwn(FrameCases, caseName) || !location.pathname.endsWith("/" + FrameCases[caseName])) {
    return;
  }

  // 代入の段階でCSPの検査が起きる場合にも備えて、先に通知を監視します。
  const violation = new Promise(resolve => {
    document.addEventListener("securitypolicyviolation", event => {
      if (event.isTrusted && event.disposition === "enforce" && event.blockedURI === "inline" &&
          ["script-src-attr", "script-src"].includes(event.effectiveDirective)) {
        resolve(event.effectiveDirective);
      }
    });
  });
  const output = document.querySelector("#output");
  if (caseName === "text-content") {
    output.textContent = FixedMarkup;
  } else {
    output.innerHTML = FixedMarkup;
  }

  const button = output.querySelector("button");
  button?.click();
  const marker = button?.dataset.ran === "yes";
  let directive = null;
  if (button && !marker) {
    // 違反通知を受け取れなかったときも、観測したDOMと印を返します。
    const wait = new Promise(resolve => setTimeout(() => resolve(null), 700));
    directive = await Promise.race([violation, wait]);
  }

  window.parent.postMessage({
    message: ResultMessage,
    caseName,
    button: Boolean(button),
    marker,
    directive,
    output: output.textContent,
  }, location.origin);
}

void observe();
