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

function riskyGlyphsIn(text) {
  const risky = [0x2192, 0x21D2, 0x2014, 0x2013, 0x201C, 0x201D, 0x2018, 0x2019];
  return risky.filter(function (code) { return text.indexOf(String.fromCharCode(code)) >= 0; });
}

const shell = read("assets/scopedlabs-compute-shell-contract.js");
const cpu = read("tools/compute/cpu-sizing/index.html");
const ram = read("tools/compute/ram-sizing/index.html");
const gpu = read("tools/compute/gpu-vram/index.html");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");
const moduleMap = read("docs/scopedlabs-module-map.md");
const oldModuleExists = fs.existsSync("assets/scopedlabs-compute-guided-action-strip.js");
const oldAuditExists = fs.existsSync("scripts/audit-compute-guided-action-strip-v1.js");

console.log("Compute Dynamic Continue CTA Audit V1");
console.log("");

check(
  "RETIRED_GUIDED_ACTION_STRIP_MODULE",
  !oldModuleExists && !oldAuditExists &&
    !cpu.includes("scopedlabs-compute-guided-action-strip.js") &&
    !ram.includes("scopedlabs-compute-guided-action-strip.js") &&
    !gpu.includes("scopedlabs-compute-guided-action-strip.js"),
  "extra guided card/strip should not load on proof pages"
);

check(
  "SHELL_INITIALIZES_DYNAMIC_GUIDED_CONTINUE",
  shell.includes("function initComputeGuidedContinueRouting") && shell.includes("initComputeGuidedContinueRouting();"),
  "shared shell must start the dynamic CTA refresh/click handler"
);

check(
  "SHELL_USES_ROUTE_ENGINE_FOR_DYNAMIC_CTA",
  shell.includes("ScopedLabsComputeGuidedRouteEngine") && shell.includes("RouteEngine.resolve") && shell.includes("guidedContext: context"),
  "planner-selected route should drive the normal Continue button"
);

check(
  "SHELL_NORMALIZES_USER_FACING_LABELS",
  shell.includes("function normalizeComputeGuidedContinueLabel") &&
    shell.includes("Continue to ") &&
    shell.includes("Review Compute Summary") &&
    shell.includes("computeGuidedContinueToolLabel"),
  "button labels should be plain user wording, not engine wording"
);

check(
  "SHELL_REJECTS_RESUME_GUIDED_FLOW_LABEL_ON_CTA",
  !shell.includes("button.textContent = decision.nextLabel") &&
    shell.includes("normalizeComputeGuidedContinueLabel(decision)"),
  "do not expose Resume Guided Flow on tool-page Continue buttons"
);

check(
  "SHELL_TARGETS_OWNER_ROW_FIRST",
  shell.includes('data-compute-flow-owner="compute-shell-contract"') &&
    shell.includes("suppressLegacyComputeContinueControls(row)") &&
    shell.includes("data-compute-dynamic-continue-suppressed"),
  "dynamic guided Continue should update the shell-owned row and suppress duplicate legacy CTAs"
);

check(
  "SHELL_CAPTURE_GUARDS_DYNAMIC_CLICK",
  shell.includes("function initComputeGuidedContinueClickGuard") &&
    shell.includes("stopImmediatePropagation") &&
    shell.includes("window.location.assign(href)") &&
    shell.includes("data-compute-guided-click-target") &&
    shell.includes("}, true);"),
  "guided Continue clicks must use the dynamic href before legacy static handlers fire"
);

check(
  "SHELL_UPDATES_BUTTON_TARGET_AND_ENABLES_BUTTONS",
  shell.includes("data-compute-continue-href") &&
    shell.includes("setAttribute(\"href\", decision.nextHref)") &&
    shell.includes("button.disabled = false"),
  "dynamic CTA must update href/data target and enable button controls"
);

check(
  "CPU_RAM_GPU_LOAD_UPDATED_SHELL",
  hasVersionedScript(cpu, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract") &&
    hasVersionedScript(ram, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract") &&
    hasVersionedScript(gpu, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract") &&
    cpu.includes("012-dynamic-click-guard") &&
    ram.includes("012-dynamic-click-guard") &&
    gpu.includes("012-dynamic-click-guard"),
  "proof pages should load the dynamic Continue shell"
);

check(
  "SHELL_HAS_NO_RISKY_LITERAL_GLYPHS",
  riskyGlyphsIn(shell).length === 0,
  "avoid literal special glyphs in shared shell source"
);

check(
  "MODULE_MAP_DOCUMENTS_DYNAMIC_CONTINUE_CTA",
  moduleMap.includes("Compute dynamic guided Continue CTA") &&
    !moduleMap.includes("assets/scopedlabs-compute-guided-action-strip.js"),
  "module map should document dynamic CTA and remove retired strip path"
);

check(
  "BATCH_INCLUDES_DYNAMIC_CONTINUE_AUDIT",
  batch.includes("scripts/audit-compute-dynamic-continue-cta-v1.js") &&
    !batch.includes("scripts/audit-compute-guided-action-strip-v1.js"),
  "batch should include the new audit and not the retired strip audit"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (12 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
