const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.cwd();

const auditVersion = "physical-security-category-guidance-live-audit-001";

const files = {
  sourcePolicy: path.join(root, "assets", "physical-security-source-policy.js"),
  knowledge: path.join(root, "assets", "physical-security-category-knowledge.js"),
  registry: path.join(root, "assets", "physical-security-guidance-registry.js"),
  categoryGuidance: path.join(root, "assets", "physical-security-category-guidance.js")
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

  return sandbox;
}

function provenEntries(win) {
  const registry = win.ScopedLabsPhysicalSecurityGuidanceRegistry;

  if (!registry || typeof registry.listAll !== "function") {
    return [];
  }

  return registry.listAll().filter((entry) => {
    return entry && entry.proofStatus === "proven" && entry.globalName;
  });
}

function makeStubGuidance(slug, status) {
  return {
    status,
    mode: "audit-stub",
    primaryRecommendation: {
      action: "Audit action for " + slug,
      reason: "Audit reason for " + slug,
      expectedResult: "Audit expected result for " + slug,
      confidence: "audit",
      nextStep: "Audit next step for " + slug
    },
    reportSummary: "Audit report summary for " + slug,
    sourceIntegrity: {
      mode: "audit",
      label: "Audit source"
    },
    carryForward: {
      slug
    }
  };
}

function attachStubGuidance(win, statusBySlug) {
  provenEntries(win).forEach((entry) => {
    win[entry.globalName] = {
      getLastGuidance() {
        return makeStubGuidance(entry.slug, statusBySlug[entry.slug] || "healthy");
      },
      explainLastGuidance() {
        return {
          ok: true,
          status: statusBySlug[entry.slug] || "healthy",
          action: "Audit action for " + entry.slug
        };
      }
    };
  });
}

function runNoGuidanceCase() {
  const sandbox = loadStack();
  const api = sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidance;
  const result = api.explainCurrentGuidance();

  return {
    ok: !!result.ok,
    status: result.status,
    generated: result.counts && result.counts.generated,
    tracked: result.counts && result.counts.tracked
  };
}

function runHealthyCase() {
  const sandbox = loadStack();
  attachStubGuidance(sandbox.window, {});

  const api = sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidance;
  const result = api.explainCurrentGuidance();

  return {
    ok: !!result.ok,
    status: result.status,
    generated: result.counts && result.counts.generated,
    healthy: result.counts && result.counts.healthy,
    risk: result.counts && result.counts.risk,
    watch: result.counts && result.counts.watch
  };
}

function runRiskPriorityCase() {
  const sandbox = loadStack();

  attachStubGuidance(sandbox.window, {
    "mounting-height": "risk",
    "pixel-density": "watch",
    "license-plate-range": "risk"
  });

  const api = sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidance;
  const result = api.explainCurrentGuidance();

  return {
    ok: !!result.ok,
    status: result.status,
    prioritySlug: result.priorityTool && result.priorityTool.slug,
    risk: result.counts && result.counts.risk,
    watch: result.counts && result.counts.watch
  };
}

function runSourceCases() {
  const sandbox = loadStack();
  const api = sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidance;
  const knowledge = sandbox.window.ScopedLabsPhysicalSecurityCategoryKnowledge;

  const allowed = api.classifyExternalSource({
    title: "Camera mounting height and field of view planning guide",
    summary: "Physical security camera coverage, spacing, blind spot, and pixel density planning.",
    sourceType: "candidate"
  });

  const blocked = api.classifyExternalSource({
    title: "Buy now discount camera kit with alarm subscription",
    summary: "Free shipping, coupon, monthly monitoring plan, and unrelated ransomware notes.",
    sourceType: "candidate"
  });

  const knowledgeAllowed = knowledge.classifyExternalSource({
    title: "License plate capture pixels per plate and lens planning",
    summary: "Physical security LPR planning with pixel density and optics terminology.",
    sourceType: "candidate"
  });

  return {
    allowed,
    blocked,
    knowledgeAllowed
  };
}

let sandbox = null;
let stackError = "";

try {
  sandbox = loadStack();
} catch (err) {
  stackError = err && err.message ? err.message : String(err || "Stack load failed");
}

const sourcePolicyText = read(files.sourcePolicy);
const knowledgeText = read(files.knowledge);
const registryText = read(files.registry);
const guidanceText = read(files.categoryGuidance);
const combinedRuntimeText = [sourcePolicyText, knowledgeText, registryText, guidanceText].join("\n");

let entries = [];
let noGuidanceCase = {};
let healthyCase = {};
let riskCase = {};
let sourceCases = {};

if (sandbox) {
  entries = provenEntries(sandbox.window);

  try {
    noGuidanceCase = runNoGuidanceCase();
  } catch (err) {
    noGuidanceCase = { error: err && err.message ? err.message : String(err || "no-guidance case failed") };
  }

  try {
    healthyCase = runHealthyCase();
  } catch (err) {
    healthyCase = { error: err && err.message ? err.message : String(err || "healthy case failed") };
  }

  try {
    riskCase = runRiskPriorityCase();
  } catch (err) {
    riskCase = { error: err && err.message ? err.message : String(err || "risk case failed") };
  }

  try {
    sourceCases = runSourceCases();
  } catch (err) {
    sourceCases = { error: err && err.message ? err.message : String(err || "source cases failed") };
  }
}

const rows = [
  {
    id: "source-policy-file",
    status: fs.existsSync(files.sourcePolicy) ? "SAFE" : "FAIL",
    detail: "source policy asset exists"
  },
  {
    id: "knowledge-file",
    status: fs.existsSync(files.knowledge) ? "SAFE" : "FAIL",
    detail: "category knowledge asset exists"
  },
  {
    id: "registry-file",
    status: fs.existsSync(files.registry) ? "SAFE" : "FAIL",
    detail: "guidance registry asset exists"
  },
  {
    id: "category-guidance-file",
    status: fs.existsSync(files.categoryGuidance) ? "SAFE" : "FAIL",
    detail: "category guidance asset exists"
  },
  {
    id: "stack-loads",
    status: sandbox && !stackError ? "SAFE" : "FAIL",
    detail: stackError || "browser-style guidance stack evaluates in VM"
  },
  {
    id: "source-policy-global",
    status: sandbox && sandbox.window.ScopedLabsPhysicalSecuritySourcePolicy ? "SAFE" : "FAIL",
    detail: "ScopedLabsPhysicalSecuritySourcePolicy is available"
  },
  {
    id: "knowledge-global",
    status: sandbox && sandbox.window.ScopedLabsPhysicalSecurityCategoryKnowledge ? "SAFE" : "FAIL",
    detail: "ScopedLabsPhysicalSecurityCategoryKnowledge is available"
  },
  {
    id: "registry-global",
    status: sandbox && sandbox.window.ScopedLabsPhysicalSecurityGuidanceRegistry ? "SAFE" : "FAIL",
    detail: "ScopedLabsPhysicalSecurityGuidanceRegistry is available"
  },
  {
    id: "category-guidance-global",
    status: sandbox && sandbox.window.ScopedLabsPhysicalSecurityCategoryGuidance ? "SAFE" : "FAIL",
    detail: "ScopedLabsPhysicalSecurityCategoryGuidance is available"
  },
  {
    id: "proven-adapter-count",
    status: entries.length === 9 ? "SAFE" : "WATCH",
    detail: "proven adapter globals tracked by registry: " + entries.length
  },
  {
    id: "no-guidance-case",
    status:
      noGuidanceCase.ok === true &&
      noGuidanceCase.status === "unknown" &&
      noGuidanceCase.generated === 0 &&
      noGuidanceCase.tracked === 9 ? "SAFE" : "WATCH",
    detail: JSON.stringify(noGuidanceCase)
  },
  {
    id: "all-healthy-stub-case",
    status:
      healthyCase.ok === true &&
      healthyCase.status === "healthy" &&
      healthyCase.generated === 9 &&
      healthyCase.healthy === 9 &&
      healthyCase.risk === 0 &&
      healthyCase.watch === 0 ? "SAFE" : "WATCH",
    detail: JSON.stringify(healthyCase)
  },
  {
    id: "risk-priority-stub-case",
    status:
      riskCase.ok === true &&
      riskCase.status === "risk" &&
      riskCase.prioritySlug === "mounting-height" &&
      riskCase.risk === 2 &&
      riskCase.watch === 1 ? "SAFE" : "WATCH",
    detail: JSON.stringify(riskCase)
  },
  {
    id: "source-policy-allowed-case",
    status:
      sourceCases.allowed &&
      sourceCases.allowed.allowed === true &&
      Array.isArray(sourceCases.allowed.matchedTopics) &&
      sourceCases.allowed.matchedTopics.length > 0 ? "SAFE" : "WATCH",
    detail: JSON.stringify(sourceCases.allowed || sourceCases)
  },
  {
    id: "source-policy-blocked-case",
    status:
      sourceCases.blocked &&
      sourceCases.blocked.allowed === false &&
      Array.isArray(sourceCases.blocked.blocked) &&
      sourceCases.blocked.blocked.length > 0 ? "SAFE" : "WATCH",
    detail: JSON.stringify(sourceCases.blocked || sourceCases)
  },
  {
    id: "knowledge-source-classifier",
    status:
      sourceCases.knowledgeAllowed &&
      sourceCases.knowledgeAllowed.allowed === true ? "SAFE" : "WATCH",
    detail: JSON.stringify(sourceCases.knowledgeAllowed || sourceCases)
  },
  {
    id: "no-runtime-fetch",
    status: !/fetch\s*\(/.test(combinedRuntimeText) && guidanceText.includes("runtimeFetchAllowed: false") ? "SAFE" : "WATCH",
    detail: "category master/source policy/knowledge do not fetch the web at runtime"
  },
  {
    id: "no-dom-ownership",
    status: !/(appendChild|insertAdjacentHTML|innerHTML\s*=|classList\.add|setAttribute)/.test(guidanceText) ? "SAFE" : "WATCH",
    detail: "category master does not own visible DOM rendering"
  }
];

console.log("\nPhysical Security Category Guidance Live Validation Audit\n");
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
