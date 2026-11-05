"use strict";

const Controls = [...document.querySelectorAll(".actions button")];
const Status = document.querySelector("#operation-status");
const Probe = document.querySelector("#path-probe");
const PathPattern = /^\/(?:[a-zA-Z0-9._-]+\/)*cookie-session-observation\/(?:index\.html)?$/;
const MaxAge = 120;

function setStatus(state, message) {
  Status.dataset.state = state;
  Status.textContent = message;
}

function readVisibility(doc, cookies) {
  const pairs = new Set(doc.cookie.split(";").map(pair => pair.trim()));
  return cookies.map(cookie => pairs.has(cookie.pair));
}

function showVisibility(cookies, main, probe) {
  for (const [index, cookie] of cookies.entries()) {
    for (const [cell, visible] of [[cookie.mainCell, main[index]], [cookie.probeCell, probe[index]]]) {
      cell.dataset.visible = String(visible);
      cell.textContent = visible ? "見える" : "見えない";
    }
  }
}

function initialize() {
  if (!["https:", "http:"].includes(location.protocol) || !PathPattern.test(location.pathname)) {
    setStatus("unavailable", "cookie-session-observation フォルダの入口をHTTP(S)で開いてください。");
    return;
  }

  const basePath = location.pathname.replace(/index\.html$/, "");
  const childPath = basePath + "child/";
  const probeUrl = new URL(childPath + "probe.html", location.origin);
  const cookies = [
    {
      pair: "sny0_study_cookie_observe_base_v1=base",
      path: basePath,
      mainCell: document.querySelector("#main-base"),
      probeCell: document.querySelector("#probe-base"),
    },
    {
      pair: "sny0_study_cookie_observe_child_v1=child",
      path: childPath,
      mainCell: document.querySelector("#main-child"),
      probeCell: document.querySelector("#probe-child"),
    },
  ];
  const secure = location.protocol === "https:" ? "; Secure" : "";

  document.querySelector("#base-scope").textContent = basePath;
  document.querySelector("#child-scope").textContent = childPath;

  function probeDocument() {
    const doc = Probe.contentDocument;
    return doc?.URL === probeUrl.href && doc.getElementById("cookie-path-probe") ? doc : null;
  }

  function observe(action) {
    const doc = probeDocument();
    if (!doc) {
      setStatus("unavailable", "子ページを読み込めませんでした。ページを再読み込みしてください。");
      return;
    }

    try {
      if (action !== "read") {
        const age = action === "save" ? MaxAge : 0;
        for (const cookie of cookies) {
          document.cookie = `${cookie.pair}; Path=${cookie.path}; Max-Age=${age}; SameSite=Lax${secure}`;
        }
      }

      const main = readVisibility(document, cookies);
      const probe = readVisibility(doc, cookies);
      showVisibility(cookies, main, probe);

      if (action === "read") {
        setStatus("observed", "現在の見え方を確認しました。");
      } else if (action === "save") {
        const matches = main[0] && !main[1] && probe[0] && probe[1];
        setStatus(matches ? "saved" : "unexpected", matches
          ? "保存後の見え方を確認しました。"
          : "保存後の見え方が想定と異なります。Cookieの許可設定を確認してください。");
      } else {
        const remaining = main.some(Boolean) || probe.some(Boolean);
        setStatus(remaining ? "unexpected" : "cleared", remaining
          ? "教材の固定値と一致するCookieが引き続き見えています。"
          : "教材用Cookieの削除後、どちらの文書にも固定値が見えないことを確認しました。");
      }
    } catch {
      setStatus("unavailable", "Cookieを読み書きできませんでした。ブラウザの許可設定を確認してください。");
    }
  }

  document.querySelector("#save-cookies").addEventListener("click", () => observe("save"));
  document.querySelector("#read-cookies").addEventListener("click", () => observe("read"));
  document.querySelector("#clear-cookies").addEventListener("click", () => observe("clear"));
  Probe.addEventListener("load", () => {
    if (!probeDocument()) {
      setStatus("unavailable", "子ページを読み込めませんでした。ページを再読み込みしてください。");
      return;
    }
    for (const control of Controls) {
      control.disabled = false;
    }
    setStatus("ready", "操作を選んでください。");
  });
  Probe.src = probeUrl.href;
}

initialize();
