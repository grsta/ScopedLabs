(function () {
  "use strict";

  const VERSION = "access-control-report-summary-0613-scope-report-rows";
  const MOUNT_ID = "accessControlReportMount";

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
          type: String(scope.type || scope.scopeType || scope.branchType || "").trim(),
          path: String(scope.path || scope.accessPath || scope.doorPath || "").trim(),
          egress: String(scope.egress || scope.egressMode || scope.egressStatus || "").trim(),
          lockIntent: String(scope.lockIntent || scope.lockMode || "").trim()
        };
      });
  }

  function scopeMap(scopes) {
    return new Map(scopes.map(function (scope) {
      return [scope.id, scope];
    }));
  }

  function scopeNameFromRecord(record, scopesById) {
    const scopeId = recordScopeId(record);
    const scope = scopesById.get(scopeId);

    return scope ? scope.name : "—";
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

  function normalizeStatus(value) {
    const text = String(value || "").toLowerCase();

    if (text.includes("risk") || text.includes("fail") || text.includes("blocked")) return "RISK";
    if (text.includes("watch") || text.includes("warn") || text.includes("review")) return "WATCH";
    if (text.includes("healthy") || text.includes("safe") || text.includes("ok") || text.includes("pass") || text.includes("complete") || text.includes("saved")) return "SAVED";

    return "PENDING";
  }

  function noteFrom(record) {
    return String((record && (record.notes || record.customNotes || record.reportNotes || record.note || record.summary || record.status || "")) || "").trim();
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

  function getRecords() {
    let records = [];

    if (window.ScopedLabsAccessControlSummary && typeof window.ScopedLabsAccessControlSummary.readGuidanceRecords === "function") {
      try {
        records = window.ScopedLabsAccessControlSummary.readGuidanceRecords();
      } catch (_) {
        records = [];
      }
    } else {
      records = fallbackMemoryRecords();
    }

    return Array.isArray(records) ? records : [];
  }

  function scopePlannerGuidance(scope) {
    const details = [];

    if (scope.path) details.push("Path: " + scope.path);
    if (scope.egress) details.push("Egress: " + scope.egress);
    if (scope.lockIntent) details.push("Lock intent: " + scope.lockIntent);

    if (!details.length) details.push("Scope started and available for the current category rollup.");

    return details.join(" · ");
  }

  function reportStatusClass(status) {
    return String(status || "PENDING").toLowerCase();
  }

  function rowHtml(scopeName, toolLabel, status, guidance, attrs) {
    const attrText = attrs ? " " + attrs : "";

    return "<tr" + attrText + ">" +
      "<td class='summary-report-scope-cell'>" + esc(scopeName || "—") + "</td>" +
      "<td class='summary-report-tool-cell'><strong>" + esc(toolLabel) + "</strong></td>" +
      "<td class='summary-report-status-cell'><span class='summary-report-status summary-report-status--" + esc(reportStatusClass(status)) + "'>" + esc(status) + "</span></td>" +
      "<td class='summary-report-guidance-cell'>" + esc(guidance || "No saved guidance found yet.") + "</td>" +
    "</tr>";
  }

  function buildReportRows() {
    const ledger = readSummaryScopeLedger();
    const scopes = plannedScopes(ledger);
    const scopesById = scopeMap(scopes);
    const records = getRecords();

    const rows = [];

    scopes.forEach(function (scope) {
      rows.push(rowHtml(
        scope.name,
        "Scope Planner",
        "SAVED",
        scopePlannerGuidance(scope),
        "data-summary-report-scope-planner-row='true' data-scope-id='" + esc(scope.id) + "'"
      ));
    });

    const downstreamTools = tools().filter(function (tool) {
      return tool && tool.slug && tool.slug !== "scope-planner";
    });

    downstreamTools.forEach(function (tool) {
      const scopedRecords = records.filter(function (record) {
        const slug = slugFrom(record);
        const scopeId = recordScopeId(record);

        return slug === tool.slug && scopeId && scopesById.has(scopeId);
      });

      if (!scopedRecords.length) {
        rows.push(rowHtml(
          "—",
          tool.label,
          "PENDING",
          "No scoped guidance found yet.",
          "data-summary-report-pending-tool-row='true' data-tool-slug='" + esc(tool.slug) + "'"
        ));
        return;
      }

      scopedRecords.forEach(function (record) {
        const status = normalizeStatus(record.status || record.overallStatus || record.state || "saved");
        const guidance = noteFrom(record) || "Scoped guidance saved.";
        const scopeName = scopeNameFromRecord(record, scopesById);

        rows.push(rowHtml(
          scopeName,
          tool.label,
          status,
          guidance,
          "data-summary-report-scoped-tool-row='true' data-tool-slug='" + esc(tool.slug) + "'"
        ));
      });
    });

    if (!rows.length) {
      rows.push(rowHtml("—", "Scope Planner", "PENDING", "No access scopes have been saved yet.", "data-summary-report-empty-row='true'"));
    }

    return rows.join("");
  }

  function renderExportHtml() {
    const rows = buildReportRows();

    return "<div class='summary-export-report' data-access-control-report-summary='true'>" +
      "<h3>Access Control Category Summary</h3>" +
      "<p>This report-ready rollup keeps each saved access scope separate, then attaches scoped tool guidance under the matching scope when available.</p>" +
      "<table class='summary-report-table summary-report-table--scope-aware'>" +
        "<thead><tr><th>Scope / Door</th><th>Tool</th><th>Status</th><th>Saved guidance</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>" +
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

    document.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest("#exportReport")) refreshExportSection();
    }, true);

    window.addEventListener("scopedlabs:access-control-guidance-updated", refreshExportSection);
    window.addEventListener("scopedlabs:access-control-scope-updated", refreshExportSection);
  }

  window.ScopedLabsAccessControlReportSummary = Object.freeze({
    version: VERSION,
    renderExportHtml: renderExportHtml,
    refreshExportSection: refreshExportSection,
    buildReportRows: buildReportRows,
    init: init
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
