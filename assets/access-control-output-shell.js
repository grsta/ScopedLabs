(function () {
  "use strict";

  const VERSION = "access-control-output-shell-003-export-popup-visual-autobind";
  const ASSISTANT_PROOF_OUTPUT_CONTRACT = Object.freeze({
    name: "access-control-assistant-proof-output-contract",
    pattern: "access-control-assistant-proof-visual-pattern",
    requiredExportSection: "Recommendation References",
    requiredColumns: Object.freeze(["Marker", "Reference", "Reason"]),
    statusSplit: Object.freeze({
      localDecisionStatus: "tool-owned",
      carriedReviewFlag: "scope-owned",
      overwriteAllowed: false
    })
  });

  const CONTRACT = Object.freeze({
    marker: "ACCESS_CONTROL_OUTPUT_SHELL_CONTRACT_001",
    role: "assistant-owned-output-visual-export-handoff",
    category: "access-control",
    currentProofTool: "lock-power-budget",
    requiredMethods: Object.freeze(["register", "getChartImage", "attachExportGetter", "ensureExportVisualBinding", "showVisual", "hideVisual"]),
    outputPattern: Object.freeze({
      visibleDecisionLayer: "assistant-shell",
      visibleEngineeringLayer: "cad-visual",
      hiddenDataLayer: "result-ledger",
      exportHandoff: "chart-image-getter"
    }),
    assistantProofPattern: ASSISTANT_PROOF_OUTPUT_CONTRACT,
    futureCoreTargets: Object.freeze(["panel-capacity", "access-level-sizing"])
  });
  const registry = new Map();
  const pendingExportBinds = new Set();

  function resolveEl(ref) {
    if (!ref) return null;
    if (typeof ref === "string") return document.getElementById(ref) || document.querySelector(ref);
    if (ref.nodeType === 1) return ref;
    return null;
  }

  function safeSlug(slug) {
    return String(slug || "").trim();
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = !!hidden;
  }

  function showVisual(options = {}) {
    const card = resolveEl(options.card);
    const wrap = resolveEl(options.wrap);
    const target = resolveEl(options.target);

    if (!target) return false;

    if (options.html !== undefined) {
      target.innerHTML = String(options.html || "");
    }

    setHidden(card, false);
    setHidden(wrap, false);

    return true;
  }

  function hideVisual(options = {}) {
    const card = resolveEl(options.card);
    const wrap = resolveEl(options.wrap);
    const target = resolveEl(options.target);

    if (target) target.innerHTML = "";

    setHidden(wrap, true);
    setHidden(card, true);

    return true;
  }

  function register(toolSlug, options = {}) {
    const slug = safeSlug(toolSlug);
    if (!slug) return false;

    registry.set(slug, {
      getChartImage: typeof options.getChartImage === "function" ? options.getChartImage : null,
      getVisualHtml: typeof options.getVisualHtml === "function" ? options.getVisualHtml : null
    });

    ensureExportVisualBinding(slug);

    return true;
  }

  function getChartImage(toolSlug) {
    const item = registry.get(safeSlug(toolSlug));
    if (!item || typeof item.getChartImage !== "function") return "";

    try {
      return item.getChartImage() || "";
    } catch (err) {
      console.warn("ScopedLabs Access Control output shell chart image failed:", err);
      return "";
    }
  }

  function normalizeAssistantProofExportReferences(references = []) {
    return (Array.isArray(references) ? references : [])
      .map((item) => ({
        id: String(item?.id || "").trim(),
        label: String(item?.label || "Reference").trim(),
        reason: String(item?.reason || "Review required.").trim(),
        tone: String(item?.tone || "watch").trim()
      }))
      .filter((item) => item.id || item.label || item.reason);
  }

  function buildAssistantProofReferencesSection(references = [], options = {}) {
    const rows = normalizeAssistantProofExportReferences(references).map((item) => [
      item.id || "",
      item.label || "",
      item.reason || ""
    ]);

    return {
      title: options.title || "Recommendation References",
      description: options.description || "Reference markers shown in the Assistant Recommendation visual. These explain why a change, review, or validation step is recommended.",
      tableClass: options.tableClass || "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: ["Marker", "Reference", "Reason"],
          rows: rows.length ? rows : [["", "No references documented", "No assistant proof references were supplied."]]
        }
      ]
    };
  }

  function getAssistantProofOutputContract() {
    return ASSISTANT_PROOF_OUTPUT_CONTRACT;
  }

  // access-control-output-shell-export-popup-visual-autobind-003:
  // Tools may register their visual with the Access Control output shell before
  // the shared export popup reads window.ScopedLabsExportConfig. Bind the shell
  // visual getter into the export config at the category-shell level so tools do
  // not need one-off export plumbing.
  function attachExportGetter(toolSlug, exportConfig) {
    const config = exportConfig || window.ScopedLabsExportConfig;
    const slug = safeSlug(toolSlug);

    if (!config || typeof config !== "object" || !slug) return false;

    const previousGetter = typeof config.getChartImage === "function" ? config.getChartImage : null;

    config.getChartImage = function getAccessControlOutputShellChartImage() {
      const shellImage = getChartImage(slug);
      if (shellImage) return shellImage;

      if (previousGetter) {
        try {
          return previousGetter.call(config) || "";
        } catch (err) {
          console.warn("ScopedLabs Access Control previous export chart getter failed:", err);
        }
      }

      return "";
    };

    config.__accessControlOutputShellVisualBinding = slug;
    config.__accessControlOutputShellVersion = VERSION;

    return true;
  }

  function ensureExportVisualBinding(toolSlug, options = {}) {
    const slug = safeSlug(toolSlug);
    if (!slug) return false;

    if (attachExportGetter(slug, options.exportConfig)) return true;
    if (options.schedule === false) return false;
    if (pendingExportBinds.has(slug)) return false;

    pendingExportBinds.add(slug);

    [0, 50, 250, 1000].forEach((delay) => {
      window.setTimeout(() => {
        if (attachExportGetter(slug, options.exportConfig)) {
          pendingExportBinds.delete(slug);
        }
      }, delay);
    });

    return false;
  }

  window.ScopedLabsAccessControlOutputShell = Object.freeze({
    VERSION,
    CONTRACT,
    ASSISTANT_PROOF_OUTPUT_CONTRACT,
    getAssistantProofOutputContract,
    normalizeAssistantProofExportReferences,
    buildAssistantProofReferencesSection,
    register,
    getChartImage,
    attachExportGetter,
    ensureExportVisualBinding,
    showVisual,
    hideVisual
  });
})();
