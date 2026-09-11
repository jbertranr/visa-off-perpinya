/* ============================================================
   Visa+OFF Perpinyà — menú hamburguesa (#btn-open-nav → #dlg-nav)
   Script clàssic de capçalera (com tabbar.js/fontsize.js): substitueix
   temporalment la tabbar inferior (amagada a app.css) mentre es decideix
   el disseny de navegació definitiu. Marca l'ítem actiu segons la ruta
   i escolta 'ds:navigated' per re-marcar-lo sense recarregar — mateix
   patró que tabbar.js, però viu al <head> de cada pàgina.
   ============================================================ */
(function () {
  function currentPage() {
    var last = (location.pathname.split("/").pop() || "index.html");
    return last.replace(/\.html$/, "") || "index";
  }

  function markActive() {
    var current = currentPage();
    document.querySelectorAll(".voff-nav-menu__item[data-nav-page]").forEach(function (a) {
      var active = a.getAttribute("data-nav-page") === current;
      a.classList.toggle("is-active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function wireOpenButton() {
    var btn = document.getElementById("btn-open-nav");
    var dlg = document.getElementById("dlg-nav");
    if (!btn || !dlg) return;
    btn.addEventListener("click", function () {
      if (window.DSModal) window.DSModal.obre("dlg-nav");
      else dlg.showModal();
    });
  }

  // Tancar el modal en triar una destinació: com que #dlg-nav viu fora
  // de #main-content (és chrome, com la tabbar), router.js no el toca
  // en navegar — sense això es quedava obert (i per sobre de tot) a la
  // pàgina destí, un cop feta la navegació sense recàrrega.
  function wireItemClicks() {
    var dlg = document.getElementById("dlg-nav");
    if (!dlg) return;
    dlg.querySelectorAll(".voff-nav-menu__item").forEach(function (a) {
      a.addEventListener("click", function () {
        if (window.DSModal) window.DSModal.tanca(dlg);
        else dlg.close();
      });
    });
  }

  function init() {
    wireOpenButton();
    wireItemClicks();
    markActive();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("ds:navigated", markActive);
})();
