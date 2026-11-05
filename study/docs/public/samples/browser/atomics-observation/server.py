"""Serve the Atomics lab with isolation headers on IPv4 loopback."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = "127.0.0.1"
PORT = 4187
TYPES = {
    "index.html": "text/html; charset=utf-8",
    "styles.css": "text/css; charset=utf-8",
    "main.js": "text/javascript; charset=utf-8",
    "worker.js": "text/javascript; charset=utf-8",
}


def page_routes(directory):
    routes = {
        f"/{name}": (content_type, (directory / name).read_bytes())
        for name, content_type in TYPES.items()
    }
    routes["/"] = routes["/index.html"]
    return routes


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        self.request.settimeout(5)
        super().setup()

    def log_message(self, format, *args):
        # The lab does not log arbitrary request targets.
        pass

    def do_GET(self):
        self.respond(include_body=True)

    def do_HEAD(self):
        self.respond(include_body=False)

    def respond(self, include_body):
        # Use the raw request target so a normalized path is not an alias.
        target = self.requestline.split()[1]
        expected_host = f"{HOST}:{self.server.server_port}"
        if self.headers.get_all("Host") != [expected_host]:
            status, content_type, body = 400, "text/plain; charset=utf-8", b"Bad Host\n"
        elif target not in self.server.routes:
            status, content_type, body = 404, "text/plain; charset=utf-8", b"Not Found\n"
        else:
            status = 200
            content_type, body = self.server.routes[target]

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if status == 200:
            if target in {"/", "/index.html"}:
                self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            if target in {"/", "/index.html", "/worker.js"}:
                self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.end_headers()
        if include_body:
            self.wfile.write(body)


class LabServer(ThreadingHTTPServer):
    allow_reuse_address = False

    def __init__(self, port, routes):
        self.routes = routes
        super().__init__((HOST, port), Handler)


def main():
    try:
        routes = page_routes(Path(__file__).resolve().parent)
        with LabServer(PORT, routes) as server:
            print(f"http://{HOST}:{PORT}/", flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass
    except OSError as error:
        raise SystemExit(f"Could not start the lab: {error}") from error


if __name__ == "__main__":
    main()
