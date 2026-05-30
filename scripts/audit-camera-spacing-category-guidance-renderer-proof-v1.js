const fs = require("fs");
const path = require("path");

const root = process.cwd();
const auditVersion = "camera-spacing-master-unpark-audit-001";

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const html = read("tools/physical-security/camera-spacing/index.html");
const js = read("tools/physical-security/camera-spacing/script.js");
const renderer = read("assets/physical-security-category-guidance-renderer.js");

const rows = [];
function add(id, ok, detail) { rows.push({ id, status: ok ? "SAFE" : "FAIL", detail }); }

add("camera-spacing-index-exists", !!html, "Camera Spacing index exists");
add("camera-spacing-script-exists", !!js, "Camera Spacing script exists");
add("renderer-asset-still-exists", !!renderer, "shared renderer asset remains available for Summary");
add("renderer-css-unloaded", !html.includes("/assets/physical-security-category-guidance-renderer.css"), "Camera Spacing no longer loads master renderer CSS");
add("renderer-js-unloaded", !html.includes("/assets/physical-security-category-guidance-renderer.js"), "Camera Spacing no longer loads master renderer JS");
add("renderer-mount-removed", !html.includes("physical-security-category-guidance-mount"), "Camera Spacing master renderer mount is removed");
add("renderer-global-unused", !js.includes("ScopedLabsPhysicalSecurityCategoryGuidanceRenderer"), "Camera Spacing script no longer calls full master renderer");
add("visible-render-noop", js.includes("function renderPhysicalSecurityCategoryGuidance()") && js.includes("return false;"), "legacy visible render hook is inert");
add("queue-render-noop", js.includes("function queuePhysicalSecurityCategoryGuidanceRender()") && js.includes("return false;"), "legacy visible render queue is inert");
add("unpark-proof-global", js.includes("ScopedLabsCameraSpacingMasterUnparkProof") && js.includes("visibleMasterHost: false"), "Camera Spacing records master-unpark proof state");
add("event-bridge-remains", html.includes("/assets/physical-security-guidance-event-bridge.js?v=physical-security-guidance-event-bridge-001-foundation") && js.includes("ScopedLabsPhysicalSecurityGuidanceEventBridge"), "Camera Spacing event bridge publishing remains");
add("guidance-memory-remains", html.includes("/assets/physical-security-guidance-memory.js?v=physical-security-guidance-memory-001-session-foundation") && js.includes("savePhysicalSecurityCameraSpacingGuidanceMemory"), "Camera Spacing guidance memory publishing remains");
add("local-assistant-remains", html.includes("spacingDesignAssistant") && html.includes("spacingAssistantPlaceholder") && js.includes("renderSpacingAssistant(data)"), "Camera Spacing local assistant remains");
add("continue-blind-spot-remains", html.includes("/tools/physical-security/blind-spot-check/") && html.includes("Continue &rarr; Blind Spot Check"), "Camera Spacing pipeline continue remains");
add("script-cache-bumped", html.includes("./script.js?v=physical-security-camera-spacing-master-unpark-001"), "Camera Spacing script cache bumped");
add("no-runtime-fetch", !html.includes("fetch(") && !js.includes("fetch("), "unpark lane adds no runtime fetch");

console.log("");
console.log("Camera Spacing Master Unpark Audit");
console.log("Audit version:", auditVersion);
console.table(rows);

const fail = rows.filter((row) => row.status === "FAIL").length;
const safe = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- SAFE:", safe);
console.log("- FAIL:", fail);

if (fail) process.exitCode = 1;
else console.log("\nAudit complete.");
