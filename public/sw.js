/* Offline cache. Hand-written rather than pulled from a plugin — the whole
   policy is the twenty lines below, and it needs no build step.

   Bump CACHE to force every client to drop the old files. */
const CACHE = "jp-reading-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      /* Pages: network first. A new story only exists in a freshly deployed
         HTML file, and cache-first would hide it until the second visit. */
      if (req.mode === "navigate") {
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return (await cache.match(req)) || (await cache.match("/")) || Response.error();
        }
      }

      /* Everything else — hashed JS/CSS chunks, the font, the icons — is
         immutable, so serve from cache and refresh in the background. */
      const hit = await cache.match(req);
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      return hit || (await fresh) || Response.error();
    })(),
  );
});
