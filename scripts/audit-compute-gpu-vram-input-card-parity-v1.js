#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlFile = "tools/compute/gpu-vram/index.html";
const html = fs.readFileSync(path.join(root, htmlFile), "utf8");

const checks = [];

function check(code, pass, detail) {
  checks.push({ code, pass, detail });
}

function hasId(id) {
  return html.includes('id="' + id + '"') || html.includes("id='" + id + "'");
}

function findElementBlockByText(source, openToken, closeToken, textNeedle, startAt) {
  var cursor = startAt || 0;

  while (cursor >= 0 && cursor < source.length) {
    var open = source.indexOf(openToken, cursor);
    if (open === -1) return { index: -1, block: "" };

    var close = source.indexOf(closeToken, open);
    if (close === -1) return { index: -1, block: "" };

    var end = close + closeToken.length;
    var block = source.slice(open, end);

    if (block.includes(textNeedle)) {
      return { index: open, block: block };
    }

    cursor = end;
  }

  return { index: -1, block: "" };
}

function blockHasClassToken(block, token) {
  return block.includes(token);
}

const mainPlanningTitle = findElementBlockByText(html, "<h2", "</h2>", "Planning Inputs", 0);
const engineeringTitle = findElementBlockByText(html, "<h2", "</h2>", "GPU VRAM engineering factors", 0);

const sectionStart = html.indexOf('<section class="compute-gpu-planning-inputs"');
const sectionEnd = sectionStart === -1 ? -1 : html.indexOf("</section>", sectionStart);
const section = sectionStart === -1 || sectionEnd === -1 ? "" : html.slice(sectionStart, sectionEnd);

check(
  "GPU_INPUT_CARD_PARITY_SECTION_PRESENT",
  sectionStart !== -1 && html.includes('data-compute-gpu-input-card-parity="0622"'),
  "GPU engineering input section should be marked as the Lane 2 parity proof consumer."
);

check(
  "GPU_INPUT_CARD_PARITY_MAIN_PLANNING_TITLE_PRESENT",
  mainPlanningTitle.index !== -1,
  "GPU page should preserve the main Planning Inputs h2 title."
);

check(
  "GPU_INPUT_CARD_PARITY_ENGINEERING_TITLE_MATCHES_H2",
  engineeringTitle.index !== -1 &&
    blockHasClassToken(engineeringTitle.block, "h2") &&
    blockHasClassToken(engineeringTitle.block, "compute-gpu-planning-inputs__title"),
  "GPU VRAM engineering factors should be the real section title and use the same h2 rhythm."
);

check(
  "GPU_INPUT_CARD_PARITY_ENGINEERING_TITLE_AFTER_MAIN_TITLE",
  mainPlanningTitle.index !== -1 &&
    engineeringTitle.index !== -1 &&
    mainPlanningTitle.index < engineeringTitle.index,
  "Engineering factors title should sit below the main Planning Inputs title."
);

check(
  "GPU_INPUT_CARD_PARITY_NO_DUPLICATE_EYEBROW",
  !section.includes("compute-gpu-planning-inputs__eyebrow") &&
    !section.includes(">Planning Inputs</div>"),
  "Engineering factors block should not repeat the green Planning Inputs eyebrow."
);

check(
  "GPU_INPUT_CARD_PARITY_STYLE_TOKEN_PRESENT",
  html.includes('id="compute-gpu-input-card-parity-0622"'),
  "GPU input card parity style token should exist."
);

check(
  "GPU_INPUT_CARD_PARITY_GRID_THREE_COLUMNS",
  html.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"),
  "Engineering input groups should use an even three-column grid on desktop."
);

check(
  "GPU_INPUT_CARD_PARITY_GROUPS_STRETCH",
  html.includes("align-items: stretch") &&
    html.includes("min-height: 100%"),
  "Engineering input groups should stretch evenly."
);

check(
  "GPU_INPUT_CARD_PARITY_LABELS_LEVEL",
  html.includes("min-height: 104px") &&
    html.includes("compute-gpu-input-help") &&
    html.includes("min-height: 34px"),
  "Engineering input labels and helper text should have leveling rules."
);

[
  "installedVramGb",
  "targetUtilization",
  "displayReserveGb",
  "precisionMode",
  "parallelismMode",
  "replicaCount",
  "growthReserve",
  "kvCacheGb",
  "checkpointReserveGb",
  "failoverMultiplier",
  "gpuSharingMode"
].forEach(function(id) {
  check(
    "GPU_INPUT_CARD_PARITY_INPUT_PRESENT_" + id.toUpperCase(),
    hasId(id),
    "GPU engineering input should remain present: " + id
  );
});

let pass = 0;
let fail = 0;

console.log("SCOPEDLABS COMPUTE GPU VRAM INPUT CARD PARITY AUDIT V1\n");

for (const item of checks) {
  if (item.pass) pass += 1;
  else fail += 1;

  console.log("[" + (item.pass ? "PASS" : "FAIL") + "] " + item.code);
  console.log("  " + htmlFile);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

if (fail) process.exit(1);
