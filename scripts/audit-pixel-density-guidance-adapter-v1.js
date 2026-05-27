const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "pixel-density-guidance-adapter-audit-002-event-bridge-cache-proof";
const helperFile = path.join(root, "assets", "user-assistant-guidance.js");
const htmlFile = path.join(root, "tools", "physical-security", "pixel-density", "index.html");
const jsFile = path.join(root, "tools", "physical-security", "pixel-density", "script.js");

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
const writeFlowPayload = between(js, "ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.pixel", "updateActiveAreaFromPixelDensity(data");

const checks = [
  {
    id: "helper-file",
    ok: fs.existsSync(helperFile),
    detail: "assets/user-assistant-guidance.js exists"
  },
  {
    id: "helper-version",
    ok: helper.includes("user-assistant-guidance-001-schema-foundation"),
    detail: "shared helper version marker is present"
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
    detail: "Pixel Density loads user-assistant-guidance.js"
  },
  {
    id: "helper-before-local",
    ok: helperIndex >= 0 && localIndex >= 0 && helperIndex < localIndex,
    detail: "user guidance helper loads before Pixel Density local script"
  },
  {
    id: "local-cache-bust",
    ok:
      html.includes("./script.js?v=physical-security-pixel-user-guidance-adapter-") ||
      html.includes("./script.js?v=physical-security-pixel-guidance-event-bridge-"),
    detail: "Pixel Density local script cache is on user-guidance adapter or event bridge proof version"
  },
  {
    id: "adapter-state",
    ok: js.includes("let latestPixelDensityGuidance = null;"),
    detail: "adapter stores latest normalized guidance"
  },
  {
    id: "adapter-builder",
    ok: js.includes("function buildPixelDensityUserGuidance(data)"),
    detail: "adapter guidance builder exists"
  },
  {
    id: "adapter-update",
    ok: js.includes("function updatePixelDensityUserGuidance(data)"),
    detail: "adapter update function exists"
  },
  {
    id: "adapter-global",
    ok:
      js.includes("window.ScopedLabsPixelDensityGuidance") &&
      js.includes("getLastGuidance") &&
      js.includes("explainLastGuidance"),
    detail: "dev inspection global exists"
  },
  {
    id: "success-hook",
    ok:
      !!renderSuccessBody &&
      /writeFlow\(data\);[\s\S]*?updatePixelDensityUserGuidance\(data\);/.test(renderSuccessBody),
    detail: "renderSuccess updates guidance after successful flow write"
  },
  {
    id: "no-normalized-guidance-pipeline-mutation",
    ok:
      !!writeFlowPayload &&
      !/latestPixelDensityGuidance|PixelDensityGuidance|ScopedLabsUserAssistantGuidance|userGuidance/i.test(writeFlowPayload),
    detail: "writeFlow payload does not carry the normalized adapter guidance object"
  },
  {
    id: "no-dom-rendering-ownership",
    ok:
      !/function buildPixelDensityUserGuidance[\s\S]*?(appendChild|insertAdjacentHTML|classList\.add|setAttribute|innerHTML\s*=)[\s\S]*?function writeFlow/.test(js),
    detail: "adapter builder does not own visible DOM rendering"
  }
];

const rows = checks.map((item) => ({
  id: item.id,
  status: item.ok ? "SAFE" : "WATCH",
  detail: item.detail
}));

const safe = rows.filter((row) => row.status === "SAFE").length;
const watch = rows.filter((row) => row.status === "WATCH").length;

console.log("\nPixel Density Guidance Adapter Audit\n");
console.log("Audit version:", auditVersion);
console.log("Tool: pixel-density");
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
