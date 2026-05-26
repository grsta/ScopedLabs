const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.cwd();

const auditVersion = "physical-security-category-guidance-renderer-audit-001";

const files = {
  sourcePolicy: path.join(root, "assets", "physical-security-source-policy.js"),
  knowledge: path.join(root, "assets", "physical-security-category-knowledge.js"),
  registry: path.join(root, "assets", "physical-security-guidance-registry.js"),
  categoryGuidance: path.join(root, "assets", "physical-security-category-guidance.js"),
  renderer: path.join(root, "assets", "physical-security-category-guidance-renderer.js")
};

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function makeSandbox() {
  const win = {};
  win.window = win;
  win.self = win;

  const sandbox = {
    window: win,
    self: win,
    document: {
      querySelector() {
        return null;
      }
    },
    console: {
      log() {},
      warn() {},
      error() {}
    }
  };

  sandbox.globalThis = sandbox;
  return sandbox;
}

function runBrowserAsset(sandbox, file) {
  if (!fs.existsSync(file)) {
    throw new Error("Missing asset: " + path.relative(root, file));
  }

  vm.runInNewContext(read(file), sandbox, {
    filename: path.relative(root, file)
  });
}

function loadStack() {
  const sandbox = makeSandbox();

  runBrowserAsset(sandbox, files.sourcePolicy);
  runBrowserAsset(sandbox, files.knowledge);
  runBrowserAsset(sandbox, files.registry);
  runBrowserAsset(sandbox, files.categoryGuidance);
  runBrowserAsset(sandbox, files.renderer);

  return sandbox;
}

function provenEntries(win) {
  const registry = win.ScopedLabsPhysicalSecurityGuidanceRegistry;

  if (!registry || typeof registry.listAll !== "function") {
    return [];
  }

  return registry.listAll().filter((entry) => entry && entry.proofStatus === "proven" && entry.globalName);
}

function attachStubGuidance(win) {
  provenEntries(win).forEach((entry) => {
    win[entry.globalName] = {
      getLastGuidance() {
        return {
          status: entry.slug === "pixel-density" ? "watch" : "healthy",
          mode: "audit-stub",
          primaryRecommendation: {
            action: "Audit action for " + entry.slug,
            reason: "Audit reason for " + entry.slug,
            expectedResult: "Audit expected result for " + entry.slug,
            nextStep: "Audit next step for " + entry.slug
          },
          reportSummary: "Audit report summary for " + entry.slug
        };
      }
    };
  });
}

let sandbox = null;
let stackError = "";
let model = null;
let html = "";
let reportText = "";
let mountResult = null;

try {
  sandbox = loadStack();
  attachStubGuidance(sandbox.window);

  const categoryGuidance = sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidance;
  const renderer = sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer;
  const explanation = categoryGuidance.explainCurrentGuidance();

  model = renderer.createRenderModel(explanation);
  html = renderer.renderSummaryHtml(model);
  reportText = renderer.renderReportText(model);

  const target = { innerHTML: "" };
  mountResult = renderer.mount(target, explanation);
} catch (err) {
  stackError = err && err.message ? err.message : String(err || "Renderer stack failed");
}

const rendererText = read(files.renderer);

const rows = [
  {
    id: "renderer-file",
    status: fs.existsSync(files.renderer) ? "SAFE" : "FAIL",
    detail: "assets/physical-security-category-guidance-renderer.js exists"
  },
  {
    id: "renderer-version",
    status: rendererText.includes("physical-security-category-guidance-renderer-001-foundation") ? "SAFE" : "WATCH",
    detail: "renderer version marker is present"
  },
  {
    id: "renderer-global",
    status: sandbox && sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer ? "SAFE" : "FAIL",
    detail: stackError || "renderer global is available"
  },
  {
    id: "renderer-api",
    status:
      sandbox &&
      sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer &&
      typeof sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer.createRenderModel === "function" &&
      typeof sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer.renderSummaryHtml === "function" &&
      typeof sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer.renderReportText === "function" &&
      typeof sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer.mount === "function" ? "SAFE" : "FAIL",
    detail: "renderer exposes model/html/report/mount APIs"
  },
  {
    id: "model-created",
    status:
      model &&
      model.version === "physical-security-category-guidance-renderer-001-foundation" &&
      model.counts.generated === 9 &&
      model.counts.watch === 1 ? "SAFE" : "WATCH",
    detail: JSON.stringify(model && model.counts ? model.counts : model)
  },
  {
    id: "html-rendered",
    status:
      html.includes("Physical Security Category Guidance") &&
      html.includes("Category Guidance") &&
      html.includes("sl-ps-category-guidance") &&
      html.includes("Knowledge State") ? "SAFE" : "WATCH",
    detail: "summary HTML contains expected shell sections"
  },
  {
    id: "report-text-rendered",
    status:
      reportText.includes("Physical Security Category Guidance") &&
      reportText.includes("Recommended action:") &&
      reportText.includes("Runtime web fetch: blocked") ? "SAFE" : "WATCH",
    detail: "report text contains expected category summary fields"
  },
  {
    id: "mount-is-explicit",
    status:
      mountResult &&
      mountResult.ok === true &&
      mountResult.version === "physical-security-category-guidance-renderer-001-foundation" ? "SAFE" : "WATCH",
    detail: JSON.stringify(mountResult || {})
  },
  {
    id: "no-auto-mount",
    status:
      !rendererText.includes("DOMContentLoaded") &&
      !rendererText.includes("setTimeout(") &&
      !rendererText.includes("requestAnimationFrame(") ? "SAFE" : "WATCH",
    detail: "renderer does not auto-mount itself"
  },
  {
    id: "no-runtime-fetch",
    status: !/fetch\s*\(/.test(rendererText) ? "SAFE" : "WATCH",
    detail: "renderer does not fetch the web"
  }
];

console.log("\nPhysical Security Category Guidance Renderer Audit\n");
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