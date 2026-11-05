"""Run the session observation server on IPv4 loopback."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import secrets
from threading import Lock
import time


PREFIX = "/study-cookie-demo/"
API = PREFIX + "api/"
SESSION_COOKIE = "sny0_study_session_demo"
HINT_COOKIE = "sny0_study_session_hint"
LIFETIME_SECONDS = 120
MAX_SESSIONS = 128
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_-]{43}")


class SessionStore:
    def __init__(self):
        self.records = {}
        self.lock = Lock()

    def apply(self, action, token):
        with self.lock:
            now = time.monotonic()
            for expired in [key for key, (_, expiry) in self.records.items() if expiry <= now]:
                del self.records[expired]
            current = self.records.get(token)
            generation = current[0] if current else None

            if action == "state":
                return generation, None
            if action == "logout":
                self.records.pop(token, None)
                return None, None
            if action == "rotate" and current is None:
                return None, None
            if current is None and len(self.records) >= MAX_SESSIONS:
                return None, None

            new_token = secrets.token_urlsafe(32)
            while new_token in self.records:
                new_token = secrets.token_urlsafe(32)
            self.records.pop(token, None)
            new_generation = generation + 1 if action == "rotate" else 1
            self.records[new_token] = (new_generation, now + LIFETIME_SECONDS)
            return new_generation, new_token


class ObservationHandler(BaseHTTPRequestHandler):
    def setup(self):
        self.request.settimeout(5)
        super().setup()

    def log_message(self, format, *args):
        # Do not log request lines, cookies, or session IDs.
        pass

    def reply(self, status, body, content_type, cookies=()):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; "
            "connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        )
        for cookie in cookies:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, data, cookies=()):
        self.reply(status, json.dumps(data).encode("utf-8"), "application/json; charset=utf-8", cookies)

    def cookie_values(self, name):
        values = []
        for header in self.headers.get_all("Cookie", []):
            for pair in header.split(";"):
                key, separator, value = pair.strip().partition("=")
                if separator and key == name:
                    values.append(value)
        return values

    def session_token(self, values):
        if len(values) == 1 and TOKEN_PATTERN.fullmatch(values[0]):
            return values[0]
        return None

    def correct_host(self):
        if self.headers.get_all("Host", []) == [self.server.authority]:
            return True
        self.send_json(400, {"error": "host"})
        return False

    def do_GET(self):
        if not self.correct_host():
            return
        if self.path == API + "state":
            session_values = self.cookie_values(SESSION_COOKIE)
            generation, _ = self.server.sessions.apply("state", self.session_token(session_values))
            self.send_json(200, {
                "sessionCookieReceived": bool(session_values),
                "hintCookieReceived": bool(self.cookie_values(HINT_COOKIE)),
                "generation": generation,
            })
        elif self.path in self.server.assets:
            data, content_type = self.server.assets[self.path]
            self.reply(200, data, content_type)
        else:
            self.send_json(404, {"error": "path"})

    def do_POST(self):
        if not self.correct_host():
            return
        if self.headers.get_all("Origin", []) != ["http://" + self.server.authority]:
            self.send_json(403, {"error": "origin"})
            return
        if "Transfer-Encoding" in self.headers or self.headers.get_all("Content-Length", []) not in ([], ["0"]):
            self.send_json(400, {"error": "body"})
            return
        action = self.path.removeprefix(API)
        if not self.path.startswith(API) or action not in {"start", "rotate", "logout"}:
            self.send_json(404, {"error": "path"})
            return

        _, new_token = self.server.sessions.apply(action, self.session_token(self.cookie_values(SESSION_COOKIE)))
        if action != "logout" and new_token is None:
            status, error = (409, "missing_session") if action == "rotate" else (503, "capacity")
            self.send_json(status, {"error": error})
            return

        max_age = 0 if action == "logout" else LIFETIME_SECONDS
        # Loopback HTTP is used for this experiment. The two cookies are host-only.
        attributes = f"Path={PREFIX}; Max-Age={max_age}; SameSite=Strict"
        hint = "" if action == "logout" else "present"
        self.send_json(200, {"action": action}, (
            f"{SESSION_COOKIE}={new_token or ''}; {attributes}; HttpOnly",
            f"{HINT_COOKIE}={hint}; {attributes}",
        ))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4179)
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("--port must be between 0 and 65535")

    directory = Path(__file__).resolve().parent
    assets = {
        PREFIX + "session.html": ((directory / "session.html").read_bytes(), "text/html; charset=utf-8"),
        PREFIX + "session.js": ((directory / "session.js").read_bytes(), "text/javascript; charset=utf-8"),
    }
    with ThreadingHTTPServer(("127.0.0.1", args.port), ObservationHandler) as server:
        server.authority = "127.0.0.1" if server.server_port == 80 else f"127.0.0.1:{server.server_port}"
        server.assets = assets
        server.sessions = SessionStore()
        print(f"http://{server.authority}{PREFIX}session.html", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
