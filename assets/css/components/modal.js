/* ============================================================
   design-system / components / modal.js
   Interactivitat de .ds-modal (components/modal.css). Script clàssic
   sense dependències, com skin.js / tabs.js.

   API imperativa:
     DSModal.obre(id | element, { bloqueja: true, timer: false });
     DSModal.tanca(id | element);

   - bloqueja: true (per defecte) → dialog.showModal() i Escape NO
     tanca el modal (per a operacions que no s'han d'interrompre).
     false → showModal() però Escape tanca com de costum.
   - timer: true → busca [data-ds-modal-timer] dins el modal i hi
     compta mm:ss des de l'obertura fins que es tanca.

   Enllaç declaratiu (sense escriure JS):
     <button data-ds-modal-open="ID">                obre (bloquejant)
     <button data-ds-modal-open="ID"
             data-ds-modal-mode="lliure">            obre (Escape tanca)
     <button data-ds-modal-open="ID"
             data-ds-modal-timer-start>              obre i arrenca el cronòmetre
     qualsevol element amb [data-ds-modal-close] dins un .ds-modal el tanca.
   ============================================================ */

(function () {
  var timers = new WeakMap();

  function resol(t) {
    return typeof t === 'string' ? document.getElementById(t) : t;
  }

  function pinta(el, segons) {
    el.textContent = Math.floor(segons / 60) + ':' + String(segons % 60).padStart(2, '0');
  }

  function arrencaTimer(dlg) {
    var el = dlg.querySelector('[data-ds-modal-timer]');
    if (!el) return;
    aturaTimer(dlg);
    var t0 = Date.now();
    pinta(el, 0);
    timers.set(dlg, setInterval(function () {
      pinta(el, Math.floor((Date.now() - t0) / 1000));
    }, 1000));
  }

  function aturaTimer(dlg) {
    var id = timers.get(dlg);
    if (id) {
      clearInterval(id);
      timers.delete(dlg);
    }
  }

  function obre(target, opts) {
    var dlg = resol(target);
    if (!dlg) return null;
    opts = opts || {};
    dlg.__dsBloqueja = opts.bloqueja !== false;

    if (!dlg.__dsWired) {
      dlg.__dsWired = true;
      dlg.addEventListener('cancel', function (e) {
        if (dlg.__dsBloqueja) e.preventDefault();
      });
      dlg.addEventListener('close', function () {
        aturaTimer(dlg);
      });
    }

    if (opts.timer) arrencaTimer(dlg);
    try {
      dlg.showModal();
    } catch (e) {
      dlg.setAttribute('open', '');
    }
    return dlg;
  }

  function tanca(target) {
    var dlg = resol(target);
    if (!dlg) return;
    aturaTimer(dlg);
    try {
      dlg.close();
    } catch (e) {
      dlg.removeAttribute('open');
    }
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-ds-modal-open]');
    if (opener) {
      obre(opener.getAttribute('data-ds-modal-open'), {
        bloqueja: opener.getAttribute('data-ds-modal-mode') !== 'lliure',
        timer: opener.hasAttribute('data-ds-modal-timer-start')
      });
      return;
    }
    var closer = event.target.closest('[data-ds-modal-close]');
    if (closer) {
      var dlg = closer.closest('.ds-modal');
      if (dlg) tanca(dlg);
    }
  });

  window.DSModal = { obre: obre, tanca: tanca };
})();
