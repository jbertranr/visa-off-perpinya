/* ============================================================
   Visa+OFF Perpinyà — service worker
   Millora progressiva (encàrrec § 10): després d'una primera
   càrrega correcta, l'aplicació (shell + catàleg + preferits/ruta,
   que ja viuen a localStorage) ha de funcionar sense connexió.

   NO es cachegen tessel·les de mapa (OSM) de manera indiscriminada
   — els servidors públics d'OpenStreetMap no ho permeten (norma
   web-vanilla / encàrrec § 10). El mapa simplement no funcionarà
   sense connexió; la resta de l'app, sí.
   ============================================================ */

// IMPORTANT: puja aquest número cada vegada que es toqui sw.js O es vulgui
// forçar que tothom rebi l'última versió del shell de seguida — un
// CACHE_NAME que no canvia mai fa que el navegador no detecti que hi ha
// service worker nou per instal·lar, i la gent es queda amb HTML/CSS/JS
// vells indefinidament encara que el lloc s'actualitzi. Bug real trobat
// i corregit el 2026-09-11.
const CACHE_NAME = "voff-shell-v2";

const SHELL_FILES = [
  "./",
  "index.html",
  "explora.html",
  "ruta.html",
  "mapa.html",
  "fitxa.html",
  "manifest.json",
  "js/config.js",
  "js/aprop.js",
  "js/explora.js",
  "js/ruta.js",
  "js/mapa.js",
  "js/fitxa.js",
  "js/modules/storage.js",
  "js/modules/data.js",
  "js/modules/opening.js",
  "js/modules/geo.js",
  "js/modules/state.js",
  "js/modules/ui.js",
  "assets/css/tokens.css",
  "assets/css/skins/skin-neutra.css",
  "assets/css/base.css",
  "assets/css/layout.css",
  "assets/css/router.js",
  "assets/css/components/card.css",
  "assets/css/components/badge.css",
  "assets/css/components/status.css",
  "assets/css/components/button.css",
  "assets/css/components/empty.css",
  "assets/css/components/spinner.css",
  "assets/css/components/input.css",
  "assets/css/components/modal.css",
  "assets/css/components/modal.js",
  "assets/css/components/tabbar.css",
  "assets/css/components/tabbar.js",
  "assets/css/app.css",
  "assets/vendor/leaflet1.9.3/leaflet.css",
  "assets/vendor/leaflet1.9.3/leaflet.js",
  "assets/fontawesome/css/all.min.css",
  "assets/icons/icon.svg",
  "data/editions.json",
  "data/authors.json",
  "data/venues.json",
  "data/exhibitions.json",
  "data/coverage.json"
];

// Peticions que MAI s'han de cachejar (tessel·les de mapa, geocodificació…).
function isMapOrExternalRequest(url) {
  return /tile\.openstreetmap\.org|nominatim\.openstreetmap\.org|unpkg\.com|google\.com\/maps/.test(url);
}

// Codi propi (HTML/CSS/JS de l'app, en desenvolupament actiu): xarxa
// primer, perquè els canvis es vegin de seguida — la memòria cau només
// és la xarxa de seguretat per quan no hi ha connexió. Els fitxers de
// tercers vendoritzats (Font Awesome, Leaflet) i les imatges de les
// exposicions pràcticament no canvien un cop publicats: cau primer,
// estalvia dades i van més ràpid.
function isAppCode(url) {
  return /\.(html|css|js)(\?|$)/.test(url) && !/\/(vendor|fontawesome)\//.test(url);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (isMapOrExternalRequest(request.url)) return; // deixa passar sense tocar la memòria cau

  const isDataFile = request.url.includes("/data/");

  if (isDataFile || isAppCode(request.url)) {
    // Xarxa primer (dades i codi propi sempre frescos quan hi ha
    // connexió); si falla, la còpia desada — així funciona sense
    // connexió sense quedar-se mai amb una versió vella pel mig.
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Fitxers de tercers vendoritzats i imatges: memòria cau primer.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
