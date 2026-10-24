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
