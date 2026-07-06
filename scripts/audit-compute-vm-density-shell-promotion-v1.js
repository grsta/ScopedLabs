const fs = require("fs");
const path = require("path");

const root = process.cwd();
const files = {
  html: path.join(root, "tools", "compute", "vm-density", "index.html"),
  script: path.join(root, "tools", "compute", "vm-density", "script.js"),
  moduleMap: path.join(root, "docs", "scopedlabs-module-map.md"),
  ledger: path.join(root, "docs", "scopedlabs-pattern-promotion-ledger.md"),
  shell: path.join(root, "assets", "scopedlabs-compute-shell-contract.js")
};

function read(file) { return fs.readFileSync(file, "utf8"); }
function readOptional(file) { return fs.existsSync(file) ? read(file) : ""; }
const src = { html: read(files.html), script: read(files.script), moduleMap: read(files.moduleMap), ledger: read(files.ledger), shell: readOptional(files.shell) };
const results = [];
function check(name, pass, detail) { results.push({ name, pass: !!pass, detail }); console.log((pass ? "[PASS] " : "[FAIL] ") + name + " - " + detail); }
function before(source, first, second) { const a = source.indexOf(first); const b = source.indexOf(second); return a >= 0 && b >= 0 && a < b; }

check("VM_DENSITY_SHELL_OPT_IN", src.html.includes('data-compute-tool-shell="vm-density-shell-promotion-0706"') && src.html.includes('data-vm-density-continue-target="power-thermal"') && src.html.includes("scopedlabs-compute-shell-contract.js"), "VM Density should opt into the shared Compute shell and publish the Power / Thermal route target.");
check("VM_DENSITY_ACTIVE_WORKFLOW_MARKER", src.html.includes('id="computeActiveWorkflowCard"') && src.html.includes("data-compute-active-workflow") && src.html.includes("Active Workflow") && !src.html.includes("Part of a Design Flow"), "The workflow explainer should be shell-addressable as Active Workflow instead of legacy design-flow chrome.");
check("VM_DENSITY_PLANNING_INPUTS_HEADING", src.html.includes("Planning Inputs") && src.script.includes("normalizeVmDensityPlanningInputsHeading"), "Planning Inputs should remain the visible input-card heading.");
check("VM_DENSITY_FLOW_CONTEXT_HIDDEN_AT_SOURCE", src.html.includes('id="flow-note"') && src.html.includes("hidden") && src.script.includes("prefillStoragePressureFromUpstream();") && !src.script.includes("<strong>Flow Context</strong>") && !src.script.includes("els.flowNote.hidden = false"), "Upstream context should feed prefill/payload logic without rendering the legacy Flow Context block.");
check("VM_DENSITY_LEGACY_RESULTS_LEDGER_HIDDEN", src.html.includes('id="vmDensityLegacyResultLedger"') && src.html.includes("vm-density-internal-ledger") && src.html.includes("display: none !important") && !src.html.includes(">Results</h3>"), "The analyzer result block should remain available as an internal ledger without visible result-summary noise.");
check("VM_DENSITY_ASSISTANT_FIRST_AFTER_CALCULATE", before(src.script, 'assistantCard.innerHTML = \'<div id="computeVmDensityAssistant"></div>\';', 'visualCard.innerHTML = \'<div class="eyebrow">Capacity Envelope</div><div id="computeVmDensityVisual"></div>\';') && src.script.includes('anchor.insertAdjacentElement("afterend", assistantCard)') && src.script.includes('assistantCard.insertAdjacentElement("afterend", visualCard)') && before(src.script, "renderVmDensityAssistant(vmDensityResult);", "renderVmDensityCapacityVisual(vmDensityResult);"), "The shared assistant card should be the first visible output after calculation, followed by the capacity visual.");
check("VM_DENSITY_VISIBLE_ASSISTANT_FALLBACK", src.script.includes("renderVmDensityAssistantFallback") && src.script.includes("VM Density planning result"), "VM Density should keep a visible assistant fallback when shared renderers do not produce output.");

check("VM_DENSITY_NEXT_ROUTE_POWER_THERMAL", src.html.includes("Continue → Power / Thermal") && src.script.includes('nextTool: "power-thermal"') && src.script.includes('nextHref: "/tools/compute/power-thermal/"') && src.script.includes('window.location.href = "/tools/compute/power-thermal/"') && !src.script.includes('window.location.href = "/tools/compute/gpu-vram/"'), "VM Density should continue toward Power / Thermal while GPU remains a specialty branch candidate.");
check("VM_DENSITY_KB_AND_EXPORT_PRESERVED", src.html.includes("/assets/help.js?v=help-026") && !src.html.includes("vm-density-kb-card-0706") && src.html.includes("ScopedLabsExportConfig") && src.html.includes('id="exportReport"') && src.html.includes('id="saveSnapshot"'), "KB ownership, export metadata, export report, and snapshot controls should remain in place.");
check("VM_DENSITY_SHARED_RENDERERS_STILL_CONSUMED", src.html.includes("scopedlabs-compute-capacity-visuals.js") && src.html.includes("scopedlabs-compute-assistant-contract.js") && src.script.includes("renderVmDensityCapacityEnvelope") && src.script.includes("renderVmDensityAssistantStatusCard"), "The page should keep consuming shared visual and assistant contracts.");
if (src.shell) { check("VM_DENSITY_SHARED_SHELL_ROUTE_OWNER_PRESENT", src.shell.includes("data-compute-tool-shell") && src.shell.includes("flow-note") && (src.shell.includes("result-summary") || src.shell.includes("resultSummary")), "When the full repo is present, the shared Compute shell should own generic tool-shell cleanup for Flow Context and result-summary UI."); } else { check("VM_DENSITY_SHARED_SHELL_ROUTE_OWNER_PRESENT", true, "Skipped route-owner source check because assets/scopedlabs-compute-shell-contract.js is not present in this reduced workspace."); }
check("VM_DENSITY_SHELL_PROMOTION_DOCS", src.moduleMap.includes("COMPUTE_VM_DENSITY_SHELL_PROMOTION_0706") && src.ledger.includes("COMPUTE-VM-DENSITY-SHELL-PROMOTION-0706"), "Docs should record the VM Density shell-promotion lane and guardrails.");

const failed = results.filter((item) => !item.pass);
console.log("\nVM Density shell promotion audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);
