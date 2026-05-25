const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "camera-spacing-guidance-adapter-audit-001";
const helperFile = path.join(root, "assets", "user-assistant-guidance.js");
const htmlFile = path.join(root, "tools", "physical-security", "camera-spacing", "index.html");
const jsFile = path.join(root, "tools", "physical-security", "camera-spacing", "script.js");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function between(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  if (start < 0) return "";
  const end = text.indexOf(endNeedle, start);
  if (end < 0 || end <= start) return "";
  return text.slice(start, end);
}

const helper = read(helperFile);
const html = read(htmlFile);
const js = read(jsFile);

const scriptTags = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);
const helperIndex = scriptTags.findIndex((src) => src.includes("/assets/user-assistant-guidance.js"));
const localIndex = scriptTags.findIndex((src) => src.includes("./script.js"));

const renderSuccessBody = between(js, "function renderSuccess(data)", "function calc()");
const writeFlowPayload = between(js, "ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.spacing", "updateActiveAreaFromSpacing(data);");

const checks = [
  {
    id: "helper-file",
    ok: fs.existsSync(helperFile),
    detail: "assets/user-assistant-guidance.js exists"
  },
  {
    id: "helper-version",
    ok: helper.includes("user-assistant-guidance-001-schema-foundation"),
    detail: "helper version marker present"
  },
  {
    id: "helper-api",
    ok:
      helper.includes("function createGuidance") &&
      helper.includes("function validateGuidance") &&
      helper.includes("function explainGuidance") &&
      helper.includes("ScopedLabsUserAssistantGuidance"),
    detail: "shared helper exports expected schema API"
  },
  {
    id: "helper-include",
    ok: helperIndex >= 0,
    detail: "Camera Spacing loads user-assistant-guidance.js"
  },
  {
    id: "helper-before-local",
    ok: helperIndex >= 0 && localIndex >= 0 && helperIndex < localIndex,
    detail: "user guidance helper loads before Camera Spacing local script"
  },
  {
    id: "local-cache-bust",
    ok: /script\.js\?v=physical-security-spacing-user-guidance-adapter-\d+/i.test(html),
    detail: "Camera Spacing local script cache is on user-guidance adapter version"
  },
  {
    id: "adapter-state",
    ok: js.includes("let latestUserGuidance = null;"),
    detail: "adapter stores latest normalized guidance"
  },
  {
    id: "adapter-builder",
    ok: js.includes("function buildCameraSpacingUserGuidance(data, scenarios)"),
    detail: "adapter guidance builder exists"
  },
  {
    id: "adapter-update",
    ok: js.includes("function updateCameraSpacingUserGuidance(data)"),
    detail: "adapter update function exists"
  },
  {
    id: "adapter-global",
    ok:
      js.includes("window.ScopedLabsCameraSpacingGuidance") &&
      js.includes("getLastGuidance") &&
      js.includes("explainLastGuidance"),
    detail: "dev inspection global exists"
  },
  {
    id: "success-hook",
    ok:
      !!renderSuccessBody &&
      /renderSpacingAssistant\(data\);[\s\S]*?updateCameraSpacingUserGuidance\(data\);[\s\S]*?renderSpacingExportSection\(data\);/.test(renderSuccessBody),
    detail: "renderSuccess updates guidance after assistant render and before export section"
  },
  {
    id: "no-pipeline-payload-mutation",
    ok:
      !!writeFlowPayload &&
      !/latestUserGuidance|userGuidance|CameraSpacingGuidance|ScopedLabsUserAssistantGuidance/i.test(writeFlowPayload),
    detail: "writeFlow payload does not carry user guidance yet"
  },
  {
    id: "no-dom-rendering-ownership",
    ok:
      !/function buildCameraSpacingUserGuidance[\s\S]*?(appendChild|insertAdjacentHTML|classList\.add|setAttribute|innerHTML\s*=)[\s\S]*?function writeFlow/.test(js),
    detail: "adapter builder does not own DOM rendering"
  }
];

const rows = checks.map((item) => ({
  id: item.id,
  status: item.ok ? "SAFE" : "WATCH",
  detail: item.detail
}));

const safe = rows.filter((row) => row.status === "SAFE").length;
const watch = rows.filter((row) => row.status === "WATCH").length;

console.log("\nCamera Spacing Guidance Adapter Audit\n");
console.log("Audit version:", auditVersion);
console.log("Tool: camera-spacing");
console.table(rows);

console.log("\nSummary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", safe);
console.log("- WATCH:", watch);
console.log("- FAIL:", 0);

if (watch > 0) {
  console.log("\nWatch items:");
  rows.filter((row) => row.status === "WATCH").forEach((row) => {
    console.log("- " + row.id + ": " + row.detail);
  });
}

console.log("\nAudit complete. No files modified.");

if (watch > 0) {
  process.exitCode = 1;
}
