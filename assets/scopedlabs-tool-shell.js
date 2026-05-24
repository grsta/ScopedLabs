/*
 * ScopedLabs Tool Shell
 * Version: scopedlabs-tool-shell-004-back-continue-proof
 *
 * Shared helper foundation for future Tool Shell V1 extraction.
 * This file is not loaded by live pages yet.
 *
 * Core rule:
 * - Preserve existing IDs, auth/gating, checkout, pipeline, export, snapshot, and KB behavior.
 * - Do not alter calculations.
 * - Helpers should enhance existing shell structure only after a page explicitly opts in.
 */

(function attachScopedLabsToolShell(root) {
  "use strict";

  const VERSION = "scopedlabs-tool-shell-004-back-continue-proof";

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

    if (!opts.silent && root.console) {
      const label = "[ScopedLabsToolShell] " + result.slug + " diagnostics";
      if (result.ok && typeof root.console.info === "function") {
        root.console.info(label, "PASS", result);
      } else if (!result.ok && typeof root.console.warn === "function") {
        root.console.warn(label, "WATCH", result);
      }
    }

    return result;
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
    describePage
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.ScopedLabsToolShell = api;
})(typeof window !== "undefined" ? window : globalThis);
