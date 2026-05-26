const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "camera-spacing-category-guidance-renderer-proof-audit-005-apply-trigger";

const indexFile = path.join(root, "tools", "physical-security", "camera-spacing", "index.html");
const scriptFile = path.join(root, "tools", "physical-security", "camera-spacing", "script.js");
const cssFile = path.join(root, "assets", "physical-security-category-guidance-renderer.css");
const rendererFile = path.join(root, "assets", "physical-security-category-guidance-renderer.js");
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
const areaHtml = read(areaPlannerFile);
const lensHtml = read(lensSelectionFile);
const srcs = scriptSrcs(html);

const categoryGuidanceIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance.js");
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
    id: "renderer-script-order",
    status:
      categoryGuidanceIndex >= 0 &&
      rendererIndex >= 0 &&
      localIndex >= 0 &&
      categoryGuidanceIndex < rendererIndex &&
      rendererIndex < localIndex ? "SAFE" : "WATCH",
    detail: JSON.stringify({ categoryGuidanceIndex, rendererIndex, localIndex })
  },
  {
    id: "renderer-script-singleton",
    status: countBase(srcs, "/assets/physical-security-category-guidance-renderer.js") === 1 ? "SAFE" : "WATCH",
    detail: "renderer script appears once"
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
    status: html.includes("./script.js?v=physical-security-camera-spacing-category-guidance-renderer-proof-005-apply-trigger") ? "SAFE" : "WATCH",
    detail: "Camera Spacing local script cache was bumped"
  },
  {
    id: "camera-spacing-js",
    status: fs.existsSync(scriptFile) ? "SAFE" : "FAIL",
    detail: "Camera Spacing script exists"
  },
  {
    id: "helper-block",
    status:
      js.includes("physical-security-category-guidance-renderer-proof-005") &&
      js.includes("function renderPhysicalSecurityCategoryGuidance") &&
      js.includes("function clearPhysicalSecurityCategoryGuidance") &&
      js.includes("function queuePhysicalSecurityCategoryGuidanceRender") &&
      js.includes("ScopedLabsCameraSpacingCategoryGuidanceProof") ? "SAFE" : "WATCH",
    detail: "explicit render/queue/clear helpers and debug bridge exist"
  },
  {
    id: "direct-render-hook",
    status:
      js.includes("updateCameraSpacingUserGuidance(data);") &&
      js.includes("queuePhysicalSecurityCategoryGuidanceRender();") ? "SAFE" : "WATCH",
    detail: "renderer queues after Camera Spacing guidance updates"
  },
  {
    id: "fallback-calculate-trigger",
    status:
      js.includes('label.includes("calculate") || label.includes("apply")') &&
      js.includes("bindPhysicalSecurityCategoryGuidanceRenderTriggers") ? "SAFE" : "WATCH",
    detail: "fallback Calculate/Apply click trigger exists"
  },
  {
    id: "generated-count-gate",
    status: js.includes("Number(explanation.counts.generated || 0) <= 0") ? "SAFE" : "WATCH",
    detail: "renderer will not show before generated guidance exists"
  },
  {
    id: "input-change-clear-handler",
    status:
      js.includes('addEventListener("input", clearPhysicalSecurityCategoryGuidance') &&
      js.includes('addEventListener("change", clearPhysicalSecurityCategoryGuidance') ? "SAFE" : "WATCH",
    detail: "visible category guidance clears on input/change"
  },
  {
    id: "area-planner-untouched",
    status: !areaHtml.includes("/assets/physical-security-category-guidance-renderer.js") ? "SAFE" : "WATCH",
    detail: "Area Planner does not load visible renderer"
  },
  {
    id: "lens-selection-protected",
    status: !lensHtml.includes("/assets/physical-security-category-guidance-renderer.js") ? "SAFE" : "WATCH",
    detail: "Lens Selection does not load visible renderer"
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
    id: "no-runtime-fetch-added",
    status: !/fetch\s*\(/.test(js + "\n" + renderer + "\n" + css) ? "SAFE" : "WATCH",
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
