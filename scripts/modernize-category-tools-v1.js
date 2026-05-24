#!/usr/bin/env node
/*
 * ScopedLabs Category Modernizer V1
 * Version: scopedlabs-category-modernizer-002-tool-shell-module
 *
 * Modular category standardizer.
 * Default mode is dry-run. Use --apply to write safe patches.
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
const apply = hasFlag("--apply");
const dryRun = !apply || hasFlag("--dry-run");

const categoryRoot = path.join(root, "tools", category);

const config = {
  category,
  protectedTools: new Set(
    category === "physical-security"
      ? ["lens-selection"]
      : []
  ),
  modules: ["tool-shell", "back-continue"]
};

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(file, text) {
  fs.writeFileSync(file, text, { encoding: "utf8" });
}

function hasId(html, id) {
  if (!id) return false;
  return html.includes('id="' + id + '"') || html.includes("id='" + id + "'");
}

function scripts(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);
}

function scriptIndex(srcs, needle) {
  return srcs.findIndex((src) => src.includes(needle));
}

function requiredIdsForTool(tool) {
  const ids = ["pipeline", "toolCard", "continue", "next-step-row"];

  if (tool !== "area-planner") {
    ids.push("results");
  }

  return ids;
}

function planToolShell(tool, html) {
  if (!html) {
    return {
      classification: "FAIL",
      action: "none",
      detail: "missing index.html"
    };
  }

  const srcs = scripts(html);
  const registryIndex = scriptIndex(srcs, category + "-tool-registry.js");
  const shellIndex = scriptIndex(srcs, "scopedlabs-tool-shell.js");
  const localScriptIndex = scriptIndex(srcs, "./script.js");

  const missingIds = requiredIdsForTool(tool).filter((id) => !hasId(html, id));
  const issues = [];

  if (registryIndex < 0) issues.push("missing category tool registry script");
  if (shellIndex < 0) issues.push("missing Tool Shell helper script");
  if (localScriptIndex < 0) issues.push("missing local ./script.js");
  if (registryIndex >= 0 && shellIndex >= 0 && registryIndex > shellIndex) {
    issues.push("registry loads after Tool Shell helper");
  }
  if (shellIndex >= 0 && localScriptIndex >= 0 && shellIndex > localScriptIndex) {
    issues.push("Tool Shell helper loads after local script");
  }
  if (missingIds.length) {
    issues.push("missing required IDs: " + missingIds.join(", "));
  }

  if (issues.length) {
    return {
      classification: "WATCH",
      action: "none",
      detail: issues.join("; ")
    };
  }

  return {
    classification: "SAFE",
    action: "noop",
    detail: "Tool Shell wiring and required IDs are already standard"
  };
}

function findHelperRowId(html) {
  const helperCall = html.match(/applyBackContinueShell\?\.\(\{\s*rowId:\s*"([^"]+)"/);
  return helperCall ? helperCall[1] : "";
}

function makeFlowRowId(tool) {
  const parts = tool.split("-").filter(Boolean);
  if (!parts.length) return "toolFlowActions";

  return parts
    .map((part, index) => {
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("") + "FlowActions";
}

function insertHelperCall(html, rowId) {
  if (html.includes('applyBackContinueShell?.({ rowId: "' + rowId + '" })')) {
    return html;
  }

  const localScriptRx = /(\s*<script\s+src=["']\.\/script\.js[^"']*["']\s*><\/script>)/;
  if (!localScriptRx.test(html)) {
    return null;
  }

  return html.replace(
    localScriptRx,
    `$1
  <script>
    window.ScopedLabsToolShell?.applyBackContinueShell?.({ rowId: "${rowId}" });
  </script>`
  );
}

function getAnchorHtmlAround(html, textIndex) {
  const start = html.lastIndexOf("<a ", textIndex);
  if (start < 0) return null;

  const end = html.indexOf("</a>", start);
  if (end < 0 || end < textIndex) return null;

  return {
    start,
    end: end + "</a>".length,
    html: html.slice(start, end + "</a>".length)
  };
}

function getNextStepBlock(html, continueIndex) {
  const start = html.lastIndexOf('<div id="next-step-row"', continueIndex);
  if (start < 0) return null;

  const end = html.indexOf("</div>", continueIndex);
  if (end < 0) return null;

  return {
    start,
    end: end + "</div>".length,
    html: html.slice(start, end + "</div>".length)
  };
}

function addIdToOpeningDiv(openingTag, rowId) {
  if (/id=["'][^"']+["']/.test(openingTag)) return openingTag;
  return openingTag.replace("<div ", '<div id="' + rowId + '" ');
}

function normalizeNextStepMargin(nextStepHtml) {
  return nextStepHtml.replace(/margin-top:\s*12px/gi, "margin-top: 0");
}

function planBackContinuePatch(tool, html) {
  const helperRowId = findHelperRowId(html);

  if (helperRowId && hasId(html, helperRowId)) {
    return {
      classification: "SAFE",
      action: "noop",
      rowId: helperRowId,
      detail: "already shell-owned"
    };
  }

  if (!html.includes("scopedlabs-tool-shell.js")) {
    return {
      classification: "WATCH",
      action: "none",
      rowId: "-",
      detail: "Tool Shell helper is not connected"
    };
  }

  if (!html.includes("applyBackContinueShell") && !html.includes("scopedlabs-tool-shell-004-back-continue-proof")) {
    return {
      classification: "WATCH",
      action: "none",
      rowId: "-",
      detail: "Tool Shell version may not include applyBackContinueShell"
    };
  }

  const continueMatch = html.match(/id=["']continue["']/);
  if (!continueMatch) {
    return {
      classification: "FAIL",
      action: "none",
      rowId: "-",
      detail: "missing #continue"
    };
  }

  const continueIndex = continueMatch.index;
  const nextStep = getNextStepBlock(html, continueIndex);

  if (!nextStep) {
    return {
      classification: "FAIL",
      action: "none",
      rowId: "-",
      detail: "missing #next-step-row around #continue"
    };
  }

  const backTextIndex = html.lastIndexOf("Back to", nextStep.start);
  if (backTextIndex < 0) {
    return {
      classification: "FAIL",
      action: "none",
      rowId: "-",
      detail: "missing Back link before #next-step-row"
    };
  }

  const backAnchor = getAnchorHtmlAround(html, backTextIndex);
  if (!backAnchor) {
    return {
      classification: "FAIL",
      action: "none",
      rowId: "-",
      detail: "could not isolate Back anchor"
    };
  }

  if (!backAnchor.html.includes('/tools/' + category + '/')) {
    return {
      classification: "WATCH",
      action: "none",
      rowId: "-",
      detail: "Back link does not point to expected category root"
    };
  }

  const backRowStart = html.lastIndexOf("<div", backAnchor.start);
  if (backRowStart < 0) {
    return {
      classification: "FAIL",
      action: "none",
      rowId: "-",
      detail: "could not find Back row opening div"
    };
  }

  const backRowTagEnd = html.indexOf(">", backRowStart);
  if (backRowTagEnd < 0) {
    return {
      classification: "FAIL",
      action: "none",
      rowId: "-",
      detail: "could not find Back row opening tag end"
    };
  }

  const backRowOpeningTag = html.slice(backRowStart, backRowTagEnd + 1);
  if (!/class=["'][^"']*btn-row[^"']*["']/.test(backRowOpeningTag)) {
    return {
      classification: "WATCH",
      action: "none",
      rowId: "-",
      detail: "Back row is not a btn-row"
    };
  }

  const existingIdMatch = backRowOpeningTag.match(/id=["']([^"']+)["']/);
  const rowId = existingIdMatch ? existingIdMatch[1] : makeFlowRowId(tool);

  const firstDivCloseAfterBack = html.indexOf("</div>", backAnchor.end);
  const isSharedRow = nextStep.start < firstDivCloseAfterBack;

  let patched = html;

  if (isSharedRow) {
    if (!existingIdMatch) {
      const updatedTag = addIdToOpeningDiv(backRowOpeningTag, rowId);
      patched = html.slice(0, backRowStart) + updatedTag + html.slice(backRowTagEnd + 1);
    }

    const withHelper = insertHelperCall(patched, rowId);
    if (!withHelper) {
      return {
        classification: "WATCH",
        action: "none",
        rowId,
        detail: "shared row found but helper call insertion anchor was not found"
      };
    }

    return {
      classification: "SAFE",
      action: existingIdMatch ? "add-helper-call" : "add-row-id-and-helper-call",
      rowId,
      detail: existingIdMatch ? "shared row ready" : "shared row needed row ID",
      patched: withHelper
    };
  }

  const normalizedNextStep = normalizeNextStepMargin(nextStep.html);
  const replacement = `<div id="${rowId}" class="btn-row" style="margin-top: 14px;">
          ${backAnchor.html}
          ${normalizedNextStep}
        </div>`;

  const patchedBlock = html.slice(0, backRowStart) + replacement + html.slice(nextStep.end);
  const withHelper = insertHelperCall(patchedBlock, rowId);

  if (!withHelper) {
    return {
      classification: "WATCH",
      action: "none",
      rowId,
      detail: "split row found but helper call insertion anchor was not found"
    };
  }

  return {
    classification: "SAFE",
    action: "merge-split-rows-and-add-helper-call",
    rowId,
    detail: "Back and Continue were split into separate rows",
    patched: withHelper
  };
}

const ToolShellModule = {
  id: "tool-shell",
  version: "tool-shell-module-001",
  description: "Checks Tool Shell registry/helper wiring, script order, and required IDs.",
  run(tool, indexFile, html) {
    if (config.protectedTools.has(tool)) {
      return {
        module: this.id,
        version: this.version,
        tool,
        classification: "SKIP",
        action: "none",
        rowId: "-",
        detail: "protected/gold-standard"
      };
    }

    const plan = planToolShell(tool, html);

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: plan.classification,
      action: plan.action,
      rowId: "-",
      detail: plan.detail
    };
  }
};

const BackContinueModule = {
  id: "back-continue",
  version: "back-continue-module-001",
  description: "Normalizes Back + Continue/Return controls into a shell-owned row.",
  run(tool, indexFile, html) {
    if (config.protectedTools.has(tool)) {
      return {
        module: this.id,
        version: this.version,
        tool,
        classification: "SKIP",
        action: "none",
        rowId: "-",
        detail: "protected/gold-standard"
      };
    }

    const plan = planBackContinuePatch(tool, html);

    if (apply && plan.patched && plan.patched !== html) {
      write(indexFile, plan.patched);
    }

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: plan.classification,
      action: apply && plan.patched && plan.patched !== html ? "applied:" + plan.action : plan.action,
      rowId: plan.rowId,
      detail: plan.detail
    };
  }
};

const modules = [ToolShellModule, BackContinueModule];

if (!fs.existsSync(categoryRoot)) {
  console.error("Missing category folder: " + path.relative(root, categoryRoot));
  process.exit(1);
}

const tools = fs.readdirSync(categoryRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const rows = [];

for (const tool of tools) {
  const indexFile = path.join(categoryRoot, tool, "index.html");
  const html = read(indexFile);

  for (const module of modules) {
    rows.push(module.run(tool, indexFile, html));
  }
}

console.log("\nScopedLabs Category Modernizer V1\n");
console.log("Version: scopedlabs-category-modernizer-002-tool-shell-module");
console.log("Category: " + category);
console.log("Mode: " + (apply ? "APPLY" : "DRY RUN"));
console.log("Modules: " + modules.map((m) => m.id + "@" + m.version).join(", "));
console.log("Protected tools: " + (Array.from(config.protectedTools).join(", ") || "-"));
console.log("");

console.table(rows);

const counts = rows.reduce((acc, row) => {
  acc[row.classification] = (acc[row.classification] || 0) + 1;
  return acc;
}, {});

const actionable = rows.filter((row) =>
  row.classification === "SAFE" &&
  row.action !== "noop" &&
  !row.action.startsWith("applied:")
);

const applied = rows.filter((row) => row.action.startsWith("applied:"));
const watch = rows.filter((row) => row.classification === "WATCH");
const fail = rows.filter((row) => row.classification === "FAIL");
const skip = rows.filter((row) => row.classification === "SKIP");

console.log("\nSummary:");
console.log("- Tools audited: " + tools.length);
console.log("- Module results: " + rows.length);
console.log("- SAFE: " + (counts.SAFE || 0));
console.log("- WATCH: " + (counts.WATCH || 0));
console.log("- SKIP: " + (counts.SKIP || 0));
console.log("- FAIL: " + (counts.FAIL || 0));
console.log("- Pending safe patches: " + actionable.length);
console.log("- Applied patches: " + applied.length);

if (skip.length) {
  console.log("\nSkipped:");
  for (const row of skip) console.log("- " + row.tool + ": " + row.detail);
}

if (actionable.length) {
  console.log("\nDry-run safe patches:");
  for (const row of actionable) {
    console.log("- " + row.tool + ": " + row.action + " (" + row.rowId + ")");
  }
}

if (applied.length) {
  console.log("\nApplied:");
  for (const row of applied) {
    console.log("- " + row.tool + ": " + row.action + " (" + row.rowId + ")");
  }
}

if (watch.length) {
  console.log("\nWatch:");
  for (const row of watch) console.log("- " + row.tool + ": " + row.detail);
}

if (fail.length) {
  console.log("\nFail:");
  for (const row of fail) console.log("- " + row.tool + ": " + row.detail);
  process.exitCode = 1;
}

console.log("\nModernizer complete.");
if (!apply) console.log("No files modified. Use --apply to write safe patches.");