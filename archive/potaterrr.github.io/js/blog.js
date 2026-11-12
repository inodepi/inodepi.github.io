/* potaterrr.github.io — blog archive filter + search.
   Progressive: without this script every post is visible. */
(function () {
  "use strict";

  const root = document.getElementById("blog-tags");
  const input = document.getElementById("blog-search");
  const countEl = document.getElementById("blog-count");
  const empty = document.getElementById("archive-empty");
  const clearBtn = document.getElementById("archive-clear");
  if (!root || !input) return;

  const cards = Array.from(document.querySelectorAll(".archive-card"));
  const groups = Array.from(document.querySelectorAll(".archive-group"));
  const chips = Array.from(root.querySelectorAll("[data-tag]"));
  const total = cards.length;
  let tag = "all";

  const url = new URL(window.location.href);
  const initialTag = url.searchParams.get("tag");
  const initialQuery = url.searchParams.get("q") || "";
  if (initialTag && chips.some((c) => c.dataset.tag === initialTag)) tag = initialTag;
  input.value = initialQuery;

  const syncUrl = () => {
    const next = new URL(window.location.href);
    if (tag === "all") next.searchParams.delete("tag");
    else next.searchParams.set("tag", tag);
    const q = input.value.trim();
    if (q) next.searchParams.set("q", q);
    else next.searchParams.delete("q");
    try {
      history.replaceState(null, "", next.toString());
    } catch (e) {
      /* file:// or blocked history — filtering still works */
    }
  };

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;

    cards.forEach((card) => {
      const tags = (card.dataset.tags || "").split(/\s+/).filter(Boolean);
      const haystack = card.dataset.search || "";
      const tagMatch = tag === "all" || tags.includes(tag);
      const textMatch = !q || haystack.includes(q);
      const visible = tagMatch && textMatch;
      card.hidden = !visible;
      if (visible) shown += 1;
    });

    groups.forEach((group) => {
      const any = Array.from(group.querySelectorAll(".archive-card")).some((c) => !c.hidden);
      group.hidden = !any;
    });

    chips.forEach((chip) => {
      const active = chip.dataset.tag === tag;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });

    if (countEl) {
      countEl.textContent = shown === total ? total + " posts" : shown + " of " + total + " posts";
    }
    if (empty) empty.hidden = shown !== 0;
    syncUrl();
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      tag = chip.dataset.tag;
      apply();
    });
  });

  input.addEventListener("input", apply);
  input.addEventListener("search", apply);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) {
      input.value = "";
      apply();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      tag = "all";
      apply();
    });
  }

  apply();
})();
