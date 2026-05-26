const fs = require("fs");
const path = require("path");

const root = process.cwd();

const bridgeFile = path.join(root, "assets", "physical-security-guidance-event-bridge.js");
const cameraIndexFile = path.join(root, "tools", "physical-security", "camera-spacing", "index.html");
const areaPlannerFile = path.join(root, "tools", "physical-security", "area-planner", "index.html");
const lensSelectionFile = path.join(root, "tools", "physical-security", "lens-selection", "index.html");

const auditVersion = "physical-security-guidance-event-bridge-audit-002-script-parser";

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>/gi)).map((match) => match[1]);
}

function baseOf(src) {
  return String(src || "").split("?")[0];
}

function indexOfBase(srcs, base) {
  return srcs.findIndex((src) => baseOf(src) === base);
}

function countBase(srcs, base) {
  return srcs.filter((src) => baseOf(src) === base).length;
}

const bridge = read(bridgeFile);
const cameraHtml = read(cameraIndexFile);
const areaHtml = read(areaPlannerFile);
const lensHtml = read(lensSelectionFile);

const srcs = scriptSrcs(cameraHtml);

const memoryIndex = indexOfBase(srcs, "/assets/physical-security-guidance-memory.js");
const categoryGuidanceIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance.js");
const bridgeIndex = indexOfBase(srcs, "/assets/physical-security-guidance-event-bridge.js");
const rendererIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance-renderer.js");
const localIndex = indexOfBase(srcs, "./script.js");

const rows = [
  {
    id: "bridge-file-exists",
    status: fs.existsSync(bridgeFile) ? "SAFE" : "FAIL",
    detail: "shared event bridge asset exists"
  },
  {
    id: "bridge-version",
    status: bridge.includes("physical-security-guidance-event-bridge-001-foundation") ? "SAFE" : "WATCH",
    detail: "bridge version marker is present"
  },
  {
    id: "bridge-global",
    status: bridge.includes("ScopedLabsPhysicalSecurityGuidanceEventBridge") ? "SAFE" : "WATCH",
    detail: "bridge exposes expected global"
  },
  {
    id: "bridge-event-name",
    status: bridge.includes("scopedlabs:physical-security-guidance-updated") ? "SAFE" : "WATCH",
    detail: "standard guidance-updated event name exists"
  },
  {
    id: "bridge-api",
    status:
      bridge.includes("publishIfChanged") &&
      bridge.includes("createSampler") &&
      bridge.includes("signatureFromGuidance") &&
      bridge.includes("clearTool") &&
      bridge.includes("markDirty") ? "SAFE" : "WATCH",
    detail: "bridge exposes reusable guidance-change APIs"
  },
  {
    id: "memory-aware",
    status:
      bridge.includes("ScopedLabsPhysicalSecurityGuidanceMemory") &&
      bridge.includes("saveToolGuidance") &&
      bridge.includes("clearToolGuidance") ? "SAFE" : "WATCH",
    detail: "bridge can save/clear normalized guidance memory"
  },
  {
    id: "camera-spacing-loads-bridge",
    status: cameraHtml.includes("/assets/physical-security-guidance-event-bridge.js?v=physical-security-guidance-event-bridge-001-foundation") ? "SAFE" : "WATCH",
    detail: "Camera Spacing loads event bridge"
  },
  {
    id: "camera-spacing-bridge-singleton",
    status: countBase(srcs, "/assets/physical-security-guidance-event-bridge.js") === 1 ? "SAFE" : "WATCH",
    detail: "Camera Spacing bridge script appears once"
  },
  {
    id: "camera-spacing-script-order",
    status:
      memoryIndex >= 0 &&
      categoryGuidanceIndex >= 0 &&
      bridgeIndex >= 0 &&
      rendererIndex >= 0 &&
      localIndex >= 0 &&
      memoryIndex < categoryGuidanceIndex &&
      categoryGuidanceIndex < bridgeIndex &&
      bridgeIndex < rendererIndex &&
      rendererIndex < localIndex ? "SAFE" : "WATCH",
    detail: JSON.stringify({ memoryIndex, categoryGuidanceIndex, bridgeIndex, rendererIndex, localIndex })
  },
  {
    id: "area-planner-untouched",
    status: !areaHtml.includes("/assets/physical-security-guidance-event-bridge.js") ? "SAFE" : "WATCH",
    detail: "Area Planner does not load bridge"
  },
  {
    id: "lens-selection-protected",
    status: !lensHtml.includes("/assets/physical-security-guidance-event-bridge.js") ? "SAFE" : "WATCH",
    detail: "Lens Selection does not load bridge"
  },
  {
    id: "no-runtime-fetch-added",
    status: !/fetch\s*\(/.test(bridge + "\n" + cameraHtml) ? "SAFE" : "WATCH",
    detail: "bridge foundation does not add runtime fetch"
  }
];

console.log("\nPhysical Security Guidance Event Bridge Audit\n");
console.log("Audit version:", auditVersion);
console.table(rows);

const safe = rows.filter((row) => row.status === "SAFE").length;
const watch = rows.filter((row) => row.status === "WATCH").length;
const fail = rows.filter((row) => row.status === "FAIL").length;

console.log("\nSummary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", safe);
console.log("- WATCH:", watch);
console.log("- FAIL:", fail);

console.log("\nAudit complete. No files modified.");

if (watch > 0 || fail > 0) {
  process.exitCode = 1;
}
