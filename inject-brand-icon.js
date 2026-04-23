const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".vscode",
  "dist",
  "build",
  ".cache",
  "ARCHIVED"
]);

const OLD_BLOCK = `<a class="brand" href="/" aria-label="ScopedLabs Home">
      <span class="brand-dot" aria-hidden="true"></span>
      <span class="brand-name">ScopedLabs</span>
    </a>`;

const NEW_BLOCK = `<a class="brand" href="/" aria-label="ScopedLabs Home">
      <span class="brand-dot" aria-hidden="true"></span>
      <span class="brand-icon-wrap" aria-hidden="true">
        <img
          class="brand-icon"
          src="/assets/favicon/favicon-32x32.png?v=1"
          alt=""
          width="32"
          height="32"
        />
      </span>
      <span class="brand-name">ScopedLabs</span>
    </a>`;

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const files = walk(ROOT);
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");

    if (!original.includes(OLD_BLOCK)) {
      skipped++;
      continue;
    }

    const replaced = original.replace(OLD_BLOCK, NEW_BLOCK);

    if (replaced !== original) {
      fs.writeFileSync(file, replaced, "utf8");
      console.log(`UPDATED: ${file}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Updated ${updated} file(s), skipped ${skipped}.`);
}

main();