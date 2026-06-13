(function () {
  "use strict";
  const VERSION = "access-control-summary-cleanup-0613";
  const TOOLS = [
    ["scope-planner", "Scope Planner", "/tools/access-control/scope-planner/"],
    ["door-count-planner", "Door Count Planner", "/tools/access-control/door-count-planner/"],
    ["reader-type-selector", "Reader Type Selector", "/tools/access-control/reader-type-selector/"],
    ["credential-format", "Credential Format", "/tools/access-control/credential-format/"],
    ["access-level-sizing", "Access Level Sizing", "/tools/access-control/access-level-sizing/"],
    ["panel-capacity", "Panel Capacity", "/tools/access-control/panel-capacity/"],
    ["lock-power-budget", "Lock Power Budget", "/tools/access-control/lock-power-budget/"],
    ["door-cable-length", "Door Cable Length", "/tools/access-control/door-cable-length/"],
    ["elevator-reader-count", "Elevator Reader Count", "/tools/access-control/elevator-reader-count/"],
    ["fail-safe-fail-secure", "Fail Safe / Fail Secure", "/tools/access-control/fail-safe-fail-secure/"],
    ["special-locking-scope", "Special Locking Scope", "/tools/access-control/special-locking-scope/"],
    ["anti-passback-zones", "Anti-Passback Zones", "/tools/access-control/anti-passback-zones/"]
  ];
  window.ScopedLabsAccessControlToolRegistry = Object.freeze({
    version: VERSION,
    category: "access-control",
    tools: TOOLS.map(function (row) { return { slug: row[0], label: row[1], href: row[2] }; })
  });
})();
