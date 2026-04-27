const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CATEGORY = process.argv[2];
const WRITE = process.argv.includes("--write");

if (!CATEGORY) {
  console.error("Usage:");
  console.error("  node scripts/export-place-after-analysis.js video-storage --dry-run");
  console.error("  node scripts/export-place-after-analysis.js video-storage --write");
  process.exit(1);
}

function slash(p) {
  return p.replace(/\\/g, "/");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name === "index.html") out.push(full);
  }

  return out;
}

function findMatchingTag(html, openStart, tagName) {
  const re = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  re.lastIndex = openStart;

  let depth = 0;

  while (true) {
    const m = re.exec(html);
    if (!m) return null;

    const isClose = /^<\//.test(m[0]);

    if (!isClose) {
      depth += 1;
    } else {
      depth -= 1;

      if (depth === 0) {
        return {
          start: openStart,
          closeStart: m.index,
          end: m.index + m[0].length
        };
      }
    }
  }
}

function findElementById(html, id) {
  const re = new RegExp(`<([a-z0-9]+)\\b[^>]*id=["']${id}["'][^>]*>`, "i");
  const m = html.match(re);

  if (!m || typeof m.index !== "number") return null;

  return {
    tag: m[1].toLowerCase(),
    openStart: m.index,
    bounds: findMatchingTag(html, m.index, m[1].toLowerCase())
  };
}

function findEnclosingSection(html, index) {
  const re = /<section\b[^>]*>/gi;
  let best = null;

  while (true) {
    const m = re.exec(html);
    if (!m) break;
    if (m.index > index) break;

    const bounds = findMatchingTag(html, m.index, "section");
    if (!bounds) continue;

    if (bounds.start <= index && bounds.end >= index) {
      if (!best || bounds.start > best.start) best = bounds;
    }
  }

  return best;
}

function findAnchorBounds(html) {
  const anchors = [
    "analysis-copy",
    "results"
  ];

  let best = null;

  for (const id of anchors) {
    const idx = html.search(new RegExp(`id=["']${id}["']`, "i"));
    if (idx < 0) continue;

    const el = findElementById(html, id);
    const section = findEnclosingSection(html, idx);
    const bounds = section || el?.bounds;

    if (bounds && (!best || bounds.end > best.end)) {
      best = bounds;
    }
  }

  // Fallback: if there is a canvas chart after results, place after its enclosing section.
  const canvasIdx = html.lastIndexOf("<canvas");
  if (canvasIdx >= 0) {
    const canvasSection = findEnclosingSection(html, canvasIdx);
    if (canvasSection && (!best || canvasSection.end > best.end)) {
      best = canvasSection;
    }
  }

  return best;
}

function processFile(absPath) {
  const original = fs.readFileSync(absPath, "utf8");
  let html = original;

  const exportIndex = html.search(/id=["']exportReport["']/i);

  if (exportIndex < 0) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "SKIPPED",
      reason: "No export card"
    };
  }

  const exportBounds = findEnclosingSection(html, exportIndex);

  if (!exportBounds) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "SKIPPED",
      reason: "Could not find export section"
    };
  }

  const anchorBounds = findAnchorBounds(html);

  if (!anchorBounds) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "SKIPPED",
      reason: "Could not find analysis/results anchor"
    };
  }

  if (exportBounds.start > anchorBounds.end) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "OK",
      reason: "Export already after analysis/results"
    };
  }

  const exportBlock = html.slice(exportBounds.start, exportBounds.end).trimEnd();

  html = html.slice(0, exportBounds.start) + html.slice(exportBounds.end);

  const newAnchorBounds = findAnchorBounds(html);

  if (!newAnchorBounds) {
    return {
      file: slash(path.relative(ROOT, absPath)),
      status: "SKIPPED",
      reason: "Could not re-find analysis/results anchor"
    };
  }

  html =
    html.slice(0, newAnchorBounds.end) +
    "\n" +
    exportBlock +
    "\n" +
    html.slice(newAnchorBounds.end);

  const changed = html !== original;

  if (changed && WRITE) {
    fs.writeFileSync(absPath, html, "utf8");
  }

  return {
    file: slash(path.relative(ROOT, absPath)),
    status: changed ? (WRITE ? "MOVED" : "WOULD_MOVE") : "UNCHANGED",
    reason: "Moved export card after analysis/results"
  };
}

const categoryDir = path.join(ROOT, "tools", CATEGORY);
const files = walk(categoryDir);
const results = files.map(processFile);

console.log("");
console.log(`ScopedLabs Export After-Analysis Placement — ${CATEGORY}`);
console.log("------------------------------------------------");
console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN"}`);
console.log("");

for (const row of results) {
  console.log(`${row.status.padEnd(12)} ${row.file} — ${row.reason}`);
}

console.log("");

if (!WRITE) {
  console.log("No files modified. Run with --write after review.");
} else {
  console.log("Files updated. Run audit and test category.");
}

console.log("");