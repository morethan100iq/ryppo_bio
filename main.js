// Progressive enhancement: all navigation links stay visible without JavaScript.
(function () {
  "use strict";
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");
  if (!header || !toggle || !nav) return;

  const mobile = window.matchMedia("(max-width: 700px)");
  let open = false;
  let lastHeaderFocus = null;

  document.addEventListener("focusin", (event) => {
    lastHeaderFocus = header.contains(event.target) ? event.target : null;
  });
  document.addEventListener("pointerdown", (event) => {
    if (!header.contains(event.target)) lastHeaderFocus = null;
  });

  function setOpen(next, restoreFocus = false) {
    open = next && mobile.matches;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    nav.classList.toggle("is-open", open);
    if (open) nav.querySelector("a").focus({ preventScroll: true });
    else if (restoreFocus) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener("click", () => setOpen(!open));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  document.addEventListener("click", (event) => {
    if (open && !header.contains(event.target)) {
      setOpen(false, nav.contains(document.activeElement));
    }
  });
  header.addEventListener("focusout", (event) => {
    if (open && !header.contains(event.relatedTarget)) setOpen(false);
  });
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link || !open) return;
    setOpen(false);
    // Preserve native hash navigation while moving focus out of the hidden menu.
    const destination = document.querySelector(link.getAttribute("href"));
    if (destination) {
      destination.setAttribute("tabindex", "-1");
      destination.focus({ preventScroll: true });
      destination.addEventListener("blur", () => destination.removeAttribute("tabindex"), { once: true });
    }
  });
  mobile.addEventListener("change", () => {
    // A media query can hide the focused control before this callback runs.
    const active = document.activeElement === document.body
      ? lastHeaderFocus
      : document.activeElement;
    setOpen(false, mobile.matches && nav.contains(active));
    if (!mobile.matches && active === toggle) nav.querySelector("a").focus({ preventScroll: true });
  });

  toggle.hidden = false;
  header.classList.add("menu-ready");
})();

// One-time entrances and event-driven scroll details. No animation dependencies.
(function () {
  "use strict";

  var pageTitle = document.title;
  document.addEventListener("visibilitychange", function () {
    document.title = document.hidden ? "До встречи / ryppo" : pageTitle;
  });

  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var observer;
  function showAll() {
    document.documentElement.classList.remove("reveal-ready");
    items.forEach(function (el) {
      el.classList.add("revealed");
    });
    if (observer) observer.disconnect();
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
    document.documentElement.classList.add("reveal-ready");
  }

  // Keyboard focus must never land in invisible content.
  document.addEventListener("focusin", function (event) {
    var item = event.target.closest(".reveal");
    if (!item) return;
    item.classList.add("revealed");
    if (observer) observer.unobserve(item);
  });

  var landing = document.querySelector(".landing");
  var landingImage = document.querySelector(".landing-image");
  var header = document.querySelector(".site-header");
  var footerBackTop = document.querySelector(".site-footer .back-top");
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  // Keep the original footer link and native anchor navigation intact.
  var backTop = document.createElement("a");
  backTop.className = "scroll-top";
  backTop.href = "#top";
  backTop.setAttribute("aria-label", "Наверх");
  backTop.title = "Наверх";
  document.body.appendChild(backTop);
  var frame = 0;
  var landingHeight = 0;
  var scrollRange = 0;
  var heroShift = -1;

  function measure() {
    landingHeight = landing ? landing.offsetHeight : 0;
    scrollRange = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    scheduleUpdate();
  }

  function updateScroll() {
    frame = 0;
    var y = Math.max(0, window.scrollY);
    if (header) header.classList.toggle("is-scrolled", y > 16);
    // The large footer can enter the viewport before its navigation does.
    var footerLinkRect = footerBackTop && footerBackTop.getBoundingClientRect();
    var footerLinkVisible = footerLinkRect && footerLinkRect.top >= 0 && footerLinkRect.bottom <= window.innerHeight;
    var showTop = y > Math.max(700, landingHeight) && (!footerLinkVisible || document.activeElement === backTop);
    backTop.classList.toggle("is-visible", showTop);
    // Remove it from keyboard navigation immediately, including during fade-out.
    backTop.tabIndex = showTop ? 0 : -1;

    if (!reducedMotion.matches) {
      progress.style.transform = "scaleX(" + (scrollRange ? Math.min(1, y / scrollRange) : 0) + ")";
    }
    // A small, capped drift shares this event-driven frame; no idle animation loop.
    var nextHeroShift = reducedMotion.matches ? 0 : Math.round(Math.min(y, landingHeight) * 0.045);
    nextHeroShift = Math.min(28, nextHeroShift);
    if (landingImage && nextHeroShift !== heroShift) {
      landingImage.style.setProperty("--hero-shift", nextHeroShift + "px");
      heroShift = nextHeroShift;
    }
  }

  function scheduleUpdate() {
    if (!frame) frame = window.requestAnimationFrame(updateScroll);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("pageshow", measure);
  reducedMotion.addEventListener("change", function (event) {
    if (event.matches) showAll();
    measure();
  });
  // Font swaps and reflow can change the scroll range without a window resize.
  if ("ResizeObserver" in window) {
    new ResizeObserver(measure).observe(document.body);
  } else if (document.fonts) {
    document.fonts.ready.then(measure);
  }
  measure();
})();
