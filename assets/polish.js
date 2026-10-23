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
