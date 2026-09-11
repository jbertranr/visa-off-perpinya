/* ============================================================
   js/aprop.js — pantalla "A prop" (vista inicial)

   Script CLÀSSIC (no type="module") a propòsit: router.js recrea
   els <script src> en la navegació sense recàrrega però no en
   conserva l'atribut type, així que un <script type="module">
   trencaria en tornar a aquesta pantalla. En canvi, import()
   dinàmic funciona igual des d'un script clàssic — per això la
   lògica real viu en mòduls carregats amb import() dins d'aquesta
   IIFE, que només s'executa una vegada (el "ds:navigated" fa la
   resta, com mana el contracte de router.js).
   ============================================================ */
(function () {
  let mods = null;
  let state = { catalog: null, userLocation: null, circuitFilter: "tots", onlyFavorites: false, onlyPending: false };

  function parisWallClockNow() {
    const mode = mods.state.getPlanMode();
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      return mods.opening.planAsParisWallClock(dt.date, dt.time);
    }
    return mods.opening.nowAsParisWallClock();
  }

  function updateHeaderDate() {
    const mode = mods.state.getPlanMode();
    const label = document.getElementById("voff-header-date");
    if (!label) return;
    if (mode === "planificar") {
      const dt = mods.state.getPlanDateTime();
      label.textContent = `Planificant · ${dt.date} ${dt.time}`;
    } else {
      const wc = mods.opening.nowAsParisWallClock();
      label.textContent = `Ara · ${wc.dateStr}, ${String(Math.floor(wc.minutesOfDay / 60)).padStart(2, "0")}:${String(wc.minutesOfDay % 60).padStart(2, "0")} (hora de Perpinyà)`;
    }
  }

  function updateRouteBadge() {
    const badge = document.getElementById("voff-route-badge");
    if (!badge) return;
    const n = mods.state.getRoute().length;
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }

  function openFitxa(exh) {
    const body = document.getElementById("dlg-fitxa-body");
    if (!body) {
      location.href = `fitxa.html?edition=${encodeURIComponent(exh.editionId)}&id=${encodeURIComponent(exh.id)}`;
      return;
    }
    body.replaceChildren(mods.ui.buildFitxaCard(exh, mods, { onRouteChange: updateRouteBadge }));
    document.getElementById("dlg-fitxa-title").textContent = exh.titleOriginal;
    if (window.DSModal) window.DSModal.obre("dlg-fitxa");
    else document.getElementById("dlg-fitxa").showModal();
    history.replaceState(null, "", `#exh=${encodeURIComponent(exh.editionId)}::${encodeURIComponent(exh.id)}`);
  }

  let minimapLoaded = false;
  function loadLeafletOnce() {
    if (window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "assets/vendor/leaflet1.9.3/leaflet.css";
      document.head.append(link);
      const script = document.createElement("script");
      script.src = "assets/vendor/leaflet1.9.3/leaflet.js";
      script.addEventListener("load", resolve);
      script.addEventListener("error", reject);
      document.head.append(script);
    });
  }

  async function wireMinimap() {
    const details = document.querySelector(".voff-minimap");
    if (!details) return;
    details.addEventListener("toggle", async () => {
      if (!details.open || minimapLoaded) return;
      minimapLoaded = true;
      try {
        await loadLeafletOnce();
        const frame = document.getElementById("voff-minimap-frame");
        const map = L.map(frame).setView([window.APP.perpignanCenterRef.lat, window.APP.perpignanCenterRef.lng], 15);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        if (state.catalog) {
          const groups = mods.data.groupByVenue(state.catalog.exhibitions).filter((g) => g.venue && g.venue.coordinates);
          for (const g of groups) {
            L.marker([g.venue.coordinates.lat, g.venue.coordinates.lng]).addTo(map).bindPopup(g.venue.name);
          }
        }
        setTimeout(() => map.invalidateSize(), 50);
      } catch (err) {
        console.warn("[aprop] no s'ha pogut carregar el minimapa", err);
      }
    });
  }

  function render() {
    const container = document.getElementById("voff-aprop-list");
    if (!container || !state.catalog) return;
    container.replaceChildren();

    let exhibitions = state.catalog.exhibitions;
    if (state.circuitFilter !== "tots") {
      exhibitions = exhibitions.filter((e) => e.circuit === state.circuitFilter);
    }
    if (state.onlyFavorites) exhibitions = exhibitions.filter((e) => mods.state.isFavorite(e));
    if (state.onlyPending) exhibitions = exhibitions.filter((e) => !mods.state.isVisited(e));

    if (exhibitions.length === 0) {
      container.append(mods.ui.emptyState("No hi ha exposicions per a aquest filtre.", "fa-solid fa-filter-circle-xmark"));
      return;
    }

    const groups = mods.data.groupByVenue(exhibitions);
    const parisWallClock = parisWallClockNow();
    const prefs = mods.state.getPrefs();

    const withDistance = groups.map((g) => {
      let km = null;
      if (state.userLocation && g.venue && g.venue.coordinates) {
        km = mods.geo.straightLineKm(state.userLocation, g.venue.coordinates);
      }
      return { g, km };
    });
    withDistance.sort((a, b) => {
      if (a.km == null && b.km == null) {
        const an = a.g.venue ? a.g.venue.name : "";
        const bn = b.g.venue ? b.g.venue.name : "";
        return an.localeCompare(bn, "ca");
      }
      if (a.km == null) return 1;
      if (b.km == null) return -1;
      return a.km - b.km;
    });

    for (const { g, km } of withDistance) {
      const distanceLabel = g.venue ? (km != null ? mods.geo.formatDistance(km) : null) : null;
      container.append(mods.ui.renderVenueGroup(g, {
        parisWallClock,
        closingSoonMinutes: prefs.closingSoonMinutes,
        onOpen: openFitxa,
        onToggleFavorite: () => { if (state.onlyFavorites) render(); },
        distanceLabel
      }));
    }
  }

  function wireCircuitFilters() {
    document.querySelectorAll("[data-circuit-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.circuitFilter = btn.getAttribute("data-circuit-filter");
        document.querySelectorAll("[data-circuit-filter]").forEach((b) => b.classList.toggle("ds-button--ghost", b !== btn));
        render();
      });
    });
  }

  function wireGeolocation() {
    const btn = document.getElementById("btn-use-location");
    const statusEl = document.getElementById("voff-geo-status");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.innerHTML = '<span class="ds-spinner ds-spinner--sm" aria-hidden="true"></span> Localitzant…';
      try {
        const loc = await mods.geo.requestLocation();
        state.userLocation = { lat: loc.lat, lng: loc.lng };
        statusEl.textContent = loc.accuracyM > 100
          ? `Ubicació obtinguda (precisió baixa, ±${Math.round(loc.accuracyM)} m). Les distàncies són orientatives.`
          : "Ubicació activa — distàncies en línia recta des d'on ets.";
        render();
      } catch (err) {
        statusEl.textContent = `No s'ha pogut obtenir la ubicació: ${err.messageCa}`;
      } finally {
        btn.disabled = false;
        btn.textContent = "Torna-ho a provar";
      }
    });
  }

  function wirePlanDialog() {
    const dlg = document.getElementById("dlg-plan");
    const openBtn = document.getElementById("btn-open-plan");
    const btnAra = document.getElementById("btn-mode-ara");
    const btnPlan = document.getElementById("btn-mode-planificar");
    const fields = document.getElementById("voff-plan-fields");
    const dateInput = document.getElementById("voff-plan-date");
    const timeInput = document.getElementById("voff-plan-time");
    if (!dlg || !openBtn) return;

    const dt = mods.state.getPlanDateTime();
    dateInput.value = dt.date;
    timeInput.value = dt.time;

    function reflectMode() {
      const mode = mods.state.getPlanMode();
      btnAra.classList.toggle("ds-button--ghost", mode !== "ara");
      btnPlan.classList.toggle("ds-button--ghost", mode !== "planificar");
      fields.hidden = mode !== "planificar";
      updateHeaderDate();
    }

    openBtn.addEventListener("click", () => {
      if (window.DSModal) window.DSModal.obre("dlg-plan");
      else dlg.showModal();
    });
    btnAra.addEventListener("click", () => { mods.state.setPlanMode("ara"); reflectMode(); render(); });
    btnPlan.addEventListener("click", () => { mods.state.setPlanMode("planificar"); reflectMode(); render(); });
    dateInput.addEventListener("change", () => { mods.state.setPlanDateTime({ ...mods.state.getPlanDateTime(), date: dateInput.value }); reflectMode(); render(); });
    timeInput.addEventListener("change", () => { mods.state.setPlanDateTime({ ...mods.state.getPlanDateTime(), time: timeInput.value }); reflectMode(); render(); });

    reflectMode();
  }

  function wireMoreFilters() {
    const btn = document.getElementById("btn-more-filters");
    const dlg = document.getElementById("dlg-more-filters");
    const favChk = document.getElementById("voff-filter-preferits");
    const pendChk = document.getElementById("voff-filter-pendents");
    if (!btn || !dlg) return;
    btn.addEventListener("click", () => {
      if (window.DSModal) window.DSModal.obre("dlg-more-filters");
      else dlg.showModal();
    });
    favChk.addEventListener("change", () => { state.onlyFavorites = favChk.checked; render(); });
    pendChk.addEventListener("change", () => { state.onlyPending = pendChk.checked; render(); });
  }

  async function init() {
    const container = document.getElementById("voff-aprop-list");
    if (!container) return; // pantalla incorrecta (contracte router.js)

    if (!mods) {
      const [storage, opening, geo, data, stateMod, ui] = await Promise.all([
        import("./modules/storage.js"),
        import("./modules/opening.js"),
        import("./modules/geo.js"),
        import("./modules/data.js"),
        import("./modules/state.js"),
        import("./modules/ui.js")
      ]);
      mods = { storage, opening, geo, data, state: stateMod, ui };
    }

    updateHeaderDate();
    updateRouteBadge();
    wireCircuitFilters();
    wireGeolocation();
    wirePlanDialog();
    wireMinimap();
    wireMoreFilters();

    try {
      const { catalog, fromCache } = await mods.data.loadCatalog();
      state.catalog = catalog;
      if (fromCache) {
        const notice = document.createElement("p");
        notice.className = "ds-text ds-text--sm ds-text--muted";
        notice.textContent = "Sense connexió: mostrant l'última còpia desada del catàleg.";
        container.before(notice);
      }
      render();
    } catch (err) {
      container.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg (sense connexió i sense còpia desada).", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
