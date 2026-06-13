(function () {
  "use strict";
  const VERSION = "access-control-report-summary-0613-summary-cleanup";
  const MOUNT_ID = "accessControlReportMount";
  function esc(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
  function tools() { return (window.ScopedLabsAccessControlToolRegistry && window.ScopedLabsAccessControlToolRegistry.tools) || []; }
  function getRecords() {
    if (window.ScopedLabsAccessControlSummary && typeof window.ScopedLabsAccessControlSummary.readGuidanceRecords === "function") return window.ScopedLabsAccessControlSummary.readGuidanceRecords();
    if (window.ScopedLabsAccessControlGuidanceMemory && typeof window.ScopedLabsAccessControlGuidanceMemory.listRecords === "function") return window.ScopedLabsAccessControlGuidanceMemory.listRecords();
    return [];
  }
  function slugFrom(record) { return String((record && (record.slug || record.toolSlug || record.tool || record.id)) || "").trim(); }
  function noteFrom(record) { return String((record && (record.notes || record.customNotes || record.reportNotes || record.note || record.summary || record.status || "")) || "").trim(); }
  function renderExportHtml() {
    const records = getRecords();
    const bySlug = new Map(records.map(function (record) { return [slugFrom(record), record]; }));
    const rows = tools().map(function (tool) {
      const record = bySlug.get(tool.slug);
      const detail = noteFrom(record) || "No saved guidance found yet.";
      return "<tr><td>" + esc(tool.label) + "</td><td>" + esc(detail) + "</td></tr>";
    }).join("");
    return "<div class='summary-export-report' data-access-control-report-summary='true'><h3>Access Control Category Summary</h3><p>This report-ready rollup reflects saved Access Control guidance and current report metadata.</p><table><thead><tr><th>Tool</th><th>Saved guidance</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
  }
  function refreshExportSection() { const mount = document.getElementById(MOUNT_ID); if (!mount) return false; mount.innerHTML = renderExportHtml(); return true; }
  function init() { refreshExportSection(); document.addEventListener("click", function (event) { if (event.target && event.target.closest && event.target.closest("#exportReport")) refreshExportSection(); }, true); window.addEventListener("scopedlabs:access-control-guidance-updated", refreshExportSection); }
  window.ScopedLabsAccessControlReportSummary = Object.freeze({ version: VERSION, renderExportHtml: renderExportHtml, refreshExportSection: refreshExportSection, init: init });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
