const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "face-recognition-guidance-adapter-audit-001";
const helperFile = path.join(root, "assets", "user-assistant-guidance.js");
const htmlFile = path.join(root, "tools", "physical-security", "face-recognition-range", "index.html");
const jsFile = path.join(root, "tools", "physical-security", "face-recognition-range", "script.js");

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
const writeFlowPayload = between(js, "ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.face", "updateActiveAreaFromFaceRecognition(data");

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
    detail: "Face Recognition loads user-assistant-guidance.js"
  },
  {
    id: "helper-before-local",
    ok: helperIndex >= 0 && localIndex >= 0 && helperIndex < localIndex,
    detail: "user guidance helper loads before Face Recognition local script"
  },
  {
    id: "local-cache-bust",
    ok: /script\.js\?v=physical-security-face-user-guidance-adapter-\d+/i.test(html),
    detail: "Face Recognition local script cache is on user-guidance adapter version"
  },
  {
    id: "adapter-state",
    ok: js.includes("let latestFaceRecognitionGuidance = null;"),
    detail: "adapter stores latest normalized guidance"
  },
  {
    id: "adapter-builder",
    ok: js.includes("function buildFaceRecognitionUserGuidance(data)"),
    detail: "adapter guidance builder exists"
  },
  {
    id: "adapter-update",
    ok: js.includes("function updateFaceRecognitionUserGuidance(data)"),
    detail: "adapter update function exists"
  },
  {
    id: "adapter-global",
    ok:
      js.includes("window.ScopedLabsFaceRecognitionGuidance") &&
      js.includes("getLastGuidance") &&
      js.includes("explainLastGuidance"),
    detail: "dev inspection global exists"
  },
  {
    id: "success-hook",
    ok:
      !!renderSuccessBody &&
      /writeFlow\(data\);[\s\S]*?updateFaceRecognitionUserGuidance\(data\);/.test(renderSuccessBody),
    detail: "renderSuccess updates guidance after successful flow write"
  },
  {
    id: "no-normalized-guidance-pipeline-mutation",
    ok:
      !!writeFlowPayload &&
      !/latestFaceRecognitionGuidance|FaceRecognitionGuidance|ScopedLabsUserAssistantGuidance|userGuidance/i.test(writeFlowPayload),
    detail: "writeFlow payload does not carry the normalized adapter guidance object"
  },
  {
    id: "no-dom-rendering-ownership",
    ok:
      !/function buildFaceRecognitionUserGuidance[\s\S]*?(appendChild|insertAdjacentHTML|classList\.add|setAttribute|innerHTML\s*=)[\s\S]*?function writeFlow/.test(js),
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

console.log("\nFace Recognition Guidance Adapter Audit\n");
console.log("Audit version:", auditVersion);
console.log("Tool: face-recognition-range");
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
