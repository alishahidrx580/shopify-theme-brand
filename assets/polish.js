/**
 * THE EDIT — polish.js
 *
 * Pauses the looping marquees (brand strip, trust ticker, announcement bar)
 * while their section is off screen. A continuously running animation never
 * lets the main thread idle, which costs INP on mid-range Android.
 *
 * Important: we observe the section, never the track. A marquee track is
 * translated by its own animation and routinely sits outside the viewport,
 * so observing it directly would pause it permanently and freeze it
 * off-screen.
 *
 * Reverting: remove the polish.js <script> line in layout/theme.liquid.
 */
(function () {
  'use strict';

  var SELECTOR = [
    '.home-announcement-bar__messages',
    '.home-brand-logos__track',
    '.home-marquee__track'
  ].join(',');

  function init() {
    var tracks = document.querySelectorAll(SELECTOR);
    if (!tracks.length || !('IntersectionObserver' in window)) return;

    var hosts = [];
    Array.prototype.forEach.call(tracks, function (track) {
      var host = track.closest('.shopify-section') || track.parentElement;
      if (host && hosts.indexOf(host) === -1) hosts.push(host);
    });
    if (!hosts.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var inner = entry.target.querySelectorAll(SELECTOR);
        Array.prototype.forEach.call(inner, function (track) {
          track.classList.toggle('is-paused', !entry.isIntersecting);
        });
      });
    }, { rootMargin: '200px 0px' });

    hosts.forEach(function (host) { io.observe(host); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* -----------------------------------------------------------------
   Image load fade
   Lazy images snapped in at full strength while the page was
   scrolling. The hidden state is applied HERE, never in the
   stylesheet, so if this script never runs every image renders
   exactly as before. Three separate escapes clear it as well -
   the load event, an error, and a timeout - because an image
   stuck at zero opacity would be a missing product photo.
   ----------------------------------------------------------------- */
(function () {
  var SKIP = 'product-card__img--secondary';
  var pending = false;

  function settle(img) {
    img.classList.remove('pol-loading');
  }

  function track(img) {
    if (img.dataset.polFade) return;
    img.dataset.polFade = '1';
    if (img.classList.contains(SKIP)) return;
    if (img.getAttribute('fetchpriority') === 'high' || img.getAttribute('loading') === 'eager') return;
    if (img.complete && img.naturalWidth) return;
    img.classList.add('pol-fade', 'pol-loading');
    img.addEventListener('load', function () { settle(img); }, { once: true });
    img.addEventListener('error', function () { settle(img); }, { once: true });
    setTimeout(function () { settle(img); }, 3000);
  }

  function scan() {
    pending = false;
    Array.prototype.forEach.call(document.images, track);
  }

  function queue() {
    if (pending) return;
    pending = true;
    setTimeout(scan, 120);
  }

  function clearAll() {
    var stuck = document.querySelectorAll('img.pol-loading');
    Array.prototype.forEach.call(stuck, settle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.addEventListener('load', function () {
    scan();
    setTimeout(clearAll, 1500);
  });

  if ('MutationObserver' in window) {
    new MutationObserver(queue).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();

/* ------------------------------------------------------------------
   Fixed header offset
   The announcement bar and header are both position:fixed, so the
   space they cover is measured here and published as --header-height.
   Every section that clears the header (and the sticky blocks that sit
   below it) reads this one variable.
   ------------------------------------------------------------------ */
(function () {
  var root = document.documentElement;

  function measure() {
    var header = document.querySelector('.header');
    if (!header) return;
    var top = parseFloat(getComputedStyle(header).top) || 0;
    var total = Math.round(top + header.offsetHeight);
    if (total > 0) root.style.setProperty('--header-height', total + 'px');
  }

  function init() {
    measure();
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(measure);
      var header = document.querySelector('.header');
      var bar = document.querySelector('.home-announcement-bar');
      if (header) ro.observe(header);
      if (bar) ro.observe(bar);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
(function () { var d = document.querySelector('.cart-drawer'); if (!d || !('inert' in d)) return; var sync = function () { d.inert = d.getAttribute('aria-hidden') === 'true'; }; sync(); new MutationObserver(sync).observe(d, { attributes: true, attributeFilter: ['aria-hidden'] }); })();
(function () { function fix() { document.querySelectorAll('a.gfa-copyright:not([aria-label])').forEach(function (a) { a.setAttribute('aria-label', 'Powered by GSC Themes'); }); document.querySelectorAll('.jm-expanded-media-grid__container[role="list"]').forEach(function (c) { c.removeAttribute('role'); }); document.querySelectorAll('.jm-expanded-media-grid__item[role="listitem"]').forEach(function (b) { b.removeAttribute('role'); }); } var t; var mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(fix, 200); }); fix(); mo.observe(document.documentElement, { childList: true, subtree: true }); })();
/* Mobile product gallery: thumbnail strip + small prev/next buttons */
;(function () {
  function init(root) {
    var gal = (root || document).querySelector('.main-product__gallery');
    if (!gal || gal.getAttribute('data-pg-ready')) return;
    var track = gal.querySelector('[data-gallery-track]');
    if (!track) return;
    var tiles = track.querySelectorAll('[data-gallery-tile]');
    if (tiles.length < 2) return;
    gal.setAttribute('data-pg-ready', '1');

    var strip = document.createElement('div');
    strip.className = 'pg-thumbs';
    var thumbs = [];
    Array.prototype.forEach.call(tiles, function (tile, i) {
      var img = tile.querySelector('img');
      if (!img) return;
      var src = img.currentSrc || img.getAttribute('src') || (img.getAttribute('srcset') || '').split(',')[0].trim().split(' ')[0] || '';
      src = src.replace(/([?&])width=\d+/, '$1width=160');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pg-thumb';
      b.setAttribute('aria-label', 'Show image ' + (i + 1));
      var t = document.createElement('img');
      t.src = src;
      t.alt = '';
      t.loading = 'lazy';
      t.decoding = 'async';
      b.appendChild(t);
      b.addEventListener('click', function () { go(i); });
      strip.appendChild(b);
      thumbs[i] = b;
    });

    function mk(cls, label, path) {
      var n = document.createElement('button');
      n.type = 'button';
      n.className = 'pg-nav ' + cls;
      n.setAttribute('aria-label', label);
      n.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/></svg>';
      return n;
    }
    var prev = mk('pg-prev', 'Previous image', 'M15 5l-7 7 7 7');
    var next = mk('pg-next', 'Next image', 'M9 5l7 7-7 7');

    function idx() { return Math.round(track.scrollLeft / (track.clientWidth || 1)); }
    function go(i) {
      i = Math.max(0, Math.min(tiles.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    }
    function sync() {
      var i = Math.min(idx(), tiles.length - 1);
      thumbs.forEach(function (b, k) {
        var on = k === i;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-current', on ? 'true' : 'false');
      });
      prev.disabled = i <= 0;
      next.disabled = i >= tiles.length - 1;
      var a = thumbs[i];
      if (a && strip.scrollWidth > strip.clientWidth) {
        strip.scrollTo({ left: a.offsetLeft - (strip.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' });
      }
    }
    function place() {
      var h = track.offsetHeight;
      if (h) prev.style.top = next.style.top = (h / 2 - 16) + 'px';
    }

    prev.addEventListener('click', function () { go(idx() - 1); });
    next.addEventListener('click', function () { go(idx() + 1); });
    var tk;
    track.addEventListener('scroll', function () { clearTimeout(tk); tk = setTimeout(sync, 60); }, { passive: true });
    window.addEventListener('resize', place);
    if (window.ResizeObserver) new ResizeObserver(place).observe(track);

    gal.appendChild(prev);
    gal.appendChild(next);
    gal.appendChild(strip);
    place();
    sync();
  }
  function boot() { init(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
