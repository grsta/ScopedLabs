const fs = require("fs");
const path = require("path");

const root = process.cwd();

const tools = [
  "anti-passback-zones",
  "door-cable-length",
  "door-count-planner",
  "elevator-reader-count"
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function lineNumbered(lines, start, end) {
  return lines
    .slice(start, end + 1)
    .map((line, i) => `${String(start + i + 1).padStart(4, " ")}: ${line}`)
    .join("\n");
}

function grabAround(lines, patterns, radius = 90) {
  const ranges = [];

  lines.forEach((line, idx) => {
    if (patterns.some((rx) => rx.test(line))) {
      ranges.push([
        Math.max(0, idx - radius),
        Math.min(lines.length - 1, idx + radius)
      ]);
    }
  });

  ranges.sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];

    if (!last || r[0] > last[1] + 12) {
      merged.push([...r]);
    } else {
      last[1] = Math.max(last[1], r[1]);
    }
  }

  return merged
    .slice(0, 8)
    .map(([start, end], index) => {
      return `--- CORE MATH BLOCK ${index + 1} | lines ${start + 1}-${end + 1} ---\n${lineNumbered(lines, start, end)}`;
    })
    .join("\n\n");
}

const sections = [];

for (const slug of tools) {
  const file = path.join(root, "tools", "access-control", slug, "script.js");
  const js = read(file);
  const lines = js.split(/\r?\n/);

  sections.push(`\n\n============================================================`);
  sections.push(`TOOL: ${slug}`);
  sections.push(`FILE: tools/access-control/${slug}/script.js`);
  sections.push(`============================================================`);

  if (!js) {
    sections.push("MISSING script.js");
    continue;
  }

  const extracted = grabAround(lines, [
    /function\s+(calc|calculate|run|evaluate|recommend|render|classify|getRisk|getStatus|get.*Risk|get.*Status|get.*Recommendation|build.*Interpretation|build.*Guidance)/i,
    /const\s+(calc|calculate|run|evaluate|recommend|score|risk|status|recommendation|complexity|capacity|total|load|voltage|amps|watts|doors|readers|zones|cable|distance|drop)\b/i,
    /recommended|recommendation|risk|status|healthy|watch|high|moderate|low|score|complexity|pressure|exposure|capacity|utilization|headroom|threshold/i,
    /voltage|drop|amps|watts|doors|readers|locks|panels|zones|floors|entrances|interior|cable|gauge|distance/i,
    /summaryRows|derivedRows|result-row|renderOutput|renderRows|lastMetrics/i
  ], 70);

  sections.push(extracted || "No focused math blocks detected.");
}

const outDir = path.join(root, "reports");
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "access-control-targeted-math-review.txt");
fs.writeFileSync(outPath, sections.join("\n") + "\n", "utf8");

console.log("Wrote:", outPath);
