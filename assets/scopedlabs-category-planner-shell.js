(function () {
  "use strict";

  var VERSION = "scopedlabs-category-planner-shell-001";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function attrs(map) {
    return Object.keys(map || {}).map(function (key) {
      var value = map[key];
      if (value === false || value == null) return "";
      if (value === true) return " " + key;
      return " " + key + '="' + escapeHtml(value) + '"';
    }).join("");
  }

  function injectStyles() {
    if (document.getElementById("scopedlabs-category-planner-shell-styles")) return;

    var style = document.createElement("style");
    style.id = "scopedlabs-category-planner-shell-styles";
    style.textContent = [
      "/* SCOPEDLABS CATEGORY PLANNER SHELL 001 - Access planner visual contract */",
      ".sl-category-planner-shell #lockedCard{display:none!important}",
      ".access-scope-section-title{color:rgba(120,255,120,.86);font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px}",
      ".access-scope-flow-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:rgba(246,255,248,.9);line-height:1.45}",
      ".access-scope-flow-line--ledger{justify-content:space-between;gap:14px;margin-bottom:10px}",
      ".access-scope-flow-arrow{color:rgba(120,255,120,.74);font-weight:900}",
      ".access-scope-flow-step{display:inline-flex;align-items:center;gap:7px}",
      ".access-scope-flow-dot{width:9px;height:9px;border-radius:999px;border:1px solid rgba(120,255,120,.44);background:rgba(120,255,120,.18);box-shadow:0 0 10px rgba(120,255,120,.12)}",
      ".access-scope-flow-dot.is-active{background:#62ff8d;box-shadow:0 0 14px rgba(98,255,141,.55)}",
      ".access-scope-ledger-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}",
      ".access-scope-card{border:1px solid rgba(120,255,120,.16);background:rgba(0,0,0,.16);border-radius:14px;padding:14px}",
      ".access-scope-card.is-active{border-color:rgba(120,255,120,.52);box-shadow:0 0 0 1px rgba(120,255,120,.1) inset}",
      ".access-scope-mini-flow{color:rgba(120,255,120,.84);font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px}",
      ".access-scope-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}",
      ".access-scope-meta-item{border:1px solid rgba(120,255,120,.1);background:rgba(0,0,0,.16);border-radius:10px;padding:8px;color:rgba(246,255,248,.86);font-size:.88rem}",
      ".access-scope-meta-item small{display:block;color:rgba(196,255,214,.58);font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}",
      ".access-scope-metadata-active{margin:10px 0 14px;color:rgba(246,255,248,.78)}",
      ".access-scope-summary-card{background:rgba(0,0,0,.14)}",
      ".access-scope-summary-rollup{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0 18px}",
      ".access-scope-summary-metric{border:1px solid rgba(120,255,120,.14);background:rgba(0,0,0,.18);border-radius:14px;padding:12px;max-width:100%}",
      ".access-scope-summary-label{display:block;color:rgba(196,255,214,.62);font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px}",
      ".access-scope-summary-value{display:block;color:#62ff8d;font-size:1.25rem;font-weight:950}",
      ".access-scope-summary-note{color:rgba(246,255,248,.68);font-size:.86rem;line-height:1.45;margin-top:4px}",
      ".access-scope-warn{border:1px solid rgba(255,210,80,.32);background:rgba(255,210,80,.08);border-radius:12px;padding:12px 14px;margin:12px 0;line-height:1.5;color:rgba(255,244,190,.95)}",
      ".access-scope-summary-branch{margin-top:24px}",
      ".access-scope-summary-branch-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:7px}",
      ".access-scope-summary-branch-head h3{font-size:1.1rem;margin:0}",
      ".access-scope-summary-branch-count{color:#62ff8d;font-size:.8rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}",
      ".access-scope-branch-description{color:rgba(246,255,248,.68);font-size:.88rem;margin:0 0 10px;line-height:1.45}",
      "table.access-scope-summary-table{width:100%;border-collapse:collapse;border:1px solid rgba(120,255,120,.14);font-size:.84rem}",
      ".access-scope-summary-table th,.access-scope-summary-table td{padding:8px 8px;border-bottom:1px solid rgba(120,255,120,.12);vertical-align:top;text-align:left}",
      ".access-scope-summary-table th{background:rgba(120,255,120,.06);font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;color:rgba(196,255,214,.7)}",
      ".access-scope-summary-table tr:last-child td{border-bottom:none}",
      ".access-scope-summary-actions{margin-top:14px}",
      ".access-scope-planner-flow-actions{justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}",
      ".access-scope-planner-flow-actions #next-step-row{margin:0!important}",
      ".sl-category-planner-shell .seed-card{margin-top:14px;background:rgba(0,0,0,.14);border-color:rgba(120,255,120,.12)}",
      ".sl-category-planner-shell .seed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin-top:10px}",
      ".sl-category-planner-shell .seed-grid label{color:rgba(246,255,248,.86);font-size:.95rem}",
      ".sl-category-planner-shell details.planner-meta{border:1px solid rgba(120,255,120,.12);background:rgba(0,0,0,.14);border-radius:14px;padding:14px}",
      ".sl-category-planner-shell details.planner-meta summary{cursor:pointer}",
      "@media(max-width:820px){.access-scope-ledger-grid,.access-scope-meta,.access-scope-summary-rollup,.sl-category-planner-shell .seed-grid{grid-template-columns:1fr}.access-scope-planner-flow-actions{align-items:stretch;flex-direction:column}.access-scope-planner-flow-actions .btn,.access-scope-planner-flow-actions #next-step-row{width:100%}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function fieldHtml(field) {
    if (field.type === "textarea") {
      return '<label class="field ' + (field.full ? "full" : "") + '"><span class="label">' + escapeHtml(field.label) + '</span><textarea id="' + escapeHtml(field.id) + '" placeholder="' + escapeHtml(field.placeholder || "") + '"></textarea></label>';
    }

    if (field.type === "select") {
      return '<label class="field ' + (field.full ? "full" : "") + '"><span class="label">' + escapeHtml(field.label) + '</span><select id="' + escapeHtml(field.id) + '">' + (field.options || []).map(function (option) {
        return '<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.label) + '</option>';
      }).join("") + '</select></label>';
    }

    return '<label class="field ' + (field.full ? "full" : "") + '"><span class="label">' + escapeHtml(field.label) + '</span><input id="' + escapeHtml(field.id) + '" type="' + escapeHtml(field.type || "text") + '"' + attrs({
      min: field.min,
      max: field.max,
      step: field.step,
      value: field.value,
      placeholder: field.placeholder
    }) + ' /></label>';
  }

  function flowCard(config) {
    var flow = config.flow || {};
    return '<section id="' + escapeHtml(flow.id || "plannerDesignFlowCard") + '" class="card">' +
      '<p class="access-scope-section-title">' + escapeHtml(flow.eyebrow || "Design Flow") + '</p>' +
      (flow.sections || []).map(function (section) {
        return '<div style="padding:12px 0;border-top:1px solid rgba(120,255,120,.12);">' +
          '<p class="access-scope-section-title">' + escapeHtml(section.label) + '</p>' +
          '<p class="muted">' + escapeHtml(section.copy || "") + '</p>' +
          '<div class="access-scope-flow-line">' +
          (section.steps || []).map(function (step, index) {
            return '<span class="access-scope-flow-step"><span class="access-scope-flow-dot ' + (step.active ? "is-active" : "") + '"></span>' + escapeHtml(step.label) + '</span>' +
              (index < section.steps.length - 1 ? '<span class="access-scope-flow-arrow">→</span>' : '');
          }).join("") +
          '</div>' +
        '</div>';
      }).join("") +
    '</section>';
  }

  function render(mount, config) {
    if (!mount) return;
    injectStyles();

    var fieldList = (config.fields || []).map(fieldHtml).join("\n");
    var seedChecks = (config.seedChecks || []).map(function (seed) {
      return '<label><input id="' + escapeHtml(seed.id) + '" type="checkbox" /> ' + escapeHtml(seed.label) + '</label>';
    }).join("\n");

    var branchCards = (config.branchCards || []).map(function (card) {
      return '<section id="' + escapeHtml(card.id) + '" class="card seed-card" hidden>' +
        '<h3 class="h3" style="margin-top:0;">' + escapeHtml(card.title) + '</h3>' +
        '<p class="muted">' + escapeHtml(card.copy) + '</p>' +
      '</section>';
    }).join("\n");

    mount.classList.add("sl-category-planner-shell");
    mount.innerHTML =
      '<h1>' + escapeHtml(config.title) + '</h1>' +
      flowCard(config) +
      '<section id="' + escapeHtml(config.introId || "plannerIntroCard") + '" class="card" style="margin-top:18px;border-color:rgba(120,255,120,0.18);">' +
        '<h2 class="card-title" style="margin-top:0;">' + escapeHtml(config.introTitle) + '</h2>' +
        '<p class="muted">' + escapeHtml(config.introCopy) + '</p>' +
      '</section>' +
      '<section id="lockedCard" class="card tool-card" hidden aria-hidden="true" style="display:none!important;">' +
        '<h2 class="card-title" style="margin-top:0;">🔒 Locked</h2>' +
        '<p class="muted">Hidden planner gate placeholder.</p>' +
      '</section>' +
      '<section id="toolCard" class="card tool-card" style="margin-top:18px;">' +
        '<h2 class="card-title" style="margin-top:0;">' + escapeHtml(config.setupTitle) + '</h2>' +
        '<p class="muted">' + escapeHtml(config.setupCopy) + '</p>' +
        '<div class="form-grid">' + fieldList + '</div>' +
        '<section id="' + escapeHtml(config.seedCardId || "plannerSeedCard") + '" class="card seed-card">' +
          '<h3 class="h3" style="margin-top:0;">' + escapeHtml(config.seedTitle) + '</h3>' +
          '<p class="muted">' + escapeHtml(config.seedCopy) + '</p>' +
          '<div class="seed-grid">' + seedChecks + '</div>' +
        '</section>' +
        branchCards +
        '<div class="btn-row" style="margin-top:14px;">' +
          '<button id="' + escapeHtml(config.saveId || "saveItem") + '" class="btn btn-primary" type="button">' + escapeHtml(config.saveLabel || "Save / Update") + '</button>' +
          '<button id="' + escapeHtml(config.newId || "newItem") + '" class="btn" type="button">' + escapeHtml(config.newLabel || "Add Another") + '</button>' +
          '<button id="' + escapeHtml(config.resetId || "resetItems") + '" class="btn" type="button">' + escapeHtml(config.resetLabel || "Reset") + '</button>' +
        '</div>' +
        '<p id="' + escapeHtml(config.statusId || "plannerStatus") + '" class="muted" style="margin-top:10px;"></p>' +
      '</section>' +
      '<section id="scopeLedgerCard" class="card" style="margin-top:14px;background:rgba(0,0,0,.12);">' +
        '<div class="access-scope-flow-line access-scope-flow-line--ledger" aria-label="' + escapeHtml(config.ledgerAria || "planner ledger summary") + '">' +
          '<span><strong>' + escapeHtml(config.ledgerEyebrow || "Ledger") + '</strong> → ' + escapeHtml(config.ledgerInline || "Saved planning items") + '</span>' +
          '<span id="' + escapeHtml(config.countId || "scopeCountLabel") + '" class="muted">0 items</span>' +
        '</div>' +
        '<h2 class="card-title" style="margin-top:0;">' + escapeHtml(config.ledgerTitle) + '</h2>' +
        '<p class="muted">' + escapeHtml(config.ledgerCopy) + '</p>' +
        '<div id="scopeList" class="access-scope-ledger-grid" data-category-planner-list></div>' +
      '</section>' +
      '<section class="card" id="' + escapeHtml(config.metadataSectionId || "categoryPlannerReportMetadataSection") + '" style="margin-top:14px;">' +
        '<h2 class="card-title" style="margin-top:0;">' + escapeHtml(config.metadataTitle) + '</h2>' +
        '<p class="muted">' + escapeHtml(config.metadataCopy) + '</p>' +
        '<p id="' + escapeHtml(config.activeLabelId || "activePlanningItemLabel") + '" class="access-scope-metadata-active">' + escapeHtml(config.activeLabelDefault || "Active item: None selected") + '</p>' +
        '<details class="planner-meta" open><summary><strong>Report metadata</strong></summary>' +
          '<div class="form-grid" style="margin-top:12px;">' +
            '<label class="field"><span class="label">Report Title</span><input id="reportTitle" type="text" placeholder="' + escapeHtml(config.reportTitlePlaceholder || "Assessment") + '" /></label>' +
            '<label class="field"><span class="label">Project Name</span><input id="projectName" type="text" placeholder="Optional project name" /></label>' +
            '<label class="field"><span class="label">Client Name</span><input id="clientName" type="text" placeholder="Optional client name" /></label>' +
            '<label class="field"><span class="label">Prepared By</span><input id="preparedBy" type="text" placeholder="Optional preparer" /></label>' +
            '<label class="field full"><span class="label">Custom Notes</span><textarea id="reportNotes" placeholder="' + escapeHtml(config.reportNotesPlaceholder || "Optional report notes.") + '"></textarea></label>' +
          '</div>' +
        '</details>' +
      '</section>' +
      '<section id="scopeSummaryCard" class="card access-scope-summary-card" style="margin-top:14px;" data-export-section="' + escapeHtml(config.summaryExportTitle || "Category Summary") + '">' +
        '<h2 class="card-title" style="margin-top:0;">' + escapeHtml(config.summaryTitle) + '</h2>' +
        '<p class="muted">' + escapeHtml(config.summaryCopy) + '</p>' +
        '<div id="scopeSummary" data-category-planner-summary><p class="muted">' + escapeHtml(config.emptySummary || "Save at least one item to build the summary.") + '</p></div>' +
        '<div class="btn-row access-scope-summary-actions">' +
          '<button id="' + escapeHtml(config.printId || "printSummary") + '" class="btn" type="button">' + escapeHtml(config.printLabel || "Print / Save Summary") + '</button>' +
          '<button id="' + escapeHtml(config.copyId || "copySummary") + '" class="btn" type="button">' + escapeHtml(config.copyLabel || "Copy Client Summary") + '</button>' +
        '</div>' +
      '</section>' +
      '<div id="accessScopePlannerFlowActions" class="btn-row access-scope-planner-flow-actions" style="margin-top:14px;">' +
        '<a class="btn" href="' + escapeHtml(config.backHref || "/tools/") + '">' + escapeHtml(config.backLabel || "Back") + '</a>' +
        '<div id="next-step-row" class="btn-row access-scope-planner-continue-slot" style="margin-top:0;">' +
          '<a id="continue" class="btn btn-primary" href="' + escapeHtml(config.continueHref || "#") + '">' + escapeHtml(config.continueLabel || "Continue") + '</a>' +
        '</div>' +
      '</div>';
  }

  window.ScopedLabsCategoryPlannerShell = Object.freeze({
    version: VERSION,
    render: render,
    escapeHtml: escapeHtml
  });
})();