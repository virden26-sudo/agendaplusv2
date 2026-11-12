const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.cwd(), "out");
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
};

function resolveFile(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  const relative = decoded.split("/").filter(Boolean).join(path.sep);
  const candidates = [relative];
  if (!path.extname(relative)) {
    candidates.push(`${relative}.html`);
    candidates.push(path.join(relative, "index.html"));
  }
  for (const candidate of candidates) {
    const file = path.resolve(root, candidate || "index.html");
    const fromRoot = path.relative(root, file);
    if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) continue;
    try { if (fs.statSync(file).isFile()) return file; } catch { /* try next static-export form */ }
  }
  return null;
}

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("Static export is missing. Run npm run build first.");
  process.exit(1);
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let pathname;
  try { pathname = new URL(request.url, "http://localhost").pathname; } catch {
    response.writeHead(400).end("Bad request");
    return;
  }
  const file = resolveFile(pathname);
  if (!file) {
    const notFound = path.join(root, "404.html");
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(notFound).pipe(response);
    return;
  }
  response.writeHead(200, {
    "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(file).pipe(response);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => console.log(`Agenda+ static site: http://localhost:${port}`));
