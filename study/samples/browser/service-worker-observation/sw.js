"use strict";

const CacheName = "sny0-study-service-worker-observation-v1";
const PayloadUrl = new URL("./payload.json", self.registration.scope).href;
const SimulatedUrl = `${PayloadUrl}?mode=offline`;
const Fixture = { version: 1, message: "Service Workerの固定テスト" };
const BodyLimit = 2048;
const NetworkBudgetMs = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CacheName);
    const response = new Response(JSON.stringify(Fixture), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
    await cache.put(PayloadUrl, response);
  })());
});

// Activation follows the browser lifecycle. No skipWaiting or clients.claim.
self.addEventListener("fetch", (event) => {
  const { method, mode, url } = event.request;
  if (method !== "GET" || mode === "navigate" || (url !== PayloadUrl && url !== SimulatedUrl)) { return; }
  event.respondWith(handlePayload(event.request, url === SimulatedUrl));
});

function reply(body, source, reason, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Sny0-Study-Source": source,
      "X-Sny0-Study-Reason": reason
    }
  });
}

async function readFixture(response) {
  if (!response.body) { throw new Error("missing-body"); }
  const reader = response.body.getReader();
  const bytes = new Uint8Array(BodyLimit);
  let used = 0;
  let ended = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) { ended = true; break; }
      if (value.byteLength > BodyLimit - used) { throw new Error("body-limit-exceeded"); }
      bytes.set(value, used);
      used += value.byteLength;
    }
  } finally {
    if (!ended) { void reader.cancel().catch(() => {}); }
    reader.releaseLock();
  }
  const body = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, used));
  const data = JSON.parse(body);
  if (!data || typeof data !== "object" || data.version !== Fixture.version ||
      data.message !== Fixture.message || Object.keys(data).length !== 2) {
    throw new Error("fixture-mismatch");
  }
  return body;
}

async function tryNetwork(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NetworkBudgetMs);
  try {
    const response = await fetch(request, {
      cache: "no-store", redirect: "error", credentials: "omit", signal: controller.signal
    });
    if (!response.ok) {
      if (response.body) { void response.body.cancel().catch(() => {}); }
      return { reason: `network-http-${response.status}` };
    }
    const body = await readFixture(response);
    return { body, reason: "network-ok" };
  } catch {
    return { reason: controller.signal.aborted ? "network-timeout" : "network-error" };
  } finally {
    clearTimeout(timer);
  }
}

async function handlePayload(request, simulated) {
  let reason = "simulated-offline";
  if (!simulated) {
    const network = await tryNetwork(request);
    if (network.body !== undefined) { return reply(network.body, "network", network.reason); }
    reason = network.reason;
  }
  try {
    // Match one canonical GET key in one named cache. Do not create on miss.
    const saved = await caches.match(PayloadUrl, { cacheName: CacheName });
    if (!saved) {
      return reply(JSON.stringify({ error: "fixed-cache-entry-missing" }), "cache-miss", reason, 503);
    }
    const body = await readFixture(saved);
    return reply(body, simulated ? "cache-simulated" : "cache-fallback", reason);
  } catch {
    return reply(JSON.stringify({ error: "fixed-cache-read-failed" }), "cache-error", reason, 503);
  }
}
