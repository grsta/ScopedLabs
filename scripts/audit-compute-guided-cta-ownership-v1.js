const fs = require("fs");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

let failures = 0;

function check(label, ok, detail) {
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
  if (detail) console.log("      " + detail);
  if (!ok) failures += 1;
}

function hasVersionedScript(page, scriptName, prefix) {
  const marker = scriptName + "?v=" + prefix + "-";
  const index = page.indexOf(marker);
  if (index < 0) return false;
  const after = page.slice(index + marker.length);
  return /^[0-9]{3}(?:-[a-z0-9-]+)?/.test(after);
}

const shell = read("assets/scopedlabs-compute-shell-contract.js");
const cpu = read("tools/compute/cpu-sizing/index.html");
const ram = read("tools/compute/ram-sizing/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

console.log("Compute Guided CTA Ownership Audit V1");
console.log("");

check(
  "SHELL_SUPPRESSES_LEGACY_CONTINUE_CONTROLS",
  shell.includes("function suppressLegacyContinueControls") &&
    shell.includes("data-compute-legacy-continue-suppressed") &&
    shell.includes("aria-hidden"),
  "legacy page-level #continue/#continue-wrap should not remain visible beside the shared shell row"
);

check(
  "SHELL_KEEPS_OWNER_ROW_VISIBLE",
  shell.includes("closest") &&
    shell.includes("data-compute-flow-owner") &&
    shell.includes("compute-shell-contract") &&
    shell.includes("if (ownerRow) return;"),
  "shared shell-owned row must not suppress itself"
);

check(
  "SHELL_HAS_SUPPRESSION_CSS",
  shell.includes("scopedlabs-compute-guided-cta-ownership-styles") &&
    shell.includes("display: none !important") &&
    shell.includes("visibility: hidden !important"),
  "CSS must beat legacy scripts that reset inline display"
);

check(
  "SHELL_CALLS_SUPPRESSION_DURING_PLACEMENT_AND_NORMALIZE",
  (shell.match(/suppressLegacyContinueControls\(/g) || []).length >= 3 &&
    shell.includes("function normalizeFlowActions()"),
  "suppression should run when placing and normalizing shared CTAs"
);

check(
  "CPU_RAM_LOAD_UPDATED_SHELL_OWNER",
  hasVersionedScript(cpu, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract") &&
    hasVersionedScript(ram, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract") &&
    cpu.includes("009-guided-cta-ownership") &&
    ram.includes("009-guided-cta-ownership"),
  "CPU/RAM pages must load the patched shared shell"
);

check(
  "MODULE_MAP_DOCUMENTS_GUIDED_CTA_OWNERSHIP",
  moduleMap.includes("Compute guided CTA ownership"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_INCLUDES_GUIDED_CTA_OWNERSHIP_AUDIT",
  batch.includes("scripts/audit-compute-guided-cta-ownership-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (7 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
