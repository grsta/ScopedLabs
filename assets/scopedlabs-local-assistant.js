/* ScopedLabs Local Assistant
   Version: scopedlabs-local-assistant-007-rich-render-polish
   Purpose: generic local tool assistant renderer with the same visible card rhythm used by proven Physical Security local assistants.
   Notes:
   - Dormant by default.
   - No auto-mount.
   - No runtime fetch.
   - Visible rendering requires an explicit mount call.
*/
(function () {
  "use strict";

  const API_VERSION = "scopedlabs-local-assistant-007-rich-render-polish";

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
    const sections = Array.isArray(data.sections)
      ? data.sections.map((section) => {
          return {
            title: safeText(section.title || ""),
            body: safeText(section.body || section.text || ""),
            items: list(section.items)
          };
        }).filter((section) => section.title || section.body || section.items.length)
      : [];

    return {
      version: API_VERSION,
      category: safeText(data.category || ""),
      tool: safeText(data.tool || data.slug || "tool"),
      title: safeText(data.title || "Design Assistant"),
      kicker: safeText(data.kicker || "Local Design Assistant"),
      status: normalizeStatus(data.status),
      summary: safeText(data.summary || "Run the tool to generate local design guidance."),
      assumptionsTitle: safeText(data.assumptionsTitle || "Assumptions"),
      actionsTitle: safeText(data.actionsTitle || "Recommended Actions"),
      assumptions: list(data.assumptions),
      actions: list(data.actions),
      sections,
      hideStandardLists: data.hideStandardLists === true,
      hideHeaderPills: data.hideHeaderPills === true
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

  function renderSections(sections) {
    if (!Array.isArray(sections) || !sections.length) return "";

    return '<div class="assistant-grid assistant-section-grid">' +
      sections.map((section) => {
        const body = section.body
          ? '<p class="muted assistant-section-body">' + escapeHtml(section.body) + '</p>'
          : "";

        const itemsHtml = Array.isArray(section.items) && section.items.length
          ? renderList(section.items, "")
          : "";

        return '<div class="assistant-section-card">' +
          '<h3>' + escapeHtml(section.title || "Guidance") + '</h3>' +
          body +
          itemsHtml +
        '</div>';
      }).join("") +
    '</div>';
  }

  function ensureRichAssistantStyles() {
    if (document.getElementById("scopedlabs-local-assistant-rich-styles")) return;

    const style = document.createElement("style");
    style.id = "scopedlabs-local-assistant-rich-styles";
    style.textContent = `
      .scopedlabs-local-assistant-card--rich {
        border-radius: 18px;
        overflow: hidden;
      }

      .scopedlabs-local-assistant-card--rich > h2 {
        margin-top: 0;
      }

      .scopedlabs-local-assistant-card--rich .assistant-section-grid {
        display: grid;
        gap: 14px;
        margin-top: 18px;
      }

      .scopedlabs-local-assistant-card--rich .assistant-section-card {
        background: rgba(0, 0, 0, 0.12);
        border: 1px solid rgba(120, 255, 120, 0.10);
        border-radius: 14px;
        padding: 14px 16px;
      }

      .scopedlabs-local-assistant-card--rich .assistant-section-card h3 {
        margin: 0 0 10px;
      }

      .scopedlabs-local-assistant-card--rich .assistant-section-body {
        margin: 0;
      }

      .scopedlabs-local-assistant-card--rich .assistant-section-body + ul {
        margin-top: 10px;
      }
    `;

    document.head.appendChild(style);
  }

  function renderHtml(modelInput) {
    const model = buildModel(modelInput);
    ensureRichAssistantStyles();
    const richClass = model.sections && model.sections.length ? " scopedlabs-local-assistant-007-rich-render-polish" : "";
    const pillRow = model.hideHeaderPills
      ? ""
      : '<div class="pill-row">' +
          '<span class="pill pill--free">' + escapeHtml(model.kicker) + '</span>' +
          '<span class="pill pill--status">' + escapeHtml(model.status) + '</span>' +
        '</div>';

    const standardLists = model.hideStandardLists
      ? ""
      : '<div class="assistant-grid">' +
          '<div class="assistant-panel">' +
            '<h3>' + escapeHtml(model.assumptionsTitle) + '</h3>' +
            renderList(model.assumptions, "No assumptions recorded yet.") +
          '</div>' +
          '<div class="assistant-panel">' +
            '<h3>' + escapeHtml(model.actionsTitle) + '</h3>' +
            renderList(model.actions, "Run the tool to generate recommended actions.") +
          '</div>' +
        '</div>';

    return '' +
      '<div class="scopedlabs-local-assistant-007-rich-render-polish' + richClass + '">' +
        pillRow +
        '<h2>' + escapeHtml(model.title) + '</h2>' +
        '<p class="muted">' + escapeHtml(model.summary) + '</p>' +
        renderSections(model.sections) +
        standardLists +
      '</div>';
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
