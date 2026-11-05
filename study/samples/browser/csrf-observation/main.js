"use strict";

const App = new URL("http://127.0.0.1:4190");
const Foreign = new URL("http://127.0.0.1:4191");
const Policy = document.querySelector("#policy");
const Counter = document.querySelector("#counter");
const Result = document.querySelector("#result");
const Fields = {
  origin: document.querySelector("#request-origin"),
  site: document.querySelector("#request-site"),
  cookie: document.querySelector("#request-cookie"),
  token: document.querySelector("#request-token"),
  originCheck: document.querySelector("#origin-check"),
  policyCheck: document.querySelector("#policy-check"),
  counterChange: document.querySelector("#counter-change"),
};
const Buttons = {
  trusted: document.querySelector("#send-trusted"),
  foreign: document.querySelector("#send-foreign"),
  reset: document.querySelector("#reset"),
};
let count = 0;

function checkPolicy(policy, sameOrigin, hasToken) {
  switch (policy) {
    case "none":
      return {passed: true, message: "追加検査なし"};
    case "origin":
      return {
        passed: sameOrigin,
        message: sameOrigin ? "Originが一致したため通過" : "Originが異なるため拒否",
      };
    case "token":
      return {
        passed: hasToken,
        message: hasToken ? "セッションに対応するトークンが一致したため通過" : "トークンがないため拒否",
      };
    default:
      return {passed: false, message: "検査の設定を確認できないため拒否"};
  }
}

function simulatePost(source, hasToken) {
  // この実験の送信元は、ポートだけが異なる二つのIPv4ループバックURLです。
  const sameSite = source.protocol === App.protocol && source.hostname === App.hostname;
  const sameOrigin = source.origin === App.origin;
  const cookieAttached = sameSite; // 他のCookie条件は満たすという前提です。
  const check = checkPolicy(Policy.value, sameOrigin, hasToken);
  const applied = cookieAttached && check.passed;
  const before = count;
  if (applied) {
    count += 1;
  }

  Counter.textContent = String(count);
  Result.dataset.outcome = applied ? "applied" : "blocked";
  Result.textContent = applied
    ? `要求を受理し、カウンターを ${before} から ${count} に更新しました。`
    : `要求を拒否しました。カウンターは ${count} のままです。`;
  Fields.origin.textContent = source.origin;
  Fields.site.textContent = sameSite ? "同一サイト" : "別サイト";
  Fields.cookie.textContent = cookieAttached ? "付く" : "付かない";
  Fields.token.textContent = hasToken ? "あり" : "なし";
  Fields.originCheck.textContent = sameOrigin ? "一致" : "不一致";
  Fields.policyCheck.textContent = check.message;
  Fields.counterChange.textContent = `${before} → ${count}`;
}

function reset() {
  count = 0;
  Policy.value = "none";
  Counter.textContent = "0";
  Result.dataset.outcome = "idle";
  Result.textContent = "送信元を選んでください。";
  for (const field of Object.values(Fields)) {
    field.textContent = "—";
  }
}

Buttons.trusted.addEventListener("click", () => simulatePost(App, true));
Buttons.foreign.addEventListener("click", () => simulatePost(Foreign, false));
Buttons.reset.addEventListener("click", reset);
Policy.disabled = false;
for (const button of Object.values(Buttons)) {
  button.disabled = false;
}
