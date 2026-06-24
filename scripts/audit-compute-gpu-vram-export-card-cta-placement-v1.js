const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlFile = "tools/compute/gpu-vram/index.html";
const scriptFile = "tools/compute/gpu-vram/script.js";
const moduleMapFile = "docs/scopedlabs-module-map.md";
const ledgerFile = "docs/scopedlabs-pattern-promotion-ledger.md";

const html = fs.readFileSync(path.join(root, htmlFile), "utf8");
const script = fs.readFileSync(path.join(root, scriptFile), "utf8");
const moduleMap = fs.readFileSync(path.join(root, moduleMapFile), "utf8");
const ledger = fs.readFileSync(path.join(root, ledgerFile), "utf8");

let pass = 0;
let fail = 0;

function check(code, condition, message, file = htmlFile) {
  if (condition) {
    pass += 1;
    console.log("[PASS] " + code);
  } else {
    fail += 1;
    console.log("[FAIL] " + code);
    console.log("  " + file);
    console.log("  " + message);
  }
}

function count(needle) {
  return html.split(needle).length - 1;
}

const exportStart = html.indexOf("compute-export-card");
const exportEnd = html.indexOf("</section>", exportStart);
const exportBlock = exportStart === -1 || exportEnd === -1 ? "" : html.slice(exportStart, exportEnd);
const flowIndex = html.indexOf("data-compute-flow-actions");
const notesIndex = html.indexOf("data-scopedlabs-user-tool-notes", exportStart);
const flowBlockStart = html.lastIndexOf("<div", flowIndex);
const flowBlockEnd = html.indexOf("</div>", flowIndex);
const flowBlock = flowBlockStart === -1 || flowBlockEnd === -1 ? "" : html.slice(flowBlockStart, flowBlockEnd + "</div>".length);

check(
  "GPU_EXPORT_CARD_CTA_SINGLE_OWNER",
  count("data-compute-flow-actions") === 1 &&
    count('data-compute-flow-inside-export-card="true"') === 1,
  "GPU should have exactly one Compute flow CTA owner block inside the export card."
);

check(
  "GPU_EXPORT_CARD_CTA_INSIDE_EXPORT_CARD",
  exportBlock.includes("data-compute-flow-actions") &&
    exportBlock.includes('data-compute-flow-inside-export-card="true"') &&
    flowIndex > exportStart &&
    flowIndex < exportEnd,
  "GPU Review Compute Summary CTA should sit inside the Export Report card."
);

check(
  "GPU_EXPORT_CARD_CTA_AFTER_USER_NOTES",
  notesIndex !== -1 &&
    flowIndex !== -1 &&
    notesIndex < flowIndex,
  "GPU flow CTA should sit after User Tool Notes inside the export card."
);

check(
  "GPU_EXPORT_CARD_CTA_ROUTE_PRESERVED",
  flowBlock.includes('href="/tools/compute/summary/"') &&
    flowBlock.includes("Review Compute Summary"),
  "GPU flow CTA should preserve the Review Compute Summary route."
);

check(
  "GPU_EXPORT_DYNAMIC_PLACEMENT_PARENT_GUARD",
  script.includes("!card.contains(flow)") &&
    script.includes("insertBefore(card, flow)") &&
    script.includes("placeExportAfterProofStack"),
  "Dynamic export placement should not try to insert the export card before its own child CTA."
, scriptFile);

check(
  "GPU_EXPORT_CARD_CTA_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_EXPORT_CARD_CTA_PLACEMENT_0624N") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-export-card-cta-placement-v1.js"),
  "Module map should document the GPU export-card CTA placement lane.",
  moduleMapFile
);

check(
  "GPU_EXPORT_CARD_CTA_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-EXPORT-CARD-CTA-PLACEMENT-0624N") &&
    ledger.includes("scripts/audit-compute-gpu-vram-export-card-cta-placement-v1.js"),
  "Pattern promotion ledger should record the GPU export-card CTA placement lane.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM EXPORT CARD CTA PLACEMENT AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
