/*!
 * Liquid Glass for the web — https://github.com/nxrix/liquid-glass
 * Copyright (c) 2026 nxrix, MIT License (see liquid-glass.LICENSE.txt).
 * Vendored locally: no CDN requests, works offline and via Live Server.
 */
const SVG = "http://www.w3.org/2000/svg";

const NO_SVG_BACKDROP =
  /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) &&
  !/Chrome\/|Chromium|Edg\//.test(navigator.userAgent);

export default class LiquidGlass {
  static n = 0;
  //rev = 0;
  constructor(el, options = {}) {
    this.el = el;
    this.o = {
      strength: 64,
      depth: 8,
      chromaticAberration: 3,
      blur: 1,
      brightness: 0.9,
      radius: null,
      ...options,
    };
    this.holder = document.createElementNS(SVG, "svg");
    this.holder.setAttribute("width", 0);
    this.holder.setAttribute("height", 0);
    this.holder.style.display = "none";
    //document.body.append(this.holder);
    const root = el.getRootNode();
    (root instanceof ShadowRoot ? root : document.body).append(this.holder);
    this.ro = new ResizeObserver(() => {
      this.#map();
      this.#surface();
    });
    this.ro.observe(el);
    this.#build();
    this.#surface();
  }

  set(patch = {}) {
    const prev = this.o;
    this.o = { ...prev, ...patch };
    if ((prev.chromaticAberration > 0) !== (this.o.chromaticAberration > 0))
      this.#chain();
    else if (
      prev.strength !== this.o.strength ||
      prev.chromaticAberration !== this.o.chromaticAberration
    ) this.#scales();
    if (prev.radius !== this.o.radius || prev.depth !== this.o.depth)
      this.#map();
    this.#surface();
    return this;
  }

  destroy() {
    this.ro.disconnect();
    this.holder.remove();
    this.el.style.backdropFilter = "";
    this.el.style.setProperty("-webkit-backdrop-filter", "");
    //this.el.style.borderRadius = "";
  }

  #radius() {
    return this.o.radius??parseFloat(getComputedStyle(this.el).borderTopLeftRadius||0);
  }

  #build() {
    this.id ||= `liquid-glass-${++LiquidGlass.n}`;
    this.holder.innerHTML = `
      <filter id="${this.id}" color-interpolation-filters="sRGB">
        <feImage x="0" y="0" preserveAspectRatio="xMidYMid slice" result="map"/>
      </filter>`;
    this.filter = this.holder.firstElementChild;
    this.image = this.filter.firstElementChild;
    this.mw = this.mh = this.mr = this.md = null;
    this.#map();
    this.#chain();
  }

  #map() {
    const box = this.el.getBoundingClientRect();
    const w = Math.max(1, Math.round(box.width));
    const h = Math.max(1, Math.round(box.height));
    const depth = this.o.depth;
    const radius = Math.max(0, Math.min(this.#radius(), Math.min(w, h) / 2));
    if (w === this.mw && h === this.mh && radius === this.mr && depth === this.md)
      return;
    [this.mw, this.mh, this.mr, this.md] = [w, h, radius, depth];
    const map = encodeURIComponent(`
      <svg xmlns="${SVG}" width="${w}" height="${h}">
        <style>.m{mix-blend-mode:screen}</style>
        <defs>
          <linearGradient id="x" x1="${Math.ceil((radius / w) * 15)}%" x2="${Math.floor(100 - (radius / w) * 15)}%" y1="0" y2="0">
            <stop offset="0%" stop-color="#f00"/><stop offset="100%" stop-color="#000"/>
          </linearGradient>
          <linearGradient id="y" x1="0" x2="0" y1="${Math.ceil((radius / h) * 15)}%" y2="${Math.floor(100 - (radius / h) * 15)}%">
            <stop offset="0%" stop-color="#0f0"/><stop offset="100%" stop-color="#000"/>
          </linearGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="#808080"/>
        <g style="filter:blur(2px)">
          <rect width="${w}" height="${h}" fill="#000080"/>
          <rect width="${w}" height="${h}" fill="url(#x)" class="m"/>
          <rect width="${w}" height="${h}" fill="url(#y)" class="m"/>
          <rect x="${depth}" y="${depth}"
                width="${Math.max(1, w - 2 * depth)}" height="${Math.max(1, h - 2 * depth)}"
                fill="#808080" rx="${radius}" style="filter:blur(${depth}px)"/>
        </g>
      </svg>`);
    this.image.setAttribute("href", `data:image/svg+xml,${map}`);
    this.image.setAttribute("width", w);
    this.image.setAttribute("height", h);
  }

  #chain() {
    const { strength: s, chromaticAberration: ca } = this.o;
    const ISO = {
      r: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
      g: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
      b: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
    };
    const disp = (scale, ch) => `
      <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}"
        xChannelSelector="R" yChannelSelector="G" result="d${ch}"/>`;
    const keep = (ch) => `
      <feColorMatrix in="d${ch}" type="matrix" values="${ISO[ch]}" result="${ch}"/>`;
    const chain = ca > 0
      ? disp(s + ca * 2, "r") + keep("r") +
        disp(s + ca, "g") + keep("g") +
        disp(s, "b") + keep("b") +
        `<feBlend in="r" in2="g" mode="screen" result="rg"/>` +
        `<feBlend in="rg" in2="b" mode="screen"/>`
      : disp(s, "mono");
    while (this.filter.lastElementChild !== this.image)
      this.filter.lastElementChild.remove();
    this.filter.insertAdjacentHTML("beforeend", chain);
  }

  #scales() {
    const { strength: s, chromaticAberration: ca } = this.o;
    const scale = { dr: s + ca * 2, dg: s + ca, db: s, dmono: s };
    this.holder.querySelectorAll("feDisplacementMap").forEach((n) =>
      n.setAttribute("scale", scale[n.getAttribute("result")]));
  }

  #surface() {
    //this.filter.id = `${this.id}-${++this.rev}`;
    const { blur, brightness } = this.o;
    if (this.o.radius != null) this.el.style.borderRadius = this.#radius() + "px";
    const f = [
      !NO_SVG_BACKDROP && `url(#${this.id})`,
      blur > 0 && `blur(${blur}px)`,
      `brightness(${brightness})`,
    ].filter(Boolean).join(" ");
    this.el.style.backdropFilter = f;
    this.el.style.setProperty("-webkit-backdrop-filter", f);
  }
}

export { LiquidGlass };
