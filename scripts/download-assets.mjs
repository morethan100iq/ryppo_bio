import { mkdir, writeFile } from "node:fs/promises";

await mkdir("public/assets/icons", { recursive: true });
await mkdir("public/assets/fonts", { recursive: true });

const brands = [
  "github",
  "telegram",
  "python",
  "postgresql",
  "docker",
  "linux",
];
const interfaceIcons = [
  "arrow-up-right",
  "arrow-down",
  "snowflake",
  "code-2",
  "braces",
  "sparkles",
  "wind",
  "check",
  "rotate-ccw",
];
const downloads = [
  [
    "https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE",
    "public/assets/icons/LICENSE-Lucide.txt",
  ],
  ...brands.map((name) => [
    `https://cdn.jsdelivr.net/npm/simple-icons@16/icons/${name}.svg`,
    `public/assets/icons/${name}.svg`,
  ]),
  ...interfaceIcons.map((name) => [
    `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/${name === "code-2" ? "code-xml" : name}.svg`,
    `public/assets/icons/${name}.svg`,
  ]),
];
await Promise.all(
  downloads.map(async ([url, file]) => {
    const result = await fetch(url);
    if (!result.ok) throw new Error(`${result.status}: ${url}`);
    await writeFile(file, Buffer.from(await result.arrayBuffer()));
  }),
);

// Geist Mono Regular / SemiBold с Fontsource CDN, SIL Open Font License 1.1.
const fonts = [
  [
    "latin-ext",
    "https://cdn.jsdelivr.net/fontsource/fonts/geist-mono@latest/latin-ext-600-normal.woff2",
    "geist-mono-latin-ext.woff2",
    "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
  ],
  [
    "latin",
    "https://cdn.jsdelivr.net/fontsource/fonts/geist-mono@latest/latin-600-normal.woff2",
    "geist-mono-latin.woff2",
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  ],
];
let fontCSS =
  "/* Geist Mono (400, 600) — https://vercel.com/font, SIL Open Font License 1.1.\n   Локальные файлы, внешних запросов нет. */\n";
for (const [subset, url, filename, range] of fonts) {
  for (const weight of [400, 600]) {
    const fontURL = url.replace("-600-", `-${weight}-`);
    const fontFile = weight === 600 ? filename : filename.replace(".woff2", `-${weight}.woff2`);
    const result = await fetch(fontURL);
    if (!result.ok) throw new Error(`Font download failed: ${fontURL}`);
    await writeFile(
      `public/assets/fonts/${fontFile}`,
      Buffer.from(await result.arrayBuffer()),
    );
    fontCSS += `/* ${subset} */\n@font-face {\n  font-family: 'Geist Mono';\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(./${fontFile}) format('woff2');\n  unicode-range: ${range};\n}\n`;
  }
}
await writeFile("public/assets/fonts/geist-mono.css", fontCSS);
console.log(
  `Downloaded ${downloads.length} icon/license assets and ${fonts.length * 2} font files.`,
);
