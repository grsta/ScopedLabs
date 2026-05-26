const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "field-of-view-guidance-event-bridge-proof-audit-001";

const indexFile = path.join(root, "tools", "physical-security", "field-of-view", "index.html");
const scriptFile = path.join(root, "tools", "physical-security", "field-of-view", "script.js");
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
const factoryIndex = indexOfBase(srcs, "/assets/user-guidance-adapter-factory.js");
const memoryIndex = indexOfBase(srcs, "/assets/physical-security-guidance-memory.js");
const categoryGuidanceIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance.js");
const bridgeIndex = indexOfBase(srcs, "/assets/physical-security-guidance-event-bridge.js");
const localIndex = indexOfBase(srcs, "./script.js");

const rows = [
  {
    id: "field-of-view-index",
    status: fs.existsSync(indexFile) ? "SAFE" : "FAIL",
    detail: "Field of View index exists"
  },
  {
    id: "memory-loaded",
    status: html.includes("/assets/physical-security-guidance-memory.js?v=physical-security-guidance-memory-001-session-foundation") ? "SAFE" : "WATCH",
    detail: "Field of View loads shared guidance memory"
  },
  {
    id: "category-guidance-current",
    status: html.includes("/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-003-deduped-visible-gate") ? "SAFE" : "WATCH",
    detail: "Field of View loads current memory-aware category guidance"
  },
  {
    id: "bridge-loaded",
    status: html.includes("/assets/physical-security-guidance-event-bridge.js?v=physical-security-guidance-event-bridge-001-foundation") ? "SAFE" : "WATCH",
    detail: "Field of View loads shared guidance event bridge"
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
      factoryIndex >= 0 &&
      memoryIndex >= 0 &&
      categoryGuidanceIndex >= 0 &&
      bridgeIndex >= 0 &&
      localIndex >= 0 &&
      helperIndex < factoryIndex &&
      factoryIndex < localIndex &&
      memoryIndex < categoryGuidanceIndex &&
      categoryGuidanceIndex < bridgeIndex &&
      bridgeIndex < localIndex ? "SAFE" : "WATCH",
    detail: JSON.stringify({ helperIndex, factoryIndex, memoryIndex, categoryGuidanceIndex, bridgeIndex, localIndex })
  },
  {
    id: "local-cache",
    status: html.includes("./script.js?v=physical-security-fov-guidance-event-bridge-001-nonvisible") ? "SAFE" : "WATCH",
    detail: "Field of View local script cache bumped"
  },
  {
    id: "adapter-global-preserved",
    status: js.includes("ScopedLabsFieldOfViewGuidance") && js.includes("getLastGuidance") ? "SAFE" : "WATCH",
    detail: "Field of View guidance adapter global remains available"
  },
  {
    id: "publish-helper",
    status:
      js.includes("function publishFieldOfViewGuidanceEvent") &&
      js.includes("ScopedLabsPhysicalSecurityGuidanceEventBridge") &&
      js.includes("publishIfChanged") &&
      js.includes('tool: "field-of-view"') ? "SAFE" : "WATCH",
    detail: "Field of View can publish validated guidance through event bridge"
  },
  {
    id: "publish-hook",
    status:
      js.includes("updateFieldOfViewUserGuidance(data);") &&
      js.includes('publishFieldOfViewGuidanceEvent("field-of-view-guidance-update")') ? "SAFE" : "WATCH",
    detail: "Field of View publishes after validated guidance update"
  },
  {
    id: "raw-edit-clear",
    status:
      js.includes("function clearFieldOfViewGuidanceEventMemory") &&
      js.includes('bridge.clearTool("field-of-view")') &&
      js.includes("clearFieldOfViewGuidanceEventMemory();") ? "SAFE" : "WATCH",
    detail: "Field of View clears stale memory on raw edits"
  },
  {
    id: "no-visible-renderer",
    status:
      !html.includes("/assets/physical-security-category-guidance-renderer.js") &&
      !html.includes("physical-security-category-guidance-mount") ? "SAFE" : "WATCH",
    detail: "Field of View does not add visible category renderer"
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
    detail: "Field of View event bridge proof adds no runtime web fetch"
  }
];

console.log("\nField of View Guidance Event Bridge Proof Audit\n");
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
