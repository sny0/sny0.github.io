"use strict";

const FrameCases = {
  cors: {mode: "cors"},
  "no-cors": {mode: "no-cors"},
  preflight: {mode: "cors", headers: {"X-Study-Demo": "1"}},
};

async function runFrameObservation() {
  const caseName = location.hash.slice(1);
  if (window.parent === window || window.origin !== "null" || !Object.hasOwn(FrameCases, caseName)) {
    return;
  }

  const result = await observeFetch(FrameCases[caseName]);
  // 配信URLのオリジンが、親ページのオリジンに一致します。
  window.parent.postMessage({
    message: ObservationMessage,
    caseName,
    result,
  }, new URL(location.href).origin);
}

void runFrameObservation();
