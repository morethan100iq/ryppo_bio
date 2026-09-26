// Reveal once on entry. No scroll listeners, animation loop or dependencies.
(function () {
  "use strict";

  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (!items.length) return;
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
    return;
  }

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

  // Keyboard focus must never land in invisible content.
  document.addEventListener("focusin", function (event) {
    var item = event.target.closest(".reveal");
    if (!item) return;
    item.classList.add("revealed");
    observer.unobserve(item);
  });

  reducedMotion.addEventListener("change", function (event) {
    if (event.matches) showAll();
  });
})();
