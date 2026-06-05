const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(label, ok, detail = "") {
  rows.push({
    Status: ok ? "SAFE" : "FAIL",
    Check: label,
    Detail: detail
  });
  if (!ok) failed = true;
}

let failed = false;
const rows = [];

const html = read("tools/access-control/lock-power-budget/index.html");
const script = read("tools/access-control/lock-power-budget/script.js");

check(
  "Lock Power loads shared Access Control scope state",
  html.includes("/assets/access-control-scope-state.js?v=access-control-scope-state-002-shared-display")
);

check(
  "Lock Power has Active Scope Context card",
  html.includes('id="activeAccessScopeCard"') &&
    html.includes('id="activeAccessScopeTitle"') &&
    html.includes('id="activeAccessScopeDescription"') &&
    html.includes('id="activeAccessScopeMeta"')
);

check(
  "Lock Power local script cache is current visual output fix lane",
  html.includes("./script.js?v=access-control-lock-power-visual-output-fix-028")
);

check(
  "Lock Power uses shared scope display",
  script.includes("renderScopeDisplay") &&
    script.includes('toolLabel: "Lock Power Budget"')
);

check(
  "Lock Power hydrates only safe scope-owned inputs",
  script.includes("applyActiveScopeToInputs") &&
    script.includes("mapScopeLockType") &&
    script.includes("getScopeLockCount")
);

check(
  "Lock Power does not hydrate math-sensitive defaults from scope",
  !script.includes("scope?.simul") &&
    !script.includes("scope?.headroom") &&
    !script.includes("scope?.amps")
);

check(
  "Lock Power preserves core power formula",
  script.includes("const peak = effectiveSimul * amps;") &&
    script.includes("const required = peak * (1 + headroom / 100);") &&
    script.includes("const watts = required * voltage;")
);

check(
  "Lock Power carries scope context into report payload",
  script.includes("activeScopeContext: getActiveScopeExportContext()")
);

console.log("\nAccess Control Lock Power active scope hydration audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);