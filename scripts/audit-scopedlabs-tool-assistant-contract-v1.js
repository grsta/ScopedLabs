const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

function exists(file) {
  return fs.existsSync(file);
}

function hasAllTokens(file, tokens) {
  const text = read(file).toLowerCase();
  return tokens.every((token) => text.includes(String(token).toLowerCase()));
}

function hasAnyToken(file, tokens) {
  const text = read(file).toLowerCase();
  return tokens.some((token) => text.includes(String(token).toLowerCase()));
}

const checks = [];

function check(id, ok, file, detail) {
  checks.push({ id, ok, file, detail });
}

console.log("SCOPEDLABS TOOL ASSISTANT CONTRACT AUDIT V1\n");

const ledger = read("docs/scopedlabs-pattern-promotion-ledger.md");
const moduleMap = read("docs/scopedlabs-module-map.md");

check(
  "LEDGER_HAS_TOOL_ASSISTANT_PROMOTION_ENTRY",
  ledger.includes("TOOL-ASSISTANT-SUMMARY-CONTRACT-0618") &&
    ledger.includes("scripts/audit-scopedlabs-tool-assistant-contract-v1.js") &&
    !/TOOL-ASSISTANT-SUMMARY-CONTRACT-0618[\s\S]*?Status:\s*BLOCKED_PROMOTION_REQUIRED/i.test(ledger),
  "docs/scopedlabs-pattern-promotion-ledger.md",
  "Tool Assistant contract must be promoted out of blocked status and point to this audit."
);

check(
  "MODULE_MAP_RECORDS_TOOL_ASSISTANT_CONTRACT",
  moduleMap.includes("TOOL-ASSISTANT-SUMMARY-CONTRACT-0618") &&
    moduleMap.includes("audit-scopedlabs-tool-assistant-contract-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must record the Tool Assistant to Summary contract audit."
);

check(
  "SHARED_TOOL_SHELL_HAS_ASSISTANT_DIAGNOSTICS",
  exists("assets/scopedlabs-tool-shell.js") &&
    hasAllTokens("assets/scopedlabs-tool-shell.js", ["ASSISTANT_SHELL_EXPECTATIONS", "assistantShell"]),
  "assets/scopedlabs-tool-shell.js",
  "Shared Tool Shell should retain assistant-shell diagnostics and expectations."
);

check(
  "ACCESS_CONTROL_ASSISTANT_ADAPTER_EXISTS",
  exists("assets/access-control-tool-assistant-adapters.js") &&
    hasAnyToken("assets/access-control-tool-assistant-adapters.js", ["assistant", "recommendation", "pipeline"]),
  "assets/access-control-tool-assistant-adapters.js",
  "Access Control should have a category assistant adapter owner."
);

check(
  "ACCESS_CONTROL_SUMMARY_REPORT_OWNER_EXISTS",
  exists("assets/access-control-report-summary.js") &&
    hasAnyToken("assets/access-control-report-summary.js", ["summary", "report", "pipeline"]),
  "assets/access-control-report-summary.js",
  "Access Control should have a Summary/report owner capable of receiving assistant-ready category data."
);

check(
  "PHYSICAL_SECURITY_LOCAL_ASSISTANT_EXISTS",
  exists("assets/physical-security-local-assistant.js") &&
    hasAnyToken("assets/physical-security-local-assistant.js", ["assistant", "guidance", "recommendation"]),
  "assets/physical-security-local-assistant.js",
  "Physical Security should have a local tool assistant owner."
);

check(
  "PHYSICAL_SECURITY_ASSISTANT_ADAPTER_EXISTS",
  exists("assets/physical-security-tool-assistant-adapters.js") &&
    hasAnyToken("assets/physical-security-tool-assistant-adapters.js", ["assistant", "guidance", "adapter"]),
  "assets/physical-security-tool-assistant-adapters.js",
  "Physical Security should have tool assistant adapters."
);

check(
  "PHYSICAL_SECURITY_GUIDANCE_BRIDGE_EXISTS",
  exists("assets/physical-security-guidance-event-bridge.js") &&
    hasAnyToken("assets/physical-security-guidance-event-bridge.js", ["guidance", "event", "summary", "memory"]),
  "assets/physical-security-guidance-event-bridge.js",
  "Physical Security assistant guidance should publish through a shared event/memory bridge."
);

check(
  "PHYSICAL_SECURITY_CATEGORY_GUIDANCE_EXISTS",
  exists("assets/physical-security-category-guidance.js") &&
    hasAnyToken("assets/physical-security-category-guidance.js", ["summary", "guidance", "recommendation"]),
  "assets/physical-security-category-guidance.js",
  "Physical Security category Summary should have a master/category guidance owner."
);

check(
  "COMPUTE_ASSISTANT_CONTRACT_EXISTS",
  exists("assets/scopedlabs-compute-assistant-contract.js") &&
    hasAnyToken("assets/scopedlabs-compute-assistant-contract.js", ["assistant", "contract", "recommendation"]),
  "assets/scopedlabs-compute-assistant-contract.js",
  "Compute should have a category assistant contract owner for CPU/RAM and future Compute tools."
);


check(
  "COMPUTE_RAM_PAGE_HAS_ASSISTANT_MOUNT",
  exists("tools/compute/ram-sizing/index.html") &&
    hasAnyToken("tools/compute/ram-sizing/index.html", ["data-compute-assistant-card"]) &&
    hasAnyToken("tools/compute/ram-sizing/index.html", ["data-compute-assistant-mount"]),
  "tools/compute/ram-sizing/index.html",
  "RAM page must consume the shared Compute assistant card/mount contract."
);

check(
  "COMPUTE_RAM_PAGE_LOADS_ASSISTANT_SCRIPTS",
  exists("tools/compute/ram-sizing/index.html") &&
    hasAnyToken("tools/compute/ram-sizing/index.html", ["scopedlabs-local-assistant.js"]) &&
    hasAnyToken("tools/compute/ram-sizing/index.html", ["scopedlabs-compute-assistant-contract.js"]),
  "tools/compute/ram-sizing/index.html",
  "RAM page must load the shared Local Assistant renderer and Compute assistant contract."
);

check(
  "COMPUTE_RAM_SCRIPT_RENDERS_SHARED_ASSISTANT",
  exists("tools/compute/ram-sizing/script.js") &&
    hasAnyToken("tools/compute/ram-sizing/script.js", ["renderRamAssistant"]) &&
    hasAnyToken("tools/compute/ram-sizing/script.js", ["ScopedLabsComputeAssistant.renderToolAssistant"]) &&
    hasAnyToken("tools/compute/ram-sizing/script.js", ["toolSlug: \"ram-sizing\""]),
  "tools/compute/ram-sizing/script.js",
  "RAM script must render the shared Compute assistant from the calculated RAM capacity payload."
);


check(
  "COMPUTE_RAM_ASSISTANT_USES_CUSTOM_SUMMARY_CARD",
  exists("assets/scopedlabs-compute-assistant-contract.js") &&
    hasAnyToken("assets/scopedlabs-compute-assistant-contract.js", ["renderComputeRamTopSummaryCard"]) &&
    hasAnyToken("assets/scopedlabs-compute-assistant-contract.js", ["renderComputeRamTopSummaryCard(data)"]),
  "assets/scopedlabs-compute-assistant-contract.js",
  "RAM live assistant must use the Compute result-summary card renderer instead of falling through to the generic bullet-list assistant renderer."
);
check(
  "COMPUTE_ASSISTANT_CONTRACT_HAS_RAM_MODEL",
  exists("assets/scopedlabs-compute-assistant-contract.js") &&
    hasAnyToken("assets/scopedlabs-compute-assistant-contract.js", ["buildRamSizingAssistantModel"]) &&
    hasAnyToken("assets/scopedlabs-compute-assistant-contract.js", ["ramReferenceSection"]) &&
    hasAnyToken("assets/scopedlabs-compute-assistant-contract.js", ["toolSlug === \"ram-sizing\""]),
  "assets/scopedlabs-compute-assistant-contract.js",
  "Shared Compute assistant contract must include a real RAM Sizing model and recommendation references."
);
check(
  "ACCESS_CONTROL_SUMMARY_PAGE_EXISTS",
  exists("tools/access-control/summary/index.html"),
  "tools/access-control/summary/index.html",
  "Access Control Summary page should exist as the category master-assistant/report host."
);

check(
  "PHYSICAL_SECURITY_SUMMARY_PAGE_EXISTS",
  exists("tools/physical-security/summary/index.html"),
  "tools/physical-security/summary/index.html",
  "Physical Security Summary page should exist as the category master-assistant/report host."
);

check(
  "COMPUTE_SUMMARY_IS_PENDING_NOT_REQUIRED",
  !exists("tools/compute/summary/index.html"),
  "tools/compute/summary/index.html",
  "Compute Summary is intentionally pending; assistant contract owner exists but category Summary wiring is not required in this lane."
);

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.id);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.id);
  }

  console.log("  " + item.file);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
