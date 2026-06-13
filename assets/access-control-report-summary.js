(function () {
  "use strict";

  const VERSION = "access-control-report-summary-0613-multi-scope-kpi";
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

  function scopeIdsFromLedger(ledger) {
    const scopes = Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [];

    return new Set(scopes
      .map(function (scope) { return String(scope && scope.id || "").trim(); })
      .filter(Boolean));
  }

  function plannedScopeSummary(ledger) {
    const scopes = Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [];

    const names = scopes
      .map(function (scope, index) {
        return String((scope && (scope.name || scope.label || scope.title)) || ("Access Scope " + (index + 1))).trim();
      })
      .filter(Boolean);

    if (!scopes.length) {
      return {
        count: 0,
        label: "0",
        detail: "No access scopes have been saved for the current category rollup.",
        reportText: "No access scopes have been saved yet."
      };
    }

    if (scopes.length === 1) {
      return {
        count: 1,
        label: "1",
        detail: "One access scope is planned in the current category rollup.",
        reportText: "1 scope planned: " + (names[0] || "Access Scope 1")
      };
    }

    return {
      count: scopes.length,
      label: String(scopes.length),
      detail: String(scopes.length) + " access scopes are planned in the current category rollup.",
      reportText: String(scopes.length) + " scopes planned: " + names.join(", ")
    };
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

  function scopePlannerRecordFromLedger(ledger, scopeIds) {
    const scopes = Array.isArray(ledger && ledger.scopes) ? ledger.scopes : [];
    const activeScopeId = String((ledger && ledger.activeScopeId) || "").trim();
    const fallbackScope = scopes.find(function (scope) { return scope && scope.id; });
    const activeScope = scopes.find(function (scope) { return String(scope && scope.id || "").trim() === activeScopeId; }) || fallbackScope;
    const scopeId = String((activeScope && activeScope.id) || activeScopeId || "").trim();
    const planned = plannedScopeSummary(ledger);

    if (!scopeId || !scopeIds.has(scopeId)) return null;

    return {
      slug: "scope-planner",
      toolSlug: "scope-planner",
      scopeId: scopeId,
      status: "saved",
      summary: planned.reportText,
      notes: planned.reportText
    };
  }

  function filterGuidanceRecordsToActiveScopes(records) {
    const ledger = readSummaryScopeLedger();
    const scopeIds = scopeIdsFromLedger(ledger);

    if (!scopeIds.size) return [];

    const filtered = (Array.isArray(records) ? records : []).filter(function (record) {
      const slug = slugFrom(record);
      const scopeId = recordScopeId(record);

      if (slug === "scope-planner") return !scopeId || scopeIds.has(scopeId);
      if (!scopeId) return false;

      return scopeIds.has(scopeId);
    });

    const hasScopePlanner = filtered.some(function (record) { return slugFrom(record) === "scope-planner"; });
    const syntheticScopePlanner = scopePlannerRecordFromLedger(ledger, scopeIds);

    if (!hasScopePlanner && syntheticScopePlanner) filtered.unshift(syntheticScopePlanner);

    return filtered;
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

    return filterGuidanceRecordsToActiveScopes(records);
  }

  function noteFrom(record) {
    return String((record && (record.notes || record.customNotes || record.reportNotes || record.note || record.summary || record.status || "")) || "").trim();
  }

  function renderExportHtml() {
    const records = getRecords();
    const bySlug = new Map(records.map(function (record) {
      return [slugFrom(record), record];
    }));

    const rows = tools().map(function (tool) {
      const record = bySlug.get(tool.slug);
      const detail = noteFrom(record) || "No saved guidance found yet.";
      const status = detail === "No saved guidance found yet." ? "PENDING" : "SAVED";

      return "<tr>" +
        "<td class='summary-report-tool-cell'><strong>" + esc(tool.label) + "</strong></td>" +
        "<td class='summary-report-status-cell'><span class='summary-report-status summary-report-status--" + status.toLowerCase() + "'>" + esc(status) + "</span></td>" +
        "<td class='summary-report-guidance-cell'>" + esc(detail) + "</td>" +
      "</tr>";
    }).join("");

    return "<div class='summary-export-report' data-access-control-report-summary='true'>" +
      "<h3>Access Control Category Summary</h3>" +
      "<p>This report-ready rollup reflects saved Access Control guidance and current report metadata.</p>" +
      "<table class='summary-report-table'>" +
        "<thead><tr><th>Tool</th><th>Status</th><th>Saved guidance</th></tr></thead>" +
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
    init: init
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
