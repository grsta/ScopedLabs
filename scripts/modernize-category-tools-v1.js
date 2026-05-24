#!/usr/bin/env node
/*
 * ScopedLabs Category Modernizer V1
 * Version: scopedlabs-category-modernizer-013-cache-bust-module
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
  modules: ["tool-shell", "back-continue", "badge-cleanup", "label-standard", "export-shell", "graphics-contract", "kb-card", "script-order", "cache-bust"]
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

const BadgeCleanupModule = {
  id: "badge-cleanup",
  version: "badge-cleanup-module-001-audit-only",
  description: "Inventories decorative/legacy badge patterns for future safe cleanup.",
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

    const pillMatches = Array.from(html.matchAll(/<[^>]+class=["'][^"']*\bpill\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi))
      .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const legacyBadges = pillMatches.filter((text) =>
      /Pro Tier|Free Tier|Design Flow|Documentation|Knowledge Base|Part of a Design Flow/i.test(text)
    );

    const detail = legacyBadges.length
      ? "badge inventory: " + legacyBadges.join(" | ")
      : "no legacy/decorative badges detected";

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: "SAFE",
      action: "noop",
      rowId: "-",
      detail
    };
  }
};


const LabelStandardModule = {
  id: "label-standard",
  version: "label-standard-module-001-audit-only",
  description: "Inventories page labels, headings, calculator wording, and standard section labels.",
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

    function cleanText(value) {
      return String(value || "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function firstMatchText(pattern) {
      const match = html.match(pattern);
      return match ? cleanText(match[1]) : "-";
    }

    const pageTitle = firstMatchText(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const h1 = firstMatchText(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    const h2s = Array.from(html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)).map((m) => cleanText(m[1]));
    const h3s = Array.from(html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)).map((m) => cleanText(m[1]));

    const calculatorRefs = (html.match(/\bCalculator\b/gi) || []).length;
    const hasPlanningInputs = /Planning Inputs|Active Area Setup|Inputs/i.test(html);
    const hasResultsLabel = /\bResults\b/i.test(h2s.concat(h3s).join(" | "));
    const hasExportLabel = /Documentation & Export|Export & Snapshot|Export Report|Open Export Report/i.test(html);
    const hasBestFor = /Best for:/i.test(html);
    const hasSubhead = /class=["'][^"']*\bsubhead\b/i.test(html);

    const detailParts = [
      "title=" + pageTitle,
      "h1=" + h1,
      "calculatorRefs=" + calculatorRefs,
      "planningLabel=" + (hasPlanningInputs ? "present" : "missing"),
      "resultsLabel=" + (hasResultsLabel ? "present" : "missing"),
      "exportLabel=" + (hasExportLabel ? "present" : "missing"),
      "bestFor=" + (hasBestFor ? "present" : "missing"),
      "subhead=" + (hasSubhead ? "present" : "missing")
    ];

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: "SAFE",
      action: "noop",
      rowId: "-",
      detail: detailParts.join("; ")
    };
  }
};


const ExportShellModule = {
  id: "export-shell",
  version: "export-shell-module-002-role-aware-audit-only",
  description: "Inventories export/snapshot/report wiring with role-aware accepted alternatives.",
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

    const srcs = scripts(html);
    const exportScript = srcs.find((src) => src.includes("/assets/export.js")) || "-";
    const assistantExportScript = srcs.find((src) => src.includes("scopedlabs-assistant-export.js")) || "-";

    const hasExportConfig = html.includes("ScopedLabsExportConfig") || html.includes("data-scopedlabs-export-config");
    const hasExportReport = hasId(html, "exportReport");
    const hasSaveSnapshot = hasId(html, "saveSnapshot");
    const hasExportStatus = hasId(html, "exportStatus");

    const isAreaPlanner = tool === "area-planner";
    const hasAreaSummaryExport =
      hasId(html, "areaSummary") &&
      hasId(html, "printAreaSummary") &&
      hasId(html, "copyAreaSummaryJson");

    const reportFields = [
      "reportTitle",
      "projectName",
      "clientName",
      "preparedBy",
      "customNotes"
    ];

    const presentReportFields = reportFields.filter((id) => hasId(html, id));
    const missingReportFields = reportFields.filter((id) => !hasId(html, id));

    const hasReportMetadataCard =
      html.includes("data-report-fields") ||
      presentReportFields.length >= 3 ||
      html.includes("Project Name") ||
      html.includes("Custom Notes");

    const issues = [];

    if (isAreaPlanner && hasAreaSummaryExport) {
      const detailParts = [
        "role=area-planner",
        "exportPattern=area-summary-print-copy",
        "areaSummary=present",
        "printAreaSummary=present",
        "copyAreaSummaryJson=present",
        "normalExportCard=not-required",
        "assistantExport=" + assistantExportScript
      ];

      return {
        module: this.id,
        version: this.version,
        tool,
        classification: "SAFE",
        action: "noop",
        rowId: "-",
        detail: detailParts.join("; ")
      };
    }

    if (exportScript === "-") issues.push("missing export.js");
    if (!hasExportConfig) issues.push("missing export config");
    if (!hasExportReport) issues.push("missing #exportReport");
    if (!hasSaveSnapshot) issues.push("missing #saveSnapshot");
    if (!hasExportStatus) issues.push("missing #exportStatus");

    const detailParts = [
      "exportScript=" + exportScript,
      "exportConfig=" + (hasExportConfig ? "present" : "missing"),
      "exportReport=" + (hasExportReport ? "present" : "missing"),
      "saveSnapshot=" + (hasSaveSnapshot ? "present" : "missing"),
      "exportStatus=" + (hasExportStatus ? "present" : "missing"),
      "metadataCard=" + (hasReportMetadataCard ? "present" : "missing"),
      "metadataFields=" + (presentReportFields.length ? presentReportFields.join(",") : "-"),
      "missingMetadataFields=" + (missingReportFields.length ? missingReportFields.join(",") : "-"),
      "assistantExport=" + assistantExportScript
    ];

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail: issues.length ? issues.join("; ") + " | " + detailParts.join("; ") : detailParts.join("; ")
    };
  }
};


const GraphicsContractModule = {
  id: "graphics-contract",
  version: "graphics-contract-module-001-audit-only",
  description: "Audits expected Graphics Engine/category graphics wiring without modifying page files.",
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

    const expectedRenderersByCategory = {
      "physical-security": {
        "camera-coverage-area": ["coverage-footprint-plan"],
        "field-of-view": ["fov-geometry-plan"],
        "pixel-density": ["pixel-density-detail-plan"],
        "camera-spacing": ["camera-layout-iso", "scenario-pressure-line"],
        "blind-spot-check": ["camera-layout-iso"]
      }
    };

    const expectedRenderers =
      expectedRenderersByCategory[category] && expectedRenderersByCategory[category][tool]
        ? expectedRenderersByCategory[category][tool]
        : [];

    if (!expectedRenderers.length) {
      return {
        module: this.id,
        version: this.version,
        tool,
        classification: "SAFE",
        action: "noop",
        rowId: "-",
        detail: "graphicsRequired=no"
      };
    }

    const srcs = scripts(html);
    const localScriptIndex = scriptIndex(srcs, "./script.js");
    const sharedGraphicsIndex = scriptIndex(srcs, "scopedlabs-graphics.js");
    const categoryGraphicsName = category + "-graphics.js";
    const categoryGraphicsIndex = scriptIndex(srcs, categoryGraphicsName);

    const sharedGraphicsScript = sharedGraphicsIndex >= 0 ? srcs[sharedGraphicsIndex] : "-";
    const categoryGraphicsScript = categoryGraphicsIndex >= 0 ? srcs[categoryGraphicsIndex] : "-";
    const localScriptSrc = localScriptIndex >= 0 ? srcs[localScriptIndex] : "-";

    const localScriptPath = localScriptSrc !== "-"
      ? path.join(path.dirname(indexFile), localScriptSrc.split("?")[0].replace(/^\.\//, ""))
      : "";

    const localScriptText = localScriptPath && fs.existsSync(localScriptPath)
      ? fs.readFileSync(localScriptPath, "utf8")
      : "";

    const combinedText = html + "\n" + localScriptText;

    const rendererRefs = expectedRenderers.filter((renderer) => combinedText.includes(renderer));
    const missingRendererRefs = expectedRenderers.filter((renderer) => !combinedText.includes(renderer));

    const hasReportContractVersion =
      categoryGraphicsScript.includes("report-visual-contract") ||
      combinedText.includes("data-report-visual-owner") ||
      combinedText.includes("data-suppress-legacy-chart-export");

    const issues = [];

    if (sharedGraphicsIndex < 0) issues.push("missing scopedlabs-graphics.js");
    if (categoryGraphicsIndex < 0) issues.push("missing " + categoryGraphicsName);
    if (localScriptIndex < 0) issues.push("missing local ./script.js");

    if (sharedGraphicsIndex >= 0 && categoryGraphicsIndex >= 0 && sharedGraphicsIndex > categoryGraphicsIndex) {
      issues.push("shared graphics loads after category graphics");
    }

    if (sharedGraphicsIndex >= 0 && localScriptIndex >= 0 && sharedGraphicsIndex > localScriptIndex) {
      issues.push("shared graphics loads after local script");
    }

    if (categoryGraphicsIndex >= 0 && localScriptIndex >= 0 && categoryGraphicsIndex > localScriptIndex) {
      issues.push("category graphics loads after local script");
    }

    if (!hasReportContractVersion) {
      issues.push("missing report visual contract signal");
    }

    const detailParts = [
      "graphicsRequired=yes",
      "expectedRenderers=" + expectedRenderers.join(","),
      "rendererRefs=" + (rendererRefs.length ? rendererRefs.join(",") : "-"),
      "missingRendererRefs=" + (missingRendererRefs.length ? missingRendererRefs.join(",") : "-"),
      "sharedGraphics=" + sharedGraphicsScript,
      "categoryGraphics=" + categoryGraphicsScript,
      "localScript=" + localScriptSrc,
      "reportContract=" + (hasReportContractVersion ? "present" : "missing")
    ];

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail: issues.length ? issues.join("; ") + " | " + detailParts.join("; ") : detailParts.join("; ")
    };
  }
};


const KbCardModule = {
  id: "kb-card",
  version: "kb-card-module-002-registry-aware-audit-only",
  description: "Audits Knowledge Base/help wiring using page signals plus category registry keys.",
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

    const srcs = scripts(html);
    const helpScript = srcs.find((src) => src.includes("/assets/help.js")) || "-";
    const expectedKbKey = category + "/" + tool;

    const registryPath = path.join(root, "assets", category + "-tool-registry.js");
    const registryText = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, "utf8") : "";

    const hasExpectedKbKeyInPage = html.includes(expectedKbKey);
    const hasExpectedKbKeyInRegistry = registryText.includes(expectedKbKey);
    const hasExpectedKbKey = hasExpectedKbKeyInPage || hasExpectedKbKeyInRegistry;

    const hasKbText = /Knowledge Base|KB Guide|Open KB Guide|Guide/i.test(html);
    const hasKbCardSignal =
      html.includes("data-help") ||
      html.includes("help-card") ||
      html.includes("kb-card") ||
      html.includes("Open KB Guide") ||
      html.includes("Knowledge Base");

    const hasOldKbPill =
      /<[^>]+class=["'][^"']*\bpill\b[^"']*["'][^>]*>\s*Knowledge Base\s*<\/[^>]+>/i.test(html);

    const registryManagedKb = helpScript !== "-" && hasExpectedKbKeyInRegistry;
    const acceptedKbSignal = hasKbCardSignal || registryManagedKb;

    const issues = [];

    if (helpScript === "-") issues.push("missing help.js");
    if (!hasExpectedKbKey) issues.push("missing expected KB key " + expectedKbKey);
    if (!acceptedKbSignal) issues.push("missing KB card/trigger signal");

    const detailParts = [
      "helpScript=" + helpScript,
      "expectedKbKey=" + expectedKbKey,
      "kbKeyPage=" + (hasExpectedKbKeyInPage ? "present" : "missing"),
      "kbKeyRegistry=" + (hasExpectedKbKeyInRegistry ? "present" : "missing"),
      "kbMode=" + (registryManagedKb ? "registry-managed" : "page-managed-or-missing"),
      "kbText=" + (hasKbText ? "present" : "missing"),
      "kbCardSignal=" + (hasKbCardSignal ? "present" : registryManagedKb ? "registry-managed" : "missing"),
      "oldKbPill=" + (hasOldKbPill ? "present" : "not-detected")
    ];

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail: issues.length ? issues.join("; ") + " | " + detailParts.join("; ") : detailParts.join("; ")
    };
  }
};


const ScriptOrderModule = {
  id: "script-order",
  version: "script-order-module-002-kb-safe-audit-only",
  description: "Audits shared engine script order without forcing KB/help.js before local scripts.",
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

    const srcs = scripts(html);

    function idx(needle) {
      return scriptIndex(srcs, needle);
    }

    function src(needle) {
      const found = srcs.find((item) => item.includes(needle));
      return found || "-";
    }

    function before(leftNeedle, rightNeedle, label) {
      const left = idx(leftNeedle);
      const right = idx(rightNeedle);

      if (left < 0 || right < 0) return;
      if (left > right) issues.push(label + " order reversed");
    }

    const issues = [];

    const localIndex = idx("./script.js");
    const hasLocal = localIndex >= 0;
    const hasExportButtons = hasId(html, "exportReport") || hasId(html, "saveSnapshot") || hasId(html, "exportStatus");
    const hasGraphics = src("scopedlabs-graphics.js") !== "-" || src(category + "-graphics.js") !== "-";
    const hasHelp = src("/assets/help.js") !== "-";

    if (!hasLocal) {
      issues.push("missing local ./script.js");
    }

    before("/assets/tool-flow.js", "./script.js", "tool-flow before local script");
    before("/assets/catalog.js", "./script.js", "catalog before local script");
    before("/assets/pipelines.js", "./script.js", "pipelines before local script");
    before("/assets/pipeline.js", "./script.js", "pipeline before local script");
    before(category + "-tool-registry.js", "scopedlabs-tool-shell.js", "registry before Tool Shell");
    before("scopedlabs-tool-shell.js", "./script.js", "Tool Shell before local script");

    if (hasExportButtons) {
      before("/assets/export.js", "./script.js", "export before local script");
    }

    if (hasGraphics) {
      before("scopedlabs-graphics.js", category + "-graphics.js", "shared graphics before category graphics");
      before("scopedlabs-graphics.js", "./script.js", "shared graphics before local script");
      before(category + "-graphics.js", "./script.js", "category graphics before local script");
    }

    const detailParts = [
      "toolFlow=" + src("/assets/tool-flow.js"),
      "catalog=" + src("/assets/catalog.js"),
      "pipelines=" + src("/assets/pipelines.js"),
      "pipeline=" + src("/assets/pipeline.js"),
      "registry=" + src(category + "-tool-registry.js"),
      "toolShell=" + src("scopedlabs-tool-shell.js"),
      "export=" + src("/assets/export.js"),
      "help=" + src("/assets/help.js"),
      "helpOrder=not-required",
      "helpConnected=" + (hasHelp ? "yes" : "no"),
      "sharedGraphics=" + src("scopedlabs-graphics.js"),
      "categoryGraphics=" + src(category + "-graphics.js"),
      "localScript=" + src("./script.js")
    ];

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail: issues.length ? issues.join("; ") + " | " + detailParts.join("; ") : detailParts.join("; ")
    };
  }
};


const CacheBustModule = {
  id: "cache-bust",
  version: "cache-bust-module-001-audit-only",
  description: "Audits cache-bust query versions on local and shared ScopedLabs assets.",
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

    const srcs = scripts(html);

    const scopedScriptSrcs = srcs.filter((src) =>
      src.includes("./script.js") ||
      src.includes("/assets/")
    );

    const unversionedScripts = scopedScriptSrcs.filter((src) => !/[?&]v=/.test(src));

    const localScript = srcs.find((src) => src.includes("./script.js")) || "-";
    const localScriptVersioned = localScript !== "-" && /[?&]v=/.test(localScript);

    const criticalAssets = [
      "/assets/tool-flow.js",
      "/assets/catalog.js",
      "/assets/pipelines.js",
      "/assets/pipeline.js",
      "/assets/help.js",
      "/assets/export.js",
      "scopedlabs-tool-shell.js",
      category + "-tool-registry.js",
      "scopedlabs-graphics.js",
      category + "-graphics.js"
    ];

    const presentCriticalAssets = criticalAssets
      .map((needle) => srcs.find((src) => src.includes(needle)) || "")
      .filter(Boolean);

    const unversionedCriticalAssets = presentCriticalAssets.filter((src) => !/[?&]v=/.test(src));

    const cssHrefs = Array.from(html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css[^"']*)["'][^>]*>/gi))
      .map((m) => m[1])
      .filter((href) => href.includes("/assets/") || href.includes("./") || href.includes("/style.css"));

    const unversionedCss = cssHrefs.filter((href) => !/[?&]v=/.test(href));

    const issues = [];

    if (localScript === "-") issues.push("missing local ./script.js");
    if (localScript !== "-" && !localScriptVersioned) issues.push("local ./script.js missing ?v=");
    if (unversionedCriticalAssets.length) {
      issues.push("critical assets missing ?v=: " + unversionedCriticalAssets.join(", "));
    }

    const detailParts = [
      "localScript=" + localScript,
      "localScriptVersioned=" + (localScriptVersioned ? "yes" : "no"),
      "scopedScripts=" + scopedScriptSrcs.length,
      "unversionedScripts=" + (unversionedScripts.length ? unversionedScripts.join(",") : "-"),
      "criticalAssets=" + (presentCriticalAssets.length ? presentCriticalAssets.join(",") : "-"),
      "unversionedCriticalAssets=" + (unversionedCriticalAssets.length ? unversionedCriticalAssets.join(",") : "-"),
      "cssLinks=" + (cssHrefs.length ? cssHrefs.join(",") : "-"),
      "unversionedCss=" + (unversionedCss.length ? unversionedCss.join(",") : "-")
    ];

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail: issues.length ? issues.join("; ") + " | " + detailParts.join("; ") : detailParts.join("; ")
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

const modules = [ToolShellModule, BackContinueModule, BadgeCleanupModule, LabelStandardModule, ExportShellModule, GraphicsContractModule, KbCardModule, ScriptOrderModule, CacheBustModule];

const args = process.argv.slice(2);
const summaryOnly = args.includes("--summary-only");
const moduleArgIndex = args.indexOf("--module");
const requestedModuleId = moduleArgIndex >= 0 ? String(args[moduleArgIndex + 1] || "").trim() : "";
const activeModules = requestedModuleId
  ? modules.filter((module) => module.id === requestedModuleId)
  : modules;

if (moduleArgIndex >= 0 && !requestedModuleId) {
  console.error("Missing module id after --module.");
  console.error("Available modules: " + modules.map((module) => module.id).join(", "));
  process.exit(1);
}

if (requestedModuleId && !activeModules.length) {
  console.error("Unknown module: " + requestedModuleId);
  console.error("Available modules: " + modules.map((module) => module.id).join(", "));
  process.exit(1);
}

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

  for (const module of activeModules) {
    rows.push(module.run(tool, indexFile, html));
  }
}

console.log("\nScopedLabs Category Modernizer V1\n");
console.log("Version: scopedlabs-category-modernizer-013-cache-bust-module");
console.log("Category: " + category);
console.log("Mode: " + (apply ? "APPLY" : "DRY RUN"));
console.log("Modules: " + activeModules.map((m) => m.id + "@" + m.version).join(", "));
console.log("Protected tools: " + (Array.from(config.protectedTools).join(", ") || "-"));
console.log("Module filter: " + (requestedModuleId || "all"));
console.log("Output: " + (summaryOnly ? "summary-only" : "full-table"));
console.log("");

if (summaryOnly) {
  console.log("\nDetailed result table skipped (--summary-only).");
} else {
  console.table(rows);
}

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