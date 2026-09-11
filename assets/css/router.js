/* ============================================================
   design-system / router.js
   Navegació sense recàrrega per a les aplicacions multi-pàgina que
   fan servir l'esquelet del design-system. Script clàssic sense
   dependències (com skin.js): es carrega un cop, al <head> de cada
   pàgina, després dels scripts de chrome.

   Intercepta els clics d'enllaços interns (.html o carpetes del mateix
   origen), baixa la pàgina destí i CANVIA NOMÉS:
     · <main id="main-content">  (obligatori a totes les pàgines)
     · .ds-breadcrumb            (si existeix)
     · <title>
   dins d'un document.startViewTransition(). El chrome (topbar,
   capçalera, menú, peu) NO es toca mai → cap parpelleig, la skin es
   manté, l'scroll es gestiona.

   MILLORA PROGRESSIVA. Si el fetch falla, si no hi ha JS, o si la
   pàgina destí no té #main-content (p. ex. un stub de redirecció), es
   fa una navegació completa normal. Els .html sencers segueixen sent
   la font i el pla B.

   CONTRACTE AMB ELS SCRIPTS DE PÀGINA. Els scripts que munten contingut
   dins #main-content (llistes, filtres, configuradors…) han de:
     1. tenir un init() idempotent que faci early-return si els seus
        elements no hi són,
     2. arrencar amb:
          if (document.readyState !== 'loading') init();
          else document.addEventListener('DOMContentLoaded', init);
          document.addEventListener('ds:navigated', init);
   Els scripts de CHROME (menú, selector de skin…) que viuen FORA de
   #main-content no s'han de tornar a executar; només han d'escoltar
   ds:navigated si depenen de la ruta actual (p. ex. marcar l'actiu).

   API: window.DSRouter.navigate(url) per a una navegació programàtica.
   Esdeveniment: document → 'ds:navigated' (detail: { url }).
   ============================================================ */

(function () {
  if (!window.history || !window.history.pushState) return;

  var abs = function (u, base) { return new URL(u, base || location.href).href; };
  var navSeq = 0;
  var activeVT = null;
  var loadedCss = new Set();
  var loadedJs = new Set();
  // hash -> <style> element que HEM injectat nosaltres (inclou els de la
  // càrrega inicial). No és només un registre de "ja vist": a cada
  // navegació es reconcilia perquè el <head> tingui exactament els
  // <style> de la pàgina actual, ni un més ni un menys (vegeu bug de
  // fuita més avall).
  var styleEls = new Map();
  var scrollByUrl = new Map();

  function strHash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return h;
  }

  // Bug real (2026-09-11): aquest "seeding" s'executava de seguida, en el
  // moment en què el propi <script> de router.js corre — típicament el
  // PRIMER <script> de <head>. En aquell instant el parser encara no ha
  // arribat als següents (modal.js/tabbar.js/config.js a <head>, i sobretot
  // l'script propi de cada pàgina al final de <body>, com aprop.js), així
  // que `document.querySelectorAll('script[src]')` només trobava el propi
  // router.js. Resultat: loadJs() els tractava com "no carregats" a CADA
  // navegació on tornaven a aparèixer (p. ex. tornar a "A prop" després
  // d'haver visitat una altra pantalla) i els tornava a injectar i executar
  // sencers — múltiples IIFE i múltiples listeners 'ds:navigated' pel
  // mateix script, amb estat (favorits/pendents, etc.) duplicat i
  // inconsistent. Cal esperar que el DOM inicial estigui sencer abans de
  // fer el seeding.
  function seedLoaded() {
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) { loadedCss.add(abs(l.getAttribute('href'))); });
    document.querySelectorAll('script[src]').forEach(function (s) { loadedJs.add(abs(s.getAttribute('src'))); });
    document.querySelectorAll('head style').forEach(function (st) { styleEls.set(strHash(st.textContent), st); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', seedLoaded);
  else seedLoaded();

  function loadCss(href) {
    if (loadedCss.has(href)) return Promise.resolve();
    loadedCss.add(href);
    return new Promise(function (resolve) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.addEventListener('load', resolve);
      l.addEventListener('error', resolve);
      document.head.appendChild(l);
    });
  }

  function loadJs(src) {
    if (loadedJs.has(src)) return Promise.resolve('exists');
    loadedJs.add(src);
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.addEventListener('load', function () { resolve('new'); });
      s.addEventListener('error', function () { resolve('error'); });
      document.head.appendChild(s);
    });
  }

  function isInternalPageLink(a) {
    if (!a || !a.getAttribute) return false;
    if (a.target === '_blank' || a.hasAttribute('download') || a.getAttribute('rel') === 'external') return false;
    if (a.hasAttribute('data-no-router')) return false;
    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(raw)) return false;
    var url;
    try { url = new URL(a.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    if (!/\.html$/.test(url.pathname) && !/\/$/.test(url.pathname)) return false;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
    return true;
  }

  function applyScroll(target, isPop) {
    if (target.hash) {
      var el = document.getElementById(decodeURIComponent(target.hash.slice(1)));
      if (el) { el.scrollIntoView(); return; }
    }
    if (isPop && scrollByUrl.has(target.href)) window.scrollTo(0, scrollByUrl.get(target.href));
    else window.scrollTo(0, 0);
  }

  function navigate(rawUrl, opts) {
    opts = opts || {};
    var target;
    try { target = new URL(rawUrl, location.href); } catch (e) { location.href = rawUrl; return; }

    var seq = ++navSeq;
    var stale = function () { return seq !== navSeq; };

    if (activeVT && activeVT.skipTransition) { try { activeVT.skipTransition(); } catch (e) {} }

    scrollByUrl.set(location.href, window.scrollY);
    document.documentElement.classList.add('is-navigating');

    fetch(target.href, { headers: { 'X-Requested-With': 'ds-router' }, credentials: 'same-origin' })
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.text();
      })
      .then(function (html) {
        if (stale()) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newMain = doc.querySelector('#main-content');
        if (!newMain) { location.href = target.href; return; }

        var cssJobs = [];
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
          cssJobs.push(loadCss(abs(l.getAttribute('href'), target.href)));
        });
        // Reconcilia els <style> de <head>: bug real (2026-09-12) — es
        // limitava a AFEGIR els que faltaven i no treia mai els de la
        // pàgina anterior (p. ex. el bloc `body{overflow:hidden;height:
        // 100vh}` propi de mapa.html es quedava per sempre en tornar a
        // "A prop"/"Explora", bloquejant-hi tot el scroll de la pàgina —
        // "el header tapa el fons i no puc fer scroll"). Ara el <head>
        // acaba tenint exactament els <style> d'aquesta pàgina, ni un
        // més ni un menys.
        var wantedKeys = new Set();
        doc.querySelectorAll('head style').forEach(function (st) {
          var k = strHash(st.textContent);
          wantedKeys.add(k);
          if (!styleEls.has(k)) {
            var el = document.createElement('style');
            el.textContent = st.textContent;
            document.head.appendChild(el);
            styleEls.set(k, el);
          }
        });
        styleEls.forEach(function (el, k) {
          if (!wantedKeys.has(k)) {
            el.remove();
            styleEls.delete(k);
          }
        });

        return Promise.all(cssJobs).then(function () {
          if (stale()) return;

          var swap = function () {
            document.title = doc.title || document.title;
            var newBc = doc.querySelector('.ds-breadcrumb');
            var oldBc = document.querySelector('.ds-breadcrumb');
            if (newBc && oldBc) {
              oldBc.replaceChildren.apply(oldBc, Array.prototype.map.call(
                document.importNode(newBc, true).childNodes, function (n) { return n; }
              ));
            }
            var oldMain = document.querySelector('#main-content');
            oldMain.replaceWith(document.importNode(newMain, true));
          };

          var afterSwap = function () {
            if (stale()) return;
            if (!opts.pop) history.pushState({ dsRouter: true }, '', target.href);
            lastPath = location.pathname + location.search;

            var srcs = [];
            doc.querySelectorAll('script[src]').forEach(function (s) {
              srcs.push(abs(s.getAttribute('src'), target.href));
            });
            var chain = Promise.resolve();
            srcs.forEach(function (src) { chain = chain.then(function () { return loadJs(src); }); });

            return chain.then(function () {
              document.dispatchEvent(new CustomEvent('ds:navigated', { detail: { url: target.href } }));
              if (window.DSTabs) window.DSTabs.init();
              applyScroll(target, opts.pop);
              var m = document.querySelector('#main-content');
              if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
              document.documentElement.classList.remove('is-navigating');
            });
          };

          if (document.startViewTransition && !opts.noVT && document.visibilityState === 'visible') {
            try {
              activeVT = document.startViewTransition(swap);
              activeVT.finished.catch(function () {}).then(function () { activeVT = null; });
              return activeVT.updateCallbackDone.then(afterSwap, afterSwap);
            } catch (e) {
              activeVT = null;
            }
          }
          swap();
          return afterSwap();
        });
      })
      .catch(function () {
        document.documentElement.classList.remove('is-navigating');
        location.href = target.href;
      });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!isInternalPageLink(a)) return;
    e.preventDefault();
    if (a.href === location.href) return;
    navigate(a.href);
  });

  var lastPath = location.pathname + location.search;
  window.addEventListener('popstate', function () {
    var now = location.pathname + location.search;
    if (now === lastPath) return; // només ha canviat el hash → ho gestiona la pàgina
    lastPath = now;
    navigate(location.href, { pop: true });
  });

  history.replaceState({ dsRouter: true }, '', location.href);

  window.DSRouter = { navigate: navigate };
})();
