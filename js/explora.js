/* ============================================================
   js/explora.js — pantalla "Explora": cerca + filtres sobre tot
   el catàleg. Script clàssic + import() dinàmic (vegeu aprop.js).
   ============================================================ */
(function () {
  let mods = null;
  let catalog = null;
  let filters = { circuit: "tots", preferits: false, pendents: false, venueId: "" };

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

  function render() {
    const list = document.getElementById("voff-explora-list");
    const countEl = document.getElementById("voff-results-count");
    if (!list || !catalog) return;
    list.replaceChildren();

    const parisWallClock = parisWallClockNow();
    const prefs = mods.state.getPrefs();

    let results = catalog.exhibitions.filter((exh) => {
      if (filters.circuit !== "tots" && exh.circuit !== filters.circuit) return false;
      if (filters.venueId && exh.venueId !== filters.venueId) return false;
      if (filters.preferits && !mods.state.isFavorite(exh)) return false;
      if (filters.pendents && mods.state.isVisited(exh)) return false;
      return true;
    });

    results.sort((a, b) => a.titleOriginal.localeCompare(b.titleOriginal, "ca"));

    countEl.textContent = `${results.length} ${results.length === 1 ? "exposició" : "exposicions"}`;

    if (results.length === 0) {
      list.append(mods.ui.emptyState("Cap exposició coincideix amb la cerca o els filtres.", "fa-solid fa-magnifying-glass"));
      return;
    }

    for (const exh of results) {
      list.append(mods.ui.renderExhibitionCard(exh, {
      parisWallClock,
      closingSoonMinutes: prefs.closingSoonMinutes,
      onOpen: openFitxa,
      onToggleFavorite: () => { if (filters.preferits) render(); }
    }));
    }
  }

  function wireFilters() {
    document.querySelectorAll("[data-circuit-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        filters.circuit = btn.getAttribute("data-circuit-filter");
        document.querySelectorAll("[data-circuit-filter]").forEach((b) => b.classList.toggle("ds-button--ghost", b !== btn));
        render();
      });
    });
    const toggle = (id, key) => {
      const btn = document.getElementById(id);
      btn.addEventListener("click", () => {
        filters[key] = !filters[key];
        btn.classList.toggle("ds-button--ghost", !filters[key]);
        render();
      });
    };
    toggle("btn-filter-preferits", "preferits");
    toggle("btn-filter-pendents", "pendents");
    const venueSelect = document.getElementById("voff-filter-venue");
    venueSelect.addEventListener("change", () => {
      filters.venueId = venueSelect.value;
      render();
    });
  }

  function populateVenueFilter() {
    const select = document.getElementById("voff-filter-venue");
    if (!select || !catalog) return;
    // Només seus que realment tenen alguna exposició al catàleg, ordenades
    // alfabèticament, amb el recompte — no calen les 19 si no totes hi surten.
    const counts = new Map();
    for (const exh of catalog.exhibitions) {
      if (!exh.venueId) continue;
      counts.set(exh.venueId, (counts.get(exh.venueId) || 0) + 1);
    }
    const venues = catalog.venues
      .filter((v) => counts.has(v.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ca"));
    for (const v of venues) {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = `${v.name} (${counts.get(v.id)})`;
      select.append(opt);
    }
  }

  async function init() {
    const list = document.getElementById("voff-explora-list");
    if (!list) return;

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

    updateRouteBadge();
    wireFilters();

    const params = new URLSearchParams(location.search);

    try {
      const { catalog: c } = await mods.data.loadCatalog();
      catalog = c;
      populateVenueFilter();
      const venueParam = params.get("venue");
      if (venueParam) {
        document.getElementById("voff-filter-venue").value = venueParam;
        filters.venueId = venueParam;
      }
      render();
    } catch (err) {
      list.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg.", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
