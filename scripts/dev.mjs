import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const production = process.argv.includes("--dist");
const root = resolve(production ? "dist" : ".");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
const port = Number(process.env.PORT || 5173);

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const publicAsset =
      relative.startsWith("assets/") || relative === "favicon.svg";
    const file = resolve(
      root,
      !production && publicAsset ? "public" : ".",
      relative,
    );
    if (
      !file.startsWith(root + sep) ||
      !["GET", "HEAD"].includes(request.method)
    ) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (!(await stat(file)).isFile() || !types[extname(file)]) {
      response.writeHead(404).end("Not found");
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)],
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Local: http://127.0.0.1:${port}`),
);
