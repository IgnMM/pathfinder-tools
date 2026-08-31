const CACHE_NAME = "pathfinder-paladins-folders-v119";
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
  "./hunter/","./hunter/index.html","./hunter/manifest.webmanifest","./hunter/icon-192.png","./hunter/icon-512.png",
  "./witch/","./witch/index.html","./witch/manifest.webmanifest","./witch/icon-192.png","./witch/icon-512.png",
  "./antipaladin/","./antipaladin/index.html","./antipaladin/manifest.webmanifest","./antipaladin/icon-192.png","./antipaladin/icon-512.png",
  "./skald/","./skald/index.html","./skald/manifest.webmanifest","./skald/icon-192.png","./skald/icon-512.png",
  "./investigator/","./investigator/index.html","./investigator/manifest.webmanifest","./investigator/icon-192.png","./investigator/icon-512.png",
  "./warpriest/","./warpriest/index.html","./warpriest/manifest.webmanifest","./warpriest/icon-192.png","./warpriest/icon-512.png",
  "./inquisitor/","./inquisitor/index.html","./inquisitor/manifest.webmanifest","./inquisitor/icon-192.png","./inquisitor/icon-512.png",
  "./magus/","./magus/index.html","./magus/manifest.webmanifest","./magus/icon-192.png","./magus/icon-512.png",
  "./mesmerist/","./mesmerist/index.html","./mesmerist/manifest.webmanifest","./mesmerist/icon-192.png","./mesmerist/icon-512.png",
  "./spiritualist/","./spiritualist/index.html","./spiritualist/manifest.webmanifest","./spiritualist/icon-192.png","./spiritualist/icon-512.png",
  "./medium/","./medium/index.html","./medium/manifest.webmanifest","./medium/icon-192.png","./medium/icon-512.png",
  "./occultist/","./occultist/index.html","./occultist/manifest.webmanifest","./occultist/icon-192.png","./occultist/icon-512.png",
  "./psychic/","./psychic/index.html","./psychic/manifest.webmanifest","./psychic/icon-192.png","./psychic/icon-512.png",
  "./shaman/","./shaman/index.html","./shaman/manifest.webmanifest","./shaman/icon-192.png","./shaman/icon-512.png",
  "./bloodrager/","./bloodrager/index.html","./bloodrager/manifest.webmanifest","./bloodrager/icon-192.png","./bloodrager/icon-512.png",
  "./summoner/","./summoner/index.html","./summoner/manifest.webmanifest","./summoner/icon-192.png","./summoner/icon-512.png",
  "./oracle/","./oracle/index.html","./oracle/manifest.webmanifest","./oracle/icon-192.png","./oracle/icon-512.png",
  "./arcanist/","./arcanist/index.html","./arcanist/manifest.webmanifest","./arcanist/icon-192.png","./arcanist/icon-512.png",
  "./cleric-oracle-library/","./cleric-oracle-library/index.html","./cleric-oracle-library/manifest.webmanifest","./cleric-oracle-library/icon-192.png","./cleric-oracle-library/icon-512.png",
  "./wizard-sorcerer-library/","./wizard-sorcerer-library/index.html","./wizard-sorcerer-library/manifest.webmanifest","./wizard-sorcerer-library/icon-192.png","./wizard-sorcerer-library/icon-512.png",
  "./bard-library/","./bard-library/index.html","./bard-library/manifest.webmanifest","./bard-library/icon-192.png","./bard-library/icon-512.png",
  "./witch-library/","./witch-library/index.html","./witch-library/manifest.webmanifest","./witch-library/icon-192.png","./witch-library/icon-512.png",
  "./druid-library/","./druid-library/index.html","./druid-library/manifest.webmanifest","./druid-library/icon-192.png","./druid-library/icon-512.png",
  "./ranger-library/","./ranger-library/index.html","./ranger-library/manifest.webmanifest","./ranger-library/icon-192.png","./ranger-library/icon-512.png",
  "./paladin-library/","./paladin-library/index.html","./paladin-library/manifest.webmanifest","./paladin-library/icon-192.png","./paladin-library/icon-512.png",
  "./hunter-library/","./hunter-library/index.html","./hunter-library/manifest.webmanifest","./hunter-library/icon-192.png","./hunter-library/icon-512.png",
  "./antipaladin-library/","./antipaladin-library/index.html","./antipaladin-library/manifest.webmanifest","./antipaladin-library/icon-192.png","./antipaladin-library/icon-512.png",
  "./alchemist-library/","./alchemist-library/index.html","./alchemist-library/manifest.webmanifest","./alchemist-library/icon-192.png","./alchemist-library/icon-512.png",
  "./skald-library/","./skald-library/index.html","./skald-library/manifest.webmanifest","./skald-library/icon-192.png","./skald-library/icon-512.png",
  "./investigator-library/","./investigator-library/index.html","./investigator-library/manifest.webmanifest","./investigator-library/icon-192.png","./investigator-library/icon-512.png",
  "./warpriest-library/","./warpriest-library/index.html","./warpriest-library/manifest.webmanifest","./warpriest-library/icon-192.png","./warpriest-library/icon-512.png",
  "./inquisitor-library/","./inquisitor-library/index.html","./inquisitor-library/manifest.webmanifest","./inquisitor-library/icon-192.png","./inquisitor-library/icon-512.png",
  "./magus-library/","./magus-library/index.html","./magus-library/manifest.webmanifest","./magus-library/icon-192.png","./magus-library/icon-512.png",
  "./mesmerist-library/","./mesmerist-library/index.html","./mesmerist-library/manifest.webmanifest","./mesmerist-library/icon-192.png","./mesmerist-library/icon-512.png",
  "./spiritualist-library/","./spiritualist-library/index.html","./spiritualist-library/manifest.webmanifest","./spiritualist-library/icon-192.png","./spiritualist-library/icon-512.png",
  "./medium-library/","./medium-library/index.html","./medium-library/manifest.webmanifest","./medium-library/icon-192.png","./medium-library/icon-512.png",
  "./occultist-library/","./occultist-library/index.html","./occultist-library/manifest.webmanifest","./occultist-library/icon-192.png","./occultist-library/icon-512.png",
  "./psychic-library/","./psychic-library/index.html","./psychic-library/manifest.webmanifest","./psychic-library/icon-192.png","./psychic-library/icon-512.png",
  "./shaman-library/","./shaman-library/index.html","./shaman-library/manifest.webmanifest","./shaman-library/icon-192.png","./shaman-library/icon-512.png",
  "./bloodrager-library/","./bloodrager-library/index.html","./bloodrager-library/manifest.webmanifest","./bloodrager-library/icon-192.png","./bloodrager-library/icon-512.png",
  "./summoner-library/","./summoner-library/index.html","./summoner-library/manifest.webmanifest","./summoner-library/icon-192.png","./summoner-library/icon-512.png",
  "./calc/","./calc/index.html","./calc/manifest.webmanifest","./calc/icon-192.png","./calc/icon-512.png",
  "./companion/","./companion/index.html","./companion/manifest.webmanifest","./companion/icon-192.png","./companion/icon-512.png"
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
