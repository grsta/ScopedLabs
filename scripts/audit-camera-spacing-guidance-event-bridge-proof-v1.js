const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "camera-spacing-guidance-event-bridge-proof-audit-001";

const indexFile = path.join(root, "tools", "physical-security", "camera-spacing", "index.html");
const scriptFile = path.join(root, "tools", "physical-security", "camera-spacing", "script.js");
const bridgeFile = path.join(root, "assets", "physical-security-guidance-event-bridge.js");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const html = read(indexFile);
const js = read(scriptFile);
const bridge = read(bridgeFile);

const rows = [
  {
    id: "bridge-loaded",
    status: html.includes("/assets/physical-security-guidance-event-bridge.js?v=physical-security-guidance-event-bridge-001-foundation") ? "SAFE" : "WATCH",
    detail: "Camera Spacing loads shared guidance event bridge"
  },
  {
    id: "bridge-global-used",
    status: js.includes("ScopedLabsPhysicalSecurityGuidanceEventBridge") ? "SAFE" : "WATCH",
    detail: "Camera Spacing references bridge global"
  },
  {
    id: "validated-guidance-publish",
    status:
      js.includes("function publishPhysicalSecurityCameraSpacingGuidance") &&
      js.includes("publishIfChanged") &&
      js.includes('publishPhysicalSecurityCameraSpacingGuidance("camera-spacing-guidance-update")') ? "SAFE" : "WATCH",
    detail: "validated local assistant guidance publishes through bridge"
  },
  {
    id: "sampler-proof",
    status:
      js.includes("function samplePhysicalSecurityCameraSpacingGuidance") &&
      js.includes("createSampler") &&
      js.includes("camera-spacing-ui-guidance-sample") ? "SAFE" : "WATCH",
    detail: "generic UI sampling checks whether validated guidance changed"
  },
  {
    id: "dirty-raw-input-proof",
    status:
      js.includes("physicalSecurityCameraSpacingGuidanceDirty") &&
      js.includes("handlePhysicalSecurityCameraSpacingRawValueChange") &&
      js.includes("markPhysicalSecurityCameraSpacingGuidanceInputDirty") ? "SAFE" : "WATCH",
    detail: "raw input changes clear stale category guidance before republishing"
  },
  {
    id: "no-active-cta-label-list",
    status:
      !js.includes("isPhysicalSecurityCategoryGuidanceRenderTrigger(label, trigger)") &&
      !js.includes("custom design") &&
      !js.includes("wider hfov check") &&
      !js.includes("efficiency check") ? "SAFE" : "WATCH",
    detail: "proof no longer depends on enumerated assistant CTA labels"
  },
  {
    id: "bridge-asset-api",
    status:
      bridge.includes("publishIfChanged") &&
      bridge.includes("createSampler") &&
      bridge.includes("scopedlabs:physical-security-guidance-updated") ? "SAFE" : "WATCH",
    detail: "shared bridge exposes event/sampler APIs"
  },
  {
    id: "no-runtime-fetch",
    status: !/fetch\s*\(/.test(html + "\n" + js + "\n" + bridge) ? "SAFE" : "WATCH",
    detail: "event bridge proof adds no runtime web fetch"
  }
];

console.log("\nCamera Spacing Guidance Event Bridge Proof Audit\n");
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
