(function () {
  "use strict";

  const VERSION = "access-control-report-summary-0613-export-table-contract";
  const MOUNT_ID = "accessControlReportMount";

  // access-control-report-summary-0613-export-column-widths
  // compatibility markers for existing audits:
  // access-control-report-summary-0613-separated-scope-tables
  // access-control-report-summary-0613-scope-report-rows

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeParse(value) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  }

  function tools() {
    return (window.ScopedLabsAccessControlToolRegistry && window.ScopedLabsAccessControlToolRegistry.tools) || [];
  }

  function storageKeys(storage) {
    const out = [];

    if (!storage) return out;

    try {
      for (let i = 0; i < storage.length; i += 1) out.push(storage.key(i));
    } catch (_) {}

    return out.filter(Boolean);
  }

  function readSummaryScopeLedger() {
    const api = window.ScopedLabsAccessControlScopeState;

    if (api && typeof api.readLedger === "function") {
      try {
        return api.readLedger();
      } catch (_) {}
    }

    const stores = [window.sessionStorage, window.localStorage];

    for (const storage of stores) {
      try {
        const parsed = safeParse(storage.getItem("scopedlabs:pipeline:access-control:scopes"));

        if (parsed && Array.isArray(parsed.scopes)) return parsed;
      } catch (_) {}
    }

    return { scopes: [], activeScopeId: null };
  }

  function plannedScopes(ledger) {
    return (Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [])
      .filter(function (scope) { return scope && scope.id; })
      .map(function (scope, index) {
        const id = String(scope.id || "").trim();
        const name = String(scope.name || scope.label || scope.title || ("Access Scope " + (index + 1))).trim();

        return {
          id: id,
          name: name || ("Access Scope " + (index + 1)),
          path: String(scope.path || scope.accessPath || scope.doorPath || "").trim(),
          egress: String(scope.egress || scope.egressMode || scope.egressStatus || "").trim(),
          lockIntent: String(scope.lockIntent || scope.lockMode || "").trim()
        };
      });
  }

  function reportScopeStorageKey() {
    return "scopedlabs:access-control:summary:report-scope-mode";
  }

  function selectedScreenScopeId(scopes) {
    const ids = new Set(scopes.map(function (scope) { return scope.id; }));
    let saved = "";

    try {
      saved = String(window.sessionStorage.getItem("scopedlabs:access-control:summary:selected-scope-id") || "").trim();
    } catch (_) {}

    if (saved && saved !== "__all__" && ids.has(saved)) return saved;

    return scopes[0] ? scopes[0].id : "";
  }

  function selectedReportScopeId(scopes) {
    const ids = new Set(scopes.map(function (scope) { return scope.id; }));
    let saved = "";

    try {
      saved = String(window.sessionStorage.getItem(reportScopeStorageKey()) || "").trim();
    } catch (_) {}

    if (saved === "__all__") return saved;
    if (saved && ids.has(saved)) return saved;

    return selectedScreenScopeId(scopes) || "__all__";
  }

  function recordScopeId(record) {
    return String(
      record && (
        record.scopeId ||
        record.accessScopeId ||
        record.activeScopeId ||
        record.scopeID ||
        record.scope ||
        ""
      ) || ""
    ).trim();
  }

  function slugFrom(record) {
    return String((record && (record.slug || record.toolSlug || record.tool || record.toolId || record.id)) || "").trim();
  }

  function noteFrom(record) {
    return String((record && (record.notes || record.customNotes || record.reportNotes || record.note || record.summary || record.status || "")) || "").trim();
  }

  function normalizeStatus(value) {
    const text = String(value || "").toLowerCase();

    if (text.includes("risk") || text.includes("fail") || text.includes("blocked")) return "RISK";
    if (text.includes("watch") || text.includes("warn") || text.includes("review")) return "WATCH";
    if (text.includes("healthy") || text.includes("safe") || text.includes("ok") || text.includes("pass") || text.includes("complete") || text.includes("saved")) return "SAVED";

    return "PENDING";
  }

  function fallbackMemoryRecords() {
    const records = [];

    if (window.ScopedLabsAccessControlGuidanceMemory && typeof window.ScopedLabsAccessControlGuidanceMemory.listRecords === "function") {
      try {
        records.push.apply(records, window.ScopedLabsAccessControlGuidanceMemory.listRecords());
      } catch (_) {}
    }

    [window.sessionStorage, window.localStorage].forEach(function (storage) {
      storageKeys(storage).forEach(function (key) {
        if (!/access-control|ScopedLabsAccessControl|report-metadata/i.test(key || "")) return;

        const parsed = safeParse(storage.getItem(key));

        if (Array.isArray(parsed)) records.push.apply(records, parsed);
        else if (parsed && typeof parsed === "object") records.push(parsed);
      });
    });

    return records;
  }

  function scopeGuidance(scope) {
    const details = [];

    if (scope.path) details.push("Path: " + scope.path);
    if (scope.egress) details.push("Egress: " + scope.egress);
    if (scope.lockIntent) details.push("Lock intent: " + scope.lockIntent);

    if (!details.length) details.push("Scope started and available for the current category rollup.");

    return details.join(" · ");
  }

  function rowHtml(toolLabel, status, guidance, attrs) {
    const attrText = attrs ? " " + attrs : "";

    return "<tr" + attrText + ">" +
      "<td class='summary-report-tool-cell'><strong>" + esc(toolLabel) + "</strong></td>" +
      "<td class='summary-report-status-cell'><span class='summary-report-status summary-report-status--" + esc(String(status || "PENDING").toLowerCase()) + "'>" + esc(status || "PENDING") + "</span></td>" +
      "<td class='summary-report-guidance-cell'>" + esc(guidance || "No saved guidance found yet.") + "</td>" +
    "</tr>";
  }

  function tableForScope(scope, allRecords) {
    const rows = [];

    rows.push(rowHtml(
      "Scope Planner",
      "SAVED",
      scopeGuidance(scope),
      "data-summary-report-scope-planner-row='true' data-scope-id='" + esc(scope.id) + "'"
    ));

    tools()
      .filter(function (tool) { return tool && tool.slug && tool.slug !== "scope-planner"; })
      .forEach(function (tool) {
        const scopedRecords = allRecords.filter(function (record) {
          return slugFrom(record) === tool.slug && recordScopeId(record) === scope.id;
        });

        if (!scopedRecords.length) {
          rows.push(rowHtml(
            tool.label,
            "PENDING",
            "No scoped guidance found for this scope yet.",
            "data-summary-report-pending-tool-row='true' data-tool-slug='" + esc(tool.slug) + "'"
          ));
          return;
        }

        scopedRecords.forEach(function (record) {
          rows.push(rowHtml(
            tool.label,
            normalizeStatus(record.status || record.overallStatus || record.state || "saved"),
            noteFrom(record) || "Scoped guidance saved.",
            "data-summary-report-scoped-tool-row='true' data-tool-slug='" + esc(tool.slug) + "'"
          ));
        });
      });

    return "<section class='summary-report-scope-section' data-summary-report-scope-section='true' data-scope-id='" + esc(scope.id) + "'>" +
      "<h4 class='summary-report-scope-title'>Scope: " + esc(scope.name) + "</h4>" +
      "<table class='summary-report-table summary-report-table--scope-section' data-export-table-class='extra-export-table--access-control-summary-report' data-export-col-widths='22,12,66' data-export-table-title='Scope: " + esc(scope.name) + "'><colgroup><col class='summary-report-col-tool' style='width:22%'><col class='summary-report-col-status' style='width:12%'><col class='summary-report-col-guidance' style='width:66%'></colgroup>" +
        "<thead><tr><th>Tool</th><th>Status</th><th>Saved guidance</th></tr></thead>" +
        "<tbody>" + rows.join("") + "</tbody>" +
      "</table>" +
    "</section>";
  }

  function renderReportScopeSelector(scopes, selected) {
    if (!scopes.length) return "";

    const options = scopes.map(function (scope) {
      return "<option value='" + esc(scope.id) + "'" + (selected === scope.id ? " selected" : "") + ">" + esc(scope.name) + "</option>";
    }).join("") +
      "<option value='__all__'" + (selected === "__all__" ? " selected" : "") + ">All saved scopes</option>";

    return "<label class='summary-report-scope-selector' for='accessControlReportScopeSelect'>" +
      "<span>Report scope</span>" +
      "<select id='accessControlReportScopeSelect' aria-label='Select report scope'>" + options + "</select>" +
    "</label>";
  }

  function renderExportHtml() {
    const ledger = readSummaryScopeLedger();
    const scopes = plannedScopes(ledger);
    const allRecords = fallbackMemoryRecords();
    const selected = selectedReportScopeId(scopes);

    let body = "";

    if (!scopes.length) {
      body = "<section class='summary-report-scope-section' data-summary-report-empty='true'>" +
        "<h4 class='summary-report-scope-title'>No saved scopes</h4>" +
        "<table class='summary-report-table summary-report-table--scope-section' data-export-table-class='extra-export-table--access-control-summary-report' data-export-col-widths='22,12,66' data-export-table-title='No saved scopes'><colgroup><col class='summary-report-col-tool' style='width:22%'><col class='summary-report-col-status' style='width:12%'><col class='summary-report-col-guidance' style='width:66%'></colgroup>" +
          "<thead><tr><th>Tool</th><th>Status</th><th>Saved guidance</th></tr></thead>" +
          "<tbody>" + rowHtml("Scope Planner", "PENDING", "No access scopes have been saved yet.", "data-summary-report-empty-row='true'") + "</tbody>" +
        "</table>" +
      "</section>";
    } else {
      const selectedScopes = selected === "__all__" ? scopes : scopes.filter(function (scope) { return scope.id === selected; });
      body = selectedScopes.map(function (scope) { return tableForScope(scope, allRecords); }).join("");
    }

    return "<div class='summary-export-report' data-access-control-report-summary='true'>" +
      "<h3>Access Control Category Summary</h3>" +
      "<p>This report-ready rollup can print one selected scope or all saved scopes as separate report sections.</p>" +
      renderReportScopeSelector(scopes, selected) +
      body +
    "</div>";
  }

  function refreshExportSection() {
    const mount = document.getElementById(MOUNT_ID);

    if (!mount) return false;

    mount.innerHTML = renderExportHtml();

    return true;
  }

  function init() {
    refreshExportSection();

    document.addEventListener("change", function (event) {
      const select = event.target && event.target.closest ? event.target.closest("#accessControlReportScopeSelect") : null;

      if (!select) return;

      try {
        window.sessionStorage.setItem(reportScopeStorageKey(), select.value || "");
      } catch (_) {}

      refreshExportSection();

      try {
        window.dispatchEvent(new CustomEvent("scopedlabs:access-control-report-scope-changed", {
          detail: { scopeId: select.value || "" }
        }));
      } catch (_) {}
    }, true);

    document.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest("#exportReport")) refreshExportSection();
    }, true);

    window.addEventListener("scopedlabs:access-control-guidance-updated", refreshExportSection);
    window.addEventListener("scopedlabs:access-control-scope-updated", refreshExportSection);
    window.addEventListener("scopedlabs:access-control-scope-view-changed", refreshExportSection);
  }

  window.ScopedLabsAccessControlReportSummary = Object.freeze({
    version: VERSION,
    renderExportHtml: renderExportHtml,
    refreshExportSection: refreshExportSection,
    tableForScope: tableForScope,
    init: init
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
