"use strict";

// Explicit CommonJS extension works independently of a parent package.json.

const http = require("node:http");
const readline = require("node:readline");

if (process.argv.length !== 2) {
  console.error("error=invalid_arguments expected=no_arguments");
  process.exitCode = 2;
} else {
  const body = Buffer.from("Cache \u3042\n", "utf8");
  const expected = Buffer.from([0x43, 0x61, 0x63, 0x68, 0x65, 0x20, 0xe3, 0x81, 0x82, 0x0a]);
  if (!body.equals(expected)) { throw new Error("fixture-encoding-mismatch"); }
  const etag = '"study-v1"';
  let requests = 0;
  let stopping = false;
  let forceCloseTimer = null;

  // Limited field parser: wildcard or 1..16 tags, with no empty list members.
  // A comma inside quotes is opaque tag data, not a list separator.
  function parseIfNoneMatch(value) {
    if (typeof value !== "string" || value.length > 1024) { return null; }
    let index = 0;
    const tags = [];
    const skipOws = () => {
      while (value[index] === " " || value[index] === "\t") { index += 1; }
    };
    skipOws();
    if (value[index] === "*") {
      index += 1;
      skipOws();
      return index === value.length ? { wildcard: true, tags } : null;
    }
    while (index < value.length) {
      if (tags.length === 16) { return null; }
      if (value.slice(index, index + 2) === "W/") { index += 2; }
      if (value[index] !== '"') { return null; }
      index += 1;
      const start = index;
      while (index < value.length && value[index] !== '"') {
        const code = value.charCodeAt(index);
        if (!(code === 0x21 || (code >= 0x23 && code <= 0x7e) || (code >= 0x80 && code <= 0xff))) { return null; }
        index += 1;
      }
      if (value[index] !== '"') { return null; }
      tags.push(value.slice(start, index));
      index += 1;
      skipOws();
      if (index === value.length) { return { wildcard: false, tags }; }
      if (value[index] !== ",") { return null; }
      index += 1;
      skipOws();
      if (index === value.length) { return null; }
    }
    return null;
  }

  const server = http.createServer({ maxHeaderSize: 4096, requestTimeout: 8000, headersTimeout: 5000 }, (request, response) => {
    requests += 1;
    const number = requests;
    const finishEmpty = (status, condition) => {
      response.statusCode = status;
      response.setHeader("Content-Length", "0");
      response.setHeader("Connection", "close");
      response.end();
      console.log(`request=${number} method=${request.method} status=${status} condition=${condition}`);
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      finishEmpty(405, "unsupported_method");
      return;
    }
    if (request.url !== "/resource") {
      finishEmpty(404, "unknown_resource");
      return;
    }
    // Request bodies are outside this fixed GET/HEAD teaching protocol.
    if (request.headers["transfer-encoding"] !== undefined ||
        (request.headers["content-length"] !== undefined && request.headers["content-length"] !== "0")) {
      finishEmpty(400, "request_body_not_supported");
      return;
    }
    const raw = request.headers["if-none-match"];
    const condition = raw === undefined ? undefined : parseIfNoneMatch(raw);
    if (condition === null) {
      finishEmpty(400, "unsupported_or_invalid_validator");
      return;
    }
    // If-None-Match on GET/HEAD uses weak comparison: compare opaque tags.
    const matched = condition !== undefined && (condition.wildcard || condition.tags.includes("study-v1"));
    response.statusCode = matched ? 304 : 200;
    response.setHeader("Date", new Date().toUTCString());
    response.setHeader("ETag", etag);
    response.setHeader("Cache-Control", "no-cache");
    if (matched) {
      // No Content-Length and no message body in this 304 response.
      response.end();
    } else {
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.setHeader("Content-Length", String(body.length));
      response.end(request.method === "HEAD" ? undefined : body);
    }
    console.log(`request=${number} method=${request.method} status=${response.statusCode} condition=${raw === undefined ? "absent" : matched ? "matched" : "not_matched"}`);
  });
  server.keepAliveTimeout = 1000;
  server.setTimeout(8000, (socket) => socket.destroy());
  server.on("clientError", (_error, socket) => {
    if (socket.writable) {
      socket.end(`HTTP/1.1 400 Bad Request\r\nDate: ${new Date().toUTCString()}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`);
    } else { socket.destroy(); }
  });
  const input = readline.createInterface({ input: process.stdin, terminal: false });
  function stop() {
    if (stopping) { return; }
    stopping = true;
    console.log("server_stopping=true");
    server.close(() => {
      clearTimeout(forceCloseTimer);
      input.close();
      process.stdin.pause();
      console.log("server_closed=true");
    });
    // Bound cleanup of an incomplete local request after listener shutdown.
    forceCloseTimer = setTimeout(() => server.closeAllConnections(), 1000);
    forceCloseTimer.unref();
  }
  input.on("line", (line) => { if (line.trim() === "stop") { stop(); } });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  server.once("error", (error) => {
    console.error(`server_error=${error.code || "unknown"}`);
    input.close();
    process.stdin.pause();
    process.exitCode = 1;
  });
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    console.log(`port=${address.port}`);
    console.log(`url=http://127.0.0.1:${address.port}/resource`);
    console.log("stop=Ctrl+C_or_stdin_line_stop");
  });
}
