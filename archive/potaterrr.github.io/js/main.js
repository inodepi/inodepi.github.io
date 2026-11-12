/* potaterrr.github.io — vanilla JS, no dependencies.
   Sections: year, reveals, theme, FAB easter egg, contour background,
   rail scrollspy, mobile tab bar, intro overlay, accessibility menu,
   post progress/TOC and the blog archive filters (see js/blog.js). */


/* ---------- Analytics (optional) ----------
   Paste a Microsoft Clarity project ID below to turn on free, cookie-free
   visit and click analytics on every page. Leave "" to keep it off. */
const CLARITY_ID = "za53l6q4or";
if (CLARITY_ID) {
  (function (c, l, a, r, i) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    const t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_ID);
}
const scrollToTarget = (target, behavior) => {
  if (!target) return;
  target.scrollIntoView({ behavior });
};

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let motionPref = false;
  try { motionPref = localStorage.getItem("reduce-motion") === "1"; } catch (e) { /* noop */ }
  const stillMotion = reduceMotion || motionPref || document.documentElement.classList.contains("reduce-motion");
  const heroVideo = document.querySelector(".hero-video video");
  if (heroVideo) {
    if (stillMotion) {
      heroVideo.autoplay = false;
      heroVideo.pause();
    } else {
      const playing = heroVideo.play();
      if (playing && playing.catch) playing.catch(() => {});
    }
  }
  /* Hero promo: muted backdrop; a click anywhere in the hero opens it with sound. */
  const promoDialog = document.getElementById("hero-promo-dialog");
  const promoPlayer = document.getElementById("hero-promo-player");
  const hero = document.querySelector(".hero-bento");
  const heroBackdrop = document.querySelector(".hero-video video");
  const heroTrigger = document.querySelector(".hero-video");
  const openPromo = () => {
    if (!promoDialog || !promoPlayer) return;
    if (typeof promoDialog.showModal !== "function") {
      window.open("/assets/videos/home-promo.mp4", "_blank", "noopener");
      return;
    }
    if (!promoDialog.open) promoDialog.showModal();
    // always play the film from the top, title card included
    const restart = () => {
      if (!promoPlayer.duration) return;
      try { promoPlayer.currentTime = 0; } catch (e) { /* not seekable yet */ }
    };
    if (promoPlayer.readyState >= 1) restart();
    else promoPlayer.addEventListener("loadedmetadata", restart, { once: true });
    promoPlayer.muted = false;
    const playing = promoPlayer.play();
    if (playing && playing.catch) playing.catch(() => {});
  };
  if (hero && promoDialog) {
    hero.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;   // CTAs and the video control keep their own job
      openPromo();
    });
    if (heroTrigger) heroTrigger.addEventListener("click", openPromo);
    promoDialog.addEventListener("click", (event) => {
      if (event.target === promoDialog) promoDialog.close();
    });
    promoDialog.addEventListener("close", () => {
      promoPlayer.pause();
      if (heroTrigger) heroTrigger.focus();
    });
    promoDialog.querySelector(".hero-promo-close").addEventListener("click", () => promoDialog.close());
  }
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- Contour background (hero canvas) ---------- */
  const canvas = document.getElementById("contour");
  if (canvas && !stillMotion && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      let raf = null;
      let running = true;
      let last = 0;
      // Frame-rate governor: slow machines get a quieter canvas.
      let frameTimes = [];
      let lowPerf = false;
      const ACCENT = [240, 180, 41];
      const GREEN = [46, 168, 134];

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      };

      // Cheap pseudo-noise via layered sines (no library, no per-pixel math).
      const field = (x, y, t) =>
        Math.sin(x * 0.0032 + t * 0.28) +
        Math.sin(y * 0.0041 - t * 0.21) +
        Math.sin((x + y) * 0.0018 + t * 0.15) +
        Math.sin(Math.hypot(x - canvas.width * 0.7, y - canvas.height * 0.3) * 0.0025 - t * 0.3);

      const draw = (ts) => {
        raf = requestAnimationFrame(draw);
        const t = ts / 1000;
        if (t - last < (lowPerf ? 0.1 : 0.05)) return; // cap ~20/10 fps
        const dt = t - last;
        last = t;

        if (!lowPerf) {
          frameTimes.push(dt);
          if (frameTimes.length > 40) {
            const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            if (avg > 0.06) lowPerf = true; // < ~16 fps sustained: step down
            frameTimes = [];
          }
        }

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = Math.max(1, w * 0.0012);

        const rows = lowPerf ? 7 : 11;
        const step = h / rows;
        for (let r = 0; r <= rows; r++) {
          const y0 = r * step;
          const color = r % 3 === 0 ? GREEN : ACCENT;
          ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${lowPerf ? 0.05 : 0.07})`;
          ctx.beginPath();
          for (let x = 0; x <= w; x += Math.max(6, w / 160)) {
            const n = field(x, y0, t);
            const y = y0 + n * step * 0.42;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      };

      const start = () => {
        if (raf === null && running) raf = requestAnimationFrame(draw);
      };
      const stop = () => {
        if (raf !== null) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      };

      resize();
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", () => {
        running = !document.hidden;
        if (running) start(); else stop();
      });

      // Only animate while the hero is on screen.
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(
          (entries) => {
            running = entries[0].isIntersecting && !document.hidden;
            if (running) start(); else stop();
          },
          { threshold: 0 }
        ).observe(canvas);
      } else {
        start();
      }
      start();
    }
  }

  /* ---------- Smooth in-panel anchor scrolling ---------- */
  const scrollToId = (id) => {
    scrollToTarget(document.getElementById(id), reduceMotion ? "auto" : "smooth");
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    if (!id || !document.getElementById(id)) return;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToId(id);
      history.replaceState(null, "", `#${id}`);
    });
  });

  /* ---------- Mobile tab bar: hide on scroll down, show on scroll up ---------- */
  const tabbar = document.querySelector(".tabbar");
  if (tabbar) {
    let lastY = window.scrollY;
    let goingDown = false;
    let heroCtaVisible = false;
    const heroCta = document.querySelector(".hero-cta");

    const applyTabbarState = () => {
      tabbar.classList.toggle("tabbar-hidden", heroCtaVisible || goingDown);
    };

    const onScroll = () => {
      const y = window.scrollY;
      goingDown = y > lastY && y > 120;
      lastY = y;
      applyTabbarState();
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    /* The fixed bar would otherwise cover the hero CTA at the top of the
       page. Keep it out of the way until the CTA has scrolled past. */
    if (heroCta && "IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        heroCtaVisible = entry.isIntersecting;
        applyTabbarState();
      }, { threshold: 0.01 }).observe(heroCta);
    }
  }

});

/* ---------- Intro boot overlay (once per session, skipped for a week) ---------- */
(function () {
  const intro = document.getElementById("intro");
  if (!intro) return;
  const INTRO_KEY = "intro-seen";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let motionSaved = false;
  try { motionSaved = localStorage.getItem("reduce-motion") === "1"; } catch (e) { /* noop */ }
  let seen = false;
  try { seen = sessionStorage.getItem(INTRO_KEY) === "1"; } catch (e) { /* private mode — just play it */ }

  const finish = () => {
    intro.classList.add("intro-done");
    document.body.classList.remove("intro-lock");
    try { sessionStorage.setItem(INTRO_KEY, "1"); } catch (e) { /* noop */ }
    setTimeout(() => intro.remove(), 600);
  };

  if (reduce || motionSaved || seen) {
    intro.remove();
    return;
  }
  document.body.classList.add("intro-lock");
  setTimeout(finish, 900);
  intro.addEventListener("click", finish);
})();

/* ---------- Reading progress + "on this page" (long-form pages) ---------- */
(function () {
  const postBody = document.querySelector(".post-body");
  if (!postBody) return;

  const bar = document.querySelector(".post-progress-fill");
  if (bar) {
    let ticking = false;
    const update = () => {
      const rect = postBody.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      bar.style.width = (progress * 100).toFixed(2) + "%";
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    const panel = document.getElementById("main-content");
    window.addEventListener("scroll", onScroll, { passive: true });
    if (panel) panel.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  const toc = document.querySelector(".post-toc");
  const tocList = toc ? toc.querySelector("ol") : null;
  if (!toc || !tocList) return;

  const narrow = window.matchMedia("(max-width: 720px)");
  if (toc.tagName === "DETAILS" && narrow.matches) toc.removeAttribute("open");

  const headings = Array.from(postBody.querySelectorAll("h2"));
  if (headings.length < 2) {
    toc.hidden = true;
    return;
  }
  headings.forEach((heading, i) => {
    if (!heading.id) heading.id = "section-" + (i + 1);
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + heading.id;
    link.textContent = heading.textContent.trim();
    if (toc.tagName === "DETAILS") {
      link.addEventListener("click", () => {
        if (narrow.matches) toc.removeAttribute("open");
      });
    }
    item.appendChild(link);
    tocList.appendChild(item);
  });
})();

/* ---------- Potato FAB: navigate (no theme flip) ---------- */
(function () {
  const fab = document.querySelector(".potato-fab");
  if (!fab) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  fab.addEventListener("click", (e) => {
    const href = fab.getAttribute("href") || "/contact/";
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const target = document.getElementById(href.slice(1));
    if (target) scrollToTarget(target, reduce ? "auto" : "smooth");
    else window.location.hash = href;
  });
})();
