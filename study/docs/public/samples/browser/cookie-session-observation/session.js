"use strict";

const Actions = {
  start: "start",
  inspect: "state",
  rotate: "rotate",
  logout: "logout",
};
const Messages = {
  start: "開始要求が完了しました。",
  state: "状態を確認しました。",
  rotate: "ID更新の要求が完了しました。",
  logout: "ログアウトの要求が完了しました。",
};
const Buttons = Object.keys(Actions).map(id => document.getElementById(id));
const Operation = document.getElementById("operation");
const ScriptId = document.getElementById("script-id");
const ScriptHint = document.getElementById("script-hint");
const ReceivedId = document.getElementById("received-id");
const ReceivedHint = document.getElementById("received-hint");
const ServerState = document.getElementById("server-state");
const Generation = document.getElementById("generation");

async function request(action, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`api/${action}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    return {ok: response.ok, data: await response.json()};
  } finally {
    clearTimeout(timeout);
  }
}

function render(state) {
  try {
    const names = document.cookie.split(";").map(pair => pair.trim().split("=", 1)[0]);
    ScriptId.textContent = names.includes("sny0_study_session_demo") ? "見える" : "見えない";
    ScriptHint.textContent = names.includes("sny0_study_session_hint") ? "見える" : "見えない";
  } catch {
    ScriptId.textContent = "確認できない";
    ScriptHint.textContent = "確認できない";
  }
  ReceivedId.textContent = state.sessionCookieReceived ? "受信あり" : "受信なし";
  ReceivedHint.textContent = state.hintCookieReceived ? "受信あり" : "受信なし";
  ServerState.textContent = state.generation === null ? "なし" : "あり";
  Generation.textContent = state.generation ?? "—";
}

async function observe(action) {
  for (const button of Buttons) {
    button.disabled = true;
  }
  Operation.textContent = "サーバーと通信中です。";
  for (const output of [ScriptId, ScriptHint, ReceivedId, ReceivedHint, ServerState, Generation]) {
    output.textContent = "—";
  }

  try {
    let message = Messages[action];
    if (action !== "state") {
      const result = await request(action, "POST");
      if (!result.ok) {
        message = {
          missing_session: "更新できるセッションがありません。",
          capacity: "教材サーバーのセッション上限に達しました。",
        }[result.data.error] ?? "操作の要求が拒否されました。";
      }
    }
    const {ok, data} = await request("state", "GET");
    if (!ok || typeof data.sessionCookieReceived !== "boolean" ||
        typeof data.hintCookieReceived !== "boolean" ||
        (data.generation !== null && !Number.isSafeInteger(data.generation))) {
      throw new Error("Unexpected state response");
    }
    render(data);
    Operation.textContent = message;
  } catch {
    Operation.textContent = "現在の状態を確認できませんでした。サーバーを確認してから「状態を確認」を押してください。";
  } finally {
    for (const button of Buttons) {
      button.disabled = false;
    }
  }
}

if (location.protocol === "http:" && location.hostname === "127.0.0.1" &&
    location.pathname === "/study-cookie-demo/session.html") {
  document.getElementById("launch-note").hidden = true;
  Operation.textContent = "操作するボタンを選んでください。";
  for (const button of Buttons) {
    button.disabled = false;
    button.addEventListener("click", () => void observe(Actions[button.id]));
  }
}
