/* ============================================================
   Visa+OFF Perpinyà — configuració
   Script clàssic (no mòdul) perquè estigui disponible com a global
   window.APP abans que s'executin els mòduls de cada pantalla.
   ============================================================ */
window.APP = {
  title: "Visa+OFF Perpinyà",
  subtitle: "Visa + OFF, a peu per Perpinyà",
  timeZone: "Europe/Paris",

  // Primera sortida configurada explícitament (encàrrec § 8) — només és
  // el valor per defecte del selector de data en mode "Planificar"; el
  // mode "Ara" sempre fa servir l'hora real del dispositiu, convertida a
  // Europe/Paris.
  defaultPlanDate: "2026-09-12",

  // Llindar de "tanca aviat": preferència de la interfície, no una dada
  // del programa (encàrrec § 8).
  closingSoonMinutes: 45,

  // Referència explícita del centre de Perpinyà — NO és una ubicació
  // real de l'usuari, només un punt de partida manual per defecte
  // (encàrrec § 9).
  perpignanCenterRef: { lat: 42.6986, lng: 2.8955, label: "Centre de Perpinyà (referència)" },

  storageKeys: {
    favorites: "visaOffPerpinya:favorits",
    visited: "visaOffPerpinya:visitades",
    route: "visaOffPerpinya:ruta",
    startPoint: "visaOffPerpinya:puntPartida",
    planMode: "visaOffPerpinya:mode",
    planDateTime: "visaOffPerpinya:dataHoraPlanificada",
    prefs: "visaOffPerpinya:preferencies",
    catalogCache: "visaOffPerpinya:catalogCache"
  },

  dataFiles: {
    editions: "data/editions.json",
    authors: "data/authors.json",
    venues: "data/venues.json",
    exhibitions: "data/exhibitions.json",
    coverage: "data/coverage.json"
  }
};
