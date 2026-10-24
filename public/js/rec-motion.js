/* REC 242 · moteur de mouvement (v1, oct. 2026, Webtinix)
   Moteur générique et léger : il ne construit aucune interface, il ne fait que poser des
   attributs (data-m-in), des propriétés CSS (--p, --i, --len) et animer des compteurs.
   Toute la direction artistique du mouvement est dans motion-<D>.css et dans les attributs
   data-m* du balisage. Sans JavaScript, sans IntersectionObserver, avec prefers-reduced-motion
   ou si le visiteur coupe les animations, aucune règle « état initial » ne s'applique :
   la page s'affiche telle qu'elle a été conçue.

   Vocabulaire (posé dans le balisage) :
   data-m="<nom>"        élément révélé à son entrée dans la fenêtre (le nom choisit l'effet en CSS)
   data-m-d="<n>"        rang dans une séquence (retard = n × pas défini en CSS)
   data-m-stagger        enfants directs numérotés --i = 0, 1, 2… pour une cascade
   data-m-scrub          reçoit --p (0 → 1) selon sa traversée de la fenêtre
   data-m-parallax="k"   reçoit --p ; la CSS en tire translateY (k = amplitude indicative)
   data-m-count          nombre animé de 0 à sa valeur affichée (valeur finale inchangée)
   data-m-draw           SVG : reçoit --len (longueur du tracé) pour un dessin progressif
   data-m-toggle         bouton qui coupe ou rétablit les animations (aria-pressed tenu à jour)
*/
(function () {
  'use strict';
  if (window.RECMotion) return;
  var doc = document, html = doc.documentElement;
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var supported = 'IntersectionObserver' in window && 'requestAnimationFrame' in window;
  var userOff = false;
  try { userOff = window.sessionStorage && sessionStorage.getItem('rec-motion') === 'off'; } catch (e) { userOff = false; }

  var seen = new WeakSet();
  var active = new Set();        // éléments scrub / parallax proches de la fenêtre
  var io = null, ioScrub = null, mo = null, raf = 0, scanQueued = false;

  function enabled() { return supported && !mqReduce.matches && !userOff; }

  function setOn(on) {
    if (on) html.setAttribute('data-motion', 'on'); else html.removeAttribute('data-motion');
    var t = doc.querySelectorAll('[data-m-toggle]');
    for (var i = 0; i < t.length; i++) t[i].setAttribute('aria-pressed', on ? 'false' : 'true');
  }

  function reveal(el) {
    if (el.hasAttribute('data-m-in')) return;
    el.setAttribute('data-m-in', '');
    if (el.hasAttribute('data-m-count')) count(el);
    var inner = el.querySelectorAll('[data-m-count]');
    for (var i = 0; i < inner.length; i++) count(inner[i]);
  }

  /* Compteur : modifie seulement la valeur du nœud texte existant, et revient
     exactement au texte d'origine à la fin. Rien n'est animé si le texte n'est pas
     un nombre simple (chiffres et espaces). */
  function count(el) {
    if (el.__recCounted || !enabled()) return;
    var node = el.firstChild;
    if (!node || node.nodeType !== 3 || el.childNodes.length !== 1) return;
    var original = node.nodeValue;
    var digits = original.replace(/[\s  ]/g, '');
    if (!/^\d{1,7}$/.test(digits)) return;
    el.__recCounted = true;
    var target = parseInt(digits, 10), start = 0;
    var dur = parseFloat(getComputedStyle(el).getPropertyValue('--m-count-ms')) || 1400;
    var sep = (original.match(/[\s  ]/) || [''])[0];
    function fmt(n) {
      var s = String(n);
      if (!sep) return s;
      return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    }
    el.setAttribute('aria-label', original.trim());
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - k, 4);
      if (!node.isConnected) return;
      node.nodeValue = k < 1 ? fmt(Math.round(start + (target - start) * e)) : original;
      if (k < 1 && html.hasAttribute('data-motion')) requestAnimationFrame(step); else node.nodeValue = original;
    }
    node.nodeValue = fmt(0);
    requestAnimationFrame(step);
  }

  function progress(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || html.clientHeight;
    var p = (vh - r.top) / (vh + r.height);
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function tick() {
    raf = 0;
    active.forEach(function (el) {
      if (!el.isConnected) { active.delete(el); return; }
      var p = Math.round(progress(el) * 1000) / 1000;
      if (el.__recP !== p) { el.__recP = p; el.style.setProperty('--p', p); }
    });
  }
  function onScroll() { if (!raf && active.size) raf = requestAnimationFrame(tick); }

  function prepare(el) {
    if (seen.has(el)) return;
    seen.add(el);
    if (el.hasAttribute('data-m-stagger')) {
      var kids = el.children;
      for (var i = 0; i < kids.length; i++) kids[i].style.setProperty('--i', i);
    }
    if (el.hasAttribute('data-m-draw') && typeof el.getTotalLength === 'function') {
      try { el.style.setProperty('--len', Math.ceil(el.getTotalLength())); } catch (e) {}
    }
    if (el.hasAttribute('data-m-scrub') || el.hasAttribute('data-m-parallax')) {
      el.style.setProperty('--p', progress(el));
      ioScrub.observe(el);
    }
    if (el.hasAttribute('data-m') || el.hasAttribute('data-m-count') || el.hasAttribute('data-m-stagger') || el.hasAttribute('data-m-draw')) {
      io.observe(el);
    }
  }

  function scan() {
    scanQueued = false;
    if (!io) return;
    var list = doc.querySelectorAll('[data-m],[data-m-stagger],[data-m-scrub],[data-m-parallax],[data-m-count],[data-m-draw]');
    for (var i = 0; i < list.length; i++) prepare(list[i]);
    var t = doc.querySelectorAll('[data-m-toggle]');
    for (var j = 0; j < t.length; j++) t[j].setAttribute('aria-pressed', html.hasAttribute('data-motion') ? 'false' : 'true');
    onScroll();
  }
  function queueScan() { if (!scanQueued) { scanQueued = true; requestAnimationFrame(scan); } }

  function revealAll() {
    var list = doc.querySelectorAll('[data-m],[data-m-stagger],[data-m-count],[data-m-draw]');
    for (var i = 0; i < list.length; i++) list[i].setAttribute('data-m-in', '');
  }

  function start() {
    if (!enabled()) { setOn(false); return; }
    io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var en = entries[i];
        if (en.isIntersecting || en.boundingClientRect.bottom < 0) { reveal(en.target); io.unobserve(en.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    ioScrub = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) active.add(entries[i].target); else active.delete(entries[i].target);
      }
      onScroll();
    }, { rootMargin: '25% 0px 25% 0px' });
    setOn(true);
    scan();
    mo = new MutationObserver(queueScan);
    mo.observe(doc.body || html, { childList: true, subtree: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('pageshow', function () { scan(); });
  }

  function stop() {
    revealAll();
    setOn(false);
    if (io) io.disconnect();
    if (ioScrub) ioScrub.disconnect();
    if (mo) mo.disconnect();
    io = ioScrub = mo = null;
    active.clear();
    window.removeEventListener('scroll', onScroll, { capture: true });
    window.removeEventListener('resize', onScroll);
  }

  doc.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('[data-m-toggle]') : null;
    if (!b) return;
    userOff = html.hasAttribute('data-motion');
    try { sessionStorage.setItem('rec-motion', userOff ? 'off' : 'on'); } catch (e) {}
    if (userOff) stop(); else { seen = new WeakSet(); start(); revealAll(); }
  });

  if (mqReduce.addEventListener) mqReduce.addEventListener('change', function () { if (mqReduce.matches) stop(); });

  window.RECMotion = { scan: queueScan, stop: stop, revealAll: revealAll, version: 1 };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
