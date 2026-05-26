const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.cwd();

const driverVersion = "guidance-adapter-factory-driver-003-source-field-proven-tolerant";

const factoryFile = path.join(root, "assets", "user-guidance-adapter-factory.js");
const registryFile = path.join(root, "assets", "physical-security-guidance-registry.js");

const auditFileBySlug = {
  "camera-spacing": "audit-camera-spacing-guidance-adapter-v1.js",
  "license-plate-range": "audit-license-plate-guidance-adapter-v1.js",
  "face-recognition-range": "audit-face-recognition-guidance-adapter-v1.js",
  "pixel-density": "audit-pixel-density-guidance-adapter-v1.js",
  "blind-spot-check": "audit-blind-spot-guidance-adapter-v1.js"
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

function hasFunction(text, name) {
  return new RegExp("function\\s+" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\(").test(text);
}

function classifyTool(entry) {
  const slug = entry.slug;
  const toolDir = path.join(root, "tools", "physical-security", slug);
  const htmlFile = path.join(toolDir, "index.html");
  const jsFile = path.join(toolDir, "script.js");

  const html = read(htmlFile);
  const js = read(jsFile);
  const srcs = scriptSrcs(html);

  const helperIndex = srcs.findIndex((src) => src.includes("/assets/user-assistant-guidance.js"));
  const localIndex = srcs.findIndex((src) => src.includes("./script.js"));

  const auditName = auditFileBySlug[slug] || `audit-${slug}-guidance-adapter-v1.js`;
  const auditFile = path.join(root, "scripts", auditName);

  const basics = {
    hasHtml: fs.existsSync(htmlFile),
    hasJs: fs.existsSync(jsFile),
    hasLocalScript: localIndex >= 0,
    hasRenderSuccess: js.includes("function renderSuccess(data)"),
    hasWriteFlow: js.includes("function writeFlow(data)"),
    hasManualOverrideMetadata: js.includes("function getManualOverrideMetadata(data)"),
    hasHelperInclude: helperIndex >= 0,
    helperBeforeLocal: helperIndex >= 0 && localIndex >= 0 && helperIndex < localIndex,
    hasGlobal: entry.globalName ? js.includes(entry.globalName) : false,
    hasAudit: fs.existsSync(auditFile)
  };

  if (entry.protected) {
    return {
      slug,
      role: entry.role || "",
      status: "SKIP",
      detail: "Protected by registry",
      globalName: entry.globalName || "",
      audit: basics.hasAudit ? auditName : "-"
    };
  }

  if (!entry.guidanceCandidate) {
    return {
      slug,
      role: entry.role || "",
      status: "SKIP",
      detail: "Not a current guidance adapter candidate",
      globalName: entry.globalName || "",
      audit: basics.hasAudit ? auditName : "-"
    };
  }

  if (entry.proofStatus === "proven") {
    const sourceFieldDriven =
      entry.sourceMode === "lighting-source-fields" ||
      entry.sourceMode === "mounting-source-fields" ||
      entry.sourceMode === "source-fields";

    const sourceModeOk = basics.hasManualOverrideMetadata || sourceFieldDriven;

    const ok =
      basics.hasHtml &&
      basics.hasJs &&
      basics.hasHelperInclude &&
      basics.helperBeforeLocal &&
      basics.hasRenderSuccess &&
      basics.hasWriteFlow &&
      sourceModeOk &&
      basics.hasGlobal &&
      basics.hasAudit;

    return {
      slug,
      role: entry.role || "",
      status: ok ? "SAFE" : "FAIL",
      detail: ok
        ? (sourceFieldDriven
          ? "Proven source-field adapter is wired and guarded"
          : "Proven adapter is wired and guarded")
        : JSON.stringify(Object.assign({}, basics, { sourceFieldDriven, sourceModeOk })),
      globalName: entry.globalName || "",
      audit: basics.hasAudit ? auditName : "missing"
    };
  }

  const candidateOk =
    basics.hasHtml &&
    basics.hasJs &&
    basics.hasLocalScript &&
    basics.hasRenderSuccess &&
    basics.hasWriteFlow;

  return {
    slug,
    role: entry.role || "",
    status: candidateOk ? "CANDIDATE" : "WATCH",
    detail: candidateOk
      ? (basics.hasManualOverrideMetadata
        ? "Has safe anchors for future mapped adapter"
        : "Has safe anchors; future adapter should use pipeline-only source mode unless manual overrides are added")
      : JSON.stringify(basics),
    globalName: entry.globalName || "",
    audit: basics.hasAudit ? auditName : "-"
  };
}

console.log("\nGuidance Adapter Factory Driver V1\n");
console.log("Driver version:", driverVersion);

const factory = loadBrowserAsset(factoryFile, "ScopedLabsUserGuidanceAdapterFactory");
const registryApi = loadBrowserAsset(registryFile, "ScopedLabsPhysicalSecurityGuidanceRegistry");

const foundationRows = [
  {
    id: "factory-loaded",
    status: factory && factory.version === "user-guidance-adapter-factory-001-foundation" ? "SAFE" : "FAIL",
    detail: factory ? factory.version : "factory missing"
  },
  {
    id: "factory-api",
    status: factory && typeof factory.createAdapter === "function" ? "SAFE" : "FAIL",
    detail: "ScopedLabsUserGuidanceAdapterFactory.createAdapter"
  },
  {
    id: "registry-loaded",
    status: registryApi && registryApi.version === "physical-security-guidance-registry-001-foundation" ? "SAFE" : "FAIL",
    detail: registryApi ? registryApi.version : "registry missing"
  },
  {
    id: "registry-api",
    status: registryApi && typeof registryApi.listAll === "function" ? "SAFE" : "FAIL",
    detail: "ScopedLabsPhysicalSecurityGuidanceRegistry.listAll"
  }
];

console.log("\nFoundation:");
console.table(foundationRows);

if (foundationRows.some((row) => row.status === "FAIL")) {
  console.log("\nFactory driver stopped because foundation checks failed.");
  process.exitCode = 1;
  process.exit();
}

const entries = registryApi.listAll();
const rows = entries.map(classifyTool);

console.log("\nPhysical Security Guidance Registry Classification:");
console.table(rows);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("\nSummary:");
console.log("- Tools:", rows.length);
console.log("- SAFE:", counts.SAFE || 0);
console.log("- CANDIDATE:", counts.CANDIDATE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- SKIP:", counts.SKIP || 0);
console.log("- FAIL:", counts.FAIL || 0);

const proven = rows.filter((row) => row.status === "SAFE").map((row) => row.slug);
const candidates = rows.filter((row) => row.status === "CANDIDATE").map((row) => row.slug);

console.log("\nProven adapters:");
console.log(proven.length ? "- " + proven.join("\n- ") : "- none");

console.log("\nNext adapter candidates:");
console.log(candidates.length ? "- " + candidates.join("\n- ") : "- none");

console.log("\nDriver complete. No files modified.");

if ((counts.FAIL || 0) > 0) {
  process.exitCode = 1;
}
