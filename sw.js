/* Andor Archive — cache-first with background refresh */
const CACHE = "andor-archive-v2";
const ASSETS = [
  "./", "index.html", "sounds.js", "soundlab.html", "fonts/fonts.css",
  "fonts/BarlowCondensed-500.woff2", "fonts/BarlowCondensed-600.woff2", "fonts/BarlowCondensed-700.woff2",
  "fonts/IBMPlexMono-400.woff2", "fonts/IBMPlexMono-500.woff2", "fonts/IBMPlexMono-600.woff2",
  "fonts/Spectral-300.woff2", "fonts/Spectral-300-italic.woff2",
  "fonts/Spectral-400.woff2", "fonts/Spectral-400-italic.woff2", "fonts/Spectral-600.woff2"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
