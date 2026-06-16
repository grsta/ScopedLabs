(function () {
  "use strict";

  const VERSION = "scopedlabs-assistant-export-001";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeRows(rows) {
    return (Array.isArray(rows) ? rows : [])
      .filter(function (row) {
        return row &&
          row[0] != null &&
          String(row[0]).trim() !== "" &&
          row[1] != null &&
          String(row[1]).trim() !== "";
      });
  }

  function renderMetricTable(title, rows, options) {
    const cleanRows = normalizeRows(rows);
    const opts = options || {};

    if (!cleanRows.length) return "";

    const titleRow = title
      ? '<tr><th colspan="2" style="padding:8px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">' + escapeHtml(title) + '</th></tr>'
      : "";

    return "" +
      '<table data-assistant-export-table="metric" style="width:100%;border-collapse:collapse;margin:' + escapeHtml(opts.margin || "12px 0 0 0") + ';break-inside:avoid;page-break-inside:avoid;font-size:12.5px;">' +
        '<thead>' +
          titleRow +
          '<tr>' +
            '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Metric</th>' +
            '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:right;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Value</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          cleanRows.map(function (row) {
            return '<tr>' +
              '<td style="width:48%;padding:7px 10px;border:1px solid #d8dee6;color:#4b5563;vertical-align:top;">' + escapeHtml(row[0]) + '</td>' +
              '<td style="padding:7px 10px;border:1px solid #d8dee6;color:#111827;font-weight:700;text-align:right;vertical-align:top;white-space:pre-line;">' + escapeHtml(row[1]) + '</td>' +
            '</tr>';
          }).join("") +
        '</tbody>' +
      '</table>';
  }

  function renderNotesTable(rows, options) {
    const cleanRows = normalizeRows(rows);
    const opts = options || {};

    if (!cleanRows.length) return "";

    return "" +
      '<table data-assistant-export-table="notes" style="width:100%;border-collapse:collapse;margin:' + escapeHtml(opts.margin || "12px 0 0 0") + ';break-inside:avoid;page-break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Section</th>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Detail</th>' +
        '</tr></thead>' +
        '<tbody>' +
          cleanRows.map(function (row) {
            return '<tr>' +
              '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">' + escapeHtml(row[0]) + '</td>' +
              '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;white-space:pre-line;">' + escapeHtml(row[1]) + '</td>' +
            '</tr>';
          }).join("") +
        '</tbody>' +
      '</table>';
  }


  function normalizeRecommendationReferences(recommendationReferences) {
    return Array.isArray(recommendationReferences)
      ? recommendationReferences.filter(function (item) {
          return item && (item.id || item.marker || item.label || item.reference || item.reason);
        })
      : [];
  }


  function recommendationReferenceMarkerColor(item) {
    const marker = String((item && (item.id || item.marker)) || "").trim();
    const tone = String((item && item.tone) || "").toLowerCase();

    if (tone === "current" || tone === "tone-current" || marker === "*1") return "#38d9ff";
    if (tone === "growth" || tone === "tone-growth" || marker === "*2") return "#a78bfa";
    if (tone === "failover" || tone === "tone-failover" || marker === "*3") return "#f59e0b";

    return "#111827";
  }

  function renderRecommendationReferencesTable(recommendationReferences, options) {
    const rows = normalizeRecommendationReferences(recommendationReferences);
    const opts = options || {};
    const title = opts.title || "Recommendation References";

    if (!rows.length) return "";

    return "" +
      '<div data-assistant-export-recommendation-references="true" style="margin-top:12px;break-inside:avoid;page-break-inside:avoid;">' +
        '<h3 style="margin:0 0 8px 0;color:#111827;font-size:15px;letter-spacing:.02em;">' + escapeHtml(title) + '</h3>' +
        '<table data-assistant-export-table="recommendationReferences" style="width:100%;border-collapse:collapse;margin:0;break-inside:avoid;page-break-inside:avoid;font-size:12.5px;">' +
          '<thead><tr>' +
            '<th style="width:15%;padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Marker</th>' +
            '<th style="width:28%;padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Reference</th>' +
            '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Reason</th>' +
          '</tr></thead>' +
          '<tbody>' +
            rows.map(function (item) {
              const marker = item.id || item.marker || "";
              const markerColor = recommendationReferenceMarkerColor(item);
              const reference = item.label || item.reference || "Reference";
              const reason = item.reason || "Review required.";
              return '<tr>' +
                '<td style="padding:9px 10px;border:1px solid #d8dee6;color:' + escapeHtml(markerColor) + ';font-weight:900;vertical-align:top;">' + escapeHtml(marker) + '</td>' +
                '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;font-weight:800;vertical-align:top;">' + escapeHtml(reference) + '</td>' +
                '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;white-space:pre-line;">' + escapeHtml(reason) + '</td>' +
              '</tr>';
            }).join("") +
          '</tbody>' +
        '</table>' +
      '</div>';
  }

  function renderStructuredSection(options) {
    const opts = options || {};
    const metricHtml = renderMetricTable(opts.metricTitle || "Design Summary", opts.metrics || [], opts);
    const notesHtml = renderNotesTable(opts.notes || [], opts);

    if (!metricHtml && !notesHtml) return "";

    return "" +
      '<div data-assistant-export-structured="true" style="margin-top:12px;break-inside:avoid;page-break-inside:avoid;">' +
        metricHtml +
        notesHtml +
      '</div>';
  }

  window.ScopedLabsAssistantExport = {
    version: VERSION,
    escapeHtml,
    renderMetricTable,
    renderNotesTable,
    renderRecommendationReferencesTable,
    renderStructuredSection
  };
})();