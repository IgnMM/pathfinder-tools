const CACHE_NAME = "pathfinder-paladins-folders-v8";
const ASSETS = [
  "./","./index.html",
  "./gabriel/","./gabriel/index.html","./gabriel/damage.html","./gabriel/spells.html","./gabriel/manifest.webmanifest","./gabriel/icon-192.png","./gabriel/icon-512.png",
  "./kenneth/","./kenneth/index.html","./kenneth/damage.html","./kenneth/spells.html","./kenneth/manifest.webmanifest","./kenneth/icon-192.png","./kenneth/icon-512.png",
  "./uran/","./uran/index.html","./uran/manifest.webmanifest","./uran/icon-192.png","./uran/icon-512.png",
  "./calc/","./calc/index.html","./calc/manifest.webmanifest","./calc/icon-192.png","./calc/icon-512.png"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const r = event.request;
  const html = r.mode === "navigate" || r.destination === "document" || r.url.endsWith(".html") || r.url.endsWith("/");
  if (html) {
    event.respondWith(fetch(r, {cache:"no-store"}).then(res => { const c=res.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(r,c)); return res; }).catch(()=>caches.match(r)));
  } else {
    event.respondWith(caches.match(r).then(cached => cached || fetch(r).then(res => { const c=res.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(r,c)); return res; })));
  }
});
