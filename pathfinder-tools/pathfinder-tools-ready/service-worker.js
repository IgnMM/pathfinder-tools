const CACHE_NAME = "pathfinder-paladins-folders-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./gabriel/",
  "./gabriel/index.html",
  "./gabriel/damage.html",
  "./gabriel/spells.html",
  "./gabriel/manifest.webmanifest",
  "./gabriel/icon-192.png",
  "./gabriel/icon-512.png",
  "./kenneth/",
  "./kenneth/index.html",
  "./kenneth/damage.html",
  "./kenneth/spells.html",
  "./kenneth/manifest.webmanifest",
  "./kenneth/icon-192.png",
  "./kenneth/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const request = event.request;
  const isHTML = request.mode === "navigate" || request.destination === "document" ||
                 request.url.endsWith(".html") || request.url.endsWith("/");

  if (isHTML) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});
