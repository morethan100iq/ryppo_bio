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
  [
    "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt",
    "public/assets/fonts/OFL-Manrope.txt",
  ],
];
await Promise.all(
  downloads.map(async ([url, file]) => {
    const result = await fetch(url);
    if (!result.ok) throw new Error(`${result.status}: ${url}`);
    await writeFile(file, Buffer.from(await result.arrayBuffer()));
  }),
);

const cssResponse = await fetch(
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
  {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  },
);
if (!cssResponse.ok) throw new Error("Could not fetch Manrope stylesheet");
const css = await cssResponse.text();
let localCSS = css;
const urls = [
  ...new Set(
    [...css.matchAll(/url\((https:[^)]+)\)/g)].map((match) => match[1]),
  ),
];
for (const [i, url] of urls.entries()) {
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Font download failed: ${url}`);
  const extension = new URL(url).pathname.split(".").pop();
  const filename = `manrope-${i}.${extension}`;
  await writeFile(
    `public/assets/fonts/${filename}`,
    Buffer.from(await result.arrayBuffer()),
  );
  localCSS = localCSS.replaceAll(url, `/assets/fonts/${filename}`);
}
await writeFile("public/assets/fonts/manrope.css", localCSS);
console.log(
  `Downloaded ${downloads.length} icon/license assets and ${urls.length} font subsets.`,
);
