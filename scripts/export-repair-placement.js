const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CATEGORY = (process.argv[2] || "").trim();
const WRITE = process.argv.includes("--write");

function slash(p) {
  return p.replace(/\\/g, "/");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      out.push(full);
    }
  }

  return out;
}

function findMatchingSection(html, openStart) {
  const re = /<\/?section\b[^>]*>/gi;
  re.lastIndex = openStart;

  let depth = 0;

  while (true) {
    const m = re.exec(html);
    if (!m) return null;

    const tag = m[0];
    const isClose = /^<\//.test(tag);

    if (!isClose) {
      depth += 1;
    } else {
      depth -= 1;

      if (depth === 0) {
        return {
          start: openStart,
          closeStart: m.index,
          end: m.index + tag.length
        };
      }
    }
  }
}

function findToolCardBounds(html) {
  const m = html.match(/<section\b[^>]*id=["']toolCard["'][^>]*>/i);
  if (!m || typeof m.index !== "number") return null;

  return findMatchingSection(html, m.index);
}

function findExportButtonIndex(html) {
  const m = html.match(/id=["']exportReport["']/i);
  return m && typeof m.index === "number" ? m.index : -1;
}

function findEnclosingSectionBounds(html, index) {
  const openRe = /<section\b[^>]*>/gi;
  let best = null;

  while (true) {
    const m = openRe.exec(html);
    if (!m) break;
    if (m.index > index) break;

    const bounds = findMatchingSection(html, m.index);
    if (!bounds) continue;

    if (bounds.start <= index && bounds.end >= index) {
      if (!best || bounds.start > best.start) {
        best = bounds;
      }
    }
  }

  return best;
}

function repairFile(absPath) {
  const original = fs.readFileSync(absPath, "utf8");
  let html = original;

  const exportIndex = findExportButtonIndex(html);

  if (exportIndex < 0) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "SKIPPED",
      reason: "No #exportReport found"
    };
  }

  const toolBounds = findToolCardBounds(html);

  if (!toolBounds) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "SKIPPED",
      reason: "No #toolCard section found"
    };
  }

  if (exportIndex >= toolBounds.start && exportIndex <= toolBounds.end) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "OK",
      reason: "Export card already inside #toolCard"
    };
  }

  const exportBounds = findEnclosingSectionBounds(html, exportIndex);

  if (!exportBounds) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "SKIPPED",
      reason: "Could not locate enclosing export section"
    };
  }

  const exportBlock = html.slice(exportBounds.start, exportBounds.end).trimEnd();

  // Remove misplaced export card.
  html = `${html.slice(0, exportBounds.start)}${html.slice(exportBounds.end)}`;

  // Recalculate toolCard bounds after removal.
  const newToolBounds = findToolCardBounds(html);

  if (!newToolBounds) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "SKIPPED",
      reason: "No #toolCard after export removal"
    };
  }

  // Insert export card immediately before closing #toolCard.
  html = `${html.slice(0, newToolBounds.closeStart)}\n${exportBlock}\n${html.slice(newToolBounds.closeStart)}`;

  const changed = html !== original;

  if (changed && WRITE) {
    fs.writeFileSync(absPath, html, "utf8");
  }

  return {
    file: slash(path.relative(ROOT, absPath)),
    status: changed ? (WRITE ? "REPAIRED" : "WOULD_REPAIR") : "UNCHANGED",
    reason: "Moved export card into #toolCard"
  };
}

function main() {
  if (!CATEGORY) {
    console.error("Usage:");
    console.error("  node scripts/export-repair-placement.js compute --dry-run");
    console.error("  node scripts/export-repair-placement.js compute --write");
    process.exit(1);
  }

  const categoryDir = path.join(ROOT, "tools", CATEGORY);

  if (!fs.existsSync(categoryDir)) {
    console.error(`Missing category directory: ${slash(categoryDir)}`);
    process.exit(1);
  }

  const files = walk(categoryDir);
  const results = files.map(repairFile);

  console.log("");
  console.log(`ScopedLabs Export Placement Repair — ${CATEGORY}`);
  console.log("---------------------------------------------");
  console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN"}`);
  console.log("");

  const counts = results.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  Object.keys(counts).sort().forEach((key) => {
    console.log(`${key}: ${counts[key]}`);
  });

  console.log("");
  results.forEach((row) => {
    console.log(`${row.status.padEnd(12)} ${row.file} — ${row.reason}`);
  });

  console.log("");

  if (!WRITE) {
    console.log("No files modified. Run with --write after review.");
  } else {
    console.log("Files repaired. Run audit and test category.");
  }

  console.log("");
}

main();