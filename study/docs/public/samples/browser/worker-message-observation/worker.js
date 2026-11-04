"use strict";

(() => {
  let busy = false;

  function validId(id) { return Number.isSafeInteger(id) && id > 0; }

  function protocolError(id, code) {
    self.postMessage({ type: "protocol-error", id: validId(id) ? id : null, code });
  }

  function isFixture(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== 16) { return false; }
    return new Uint8Array(buffer).every((value, index) => value === index);
  }

  self.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object" || !validId(data.id) || typeof data.type !== "string") {
      protocolError(data && data.id, "invalid-message");
      return;
    }
    if (busy) {
      protocolError(data.id, "one-job-only");
      return;
    }
    if (data.type === "delay") {
      busy = true;
      setTimeout(() => {
        busy = false;
        self.postMessage({ type: "delay-result", id: data.id, requestedDelayMs: 3000 });
      }, 3000);
      return;
    }
    if (data.type !== "copy" && data.type !== "transfer") {
      protocolError(data.id, "unknown-type");
      return;
    }
    if (!isFixture(data.buffer)) {
      protocolError(data.id, "invalid-fixture");
      return;
    }
    busy = true;
    const buffer = data.buffer;
    const bytes = new Uint8Array(buffer);
    const lengthBefore = buffer.byteLength;
    const firstBefore = bytes[0];
    const sumBefore = bytes.reduce((sum, value) => sum + value, 0);
    bytes[0] = 255;
    const result = { type: "result", id: data.id, mode: data.type,
      lengthBefore, firstBefore, sumBefore, buffer };
    if (data.type === "transfer") {
      // The buffer is reachable from the message as well as in the transfer list.
      self.postMessage(result, [buffer]);
      const byteLength = buffer.byteLength;
      self.postMessage({ type: "transfer-state", id: data.id, byteLength });
    } else {
      self.postMessage(result);
    }
    busy = false;
  });

  self.addEventListener("messageerror", () => protocolError(null, "message-deserialization-failed"));
  self.postMessage({ type: "ready", protocol: 1 });
})();
