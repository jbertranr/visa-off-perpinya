/* ============================================================
   modules/geo.js
   Geolocalització sota demanda (mai en segon pla), distància en
   línia recta (no de carrer) i enllaç "Com arribar" a peu.
   ============================================================ */

/**
 * Demana la ubicació NOMÉS quan es crida (mai a l'arrencada).
 * @returns {Promise<{lat:number,lng:number,accuracyM:number}>}
 */
export function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject({ code: "unsupported", messageCa: "Aquest dispositiu o navegador no ofereix geolocalització." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy
        });
      },
      (err) => {
        const map = {
          1: { code: "denied", messageCa: "Has denegat el permís d'ubicació." },
          2: { code: "unavailable", messageCa: "La ubicació no està disponible ara mateix." },
          3: { code: "timeout", messageCa: "S'ha exhaurit el temps d'espera per obtenir la ubicació." }
        };
        reject(map[err.code] || { code: "unknown", messageCa: "No s'ha pogut obtenir la ubicació." });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

/** Distància en línia recta (Haversine), en km — MAI metres reals de carrer. */
export function straightLineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return "distància desconeguda";
  if (km < 1) return `≈ ${Math.round(km * 1000)} m en línia recta`;
  return `≈ ${km.toFixed(1)} km en línia recta`;
}

/** URL de Google Maps en mode a peu — no cal clau d'API. */
export function walkingDirectionsUrl(destination) {
  const dest = destination.coordinates
    ? `${destination.coordinates.lat},${destination.coordinates.lng}`
    : encodeURIComponent(`${destination.address}, ${destination.city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`;
}
