const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "license-plate-guidance-event-bridge-proof-audit-001";

const indexFile = path.join(root, "tools", "physical-security", "license-plate-range", "index.html");
const scriptFile = path.join(root, "tools", "physical-security", "license-plate-range", "script.js");
const bridgeFile = path.join(root, "assets", "physical-security-guidance-event-bridge.js");
const areaPlannerFile = path.join(root, "tools", "physical-security", "area-planner", "index.html");
const lensSelectionFile = path.join(root, "tools", "physical-security", "lens-selection", "index.html");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]);
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

const html = read(indexFile);
const js = read(scriptFile);
const bridge = read(bridgeFile);
const areaHtml = read(areaPlannerFile);
const lensHtml = read(lensSelectionFile);
const srcs = scriptSrcs(html);

const helperIndex = indexOfBase(srcs, "/assets/user-assistant-guidance.js");
const memoryIndex = indexOfBase(srcs, "/assets/physical-security-guidance-memory.js");
const categoryGuidanceIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance.js");
const bridgeIndex = indexOfBase(srcs, "/assets/physical-security-guidance-event-bridge.js");
const localIndex = indexOfBase(srcs, "./script.js");

const rows = [
  {
    id: "license-plate-index",
    status: fs.existsSync(indexFile) ? "SAFE" : "FAIL",
    detail: "License Plate index exists"
  },
  {
    id: "memory-loaded",
    status: html.includes("/assets/physical-security-guidance-memory.js?v=physical-security-guidance-memory-001-session-foundation") ? "SAFE" : "WATCH",
    detail: "License Plate loads shared guidance memory"
  },
  {
    id: "category-guidance-current",
    status: html.includes("/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-003-deduped-visible-gate") ? "SAFE" : "WATCH",
    detail: "License Plate loads current memory-aware category guidance"
  },
  {
    id: "bridge-loaded",
    status: html.includes("/assets/physical-security-guidance-event-bridge.js?v=physical-security-guidance-event-bridge-001-foundation") ? "SAFE" : "WATCH",
    detail: "License Plate loads shared guidance event bridge"
  },
  {
    id: "bridge-singleton",
    status: countBase(srcs, "/assets/physical-security-guidance-event-bridge.js") === 1 ? "SAFE" : "WATCH",
    detail: "event bridge script appears once"
  },
  {
    id: "script-order",
    status:
      helperIndex >= 0 &&
      memoryIndex >= 0 &&
      categoryGuidanceIndex >= 0 &&
      bridgeIndex >= 0 &&
      localIndex >= 0 &&
      helperIndex < localIndex &&
      memoryIndex < categoryGuidanceIndex &&
      categoryGuidanceIndex < bridgeIndex &&
      bridgeIndex < localIndex ? "SAFE" : "WATCH",
    detail: JSON.stringify({ helperIndex, memoryIndex, categoryGuidanceIndex, bridgeIndex, localIndex })
  },
  {
    id: "local-cache",
    status: html.includes("./script.js?v=physical-security-license-plate-guidance-event-bridge-001-nonvisible") ? "SAFE" : "WATCH",
    detail: "License Plate local script cache bumped"
  },
  {
    id: "adapter-global-preserved",
    status: js.includes("ScopedLabsLicensePlateGuidance") && js.includes("getLastGuidance") ? "SAFE" : "WATCH",
    detail: "License Plate guidance adapter global remains available"
  },
  {
    id: "publish-helper",
    status:
      js.includes("function publishLicensePlateGuidanceEvent") &&
      js.includes("ScopedLabsPhysicalSecurityGuidanceEventBridge") &&
      js.includes("publishIfChanged") &&
      js.includes('tool: "license-plate-range"') ? "SAFE" : "WATCH",
    detail: "License Plate can publish validated guidance through event bridge"
  },
  {
    id: "publish-hook",
    status:
      js.includes("updateLicensePlateUserGuidance(data);") &&
      js.includes('publishLicensePlateGuidanceEvent("license-plate-guidance-update")') ? "SAFE" : "WATCH",
    detail: "License Plate publishes after validated guidance update"
  },
  {
    id: "raw-edit-clear",
    status:
      js.includes("function clearLicensePlateGuidanceEventMemory") &&
      js.includes('bridge.clearTool("license-plate-range")') &&
      js.includes("clearLicensePlateGuidanceEventMemory();") ? "SAFE" : "WATCH",
    detail: "License Plate clears stale memory on raw edits"
  },
  {
    id: "structured-export-preserved",
    status: js.includes("renderPlateStructuredExport(data);") && js.indexOf("renderPlateStructuredExport(data);") < js.indexOf("writeFlow(data);") ? "SAFE" : "WATCH",
    detail: "License Plate structured export remains before writeFlow"
  },
  {
    id: "complete-behavior-preserved",
    status: js.includes("showComplete();") && js.indexOf("showComplete();") > js.indexOf("updateLicensePlateUserGuidance(data);") ? "SAFE" : "WATCH",
    detail: "License Plate final-step completion behavior remains after guidance update"
  },
  {
    id: "no-visible-renderer",
    status:
      !html.includes("/assets/physical-security-category-guidance-renderer.js") &&
      !html.includes("physical-security-category-guidance-mount") ? "SAFE" : "WATCH",
    detail: "License Plate does not add visible category renderer"
  },
  {
    id: "area-planner-untouched",
    status: !areaHtml.includes("/assets/physical-security-guidance-event-bridge.js") && !areaHtml.includes("/assets/physical-security-category-guidance-renderer.js") ? "SAFE" : "WATCH",
    detail: "Area Planner remains untouched"
  },
  {
    id: "lens-selection-protected",
    status: !lensHtml.includes("/assets/physical-security-guidance-event-bridge.js") && !lensHtml.includes("/assets/physical-security-category-guidance-renderer.js") ? "SAFE" : "WATCH",
    detail: "Lens Selection remains protected"
  },
  {
    id: "bridge-asset",
    status:
      fs.existsSync(bridgeFile) &&
      bridge.includes("physical-security-guidance-event-bridge-001-foundation") &&
      bridge.includes("ScopedLabsPhysicalSecurityGuidanceEventBridge") ? "SAFE" : "WATCH",
    detail: "shared event bridge asset exists"
  },
  {
    id: "no-runtime-fetch",
    status: !/fetch\s*\(/.test(html + "\n" + js + "\n" + bridge) ? "SAFE" : "WATCH",
    detail: "License Plate event bridge proof adds no runtime web fetch"
  }
];

console.log("\nLicense Plate Guidance Event Bridge Proof Audit\n");
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
