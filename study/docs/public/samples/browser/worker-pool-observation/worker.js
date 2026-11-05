"use strict";

(() => {
  let busy = false;
  const positiveId = (value) => Number.isSafeInteger(value) && value > 0;

  function validValues(values) {
    if (!Array.isArray(values) || values.length !== 16) { return false; }
    // Index access also rejects holes; Array.prototype.every alone would skip them.
    for (let index = 0; index < 16; index += 1) {
      if (values[index] !== index) { return false; }
    }
    return true;
  }

  function protocolError(data, code) {
    self.postMessage({ type: "protocol-error", id: positiveId(data && data.id) ? data.id : null,
      slot: data && data.slot, generation: data && data.generation, code });
  }

  self.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object" || data.type !== "run" || !positiveId(data.id) ||
        !positiveId(data.generation) || (data.slot !== 0 && data.slot !== 1) ||
        !validValues(data.values)) {
      protocolError(data, "invalid-run-message");
      return;
    }
    if (busy) {
      protocolError(data, "worker-already-busy");
      return;
    }
    busy = true;
    const count = data.values.length;
    const sum = data.values.reduce((total, value) => total + value, 0);
    // This delay exposes lifecycle states; it is not a CPU benchmark.
    setTimeout(() => {
      busy = false;
      self.postMessage({ type: "result", id: data.id, slot: data.slot,
        generation: data.generation, count, sum });
    }, 3000);
  });

  self.addEventListener("messageerror", () => protocolError(null, "message-deserialization-failed"));
  self.postMessage({ type: "ready", protocol: 1 });
})();
