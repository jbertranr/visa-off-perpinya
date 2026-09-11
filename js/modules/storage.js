/* ============================================================
   modules/storage.js
   Embolcall mínim de localStorage: mai deixa que un error
   d'emmagatzematge (quota plena, mode privat, navegador que el
   bloqueja) trenqui la resta de l'aplicació.
   ============================================================ */

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[storage] no s'ha pogut llegir", key, err);
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn("[storage] no s'ha pogut desar", key, err);
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("[storage] no s'ha pogut esborrar", key, err);
  }
}
