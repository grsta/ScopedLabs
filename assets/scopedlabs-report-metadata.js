(function () {
  "use strict";

  const VERSION = "scopedlabs-report-metadata-001";

  const FIELD_DEFS = {
    reportTitle: { id: "reportTitle", label: "Report Title", type: "text", placeholder: "Camera Spacing Planner Assessment" },
    projectName: { id: "projectName", label: "Project Name", type: "text", placeholder: "Project Name" },
    clientName: { id: "clientName", label: "Client Name", type: "text", placeholder: "Client / Site Name" },
    preparedBy: { id: "preparedBy", label: "Prepared By", type: "text", placeholder: "Name or Team" },
    customNotes: {
      id: "customNotes",
      label: "Custom Notes",
      type: "textarea",
      placeholder: "Optional notes, assumptions, workload details, or design caveats to include in the report.",
      full: true
    }
  };

  const DEFAULT_FIELDS = ["reportTitle", "projectName", "clientName", "preparedBy", "customNotes"];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function injectStyles() {
    if (document.getElementById("scopedlabs-report-metadata-styles")) return;

    const style = document.createElement("style");
    style.id = "scopedlabs-report-metadata-styles";
    style.textContent = [
      ".sl-report-meta{margin-top:14px;border:1px solid rgba(226,232,240,.12);border-radius:14px;background:rgba(255,255,255,.035);overflow:hidden;}",
      ".sl-report-meta summary{cursor:pointer;list-style:none;padding:13px 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:rgba(246,255,248,.94);font-weight:850;}",
      ".sl-report-meta summary::-webkit-details-marker{display:none;}",
      ".sl-report-meta summary::after{content:'+';width:24px;height:24px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:rgba(125,255,152,.11);color:rgba(125,255,152,.92);font-weight:950;}",
      ".sl-report-meta[open] summary::after{content:'-';}",
      ".sl-report-meta-copy{margin:-4px 15px 12px;color:rgba(226,232,240,.62);font-size:.92rem;line-height:1.45;}",
      ".sl-report-meta-grid{display:grid;gap:14px;grid-template-columns:repeat(2,minmax(0,1fr));padding:0 15px 15px;}",
      ".sl-report-meta-grid .field.full{grid-column:1 / -1;}",
      "@media (max-width:860px){.sl-report-meta-grid{grid-template-columns:1fr;}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function parseFields(value) {
    const fields = String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return fields.length ? fields : DEFAULT_FIELDS.slice();
  }

  function fieldHtml(key, overrides = {}) {
    const def = { ...(FIELD_DEFS[key] || {}), ...(overrides[key] || {}) };
    if (!def.id || !def.label) return "";

    const fullClass = def.full || def.type === "textarea" ? " full" : "";
    const placeholder = escapeHtml(def.placeholder || "");

    if (def.type === "textarea") {
      return "" +
        '<label class="field' + fullClass + '">' +
          '<span class="label">' + escapeHtml(def.label) + '</span>' +
          '<textarea id="' + escapeHtml(def.id) + '" placeholder="' + placeholder + '"></textarea>' +
        '</label>';
    }

    return "" +
      '<label class="field' + fullClass + '">' +
        '<span class="label">' + escapeHtml(def.label) + '</span>' +
        '<input id="' + escapeHtml(def.id) + '" type="' + escapeHtml(def.type || "text") + '" placeholder="' + placeholder + '" />' +
      '</label>';
  }

  function renderMount(mount, options = {}) {
    if (!mount) return null;

    injectStyles();

    const fields = options.fields || parseFields(mount.dataset.reportFields);
    const title = options.title || mount.dataset.reportTitle || "Report details";
    const copy = options.copy || mount.dataset.reportCopy || "Optional metadata can be included in the generated report. Leave blank to use the default report naming.";
    const collapsed = String(options.collapsed ?? mount.dataset.collapsed ?? "true").toLowerCase() !== "false";
    const overrides = options.fieldOverrides || {};

    const details = document.createElement("details");
    details.className = "sl-report-meta";
    details.dataset.reportMetadataRendered = "true";
    if (!collapsed) details.open = true;

    details.innerHTML = "" +
      '<summary>' + escapeHtml(title) + '</summary>' +
      '<p class="sl-report-meta-copy">' + escapeHtml(copy) + '</p>' +
      '<div class="sl-report-meta-grid">' +
        fields.map((field) => fieldHtml(field, overrides)).join("") +
      '</div>';

    mount.innerHTML = "";
    mount.appendChild(details);
    mount.dataset.reportMetadataReady = "true";

    document.dispatchEvent(new CustomEvent("scopedlabs:report-metadata-ready", {
      detail: { version: VERSION, mount, fields }
    }));

    return details;
  }

  function init(root = document) {
    const mounts = Array.from(root.querySelectorAll("[data-report-metadata]"));
    mounts.forEach((mount) => {
      if (mount.dataset.reportMetadataReady === "true") return;
      renderMount(mount);
    });
  }

  function read(root = document) {
    return {
      reportTitle: root.querySelector("#reportTitle")?.value?.trim() || "",
      projectName: root.querySelector("#projectName")?.value?.trim() || "",
      clientName: root.querySelector("#clientName")?.value?.trim() || "",
      preparedBy: root.querySelector("#preparedBy")?.value?.trim() || "",
      customNotes: root.querySelector("#customNotes")?.value?.trim() || ""
    };
  }

  window.ScopedLabsReportMetadata = {
    version: VERSION,
    fields: FIELD_DEFS,
    init,
    render: renderMount,
    read
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})();

/* data-scopedlabs-report-metadata-title-defaults-v002
   Keeps compact report metadata defaults scoped to the current tool.
   This is intentionally presentation-only: it does not change export, snapshot,
   analyzer, pipeline, auth, checkout, or calculation behavior.
*/
(function () {
  function currentToolAssessmentTitle() {
    var cfg = window.ScopedLabsExportConfig || {};
    var label = String(cfg.toolLabel || "").trim();

    if (!label) {
      var h1 = document.querySelector("h1");
      label = h1 ? String(h1.textContent || "").trim() : "";
    }

    if (!label) label = "ScopedLabs Report";

    return /assessment$/i.test(label) ? label : label + " Assessment";
  }

  function applyReportTitleDefault() {
    var input = document.getElementById("reportTitle");
    if (!input) return;

    var title = currentToolAssessmentTitle();
    var wrongDefault = /Camera\s+Spacing\s+Planner\s+Assessment/i;

    if (!input.placeholder || wrongDefault.test(input.placeholder)) {
      input.placeholder = title;
    }

    if (wrongDefault.test(String(input.value || ""))) {
      input.value = title;
    }

    if (wrongDefault.test(String(input.defaultValue || ""))) {
      input.defaultValue = title;
    }
  }

  function run() {
    applyReportTitleDefault();

    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(applyReportTitleDefault);
    }

    window.setTimeout(applyReportTitleDefault, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();

