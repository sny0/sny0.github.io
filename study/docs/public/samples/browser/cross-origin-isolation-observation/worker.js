"use strict";

self.addEventListener("message", ({data: {mode, buffer}}) => {
  const values = new Int32Array(buffer);
  let before;
  let after;

  if (mode === "shared") {
    before = Atomics.add(values, 0, 1);
    after = Atomics.load(values, 0);
  } else {
    before = values[0];
    values[0] += 1;
    after = values[0];
  }

  self.postMessage({mode, before, after, isolated: self.crossOriginIsolated === true});
}, {once: true});
