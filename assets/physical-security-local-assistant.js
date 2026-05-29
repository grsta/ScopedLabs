/* ScopedLabs Physical Security Local Assistant
   Version: physical-security-local-assistant-001-dormant-foundation
   Purpose: shared local tool assistant model + renderer foundation.
   Notes:
   - Dormant by default.
   - No auto-mount.
   - No runtime fetch.
   - Visible rendering requires an explicit mount call.
*/
(function () {
  "use strict";

  const API_VERSION = "physical-security-local-assistant-001-dormant-foundation";

  function safeText(value) {
    return String(value ?? "");
  }

  function normalizeStatus(status) {
    const value = safeText(status).toUpperCase();
    if (value.includes("RISK")) return "RISK";
    if (value.includes("WATCH")) return "WATCH";
    if (value.includes("HEALTHY") || value.includes("SAFE")) return "HEALTHY";
    return "PENDING";
  }

  function buildModel(input) {
    const data = input || {};
    const status = normalizeStatus(data.status);

    return {
      version: API_VERSION,
      tool: safeText(data.tool || data.slug || "physical-security-tool"),
      title: safeText(data.title || "Design Assistant"),
      status,
      summary: safeText(data.summary || "Run the tool to generate local design guidance."),
      assumptions: Array.isArray(data.assumptions) ? data.assumptions.map(safeText) : [],
      actions: Array.isArray(data.actions) ? data.actions.map(safeText) : [],
      iconKey: safeText(data.iconKey || ""),
      visible: !!data.visible
    };
  }

  function escapeHtml(value) {
    const ui = window.ScopedLabsPhysicalSecurityUiKit;
    if (ui && typeof ui.escapeHtml === "function") return ui.escapeHtml(value);

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderHtml(modelInput) {
    const model = buildModel(modelInput);
    const assumptions = model.assumptions.length
      ? '<ul>' + model.assumptions.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul>'
      : '<p class="muted">No assumptions recorded yet.</p>';

    const actions = model.actions.length
      ? '<ul>' + model.actions.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul>'
      : '<p class="muted">No recommended actions yet.</p>';

    return '' +
      '<section class="card tool-card physical-security-local-assistant-card" data-local-assistant-tool="' + escapeHtml(model.tool) + '">' +
        '<div class="pill-row">' +
          '<span class="pill">Local Design Assistant</span>' +
          '<span class="pill">' + escapeHtml(model.status) + '</span>' +
        '</div>' +
        '<h2 class="h2">' + escapeHtml(model.title) + '</h2>' +
        '<p class="muted">' + escapeHtml(model.summary) + '</p>' +
        '<div class="assistant-grid">' +
          '<div><h3>Assumptions</h3>' + assumptions + '</div>' +
          '<div><h3>Recommended Actions</h3>' + actions + '</div>' +
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

  window.ScopedLabsPhysicalSecurityLocalAssistant = Object.freeze({
    version: API_VERSION,
    buildModel,
    renderHtml,
    mount,
    clear
  });
})();
