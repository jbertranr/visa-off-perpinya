/* ============================================================
   js/mapa.js — pantalla "Mapa" (secundària). Un marcador per
   emplaçament (no per exposició), només emplaçaments amb
   coordenades geocodificades. Leaflet vendoritzat (1.9.3, fixat),
   tessel·les OSM carregades sota demanda (només en obrir aquesta
   pantalla) — mai precarregades en massa.
   Script clàssic + import() dinàmic (vegeu aprop.js).
   ============================================================ */
(function () {
  let mods = null;
  let map = null;
  let markers = []; // { marker, venueGroup }
  let circuitFilter = "tots";
  let youAreHereMarker = null;
  let youAreHereCircle = null;

  function parisWallClockNow() {
    const mode = mods.state.getPlanMode();
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      return mods.opening.planAsParisWallClock(dt.date, dt.time);
    }
    return mods.opening.nowAsParisWallClock();
  }

  function updateRouteBadge() {
    const badge = document.getElementById("voff-route-badge");
    if (!badge) return;
    const n = mods.state.getRoute().length;
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }

  // Fitxa dins d'un modal apilat sobre el del llistat del lloc — mateix
  // patró que aprop.js/explora.js/ruta.js.
  function openFitxa(exh) {
    const body = document.getElementById("dlg-fitxa-body");
    body.replaceChildren(mods.ui.buildFitxaCard(exh, mods, { onRouteChange: updateRouteBadge }));
    document.getElementById("dlg-fitxa-title").textContent = exh.titleOriginal;
    if (window.DSModal) window.DSModal.obre("dlg-fitxa");
    else document.getElementById("dlg-fitxa").showModal();
    history.replaceState(null, "", `#exh=${encodeURIComponent(exh.editionId)}::${encodeURIComponent(exh.id)}`);
  }

  // En clicar un marcador: modal amb la llista d'exposicions d'aquell
  // lloc (en lloc del popup nadiu de Leaflet amb un enllaç fora de la
  // pantalla — es demana que "en demanar les exposicions d'un lloc surti
  // una finestra modal").
  function openVenueModal(group) {
    document.getElementById("dlg-venue-title").textContent = group.venue.name;
    const body = document.getElementById("dlg-venue-body");
    body.replaceChildren();

    const meta = document.createElement("p");
    meta.className = "ds-text ds-text--sm ds-text--muted";
    const bits = [`${group.exhibitions.length} ${group.exhibitions.length === 1 ? "exposició" : "exposicions"}`];
    if (group.venue.coordinateStatus === "approximate-street-nominatim") bits.push("ubicació aproximada (carrer, no portal)");
    meta.textContent = bits.join(" · ");
    body.append(meta);

    const parisWallClock = parisWallClockNow();
    const prefs = mods.state.getPrefs();
    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "var(--ds-space-2)";
    for (const exh of group.exhibitions) {
      list.append(mods.ui.renderExhibitionCard(exh, {
        parisWallClock,
        closingSoonMinutes: prefs.closingSoonMinutes,
        onOpen: openFitxa
      }));
    }
    body.append(list);

    if (window.DSModal) window.DSModal.obre("dlg-venue");
    else document.getElementById("dlg-venue").showModal();
  }

  // Icona d'un color diferent segons el circuit (com el badge de les
  // targetes: blau=Visa, taronja=OFF) — quan un lloc barreja exposicions
  // dels dos circuits, un color neutre propi ("mixed").
  function groupCircuit(group) {
    const circuits = new Set(group.exhibitions.map((e) => e.circuit));
    if (circuits.size === 1) return circuits.values().next().value;
    return "mixed";
  }

  function circuitIcon(circuit) {
    const cls = circuit === "VISA" ? "voff-map-marker--visa" : circuit === "OFF" ? "voff-map-marker--off" : "voff-map-marker--mixed";
    return L.divIcon({
      className: `voff-map-marker ${cls}`,
      html: '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>',
      iconSize: [30, 30],
      iconAnchor: [15, 29],
      popupAnchor: [0, -26]
    });
  }

  function renderMarkers(catalog) {
    markers.forEach((m) => map.removeLayer(m.marker));
    markers = [];

    let exhibitions = catalog.exhibitions;
    if (circuitFilter !== "tots") exhibitions = exhibitions.filter((e) => e.circuit === circuitFilter);

    const groups = mods.data.groupByVenue(exhibitions).filter((g) => g.venue && g.venue.coordinates);

    for (const group of groups) {
      const marker = L.marker([group.venue.coordinates.lat, group.venue.coordinates.lng], {
        title: `${group.venue.name} (${group.exhibitions.length})`,
        icon: circuitIcon(groupCircuit(group))
      });
      marker.on("click", () => openVenueModal(group));
      marker.addTo(map);
      markers.push({ marker, group });
    }

    if (groups.length && markers.length) {
      const bounds = L.latLngBounds(groups.map((g) => [g.venue.coordinates.lat, g.venue.coordinates.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  }

  function wireFilters(catalog) {
    document.querySelectorAll("[data-map-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        circuitFilter = btn.getAttribute("data-map-filter");
        document.querySelectorAll("[data-map-filter]").forEach((b) => b.classList.toggle("ds-button--ghost", b !== btn));
        renderMarkers(catalog);
      });
    });
  }

  // Ubicació sota demanda (mai a l'arrencada, mateix patró que aprop.js):
  // un punt blau al mapa + cercle de precisió, i centra/apropa el mapa
  // a la ubicació. Es pot tornar a clicar per actualitzar-la.
  function wireLocate() {
    const btn = document.getElementById("btn-map-locate");
    const statusEl = document.getElementById("voff-map-locate-status");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      statusEl.hidden = true;
      const icon = btn.querySelector("i");
      icon.className = "fa-solid fa-spinner fa-spin";
      try {
        const loc = await mods.geo.requestLocation();
        if (youAreHereMarker) map.removeLayer(youAreHereMarker);
        if (youAreHereCircle) map.removeLayer(youAreHereCircle);
        youAreHereMarker = L.marker([loc.lat, loc.lng], {
          icon: L.divIcon({ className: "voff-map-you-are-here", iconSize: [16, 16], iconAnchor: [8, 8] }),
          zIndexOffset: 1000,
          title: "La teva ubicació"
        }).addTo(map);
        youAreHereCircle = L.circle([loc.lat, loc.lng], {
          radius: loc.accuracyM, color: "#1857c4", weight: 1, fillOpacity: 0.08
        }).addTo(map);
        map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 15));
        if (loc.accuracyM > 100) {
          statusEl.textContent = `Precisió baixa (±${Math.round(loc.accuracyM)} m).`;
          statusEl.hidden = false;
        }
      } catch (err) {
        statusEl.textContent = `No s'ha pogut obtenir la ubicació: ${err.messageCa}`;
        statusEl.hidden = false;
      } finally {
        btn.disabled = false;
        icon.className = "fa-solid fa-location-crosshairs";
      }
    });
  }

  async function init() {
    const mapEl = document.getElementById("voff-map");
    if (!mapEl || typeof L === "undefined") return;
    // Guarda SÍNCRONA (abans de qualsevol await): quan router.js carrega
    // aquest script per primera vegada en una navegació, init() es crida
    // dues vegades quasi seguides (la pròpia comprovació de readyState al
    // final del fitxer + el 'ds:navigated' que arriba tot seguit). Amb
    // `if (map) return` només (assignat després de l'await de sota), les
    // dues crides passaven la comprovació abans que cap hagués acabat
    // d'inicialitzar Leaflet, i la segona feia petar "Map container is
    // already initialized." Marcar l'element mateix, de seguida, tanca
    // la finestra de carrera; com que a cada visita nova la router.js
    // importa un <div id="voff-map"> fresc, la marca es reinicia sola.
    if (mapEl.dataset.voffMapInit) return;
    mapEl.dataset.voffMapInit = "1";

    if (!mods) {
      const [opening, geo, data, stateMod, ui] = await Promise.all([
        import("./modules/opening.js"),
        import("./modules/geo.js"),
        import("./modules/data.js"),
        import("./modules/state.js"),
        import("./modules/ui.js")
      ]);
      mods = { opening, geo, data, state: stateMod, ui };
    }

    updateRouteBadge();
    wireLocate();

    map = L.map(mapEl, { zoomControl: true });
    map.setView([window.APP.perpignanCenterRef.lat, window.APP.perpignanCenterRef.lng], 15);

    // Nota: es va provar l'estil "Positron" de CARTO
    // (basemaps.cartocdn.com/light_all) com a alternativa més suau, però
    // ara exigeix clau d'API (retornava tessel·les amb marca d'aigua
    // "API KEY REQUIRED") i maps.wikimedia.org està restringit a llocs
    // de la Wikimedia (403). Es manté doncs tile.openstreetmap.org (únic
    // proveïdor OSM gratuït sense clau que funciona) i se suavitza amb
    // un filtre CSS (.voff-map-tiles-soft a mapa.html) en lloc de
    // canviar de proveïdor.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "voff-map-tiles-soft",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contribuïdors d\'OpenStreetMap</a>'
    }).addTo(map);

    try {
      const { catalog } = await mods.data.loadCatalog();
      wireFilters(catalog);
      renderMarkers(catalog);
    } catch (err) {
      console.error("[mapa] no s'ha pogut carregar el catàleg", err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
