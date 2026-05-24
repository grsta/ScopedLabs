#!/usr/bin/env node
/*
 * ScopedLabs Category Modernizer V1 Audit
 * Version: scopedlabs-category-modernizer-audit-001-foundation
 *
 * Read-only audit. No files are modified by this script.
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function argValue(name, fallback) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0) return process.argv[exactIndex + 1] || fallback;

  const prefix = name + "=";
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length) || fallback;

  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const category = argValue("--category", "physical-security");
const strict = hasFlag("--strict");

const categoryRoot = path.join(root, "tools", category);
const registryFile = path.join(root, "assets", category + "-tool-registry.js");

const protectedTools = new Set(
  category === "physical-security"
    ? ["lens-selection"]
    : []
);

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function scripts(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);
}

function hasId(html, id) {
  if (!id) return false;
  return html.includes('id="' + id + '"') || html.includes("id='" + id + "'");
}

function detectLikelyRowId(html, helperRowId) {
  if (helperRowId && hasId(html, helperRowId)) return helperRowId;

  const candidates = Array.from(html.matchAll(/<div\s+id=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);

  const likely = candidates.find((id) =>
    /FlowActions|flowActions|Actions|nav-row/i.test(id)
  );

  return likely || "-";
}

function detectBackContinue(html, categorySlug) {
  const helperCall = html.match(/applyBackContinueShell\?\.\(\{\s*rowId:\s*"([^"]+)"/);
  const helperRowId = helperCall ? helperCall[1] : "";

  const categoryHref = "/tools/" + categorySlug + "/";
  const hasBack = html.includes('href="' + categoryHref + '"') && /Back to/i.test(html);
  const hasNextStepRow = /id=["']next-step-row["']/i.test(html);
  const hasContinue = /id=["']continue["']/i.test(html);
  const rowId = detectLikelyRowId(html, helperRowId);

  let status = "missing-pieces";

  if (helperRowId && hasId(html, helperRowId)) {
    status = "proofed";
  } else if (hasBack && hasNextStepRow && hasContinue && rowId !== "-") {
    status = "ready-shared-row";
  } else if (hasBack && hasNextStepRow && hasContinue) {
    status = "needs-normalize";
  }

  return {
    status,
    rowId,
    helperRowId: helperRowId || "-",
    hasBack,
    hasNextStepRow,
    hasContinue
  };
}

function scriptIndex(srcs, needle) {
  return srcs.findIndex((src) => src.includes(needle));
}

function detectEngineState(html, srcs, categorySlug) {
  const localScriptIndex = scriptIndex(srcs, "./script.js");
  const shellIndex = scriptIndex(srcs, "scopedlabs-tool-shell.js");
  const registryIndex = scriptIndex(srcs, categorySlug + "-tool-registry.js");
  const exportIndex = scriptIndex(srcs, "/assets/export.js");
  const helpIndex = scriptIndex(srcs, "/assets/help.js");

  return {
    registry: registryIndex >= 0 ? "connected" : "missing",
    toolShell: shellIndex >= 0 ? "connected" : "missing",
    toolShellOrder: shellIndex >= 0 && localScriptIndex >= 0 && shellIndex < localScriptIndex ? "ok" : "watch",
    exportEngine: exportIndex >= 0 ? "connected" : "missing",
    exportButtons: hasId(html, "exportReport") && hasId(html, "saveSnapshot") && hasId(html, "exportStatus") ? "present" : "missing-or-partial",
    kbEngine: helpIndex >= 0 ? "connected" : "missing",
    graphicsEngine: scriptIndex(srcs, "scopedlabs-graphics.js") >= 0 ? "connected" : "not-declared",
    localScript: localScriptIndex >= 0 ? srcs[localScriptIndex] : "-"
  };
}

function classifyTool(tool, html, backContinue, engines) {
  if (protectedTools.has(tool)) {
    return {
      classification: "SKIP",
      reason: "protected/gold-standard"
    };
  }

  const issues = [];

  if (!html) issues.push("missing index.html");
  if (!hasId(html, "pipeline")) issues.push("missing #pipeline");
  if (!hasId(html, "toolCard")) issues.push("missing #toolCard");

  if (backContinue.status === "missing-pieces") {
    issues.push("Back + Continue missing required pieces");
  }

  if (engines.toolShell !== "connected") {
    issues.push("Tool Shell helper missing");
  }

  if (engines.toolShellOrder !== "ok") {
    issues.push("Tool Shell order watch");
  }

  if (issues.some((issue) => issue.includes("missing index") || issue.includes("missing #toolCard") || issue.includes("Back + Continue missing"))) {
    return {
      classification: "FAIL",
      reason: issues.join("; ")
    };
  }

  if (issues.length || backContinue.status !== "proofed") {
    return {
      classification: "WATCH",
      reason: issues.concat(["BackContinue=" + backContinue.status]).join("; ")
    };
  }

  return {
    classification: "SAFE",
    reason: "modernizer foundation checks passed"
  };
}

if (!fs.existsSync(categoryRoot)) {
  console.error("Missing category folder: " + path.relative(root, categoryRoot));
  process.exit(1);
}

const tools = fs.readdirSync(categoryRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const rows = tools.map((tool) => {
  const indexFile = path.join(categoryRoot, tool, "index.html");
  const html = read(indexFile);
  const srcs = scripts(html);
  const backContinue = detectBackContinue(html, category);
  const engines = detectEngineState(html, srcs, category);
  const classification = classifyTool(tool, html, backContinue, engines);

  return {
    tool,
    class: classification.classification,
    backContinue: backContinue.status,
    rowId: backContinue.rowId,
    helperCall: backContinue.helperRowId,
    registry: engines.registry,
    toolShell: engines.toolShell,
    shellOrder: engines.toolShellOrder,
    export: engines.exportEngine,
    exportButtons: engines.exportButtons,
    kb: engines.kbEngine,
    graphics: engines.graphicsEngine,
    localScript: engines.localScript,
    reason: classification.reason
  };
});

console.log("\nScopedLabs Category Modernizer V1 Audit\n");
console.log("Audit version: scopedlabs-category-modernizer-audit-001-foundation");
console.log("Category: " + category);
console.log("Registry file: " + (fs.existsSync(registryFile) ? path.relative(root, registryFile) : "missing"));
console.log("Protected tools: " + (Array.from(protectedTools).join(", ") || "-"));
console.log("");

console.table(rows);

const counts = rows.reduce((acc, row) => {
  acc[row.class] = (acc[row.class] || 0) + 1;
  return acc;
}, {});

const proofed = rows.filter((row) => row.backContinue === "proofed").length;
const activeTools = rows.filter((row) => row.class !== "SKIP").length;
const watch = rows.filter((row) => row.class === "WATCH");
const fail = rows.filter((row) => row.class === "FAIL");
const skip = rows.filter((row) => row.class === "SKIP");

console.log("\nSummary:");
console.log("- Tools audited: " + rows.length);
console.log("- SAFE: " + (counts.SAFE || 0));
console.log("- WATCH: " + (counts.WATCH || 0));
console.log("- SKIP: " + (counts.SKIP || 0));
console.log("- FAIL: " + (counts.FAIL || 0));
console.log("- Back + Continue proofed: " + proofed + "/" + activeTools + " active tools");

if (skip.length) {
  console.log("\nSkipped tools:");
  for (const row of skip) console.log("- " + row.tool + ": " + row.reason);
}

if (watch.length) {
  console.log("\nWatch tools:");
  for (const row of watch) console.log("- " + row.tool + ": " + row.reason);
}

if (fail.length) {
  console.log("\nFail tools:");
  for (const row of fail) console.log("- " + row.tool + ": " + row.reason);
  process.exitCode = 1;
} else if (strict && watch.length) {
  process.exitCode = 1;
}

console.log("\nAudit complete. No files modified.");
