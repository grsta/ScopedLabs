const fs = require("fs");
const path = require("path");

const root = process.cwd();

const tools = [
  "credential-format",
  "fail-safe-fail-secure",
  "reader-type-selector"
];

function grabAround(lines, matchers, radius = 80) {
  const ranges = [];

  lines.forEach((line, index) => {
    if (matchers.some((rx) => rx.test(line))) {
      ranges.push([Math.max(0, index - radius), Math.min(lines.length - 1, index + radius)]);
    }
  });

  // merge overlapping ranges
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];

  for (const r of ranges) {
    const last = merged[merged.length - 1];

    if (!last || r[0] > last[1] + 5) {
      merged.push(r);
    } else {
      last[1] = Math.max(last[1], r[1]);
    }
  }

  return merged.map(([start, end]) => {
    return lines
      .slice(start, end + 1)
      .map((line, i) => `${String(start + i + 1).padStart(4, " ")}: ${line}`)
      .join("\n");
  });
}

const report = [];

for (const slug of tools) {
  const jsPath = path.join(root, "tools", "access-control", slug, "script.js");

  if (!fs.existsSync(jsPath)) {
    report.push(`\n\n================ ${slug} ================\nMISSING script.js`);
    continue;
  }

  const js = fs.readFileSync(jsPath, "utf8");
  const lines = js.split(/\r?\n/);

  const blocks = grabAround(lines, [
    /function\s+(calculate|calc|run|evaluate|recommend|buildCore|buildReport|render)/i,
    /const\s+(calculate|calc|run|evaluate|recommend|core|score|status|recommendation)\s*=/i,
    /addEventListener\(["']click["']/i,
    /els\.calc/i,
    /\.innerHTML\s*=/i,
    /renderRows/i,
    /setAnalysis|renderAnalysis|analysis-copy/i,
    /score|status|recommendation|failSafe|failSecure|capacity|collision|range|reader|osdp|wiegand/i
  ], 70);

  report.push(`\n\n================ ${slug} ================\n${blocks.join("\n\n--- BLOCK ---\n\n")}`);
}

const outDir = path.join(root, "reports");
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "access-control-free-tools-focused-math.txt");
fs.writeFileSync(outPath, report.join("\n"), "utf8");

console.log("Focused Access Control math report created:");
console.log(outPath);
