/* ============================================================
   modules/opening.js
   Estat d'obertura d'una exposició en un instant donat, sempre en
   horari Europe/Paris (encàrrec § 8) — independentment de la zona
   horària del dispositiu. Estats previstos: obert, tanca-aviat,
   tancat, no-comencat, finalitzat, desconegut.

   Treballa sempre amb "hora de paret" de París ({dateStr, minutesOfDay}),
   no amb un Date/instant: així el mode "Planificar" (l'usuari tria una
   data i hora ja pensades com a hora de Perpinyà) no necessita cap
   conversió d'UTC↔CEST/CET, i el mode "Ara" només en fa una, en un sol
   punt (nowAsParisWallClock).
   ============================================================ */

const PARIS_TZ = "Europe/Paris";

/** Converteix l'instant real (Date) a hora de paret de Europe/Paris. */
export function nowAsParisWallClock() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  const parts = {};
  fmt.formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    minutesOfDay: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10)
  };
}

/** Mode Planificar: l'usuari ja tria data/hora pensades com a hora de Perpinyà. */
export function planAsParisWallClock(dateStr, hhmm) {
  return { dateStr, minutesOfDay: toMinutes(hhmm || "10:00") };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * @param {object} exhibition — amb startDate/endDate/openingHours (o null)
 * @param {{dateStr:string, minutesOfDay:number}} parisWallClock
 * @param {number} closingSoonMinutes — llindar de "tanca aviat" (preferència, no dada del programa)
 * @returns {{state: string, label: string, icon: string}}
 */
export function computeStatus(exhibition, parisWallClock, closingSoonMinutes) {
  const oh = exhibition.openingHours;

  if (!oh || !exhibition.startDate || !exhibition.endDate) {
    return { state: "desconegut", label: "Horari no confirmat", icon: "fa-solid fa-circle-question" };
  }

  const { dateStr, minutesOfDay } = parisWallClock;

  // Dates de l'exposició inclusives: el dia de tancament segueix obert
  // amb l'horari normal fins que s'acaba l'últim interval d'aquell dia.
  if (dateStr < exhibition.startDate) {
    return { state: "no-comencat", label: "Encara no ha començat", icon: "fa-solid fa-hourglass-start" };
  }
  if (dateStr > exhibition.endDate) {
    return { state: "finalitzat", label: "Finalitzada", icon: "fa-solid fa-flag-checkered" };
  }

  // Excepcions per data concreta: llista buida = tancat confirmat aquell dia;
  // llista amb intervals = substitueix els intervals habituals aquell dia.
  let intervals = oh.intervals || [];
  if (oh.exceptions && Object.prototype.hasOwnProperty.call(oh.exceptions, dateStr)) {
    intervals = oh.exceptions[dateStr];
    if (!intervals || intervals.length === 0) {
      return { state: "tancat", label: "Tancat avui (excepció)", icon: "fa-solid fa-door-closed" };
    }
  }

  for (const [start, end] of intervals) {
    const startMin = toMinutes(start);
    let endMin = toMinutes(end);
    // Franja que travessa mitjanit (p. ex. 22:00–02:00).
    const crossesMidnight = endMin <= startMin;
    if (crossesMidnight) endMin += 24 * 60;
    const nowAdjusted = (minutesOfDay < startMin && crossesMidnight) ? minutesOfDay + 24 * 60 : minutesOfDay;

    if (nowAdjusted >= startMin && nowAdjusted < endMin) {
      const minutesLeft = endMin - nowAdjusted;
      if (minutesLeft <= closingSoonMinutes) {
        return { state: "tanca-aviat", label: `Tanca aviat (${minutesLeft} min)`, icon: "fa-solid fa-clock" };
      }
      return { state: "obert", label: "Obert ara", icon: "fa-solid fa-circle-check" };
    }
  }

  return { state: "tancat", label: "Tancat ara", icon: "fa-solid fa-door-closed" };
}

/** Classe .ds-status--* que correspon a cada estat, per pintar-lo. */
export function statusVariant(state) {
  switch (state) {
    case "obert": return "ok";
    case "tanca-aviat": return "warn";
    case "tancat":
    case "finalitzat": return "danger";
    case "no-comencat":
    case "desconegut":
    default: return "";
  }
}
