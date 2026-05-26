const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "camera-spacing-category-guidance-renderer-proof-audit-008-event-bridge";

const indexFile = path.join(root, "tools", "physical-security", "camera-spacing", "index.html");
const scriptFile = path.join(root, "tools", "physical-security", "camera-spacing", "script.js");
const cssFile = path.join(root, "assets", "physical-security-category-guidance-renderer.css");
const rendererFile = path.join(root, "assets", "physical-security-category-guidance-renderer.js");
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
const css = read(cssFile);
const renderer = read(rendererFile);
const bridge = read(bridgeFile);
const areaHtml = read(areaPlannerFile);
const lensHtml = read(lensSelectionFile);
const srcs = scriptSrcs(html);

const memoryIndex = indexOfBase(srcs, "/assets/physical-security-guidance-memory.js");
const categoryGuidanceIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance.js");
const bridgeIndex = indexOfBase(srcs, "/assets/physical-security-guidance-event-bridge.js");
const rendererIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance-renderer.js");
const localIndex = indexOfBase(srcs, "./script.js");
const mountIndex = html.indexOf('id="physical-security-category-guidance-mount"');
const exportReportIndex = html.indexOf("Export Report");

const rows = [
  {
    id: "renderer-css-file",
    status: fs.existsSync(cssFile) ? "SAFE" : "FAIL",
    detail: "renderer CSS asset exists"
  },
  {
    id: "camera-spacing-index",
    status: fs.existsSync(indexFile) ? "SAFE" : "FAIL",
    detail: "Camera Spacing index exists"
  },
  {
    id: "css-link",
    status: html.includes("/assets/physical-security-category-guidance-renderer.css?v=physical-security-category-guidance-renderer-css-001-proof") ? "SAFE" : "WATCH",
    detail: "Camera Spacing loads renderer CSS"
  },
  {
    id: "renderer-script-loaded",
    status: html.includes("/assets/physical-security-category-guidance-renderer.js?v=physical-security-category-guidance-renderer-001-foundation") ? "SAFE" : "WATCH",
    detail: "Camera Spacing loads renderer script"
  },
  {
    id: "bridge-script-loaded",
    status: html.includes("/assets/physical-security-guidance-event-bridge.js?v=physical-security-guidance-event-bridge-001-foundation") ? "SAFE" : "WATCH",
    detail: "Camera Spacing loads guidance event bridge"
  },
  {
    id: "script-order",
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
    id: "renderer-script-singleton",
    status: countBase(srcs, "/assets/physical-security-category-guidance-renderer.js") === 1 ? "SAFE" : "WATCH",
    detail: "renderer script appears once"
  },
  {
    id: "bridge-script-singleton",
    status: countBase(srcs, "/assets/physical-security-guidance-event-bridge.js") === 1 ? "SAFE" : "WATCH",
    detail: "event bridge script appears once"
  },
  {
    id: "mount-target",
    status: mountIndex >= 0 ? "SAFE" : "WATCH",
    detail: "explicit renderer mount target exists"
  },
  {
    id: "mount-before-export",
    status: mountIndex >= 0 && exportReportIndex >= 0 && mountIndex < exportReportIndex ? "SAFE" : "WATCH",
    detail: JSON.stringify({ mountIndex, exportReportIndex })
  },
  {
    id: "local-script-cache",
    status: html.includes("./script.js?v=physical-security-camera-spacing-category-guidance-renderer-proof-008-event-bridge") ? "SAFE" : "WATCH",
    detail: "Camera Spacing local script cache was bumped"
  },
  {
    id: "helper-block",
    status:
      js.includes("physical-security-category-guidance-renderer-proof-008") &&
      js.includes("function renderPhysicalSecurityCategoryGuidance") &&
      js.includes("function clearPhysicalSecurityCategoryGuidance") &&
      js.includes("function queuePhysicalSecurityCategoryGuidanceRender") &&
      js.includes("ScopedLabsCameraSpacingCategoryGuidanceProof") ? "SAFE" : "WATCH",
    detail: "explicit render/queue/clear helpers and debug bridge exist"
  },
  {
    id: "event-bridge-publisher",
    status:
      js.includes("function publishPhysicalSecurityCameraSpacingGuidance") &&
      js.includes("ScopedLabsPhysicalSecurityGuidanceEventBridge") &&
      js.includes("publishIfChanged") &&
      js.includes('tool: "camera-spacing"') ? "SAFE" : "WATCH",
    detail: "Camera Spacing publishes validated guidance through event bridge"
  },
  {
    id: "event-bridge-sampler",
    status:
      js.includes("function samplePhysicalSecurityCameraSpacingGuidance") &&
      js.includes("createSampler") &&
      js.includes("camera-spacing-ui-guidance-sample") ? "SAFE" : "WATCH",
    detail: "Camera Spacing samples guidance changes without CTA label lists"
  },
  {
    id: "no-active-cta-label-trigger",
    status:
      !js.includes("isPhysicalSecurityCategoryGuidanceRenderTrigger(label, trigger)") &&
      !js.includes("custom design") &&
      !js.includes("wider hfov check") ? "SAFE" : "WATCH",
    detail: "Camera Spacing no longer relies on named assistant CTA labels"
  },
  {
    id: "guidance-update-publish-hook",
    status:
      js.includes('publishPhysicalSecurityCameraSpacingGuidance("camera-spacing-guidance-update")') &&
      js.includes("physicalSecurityCameraSpacingGuidanceDirty = false") ? "SAFE" : "WATCH",
    detail: "validated assistant guidance changes publish through bridge"
  },
  {
    id: "raw-value-dirty-handler",
    status:
      js.includes("function handlePhysicalSecurityCameraSpacingRawValueChange") &&
      js.includes("markPhysicalSecurityCameraSpacingGuidanceInputDirty") &&
      js.includes('addEventListener("input", handlePhysicalSecurityCameraSpacingRawValueChange') &&
      js.includes('addEventListener("change", handlePhysicalSecurityCameraSpacingRawValueChange') ? "SAFE" : "WATCH",
    detail: "raw input/change clears stale master guidance before validated guidance republishes"
  },
  {
    id: "memory-sync",
    status:
      js.includes("function savePhysicalSecurityCameraSpacingGuidanceMemory") &&
      js.includes("function clearPhysicalSecurityCameraSpacingGuidanceMemory") &&
      js.includes('memory.saveToolGuidance("camera-spacing"') &&
      js.includes('memory.clearToolGuidance("camera-spacing"') ? "SAFE" : "WATCH",
    detail: "Camera Spacing can save and clear category guidance memory"
  },
  {
    id: "value-gate",
    status:
      js.includes('shouldShowVisibleCategoryGuidance("camera-spacing"') &&
      js.includes("if (!gate.show)") &&
      js.includes("clearPhysicalSecurityCategoryGuidance();") ? "SAFE" : "WATCH",
    detail: "visible category card remains value-gated"
  },
  {
    id: "area-planner-untouched",
    status: !areaHtml.includes("/assets/physical-security-guidance-event-bridge.js") && !areaHtml.includes("/assets/physical-security-category-guidance-renderer.js") ? "SAFE" : "WATCH",
    detail: "Area Planner does not load visible renderer or bridge"
  },
  {
    id: "lens-selection-protected",
    status: !lensHtml.includes("/assets/physical-security-guidance-event-bridge.js") && !lensHtml.includes("/assets/physical-security-category-guidance-renderer.js") ? "SAFE" : "WATCH",
    detail: "Lens Selection does not load visible renderer or bridge"
  },
  {
    id: "renderer-asset",
    status:
      fs.existsSync(rendererFile) &&
      renderer.includes("physical-security-category-guidance-renderer-001-foundation") &&
      renderer.includes("ScopedLabsPhysicalSecurityCategoryGuidanceRenderer") ? "SAFE" : "WATCH",
    detail: "shared renderer asset exists"
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
    id: "no-runtime-fetch-added",
    status: !/fetch\s*\(/.test(js + "\n" + renderer + "\n" + bridge + "\n" + css) ? "SAFE" : "WATCH",
    detail: "proof wiring does not add runtime fetch"
  }
];

console.log("\nCamera Spacing Category Guidance Renderer Proof Audit\n");
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
