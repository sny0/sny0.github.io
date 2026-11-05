"""Serve the CORS observation files on loopback with a selectable fixture policy."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


PAYLOAD_PATH = "/payload.txt"
ASSET_PATHS = {
    "/index.html",
    "/styles.css",
    "/observe.js",
    "/main.js",
    "/frame.html",
    "/frame.js",
    PAYLOAD_PATH,
}


class ObservationHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        if self.path == "/":
            self.path = "/index.html"
        if self.path not in ASSET_PATHS:
            self.send_error(404)
            return None
        return super().send_head()

    def do_OPTIONS(self):
        if self.path != PAYLOAD_PATH:
            self.send_error(404)
            return
        if (
            self.server.policy != "preflight"
            or not self.headers.get("Origin")
            or self.headers.get("Access-Control-Request-Method") != "GET"
            or self.headers.get("Access-Control-Request-Headers", "").lower() != "x-study-demo"
        ):
            self.send_error(403)
            return

        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET")
        self.send_header("Access-Control-Allow-Headers", "X-Study-Demo")
        self.send_header("Access-Control-Max-Age", "0")
        self.end_headers()

    def end_headers(self):
        if (
            self.path == PAYLOAD_PATH
            and self.command in {"GET", "HEAD"}
            and self.server.policy != "deny"
        ):
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_request(self, code="-", size="-"):
        headers = (
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "X-Study-Demo",
        )
        details = " ".join(
            f"{name}={self.headers[name]!r}" for name in headers if name in self.headers
        )
        print(f"{self.command} {self.path!r} -> {code} {details}".rstrip(), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4176)
    parser.add_argument("--policy", choices=["deny", "read", "preflight"], default="deny")
    args = parser.parse_args()

    handler = partial(ObservationHandler, directory=Path(__file__).resolve().parent)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        server.policy = args.policy
        print(f"http://127.0.0.1:{server.server_port}/index.html ({args.policy})", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
