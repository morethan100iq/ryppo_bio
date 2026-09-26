// Обычный скрипт (не module): корректно работает через Live Server,
// http-сервер и при прямом открытии index.html через file://.
(function () {
  "use strict";

  // Keep the opening screen clean; reveal the frost control with the bio.
  const landing = document.querySelector(".landing");
  if (landing && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("at-landing", entry.intersectionRatio > 0.1);
    }, { threshold: [0, 0.1] }).observe(landing);
  } else {
    document.body.classList.remove("at-landing");
  }

  var art = document.querySelector("#ice-art");
  if (art) {
    // Если картинка не загрузилась (нет файла / битый путь) — прячем
    // битый <img>, чтобы был виден текстовый фолбэк RYPPO.
    art.addEventListener("error", function () {
      art.style.display = "none";
      if (art.parentElement) art.parentElement.classList.remove("has-ice-art");
    });
    const showArt = () => {
      // naturalWidth === 0 => файл не загрузился, фолбэк остаётся.
      if (!art.naturalWidth) return;
      art.classList.add("loaded");
      if (art.parentElement) art.parentElement.classList.add("has-ice-art");
    };
    art.addEventListener("load", showArt);
    // Для закэшированных картинок событие load может уже произойти.
    if (art.complete) showArt();
  }

  var canvas = document.querySelector("#condensation");
  if (!canvas) return;
  var context = null;
  try {
    context = canvas.getContext("2d");
  } catch {
    context = null;
  }
  // Без canvas-контекста страница остаётся полностью рабочей,
  // просто без эффекта конденсата.
  if (!context) return;

  var controls = document.querySelector(".frost-controls");
  var toggle = document.querySelector(".frost-toggle");
  var hint = document.querySelector(".frost-hint");
  if (!controls || !toggle) return;

  var fogTexture = document.createElement("canvas");
  var fogMask = document.createElement("canvas");
  var maskContext = fogMask.getContext("2d");
  if (!maskContext) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let enabled = true;
  let width = 0;
  let height = 0;
  let scale = 1;
  let frame = 0;
  let previousPoint = null;
  let lastPoint = null;
  let lastMove = 0;
  let hintTimer;

  try {
    const saved = localStorage.getItem("ryppo-frost");
    if (saved !== null) enabled = saved === "on";
  } catch {
    /* The effect also works without browser storage. */
  }

  function paintCondensation() {
    context.globalCompositeOperation = "source-over";
    const leftMist = context.createRadialGradient(
      -width * 0.12,
      height * 0.38,
      0,
      -width * 0.12,
      height * 0.38,
      width * 0.56,
    );
    leftMist.addColorStop(0, "rgba(153,202,220,.16)");
    leftMist.addColorStop(0.5, "rgba(114,173,198,.045)");
    leftMist.addColorStop(1, "rgba(101,159,181,0)");
    context.fillStyle = leftMist;
    context.fillRect(0, 0, width, height);
    const rightMist = context.createRadialGradient(
      width * 1.09,
      height * 0.35,
      0,
      width * 1.09,
      height * 0.35,
      width * 0.5,
    );
    rightMist.addColorStop(0, "rgba(143,204,226,.18)");
    rightMist.addColorStop(0.65, "rgba(125,184,207,.04)");
    rightMist.addColorStop(1, "rgba(101,159,181,0)");
    context.fillStyle = rightMist;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    paintCondensation();

    // Small, uneven condensation highlights stay at the edges to keep the bio clear.
    let seed = 37;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < Math.min(width * 0.6, 750); i++) {
      const edgeDistance = random() ** 3 * width * 0.24;
      const x = random() > 0.5 ? edgeDistance : width - edgeDistance;
      const y = random() * height;
      const radius = 0.3 + random() * 1.25;
      context.fillStyle = `rgba(174,220,239,${0.045 + random() * 0.1})`;
      context.beginPath();
      context.ellipse(
        x,
        y,
        radius,
        radius * (1 + random() * 0.5),
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    fogTexture.width = fogMask.width = canvas.width;
    fogTexture.height = fogMask.height = canvas.height;
    fogTexture.getContext("2d").drawImage(canvas, 0, 0);
    maskContext.setTransform(scale, 0, 0, scale, 0, 0);
    maskContext.fillStyle = "white";
    maskContext.fillRect(0, 0, width, height);
  }

  function renderFog() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(fogTexture, 0, 0);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(fogMask, 0, 0);
    context.globalCompositeOperation = "source-over";
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function erasePoint(x, y) {
    const radius = width < 760 ? 60 : 105;
    const brush = maskContext.createRadialGradient(
      x,
      y,
      radius * 0.1,
      x,
      y,
      radius,
    );
    brush.addColorStop(0, "rgba(0,0,0,.97)");
    brush.addColorStop(0.5, "rgba(0,0,0,.78)");
    brush.addColorStop(1, "rgba(0,0,0,0)");
    maskContext.fillStyle = brush;
    maskContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function erase() {
    frame = 0;
    if (!enabled || !lastPoint) return;
    const { x, y } = lastPoint;
    maskContext.globalCompositeOperation = "destination-out";
    if (previousPoint) {
      const distance = Math.hypot(x - previousPoint.x, y - previousPoint.y);
      const steps = Math.min(20, Math.ceil(distance / 22));
      for (let i = 1; i < steps; i++) {
        erasePoint(
          previousPoint.x + ((x - previousPoint.x) * i) / steps,
          previousPoint.y + ((y - previousPoint.y) * i) / steps,
        );
      }
    }
    erasePoint(x, y);
    previousPoint = { x, y };
    maskContext.globalCompositeOperation = "source-over";
    renderFog();
  }

  function syncControls() {
    document.body.classList.toggle("frost-disabled", !enabled);
    toggle.setAttribute("aria-pressed", String(enabled));
    if (hint) hint.classList.toggle("dismissed", !enabled);
  }

  controls.hidden = false;
  resize();
  syncControls();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  window.addEventListener(
    "pointermove",
    (event) => {
      if (!enabled || (event.pointerType === "touch" && event.buttons === 0))
        return;
      const now = performance.now();
      if (now - lastMove > 160) previousPoint = null;
      lastMove = now;
      lastPoint = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(erase);
      if (!hintTimer && hint)
        hintTimer = setTimeout(() => hint.classList.add("dismissed"), 2500);
    },
    { passive: true },
  );
  window.addEventListener(
    "pointerdown",
    (event) => {
      previousPoint = null;
      lastPoint = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(erase);
    },
    { passive: true },
  );
  window.addEventListener(
    "pointerup",
    () => {
      previousPoint = null;
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => {
    previousPoint = null;
  });
  toggle.addEventListener("click", () => {
    enabled = !enabled;
    if (enabled) resize();
    syncControls();
    try {
      localStorage.setItem("ryppo-frost", enabled ? "on" : "off");
    } catch {
      /* Optional preference. */
    }
  });
  window.setInterval(() => {
    // Restore only the wipe mask: repeated frames can never make the fog denser.
    if (enabled && !document.hidden && !reducedMotion.matches) {
      maskContext.fillStyle = "rgba(255,255,255,.035)";
      maskContext.fillRect(0, 0, width, height);
      renderFog();
    }
  }, 1800);
})();
