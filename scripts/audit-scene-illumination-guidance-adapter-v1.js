const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "scene-illumination-guidance-adapter-audit-001";
const helperFile = path.join(root, "assets", "user-assistant-guidance.js");
const factoryFile = path.join(root, "assets", "user-guidance-adapter-factory.js");
const htmlFile = path.join(root, "tools", "physical-security", "scene-illumination", "index.html");
const jsFile = path.join(root, "tools", "physical-security", "scene-illumination", "script.js");

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
const writeFlowPayload = between(js, "ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.scene", "updateActiveAreaFromScene(data);");

const checks = [
  { id: "helper-file", ok: fs.existsSync(helperFile), detail: "assets/user-assistant-guidance.js exists" },
  { id: "helper-version", ok: helper.includes("user-assistant-guidance-001-schema-foundation"), detail: "shared guidance helper version marker is present" },
  { id: "factory-file", ok: fs.existsSync(factoryFile), detail: "assets/user-guidance-adapter-factory.js exists" },
  { id: "factory-version", ok: factory.includes("user-guidance-adapter-factory-001-foundation"), detail: "factory version marker is present" },
  { id: "helper-include", ok: helperIndex >= 0, detail: "Scene Illumination loads user-assistant-guidance.js" },
  { id: "factory-include", ok: factoryIndex >= 0, detail: "Scene Illumination loads user-guidance-adapter-factory.js" },
  { id: "script-order", ok: helperIndex >= 0 && factoryIndex >= 0 && localIndex >= 0 && helperIndex < factoryIndex && factoryIndex < localIndex, detail: "helper loads before factory, and factory loads before local script" },
  { id: "local-cache-bust", ok: /script\.js\?v=physical-security-scene-guidance-factory-adapter-\d+/i.test(html), detail: "Scene Illumination local script cache is on factory adapter version" },
  { id: "no-manual-metadata-function-required", ok: !js.includes("function getManualOverrideMetadata(data)"), detail: "Scene Illumination remains source-field-driven, not manual-metadata-driven" },
  { id: "source-fields-used", ok: js.includes("function sceneIlluminationManualSourceFields(data)") && js.includes("footcandleSourceMode") && js.includes("effectiveSourceMode"), detail: "adapter derives source integrity from lighting source-mode fields" },
  { id: "factory-adapter-builder", ok: js.includes("function buildSceneIlluminationGuidanceInput(data)"), detail: "factory guidance input builder exists" },
  { id: "factory-create-adapter", ok: js.includes("ScopedLabsUserGuidanceAdapterFactory") && js.includes("factory.createAdapter"), detail: "Scene Illumination adapter uses the shared adapter factory" },
  { id: "adapter-update", ok: js.includes("function updateSceneIlluminationUserGuidance(data)"), detail: "Scene Illumination adapter update function exists" },
  { id: "adapter-global", ok: js.includes("ScopedLabsSceneIlluminationGuidance") && js.includes("getLastGuidance") && js.includes("explainLastGuidance"), detail: "Scene Illumination inspection global exists" },
  { id: "success-hook", ok: !!renderSuccessBody && /writeFlow\(data\);[\s\S]*?updateSceneIlluminationUserGuidance\(data\);/.test(renderSuccessBody), detail: "renderSuccess updates guidance after successful flow write" },
  { id: "live-visual-preserved", ok: !!renderSuccessBody && /renderSceneIlluminationLiveVisual\(data\);[\s\S]*?renderSceneStructuredExport\(data\);[\s\S]*?writeFlow\(data\);/.test(renderSuccessBody), detail: "live visual and structured export remain before writeFlow" },
  { id: "continue-preserved", ok: !!renderSuccessBody && /updateSceneIlluminationUserGuidance\(data\);[\s\S]*?ScopedLabsAnalyzer\.showContinue/.test(renderSuccessBody), detail: "continue behavior remains after guidance update" },
  { id: "force-continue-preserved", ok: !!renderSuccessBody && /ScopedLabsAnalyzer\.showContinue[\s\S]*?forceSceneContinueVisible\(\);/.test(renderSuccessBody), detail: "Scene force-continue behavior remains intact" },
  { id: "area-state-preserved", ok: js.includes("function updateActiveAreaFromScene(data)") && js.includes("updateActiveAreaFromScene(data);"), detail: "area-state update remains present" },
  { id: "no-normalized-guidance-pipeline-mutation", ok: !!writeFlowPayload && !/SceneIlluminationGuidance|ScopedLabsUserGuidanceAdapterFactory|ScopedLabsUserAssistantGuidance|sceneIlluminationGuidanceAdapter|updateSceneIlluminationUserGuidance/i.test(writeFlowPayload), detail: "writeFlow payload does not carry the normalized factory guidance object" }
];

const rows = checks.map((item) => ({
  id: item.id,
  status: item.ok ? "SAFE" : "WATCH",
  detail: item.detail
}));

const safe = rows.filter((row) => row.status === "SAFE").length;
const watch = rows.filter((row) => row.status === "WATCH").length;

console.log("\nScene Illumination Guidance Adapter Audit\n");
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
