const CACHE_NAME = "pathfinder-paladins-folders-v196";
// SW-CACHE-001: precache only the app shell needed to open the Sanctum offline --
// every other tool's page, manifest, icons and per-page assets are cached on demand
// by the fetch handler below (cache-first for subresources, network-first for HTML)
// the first time a visitor actually opens that tool. Precaching all ~380 site files
// at install time made first install slow and wasteful for anyone who only ever uses
// one or two classes; on-demand caching still makes every visited tool fully
// available offline afterward, it just no longer front-loads the ones nobody opened.
const ASSETS = [
  "./","./index.html","./hub.html","./sanctum.html","./manifest.webmanifest",
  "./icon-192.png","./icon-512.png","./favicon-32.png","./favicon-48.png",
  "./assets/gate-bg.jpg","./assets/valid-sources.js","./assets/class-visuals.js","./assets/class-visuals.css"
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
