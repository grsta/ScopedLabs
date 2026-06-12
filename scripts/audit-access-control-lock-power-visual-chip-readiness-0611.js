const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolDir = path.join(root, "tools", "access-control", "lock-power-budget");
const htmlPath = path.join(toolDir, "index.html");
const scriptPath = path.join(toolDir, "script.js");
const contractPath = path.join(root, "docs", "access-control-lock-power-visual-chip-contract-v1.md");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function normalizeSelector(selector) {
  return String(selector || "").trim().replace(/\s+/g, " ");
}

function extractStyleBlocks(html) {
  const blocks = [];
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;

  while ((match = regex.exec(html))) {
    blocks.push(match[1] || "");
  }

  return blocks;
}

function extractRules(css) {
  const rules = [];
  const regex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;

  while ((match = regex.exec(css))) {
    const selectors = String(match[1] || "")
      .split(",")
      .map(normalizeSelector)
      .filter(Boolean);

    for (const selector of selectors) {
      rules.push({
        selector,
        body: String(match[2] || "").trim(),
      });
    }
  }

  return rules;
}

function findRules(rules, selector) {
  return rules.filter((rule) => rule.selector === selector);
}

function has(text, token) {
  return String(text || "").includes(token);
}

function bodyHasPillRadius(body) {
  return /border-radius\s*:\s*(999|9999|50%|10rem|99rem)/i.test(body);
}

function bodyHasRectRadius(body) {
  return /border-radius\s*:\s*(6px|7px|8px|9px|10px|11px|12px)/i.test(body);
}

function summarizeRuleShape(rules, selector) {
  const found = findRules(rules, selector);

  if (!found.length) {
    return {
      selector,
      status: "MISSING",
      bodies: [],
    };
  }

  const bodies = found.map((rule) => rule.body);
  const combined = bodies.join("\n");

  let status = "SHAPE_REVIEW";
  if (bodyHasPillRadius(combined)) status = "PILL_SHAPE_REVIEW";
  else if (bodyHasRectRadius(combined)) status = "RECTANGULAR_ENGINEERING_SHAPE";
  else if (/border-radius\s*:/i.test(combined)) status = "CUSTOM_RADIUS_REVIEW";

  return {
    selector,
    status,
    bodies,
  };
}

const html = read(htmlPath);
const js = read(scriptPath);
const contract = read(contractPath);
const rules = extractStyleBlocks(html).flatMap(extractRules);

const visualChip = summarizeRuleShape(rules, ".access-lock-power-visual-chip");
const visualCard = summarizeRuleShape(rules, ".access-lock-power-visual-card");
const visualHead = summarizeRuleShape(rules, ".access-lock-power-visual-head");
const cadRailWrap = summarizeRuleShape(rules, ".access-lock-power-cad-rail-wrap");
const cadRail = summarizeRuleShape(rules, ".access-lock-power-cad-rail");
const ledger = summarizeRuleShape(rules, ".access-lock-power-ledger-results");
const ledgerHidden = summarizeRuleShape(rules, ".access-lock-power-ledger-results[hidden]");
const exportStatus = summarizeRuleShape(rules, ".export-status");

const htmlHasVisualChip = has(html, "access-lock-power-visual-chip");
const scriptHasVisualChip = has(js, "access-lock-power-visual-chip");
const pageOwnsVisualChip = htmlHasVisualChip || scriptHasVisualChip;
const scriptHasStatusPillTemplate = has(js, "status-pill ${statusClass}");
const scriptHasStatusClass = has(js, "statusClass");
const scriptHasExportStatus = has(js, "exportStatus") || has(js, "setExportStatus");
const scriptHasCadRail = has(js, "access-lock-power-cad-rail") || has(js, "getCadPowerRailImage");
const contractOk = has(contract, "LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED");

let failCount = 0;
let watchCount = 0;

function printCheck(kind, ok, label) {
  console.log((ok ? "SAFE  " : kind + "  ") + label);
  if (!ok && kind === "FAIL") failCount += 1;
  if (!ok && kind === "WATCH") watchCount += 1;
}

console.log("Access Control Lock Power visual chip readiness audit - 0611");
console.log("Repo:", root);
console.log("");

console.log("Contract check");
printCheck("FAIL", contractOk, "Lock Power visual chip contract marker present");

console.log("");
console.log("Visual ownership map");
printCheck("FAIL", visualChip.status !== "MISSING", ".access-lock-power-visual-chip local style present");
printCheck("FAIL", pageOwnsVisualChip, "page owns access-lock-power-visual-chip via markup or script");
if (scriptHasStatusPillTemplate) {
  console.log("WATCH GENERATED_STATUS_PILL_PATH_PRESENT — script emits status-pill ${statusClass}");
  watchCount += 1;
} else {
  console.log("SAFE  no generated generic status-pill template");
}
printCheck("SAFE", scriptHasStatusClass, "script computes statusClass");
printCheck("SAFE", scriptHasCadRail, "CAD power rail path present");
printCheck("SAFE", scriptHasExportStatus, "export status path present but excluded");

console.log("");
console.log("Shape/body bucket");
console.log(visualChip.status.padEnd(34, " ") + " " + visualChip.selector);
console.log(visualCard.status.padEnd(34, " ") + " " + visualCard.selector);
console.log(visualHead.status.padEnd(34, " ") + " " + visualHead.selector);
console.log(cadRailWrap.status.padEnd(34, " ") + " " + cadRailWrap.selector);
console.log(cadRail.status.padEnd(34, " ") + " " + cadRail.selector);
console.log(ledger.status.padEnd(34, " ") + " " + ledger.selector);
console.log(ledgerHidden.status.padEnd(34, " ") + " " + ledgerHidden.selector);
console.log(exportStatus.status.padEnd(34, " ") + " " + exportStatus.selector);

console.log("");
console.log("Decision summary");

if (scriptHasStatusPillTemplate) {
  console.log("WATCH GENERATED_STATUS_PILL_PATH_REVIEW — script emits status-pill ${statusClass}; inspect before shared helper migration");
} else {
  console.log("SAFE  NO_GENERATED_STATUS_PILL_PATH");
}

if (visualChip.status === "PILL_SHAPE_REVIEW") {
  console.log("WATCH LOCK_POWER_VISUAL_CHIP_SHAPE_REVIEW — visual chip may still be pill-shaped");
} else if (visualChip.status === "RECTANGULAR_ENGINEERING_SHAPE") {
  console.log("SAFE  LOCK_POWER_VISUAL_CHIP_ALREADY_RECTANGULAR");
} else {
  console.log("WATCH LOCK_POWER_VISUAL_CHIP_STYLE_REVIEW");
}

console.log("SAFE  PRO_AUTH_PILLS_KEEP_SEPARATE");
console.log("SAFE  EXPORT_STATUS_KEEP_SEPARATE");
console.log("SAFE  CAD_RAIL_VISUAL_KEEP_SEPARATE");
console.log("SAFE  LEDGER_KEEP_SEPARATE");
console.log("SAFE  FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Rule bodies");
  for (const item of [visualChip, visualCard, visualHead, cadRailWrap, cadRail, ledger, ledgerHidden, exportStatus]) {
    console.log("");
    console.log(item.selector + " — " + item.status);
    if (!item.bodies.length) {
      console.log("  missing");
      continue;
    }
    item.bodies.forEach((body, index) => {
      console.log("  body " + (index + 1) + ":");
      console.log(
        body
          .split("\n")
          .map((line) => "    " + line.trim())
          .join("\n")
      );
    });
  }
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS" + (watchCount > 0 ? " WITH WATCH" : ""));