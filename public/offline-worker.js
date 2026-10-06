const CACHE_PREFIX = "chordph-reader-";
const CACHE_NAME = `${CACHE_PREFIX}v9`;
const READER_URL = "/offline";
let preparation;

self.addEventListener("install", (event) => {
  event.waitUntil(prepareReader().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
  })());
});

function staticUrl(value, base = self.location.origin) {
  const url = new URL(value.replaceAll("&amp;", "&"), base);
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/") ? url.href : null;
}

async function prepareReader() {
  const response = await fetch(READER_URL, { cache: "no-store", redirect: "error" });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Reader unavailable");
  const html = await response.clone().text();
  const assets = new Set();
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = staticUrl(match[1]);
    if (url) assets.add(url);
  }
  if (!assets.size) throw new Error("Reader assets unavailable");
  const cache = await caches.open(CACHE_NAME);
  await Promise.all([...assets].map(async (url) => {
    const asset = await fetch(url, { cache: "reload", redirect: "error" });
    if (!asset.ok) throw new Error("Asset unavailable");
    if (new URL(url).pathname.endsWith(".css")) {
      const css = await asset.clone().text();
      await Promise.all([...css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(async (match) => {
        const fontUrl = staticUrl(match[1], url);
        if (!fontUrl) return;
        const font = await fetch(fontUrl, { cache: "reload", redirect: "error" });
        if (!font.ok) throw new Error("Font unavailable");
        await cache.put(fontUrl, font);
      }));
    }
    await cache.put(url, asset);
  }));
  await cache.put(READER_URL, response);
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE" || !event.ports[0]) return;
  if (!preparation) preparation = prepareReader().finally(() => { preparation = undefined; });
  event.waitUntil(preparation.then(
    () => event.ports[0].postMessage({ ok: true }),
    () => event.ports[0].postMessage({ ok: false }),
  ));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      try {
        const cached = await (await caches.open(CACHE_NAME)).match(request);
        if (cached) return cached;
      } catch {
        return fetch(request);
      }
      return fetch(request);
    })());
    return;
  }
  if (request.mode !== "navigate" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/music/files/")) return;
  event.respondWith((async () => {
    let cached;
    try {
      cached = await (await caches.open(CACHE_NAME)).match(READER_URL);
    } catch {
      return fetch(request);
    }
    if (url.pathname === READER_URL && cached) return cached;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(request, { signal: controller.signal });
      if (response.status >= 500 && cached) return offlineRedirect(url);
      return response;
    } catch (error) {
      if (cached) return offlineRedirect(url);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })());
});

function offlineRedirect(url) {
  return Response.redirect(`${self.location.origin}${READER_URL}?from=${encodeURIComponent(url.pathname)}`, 302);
}
