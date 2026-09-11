/* ============================================================
   modules/data.js
   Càrrega del catàleg (JSON estàtics versionats) + índexs en
   memòria. El JSON és sempre la font — no hi ha scraping des del
   navegador (encàrrec § 10). Es guarda una còpia a localStorage
   perquè les fitxes desades funcionin sense connexió i per poder
   mostrar "s'està utilitzant una còpia desada" si el fetch falla.
   ============================================================ */

import { readJSON, writeJSON } from "./storage.js";

let cachedCatalog = null;

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} a ${url}`);
  return res.json();
}

function buildIndex(list, key = "id") {
  const map = new Map();
  for (const item of list) map.set(item[key], item);
  return map;
}

function buildCatalog({ editions, authors, venues, exhibitions, coverage }) {
  const editionsById = buildIndex(editions.editions);
  const authorsById = buildIndex(authors.authors);
  const venuesById = buildIndex(venues.venues);

  // Exposicions enriquides amb les seves referències resoltes, per no
  // repetir la mateixa cerca a cada pantalla.
  const enrichedExhibitions = exhibitions.exhibitions.map((exh) => ({
    ...exh,
    edition: editionsById.get(exh.editionId) || null,
    authors: (exh.authorIds || []).map((id) => authorsById.get(id)).filter(Boolean),
    venue: exh.venueId ? venuesById.get(exh.venueId) || null : null,
    venueCandidatesResolved: (exh.venueCandidates || []).map((id) => venuesById.get(id)).filter(Boolean)
  }));

  return {
    editions: editions.editions,
    authors: authors.authors,
    venues: venues.venues,
    exhibitions: enrichedExhibitions,
    coverage: coverage || null,
    editionsById,
    authorsById,
    venuesById,
    exhibitionsById: buildIndex(enrichedExhibitions)
  };
}

/**
 * Carrega el catàleg complet. Retorna { catalog, fromCache, fetchedAt }.
 * Si el fetch falla (sense connexió), recupera la còpia de localStorage
 * si n'hi ha — l'aplicació ha de continuar sent utilitzable.
 */
export async function loadCatalog() {
  if (cachedCatalog) return { catalog: cachedCatalog, fromCache: false, fetchedAt: null };

  const files = window.APP.dataFiles;
  try {
    const [editions, authors, venues, exhibitions, coverage] = await Promise.all([
      fetchJSON(files.editions),
      fetchJSON(files.authors),
      fetchJSON(files.venues),
      fetchJSON(files.exhibitions),
      fetchJSON(files.coverage)
    ]);
    const raw = { editions, authors, venues, exhibitions, coverage };
    cachedCatalog = buildCatalog(raw);
    const fetchedAt = new Date().toISOString();
    writeJSON(window.APP.storageKeys.catalogCache, { raw, fetchedAt });
    return { catalog: cachedCatalog, fromCache: false, fetchedAt };
  } catch (err) {
    console.warn("[data] fetch del catàleg fallit, provant còpia local", err);
    const saved = readJSON(window.APP.storageKeys.catalogCache, null);
    if (saved && saved.raw) {
      cachedCatalog = buildCatalog(saved.raw);
      return { catalog: cachedCatalog, fromCache: true, fetchedAt: saved.fetchedAt };
    }
    throw err;
  }
}

export function groupByVenue(exhibitions) {
  const groups = new Map();
  for (const exh of exhibitions) {
    const key = exh.venueId || "__pendent__";
    if (!groups.has(key)) {
      groups.set(key, {
        venue: exh.venue,
        venueId: exh.venueId,
        pending: !exh.venueId,
        exhibitions: []
      });
    }
    groups.get(key).exhibitions.push(exh);
  }
  return Array.from(groups.values());
}
