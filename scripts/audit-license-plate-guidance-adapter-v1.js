const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "license-plate-guidance-adapter-audit-003-area-distance-cache-proof";
const TOOL = "license-plate-range";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function scriptRefs(html, needle) {
  return [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/g)]
    .map((m) => m[1])
    .filter((src) => src.includes(needle));
}

const helper = read("assets/user-assistant-guidance.js");
const index = read("tools/physical-security/license-plate-range/index.html");
const script = read("tools/physical-security/license-plate-range/script.js");

const helperRefs = scriptRefs(index, "user-assistant-guidance.js");
const localRefs = scriptRefs(index, "./script.js");
const helperIndex = index.indexOf("user-assistant-guidance.js");
const localIndex = index.indexOf("./script.js");

const acceptedLocalCaches = [
  "license-plate-user-guidance-adapter",
  "license-plate-guidance-event-bridge",
  "physical-security-license-plate-area-distance-001"
];

console.log("");
console.log("License Plate Guidance Adapter Audit");
console.log("");
console.log("Audit version:", VERSION);
console.log("Tool:", TOOL);

add(
  "helper-file",
  helper ? "SAFE" : "FAIL",
  "assets/user-assistant-guidance.js exists"
);

add(
  "helper-version",
  helper.includes("user-assistant-guidance") || helper.includes("ScopedLabsUserAssistantGuidance")
    ? "SAFE"
    : "FAIL",
  "shared helper version marker is present"
);

add(
  "helper-api",
  helper.includes("createGuidance") &&
    helper.includes("sourceLabelForMode") &&
    helper.includes("sourceMessageForMode")
    ? "SAFE"
    : "FAIL",
  "shared helper exports expected schema API"
);

add(
  "helper-include",
  helperRefs.length === 1
    ? "SAFE"
    : "FAIL",
  "License Plate loads user-assistant-guidance.js"
);

add(
  "helper-before-local",
  helperIndex >= 0 && localIndex >= 0 && helperIndex < localIndex
    ? "SAFE"
    : "FAIL",
  "user guidance helper loads before License Plate local script"
);

add(
  "local-cache-bust",
  localRefs.some((src) => acceptedLocalCaches.some((cache) => src.includes(cache)))
    ? "SAFE"
    : "WATCH",
  "License Plate local script cache is on an accepted guidance/event/area-distance proof version"
);

add(
  "adapter-state",
  script.includes("latestLicensePlateGuidance") &&
    script.includes("cloneLicensePlateGuidance")
    ? "SAFE"
    : "FAIL",
  "adapter stores latest normalized guidance"
);

add(
  "adapter-builder",
  script.includes("function buildLicensePlateUserGuidance") &&
    script.includes("ScopedLabsUserAssistantGuidance")
    ? "SAFE"
    : "FAIL",
  "adapter guidance builder exists"
);

add(
  "adapter-update",
  script.includes("function updateLicensePlateUserGuidance")
    ? "SAFE"
    : "FAIL",
  "adapter update function exists"
);

add(
  "adapter-global",
  script.includes("window.ScopedLabsLicensePlateGuidance") &&
    script.includes("getLastGuidance") &&
    script.includes("explainLastGuidance")
    ? "SAFE"
    : "FAIL",
  "dev inspection global exists"
);

add(
  "success-hook",
  script.includes("updateLicensePlateUserGuidance(data)") &&
    script.includes("publishLicensePlateGuidanceEvent")
    ? "SAFE"
    : "FAIL",
  "renderSuccess updates guidance after successful flow write"
);

add(
  "no-normalized-guidance-pipeline-mutation",
  !script.includes("normalizedGuidance:") &&
    !script.includes("assistantGuidance: latestLicensePlateGuidance")
    ? "SAFE"
    : "FAIL",
  "writeFlow payload does not carry the normalized adapter guidance object"
);

add(
  "no-dom-rendering-ownership",
  !script.includes("latestLicensePlateGuidance.innerHTML") &&
    !script.includes("buildLicensePlateUserGuidance(data).innerHTML")
    ? "SAFE"
    : "FAIL",
  "adapter builder does not own visible DOM rendering"
);

console.table(rows);

const summary = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Summary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", summary.SAFE || 0);
console.log("- WATCH:", summary.WATCH || 0);
console.log("- FAIL:", summary.FAIL || 0);

if (summary.WATCH) {
  console.log("");
  console.log("Watch items:");
  rows.filter((row) => row.status === "WATCH").forEach((row) => {
    console.log("- " + row.id + ": " + row.detail);
  });
}

if (summary.FAIL || summary.WATCH) {
  console.log("");
  console.log(summary.FAIL ? "Audit complete with FAIL items." : "Audit complete with WATCH items.");
  process.exitCode = summary.FAIL ? 1 : 2;
} else {
  console.log("");
  console.log("Audit complete. No files modified.");
}
