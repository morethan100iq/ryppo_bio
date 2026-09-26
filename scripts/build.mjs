import { mkdir, copyFile, cp, readFile, writeFile, access } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";

await mkdir("dist", { recursive: true });
for (const file of ["styles.css", "main.js"]) {
  await copyFile(file, `dist/${file}`);
}
await cp("public", "dist", { recursive: true });
const source = await readFile("index.html", "utf8");
let builtHtml = source.replaceAll('="./public/', '="./');
if (process.env.SITE_URL) {
  const siteUrl = new URL(process.env.SITE_URL);
  if (!/^https?:$/.test(siteUrl.protocol) || siteUrl.username || siteUrl.password) {
    throw new Error("SITE_URL must be a public http(s) URL without credentials.");
  }
  siteUrl.search = "";
  siteUrl.hash = "";
  if (!siteUrl.pathname.endsWith("/")) siteUrl.pathname += "/";
  const escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  builtHtml = builtHtml.replaceAll('content="./assets/og-ryppo.png"', `content="${escapeAttribute(new URL("assets/og-ryppo.png", siteUrl).href)}"`);
  builtHtml = builtHtml.replace("</head>", `  <link rel="canonical" href="${escapeAttribute(siteUrl.href)}" />\n    <meta property="og:url" content="${escapeAttribute(siteUrl.href)}" />\n  </head>`);
} else {
  console.log("SITE_URL is not set: social image URLs stay relative until a public address is chosen.");
}
await writeFile("dist/index.html", builtHtml);
const html = await readFile("dist/index.html", "utf8");
const output = resolve("dist");
const refs = new Set();
function addReference(url, parent) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(url)) return;
  const path = url.split(/[?#]/)[0];
  const target = path.startsWith("/")
    ? resolve(output, `.${path}`)
    : resolve(dirname(parent), path);
  if (!target.startsWith(output + sep)) throw new Error(`Asset outside dist: ${url}`);
  refs.add(target);
}
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  addReference(match[1], resolve(output, "index.html"));
}
// Social preview metadata is not covered by the src/href scan.
addReference("./assets/og-ryppo.png", resolve(output, "index.html"));
// Проверяем и ES-модульные импорты внутри локальных скриптов
// (например, liquid-glass-init.js -> liquid-glass.js).
for (const script of [...refs]) {
  if (!script.endsWith(".js")) continue;
  const code = await readFile(script, "utf8");
  const imports = code.matchAll(
    /(?:import\s+(?:[^'"]*?\sfrom\s+)?|import\s*\()\s*['"]([^'"]+)['"]/g,
  );
  for (const match of imports) {
    addReference(match[1], script);
  }
}
for (const path of refs) {
  await access(path);
  if (path.endsWith(".css")) {
    const stylesheet = await readFile(path, "utf8");
    for (const match of stylesheet.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
      addReference(match[1], path);
    }
  }
}
console.log(
  `Build complete: dist/ — ${refs.size} local asset references verified.`,
);
