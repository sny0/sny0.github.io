"""Run the CSRF form lab on two IPv4 loopback ports."""

from dataclasses import dataclass, field
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import re
import secrets
from threading import Lock, Thread
import time
from urllib.parse import parse_qsl


APP_PORT = 4190
OTHER_PORT = 4191
APP_ORIGIN = f"http://127.0.0.1:{APP_PORT}"
OTHER_ORIGIN = f"http://127.0.0.1:{OTHER_PORT}"
APP_PATH = "/csrf-lab/"
OTHER_PATH = "/csrf-other/"
COOKIE_NAME = "sny0_study_csrf_demo"
LIFETIME = 120
MAX_SESSIONS = 128
MAX_FORM_BYTES = 256
ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{43}")
POLICIES = {
    "unprotected": "追加検査なしの経路",
    "origin": "Originを照合する経路",
    "token": "トークンを照合する経路",
}


@dataclass
class Session:
    token: str
    expires: float
    counts: dict = field(default_factory=lambda: dict.fromkeys(POLICIES, 0))


class Sessions:
    def __init__(self):
        self.records = {}
        self.lock = Lock()

    def prune(self):
        now = time.monotonic()
        for session_id in [key for key, record in self.records.items() if record.expires <= now]:
            del self.records[session_id]

    def start(self, old_id):
        with self.lock:
            self.prune()
            if old_id not in self.records and len(self.records) >= MAX_SESSIONS:
                return None
            session_id = secrets.token_urlsafe(32)
            while session_id in self.records:
                session_id = secrets.token_urlsafe(32)
            self.records.pop(old_id, None)
            self.records[session_id] = Session(secrets.token_urlsafe(32), time.monotonic() + LIFETIME)
            return session_id

    def state(self, session_id):
        with self.lock:
            self.prune()
            record = self.records.get(session_id)
            return (record.token, record.counts.copy()) if record else (None, {})

    def apply(self, session_id, policy, origin, token):
        with self.lock:
            self.prune()
            record = self.records.get(session_id)
            token_matches = bool(record and token and ID_PATTERN.fullmatch(token)
                                 and secrets.compare_digest(token, record.token))
            accepted = False
            if origin not in (APP_ORIGIN, OTHER_ORIGIN):
                reason = "教材で指定した送信元のOriginを確認できませんでした。"
            elif not record:
                reason = "有効な教材セッションがありません。"
            elif policy == "origin" and origin != APP_ORIGIN:
                reason = "Originがアプリのオリジンと一致しません。"
            elif policy == "token" and not token_matches:
                reason = "セッションに対応するトークンを確認できませんでした。"
            else:
                record.counts[policy] += 1
                reason = "この経路の条件を満たしたため、教材用カウンターを1増やしました。"
                accepted = True
            return accepted, reason, token_matches, record.counts[policy] if record else None

    def logout(self, session_id):
        with self.lock:
            self.records.pop(session_id, None)


STYLE = """
* { box-sizing: border-box; }
body { margin: 0; color: #162a42; background: #eef3f8; font: 1rem/1.6 system-ui, sans-serif; }
main { width: min(100% - 2rem, 55rem); margin: 1.5rem auto; }
section { padding: 1rem 1.25rem; border: 1px solid #bbcbdc; border-radius: .75rem; background: #fff; margin-bottom: .85rem; }
h1, h2 { line-height: 1.35; }
h1 { margin: 0 0 .6rem; font-size: clamp(1.3rem, 4vw, 1.9rem); }
h2 { margin: .2rem 0 .6rem; font-size: 1.1rem; }
p { margin: .5rem 0; }
a { color: #084d98; }
button { border: 1px solid #164e88; border-radius: .45rem; color: #fff; background: #164e88;
         font: inherit; cursor: pointer; padding: .45rem .7rem; min-height: 2.75rem; }
button:disabled { opacity: .65; cursor: default; }
button:hover:not(:disabled) { background: #103e71; }
:focus-visible { outline: 3px solid #106bbf; outline-offset: 3px; }
.actions { display: flex; flex-wrap: wrap; gap: .65rem; margin: .8rem 0; }
.routes { padding-left: 1.5rem; }
.routes li { margin-bottom: .65rem; }
dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: .35rem .7rem; }
dt { font-weight: 600; }
dd { margin: 0; overflow-wrap: anywhere; }
"""


def document(title, body):
    return f"""<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} | Sny0 Study</title>
  <style>{STYLE}</style>
</head>
<body><main>{body}</main></body>
</html>"""


def form(action, button_id, label, token=None, disabled=False):
    field_html = ""
    if token is not None:
        field_html = f'<input type="hidden" name="token" value="{escape(token, quote=True)}">'
    disabled_attr = " disabled" if disabled else ""
    return (f'<form method="post" action="{action}">{field_html}'
            f'<button id="{button_id}" type="submit"{disabled_attr}>{label}</button></form>')


def navigation():
    return (f'<nav class="actions"><a id="back-app" href="{APP_ORIGIN}{APP_PATH}">アプリへ</a>'
            f'<a id="back-other" href="{OTHER_ORIGIN}{OTHER_PATH}">別オリジンのページへ</a></nav>')


def app_page(token, counts):
    rows = "".join(f'<dt>{label}</dt><dd id="count-{key}">{counts.get(key, "—")}</dd>'
                   for key, label in POLICIES.items())
    forms = "".join(form(f"{APP_PATH}action/{key}", f"app-{key}", f"{label}へ送信",
                         token if key == "token" else None, disabled=token is None)
                    for key, label in POLICIES.items())
    status = "有効" if token else "なし"
    return document("CSRF観察：アプリ", f"""
<section>
  <h1>アプリのページ</h1>
  <p>オリジン <code>{APP_ORIGIN}</code></p>
  <p>教材セッション <strong id="session-state">{status}</strong></p>
  <p>開始すると120秒有効なCookieを発行し、教材用のカウンターを作ります。</p>
  <div class="actions">
    {form(APP_PATH + "session/start", "start-session", "教材セッションを開始")}
    {form(APP_PATH + "session/logout", "logout-session", "ログアウト")}
  </div>
  {navigation()}
</section>
<section>
  <h2>カウンターの現在値</h2>
  <dl>{rows}</dl>
  <h2>アプリ内のフォームから送る</h2>
  <p>トークン照合のフォームには、この教材セッションのトークンが入っています。</p>
  <div class="actions">{forms}</div>
</section>""")


def other_page():
    forms = "".join(f'<li>{form(f"{APP_ORIGIN}{APP_PATH}action/{key}", f"other-{key}", f"{label}へ送信")}</li>'
                    for key, label in POLICIES.items())
    return document("CSRF観察：別オリジン", f"""
<section>
  <h1>別オリジンのページ</h1>
  <p>オリジン <code>{OTHER_ORIGIN}</code></p>
  <p>アプリとはポートが異なります。同じサイトからアプリ宛てに通常のフォームでPOSTします。</p>
  <p>このページのフォームはトークンを持ちません。送るとアプリの結果ページに移動します。</p>
  <ol class="routes">{forms}</ol>
  {navigation()}
</section>""")


def action_page(policy, origin, cookie_seen, token, outcome):
    accepted, reason, token_matches, count = outcome
    status = "受理" if accepted else "拒否"
    result = "accepted" if accepted else "rejected"
    origin_label = origin if origin in (APP_ORIGIN, OTHER_ORIGIN) else (
        "未送信または複数" if origin is None else "教材の対象外"
    )
    token_seen = "あり" if token is not None else "なし"
    token_status = ("照合対象外" if policy != "token" else
                    "一致" if token_matches else "一致を確認できない")
    return document("CSRF観察：送信結果", f"""
<section id="result" data-result="{result}">
  <h1>{POLICIES[policy]}の結果</h1>
  <p><strong>{status}</strong> {reason}</p>
  <dl>
    <dt>要求で受け取ったOrigin</dt><dd id="observed-origin"><code>{origin_label}</code></dd>
    <dt>教材用Cookieの受信</dt><dd id="cookie-received">{"あり" if cookie_seen else "なし"}</dd>
    <dt>トークンの受信</dt><dd id="token-received">{token_seen}</dd>
    <dt>トークンの照合</dt><dd id="token-valid">{token_status}</dd>
    <dt>この経路のカウンター</dt><dd id="counter">{count if count is not None else "—"}</dd>
  </dl>
  {navigation()}
</section>""")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def setup(self):
        self.request.settimeout(5)
        super().setup()

    def log_message(self, format, *args):
        # Do not log request lines, Cookie headers or hidden form values.
        pass

    def reply(self, status, body, cookie=None, redirect=None):
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "origin")
        form_target = "'self'" if self.server.server_port == APP_PORT else APP_ORIGIN
        self.send_header("Content-Security-Policy",
                         "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; "
                         f"frame-ancestors 'none'; form-action {form_target}")
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        if redirect is not None:
            self.send_header("Location", redirect)
        self.end_headers()
        self.wfile.write(payload)

    def error(self, status, message):
        self.reply(status, document("CSRF観察", f"<section><h1>{message}</h1>{navigation()}</section>"))

    def correct_host(self):
        if self.headers.get_all("Host", []) == [f"127.0.0.1:{self.server.server_port}"]:
            return True
        self.error(400, "教材用のホストで開いてください。")
        return False

    def session_cookie(self):
        values = []
        for header in self.headers.get_all("Cookie", []):
            for pair in header.split(";"):
                name, delimiter, value = pair.strip().partition("=")
                if delimiter and name == COOKIE_NAME:
                    values.append(value)
        session_id = values[0] if len(values) == 1 and ID_PATTERN.fullmatch(values[0]) else None
        return bool(values), session_id

    def read_form(self):
        lengths = self.headers.get_all("Content-Length", [])
        if ("Transfer-Encoding" in self.headers or len(lengths) != 1 or
                not re.fullmatch(r"[0-9]{1,4}", lengths[0]) or int(lengths[0]) > MAX_FORM_BYTES):
            raise ValueError("Invalid form length")
        types = self.headers.get_all("Content-Type", [])
        if len(types) != 1 or types[0].split(";", 1)[0].strip().lower() != "application/x-www-form-urlencoded":
            raise ValueError("Invalid form type")
        count = int(lengths[0])
        body = self.rfile.read(count)
        if len(body) != count:
            raise ValueError("Incomplete form")
        fields = parse_qsl(body.decode("ascii"), keep_blank_values=True,
                           strict_parsing=True, errors="strict", max_num_fields=1)
        if fields and fields[0][0] != "token":
            raise ValueError("Unexpected field")
        return fields[0][1] if fields else None

    def do_GET(self):
        if not self.correct_host():
            return
        if self.server.server_port == APP_PORT and self.path == APP_PATH:
            _, session_id = self.session_cookie()
            self.reply(200, app_page(*self.server.sessions.state(session_id)))
        elif self.server.server_port == OTHER_PORT and self.path == OTHER_PATH:
            self.reply(200, other_page())
        else:
            self.error(404, "この教材にないURLです。")

    def do_POST(self):
        if not self.correct_host():
            return
        actions = {f"{APP_PATH}action/{key}": key for key in POLICIES}
        start_path = APP_PATH + "session/start"
        logout_path = APP_PATH + "session/logout"
        if self.server.server_port != APP_PORT or self.path not in {*actions, start_path, logout_path}:
            self.error(404, "この教材にない操作です。")
            return
        try:
            token = self.read_form()
        except (ValueError, OSError):
            self.error(400, "このフォームの形式を読み取れませんでした。")
            return

        origins = self.headers.get_all("Origin", [])
        origin = origins[0] if len(origins) == 1 else None
        cookie_seen, session_id = self.session_cookie()
        if self.path in actions:
            policy = actions[self.path]
            outcome = self.server.sessions.apply(session_id, policy, origin, token)
            self.reply(200 if outcome[0] else 403, action_page(policy, origin, cookie_seen, token, outcome))
            return

        if origin != APP_ORIGIN or token is not None:
            self.error(403, "セッション操作はアプリ内から送信してください。")
            return
        if self.path == start_path:
            new_id = self.server.sessions.start(session_id)
            if new_id is None:
                self.error(503, "教材セッションの上限です。期限切れまでお待ちください。")
                return
            max_age = LIFETIME
        else:
            self.server.sessions.logout(session_id)
            new_id, max_age = "", 0

        cookie = f"{COOKIE_NAME}={new_id}; Path={APP_PATH}; Max-Age={max_age}; SameSite=Strict; HttpOnly"
        self.reply(303, document("CSRF観察", navigation()), cookie=cookie, redirect=APP_PATH)


def main():
    with (ThreadingHTTPServer(("127.0.0.1", APP_PORT), Handler) as app,
          ThreadingHTTPServer(("127.0.0.1", OTHER_PORT), Handler) as other):
        app.sessions = Sessions()
        other_thread = Thread(target=other.serve_forever, daemon=True)
        other_thread.start()
        print(f"アプリのページ: {APP_ORIGIN}{APP_PATH}", flush=True)
        print(f"別オリジンのページ: {OTHER_ORIGIN}{OTHER_PATH}", flush=True)
        try:
            app.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            other.shutdown()
            other_thread.join()


if __name__ == "__main__":
    main()
