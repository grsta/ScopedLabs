(function () {
  "use strict";

  const VERSION = "physical-security-category-guidance-renderer-002-summary-master-polish";
  const CATEGORY = "physical-security";

  function clone(value) {
    if (value == null) return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeStatus(status) {
    const value = String(status || "").toLowerCase();

    if (value.includes("risk") || value.includes("fail") || value.includes("blocked")) return "risk";
    if (value.includes("watch") || value.includes("warning") || value.includes("caution")) return "watch";
    if (value.includes("healthy") || value.includes("safe") || value.includes("ok")) return "healthy";

    return "unknown";
  }

  function statusLabel(status) {
    const key = normalizeStatus(status);

    if (key === "risk") return "Risk";
    if (key === "watch") return "Watch";
    if (key === "healthy") return "Healthy";

    return "Not Generated";
  }

  function statusClass(status) {
    return "sl-ps-category-guidance--" + normalizeStatus(status);
  }

  function getCategoryGuidanceApi() {
    return window.ScopedLabsPhysicalSecurityCategoryGuidance || null;
  }

  function currentExplanation() {
    const api = getCategoryGuidanceApi();

    if (!api || typeof api.explainCurrentGuidance !== "function") {
      return {
        ok: false,
        status: "unknown",
        action: "Physical Security Category Guidance Not Loaded",
        reason: "The category guidance master is not available on this page.",
        expected: "0 generated tool guidance results",
        nextStep: "Verify category guidance script wiring.",
        counts: {
          generated: 0,
          tracked: 0,
          healthy: 0,
          watch: 0,
          risk: 0,
          unknown: 0
        },
        priorityTool: null,
        knowledge: {
          knowledgeLoaded: false,
          sourcePolicyLoaded: false,
          runtimeFetchAllowed: false
        },
        reportSummary: "Physical Security category guidance is not loaded."
      };
    }

    return api.explainCurrentGuidance();
  }

  function createRenderModel(input) {
    const explanation = input && input.guidance ? input : (input || currentExplanation());
    const counts = explanation.counts || {};
    const knowledge = explanation.knowledge || {};
    const priorityTool = explanation.priorityTool || null;

    const status = normalizeStatus(explanation.status);

    return {
      version: VERSION,
      category: CATEGORY,
      ok: !!explanation.ok,
      status,
      statusLabel: statusLabel(status),
      statusClass: statusClass(status),
      action: explanation.action || "Run Physical Security Guidance",
      reason: explanation.reason || "No generated category guidance is available yet.",
      expected: explanation.expected || "",
      nextStep: explanation.nextStep || "Run one or more Physical Security tool calculations.",
      reportSummary: explanation.reportSummary || "",
      counts: {
        generated: Number(counts.generated || 0),
        tracked: Number(counts.tracked || 0),
        healthy: Number(counts.healthy || 0),
        watch: Number(counts.watch || 0),
        risk: Number(counts.risk || 0),
        unknown: Number(counts.unknown || 0)
      },
      priorityTool: priorityTool ? {
        slug: priorityTool.slug || "",
        label: priorityTool.label || "",
        action: priorityTool.action || "",
        reason: priorityTool.reason || "",
        nextStep: priorityTool.nextStep || ""
      } : null,
      knowledge: {
        knowledgeLoaded: !!knowledge.knowledgeLoaded,
        knowledgeVersion: knowledge.knowledgeVersion || "",
        sourcePolicyLoaded: !!knowledge.sourcePolicyLoaded,
        sourcePolicyVersion: knowledge.sourcePolicyVersion || "",
        runtimeFetchAllowed: !!knowledge.runtimeFetchAllowed,
        externalSourceRule: knowledge.externalSourceRule || ""
      },
      sourceTopics: clone(explanation.sourceTopics || {}),
      raw: clone(explanation)
    };
  }

  function metric(label, value) {
    return [
      '<div class="sl-ps-category-guidance__metric">',
      '<span class="sl-ps-category-guidance__metric-label">' + escapeHtml(label) + '</span>',
      '<strong class="sl-ps-category-guidance__metric-value">' + escapeHtml(value) + '</strong>',
      '</div>'
    ].join("");
  }

  function renderPriority(model) {
    if (!model.priorityTool) {
      return [
        '<div class="sl-ps-category-guidance__priority">',
        '<span class="sl-ps-category-guidance__priority-label">Priority Tool</span>',
        '<strong>None yet</strong>',
        '<p>Run one or more Physical Security tools to generate category-level priority guidance.</p>',
        '</div>'
      ].join("");
    }

    return [
      '<div class="sl-ps-category-guidance__priority">',
      '<span class="sl-ps-category-guidance__priority-label">Priority Tool</span>',
      '<strong>' + escapeHtml(model.priorityTool.label || model.priorityTool.slug) + '</strong>',
      model.priorityTool.action ? '<p>' + escapeHtml(model.priorityTool.action) + '</p>' : "",
      '</div>'
    ].join("");
  }

  function renderKnowledgeState(model) {
    const parts = [];

    parts.push(model.knowledge.knowledgeLoaded ? "Knowledge core loaded" : "Knowledge core not loaded");
    parts.push(model.knowledge.sourcePolicyLoaded ? "Source policy loaded" : "Source policy not loaded");
    parts.push(model.knowledge.runtimeFetchAllowed ? "Runtime fetch enabled" : "Runtime fetch blocked");

    return [
      '<div class="sl-ps-category-guidance__knowledge">',
      '<span class="sl-ps-category-guidance__knowledge-label">Knowledge State</span>',
      '<p>' + escapeHtml(parts.join(" | ")) + '</p>',
      model.knowledge.externalSourceRule
        ? '<small>' + escapeHtml(model.knowledge.externalSourceRule) + '</small>'
        : "",
      '</div>'
    ].join("");
  }

  function renderSummaryHtml(input, options) {
    const model = input && input.version === VERSION ? input : createRenderModel(input);
    const opts = options || {};
    const title = opts.title || "Physical Security Category Guidance";
    const kicker = opts.kicker || "Category Guidance";
    const subtitle = opts.subtitle || "";

    return [
      '<section class="sl-ps-category-guidance ' + escapeHtml(model.statusClass) + '" data-sl-category-guidance-version="' + escapeHtml(VERSION) + '">',
      '<div class="sl-ps-category-guidance__header">',
      '<div>',
      '<span class="sl-ps-category-guidance__kicker">' + escapeHtml(kicker) + '</span>',
      '<h2>' + escapeHtml(title) + '</h2>',
      subtitle ? '<p class="sl-ps-category-guidance__subtitle">' + escapeHtml(subtitle) + '</p>' : "",
      '</div>',
      '<span class="sl-ps-category-guidance__status">' + escapeHtml(model.statusLabel) + '</span>',
      '</div>',

      '<div class="sl-ps-category-guidance__body">',
      '<div class="sl-ps-category-guidance__recommendation">',
      '<h3>' + escapeHtml(model.action) + '</h3>',
      '<p>' + escapeHtml(model.reason) + '</p>',
      model.expected ? '<small>Expected result: ' + escapeHtml(model.expected) + '</small>' : "",
      '</div>',

      '<div class="sl-ps-category-guidance__metrics">',
      metric("Generated", model.counts.generated + " / " + model.counts.tracked),
      metric("Healthy", model.counts.healthy),
      metric("Watch", model.counts.watch),
      metric("Risk", model.counts.risk),
      '</div>',

      renderPriority(model),

      '<div class="sl-ps-category-guidance__next">',
      '<span class="sl-ps-category-guidance__next-label">Next Step</span>',
      '<p>' + escapeHtml(model.nextStep) + '</p>',
      '</div>',

      renderKnowledgeState(model),

      '</div>',
      '</section>'
    ].join("");
  }

  function renderReportText(input) {
    const model = input && input.version === VERSION ? input : createRenderModel(input);

    return [
      "Physical Security Category Guidance",
      "Status: " + model.statusLabel,
      "Recommended action: " + model.action,
      "Reason: " + model.reason,
      "Expected result: " + model.expected,
      "Next step: " + model.nextStep,
      "Generated guidance: " + model.counts.generated + " / " + model.counts.tracked,
      "Healthy: " + model.counts.healthy,
      "Watch: " + model.counts.watch,
      "Risk: " + model.counts.risk,
      "Knowledge: " + (model.knowledge.knowledgeLoaded ? "loaded" : "not loaded"),
      "Source policy: " + (model.knowledge.sourcePolicyLoaded ? "loaded" : "not loaded"),
      "Runtime web fetch: " + (model.knowledge.runtimeFetchAllowed ? "enabled" : "blocked"),
      model.reportSummary ? "Report summary: " + model.reportSummary : ""
    ].filter(Boolean).join("\n");
  }

  function mount(container, input, options) {
    const target = typeof container === "string" ? document.querySelector(container) : container;

    if (!target) {
      return {
        ok: false,
        reason: "Category guidance mount target was not found.",
        version: VERSION
      };
    }

    const model = createRenderModel(input);
    target.innerHTML = renderSummaryHtml(model, options);

    return {
      ok: true,
      version: VERSION,
      status: model.status,
      counts: clone(model.counts)
    };
  }

  window.ScopedLabsPhysicalSecurityCategoryGuidanceRenderer = Object.freeze({
    version: VERSION,
    category: CATEGORY,
    createRenderModel,
    renderSummaryHtml,
    renderReportText,
    mount
  });
})();