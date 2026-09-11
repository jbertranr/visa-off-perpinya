/* ============================================================
   modules/ui.js
   Peces d'interfície reutilitzables entre pantalles: targeta
   d'exposició, grup per seu, distintiu de circuit i píndola
   d'estat d'obertura. La lògica de Visa/OFF (quins camps mostra,
   com es calcula l'estat) viu als mòduls de dades/horaris — aquí
   només hi ha construcció de DOM, sense innerHTML amb dades
   externes (norma web-vanilla).
   ============================================================ */

import { computeStatus, statusVariant } from "./opening.js";
import { isFavorite, isVisited, toggleFavorite } from "./state.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function circuitBadge(circuit) {
  const b = el("span", `ds-badge ds-badge--sm ${circuit === "VISA" ? "ds-badge--primary" : "ds-badge--neutral"}`);
  b.textContent = circuit;
  return b;
}

export function statusPill(exhibition, parisWallClock, closingSoonMinutes) {
  const status = computeStatus(exhibition, parisWallClock, closingSoonMinutes);
  const variant = statusVariant(status.state);
  const span = el("span", `ds-status${variant ? ` ds-status--${variant}` : ""}`);
  const dot = el("span", "ds-status__dot");
  const icon = document.createElement("i");
  icon.className = status.icon;
  icon.setAttribute("aria-hidden", "true");
  span.append(dot, icon, document.createTextNode(" " + status.label));
  span.dataset.state = status.state;
  return { node: span, status };
}

function authorshipLabel(exh) {
  if (exh.authorshipKind === "collective-unknown-members") return "Col·lectiu (per confirmar)";
  if (!exh.authors || exh.authors.length === 0) return "Autoria per confirmar";
  return exh.authors.map((a) => a.name).join(", ");
}

/**
 * Targeta compacta d'exposició (llista "A prop" dins d'un grup, o
 * resultats d'"Explora"). navigate(exh) és cridada en fer clic.
 */
export function renderExhibitionCard(exh, { parisWallClock, closingSoonMinutes, onOpen, onToggleFavorite }) {
  const card = el("div", `ds-card ds-card--status-start voff-card ${exh.circuit === "VISA" ? "ds-card--primary" : "ds-card--accent"}`);
  card.setAttribute("data-exh-id", exh.id);

  const top = el("div", "voff-card__top");
  top.append(circuitBadge(exh.circuit));
  if (isVisited(exh)) {
    const vis = document.createElement("i");
    vis.className = "fa-solid fa-circle-check voff-card__visited";
    vis.setAttribute("aria-hidden", "true");
    vis.title = "Visitada";
    top.append(vis);
  }

  // Preferit: tocable directament des de la targeta, sense obrir la fitxa.
  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "voff-card__fav-btn";
  function reflectFav() {
    const fav = isFavorite(exh);
    favBtn.innerHTML = `<i class="fa-${fav ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`;
    favBtn.classList.toggle("is-active", fav);
    favBtn.setAttribute("aria-pressed", String(fav));
    favBtn.setAttribute("aria-label", fav ? `Treure ${exh.titleOriginal} de preferits` : `Afegir ${exh.titleOriginal} a preferits`);
  }
  reflectFav();
  favBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleFavorite(exh);
    reflectFav();
    if (onToggleFavorite) onToggleFavorite(exh);
  });
  top.append(favBtn);
  card.append(top);

  const body = document.createElement("a");
  body.className = "voff-card__body";
  body.href = `fitxa.html?edition=${encodeURIComponent(exh.editionId)}&id=${encodeURIComponent(exh.id)}`;
  body.setAttribute("data-no-router", ""); // router.js no l'ha de tractar com una navegació de pàgina

  if (exh.image) {
    const thumb = document.createElement("img");
    thumb.className = "voff-card__thumb";
    thumb.src = exh.image;
    thumb.alt = "";
    thumb.loading = "lazy";
    body.append(thumb);
  }

  const text = el("div", "voff-card__text");
  text.append(el("p", "voff-card__title", exh.titleOriginal));
  text.append(el("span", "ds-card__accent"));
  text.append(el("p", "voff-card__author", authorshipLabel(exh)));
  if (exh.summaryCa) {
    text.append(el("p", "voff-card__summary", exh.summaryCa));
  }
  if (exh.venue) {
    const venueLine = el("p", "voff-card__venue");
    const pin = document.createElement("i");
    pin.className = "fa-solid fa-location-dot";
    pin.setAttribute("aria-hidden", "true");
    venueLine.append(pin, document.createTextNode(` ${exh.venue.name} — ${exh.venue.address}`));
    text.append(venueLine);
  }
  if (parisWallClock) {
    const { node } = statusPill(exh, parisWallClock, closingSoonMinutes);
    node.classList.add("voff-card__status");
    text.append(node);
  }
  body.append(text);

  body.addEventListener("click", (ev) => {
    // Deixa passar clic amb modificador / botó central: obrir en pestanya
    // nova ha de funcionar com en qualsevol enllaç real.
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    onOpen(exh);
  });
  card.append(body);

  return card;
}

/**
 * Grup d'exposicions per emplaçament — capçalera amb nom, distància i
 * comptador, sense repetir l'adreça a cada targeta filla.
 */
export function renderVenueGroup(group, { parisWallClock, closingSoonMinutes, onOpen, onToggleFavorite, distanceLabel }) {
  const wrap = el("section", "voff-venue-group");
  const header = el("div", "voff-venue-group__header");

  const title = el("p", "voff-venue-group__title", group.venue ? group.venue.name : "Emplaçament per confirmar");
  header.append(title);

  const meta = el("p", "voff-venue-group__meta");
  const bits = [];
  if (distanceLabel) bits.push(distanceLabel);
  bits.push(`${group.exhibitions.length} ${group.exhibitions.length === 1 ? "exposició" : "exposicions"}`);
  if (group.venue && group.venue.coordinateStatus === "approximate-street-nominatim") {
    bits.push("ubicació aproximada");
  }
  meta.textContent = bits.join(" · ");
  header.append(meta);

  wrap.append(header);

  const list = el("div", "voff-venue-group__list");
  for (const exh of group.exhibitions) {
    list.append(renderExhibitionCard(exh, { parisWallClock, closingSoonMinutes, onOpen, onToggleFavorite }));
  }
  wrap.append(list);
  return wrap;
}

function fitxaAuthorshipBlock(exh) {
  const wrap = el("div");
  if (exh.authorshipKind === "collective-unknown-members") {
    wrap.append(el("p", "voff-fitxa__authors", "Col·lectiu — relació de participants per confirmar"));
    return wrap;
  }
  if (!exh.authors || exh.authors.length === 0) {
    wrap.append(el("p", "voff-fitxa__authors", "Autoria per confirmar"));
    return wrap;
  }
  wrap.append(el("p", "voff-fitxa__authors", exh.authors.map((a) => a.name).join(", ")));
  for (const author of exh.authors) {
    if (author.bioCa) wrap.append(el("p", "ds-text ds-text--sm", author.bioCa));
    if (author.profileUrl) {
      const a = document.createElement("a");
      a.href = author.profileUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "ds-text ds-text--sm";
      a.textContent = `Fitxa de ${author.name} →`;
      wrap.append(a);
    }
  }
  return wrap;
}

function fitxaLocationBlock(exh) {
  const wrap = el("div", "voff-fitxa__block");
  wrap.append(el("h2", null, "Emplaçament i horari"));

  if (exh.venueStatus === "conflicting") {
    const box = el("div", "voff-conflict-box");
    box.append(el("p", null, "⚠ Emplaçament contradictori entre fonts — no resolt."));
    for (const claim of exh.venueClaims || []) {
      const p = el("p", "ds-text ds-text--sm");
      const venueName = claim.label || claim.venueId;
      p.textContent = `${venueName} — font: ${claim.sourceType || "font"}${claim.sourceDate ? ` (${claim.sourceDate})` : ""}`;
      box.append(p);
    }
    if (exh.resolutionAttempt) {
      const p = el("p", "ds-text ds-text--sm ds-text--muted", `Intent de resolució (${exh.resolutionAttempt.attemptedOn}): sense èxit. ${exh.resolutionAttempt.recommendationCa || ""}`);
      box.append(p);
    }
    wrap.append(box);
    return wrap;
  }

  if (!exh.venue) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Emplaçament encara pendent de confirmar."));
    return wrap;
  }

  wrap.append(el("p", "voff-fitxa__venue-name", exh.venue.name));
  wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", `${exh.venue.address}, ${exh.venue.city}`));
  if (exh.venue.coordinateStatus === "approximate-street-nominatim") {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Ubicació aproximada (carrer, no el portal exacte)."));
  }

  if (exh.startDate && exh.endDate) {
    wrap.append(el("p", "ds-text ds-text--sm", `Del ${exh.startDate} al ${exh.endDate}`));
  } else if (exh.dateNoteCa) {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", exh.dateNoteCa));
  }

  if (exh.openingHours && exh.openingHours.intervals) {
    const hoursText = exh.openingHours.intervals.map(([s, e]) => `${s}–${e}`).join(", ");
    wrap.append(el("p", "ds-text ds-text--sm", `Horari: ${hoursText} (${exh.openingHours.status === "confirmed-festival-schedule" ? "regla general del festival" : "font pròpia"})`));
  } else {
    wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", "Horari d'accés no confirmat."));
  }

  if (exh.price) {
    const priceText = exh.price.amount === 0 ? "Entrada gratuïta" : `${exh.price.amount} ${exh.price.currency}`;
    wrap.append(el("p", "ds-text ds-text--sm", priceText));
  }

  if (exh.venue.accessibility) {
    wrap.append(el("p", "ds-text ds-text--sm", `Accessibilitat: ${exh.venue.accessibility}`));
  }

  return wrap;
}

function fitxaSourcesBlock(exh) {
  const wrap = el("div", "voff-fitxa__block");
  wrap.append(el("h2", null, "Font i verificació"));
  wrap.append(el("p", "ds-text ds-text--sm ds-text--muted", `Comprovat el ${exh.checkedOn}.`));
  if (exh.sources && exh.sources.length) {
    for (const src of exh.sources) {
      const a = document.createElement("a");
      a.href = src;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "ds-text ds-text--sm";
      a.style.display = "block";
      a.textContent = src;
      wrap.append(a);
    }
  }
  if (exh.notesCa) wrap.append(el("p", "ds-text ds-text--sm", exh.notesCa));
  if (exh.sensitiveContentNotice) {
    const p = el("p", "ds-text ds-text--sm");
    p.style.color = "var(--ds-color-warning)";
    p.textContent = "⚠ L'organitzador n'avisa: contingut sensible.";
    wrap.append(p);
  }
  return wrap;
}

/**
 * Construeix el contingut complet de la fitxa d'una exposició (bullets +
 * títol + autoria + resum + accions + emplaçament + fonts), reutilitzat
 * tant per fitxa.html (pàgina pròpia, accessible per URL) com pel modal
 * obert des de les altres pantalles. `onRouteChange` s'invoca quan canvia
 * la ruta (perquè qui l'ha obert pugui refrescar el seu propi comptador).
 */
export function buildFitxaCard(exh, mods, { onRouteChange } = {}) {
  const card = el("div", "voff-fitxa-card");

  // Imatge de capçalera (si n'hi ha) — a dalt de tot de la fitxa.
  if (exh.image) {
    const figure = el("figure", "voff-fitxa__image");
    const img = document.createElement("img");
    img.src = exh.image;
    img.alt = "";
    img.loading = "lazy";
    figure.append(img);
    const captions = {
      "festival-promotional-not-explicitly-licensed": "Cartell oficial del festival — drets no confirmats explícitament per a redistribució.",
      "press-editorial-not-explicitly-licensed": "Fotografia de l'autor, reproduïda via premsa (phototrend.fr) — drets no confirmats explícitament per a redistribució."
    };
    if (captions[exh.imageRightsStatus]) {
      figure.append(el("figcaption", "voff-fitxa__image-caption", captions[exh.imageRightsStatus]));
    }
    card.append(figure);
  }

  const bullets = el("div", "voff-fitxa__bullets");
  bullets.append(circuitBadge(exh.circuit));

  const wc = mods.state.getPlanMode() === "planificar"
    ? mods.opening.planAsParisWallClock(mods.state.getPlanDateTime().date, mods.state.getPlanDateTime().time)
    : mods.opening.nowAsParisWallClock();
  const prefs = mods.state.getPrefs();
  const { node: statusNode } = statusPill(exh, wc, prefs.closingSoonMinutes);
  bullets.append(statusNode);
  bullets.append(el("span", "voff-fitxa__bullets-spacer"));

  const visitedBtn = document.createElement("button");
  visitedBtn.type = "button";
  visitedBtn.className = "voff-fitxa__bullet-btn";
  function reflectVisited() {
    const v = isVisited(exh);
    visitedBtn.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>';
    visitedBtn.classList.toggle("is-active", v);
    visitedBtn.setAttribute("aria-pressed", String(v));
    visitedBtn.setAttribute("aria-label", v ? "Marcada com a visitada" : "Marca com a visitada");
  }
  visitedBtn.addEventListener("click", () => { mods.state.toggleVisited(exh); reflectVisited(); });
  reflectVisited();
  bullets.append(visitedBtn);

  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "voff-fitxa__bullet-btn";
  function reflectFav() {
    const fav = isFavorite(exh);
    favBtn.innerHTML = `<i class="fa-${fav ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`;
    favBtn.classList.toggle("is-active", fav);
    favBtn.setAttribute("aria-pressed", String(fav));
    favBtn.setAttribute("aria-label", fav ? "Treure de preferits" : "Afegir a preferits");
  }
  favBtn.addEventListener("click", () => { toggleFavorite(exh); reflectFav(); });
  reflectFav();
  bullets.append(favBtn);

  const routeToggleBtn = document.createElement("button");
  routeToggleBtn.type = "button";
  routeToggleBtn.className = "voff-fitxa__bullet-btn";
  function reflectRouteToggle() {
    const inRoute = mods.state.isInRoute(exh);
    routeToggleBtn.innerHTML = `<i class="fa-solid fa-route" aria-hidden="true"></i>`;
    routeToggleBtn.classList.toggle("is-active", inRoute);
    routeToggleBtn.setAttribute("aria-pressed", String(inRoute));
    routeToggleBtn.setAttribute("aria-label", inRoute ? "Treure de la ruta" : "Afegir a la ruta");
  }
  routeToggleBtn.addEventListener("click", () => {
    if (mods.state.isInRoute(exh)) mods.state.removeFromRoute(exh);
    else mods.state.addToRoute(exh);
    reflectRouteToggle();
    if (onRouteChange) onRouteChange();
  });
  reflectRouteToggle();
  bullets.append(routeToggleBtn);
  card.append(bullets);

  card.append(el("h1", "voff-fitxa__title", exh.titleOriginal));
  card.append(fitxaAuthorshipBlock(exh));
  if (exh.summaryCa) {
    card.append(el("p", "ds-text", exh.summaryCa));
  } else {
    card.append(el("p", "ds-text ds-text--sm ds-text--muted", "Encara no hi ha un resum verificat d'aquesta exposició."));
  }

  card.append(el("hr", "voff-fitxa__divider"));

  const actions = el("div", "voff-fitxa__actions");
  if (exh.venue) {
    const goBtn = document.createElement("a");
    goBtn.className = "ds-button";
    goBtn.href = mods.geo.walkingDirectionsUrl(exh.venue);
    goBtn.target = "_blank";
    goBtn.rel = "noopener";
    goBtn.setAttribute("data-no-router", "");
    goBtn.innerHTML = '<i class="fa-solid fa-diamond-turn-right" aria-hidden="true"></i> Com arribar';
    actions.append(goBtn);
  }
  if (exh.sources && exh.sources.length) {
    const officialBtn = document.createElement("a");
    officialBtn.className = "ds-button ds-button--ghost";
    officialBtn.href = exh.sources[0];
    officialBtn.target = "_blank";
    officialBtn.rel = "noopener";
    officialBtn.setAttribute("data-no-router", "");
    officialBtn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Pàgina oficial';
    actions.append(officialBtn);
  }
  card.append(actions);

  card.append(el("hr", "voff-fitxa__divider"));
  card.append(fitxaLocationBlock(exh));
  card.append(el("hr", "voff-fitxa__divider"));
  card.append(fitxaSourcesBlock(exh));

  return card;
}

export function emptyState(message, icon = "fa-solid fa-inbox") {
  const wrap = el("div", "ds-empty");
  const i = document.createElement("i");
  i.className = `ds-empty__icon ${icon}`;
  i.setAttribute("aria-hidden", "true");
  wrap.append(i);
  wrap.append(el("p", "ds-empty__desc", message));
  return wrap;
}
