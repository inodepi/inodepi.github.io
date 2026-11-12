/* Section nav: builds a chip bar from a page's own sections, tracks the one you're reading,
   centres the active chip, and lets a desktop wheel move the bar. */
(function () {
  var nav = document.querySelector('.section-nav');
  var inner, links, sections, built = false;

  if (!nav) {
    var blocks = Array.prototype.slice.call(document.querySelectorAll('.project-main section.project-block, section.proj-section'));
    var items = blocks.map(function (b) {
      var h = b.querySelector('h2');
      if (!h) return null;
      if (!b.id) b.id = h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return { id: b.id, label: h.textContent.trim() };
    }).filter(Boolean);
    if (!items.length) return;
    nav = document.createElement('nav');
    nav.className = 'section-nav auto';
    nav.setAttribute('aria-label', 'On this page');
    inner = document.createElement('div');
    inner.className = 'container section-nav-inner';
    items.forEach(function (it) {
      var a = document.createElement('a');
      a.href = '#' + it.id;
      a.textContent = it.label;
      a.setAttribute('data-section', it.id);
      inner.appendChild(a);
    });
    nav.appendChild(inner);
    var body = document.querySelector('.project-body, .proj-main, main.container');
    if (!body) return;
    body.parentNode.insertBefore(nav, body);
    built = true;
  }

  inner = nav.querySelector('.section-nav-inner');
  if (!inner) return;
  links = Array.prototype.slice.call(nav.querySelectorAll('a[data-section]'));
  sections = links.map(function (l) { return document.getElementById(l.getAttribute('data-section')); }).filter(Boolean);
  if (!sections.length) return;


  function setActive(id) {
    links.forEach(function (l) {
      var on = l.getAttribute('data-section') === id;
      l.classList.toggle('active', on);
      if (on) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
      if (on) centre(l);
    });
  }

  function centre(link) {
    var lr = link.getBoundingClientRect(), ir = inner.getBoundingClientRect();
    var target = inner.scrollLeft + (lr.left - ir.left) - (inner.clientWidth - lr.width) / 2;
    if (Math.abs(target - inner.scrollLeft) > 4) inner.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }

  function edges() {
    var max = inner.scrollWidth - inner.clientWidth;
    nav.classList.toggle('has-left', inner.scrollLeft > 2);
    nav.classList.toggle('has-right', inner.scrollLeft < max - 2);
  }

  function update() {
    var offset = nav.getBoundingClientRect().bottom + 18;
    var current = sections[0].id;
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top - offset <= 0) current = s.id;
    });
    setActive(current);
    edges();
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  inner.addEventListener('scroll', edges, { passive: true });
  inner.addEventListener('wheel', function (e) {
    if (inner.scrollWidth <= inner.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      inner.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  update()
})();
