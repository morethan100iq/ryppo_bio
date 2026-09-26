// Liquid Glass для кнопок и интерфейса.
// Библиотека: public/assets/liquid-glass.js (nxrix/liquid-glass, MIT).
// Работает через Live Server / http. При file:// модуль не загрузится —
// останется чистый CSS-фолбэк (.liquid-glass), страница полностью рабочая.
import LiquidGlass from "./liquid-glass.js";

const SMALL = {
  strength: 20,
  depth: 5,
  chromaticAberration: 0,
  blur: 8,
  brightness: 1,
  radius: null, // берётся из CSS border-radius элемента
};

const LARGE = {
  strength: 28,
  depth: 6,
  chromaticAberration: 0,
  blur: 8,
  brightness: 1,
  radius: null,
};

try {
  if (typeof ResizeObserver === "undefined") throw new Error("no RO");
  document.querySelectorAll("a.liquid-glass, button.liquid-glass").forEach((el) => {
    try {
      const large = el.classList.contains("contact-link");
      new LiquidGlass(el, large ? LARGE : SMALL);
    } catch {
      /* отдельный элемент пропускаем, остальные обрабатываются */
    }
  });
} catch {
  /* CSS-фолбэк в styles.css продолжает выглядеть как стекло */
}
