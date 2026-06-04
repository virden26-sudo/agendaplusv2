/**
 * Next static export stores RSC payloads at route/__next.segment/__PAGE__.txt
 * but the client requests route/__next.segment.__PAGE__.txt over capacitor-electron://.
 * Duplicate flat filenames so electron-serve can resolve them.
 */
const fs = require("fs");
const path = require("path");

function fixRscPaths(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return 0;
  }

  let created = 0;

  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryPath = path.join(current, entry.name);

      if (entry.name.startsWith("__next.")) {
        const pageFile = path.join(entryPath, "__PAGE__.txt");

        if (fs.existsSync(pageFile)) {
          const flatPath = path.join(current, `${entry.name}.__PAGE__.txt`);
          if (!fs.existsSync(flatPath)) {
            fs.copyFileSync(pageFile, flatPath);
            created += 1;
          }
        }
      }

      if (entry.name === "_next") {
        continue;
      }

      walk(entryPath);
    }
  };

  walk(rootDir);
  return created;
}

const targets = [
  path.join(__dirname, "..", "out"),
  path.join(__dirname, "..", "electron", "app"),
];

let total = 0;
for (const dir of targets) {
  const count = fixRscPaths(dir);
  if (count > 0) {
    console.log(`[fix-electron-rsc] ${dir}: created ${count} flat RSC file(s)`);
  }
  total += count;
}

if (total === 0) {
  console.log("[fix-electron-rsc] No changes needed (run after npm run build).");
}
