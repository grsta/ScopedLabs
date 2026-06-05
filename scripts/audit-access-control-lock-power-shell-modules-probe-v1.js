const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(label, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label, Detail: detail });
  if (!ok) failed = true;
}

let failed = false;
const rows = [];

const html = read("tools/access-control/lock-power-budget/index.html");
const script = read("tools/access-control/lock-power-budget/script.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");

check("Lock Power opts into Access Control polish", html.includes('data-access-control-tool-polish="true"'));
check("Lock Power loads shared export 030", html.includes("/assets/export.js?v=shared-export-030-semantic-report-tones"));
check("Lock Power loads Tool Shell module", html.includes("/assets/scopedlabs-tool-shell.js?v=scopedlabs-tool-shell-009-print-diagnostics"));
check("Lock Power loads Assistant Export module", html.includes("/assets/scopedlabs-assistant-export.js?v=scopedlabs-assistant-export-001"));
check("Lock Power loads Local Assistant module", html.includes("/assets/scopedlabs-local-assistant.js?v=scopedlabs-local-assistant-009-rich-card-shell"));
check("Lock Power loads Access Control assistant adapters", html.includes("/assets/access-control-tool-assistant-adapters.js?v=access-control-assistant-adapters-011-lock-power-budget-adapter"));
check("Lock Power loads report metadata module", html.includes("/assets/scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-004-area-context-notes"));
check("Lock Power loads Access Control polish module", html.includes("/assets/access-control-tool-polish.js?v=access-control-tool-polish-007-hide-fail-safe-assistant-flow-line"));
check("Lock Power local script cache is shell cleanup lane", html.includes("./script.js?v=access-control-lock-power-shell-cleanup-023"));

check(
  "Lock Power has standard flow actions shell",
  html.includes('id="accessControlFlowActions"') &&
    html.includes('id="next-step-row"') &&
    html.includes('id="continue-wrap"') &&
    html.includes('id="continue"')
);

check(
  "Lock Power has local assistant mount",
  html.includes('id="accessControlLocalAssistantMount"') &&
    html.includes("access-control-local-assistant-mount")
);

check(
  "Lock Power script applies Tool Shell modules",
  script.includes("applyShellModules") &&
    script.includes('applyBackContinueShell({ rowId: "accessControlFlowActions" })')
);

check(
  "Lock Power script renders local assistant",
  script.includes("renderLocalAssistant") &&
    script.includes("ScopedLabsLocalAssistant") &&
    script.includes("ScopedLabsAccessControlToolAssistantAdapters")
);

check(
  "Access Control adapter registry includes Lock Power",
  adapters.includes("function buildLockPowerBudgetModel") &&
    adapters.includes('"lock-power-budget"') &&
    adapters.includes("Lock Power Assistant")
);

check(
  "Lock Power preserves core power formula",
  script.includes("const peak = effectiveSimul * amps;") &&
    script.includes("const required = peak * (1 + headroom / 100);") &&
    script.includes("const watts = required * voltage;")
);

check(
  "Lock Power scope hydration remains present",
  script.includes("applyActiveScopeToInputs") &&
    script.includes("mapScopeLockType") &&
    script.includes("getScopeLockCount")
);


check(
  "Lock Power legacy top chrome removed",
  !html.includes('<div class="crumbs">') &&
    !html.includes("Part of a Design Flow") &&
    !html.includes('<p class="tool-best-for">')
);

check(
  "Lock Power uses shared report metadata mount",
  html.includes('id="reportMetadataMount"') &&
    html.includes("data-report-metadata") &&
    !html.includes('<div class="export-grid">')
);

console.log("\nAccess Control Lock Power shell modules probe audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);