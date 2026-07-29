/* =========================================================
   REZIDENCE PADOCHOV — spotlight výběr domů (v8)
   Najetí na dům → nasvícená kopie rendru se ořízne do siluety
   toho domu, rozsvítí se a zvedne z paty; okolí ztmavne.
   Bez JS: SVG odkazy fungují (klik → detail).
   ========================================================= */
(function () {
  var stage = document.querySelector('.stage');
  if (!stage) return;
  var spot = stage.querySelector('.stage__spot');
  var coarse = window.matchMedia('(hover: none)').matches;

  // silueta domu (clip-path) + pata pro transform-origin
  var HOUSES = {
    '01': { clip: 'polygon(20.31% 37.73%, 29.17% 33.62%, 40.1% 41.83%, 40.1% 65.9%, 33.85% 73.73%, 23.7% 66.86%, 20.31% 53.49%)', ox: '33.85%', oy: '73.73%' },
    '02': { clip: 'polygon(39.58% 27.22%, 52.6% 34.38%, 52.6% 65.9%, 41.67% 68.29%, 40.1% 65.9%, 40.1% 41.83%, 29.17% 33.62%)', ox: '44.79%', oy: '68.29%' },
    '03': { clip: 'polygon(52.08% 24.36%, 61.46% 27.7%, 61.46% 57.31%, 52.6% 63.99%, 52.6% 34.38%)', ox: '52.6%', oy: '63.99%' },
    '04': { clip: 'polygon(62.5% 14.33%, 70.83% 22.45%, 70.83% 42.98%, 61.46% 44.89%, 61.46% 28.65%)', ox: '66.15%', oy: '44.89%' },
    '05': { clip: 'polygon(70.83% 14.33%, 79.43% 20.06%, 79.43% 41.07%, 70.83% 42.98%, 70.83% 22.45%)', ox: '75.13%', oy: '42.98%' },
    '06': { clip: 'polygon(79.43% 14.33%, 88.02% 20.53%, 88.02% 39.16%, 79.43% 41.07%, 79.43% 20.06%)', ox: '83.72%', oy: '41.07%' }
  };

  function enter(id) {
    var h = HOUSES[id];
    if (!h) return;
    spot.style.webkitClipPath = h.clip;
    spot.style.clipPath = h.clip;
    spot.style.transformOrigin = h.ox + ' ' + h.oy;
    stage.classList.add('is-hover');
  }
  function leave() { stage.classList.remove('is-hover'); }

  if (!coarse) {
    Array.prototype.slice.call(stage.querySelectorAll('.hz')).forEach(function (z) {
      z.addEventListener('mouseenter', function () { enter(z.getAttribute('data-id')); });
    });
    stage.addEventListener('mouseleave', leave);
  }
})();
