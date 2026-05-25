#!/usr/bin/env node
/*
 * ScopedLabs Category Modernizer V1
 * Version: scopedlabs-category-modernizer-032-source-integrity-audit
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
  modules: ["tool-shell", "back-continue", "badge-cleanup", "label-standard", "export-shell", "graphics-contract", "kb-card", "script-order", "cache-bust", "input-presets", "assistant-shell", "diagnostics"]
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
  version: "badge-cleanup-module-003-hero-tier-apply",
  description: "Inventories badges and safely removes hero/header tier pills only.",
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
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function isTierText(text) {
      return /^(Pro Tier|Free Tier)$/i.test(String(text || "").trim());
    }

    const h1Index = html.search(/<h1\b/i);
    const badgeRx = /<([a-z][\w:-]*)\b(?=[^>]*\bclass\s*=\s*(['"])[^'"]*\bpill\b[^'"]*\2)[^>]*>([\s\S]*?)<\/\1>/gi;

    const badgeMatches = [];
    let match;

    while ((match = badgeRx.exec(html))) {
      const text = cleanText(match[3]);
      badgeMatches.push({
        full: match[0],
        index: match.index,
        text,
        isTier: isTierText(text),
        isHeroTier: isTierText(text) && h1Index >= 0 && match.index < h1Index
      });
    }

    const inventory = badgeMatches
      .map((item) => item.text)
      .filter((text) => /^(Pro Tier|Free Tier|Part of a Design Flow|Documentation & Export|Knowledge Base)$/i.test(text));

    const heroTierPills = badgeMatches.filter((item) => item.isHeroTier);

    let patched = html;

    if (heroTierPills.length) {
      for (const item of heroTierPills.slice().sort((a, b) => b.index - a.index)) {
        patched = patched.slice(0, item.index) + patched.slice(item.index + item.full.length);
      }
    }

    const detail = (inventory.length
      ? "badge inventory: " + inventory.join(" | ")
      : "no legacy/decorative badges detected") +
      "; hero tier pills planned: " +
      (heroTierPills.length ? heroTierPills.map((item) => item.text).join(" | ") : "none");

    const hasPatch = heroTierPills.length > 0 && patched !== html;

    if (apply && hasPatch) {
      write(indexFile, patched);
    }

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: "SAFE",
      action: hasPatch
        ? (apply ? "applied:remove-hero-tier-pill" : "remove-hero-tier-pill")
        : "noop",
      rowId: "-",
      detail
    };
  }
};


const LabelStandardModule = {
  id: "label-standard",
  version: "label-standard-module-006-pipeline-label-title-cleanup",
  description: "Safely removes crumbs rows and standardizes active page H1/title labels to pipeline nav labels.",
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
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/&bull;|&#8226;|&#x2022;/gi, "?")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    const pipelineLabels = {
      "area-planner": "Area / Zone Planner",
      "scene-illumination": "Scene Illumination",
      "mounting-height": "Mounting Height",
      "field-of-view": "Field of View",
      "camera-coverage-area": "Coverage Area",
      "camera-spacing": "Camera Spacing",
      "blind-spot-check": "Blind Spot Check",
      "pixel-density": "Pixel Density",
      "face-recognition-range": "Face Recognition",
      "license-plate-range": "License Plate"
    };

    const aliases = {
      "scene-illumination": ["Scene Illumination Estimator"],
      "camera-coverage-area": ["Camera Coverage Area"],
      "camera-spacing": ["Camera Spacing Planner"],
      "pixel-density": ["Pixel Density Calculator"],
      "face-recognition-range": ["Face Recognition Range"],
      "license-plate-range": ["License Plate Capture Range", "License Plate Range"]
    };

    let patched = html;
    const actions = [];

    const expected = pipelineLabels[tool] || "";
    const allowedAliases = aliases[tool] || [];

    const h1Before = cleanText((html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i) || [""])[0]);
    const titleBefore = cleanText((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || ["", ""])[1]);

    let crumbsRemoved = false;
    const h1Index = patched.search(/<h1\b/i);

    if (h1Index >= 0) {
      const beforeH1 = patched.slice(0, h1Index);
      const fromH1 = patched.slice(h1Index);

      const crumbsRx = /(\r?\n)?[ \t]*<div\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\bcrumbs\b[^"']*\2)[^>]*>[\s\S]*?<\/div>[ \t]*(\r?\n)?/i;

      const cleanedBeforeH1 = beforeH1.replace(crumbsRx, function(match) {
        const text = cleanText(match);

        if (!/^Tools\s*\/\s*Physical Security\s*\/\s*.+$/i.test(text)) {
          return match;
        }

        crumbsRemoved = true;
        return "\n";
      });

      patched = cleanedBeforeH1 + fromH1;

      if (crumbsRemoved) {
        actions.push("remove-crumbs-row");
      }
    }

    if (expected) {
      const h1Rx = /<h1\b([^>]*)>[\s\S]*?<\/h1>/i;

      patched = patched.replace(h1Rx, function(match, attrs) {
        const current = cleanText(match);

        if (current === expected) {
          return match;
        }

        if (!allowedAliases.includes(current)) {
          return match;
        }

        actions.push("standardize-h1");
        return "<h1" + attrs + ">" + expected + "</h1>";
      });

      const titleRx = /<title\b([^>]*)>[\s\S]*?<\/title>/i;

      patched = patched.replace(titleRx, function(match, attrs) {
        const current = cleanText(match);
        const desired = expected + " | ScopedLabs";

        if (current === desired) {
          return match;
        }

        const acceptedTitles = new Set();

        [expected].concat(allowedAliases).forEach(function(label) {
          acceptedTitles.add(label + " | ScopedLabs");
          acceptedTitles.add(label + " ? ScopedLabs");
        });

        if (!acceptedTitles.has(current)) {
          return match;
        }

        actions.push("standardize-title");
        return "<title" + attrs + ">" + desired + "</title>";
      });
    }

    const h1After = cleanText((patched.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i) || [""])[0]);
    const titleAfter = cleanText((patched.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || ["", ""])[1]);

    const hasPatch = patched !== html;

    if (apply && hasPatch) {
      write(indexFile, patched);
    }

    const detail = [
      "crumbs=" + (crumbsRemoved ? "planned-remove" : "none"),
      "h1=" + h1Before + (h1Before !== h1After ? " -> " + h1After : ""),
      "title=" + titleBefore + (titleBefore !== titleAfter ? " -> " + titleAfter : "")
    ].join("; ");

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: "SAFE",
      action: hasPatch
        ? (apply ? "applied:" + actions.join("+") : actions.join("+"))
        : "noop",
      rowId: "-",
      detail
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

const CtaStandardModule = {
  id: "cta-standard",
  version: "cta-standard-module-003-export-unlock-apply",
  description: "Audits CTA labels and safely standardizes export/unlock CTA copy.",
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
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&rarr;/gi, "?")
        .replace(/\s+/g, " ")
        .trim();
    }

    function getAttr(attrs, name) {
      const rx = new RegExp("\\b" + name + "\\s*=\\s*([\"'])(.*?)\\1", "i");
      const m = String(attrs || "").match(rx);
      return m ? m[2] : "";
    }

    let patched = html;
    const findings = [];
    const actions = [];

    const ctaRx = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let match;

    while ((match = ctaRx.exec(html))) {
      const tag = match[1].toLowerCase();
      const attrs = match[2] || "";
      const text = cleanText(match[3]);
      const id = getAttr(attrs, "id") || "-";
      const cls = getAttr(attrs, "class") || "-";

      const looksLikeCta =
        /btn|button|cta|continue|export|snapshot|guide|kb|back|print|copy|calc|reset/i.test(attrs) ||
        /continue|back|export|snapshot|guide|knowledge|print|copy|save|open|calculate|check|estimate|reset|unlock|return|explore/i.test(text);

      if (!looksLikeCta || !text) continue;

      if (id === "calc") {
        findings.push("calc=" + text);
      }

      if (id === "exportReport") {
        if (text === "Open Export Report") {
          findings.push("exportReport: Open Export Report -> Open Report");
        } else {
          findings.push("exportReport=" + text);
        }
      }

      if (id === "saveSnapshot") {
        findings.push("saveSnapshot=" + text);
      }

      if (id === "continue") {
        findings.push("continue=" + text);
      }

      if (/^Unlock Pro$/i.test(text)) {
        findings.push("unlock: Unlock Pro -> Unlock Pro for Physical Security");
      }

      if (/Back to Physical Security/i.test(text)) {
        findings.push("back=Back to Physical Security");
      }

      if (/Open KB Guide|Knowledge Base|Guide/i.test(text) && cls.includes("nav-tab")) {
        findings.push("guide/nav=" + text);
      }
    }

    patched = patched.replace(
      /(<button\b(?=[^>]*\bid\s*=\s*["']exportReport["'])[^>]*>)\s*Open Export Report\s*(<\/button>)/gi,
      function(match, open, close) {
        actions.push("standardize-export-report-label");
        return open + "Open Report" + close;
      }
    );

    patched = patched.replace(
      /(<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bbtn-primary\b[^"']*["'])[^>]*>)\s*Unlock Pro\s*(<\/a>)/gi,
      function(match, open, close) {
        actions.push("standardize-unlock-label");
        return open + "Unlock Pro for Physical Security" + close;
      }
    );

    const hasPatch = patched !== html;

    if (apply && hasPatch) {
      write(indexFile, patched);
    }

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: "SAFE",
      action: hasPatch
        ? (apply ? "applied:" + [...new Set(actions)].join("+") : [...new Set(actions)].join("+"))
        : "noop",
      rowId: "-",
      detail: findings.length ? findings.join("; ") : "no CTA findings"
    };
  }
};

const CardTitleStandardModule = {
  id: "card-title-standard",
  version: "card-title-standard-module-003-apply",
  description: "Safely standardizes Physical Security card and section titles.",
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
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    const replacements = {
      "scene-illumination": [
        ["h2", "This tool starts the Physical Security Design Flow", "Starting the Physical Security Design Flow"]
      ],
      "mounting-height": [
        ["h2", "This tool continues the Physical Security Design Flow", "Continuing the Physical Security Design Flow"]
      ],
      "field-of-view": [
        ["h2", "This tool continues the Physical Security Design Flow", "Continuing the Physical Security Design Flow"]
      ],
      "face-recognition-range": [
        ["h2", "This tool continues the Physical Security Design Flow", "Continuing the Physical Security Design Flow"]
      ],
      "pixel-density": [
        ["h2", "This tool continues the Physical Security Design Flow", "Continuing the Physical Security Design Flow"]
      ],
      "license-plate-range": [
        ["h2", "This tool completes the Physical Security design flow", "Completing the Physical Security Design Flow"],
        ["h2", "Inputs", "Planning Inputs"]
      ],
      "camera-coverage-area": [
        ["h3", "Export & Snapshot", "Export Report"]
      ]
    };

    let patched = html;
    const planned = [];
    const actions = [];

    for (const [tag, from, to] of replacements[tool] || []) {
      const rx = new RegExp("<" + tag + "\\b([^>]*)>[\\s\\S]*?<\\/" + tag + ">", "gi");

      patched = patched.replace(rx, function(match, attrs) {
        const text = cleanText(match);

        if (text !== from) {
          return match;
        }

        planned.push(tag + ": " + from + " -> " + to);
        actions.push("standardize-card-title");
        return "<" + tag + attrs + ">" + to + "</" + tag + ">";
      });
    }

    const hasPatch = patched !== html;

    if (apply && hasPatch) {
      write(indexFile, patched);
    }

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: "SAFE",
      action: hasPatch
        ? (apply ? "applied:" + [...new Set(actions)].join("+") : [...new Set(actions)].join("+"))
        : "noop",
      rowId: "-",
      detail: planned.length ? planned.join("; ") : "card titles look standard"
    };
  }
};






const SourceIntegrityModule = {
  id: "source-integrity",
  version: "source-integrity-module-001-audit-only",
  description: "Audits pipeline carry-over, active area state, flow-note anchors, manual override metadata, and source integrity signals without modifying page files.",
  expectations: {
    "area-planner": {
      mode: "area-entry"
    },
    "scene-illumination": {
      mode: "pipeline"
    },
    "mounting-height": {
      mode: "pipeline"
    },
    "field-of-view": {
      mode: "pipeline"
    },
    "camera-coverage-area": {
      mode: "pipeline"
    },
    "camera-spacing": {
      mode: "pipeline"
    },
    "blind-spot-check": {
      mode: "pipeline"
    },
    "pixel-density": {
      mode: "pipeline"
    },
    "face-recognition-range": {
      mode: "manual-override-required"
    },
    "license-plate-range": {
      mode: "manual-override-required"
    }
  },
  readOptional(filePath) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  },
  hasId(source, id) {
    return source.includes('id="' + id + '"') || source.includes("id='" + id + "'");
  },
  hasAny(source, signals) {
    return (Array.isArray(signals) ? signals : []).some((signal) => source.includes(signal));
  },
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

    const expectation = this.expectations[tool] || { mode: "pipeline" };
    const scriptFile = path.join(path.dirname(indexFile), "script.js");
    const scriptText = this.readOptional(scriptFile);
    const combined = html + "\n" + scriptText;
    const issues = [];

    const flowAnchor = this.hasId(html, "flow-note") || combined.includes("flow-note");
    const resultsAnchor = this.hasId(html, "results");
    const areaState = html.includes("physical-security-area-state.js") || combined.includes("ScopedLabsPhysicalSecurityAreaState");
    const pipelineSignal = combined.includes("scopedlabs:pipeline") || combined.includes("FLOW_KEYS");
    const pipelineWrite = this.hasAny(combined, ["writeFlow", "ScopedLabsAnalyzer.writeFlow", "pipeline:last-result"]);
    const renderFlow = this.hasAny(combined, ["renderFlowNote", "refreshManualOverrideBanner", "flowNote"]);
    const clearFlow = this.hasAny(combined, ["clearFlow: true", "clearFlow", "invalidate({"]);
    const activeAreaSignal = this.hasAny(combined, ["getActiveArea", "updateActiveAreaResult", "activeArea", "Active Area"]);
    const planningContext = this.hasAny(combined, ["Imported Assumptions", "Area Context", "Planning Context", "manual override", "manual-override"]);
    const manualOverride = this.hasAny(combined, ["manualFlowOverrides", "manual-override", "markFlowInputOverride", "getManualOverrideMetadata"]);
    const sourceMode = this.hasAny(combined, ["sourceMode", "manualOverride", "ManualOverrides", "manualOverrides"]);

    if (expectation.mode === "area-entry") {
      if (!areaState) {
        issues.push("area state signal missing");
      }

      if (!activeAreaSignal) {
        issues.push("active area signal missing");
      }
    }

    if (expectation.mode === "pipeline" || expectation.mode === "manual-override-required") {
      if (!flowAnchor) {
        issues.push("#flow-note anchor missing");
      }

      if (!resultsAnchor) {
        issues.push("#results anchor missing");
      }

      if (!areaState) {
        issues.push("area state signal missing");
      }

      if (!pipelineSignal) {
        issues.push("pipeline storage signal missing");
      }

      if (!pipelineWrite) {
        issues.push("pipeline write signal missing");
      }

      if (!renderFlow) {
        issues.push("flow-note render/refresh signal missing");
      }

      if (!clearFlow) {
        issues.push("input invalidation/clearFlow signal missing");
      }
    }

    if (expectation.mode === "manual-override-required") {
      if (!manualOverride) {
        issues.push("manual override signal missing");
      }

      if (!sourceMode) {
        issues.push("source mode/manual override metadata signal missing");
      }

      if (!planningContext) {
        issues.push("imported/planning context signal missing");
      }
    }

    const detail = [
      "mode=" + expectation.mode,
      "flowAnchor=" + (flowAnchor ? "present" : "-"),
      "areaState=" + (areaState ? "present" : "-"),
      "pipelineWrite=" + (pipelineWrite ? "present" : "-"),
      "clearFlow=" + (clearFlow ? "present" : "-"),
      "manualOverride=" + (manualOverride ? "present" : "-"),
      "planningContext=" + (planningContext ? "present" : "-"),
      "issues=" + (issues.length ? issues.join("|") : "-")
    ].join("; ");

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail
    };
  }
};


const ExportVisualsModule = {
  id: "export-visuals",
  version: "export-visuals-module-001-audit-only",
  description: "Audits assistant/CAD-owned report visuals, export SVG signals, visual ownership, and legacy chart suppression without modifying page files.",
  expectations: {
    "area-planner": {
      mode: "not-required"
    },
    "scene-illumination": {
      mode: "required",
      renderer: "scene-illumination-lighting-plan",
      exportSignals: ["ExportVisualSvg", "scene-illumination-lighting-plan"]
    },
    "mounting-height": {
      mode: "standard"
    },
    "field-of-view": {
      mode: "renderer-required",
      renderer: "fov-geometry-plan"
    },
    "camera-coverage-area": {
      mode: "renderer-required",
      renderer: "coverage-footprint-plan"
    },
    "camera-spacing": {
      mode: "observe-only",
      renderer: "camera-layout-iso"
    },
    "blind-spot-check": {
      mode: "observe-only",
      renderer: "camera-layout-iso"
    },
    "pixel-density": {
      mode: "renderer-required",
      renderer: "pixel-density-detail-plan"
    },
    "face-recognition-range": {
      mode: "required",
      renderer: "face-recognition-range-plan",
      exportSignals: ["faceRecognitionExportVisualSvg", "face-recognition-range-plan"]
    },
    "license-plate-range": {
      mode: "required",
      renderer: "license-plate-range-plan",
      exportSignals: ["licensePlateExportVisualSvg", "license-plate-range-plan"]
    }
  },
  readOptional(filePath) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  },
  rendererRegistered(graphicsText, renderer) {
    if (!renderer) return true;
    return graphicsText.includes('registerRenderer("' + renderer + '"') ||
      graphicsText.includes("registerRenderer('" + renderer + "'");
  },
  rendererSvgBlock(graphicsText, renderer) {
    if (!renderer) return "";

    const marker = 'data-report-renderer="' + renderer + '"';
    const pos = graphicsText.indexOf(marker);
    if (pos < 0) return "";

    const start = Math.max(0, graphicsText.lastIndexOf("<svg", pos));
    const end = graphicsText.indexOf("</svg>", pos);

    if (start < 0 || end < 0) return "";
    return graphicsText.slice(start, end + 6);
  },
  hasAll(source, signals) {
    return !Array.isArray(signals) || !signals.length || signals.every((signal) => source.includes(signal));
  },
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

    const expectation = this.expectations[tool] || { mode: "standard" };
    const scriptFile = path.join(path.dirname(indexFile), "script.js");
    const scriptText = this.readOptional(scriptFile);
    const graphicsFile = path.join(process.cwd(), "assets", category + "-graphics.js");
    const graphicsText = this.readOptional(graphicsFile);
    const combined = html + "\n" + scriptText;
    const svgBlock = this.rendererSvgBlock(graphicsText, expectation.renderer);
    const issues = [];

    const registered = expectation.renderer ? this.rendererRegistered(graphicsText, expectation.renderer) : false;
    const referenced = expectation.renderer ? combined.includes(expectation.renderer) : false;
    const rendererStatus = expectation.renderer
      ? (registered || referenced ? "present" : "missing")
      : "-";

    const exportSvg =
      svgBlock.includes("data-export-svg") ||
      combined.includes("data-export-svg") ||
      combined.includes("data-export-section");

    const visualOwner =
      svgBlock.includes("data-report-visual-owner") ||
      combined.includes("data-report-visual-owner") ||
      combined.includes("data-report-renderer");

    const suppressLegacy =
      svgBlock.includes("data-suppress-legacy-chart-export") ||
      combined.includes("data-suppress-legacy-chart-export") ||
      combined.includes("suppressLegacyChartExport");

    const exportHook = this.hasAll(combined, expectation.exportSignals || [])
      ? "present"
      : expectation.exportSignals && expectation.exportSignals.length
        ? "missing"
        : "-";

    if ((expectation.mode === "required" || expectation.mode === "renderer-required") && expectation.renderer && !registered && !referenced) {
      issues.push("renderer missing: " + expectation.renderer);
    }

    if (expectation.mode === "required" && exportHook === "missing") {
      issues.push("export visual hook missing");
    }

    if ((expectation.mode === "required" || expectation.mode === "renderer-required") && !exportSvg) {
      issues.push("export SVG/section signal missing");
    }

    if ((expectation.mode === "required" || expectation.mode === "renderer-required") && !visualOwner) {
      issues.push("report visual owner/renderer signal missing");
    }

    if ((expectation.mode === "required" || expectation.mode === "renderer-required") && !suppressLegacy) {
      issues.push("legacy chart suppression signal missing");
    }

    const detail = [
      "mode=" + expectation.mode,
      "renderer=" + rendererStatus,
      "exportSvg=" + (exportSvg ? "present" : "-"),
      "visualOwner=" + (visualOwner ? "present" : "-"),
      "suppressLegacy=" + (suppressLegacy ? "present" : "-"),
      "exportHook=" + exportHook,
      "issues=" + (issues.length ? issues.join("|") : "-")
    ].join("; ");

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail
    };
  }
};


const InputPresetModule = {
  id: "input-presets",
  version: "input-presets-module-001-audit-only",
  description: "Audits guided input preset dropdowns and confirms numeric inputs remain the source of truth.",
  expectations: {
    "area-planner": {
      mode: "not-required"
    },
    "scene-illumination": {
      mode: "not-required"
    },
    "mounting-height": {
      mode: "not-required"
    },
    "field-of-view": {
      mode: "not-required"
    },
    "camera-coverage-area": {
      mode: "not-required"
    },
    "camera-spacing": {
      mode: "not-required"
    },
    "blind-spot-check": {
      mode: "not-required"
    },
    "pixel-density": {
      mode: "observe-only",
      note: "Pixel Density presets are observed but not enforced by this first audit module."
    },
    "face-recognition-range": {
      mode: "required",
      presetIds: ["resPreset", "hfovPreset", "ppfPreset"],
      sourceInputIds: ["res", "hfov", "ppf", "fw", "dist"],
      scriptSignals: ["FACE_GUIDED_PRESETS", "bindFaceGuidedPresets", "applyFaceGuidedPreset", "syncAllFacePresetSelects"],
      overrideSignals: ["markFlowInputOverride"]
    },
    "license-plate-range": {
      mode: "required",
      presetIds: ["resPreset", "hfovPreset", "pppPreset", "pwPreset"],
      sourceInputIds: ["res", "hfov", "ppp", "pw", "dist"],
      scriptSignals: ["PLATE_GUIDED_PRESETS", "bindPlateGuidedPresets", "applyPlateGuidedPreset", "syncAllPlatePresetSelects"],
      overrideSignals: ["markFlowInputOverride"]
    }
  },
  readOptional(filePath) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  },
  hasId(source, id) {
    return source.includes('id="' + id + '"') || source.includes("id='" + id + "'");
  },
  missingIds(source, combined, ids) {
    return (Array.isArray(ids) ? ids : []).filter((id) => {
      return !this.hasId(source, id) && !combined.includes(id) && !combined.includes('$("#' + id + '")') && !combined.includes('$("' + id + '")');
    });
  },
  missingSignals(combined, signals) {
    return (Array.isArray(signals) ? signals : []).filter((signal) => !combined.includes(signal));
  },
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

    const expectation = this.expectations[tool] || { mode: "not-required" };
    const scriptFile = path.join(path.dirname(indexFile), "script.js");
    const scriptText = this.readOptional(scriptFile);
    const combined = html + "\n" + scriptText;
    const issues = [];

    const presetIds = expectation.presetIds || [];
    const sourceInputIds = expectation.sourceInputIds || [];
    const scriptSignals = expectation.scriptSignals || [];
    const overrideSignals = expectation.overrideSignals || [];

    const missingPresets = this.missingIds(html, combined, presetIds);
    const missingInputs = this.missingIds(html, combined, sourceInputIds);
    const missingScriptSignals = this.missingSignals(combined, scriptSignals);
    const missingOverrideSignals = this.missingSignals(combined, overrideSignals);

    if (expectation.mode === "required") {
      if (missingPresets.length) {
        issues.push("missing preset ids: " + missingPresets.join(","));
      }

      if (missingInputs.length) {
        issues.push("missing source input ids: " + missingInputs.join(","));
      }

      if (missingScriptSignals.length) {
        issues.push("missing preset script signals: " + missingScriptSignals.join(","));
      }

      if (missingOverrideSignals.length) {
        issues.push("missing override safety signals: " + missingOverrideSignals.join(","));
      }
    }

    const anyPresetSignal =
      combined.includes("Preset") ||
      combined.includes("GUIDED_PRESETS") ||
      combined.includes("guided-preset");

    const presetStatus = presetIds.length
      ? (missingPresets.length ? "missing:" + missingPresets.join(",") : "present")
      : (anyPresetSignal ? "observed" : "-");

    const inputStatus = sourceInputIds.length
      ? (missingInputs.length ? "missing:" + missingInputs.join(",") : "present")
      : "-";

    const scriptStatus = scriptSignals.length
      ? (missingScriptSignals.length ? "missing:" + missingScriptSignals.join(",") : "present")
      : (anyPresetSignal ? "observed" : "-");

    const overrideStatus = overrideSignals.length
      ? (missingOverrideSignals.length ? "missing:" + missingOverrideSignals.join(",") : "present")
      : "-";

    const numericSourceTruth = sourceInputIds.length
      ? (missingInputs.length ? "no" : "yes")
      : "-";

    const detail = [
      "mode=" + expectation.mode,
      "presets=" + presetStatus,
      "sourceInputs=" + inputStatus,
      "scriptBinding=" + scriptStatus,
      "overrideSafe=" + overrideStatus,
      "numericSourceTruth=" + numericSourceTruth,
      "note=" + (expectation.note || "-"),
      "issues=" + (issues.length ? issues.join("|") : "-")
    ].join("; ");

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail
    };
  }
};


const AssistantShellModule = {
  id: "assistant-shell",
  version: "assistant-shell-module-001-audit-only",
  description: "Audits assistant shell readiness, live visuals, guided presets, renderer contracts, and export visual signals without modifying page files.",
  expectations: {
    "area-planner": {
      mode: "not-required"
    },
    "scene-illumination": {
      mode: "specialist-visual",
      renderer: "scene-illumination-lighting-plan",
      liveSignals: ["LiveVisual", "scene-illumination-lighting-plan"],
      exportSignals: ["ExportVisualSvg", "scene-illumination-lighting-plan"]
    },
    "mounting-height": {
      mode: "standard"
    },
    "field-of-view": {
      mode: "graphics-renderer",
      renderer: "fov-geometry-plan"
    },
    "camera-coverage-area": {
      mode: "graphics-renderer",
      renderer: "coverage-footprint-plan"
    },
    "camera-spacing": {
      mode: "graphics-renderer",
      renderer: "camera-layout-iso"
    },
    "blind-spot-check": {
      mode: "graphics-renderer",
      renderer: "camera-layout-iso"
    },
    "pixel-density": {
      mode: "graphics-renderer",
      renderer: "pixel-density-detail-plan"
    },
    "face-recognition-range": {
      mode: "specialist-visual",
      renderer: "face-recognition-range-plan",
      liveVisualIds: ["faceRecognitionLiveVisual"],
      presetIds: ["resPreset", "hfovPreset", "ppfPreset"],
      exportSignals: ["faceRecognitionExportVisualSvg", "face-recognition-range-plan"]
    },
    "license-plate-range": {
      mode: "specialist-visual",
      renderer: "license-plate-range-plan",
      liveVisualIds: ["licensePlateLiveVisual"],
      presetIds: ["resPreset", "hfovPreset", "pppPreset", "pwPreset"],
      exportSignals: ["licensePlateExportVisualSvg", "license-plate-range-plan"]
    }
  },
  readOptional(filePath) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  },
  hasId(source, id) {
    return source.includes('id="' + id + '"') || source.includes("id='" + id + "'");
  },
  hasAll(source, signals) {
    return !Array.isArray(signals) || !signals.length || signals.every((signal) => source.includes(signal));
  },
  hasAny(source, signals) {
    return !Array.isArray(signals) || !signals.length || signals.some((signal) => source.includes(signal));
  },
  rendererRegistered(graphicsText, renderer) {
    if (!renderer) return true;
    return graphicsText.includes('registerRenderer("' + renderer + '"') ||
      graphicsText.includes("registerRenderer('" + renderer + "'");
  },
  countVisibleAssistantStatus(html) {
    const matches = html.match(/Assistant Status/gi) || [];
    return matches.length;
  },
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

    const expectation = this.expectations[tool] || { mode: "standard" };
    const scriptFile = path.join(path.dirname(indexFile), "script.js");
    const scriptText = this.readOptional(scriptFile);
    const graphicsFile = path.join(process.cwd(), "assets", category + "-graphics.js");
    const graphicsText = this.readOptional(graphicsFile);
    const combined = html + "\n" + scriptText;
    const issues = [];

    const assistantText = combined.toLowerCase().includes("assistant");
    const hasResults = this.hasId(html, "results");
    const hasAnalysis = this.hasId(html, "analysis-copy") || this.hasId(html, "analysis");
    const hasToolShell = html.includes("scopedlabs-tool-shell.js");
    const hasRegistry = html.includes(category + "-tool-registry.js");

    if (expectation.mode !== "not-required" && !assistantText) {
      issues.push("assistant text not detected");
    }

    if (expectation.mode !== "not-required" && !hasResults) {
      issues.push("#results missing");
    }

    if (expectation.mode !== "not-required" && !hasAnalysis) {
      issues.push("analysis container missing");
    }

    if (!hasToolShell) {
      issues.push("Tool Shell helper not loaded");
    }

    if (!hasRegistry) {
      issues.push("category registry not loaded");
    }

    let rendererStatus = "-";
    if (expectation.renderer) {
      const registered = this.rendererRegistered(graphicsText, expectation.renderer);
      const referenced = combined.includes(expectation.renderer);
      rendererStatus = registered || referenced ? "present" : "missing";

      if (!registered && !referenced) {
        issues.push("renderer missing: " + expectation.renderer);
      }
    }

    let liveStatus = "-";
    if (Array.isArray(expectation.liveVisualIds) && expectation.liveVisualIds.length) {
      const missing = expectation.liveVisualIds.filter((id) => !this.hasId(html, id) && !combined.includes(id));
      liveStatus = missing.length ? "missing:" + missing.join(",") : "present";
      if (missing.length) {
        issues.push("live visual missing: " + missing.join(","));
      }
    } else if (Array.isArray(expectation.liveSignals) && expectation.liveSignals.length) {
      liveStatus = this.hasAny(combined, expectation.liveSignals) ? "present" : "missing";
      if (liveStatus === "missing") {
        issues.push("live visual signal missing");
      }
    }

    let presetStatus = "-";
    if (Array.isArray(expectation.presetIds) && expectation.presetIds.length) {
      const missing = expectation.presetIds.filter((id) => !this.hasId(html, id) && !combined.includes(id));
      presetStatus = missing.length ? "missing:" + missing.join(",") : "present";
      if (missing.length) {
        issues.push("guided preset missing: " + missing.join(","));
      }
    }

    let exportStatus = "-";
    if (Array.isArray(expectation.exportSignals) && expectation.exportSignals.length) {
      exportStatus = this.hasAll(combined, expectation.exportSignals) ? "present" : "missing";
      if (exportStatus === "missing") {
        issues.push("export visual signal missing");
      }
    }

    const visibleStatusCount = this.countVisibleAssistantStatus(html);
    const duplicateStatus = visibleStatusCount > 1 ? "possible duplicate visible Assistant Status: " + visibleStatusCount : "ok";
    if (visibleStatusCount > 1) {
      issues.push("possible duplicate visible Assistant Status text");
    }

    const detail = [
      "mode=" + expectation.mode,
      "assistantText=" + (assistantText ? "yes" : "no"),
      "renderer=" + rendererStatus,
      "liveVisual=" + liveStatus,
      "presets=" + presetStatus,
      "exportVisual=" + exportStatus,
      "duplicateStatus=" + duplicateStatus,
      "issues=" + (issues.length ? issues.join("|") : "-")
    ].join("; ");

    return {
      module: this.id,
      version: this.version,
      tool,
      classification: issues.length ? "WATCH" : "SAFE",
      action: "noop",
      rowId: "-",
      detail
    };
  }
};


const DiagnosticsModule = {
  id: "diagnostics",
  version: "diagnostics-module-002-visible-text-safe-audit-only",
  description: "Audits factory diagnostic signals and obvious broken visible UI artifacts without modifying page files.",
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
    const registryScript = srcs.find((src) => src.includes(category + "-tool-registry.js")) || "-";
    const toolShellScript = srcs.find((src) => src.includes("scopedlabs-tool-shell.js")) || "-";
    const localScript = srcs.find((src) => src.includes("./script.js")) || "-";

    const localScriptPath = localScript !== "-"
      ? path.join(path.dirname(indexFile), localScript.split("?")[0].replace(/^\.\//, ""))
      : "";

    const localScriptText = localScriptPath && fs.existsSync(localScriptPath)
      ? fs.readFileSync(localScriptPath, "utf8")
      : "";

    const combinedText = html + "\n" + localScriptText;

    const visibleText = html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const obviousBrokenArtifacts = [];

    if (/\bStatus:\s*undefined\b/.test(visibleText)) obviousBrokenArtifacts.push("Status: undefined");
    if (/\bundefined\b/.test(visibleText)) obviousBrokenArtifacts.push("visible undefined text");
    if (/\bNaN\b/.test(visibleText)) obviousBrokenArtifacts.push("visible NaN text");
    if (/\bnull\b/.test(visibleText)) obviousBrokenArtifacts.push("visible null text");

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

    const graphicsTool = expectedRenderers.length > 0;
    const hasReportVisualSignal =
      combinedText.includes("data-report-visual-owner") ||
      combinedText.includes("data-report-renderer") ||
      combinedText.includes("data-suppress-legacy-chart-export") ||
      combinedText.includes("report-visual-contract");

    const hasShellDiagnostics =
      combinedText.includes("runDiagnostics") ||
      combinedText.includes("buildDiagnosticResult") ||
      toolShellScript !== "-";

    const requiredIds = requiredIdsForTool(tool);
    const missingRequiredIds = requiredIds.filter((id) => !hasId(html, id));

    const issues = [];

    if (registryScript === "-") issues.push("missing category registry script");
    if (toolShellScript === "-") issues.push("missing Tool Shell script");
    if (localScript === "-") issues.push("missing local ./script.js");
    if (missingRequiredIds.length) issues.push("missing required IDs: " + missingRequiredIds.join(", "));
    if (obviousBrokenArtifacts.length) issues.push("broken visible UI artifacts: " + obviousBrokenArtifacts.join(", "));
    if (graphicsTool && !hasReportVisualSignal) issues.push("graphics tool missing report visual contract signal");

    const detailParts = [
      "registry=" + registryScript,
      "toolShell=" + toolShellScript,
      "localScript=" + localScript,
      "requiredIds=" + requiredIds.join(","),
      "missingRequiredIds=" + (missingRequiredIds.length ? missingRequiredIds.join(",") : "-"),
      "shellDiagnostics=" + (hasShellDiagnostics ? "present" : "missing"),
      "graphicsTool=" + (graphicsTool ? "yes" : "no"),
      "expectedRenderers=" + (expectedRenderers.length ? expectedRenderers.join(",") : "-"),
      "reportVisualSignal=" + (hasReportVisualSignal ? "present" : graphicsTool ? "missing" : "not-required"),
      "brokenVisibleArtifacts=" + (obviousBrokenArtifacts.length ? obviousBrokenArtifacts.join(",") : "-")
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

const modules = [ToolShellModule, BackContinueModule, BadgeCleanupModule, LabelStandardModule, ExportShellModule, GraphicsContractModule, KbCardModule, ScriptOrderModule, CacheBustModule,CtaStandardModule,
   
  CardTitleStandardModule, SourceIntegrityModule, ExportVisualsModule, InputPresetModule, AssistantShellModule, DiagnosticsModule];

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
console.log("Version: scopedlabs-category-modernizer-032-source-integrity-audit");
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