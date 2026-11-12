/* Quick tour: a guided, cancellable scroll through the home page's sections. */
(function () {
  var btn = document.querySelector('[data-quick-tour]');
  if (!btn) return;
  var stops = ['#proof', '#how', '#background'].map(function (s) { return document.querySelector(s); }).filter(Boolean);
  if (!stops.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var running = false, cancelled = false, frame = 0, timer = 0;

  function navOffset() {
    var nav = document.querySelector('.section-nav');
    return (nav ? nav.getBoundingClientRect().height : 0) + 10;
  }

  function jump(y) {
    try { window.scrollTo({ top: y, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
  }

  function animateTo(y, ms, done) {
    var start = window.scrollY, delta = y - start, t0 = 0;
    if (reduce || ms <= 0) { jump(y); return done && done(); }
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / ms);
      var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      jump(start + delta * e);
      if (k < 1 && !cancelled) frame = requestAnimationFrame(step);
      else if (!cancelled && done) done();
    }
    frame = requestAnimationFrame(step);
  }

  function stop() {
    cancelled = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    running = false;
    btn.setAttribute('aria-pressed', 'false');
  }

  function run(i) {
    if (cancelled) return;
    if (i >= stops.length) { stop(); return; }
    var y = Math.max(0, stops[i].getBoundingClientRect().top + window.scrollY - navOffset());
    animateTo(y, 900, function () {
      timer = setTimeout(function () { run(i + 1); }, 700);
    });
  }

  btn.addEventListener('click', function () {
    if (running) { stop(); return; }
    cancelled = false;
    running = true;
    btn.setAttribute('aria-pressed', 'true');
    animateTo(0, 300, function () {
      timer = setTimeout(function () { run(0); }, 350);
    });
  });

  ['wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (running) stop(); }, { passive: true });
  });
  document.addEventListener('keydown', function (e) { if (running && e.key === 'Escape') stop(); });
  document.addEventListener('click', function (e) {
    if (running && e.target.closest('.section-nav a')) stop();
  }, true);
})();
