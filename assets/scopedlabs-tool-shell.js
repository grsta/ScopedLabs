/*
 * ScopedLabs Tool Shell
 * Version: scopedlabs-tool-shell-008-diagnostics-summary
 *
 * Shared helper foundation for future Tool Shell V1 extraction.
 * Loaded by opted-in tool pages as the safe Tool Shell runtime foundation.
 *
 * Core rule:
 * - Preserve existing IDs, auth/gating, checkout, pipeline, export, snapshot, and KB behavior.
 * - Do not alter calculations.
 * - Helpers should enhance existing shell structure only after a page explicitly opts in.
 */

(function attachScopedLabsToolShell(root) {
  "use strict";

  const VERSION = "scopedlabs-tool-shell-008-diagnostics-summary";

  function toArray(value) {
    return Array.prototype.slice.call(value || []);
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $all(selector, scope) {
    return toArray((scope || document).querySelectorAll(selector));
  }

  function getDatasetValue(element, key) {
    if (!element || !element.dataset) return "";
    return element.dataset[key] || "";
  }

  function getPageCategory() {
    return document.body ? getDatasetValue(document.body, "category") : "";
  }

  function getPageTier() {
    return document.body ? getDatasetValue(document.body, "tier") : "";
  }

  function normalizeSlug(value) {
    return String(value || "")
      .trim()
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean)
      .pop() || "";
  }

  function getCurrentToolSlug() {
    const explicit = document.body ? getDatasetValue(document.body, "tool") : "";
    if (explicit) return normalizeSlug(explicit);

    const parts = window.location.pathname
      .split("/")
      .filter(Boolean);

    const toolsIndex = parts.indexOf("tools");
    if (toolsIndex >= 0 && parts[toolsIndex + 2]) {
      return normalizeSlug(parts[toolsIndex + 2]);
    }

    return normalizeSlug(window.location.pathname);
  }

  function getRegistryForCategory(category) {
    if (category === "physical-security" && root.ScopedLabsPhysicalSecurityToolRegistry) {
      return root.ScopedLabsPhysicalSecurityToolRegistry;
    }
    return null;
  }

  function getCurrentToolRecord() {
    const category = getPageCategory();
    const slug = getCurrentToolSlug();
    const registry = getRegistryForCategory(category);

    if (!registry || typeof registry.getTool !== "function") {
      return null;
    }

    return registry.getTool(slug);
  }

  function markRequiredIdDiagnostics(requiredIds) {
    const ids = toArray(requiredIds);
    const missing = ids.filter((id) => !document.getElementById(id));

    if (missing.length && root.console && typeof root.console.warn === "function") {
      root.console.warn("[ScopedLabsToolShell] Missing required IDs:", missing.join(", "));
    }

    return {
      ok: missing.length === 0,
      missing
    };
  }

  function getBackContinueState(scope) {
    const rootEl = scope || document;
    const continueButton = $("#continue", rootEl);
    const nextStepRow = $("#next-step-row", rootEl);
    const backLink = $all("a", rootEl).find((link) => /Back to/i.test(link.textContent || ""));

    return {
      backLink,
      continueButton,
      nextStepRow,
      ok: !!backLink && !!continueButton && !!nextStepRow
    };
  }

  function addShellButtonClasses(scope, options) {
    const rootEl = scope || document;
    const opts = options || {};
    const className = opts.className || "sl-shell-btn";
    const primaryClassName = opts.primaryClassName || "sl-shell-btn-primary";

    const state = getBackContinueState(rootEl);

    if (state.backLink) {
      state.backLink.classList.add(className);
    }

    if (state.continueButton) {
      state.continueButton.classList.add(className, primaryClassName);
    }

    return state;
  }

  function requiredIdsForTool(tool) {
    const role = tool && tool.role;

    if (role === "pipeline-entry") {
      return [
        "pipeline",
        "toolCard",
        "continue",
        "next-step-row"
      ];
    }

    return [
      "pipeline",
      "toolCard",
      "results",
      "continue",
      "next-step-row"
    ];
  }

  function applyBackContinueShell(options) {
    const opts = options || {};
    const rootEl = opts.scope || document;
    const row = opts.rowId ? document.getElementById(opts.rowId) : null;
    const targetScope = row || rootEl;
    const state = getBackContinueState(targetScope);
    const targetRow = row || (state.nextStepRow ? state.nextStepRow.parentElement : null);

    if (targetRow) {
      targetRow.dataset.slShellBackContinue = "true";
      targetRow.dataset.slShellVersion = VERSION;
      targetRow.classList.add("sl-shell-back-continue-row");
    }

    if (state.backLink) {
      state.backLink.dataset.slShellAction = "back";
      state.backLink.classList.add("sl-shell-action", "sl-shell-action-back");
    }

    if (state.nextStepRow) {
      state.nextStepRow.dataset.slShellSlot = "continue";
      state.nextStepRow.classList.add("sl-shell-continue-slot");
    }

    if (state.continueButton) {
      state.continueButton.dataset.slShellAction = "continue";
      state.continueButton.classList.add("sl-shell-action", "sl-shell-action-continue");
    }

    return {
      ok: state.ok,
      row: targetRow,
      backLink: state.backLink,
      continueButton: state.continueButton,
      nextStepRow: state.nextStepRow
    };
  }



  // data-scopedlabs-tool-shell-actionable-diagnostics-001
  let lastDiagnosticsResult = null;

  const DIAGNOSTIC_GUIDE = Object.freeze({
    "SL-SHELL-DOCUMENT-UNAVAILABLE": {
      severity: "fail",
      suggestedFix: "Run diagnostics after the document has loaded."
    },
    "SL-SHELL-REQUIRED-ID-MISSING": {
      severity: "watch",
      suggestedFix: "Restore the required page ID. Do not rename pipeline/export/auth anchors without updating the registry and audits."
    },
    "SL-ASSISTANT-TEXT-MISSING": {
      severity: "watch",
      suggestedFix: "Restore assistant/help text or update the assistant-shell expectation if this page intentionally has no assistant content."
    },
    "SL-ASSISTANT-RESULTS-ANCHOR-MISSING": {
      severity: "watch",
      suggestedFix: "Restore #results so analyzer/export/report behavior has a stable output anchor."
    },
    "SL-ASSISTANT-ANALYSIS-ANCHOR-MISSING": {
      severity: "watch",
      suggestedFix: "Restore #analysis-copy or #analysis so assistant interpretation can be detected safely."
    },
    "SL-ASSISTANT-LIVE-VISUAL-MISSING": {
      severity: "watch",
      suggestedFix: "Restore the expected live visual mount or update the assistant shell expectation."
    },
    "SL-ASSISTANT-GUIDED-PRESET-MISSING": {
      severity: "watch",
      suggestedFix: "Restore the expected guided preset select element, or update the input preset/assistant expectation."
    },
    "SL-ASSISTANT-DUPLICATE-STATUS": {
      severity: "watch",
      suggestedFix: "Keep one visible Assistant Status chip. Remove duplicated presentation text without removing underlying analyzer/source status data."
    }
  });

  function toolFileHint(slug, fileName) {
    const cleanSlug = slug || getCurrentToolSlug() || "unknown-tool";
    return "tools/" + (getPageCategory() || "physical-security") + "/" + cleanSlug + "/" + (fileName || "index.html");
  }

  function makeDiagnosticIssue(code, message, detail) {
    const guide = DIAGNOSTIC_GUIDE[code] || {};
    const info = detail && typeof detail === "object" ? detail : {};

    return {
      code,
      severity: info.severity || guide.severity || "watch",
      message: message || code,
      tool: info.tool || getCurrentToolSlug(),
      category: info.category || getPageCategory(),
      fileHint: info.fileHint || toolFileHint(info.tool || getCurrentToolSlug(), info.fileName || "index.html"),
      expected: info.expected || "",
      actual: info.actual || "",
      module: info.module || "tool-shell-runtime",
      suggestedFix: info.suggestedFix || guide.suggestedFix || "Review the matching audit module and restore the expected shell signal.",
      safeAutoFix: info.safeAutoFix === true
    };
  }

  function issueMessages(issueDetails) {
    return (Array.isArray(issueDetails) ? issueDetails : []).map((issue) => {
      return issue && issue.message ? issue.message : String(issue || "");
    });
  }

  function cloneDiagnosticResult(value) {
    if (!value || typeof value !== "object") return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function rememberDiagnostics(result) {
    lastDiagnosticsResult = cloneDiagnosticResult(result);
    return result;
  }


  // data-scopedlabs-tool-shell-diagnostics-summary-001
  function normalizeDiagnosticIssue(issue, source) {
    if (!issue || typeof issue !== "object") {
      return {
        code: "SL-DIAGNOSTIC-UNSTRUCTURED-ISSUE",
        severity: "watch",
        message: String(issue || "Unstructured diagnostic issue"),
        tool: getCurrentToolSlug(),
        category: getPageCategory(),
        fileHint: toolFileHint(getCurrentToolSlug(), "index.html"),
        expected: "",
        actual: "",
        module: source || "tool-shell-runtime",
        suggestedFix: "Review the raw diagnostics output and convert this issue into a structured diagnostic.",
        safeAutoFix: false
      };
    }

    return {
      code: issue.code || "SL-DIAGNOSTIC-UNSTRUCTURED-ISSUE",
      severity: issue.severity || "watch",
      message: issue.message || issue.code || "Diagnostic issue",
      tool: issue.tool || getCurrentToolSlug(),
      category: issue.category || getPageCategory(),
      fileHint: issue.fileHint || toolFileHint(issue.tool || getCurrentToolSlug(), "index.html"),
      expected: issue.expected || "",
      actual: issue.actual || "",
      module: issue.module || source || "tool-shell-runtime",
      suggestedFix: issue.suggestedFix || "Review the matching audit module and restore the expected shell signal.",
      safeAutoFix: issue.safeAutoFix === true
    };
  }

  function collectDiagnosticIssues(result) {
    const current = result && typeof result === "object" ? result : getLastDiagnostics();
    const collected = [];

    if (!current || typeof current !== "object") {
      return collected;
    }

    if (Array.isArray(current.issueDetails)) {
      current.issueDetails.forEach((issue) => {
        collected.push(normalizeDiagnosticIssue(issue, "tool-shell-runtime"));
      });
    }

    if (current.assistantShell && Array.isArray(current.assistantShell.issueDetails)) {
      current.assistantShell.issueDetails.forEach((issue) => {
        collected.push(normalizeDiagnosticIssue(issue, "assistant-shell-runtime"));
      });
    }

    const knownMessages = new Set(collected.map((issue) => issue.message));

    if (Array.isArray(current.issues)) {
      current.issues.forEach((message) => {
        if (!knownMessages.has(message)) {
          const normalized = normalizeDiagnosticIssue(message, "tool-shell-runtime");
          collected.push(normalized);
          knownMessages.add(normalized.message);
        }
      });
    }

    if (current.assistantShell && Array.isArray(current.assistantShell.issues)) {
      current.assistantShell.issues.forEach((message) => {
        if (!knownMessages.has(message)) {
          const normalized = normalizeDiagnosticIssue(message, "assistant-shell-runtime");
          collected.push(normalized);
          knownMessages.add(normalized.message);
        }
      });
    }

    return collected;
  }

  function explainDiagnostics(result) {
    const current = result && typeof result === "object" ? result : getLastDiagnostics();

    if (!current || typeof current !== "object") {
      return {
        ok: false,
        summary: "No diagnostics have been run yet.",
        shellVersion: VERSION,
        category: getPageCategory(),
        tool: getCurrentToolSlug(),
        issueCount: 0,
        issues: [],
        nextStep: "Run ScopedLabsToolShell.runDiagnostics({ includeAssistantShell: true, silent: true }) first."
      };
    }

    const issues = collectDiagnosticIssues(current);
    const issueCount = issues.length;
    const ok = current.ok !== false && (!current.assistantShell || current.assistantShell.ok !== false) && issueCount === 0;

    return {
      ok,
      summary: ok
        ? "No Tool Shell issues detected."
        : issueCount + " Tool Shell diagnostic issue" + (issueCount === 1 ? "" : "s") + " need review.",
      shellVersion: current.shellVersion || VERSION,
      category: current.category || getPageCategory(),
      tool: current.slug || current.tool || getCurrentToolSlug(),
      role: current.role || "",
      issueCount,
      issues,
      nextStep: ok
        ? "No action needed."
        : "Start with the first issue. Use fileHint and suggestedFix before making any page changes."
    };
  }

  function explainLastDiagnostics() {
    return explainDiagnostics(getLastDiagnostics());
  }


  function getLastDiagnostics() {
    return cloneDiagnosticResult(lastDiagnosticsResult);
  }

  function getDiagnosticGuide() {
    return DIAGNOSTIC_GUIDE;
  }


  // data-scopedlabs-tool-shell-assistant-diagnostics-001
  const ASSISTANT_SHELL_EXPECTATIONS = {
    "area-planner": {
      mode: "not-required"
    },
    "scene-illumination": {
      mode: "specialist-visual",
      liveVisualRequired: true,
      liveVisualIds: ["sceneIlluminationLiveVisual", "sceneLiveVisual", "illuminationLiveVisual"],
      renderer: "scene-illumination-lighting-plan"
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
      liveVisualRequired: true,
      liveVisualIds: ["faceRecognitionLiveVisual"],
      presetIds: ["resPreset", "hfovPreset", "ppfPreset"],
      renderer: "face-recognition-range-plan"
    },
    "license-plate-range": {
      mode: "specialist-visual",
      liveVisualRequired: true,
      liveVisualIds: ["licensePlateLiveVisual"],
      presetIds: ["resPreset", "hfovPreset", "pppPreset", "pwPreset"],
      renderer: "license-plate-range-plan"
    }
  };

  function shellSafeQuery(doc, selector) {
    try {
      return !!(doc && typeof doc.querySelector === "function" && doc.querySelector(selector));
    } catch (error) {
      return false;
    }
  }

  function shellHasId(doc, id) {
    return !!(doc && id && typeof doc.getElementById === "function" && doc.getElementById(id));
  }

  function shellHasAnyId(doc, ids) {
    return (Array.isArray(ids) ? ids : []).some((id) => shellHasId(doc, id));
  }

  function shellMissingIds(doc, ids) {
    return (Array.isArray(ids) ? ids : []).filter((id) => !shellHasId(doc, id));
  }

  function shellTextCount(text, phrase) {
    const haystack = String(text || "");
    const needle = String(phrase || "");
    if (!needle) return 0;

    let count = 0;
    let index = haystack.toLowerCase().indexOf(needle.toLowerCase());

    while (index !== -1) {
      count += 1;
      index = haystack.toLowerCase().indexOf(needle.toLowerCase(), index + needle.length);
    }

    return count;
  }

  function describeAssistantShell(options) {
    const opts = options || {};
    const doc = opts.document || root.document;

    if (!doc || !doc.body) {
      const issueDetails = [
        makeDiagnosticIssue("SL-SHELL-DOCUMENT-UNAVAILABLE", "document unavailable", {
          tool: getCurrentToolSlug(),
          fileHint: toolFileHint(getCurrentToolSlug(), "index.html"),
          expected: "document.body",
          actual: "missing"
        })
      ];

      return rememberDiagnostics({
        shellVersion: VERSION,
        ok: false,
        issues: issueMessages(issueDetails),
        issueDetails,
        signals: {},
        expected: {},
        counts: {}
      });
    }

    const page = describePage();
    const slug = opts.slug || page.slug || getCurrentToolSlug();
    const expectation = ASSISTANT_SHELL_EXPECTATIONS[slug] || { mode: "standard" };
    const bodyText = String(doc.body.textContent || "");

    const requiredIds = requiredIdsForTool(page.tool || null);
    const missingRequiredIds = requiredIds.filter((id) => !shellHasId(doc, id));

    const assistantStatusCount = shellTextCount(bodyText, "Assistant Status");
    const liveVisualIds = expectation.liveVisualIds || [];
    const presetIds = expectation.presetIds || [];

    const liveVisualPresent = liveVisualIds.length
      ? shellHasAnyId(doc, liveVisualIds)
      : shellSafeQuery(doc, '[id*="LiveVisual"], [id*="liveVisual"], [data-assistant-visual], [data-report-renderer]');

    const presetsPresent = presetIds.length
      ? shellMissingIds(doc, presetIds).length === 0
      : shellSafeQuery(doc, 'select[id$="Preset"], .face-guided-preset, .plate-guided-preset');

    const rendererSignal = expectation.renderer
      ? bodyText.includes(expectation.renderer) ||
        shellSafeQuery(doc, '[data-sl-renderer="' + expectation.renderer + '"], [data-report-renderer="' + expectation.renderer + '"]')
      : false;

    const exportVisualSignal =
      shellSafeQuery(doc, "[data-export-svg], [data-export-section], [data-report-renderer], [data-suppress-legacy-chart-export]") ||
      !!root.ScopedLabsAssistantExport;

    const sourceIntegritySignal =
      shellHasId(doc, "flow-note") ||
      !!root.ScopedLabsPhysicalSecurityAreaState ||
      bodyText.indexOf("Imported Assumptions") !== -1 ||
      bodyText.indexOf("Area Context") !== -1 ||
      bodyText.indexOf("Planning Context") !== -1;

    const signals = {
      assistantText: /assistant/i.test(bodyText),
      resultsAnchor: shellHasId(doc, "results"),
      analysisAnchor: shellHasId(doc, "analysis-copy") || shellHasId(doc, "analysis"),
      flowAnchor: shellHasId(doc, "flow-note"),
      liveVisual: liveVisualPresent,
      renderer: rendererSignal,
      exportVisual: exportVisualSignal,
      presets: presetsPresent,
      sourceIntegrity: sourceIntegritySignal,
      duplicateAssistantStatus: assistantStatusCount > 1,
      requiredIdsPresent: missingRequiredIds.length === 0
    };

    const issues = [];
    const issueDetails = [];

    function addAssistantIssue(code, message, detail) {
      const issue = makeDiagnosticIssue(code, message, Object.assign({
        tool: slug,
        category: page.category,
        fileHint: toolFileHint(slug, "index.html"),
        module: "assistant-shell-runtime"
      }, detail || {}));

      issueDetails.push(issue);
      issues.push(issue.message);
    }

    if (expectation.mode !== "not-required" && !signals.assistantText) {
      addAssistantIssue("SL-ASSISTANT-TEXT-MISSING", "assistant text not detected", {
        expected: "assistant text",
        actual: "missing"
      });
    }

    if (expectation.mode !== "not-required" && !signals.resultsAnchor) {
      addAssistantIssue("SL-ASSISTANT-RESULTS-ANCHOR-MISSING", "#results anchor missing", {
        expected: "#results",
        actual: "missing"
      });
    }

    if (expectation.mode !== "not-required" && !signals.analysisAnchor) {
      addAssistantIssue("SL-ASSISTANT-ANALYSIS-ANCHOR-MISSING", "analysis anchor missing", {
        expected: "#analysis-copy or #analysis",
        actual: "missing"
      });
    }

    if (expectation.liveVisualRequired && !signals.liveVisual) {
      addAssistantIssue("SL-ASSISTANT-LIVE-VISUAL-MISSING", "live visual mount missing", {
        expected: liveVisualIds.join(",") || "live visual mount",
        actual: "missing"
      });
    }

    const missingPresets = shellMissingIds(doc, presetIds);
    if (presetIds.length && missingPresets.length) {
      addAssistantIssue("SL-ASSISTANT-GUIDED-PRESET-MISSING", "guided presets missing: " + missingPresets.join(","), {
        expected: presetIds.join(","),
        actual: "missing: " + missingPresets.join(",")
      });
    }

    if (signals.duplicateAssistantStatus) {
      addAssistantIssue("SL-ASSISTANT-DUPLICATE-STATUS", "possible duplicate Assistant Status text", {
        expected: "one visible Assistant Status text",
        actual: String(assistantStatusCount)
      });
    }

    if (missingRequiredIds.length) {
      addAssistantIssue("SL-SHELL-REQUIRED-ID-MISSING", "required IDs missing: " + missingRequiredIds.join(","), {
        expected: requiredIds.join(","),
        actual: "missing: " + missingRequiredIds.join(",")
      });
    }

    return {
      shellVersion: VERSION,
      category: page.category,
      tier: page.tier,
      slug,
      role: page.tool ? page.tool.role : "",
      mode: expectation.mode,
      ok: issues.length === 0,
      issues,
      signals,
      expected: {
        renderer: expectation.renderer || "",
        liveVisualIds,
        presetIds,
        requiredIds
      },
      counts: {
        assistantStatus: assistantStatusCount,
        missingRequiredIds: missingRequiredIds.length
      }
    };
  }


  function buildDiagnosticResult() {
    const page = describePage();
    const tool = page.tool || null;

    const checks = {
      registryLoaded: !!getRegistryForCategory(page.category),
      toolRecordFound: !!tool,
      requiredIdsOk: !!(page.requiredIds && page.requiredIds.ok),
      backContinueOk: !!(page.backContinue && page.backContinue.ok)
    };

    const issues = [];

    if (!checks.registryLoaded) {
      issues.push("registry-not-loaded");
    }

    if (!checks.toolRecordFound) {
      issues.push("tool-record-not-found");
    }

    if (!checks.requiredIdsOk) {
      const missing = page.requiredIds && page.requiredIds.missing ? page.requiredIds.missing : [];
      issues.push("missing-required-ids:" + missing.join(","));
    }

    if (!checks.backContinueOk) {
      issues.push("back-continue-not-ready");
    }

    return {
      shellVersion: VERSION,
      category: page.category,
      slug: page.slug,
      role: tool ? tool.role : "",
      title: tool ? tool.title : "",
      checks,
      issues,
      ok: issues.length === 0,
      page
    };
  }

  function runDiagnostics(options) {
    const opts = options || {};
    const result = buildDiagnosticResult();

    if (opts.includeAssistantShell && typeof describeAssistantShell === "function") {
      const assistantShell = describeAssistantShell({
        slug: result.slug
      });

      result.assistantShell = assistantShell;

      if (assistantShell && assistantShell.ok === false) {
        result.ok = false;
        result.issues = (Array.isArray(result.issues) ? result.issues : []).concat(
          (Array.isArray(assistantShell.issues) ? assistantShell.issues : []).map((issue) => "assistant-shell: " + issue)
        );
      }
    }

    if (!opts.silent && root.console) {
      const label = "[ScopedLabsToolShell] " + result.slug + " diagnostics";
      if (result.ok && typeof root.console.info === "function") {
        root.console.info(label, "PASS", result);
      } else if (!result.ok && typeof root.console.warn === "function") {
        root.console.warn(label, "WATCH", result);
      }
    }

    return rememberDiagnostics(result);
  }

  function describePage() {
    const tool = getCurrentToolRecord();
    const requiredIds = requiredIdsForTool(tool);

    return {
      shellVersion: VERSION,
      category: getPageCategory(),
      tier: getPageTier(),
      slug: getCurrentToolSlug(),
      tool,
      requiredIdList: requiredIds.slice(),
      requiredIds: markRequiredIdDiagnostics(requiredIds),
      backContinue: getBackContinueState(document)
    };
  }

  const api = Object.freeze({
    version: VERSION,
    getPageCategory,
    getPageTier,
    getCurrentToolSlug,
    getRegistryForCategory,
    getCurrentToolRecord,
    requiredIdsForTool,
    markRequiredIdDiagnostics,
    getBackContinueState,
    addShellButtonClasses,
    applyBackContinueShell,
    buildDiagnosticResult,
    runDiagnostics,
    describeAssistantShell,
    getLastDiagnostics,
    getDiagnosticGuide,
    explainDiagnostics,
    explainLastDiagnostics,
    describePage
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.ScopedLabsToolShell = api;
})(typeof window !== "undefined" ? window : globalThis);
