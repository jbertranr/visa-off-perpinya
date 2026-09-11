/* ============================================================
   js/ruta.js — pantalla "Ruta". Script clàssic + import() dinàmic
   (vegeu aprop.js).
   ============================================================ */
(function () {
  let mods = null;
  let catalog = null;
  let userLocation = null;

  function exhByFullId(id) {
    const [editionId, exhId] = id.split("::");
    return catalog.exhibitions.find((e) => e.editionId === editionId && e.id === exhId);
  }

  function updateRouteBadge() {
    const badge = document.getElementById("voff-route-badge");
    if (!badge) return;
    const n = mods.state.getRoute().length;
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }

  function groupStops(routeIds) {
    const order = [];
    const byVenue = new Map();
    for (const id of routeIds) {
      const exh = exhByFullId(id);
      if (!exh) continue;
      const key = exh.venueId || `__pendent__${id}`;
      if (!byVenue.has(key)) {
        byVenue.set(key, { venueId: exh.venueId, venue: exh.venue, exhibitions: [] });
        order.push(key);
      }
      byVenue.get(key).exhibitions.push(exh);
    }
    return order.map((k) => byVenue.get(k));
  }

  function rebuildRouteFromStops(stops) {
    const flat = [];
    for (const stop of stops) for (const exh of stop.exhibitions) flat.push(mods.state.fullId(exh));
    mods.state.setRoute(flat);
  }

  function moveStop(stops, index, delta) {
    const target = index + delta;
    if (target < 0 || target >= stops.length) return stops;
    const copy = stops.slice();
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    return copy;
  }

  function proposeOrder(stops, start) {
    if (!start) return stops;
    const withCoords = stops.filter((s) => s.venue && s.venue.coordinates);
    const withoutCoords = stops.filter((s) => !(s.venue && s.venue.coordinates));
    const remaining = withCoords.slice();
    const ordered = [];
    let current = start;
    while (remaining.length) {
      remaining.sort((a, b) => mods.geo.straightLineKm(current, a.venue.coordinates) - mods.geo.straightLineKm(current, b.venue.coordinates));
      const next = remaining.shift();
      ordered.push(next);
      current = next.venue.coordinates;
    }
    return [...ordered, ...withoutCoords];
  }

  function render() {
    const container = document.getElementById("voff-route-stops");
    const summaryBox = document.getElementById("voff-route-summary");
    if (!container || !catalog) return;
    container.replaceChildren();

    const routeIds = mods.state.getRoute();
    if (routeIds.length === 0) {
      container.append(mods.ui.emptyState("Encara no has afegit cap exposició a la ruta. Fes-ho des de la seva fitxa.", "fa-solid fa-route"));
      summaryBox.hidden = true;
      return;
    }

    const stops = groupStops(routeIds);
    const minutesPerExh = parseInt(document.getElementById("voff-ruta-minuts").value, 10) || 15;
    const available = parseInt(document.getElementById("voff-ruta-disponible").value, 10) || null;

    const totalVisitMinutes = stops.reduce((sum, s) => sum + s.exhibitions.length * minutesPerExh, 0);
    const anyConflict = routeIds.some((id) => { const exh = exhByFullId(id); return exh && exh.venueStatus === "conflicting"; });

    summaryBox.hidden = false;
    summaryBox.replaceChildren();
    const p1 = document.createElement("p");
    p1.textContent = `${stops.length} seu${stops.length === 1 ? "" : "s"} · ${routeIds.length} ${routeIds.length === 1 ? "exposició" : "exposicions"} · ${totalVisitMinutes} min de visita estimats (editorial, ${minutesPerExh} min/exposició)`;
    summaryBox.append(p1);
    if (available && totalVisitMinutes > available) {
      const warn = document.createElement("p");
      warn.className = "ds-text ds-text--sm";
      warn.style.color = "var(--ds-color-danger)";
      warn.textContent = `⚠ El temps de visita estimat (${totalVisitMinutes} min) supera el temps disponible (${available} min). Marge estret.`;
      summaryBox.append(warn);
    }
    const p2 = document.createElement("p");
    p2.className = "ds-text ds-text--sm ds-text--muted";
    p2.textContent = "L'ordre és una proposta orientativa per proximitat, no la ruta matemàticament òptima; no garanteix arribar abans del tancament de cap seu.";
    summaryBox.append(p2);
    if (anyConflict) {
      const warnConflict = document.createElement("p");
      warnConflict.className = "ds-text ds-text--sm";
      warnConflict.style.color = "var(--ds-color-warning)";
      warnConflict.textContent = "⚠ La ruta inclou l'exposició de David Guttenfelder, amb emplaçament encara no resolt entre fonts — confirma-ho abans de sortir.";
      summaryBox.append(warnConflict);
    }

    stops.forEach((stop, index) => {
      const provisional = !stop.venue || !stop.venue.coordinates;
      const card = document.createElement("div");
      card.className = `voff-stop${provisional ? " is-provisional" : ""}`;

      const idx = document.createElement("span");
      idx.className = "voff-stop__index";
      idx.textContent = String(index + 1);
      card.append(idx);

      const body = document.createElement("div");
      body.className = "voff-stop__body";
      const venueTitle = document.createElement("p");
      venueTitle.className = "voff-stop__title";
      venueTitle.textContent = stop.venue ? stop.venue.name : "Emplaçament per confirmar";
      body.append(venueTitle);

      const meta = document.createElement("p");
      meta.className = "voff-stop__venue";
      const bits = [`${stop.exhibitions.length} ${stop.exhibitions.length === 1 ? "exposició" : "exposicions"}`];
      if (provisional) bits.push("parada provisional — emplaçament o horari no confirmats");
      meta.textContent = bits.join(" · ");
      body.append(meta);

      for (const exh of stop.exhibitions) {
        const line = document.createElement("p");
        line.className = "ds-text ds-text--sm";
        const visited = mods.state.isVisited(exh);
        line.textContent = `${visited ? "✓ " : "· "}${exh.titleOriginal}`;
        line.style.margin = "2px 0";
        body.append(line);
      }
      card.append(body);

      const actions = document.createElement("div");
      actions.className = "voff-stop__actions";

      if (stop.venue) {
        const goBtn = document.createElement("a");
        goBtn.className = "ds-icon-button";
        goBtn.href = mods.geo.walkingDirectionsUrl(stop.venue);
        goBtn.target = "_blank";
        goBtn.rel = "noopener";
        goBtn.setAttribute("data-no-router", "");
        goBtn.title = "Com arribar a peu";
        goBtn.innerHTML = '<i class="fa-solid fa-diamond-turn-right" aria-hidden="true"></i>';
        actions.append(goBtn);
      }

      const upBtn = document.createElement("button");
      upBtn.className = "ds-icon-button";
      upBtn.type = "button";
      upBtn.title = "Puja";
      upBtn.disabled = index === 0;
      upBtn.innerHTML = '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>';
      upBtn.addEventListener("click", () => { rebuildRouteFromStops(moveStop(stops, index, -1)); render(); });
      actions.append(upBtn);

      const downBtn = document.createElement("button");
      downBtn.className = "ds-icon-button";
      downBtn.type = "button";
      downBtn.title = "Baixa";
      downBtn.disabled = index === stops.length - 1;
      downBtn.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
      downBtn.addEventListener("click", () => { rebuildRouteFromStops(moveStop(stops, index, 1)); render(); });
      actions.append(downBtn);

      const removeBtn = document.createElement("button");
      removeBtn.className = "ds-icon-button";
      removeBtn.type = "button";
      removeBtn.title = "Treu tota la parada de la ruta";
      removeBtn.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
      removeBtn.addEventListener("click", () => {
        for (const exh of stop.exhibitions) mods.state.removeFromRoute(exh);
        render();
        updateRouteBadge();
      });
      actions.append(removeBtn);

      card.append(actions);
      container.append(card);
    });

    if (stops.length > 1) {
      const distNote = document.createElement("p");
      distNote.className = "ds-text ds-text--sm ds-text--muted";
      const legs = [];
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i].venue, b = stops[i + 1].venue;
        if (a && b && a.coordinates && b.coordinates) legs.push(mods.geo.formatDistance(mods.geo.straightLineKm(a.coordinates, b.coordinates)));
      }
      if (legs.length) distNote.textContent = `Distàncies entre parades consecutives: ${legs.join(" · ")}.`;
      container.append(distNote);
    }
  }

  function wireControls() {
    document.getElementById("voff-ruta-minuts").addEventListener("input", render);
    document.getElementById("voff-ruta-disponible").addEventListener("input", render);

    document.getElementById("voff-ruta-inici").addEventListener("change", async (e) => {
      if (e.target.value === "gps") {
        try {
          const loc = await mods.geo.requestLocation();
          userLocation = { lat: loc.lat, lng: loc.lng };
        } catch (err) {
          alert(`No s'ha pogut obtenir la ubicació: ${err.messageCa}`);
          e.target.value = "centre";
          userLocation = null;
        }
      } else {
        userLocation = null;
      }
    });

    document.getElementById("btn-proposa-ordre").addEventListener("click", () => {
      const start = userLocation || window.APP.perpignanCenterRef;
      const stops = groupStops(mods.state.getRoute());
      const ordered = proposeOrder(stops, start);
      rebuildRouteFromStops(ordered);
      render();
    });
  }

  async function init() {
    const container = document.getElementById("voff-route-stops");
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

    updateRouteBadge();
    wireControls();

    try {
      const { catalog: c } = await mods.data.loadCatalog();
      catalog = c;
      render();
    } catch (err) {
      container.replaceChildren(mods.ui.emptyState("No s'ha pogut carregar el catàleg.", "fa-solid fa-triangle-exclamation"));
      console.error(err);
    }
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", init);
})();
