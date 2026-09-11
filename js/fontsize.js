/* ============================================================
   Visa+OFF Perpinyà — mida de lletra
   Script clàssic de capçalera (com config.js/tabbar.js): un botó
   #btn-fontsize present a totes les pàgines fa cicle entre 3 mides
   (normal → gran → molt gran → normal), aplicades a <html> via una
   classe (voff-text-lg / voff-text-xl) que escala --ds-space-x i tots
   els rem del design-system alhora. Preferència desada a localStorage
   i aplicada abans de pintar per evitar el "flash" de mida normal.
   No depèn de #main-content ni de router.js: el botó viu al chrome
   (capçalera), que router.js no toca en navegar.
   ============================================================ */
(function () {
  var STORAGE_KEY = "visaOffPerpinya:midaLletra";
  var LEVELS = ["normal", "gran", "molt-gran"];
  var CLASS_BY_LEVEL = { normal: "", gran: "voff-text-lg", "molt-gran": "voff-text-xl" };
  var LABEL_BY_LEVEL = { normal: "Mida de lletra normal", gran: "Mida de lletra gran", "molt-gran": "Mida de lletra molt gran" };

  function readLevel() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return LEVELS.indexOf(v) !== -1 ? v : "normal";
    } catch (_) {
      return "normal";
    }
  }

  function apply(level) {
    var root = document.documentElement;
    root.classList.remove("voff-text-lg", "voff-text-xl");
    var cls = CLASS_BY_LEVEL[level];
    if (cls) root.classList.add(cls);
    var btn = document.getElementById("btn-fontsize");
    if (btn) {
      btn.setAttribute("aria-pressed", String(level !== "normal"));
      btn.setAttribute("aria-label", "Augmenta la mida de la lletra — " + LABEL_BY_LEVEL[level] + " (toca per canviar)");
    }
  }

  // Aplica de seguida (abans de DOMContentLoaded si cal) per no fer
  // "flash" de mida normal en pàgines amb molt de contingut.
  var current = readLevel();
  apply(current);

  function wire() {
    apply(current); // per si el botó encara no existia quan s'ha cridat apply() més amunt
    var btn = document.getElementById("btn-fontsize");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var idx = LEVELS.indexOf(current);
      current = LEVELS[(idx + 1) % LEVELS.length];
      apply(current);
      try { localStorage.setItem(STORAGE_KEY, current); } catch (_) { /* localStorage no disponible: preferència només per a aquesta càrrega */ }
    });
  }

  if (document.readyState !== "loading") wire();
  else document.addEventListener("DOMContentLoaded", wire);
})();
