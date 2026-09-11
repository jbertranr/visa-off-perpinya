/* ============================================================
   design-system / components / tabbar.js
   Marca l'ítem actiu de .ds-tabbar segons el nom de fitxer de la
   ruta actual (data-tab="explora" ↔ .../explora.html). Script
   clàssic d'acompanyament, com accordion.js/tabs.js — es carrega
   un cop al <head>; escolta 'ds:navigated' (disparat per router.js)
   per re-marcar l'actiu sense recarregar la pàgina.
   ============================================================ */

(function () {
  function currentTab() {
    var last = (location.pathname.split('/').pop() || 'index.html');
    return last.replace(/\.html$/, '') || 'index';
  }

  function markActive() {
    var current = currentTab();
    document.querySelectorAll('.ds-tabbar__item[data-tab]').forEach(function (el) {
      var active = el.getAttribute('data-tab') === current;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function init() { markActive(); }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('ds:navigated', init);

  window.DSTabbar = { init: init };
})();
