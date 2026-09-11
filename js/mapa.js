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

  function renderMarkers(catalog) {
    markers.forEach((m) => map.removeLayer(m.marker));
    markers = [];

    let exhibitions = catalog.exhibitions;
    if (circuitFilter !== "tots") exhibitions = exhibitions.filter((e) => e.circuit === circuitFilter);

    const groups = mods.data.groupByVenue(exhibitions).filter((g) => g.venue && g.venue.coordinates);

    for (const group of groups) {
      const marker = L.marker([group.venue.coordinates.lat, group.venue.coordinates.lng], {
        title: `${group.venue.name} (${group.exhibitions.length})`
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

    map = L.map(mapEl, { zoomControl: true });
    map.setView([window.APP.perpignanCenterRef.lat, window.APP.perpignanCenterRef.lng], 15);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
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
