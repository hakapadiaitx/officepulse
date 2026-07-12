const CACHE = "officepulse-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Always use network for API calls so data is fresh
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((res) => {
          if (res.ok && res.type !== "opaque") {
            caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          }
          return res;
        })
    )
  );
});
