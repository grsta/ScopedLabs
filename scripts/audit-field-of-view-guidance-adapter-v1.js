const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "field-of-view-guidance-adapter-audit-002-event-bridge-cache-proof";
const helperFile = path.join(root, "assets", "user-assistant-guidance.js");
const factoryFile = path.join(root, "assets", "user-guidance-adapter-factory.js");
const htmlFile = path.join(root, "tools", "physical-security", "field-of-view", "index.html");
const jsFile = path.join(root, "tools", "physical-security", "field-of-view", "script.js");

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
const factory = read(factoryFile);
const html = read(htmlFile);
const js = read(jsFile);

const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);
const helperIndex = scripts.findIndex((src) => src.includes("/assets/user-assistant-guidance.js"));
const factoryIndex = scripts.findIndex((src) => src.includes("/assets/user-guidance-adapter-factory.js"));
const localIndex = scripts.findIndex((src) => src.includes("./script.js"));

const renderSuccessBody = between(js, "function renderSuccess(data)", "function calc()");
const writeFlowPayload = between(js, "ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.fov", "updateActiveAreaFromFov(data);");

const checks = [
  { id: "helper-file", ok: fs.existsSync(helperFile), detail: "assets/user-assistant-guidance.js exists" },
  { id: "helper-version", ok: helper.includes("user-assistant-guidance-001-schema-foundation"), detail: "shared guidance helper version marker is present" },
  { id: "factory-file", ok: fs.existsSync(factoryFile), detail: "assets/user-guidance-adapter-factory.js exists" },
  { id: "factory-version", ok: factory.includes("user-guidance-adapter-factory-001-foundation"), detail: "factory version marker is present" },
  { id: "helper-include", ok: helperIndex >= 0, detail: "Field of View loads user-assistant-guidance.js" },
  { id: "factory-include", ok: factoryIndex >= 0, detail: "Field of View loads user-guidance-adapter-factory.js" },
  { id: "script-order", ok: helperIndex >= 0 && factoryIndex >= 0 && localIndex >= 0 && helperIndex < factoryIndex && factoryIndex < localIndex, detail: "helper loads before factory, and factory loads before local script" },
  {
    id: "local-cache-bust",
    ok:
      html.includes("./script.js?v=physical-security-fov-guidance-factory-adapter-") ||
      html.includes("./script.js?v=physical-security-fov-guidance-event-bridge-"),
    detail: "Field of View local script cache is on factory adapter or event bridge proof version"
  },
  { id: "factory-adapter-builder", ok: js.includes("function buildFieldOfViewGuidanceInput(data)"), detail: "factory guidance input builder exists" },
  { id: "factory-create-adapter", ok: js.includes("ScopedLabsUserGuidanceAdapterFactory") && js.includes("factory.createAdapter"), detail: "Field of View adapter uses the shared adapter factory" },
  { id: "adapter-update", ok: js.includes("function updateFieldOfViewUserGuidance(data)"), detail: "Field of View adapter update function exists" },
  { id: "adapter-global", ok: js.includes("ScopedLabsFieldOfViewGuidance") && js.includes("getLastGuidance") && js.includes("explainLastGuidance"), detail: "Field of View inspection global exists" },
  { id: "success-hook", ok: !!renderSuccessBody && /writeFlow\(data\);[\s\S]*?updateFieldOfViewUserGuidance\(data\);/.test(renderSuccessBody), detail: "renderSuccess updates guidance after successful flow write" },
  { id: "geometry-preserved", ok: !!renderSuccessBody && /renderFovGeometryDiagram\(data\);[\s\S]*?writeFlow\(data\);/.test(renderSuccessBody), detail: "existing Field of View geometry render remains before writeFlow" },
  { id: "continue-preserved", ok: !!renderSuccessBody && /updateFieldOfViewUserGuidance\(data\);[\s\S]*?ScopedLabsAnalyzer\.showContinue/.test(renderSuccessBody), detail: "continue behavior remains after guidance update" },
  { id: "no-normalized-guidance-pipeline-mutation", ok: !!writeFlowPayload && !/FieldOfViewGuidance|ScopedLabsUserGuidanceAdapterFactory|ScopedLabsUserAssistantGuidance|fieldOfViewGuidanceAdapter|updateFieldOfViewUserGuidance/i.test(writeFlowPayload), detail: "writeFlow payload does not carry the normalized factory guidance object" }
];

const rows = checks.map((item) => ({
  id: item.id,
  status: item.ok ? "SAFE" : "WATCH",
  detail: item.detail
}));

const safe = rows.filter((row) => row.status === "SAFE").length;
const watch = rows.filter((row) => row.status === "WATCH").length;

console.log("\nField of View Guidance Adapter Audit\n");
console.log("Audit version:", auditVersion);
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
