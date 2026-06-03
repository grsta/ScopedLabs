/* ScopedLabs Local Assistant
   Version: scopedlabs-local-assistant-001-proof
   Purpose: generic local tool assistant renderer. Dormant unless a tool explicitly mounts it.
*/
(function () {
  "use strict";

  const API_VERSION = "scopedlabs-local-assistant-001-proof";

  function safeText(value) {
    return String(value ?? "");
  }

  function normalizeStatus(status) {
    const value = safeText(status).toUpperCase();
    if (value.includes("RISK")) return "RISK";
    if (value.includes("WATCH") || value.includes("WARN")) return "WATCH";
    if (value.includes("HEALTHY") || value.includes("SAFE")) return "HEALTHY";
    return "PENDING";
  }

  function list(value) {
    return Array.isArray(value) ? value.map(safeText).filter(Boolean) : [];
  }

  function buildModel(input) {
    const data = input || {};
    return {
      version: API_VERSION,
      category: safeText(data.category || ""),
      tool: safeText(data.tool || data.slug || "tool"),
      title: safeText(data.title || "Tool Assistant"),
      kicker: safeText(data.kicker || "Local Tool Assistant"),
      status: normalizeStatus(data.status),
      summary: safeText(data.summary || "Run the tool to generate local guidance."),
      assumptionsTitle: safeText(data.assumptionsTitle || "Assumptions Checked"),
      actionsTitle: safeText(data.actionsTitle || "Recommended Actions"),
      assumptions: list(data.assumptions),
      actions: list(data.actions)
    };
  }

  function escapeHtml(value) {
    return safeText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderList(items, emptyText) {
    if (!items.length) return '<p class="muted">' + escapeHtml(emptyText) + '</p>';
    return '<ul>' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul>';
  }

  function renderHtml(modelInput) {
    const model = buildModel(modelInput);
    return '' +
      '<section class="card tool-card scopedlabs-local-assistant-card" data-local-assistant-category="' + escapeHtml(model.category) + '" data-local-assistant-tool="' + escapeHtml(model.tool) + '">' +
        '<div class="scopedlabs-local-assistant-head">' +
          '<span class="scopedlabs-local-assistant-kicker">' + escapeHtml(model.kicker) + '</span>' +
          '<span class="scopedlabs-local-assistant-status" data-status="' + escapeHtml(model.status) + '">' + escapeHtml(model.status) + '</span>' +
        '</div>' +
        '<h2 class="h2">' + escapeHtml(model.title) + '</h2>' +
        '<p class="muted scopedlabs-local-assistant-summary">' + escapeHtml(model.summary) + '</p>' +
        '<div class="scopedlabs-local-assistant-grid">' +
          '<div class="scopedlabs-local-assistant-panel"><h3>' + escapeHtml(model.assumptionsTitle) + '</h3>' + renderList(model.assumptions, "No assumptions recorded yet.") + '</div>' +
          '<div class="scopedlabs-local-assistant-panel"><h3>' + escapeHtml(model.actionsTitle) + '</h3>' + renderList(model.actions, "No recommended actions yet.") + '</div>' +
        '</div>' +
      '</section>';
  }

  function mount(target, modelInput) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return false;
    el.innerHTML = renderHtml(modelInput);
    el.hidden = false;
    return true;
  }

  function clear(target) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return false;
    el.innerHTML = "";
    el.hidden = true;
    return true;
  }

  window.ScopedLabsLocalAssistant = Object.freeze({
    version: API_VERSION,
    buildModel,
    renderHtml,
    mount,
    clear
  });
})();
