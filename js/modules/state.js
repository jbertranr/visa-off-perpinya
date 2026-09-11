/* ============================================================
   modules/state.js
   Preferits, visitades, ruta, punt de partida i mode Ara/Planificar
   — tot local (localStorage), vinculat a identificadors d'edició +
   exposició (mai a la posició en un array). Sense compte d'usuari.
   ============================================================ */

import { readJSON, writeJSON } from "./storage.js";

const K = () => window.APP.storageKeys;

// ── Preferits / visitades (conjunts d'ids "editionId::exhibitionId") ──
function fullId(exh) {
  return `${exh.editionId}::${exh.id}`;
}

function readSet(key) {
  return new Set(readJSON(key, []));
}
function writeSet(key, set) {
  writeJSON(key, Array.from(set));
}

export function isFavorite(exh) {
  return readSet(K().favorites).has(fullId(exh));
}
export function toggleFavorite(exh) {
  const s = readSet(K().favorites);
  const id = fullId(exh);
  s.has(id) ? s.delete(id) : s.add(id);
  writeSet(K().favorites, s);
  return s.has(id);
}
export function favoriteIds() {
  return readSet(K().favorites);
}

export function isVisited(exh) {
  return readSet(K().visited).has(fullId(exh));
}
export function toggleVisited(exh) {
  const s = readSet(K().visited);
  const id = fullId(exh);
  s.has(id) ? s.delete(id) : s.add(id);
  writeSet(K().visited, s);
  return s.has(id);
}
export function visitedIds() {
  return readSet(K().visited);
}

// ── Ruta (llista ordenada d'ids, no de posicions) ──
export function getRoute() {
  return readJSON(K().route, []);
}
export function setRoute(idsArray) {
  writeJSON(K().route, idsArray);
}
export function isInRoute(exh) {
  return getRoute().includes(fullId(exh));
}
export function addToRoute(exh) {
  const r = getRoute();
  const id = fullId(exh);
  if (!r.includes(id)) r.push(id);
  setRoute(r);
}
export function removeFromRoute(exh) {
  setRoute(getRoute().filter((id) => id !== fullId(exh)));
}
export function reorderRoute(fromIndex, toIndex) {
  const r = getRoute();
  const [moved] = r.splice(fromIndex, 1);
  r.splice(toIndex, 0, moved);
  setRoute(r);
}
export { fullId };

// ── Punt de partida manual / GPS / centre de referència ──
export function getStartPoint() {
  return readJSON(K().startPoint, { kind: "manual-centre" });
}
export function setStartPoint(point) {
  writeJSON(K().startPoint, point);
}

// ── Mode Ara / Planificar ──
export function getPlanMode() {
  return readJSON(K().planMode, "ara");
}
export function setPlanMode(mode) {
  writeJSON(K().planMode, mode);
}
export function getPlanDateTime() {
  return readJSON(K().planDateTime, { date: window.APP.defaultPlanDate, time: "10:00" });
}
export function setPlanDateTime(dt) {
  writeJSON(K().planDateTime, dt);
}

// ── Preferències (llindar de "tanca aviat", filtre de circuit actiu…) ──
export function getPrefs() {
  return readJSON(K().prefs, { closingSoonMinutes: window.APP.closingSoonMinutes, circuit: "tots" });
}
export function setPrefs(patch) {
  writeJSON(K().prefs, { ...getPrefs(), ...patch });
}
