const fs = require("fs");
const path = require("path");

const root = process.cwd();

const targets = [
  "tools/compute/storage-iops/script.js",
  "tools/compute/raid-rebuild-time/script.js",
  "tools/compute/nic-bonding/script.js"
];

function grabLines(text, patterns, radius = 45) {
  const lines = text.split(/\r?\n/);
  const ranges = [];

  lines.forEach((line, index) => {
    if (patterns.some((rx) => rx.test(line))) {
      ranges.push([
        Math.max(0, index - radius),
        Math.min(lines.length - 1, index + radius)
      ]);
    }
  });

  ranges.sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r[0] > last[1] + 8) {
      merged.push([...r]);
    } else {
      last[1] = Math.max(last[1], r[1]);
    }
  }

  return merged.map(([start, end], blockIndex) => {
    return [
      `--- BLOCK ${blockIndex + 1} | lines ${start + 1}-${end + 1} ---`,
      ...lines.slice(start, end + 1).map((line, i) => {
        return `${String(start + i + 1).padStart(4, " ")}: ${line}`;
      })
    ].join("\n");
  }).join("\n\n");
}

const report = [];

for (const rel of targets) {
  const file = path.join(root, rel);

  report.push(`\n\n============================================================`);
  report.push(`FILE: ${rel}`);
  report.push(`============================================================`);

  if (!fs.existsSync(file)) {
    report.push("MISSING FILE");
    continue;
  }

  const js = fs.readFileSync(file, "utf8");

  report.push(
    grabLines(js, [
      /Math\.max\(/i,
      /chartMax/i,
      /\.metrics|metrics\.map/i,
      /raid|rebuild|verify|scrub|load|effective|penalty/i,
      /singleFlow|perFlow|targetUsable|aggregate|bonding|lacp|round-robin/i,
      /compositeScore|resolveStatus|healthyMax|watchMax/i,
      /summaryRows|derivedRows|interpretation|guidance/i
    ], 35)
  );
}

const outDir = path.join(root, "reports");
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "compute-straggler-inspection.txt");
fs.writeFileSync(outPath, report.join("\n") + "\n", "utf8");

console.log("Wrote:", outPath);
