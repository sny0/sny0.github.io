"use strict";

const PayloadUrl = new URL("payload.txt", location.href);
const ObservationMessage = "sny0-study:cors-observation";

async function observeFetch(options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(PayloadUrl, {
      ...options,
      cache: "no-store",
      credentials: "omit",
      // Cross-origin no-cors requires the follow redirect mode.
      redirect: options.mode === "no-cors" ? "follow" : "error",
      signal: controller.signal,
    });
    return {
      kind: "response",
      type: response.type,
      status: response.status,
      body: response.type === "opaque" ? null : (await response.text()).trimEnd().slice(0, 120),
    };
  } catch {
    return {kind: controller.signal.aborted ? "timeout" : "failed"};
  } finally {
    clearTimeout(timeout);
  }
}
