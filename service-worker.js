const CACHE_NAME = "pathfinder-paladins-folders-v52";
const ASSETS = [
  "./","./index.html","./icon-192.png","./icon-512.png","./favicon-32.png","./favicon-48.png",
  "./assets/gate-bg.jpg","./assets/valid-sources.js","./assets/casting-time.js",
  "./assets/spell-crossref.js","./assets/spell-master-index.json","./assets/spell-crossrefs.json","./assets/conditions.js","./assets/domains.js","./assets/oaths.js",
  "./character/","./character/index.html","./character/view.html","./character/manifest.webmanifest","./character/icon-192.png","./character/icon-512.png",
  "./gabriel/","./gabriel/index.html","./gabriel/damage.html","./gabriel/spells.html","./gabriel/manifest.webmanifest","./gabriel/icon-192.png","./gabriel/icon-512.png",
  "./kenneth/","./kenneth/index.html","./kenneth/damage.html","./kenneth/spells.html","./kenneth/manifest.webmanifest","./kenneth/icon-192.png","./kenneth/icon-512.png",
  "./uran/","./uran/index.html","./uran/manifest.webmanifest","./uran/icon-192.png","./uran/icon-512.png",
  "./cleric/","./cleric/index.html","./cleric/manifest.webmanifest","./cleric/icon-192.png","./cleric/icon-512.png",
  "./paladin/","./paladin/index.html","./paladin/manifest.webmanifest","./paladin/icon-192.png","./paladin/icon-512.png",
  "./druid/","./druid/index.html","./druid/manifest.webmanifest","./druid/icon-192.png","./druid/icon-512.png",
  "./alchemist/","./alchemist/index.html","./alchemist/manifest.webmanifest","./alchemist/icon-192.png","./alchemist/icon-512.png",
  "./bard/","./bard/index.html","./bard/manifest.webmanifest","./bard/icon-192.png","./bard/icon-512.png",
  "./sorcerer/","./sorcerer/index.html","./sorcerer/manifest.webmanifest","./sorcerer/icon-192.png","./sorcerer/icon-512.png",
  "./wizard/","./wizard/index.html","./wizard/manifest.webmanifest","./wizard/icon-192.png","./wizard/icon-512.png",
  "./ranger/","./ranger/index.html","./ranger/manifest.webmanifest","./ranger/icon-192.png","./ranger/icon-512.png",
  "./cleric-oracle-library/","./cleric-oracle-library/index.html","./cleric-oracle-library/manifest.webmanifest","./cleric-oracle-library/icon-192.png","./cleric-oracle-library/icon-512.png",
  "./wizard-sorcerer-library/","./wizard-sorcerer-library/index.html","./wizard-sorcerer-library/manifest.webmanifest","./wizard-sorcerer-library/icon-192.png","./wizard-sorcerer-library/icon-512.png",
  "./bard-library/","./bard-library/index.html","./bard-library/manifest.webmanifest","./bard-library/icon-192.png","./bard-library/icon-512.png",
  "./witch-library/","./witch-library/index.html","./witch-library/manifest.webmanifest","./witch-library/icon-192.png","./witch-library/icon-512.png",
  "./druid-library/","./druid-library/index.html","./druid-library/manifest.webmanifest","./druid-library/icon-192.png","./druid-library/icon-512.png",
  "./ranger-library/","./ranger-library/index.html","./ranger-library/manifest.webmanifest","./ranger-library/icon-192.png","./ranger-library/icon-512.png",
  "./antipaladin-library/","./antipaladin-library/index.html","./antipaladin-library/manifest.webmanifest","./antipaladin-library/icon-192.png","./antipaladin-library/icon-512.png",
  "./alchemist-library/","./alchemist-library/index.html","./alchemist-library/manifest.webmanifest","./alchemist-library/icon-192.png","./alchemist-library/icon-512.png",
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
