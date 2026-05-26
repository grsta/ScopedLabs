const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.cwd();

const generatorVersion = "guidance-adapter-factory-generator-001-dry-run-gate";

const args = process.argv.slice(2);
const wantsApply = args.includes("--apply");
const wantsJson = args.includes("--json");
const categoryArgIndex = args.indexOf("--category");
const toolArgIndex = args.indexOf("--tool");

const category = categoryArgIndex >= 0 && args[categoryArgIndex + 1]
  ? args[categoryArgIndex + 1]
  : "physical-security";

const toolFilter = toolArgIndex >= 0 && args[toolArgIndex + 1]
  ? args[toolArgIndex + 1]
  : "";

if (wantsApply) {
  console.error("Generator V1 is dry-run only. --apply is intentionally disabled.");
  process.exit(1);
}

if (category !== "physical-security") {
  console.error("Generator V1 currently supports only --category physical-security.");
  process.exit(1);
}

const paths = {
  helper: path.join(root, "assets", "user-assistant-guidance.js"),
  factory: path.join(root, "assets", "user-guidance-adapter-factory.js"),
  registry: path.join(root, "assets", "physical-security-guidance-registry.js"),
  driver: path.join(root, "scripts", "guidance-adapter-factory-driver-v1.js"),
  masterSuite: path.join(root, "scripts", "audit-physical-security-guidance-adapters-v1.js"),
  toolsRoot: path.join(root, "tools", "physical-security")
};

const auditFileBySlug = {
  "scene-illumination": "audit-scene-illumination-guidance-adapter-v1.js",
  "mounting-height": "audit-mounting-height-guidance-adapter-v1.js",
  "field-of-view": "audit-field-of-view-guidance-adapter-v1.js",
  "camera-coverage-area": "audit-camera-coverage-area-guidance-adapter-v1.js",
  "camera-spacing": "audit-camera-spacing-guidance-adapter-v1.js",
  "blind-spot-check": "audit-blind-spot-guidance-adapter-v1.js",
  "pixel-density": "audit-pixel-density-guidance-adapter-v1.js",
  "face-recognition-range": "audit-face-recognition-guidance-adapter-v1.js",
  "license-plate-range": "audit-license-plate-guidance-adapter-v1.js"
};

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function loadBrowserAsset(file, globalName) {
  if (!fs.existsSync(file)) {
    throw new Error("Missing asset: " + path.relative(root, file));
  }

  const sandbox = {
    window: {},
    console: {
      log() {},
      warn() {},
      error() {}
    }
  };

  vm.runInNewContext(read(file), sandbox, {
    filename: path.relative(root, file)
  });

  return sandbox.window[globalName] || null;
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]);
}

function pascalCase(slug) {
  return String(slug || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join("");
}

function expectedGlobalName(slug) {
  return "ScopedLabs" + pascalCase(slug) + "Guidance";
}

function expectedAuditName(slug) {
  return auditFileBySlug[slug] || `audit-${slug}-guidance-adapter-v1.js`;
}

function expectedLocalVersion(slug) {
  return `physical-security-${slug}-guidance-factory-adapter-001`;
}

function sourceFieldDriven(entry) {
  return entry.sourceMode === "lighting-source-fields" ||
    entry.sourceMode === "mounting-source-fields" ||
    entry.sourceMode === "source-fields";
}

function toolBasics(entry) {
  const slug = entry.slug;
  const htmlFile = path.join(paths.toolsRoot, slug, "index.html");
  const jsFile = path.join(paths.toolsRoot, slug, "script.js");
  const auditFile = path.join(root, "scripts", expectedAuditName(slug));

  const html = read(htmlFile);
  const js = read(jsFile);
  const srcs = scriptSrcs(html);

  const helperIndex = srcs.findIndex((src) => src.includes("/assets/user-assistant-guidance.js"));
  const factoryIndex = srcs.findIndex((src) => src.includes("/assets/user-guidance-adapter-factory.js"));
  const localIndex = srcs.findIndex((src) => src.includes("./script.js"));

  return {
    slug,
    htmlFile,
    jsFile,
    auditFile,
    html,
    js,
    srcs,
    hasHtml: fs.existsSync(htmlFile),
    hasJs: fs.existsSync(jsFile),
    hasLocalScript: localIndex >= 0,
    hasHelperInclude: helperIndex >= 0,
    hasFactoryInclude: factoryIndex >= 0,
    helperBeforeLocal: helperIndex >= 0 && localIndex >= 0 && helperIndex < localIndex,
    factoryBeforeLocal: factoryIndex >= 0 && localIndex >= 0 && factoryIndex < localIndex,
    helperBeforeFactory: helperIndex >= 0 && factoryIndex >= 0 && helperIndex < factoryIndex,
    hasRenderSuccess: js.includes("function renderSuccess(data)"),
    hasWriteFlow: js.includes("function writeFlow(data)"),
    hasCalculateModel: js.includes("function calculateModel()"),
    hasManualOverrideMetadata: js.includes("function getManualOverrideMetadata(data)"),
    hasAnalyzerRenderOutput: js.includes("ScopedLabsAnalyzer.renderOutput"),
    hasContinueShow: /showContinue\(/.test(js),
    hasGlobal: entry.globalName ? js.includes(entry.globalName) : false,
    hasAudit: fs.existsSync(auditFile)
  };
}

function classify(entry) {
  const basics = toolBasics(entry);
  const expectedGlobal = entry.globalName || expectedGlobalName(entry.slug);
  const auditName = expectedAuditName(entry.slug);

  if (entry.protected) {
    return {
      slug: entry.slug,
      role: entry.role || "",
      status: "SKIP",
      reason: "Protected by registry",
      globalName: entry.globalName || "",
      audit: basics.hasAudit ? auditName : "-",
      plan: []
    };
  }

  if (!entry.guidanceCandidate) {
    return {
      slug: entry.slug,
      role: entry.role || "",
      status: "SKIP",
      reason: "Not a guidance adapter candidate",
      globalName: entry.globalName || "",
      audit: basics.hasAudit ? auditName : "-",
      plan: []
    };
  }

  if (entry.proofStatus === "proven") {
    const sourceOk = basics.hasManualOverrideMetadata || sourceFieldDriven(entry);

    const ok =
      basics.hasHtml &&
      basics.hasJs &&
      basics.hasHelperInclude &&
      basics.helperBeforeLocal &&
      basics.hasRenderSuccess &&
      basics.hasWriteFlow &&
      sourceOk &&
      basics.hasGlobal &&
      basics.hasAudit;

    return {
      slug: entry.slug,
      role: entry.role || "",
      status: ok ? "SAFE" : "FAIL",
      reason: ok
        ? (sourceFieldDriven(entry) ? "Proven source-field adapter is wired and guarded" : "Proven adapter is wired and guarded")
        : JSON.stringify({
          hasHtml: basics.hasHtml,
          hasJs: basics.hasJs,
          hasHelperInclude: basics.hasHelperInclude,
          helperBeforeLocal: basics.helperBeforeLocal,
          hasRenderSuccess: basics.hasRenderSuccess,
          hasWriteFlow: basics.hasWriteFlow,
          hasManualOverrideMetadata: basics.hasManualOverrideMetadata,
          sourceFieldDriven: sourceFieldDriven(entry),
          hasGlobal: basics.hasGlobal,
          hasAudit: basics.hasAudit
        }),
      globalName: entry.globalName || "",
      audit: basics.hasAudit ? auditName : "missing",
      plan: []
    };
  }

  const candidateOk =
    basics.hasHtml &&
    basics.hasJs &&
    basics.hasLocalScript &&
    basics.hasRenderSuccess &&
    basics.hasWriteFlow &&
    basics.hasCalculateModel;

  const plan = candidateOk
    ? [
        "Add /assets/user-assistant-guidance.js before local script if missing",
        "Add /assets/user-guidance-adapter-factory.js before local script if missing",
        "Bump local script cache to " + expectedLocalVersion(entry.slug),
        "Insert factory adapter block before writeFlow(data)",
        "Call update" + pascalCase(entry.slug) + "UserGuidance(data) after writeFlow(data) in renderSuccess(data)",
        "Expose " + expectedGlobal,
        "Create " + auditName,
        "Promote registry entry to proofStatus: proven",
        "Add audit to master Physical Security guidance adapter suite"
      ]
    : [];

  return {
    slug: entry.slug,
    role: entry.role || "",
    status: candidateOk ? "CANDIDATE" : "WATCH",
    reason: candidateOk
      ? (basics.hasManualOverrideMetadata
        ? "Generation plan available for manual-metadata adapter"
        : "Generation plan available for source-field/pipeline adapter after field mapping")
      : JSON.stringify({
        hasHtml: basics.hasHtml,
        hasJs: basics.hasJs,
        hasLocalScript: basics.hasLocalScript,
        hasRenderSuccess: basics.hasRenderSuccess,
        hasWriteFlow: basics.hasWriteFlow,
        hasCalculateModel: basics.hasCalculateModel
      }),
    globalName: expectedGlobal,
    audit: basics.hasAudit ? auditName : "-",
    plan
  };
}

const helper = read(paths.helper);
const factory = read(paths.factory);
const driver = read(paths.driver);
const masterSuite = read(paths.masterSuite);
const registryApi = loadBrowserAsset(paths.registry, "ScopedLabsPhysicalSecurityGuidanceRegistry");

const foundation = [
  {
    id: "helper-file",
    status: fs.existsSync(paths.helper) ? "SAFE" : "FAIL",
    detail: "assets/user-assistant-guidance.js"
  },
  {
    id: "helper-version",
    status: helper.includes("user-assistant-guidance-001-schema-foundation") ? "SAFE" : "WATCH",
    detail: "shared guidance helper version marker"
  },
  {
    id: "factory-file",
    status: fs.existsSync(paths.factory) ? "SAFE" : "FAIL",
    detail: "assets/user-guidance-adapter-factory.js"
  },
  {
    id: "factory-version",
    status: factory.includes("user-guidance-adapter-factory-001-foundation") ? "SAFE" : "WATCH",
    detail: "factory foundation version marker"
  },
  {
    id: "registry-file",
    status: fs.existsSync(paths.registry) ? "SAFE" : "FAIL",
    detail: "assets/physical-security-guidance-registry.js"
  },
  {
    id: "registry-api",
    status: registryApi && typeof registryApi.listAll === "function" ? "SAFE" : "FAIL",
    detail: "ScopedLabsPhysicalSecurityGuidanceRegistry.listAll"
  },
  {
    id: "driver-source-field-aware",
    status: driver.includes("guidance-adapter-factory-driver-003-source-field-proven-tolerant") ? "SAFE" : "WATCH",
    detail: "factory driver knows source-field proven adapters"
  },
  {
    id: "master-suite",
    status: masterSuite.includes("Physical Security Guidance Adapter Audit Suite") ? "SAFE" : "WATCH",
    detail: "master Physical Security adapter suite exists"
  }
];

const entries = registryApi.listAll()
  .filter((entry) => !toolFilter || entry.slug === toolFilter);

if (toolFilter && entries.length === 0) {
  console.error("No registry entry found for --tool " + toolFilter);
  process.exit(1);
}

const rows = entries.map(classify);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

const candidates = rows.filter((row) => row.status === "CANDIDATE");
const failures = rows.filter((row) => row.status === "FAIL");
const watches = rows.filter((row) => row.status === "WATCH");

const result = {
  generatorVersion,
  category,
  toolFilter: toolFilter || null,
  mode: "dry-run",
  foundation,
  rows,
  summary: {
    tools: rows.length,
    SAFE: counts.SAFE || 0,
    CANDIDATE: counts.CANDIDATE || 0,
    WATCH: counts.WATCH || 0,
    SKIP: counts.SKIP || 0,
    FAIL: counts.FAIL || 0
  },
  candidates: candidates.map((row) => ({
    slug: row.slug,
    globalName: row.globalName,
    audit: row.audit,
    plan: row.plan
  })),
  nextAction: candidates.length
    ? "Review candidate generation plans. V1 does not apply patches."
    : "No remaining adapter candidates for this category. Automation gate is clear."
};

if (wantsJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("\nGuidance Adapter Factory Generator V1\n");
  console.log("Generator version:", generatorVersion);
  console.log("Category:", category);
  console.log("Mode: dry-run only");

  console.log("\nFoundation:");
  console.table(foundation);

  console.log("\nRegistry Classification:");
  console.table(rows.map((row) => ({
    slug: row.slug,
    role: row.role,
    status: row.status,
    reason: row.reason,
    globalName: row.globalName,
    audit: row.audit
  })));

  console.log("\nSummary:");
  console.log("- Tools:", result.summary.tools);
  console.log("- SAFE:", result.summary.SAFE);
  console.log("- CANDIDATE:", result.summary.CANDIDATE);
  console.log("- WATCH:", result.summary.WATCH);
  console.log("- SKIP:", result.summary.SKIP);
  console.log("- FAIL:", result.summary.FAIL);

  if (candidates.length) {
    console.log("\nCandidate generation plans:");
    candidates.forEach((candidate) => {
      console.log("\n" + candidate.slug + ":");
      candidate.plan.forEach((item) => console.log("- " + item));
    });
  } else {
    console.log("\nCandidate generation plans:");
    console.log("- none");
  }

  console.log("\nNext action:");
  console.log("- " + result.nextAction);

  console.log("\nGenerator complete. No files modified.");
}

if (foundation.some((row) => row.status === "FAIL") || failures.length > 0) {
  process.exitCode = 1;
} else if (watches.length > 0) {
  process.exitCode = 1;
}
