"""Serve the cross-origin isolation lab on two IPv4 loopback ports."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread


HOST = "127.0.0.1"
PAGE_PORT = 4194
IMAGE_PORT = 4195
TYPES = {
    "index.html": "text/html; charset=utf-8",
    "styles.css": "text/css; charset=utf-8",
    "main.js": "text/javascript; charset=utf-8",
    "worker.js": "text/javascript; charset=utf-8",
}
MODES = {
    "plain": (False, False),
    "coop-only": (True, False),
    "coep-only": (False, True),
    "isolated": (True, True),
}
IMAGE = b'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#315d8c"/></svg>'
IMAGE_ROUTES = {
    "/unmarked.svg": ("image/svg+xml", IMAGE, ()),
    "/allowed.svg": (
        "image/svg+xml",
        IMAGE,
        (("Cross-Origin-Resource-Policy", "cross-origin"),),
    ),
}


def page_routes(directory):
    assets = {name: (directory / name).read_bytes() for name in TYPES}
    routes = {}
    for mode, (coop, coep) in MODES.items():
        for name, content_type in TYPES.items():
            headers = []
            if coop and name == "index.html":
                headers.append(("Cross-Origin-Opener-Policy", "same-origin"))
            if coep and name in {"index.html", "worker.js"}:
                headers.append(("Cross-Origin-Embedder-Policy", "require-corp"))
            response = (content_type, assets[name], headers)
            routes[f"/{mode}/{name}"] = response
            if name == "index.html":
                routes[f"/{mode}/"] = response
    return routes


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        self.request.settimeout(5)
        super().setup()

    def log_message(self, format, *args):
        # Keep arbitrary request data out of the lab's terminal output.
        pass

    def do_GET(self):
        self.respond(include_body=True)

    def do_HEAD(self):
        self.respond(include_body=False)

    def respond(self, include_body):
        # Look up the raw request target so a normalized path is not an alias.
        target = self.requestline.split()[1]
        expected_host = f"{HOST}:{self.server.server_port}"
        if self.headers.get_all("Host") != [expected_host]:
            status = 400
            content_type, body, headers = "text/plain; charset=utf-8", b"Bad Host\n", ()
        elif target not in self.server.routes:
            status = 404
            content_type, body, headers = "text/plain; charset=utf-8", b"Not Found\n", ()
        else:
            status = 200
            content_type, body, headers = self.server.routes[target]

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for name, value in headers:
            self.send_header(name, value)
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
        pages = page_routes(Path(__file__).resolve().parent)
        with LabServer(PAGE_PORT, pages) as page_server, LabServer(IMAGE_PORT, IMAGE_ROUTES) as image_server:
            image_thread = Thread(target=image_server.serve_forever, name="lab-images")
            image_thread.start()
            try:
                print(f"http://{HOST}:{PAGE_PORT}/plain/", flush=True)
                print(f"Image origin: http://{HOST}:{IMAGE_PORT}", flush=True)
                page_server.serve_forever()
            except KeyboardInterrupt:
                pass
            finally:
                image_server.shutdown()
                image_thread.join()
    except OSError as error:
        raise SystemExit(f"Could not start the lab: {error}") from error


if __name__ == "__main__":
    main()
