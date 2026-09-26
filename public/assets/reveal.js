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
  var footer = document.querySelector(".site-footer");
  var desktop = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
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
  var lastArtProgress = -1;

  function measure() {
    landingHeight = landing ? landing.offsetHeight : 0;
    scrollRange = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    lastArtProgress = -1;
    scheduleUpdate();
  }

  function updateScroll() {
    frame = 0;
    var y = Math.max(0, window.scrollY);
    var footerVisible = footer && footer.getBoundingClientRect().top < window.innerHeight;
    var showTop = y > Math.max(700, landingHeight) && (!footerVisible || document.activeElement === backTop);
    backTop.classList.toggle("is-visible", showTop);
    // Remove it from keyboard navigation immediately, including during fade-out.
    backTop.tabIndex = showTop ? 0 : -1;

    if (!reducedMotion.matches) {
      progress.style.transform = "scaleX(" + (scrollRange ? Math.min(1, y / scrollRange) : 0) + ")";
    }
    if (!landing || !desktop.matches || reducedMotion.matches) return;
    var amount = landingHeight ? Math.min(1, y / landingHeight) : 0;
    if (amount === lastArtProgress) return;
    lastArtProgress = amount;
    // Capped, small offsets; the baked-in artwork crop never changes.
    landing.style.setProperty("--art-offset", (amount * 48).toFixed(2) + "px");
    landing.style.setProperty("--art-scale", (1 + amount * 0.025).toFixed(4));
    landing.style.setProperty("--label-offset", (amount * 16).toFixed(2) + "px");
  }

  function scheduleUpdate() {
    if (!frame) frame = window.requestAnimationFrame(updateScroll);
  }

  function resetMotion() {
    if (landing) {
      landing.style.removeProperty("--art-offset");
      landing.style.removeProperty("--art-scale");
      landing.style.removeProperty("--label-offset");
    }
    measure();
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("pageshow", measure);
  desktop.addEventListener("change", resetMotion);
  reducedMotion.addEventListener("change", function (event) {
    if (event.matches) showAll();
    resetMotion();
  });
  // Font swaps and reflow can change the scroll range without a window resize.
  if ("ResizeObserver" in window) {
    new ResizeObserver(measure).observe(document.body);
  } else if (document.fonts) {
    document.fonts.ready.then(measure);
  }
  measure();
})();
