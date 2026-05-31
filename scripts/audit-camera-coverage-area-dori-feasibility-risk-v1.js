const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "camera-coverage-area-dori-feasibility-risk-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const script = read("tools/physical-security/camera-coverage-area/script.js");
const index = read("tools/physical-security/camera-coverage-area/index.html");
const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function check(prefix, sourceName, source, signals) {
  signals.forEach((signal) => {
    const ok = source.includes(signal);
    add(
      prefix + "-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
      ok ? "SAFE" : "FAIL",
      ok ? sourceName + " contains " + signal : sourceName + " missing " + signal
    );
  });
}

check("coverage-script", "Coverage Area script", script, [
  "camera-coverage-area-dori-feasibility-risk-002",
  "const DORI_DETECTION_PX_PER_M = 25;",
  "const DORI_OBSERVATION_PX_PER_M = 63;",
  "const DORI_RECOGNITION_PX_PER_M = 125;",
  "const DORI_IDENTIFICATION_PX_PER_M = 250;",
  "const DORI_COMMON_4K_HORIZONTAL_PX = 3840;",
  "const DORI_UPPER_SANITY_HORIZONTAL_PX = 7680;",
  "function coverageDoriFeasibilityCheck(data)",
  "const requiredDetectionHorizontalPx = planningWidth * detectionPxPerFt;",
  "requiredDetectionHorizontalPx > DORI_UPPER_SANITY_HORIZONTAL_PX",
  "requiredDetectionHorizontalPx > DORI_COMMON_4K_HORIZONTAL_PX",
  "const resolvedStatus = worstCoverageStatus(statusPack.status, doriCheck.status);",
  "status: resolvedStatus",
  "doriStatus: doriCheck.status",
  "doriRequiredDetectionHorizontalPx: doriCheck.requiredDetectionHorizontalPx",
  "Coverage geometry fails DORI detection feasibility.",
  "Rework Coverage Geometry Before Spacing",
  "DORI detection requires",
  "[\"DORI feasibility\", data.doriLabel || data.doriStatus || \"Not flagged\"]"
]);

check("coverage-index", "Coverage Area index", index, [
  "./script.js?v=camera-coverage-area-dori-feasibility-risk-002",
  "camera-coverage-area-dori-feasibility-risk-002"
]);

add(
  "status-pack-no-longer-direct-source",
  !script.includes("status: statusPack.status,") ? "SAFE" : "FAIL",
  !script.includes("status: statusPack.status,")
    ? "statusPack no longer directly controls final assistant status"
    : "statusPack still directly controls final assistant status"
);

const detectionPxPerFt = 25 / 3.280839895;
const sampleUsableWidth = 4274;
const requiredDetection = sampleUsableWidth * detectionPxPerFt;

add(
  "sample-wide-footprint-flags-risk",
  requiredDetection > 7680 ? "SAFE" : "FAIL",
  "4274 ft usable width requires about " + Math.round(requiredDetection).toLocaleString() + " horizontal pixels for DORI detection"
);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Camera Coverage Area DORI Feasibility Risk Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
