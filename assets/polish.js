/**
 * THE EDIT — polish.js
 *
 * Pauses the three looping marquees (announcement bar, brand strip, trust
 * ticker) while they are off screen. A continuously running animation keeps
 * the main thread busy, which costs INP on mid-range Android. Nothing moves
 * or looks different while a track is actually in view.
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

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-paused', !entry.isIntersecting);
      });
    }, { rootMargin: '120px 0px' });

    Array.prototype.forEach.call(tracks, function (track) {
      io.observe(track);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
