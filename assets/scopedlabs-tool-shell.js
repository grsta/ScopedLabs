/*
 * ScopedLabs Tool Shell
 * Version: scopedlabs-tool-shell-001-foundation
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

  const VERSION = "scopedlabs-tool-shell-001-foundation";

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

  function describePage() {
    const tool = getCurrentToolRecord();

    return {
      shellVersion: VERSION,
      category: getPageCategory(),
      tier: getPageTier(),
      slug: getCurrentToolSlug(),
      tool,
      requiredIds: markRequiredIdDiagnostics([
        "pipeline",
        "toolCard",
        "results",
        "continue",
        "next-step-row"
      ]),
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
    markRequiredIdDiagnostics,
    getBackContinueState,
    addShellButtonClasses,
    describePage
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.ScopedLabsToolShell = api;
})(typeof window !== "undefined" ? window : globalThis);
