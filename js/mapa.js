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

  function popupContent(group) {
    const wrap = document.createElement("div");
    const title = document.createElement("p");
    title.style.fontWeight = "700";
    title.style.margin = "0 0 4px";
    title.textContent = group.venue.name;
    wrap.append(title);

    const meta = document.createElement("p");
    meta.style.margin = "0 0 8px";
    meta.style.fontSize = "0.82rem";
    const bits = [`${group.exhibitions.length} ${group.exhibitions.length === 1 ? "exposició" : "exposicions"}`];
    if (group.venue.coordinateStatus === "approximate-street-nominatim") bits.push("ubicació aproximada (carrer, no portal)");
    meta.textContent = bits.join(" · ");
    wrap.append(meta);

    const btn = document.createElement("a");
    btn.href = `explora.html?venue=${encodeURIComponent(group.venueId)}`;
    btn.className = "ds-button ds-button--sm";
    btn.textContent = "Veure les exposicions d'aquest lloc";
    wrap.append(btn);
    return wrap;
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
      marker.bindPopup(popupContent(group));
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
    if (map) return; // ja inicialitzat — no en calen dos

    if (!mods) {
      const [data] = await Promise.all([import("./modules/data.js")]);
      mods = { data };
    }

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
