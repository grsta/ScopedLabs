(function () {
  "use strict";

  const VERSION = "access-control-decision-schedule-001-shared-shell";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureStyles() {
    if (document.getElementById("access-control-decision-schedule-styles")) return;

    const style = document.createElement("style");
    style.id = "access-control-decision-schedule-styles";
    style.textContent = [
      ".access-control-decision-schedule-wrap { margin-top: 14px; overflow-x: auto; }",
      ".access-control-decision-schedule-hero { display: grid; gap: 8px; grid-template-columns: minmax(0, 1.2fr) minmax(190px, 0.55fr); margin-bottom: 12px; padding: 12px 14px; border: 1px solid rgba(120,255,120,0.16); border-radius: 14px; background: rgba(120,255,120,0.045); }",
      ".access-control-decision-schedule-hero strong { display: block; color: rgba(246,255,248,0.96); font-size: 1.02rem; line-height: 1.3; }",
      ".access-control-decision-schedule-hero span { display: block; color: rgba(203,213,225,0.72); font-size: 0.86rem; line-height: 1.4; margin-top: 4px; }",
      ".access-control-decision-schedule-hero > div:last-child { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }",
      ".access-control-decision-schedule-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 0.92rem; }",
      ".access-control-decision-schedule-table th, .access-control-decision-schedule-table td { padding: 10px 12px; border-bottom: 1px solid rgba(120,255,120,0.12); vertical-align: top; }",
      ".access-control-decision-schedule-table th { color: rgba(180,255,200,0.76); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; text-align: left; background: rgba(120,255,120,0.045); }",
      ".access-control-decision-schedule-table td { color: rgba(238,255,244,0.92); line-height: 1.45; }",
      ".access-control-decision-schedule-table td:nth-child(3) { font-weight: 800; }",
      ".access-control-decision-status-chip { display: inline-flex; align-items: center; min-height: 24px; width: fit-content; max-width: max-content; padding: 2px 10px; border: 1px solid rgba(120,255,120,0.24); border-radius: 999px; background: rgba(120,255,120,0.08); color: rgba(125,255,152,.94); font-size: 0.76rem; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }",
      ".access-control-decision-status-chip.is-watch { color: rgba(255,220,120,0.96); border-color: rgba(255,204,102,0.38); background: rgba(255,204,102,0.12); }",
      ".access-control-decision-status-chip.is-risk { color: rgba(255,150,150,0.96); border-color: rgba(255,105,105,0.38); background: rgba(255,105,105,0.12); }",
      "@media (max-width: 760px) { .access-control-decision-schedule-hero { grid-template-columns: 1fr; } .access-control-decision-schedule-table { min-width: 760px; } }"
    ].join("\n");

    document.head.appendChild(style);
  }

  function statusTone(status) {
    const clean = String(status || "PENDING").toUpperCase();
    if (clean.includes("RISK") || clean === "HIGH") return "is-risk";
    if (clean.includes("WATCH") || clean === "MODERATE") return "is-watch";
    return "is-healthy";
  }

  function statusLabel(status) {
    const clean = String(status || "PENDING").toUpperCase();
    if (clean === "HEALTHY" || clean === "LOW") return "SAFE";
    return clean;
  }

  function statusChip(status) {
    return '<span class="access-control-decision-status-chip ' + statusTone(status) + '">' + escapeHtml(statusLabel(status)) + '</span>';
  }

  function cell(value) {
    return escapeHtml(value == null || value === "" ? "—" : value);
  }

  function valueCell(row) {
    if (row && row.valueHtml !== undefined) return String(row.valueHtml || "");
    return cell(row ? row.value : "");
  }

  function buildHtml(options = {}) {
    const rows = Array.isArray(options.rows) ? options.rows : [];
    const title = options.title || "Decision schedule";
    const summary = options.summary || "Review the calculated tool output before carrying this result into the Access Control summary.";
    const status = options.status || "PENDING";
    const statusDetail = options.statusDetail || "Review required";
    const interpretation = options.interpretation || "Review calculated output and assumptions before final documentation.";
    const exportTitle = options.exportTableTitle || title;
    const tableAttr = options.tableDataAttr || 'data-access-control-decision-schedule="true"';
    const body = rows.map((row) => '<tr><td>' + cell(row.group) + '</td><td>' + cell(row.metric) + '</td><td>' + valueCell(row) + '</td><td>' + cell(row.note) + '</td></tr>').join("");

    return [
      '<div class="access-control-decision-schedule-hero">',
      '<div><strong>' + cell(title) + '</strong><span>' + cell(summary) + '</span></div>',
      '<div>' + statusChip(status) + '<span>' + cell(statusDetail) + '</span></div>',
      '</div>',
      '<div class="access-control-decision-schedule-wrap">',
      '<table class="access-control-decision-schedule-table" ' + tableAttr + ' data-export-table-title="' + escapeHtml(exportTitle) + '"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>',
      body,
      '</tbody></table>',
      '</div>',
      '<p class="mini-note"><strong>Engineering Interpretation:</strong> ' + cell(interpretation) + '</p>'
    ].join("");
  }

  function render(options = {}) {
    ensureStyles();
    const html = buildHtml(options);
    const shell = window.ScopedLabsAccessControlOutputShell;

    if (shell && typeof shell.showVisual === "function") {
      shell.showVisual({ card: options.card, wrap: options.wrap, target: options.target, html });
    } else if (options.target) {
      const target = typeof options.target === "string" ? document.getElementById(options.target) : options.target;
      if (target) target.innerHTML = html;
    }

    return html;
  }

  window.ScopedLabsAccessControlDecisionSchedule = Object.freeze({
    VERSION,
    render,
    buildHtml,
    statusChip
  });
})();
