const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "physical-security-guidance-memory-proof-audit-001";

const memoryFile = path.join(root, "assets", "physical-security-guidance-memory.js");
const categoryGuidanceFile = path.join(root, "assets", "physical-security-category-guidance.js");
const cameraIndexFile = path.join(root, "tools", "physical-security", "camera-spacing", "index.html");
const cameraScriptFile = path.join(root, "tools", "physical-security", "camera-spacing", "script.js");

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

const memory = read(memoryFile);
const categoryGuidance = read(categoryGuidanceFile);
const cameraHtml = read(cameraIndexFile);
const cameraJs = read(cameraScriptFile);
const srcs = scriptSrcs(cameraHtml);

const memoryIndex = indexOfBase(srcs, "/assets/physical-security-guidance-memory.js");
const categoryGuidanceIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance.js");
const rendererIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance-renderer.js");
const localIndex = indexOfBase(srcs, "./script.js");

const rows = [
  {
    id: "memory-file",
    status: fs.existsSync(memoryFile) ? "SAFE" : "FAIL",
    detail: "memory asset exists"
  },
  {
    id: "memory-version",
    status: memory.includes("physical-security-guidance-memory-001-session-foundation") ? "SAFE" : "WATCH",
    detail: "memory version marker"
  },
  {
    id: "memory-global-api",
    status:
      memory.includes("ScopedLabsPhysicalSecurityGuidanceMemory") &&
      memory.includes("saveToolGuidance") &&
      memory.includes("getToolGuidance") &&
      memory.includes("listToolGuidance") &&
      memory.includes("explainMemory") ? "SAFE" : "WATCH",
    detail: "memory exposes expected API"
  },
  {
    id: "session-storage-key",
    status: memory.includes("scopedlabs:physical-security:guidance-memory:v1") ? "SAFE" : "WATCH",
    detail: "sessionStorage key is scoped to Physical Security"
  },
  {
    id: "category-guidance-memory-aware-version",
    status: categoryGuidance.includes("physical-security-category-guidance-003-deduped-visible-gate") ? "SAFE" : "WATCH",
    detail: "category guidance version bumped to memory-aware master"
  },
  {
    id: "category-guidance-reads-memory",
    status:
      categoryGuidance.includes("function getGuidanceMemory") &&
      categoryGuidance.includes("memoryBackedGuidanceFor") &&
      categoryGuidance.includes("guidanceSource") &&
      categoryGuidance.includes("memoryRecord") ? "SAFE" : "WATCH",
    detail: "category guidance can fall back to saved memory"
  },
  {
    id: "category-guidance-value-gate",
    status:
      categoryGuidance.includes("function shouldShowVisibleCategoryGuidance") &&
      categoryGuidance.includes("multiple-tools-generated") &&
      categoryGuidance.includes("priority-tool-is-not-current-tool") &&
      categoryGuidance.includes("dedupe-local-assistant-output") ? "SAFE" : "WATCH",
    detail: "category guidance exposes visible value gate"
  },
  {
    id: "camera-spacing-loads-memory",
    status:
      cameraHtml.includes("/assets/physical-security-guidance-memory.js?v=physical-security-guidance-memory-001-session-foundation") &&
      memoryIndex >= 0 &&
      categoryGuidanceIndex >= 0 &&
      memoryIndex < categoryGuidanceIndex ? "SAFE" : "WATCH",
    detail: JSON.stringify({ memoryIndex, categoryGuidanceIndex, rendererIndex, localIndex })
  },
  {
    id: "camera-spacing-memory-aware-category-guidance",
    status: cameraHtml.includes("/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-003-deduped-visible-gate") ? "SAFE" : "WATCH",
    detail: "Camera Spacing loads memory-aware category guidance"
  },
  {
    id: "camera-spacing-local-cache",
    status: cameraHtml.includes("./script.js?v=physical-security-camera-spacing-category-guidance-renderer-proof-008-event-bridge") ? "SAFE" : "WATCH",
    detail: "Camera Spacing local script cache bumped"
  },
  {
    id: "camera-spacing-saves-memory",
    status:
      cameraJs.includes("function savePhysicalSecurityCameraSpacingGuidanceMemory") &&
      cameraJs.includes('memory.saveToolGuidance("camera-spacing"') &&
      cameraJs.includes("savePhysicalSecurityCameraSpacingGuidanceMemory();") ? "SAFE" : "WATCH",
    detail: "Camera Spacing saves normalized guidance to memory"
  },
  {
    id: "camera-spacing-render-value-gated",
    status:
      cameraJs.includes('shouldShowVisibleCategoryGuidance("camera-spacing"') &&
      cameraJs.includes("if (!gate.show)") &&
      cameraJs.includes("clearPhysicalSecurityCategoryGuidance();") ? "SAFE" : "WATCH",
    detail: "visible category card is gated to avoid duplicate local assistant output"
  },
  {
    id: "camera-spacing-memory-clear-sync",
    status:
      cameraJs.includes("function clearPhysicalSecurityCameraSpacingGuidanceMemory") &&
      cameraJs.includes('memory.clearToolGuidance("camera-spacing")') ? "SAFE" : "WATCH",
    detail: "Camera Spacing can clear stale category memory"
  },
  {
    id: "camera-spacing-save-before-render",
    status:
      cameraJs.includes("savePhysicalSecurityCameraSpacingGuidanceMemory();\\n\\n    const explanation") ||
      cameraJs.includes("savePhysicalSecurityCameraSpacingGuidanceMemory();\n\n    const explanation") ? "SAFE" : "WATCH",
    detail: "Camera Spacing refreshes memory before category guidance renders"
  },
  {
    id: "renderer-order",
    status:
      memoryIndex >= 0 &&
      categoryGuidanceIndex >= 0 &&
      rendererIndex >= 0 &&
      localIndex >= 0 &&
      memoryIndex < categoryGuidanceIndex &&
      categoryGuidanceIndex < rendererIndex &&
      rendererIndex < localIndex ? "SAFE" : "WATCH",
    detail: JSON.stringify({ memoryIndex, categoryGuidanceIndex, rendererIndex, localIndex })
  },
  {
    id: "no-runtime-fetch",
    status: !/fetch\s*\(/.test(memory + "\n" + categoryGuidance + "\n" + cameraJs) ? "SAFE" : "WATCH",
    detail: "memory proof does not add runtime web fetch"
  }
];

console.log("\nPhysical Security Guidance Memory Proof Audit\n");
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
