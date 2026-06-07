const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];
let failed = false;

function file(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const abs = file(rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(file(rel));
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
  if (!ok) failed = true;
}

function parseModuleVersion(text) {
  const matches = Array.from(text.matchAll(/access-control-planning-visuals-\d+[-a-z0-9]*/g)).map((m) => m[0]);
  return matches[0] || "";
}

function collectAccessToolPages() {
  const dir = file("tools/access-control");
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .map((name) => "tools/access-control/" + name + "/index.html")
    .filter((rel) => exists(rel));
}

function collectRendererBlocks(moduleText) {
  const starts = [];
  const re = /function\s+(build[A-Za-z0-9]+Svg)\s*\(/g;
  let match;

  while ((match = re.exec(moduleText))) {
    starts.push({ name: match[1], start: match.index });
  }

  return starts.map((item, index) => {
    const end = index + 1 < starts.length ? starts[index + 1].start : moduleText.length;
    const block = moduleText.slice(item.start, end);
    const viewBox = block.match(/viewBox="0 0\s+(\d+)\s+(\d+)"/);
    const slug = block.match(/data-access-control-modern-visual="([^"]+)"/);

    return {
      name: item.name,
      slug: slug ? slug[1] : "",
      width: viewBox ? Number(viewBox[1]) : 0,
      height: viewBox ? Number(viewBox[2]) : 0,
      block
    };
  }).filter((item) => item.slug || item.height);
}

function collectMetricChipY(block) {
  const ys = [];

  block.split(/\r?\n/).forEach((line) => {
    if (!line.includes("miniMetric(") && !line.includes("metricChip(")) return;

    const nums = Array.from(line.matchAll(/(?<![\w.])\d{2,3}(?![\w.])/g)).map((m) => Number(m[0]));
    if (nums.length >= 3) {
      ys.push(nums[nums.length - 2]);
    }
  });

  return ys;
}

function collectBottomStripBottoms(block) {
  const bottoms = [];
  const re = /<rect x="[^"]+" y="(\d+)" width="(\d+)" height="(\d+)"/g;
  let match;

  while ((match = re.exec(block))) {
    const y = Number(match[1]);
    const width = Number(match[2]);
    const height = Number(match[3]);

    if (width >= 400 && y >= 300) {
      bottoms.push(y + height);
    }
  }

  return bottoms;
}

function maxPageMinHeight(html) {
  const values = Array.from(html.matchAll(/min-height\s*:\s*(\d+)px/gi)).map((m) => Number(m[1]));
  return values.length ? Math.max(...values) : 0;
}

const moduleRel = "assets/access-control-planning-visuals.js";
const moduleText = read(moduleRel);
const moduleVersion = parseModuleVersion(moduleText);
const pages = collectAccessToolPages();
const renderers = collectRendererBlocks(moduleText);
const renderersBySlug = new Map(renderers.filter((item) => item.slug).map((item) => [item.slug, item]));

check("Access Control planning visual module exists", exists(moduleRel));
check("Access Control planning visual module has cache-bust version", Boolean(moduleVersion), moduleVersion || "missing");
check("Access Control planning visual renderers discovered", renderers.length > 0, String(renderers.length));

renderers.forEach((renderer) => {
  check(renderer.name + " has SVG viewBox height", renderer.height > 0, renderer.slug || "no slug");

  const chipYs = collectMetricChipY(renderer.block);
  const bottomStripBottoms = collectBottomStripBottoms(renderer.block);
  const maxChipY = chipYs.length ? Math.max(...chipYs) : 0;
  const maxStripBottom = bottomStripBottoms.length ? Math.max(...bottomStripBottoms) : 0;

  if (maxChipY >= 330) {
    const required = maxChipY + 80;
    check(
      renderer.name + " gives bottom metric chips breathing room",
      renderer.height >= required,
      "height=" + renderer.height + ", maxChipY=" + maxChipY + ", required>=" + required
    );
  }

  if (maxStripBottom >= 350) {
    const required = maxStripBottom + 40;
    check(
      renderer.name + " gives bottom metric strip breathing room",
      renderer.height >= required,
      "height=" + renderer.height + ", stripBottom=" + maxStripBottom + ", required>=" + required
    );
  }
});

pages.forEach((rel) => {
  const html = read(rel);

  if (!html.includes("/assets/access-control-planning-visuals.js?v=")) return;

  check(
    rel + " uses current planning visual cache version",
    html.includes("/assets/access-control-planning-visuals.js?v=" + moduleVersion),
    moduleVersion
  );

  renderersBySlug.forEach((renderer, slug) => {
    if (!html.includes('data-access-control-modern-visual="' + slug + '"') &&
        !html.includes('data-access-control-modern-visual-card="' + slug + '"')) {
      return;
    }

    if (renderer.height > 420) {
      const pageMin = maxPageMinHeight(html);
      const required = renderer.height - 30;

      check(
        rel + " card min-height fits taller renderer " + slug,
        pageMin >= required,
        "pageMinHeight=" + pageMin + ", rendererHeight=" + renderer.height + ", required>=" + required
      );
    }
  });
});

check("Controlled door opening icon primitive exists", moduleText.includes("function controlledDoorOpeningIcon"));
check("Special Locking renderer uses shared controlled door icon", moduleText.includes("function buildSpecialLockingSvg") && moduleText.includes("controlledDoorOpeningIcon({"));
check("Special Locking taller-card renderer is protected", (() => {
  const renderer = renderersBySlug.get("special-locking-scope");
  if (!renderer) return false;

  const chipYs = collectMetricChipY(renderer.block);
  const maxChipY = chipYs.length ? Math.max(...chipYs) : 0;

  return renderer.height >= 450 && maxChipY >= 380 && renderer.height >= maxChipY + 80;
})(), "prevents the cramped lower-chip layout from returning");

console.log("\nAccess Control visual fit seatbelt audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (failed) process.exit(1);
