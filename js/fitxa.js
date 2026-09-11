/* ============================================================
   js/fitxa.js — fitxa d'una exposició (?edition=…&id=…), com a
   pàgina pròpia: és el fallback real i el punt d'entrada per a
   enllaç directe / compartir (les altres pantalles l'obren com a
   modal amb el mateix contingut, construït per
   ui.js#buildFitxaCard — vegeu aprop.js/explora.js/ruta.js).
   Script clàssic + import() dinàmic (vegeu aprop.js).
   ============================================================ */
(function () {
  let mods = null;

  async function init() {
    const container = document.getElementById("voff-fitxa-content");
    if (!container) return;

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

    const badgeEl = document.getElementById("voff-route-badge");
    const updateRouteBadge = () => {
      if (!badgeEl) return;
      const n = mods.state.getRoute().length;
      badgeEl.hidden = n === 0;
      badgeEl.textContent = String(n);
    };
    updateRouteBadge();

    const params = new URLSearchParams(location.search);
    const editionId = params.get("edition");
    const id = params.get("id");

    try {
      const { catalog } = await mods.data.loadCatalog();
      const exh = catalog.exhibitions.find((e) => e.editionId === editionId && e.id === id);
      if (!exh) {
        container.replaceChildren(mods.ui.emptyState("No s'ha trobat aquesta exposició al catàleg.", "fa-solid fa-circle-question"));
        return;
      }
      document.title = `${exh.titleOriginal} · Visa+OFF Perpinyà`;
      container.replaceChildren(mods.ui.buildFitxaCard(exh, mods, { onRouteChange: updateRouteBadge }));
    } catch (err) {
      container.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg.", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
