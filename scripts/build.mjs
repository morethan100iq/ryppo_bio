import { mkdir, copyFile, cp, readFile, access } from "node:fs/promises";

await mkdir("dist", { recursive: true });
for (const file of ["index.html", "styles.css", "main.js"]) {
  await copyFile(file, `dist/${file}`);
}
await cp("public", "dist", { recursive: true });
const html = await readFile("dist/index.html", "utf8");
const css = await readFile("dist/styles.css", "utf8");
const refs = new Set([
  ...[...html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)].map((match) => match[1]),
  ...[...css.matchAll(/url\(['"]?(\/[^)'"?]+)['"]?\)/g)].map(
    (match) => match[1],
  ),
]);
for (const path of refs) {
  await access(`dist${path}`);
  if (path.endsWith(".css")) {
    const stylesheet = await readFile(`dist${path}`, "utf8");
    for (const match of stylesheet.matchAll(/url\(['"]?(\/[^)'"?]+)['"]?\)/g)) {
      refs.add(match[1]);
    }
  }
}
console.log(
  `Build complete: dist/ — ${refs.size} local asset references verified.`,
);
