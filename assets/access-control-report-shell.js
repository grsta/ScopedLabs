(function () {
  "use strict";

  const VERSION = "access-control-report-shell-002-stacked-sections";

  function statusClass(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("risk")) return "risk";
    if (normalized.includes("authority")) return "authority";
    if (normalized.includes("watch")) return "watch";
    if (normalized.includes("complete")) return "complete";
    return "pending";
  }

  function styles() {
    return `
    :root{
      --ink:#111827;
      --muted:#53605a;
      --line:#dbe5dd;
      --soft:#f7faf8;
      --card:#ffffff;
      --accent:#167a3a;
      --watch:#946200;
      --risk:#a3362b;
      --authority:#946200;
    }
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#eef3ef;color:var(--ink);font-family:Inter,Segoe UI,Roboto,Arial,sans-serif}
    body{padding:28px}
    .page{max-width:1080px;margin:0 auto;background:#fff;border:1px solid var(--line);box-shadow:0 18px 50px rgba(0,0,0,.08)}
    .toolbar{display:flex;justify-content:flex-end;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line);background:#fbfcfb;position:sticky;top:0;z-index:3}
    .toolbar button{appearance:none;border:1px solid #c9d8cf;background:#fff;color:var(--ink);border-radius:10px;padding:10px 14px;font-weight:850;cursor:pointer}
    .toolbar button:hover{background:#f3f7f5}
    .report{padding:30px 32px 34px}
    .brand-row{display:flex;align-items:center;gap:12px;margin-bottom:8px}
    .brand-row img{width:26px;height:26px;display:block}
    .brand-name{font-size:1.12rem;font-weight:900;letter-spacing:.02em}
    .tagline{color:var(--muted);font-size:.93rem;margin-bottom:18px}
    .report-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px 0;margin-bottom:22px}
    .report-title{font-size:1.65rem;line-height:1.15;margin:0 0 7px;font-weight:900;letter-spacing:normal}
    .report-meta{color:var(--muted);font-size:.94rem;line-height:1.6}
    .report-status{font-size:.82rem;font-weight:950;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;margin-top:4px}
    .report-status.complete{color:var(--accent)}
    .report-status.watch,.report-status.authority{color:var(--watch)}
    .report-status.risk{color:var(--risk)}
    .report-status.pending{color:#4b5563}
    .section{margin-top:24px}
    .section h2{margin:0 0 10px;font-size:.93rem;letter-spacing:.06em;text-transform:uppercase;font-weight:950}
    .summary,.body-copy{border:1px solid var(--line);background:#fafcfb;border-radius:12px;padding:14px 16px;line-height:1.62}
    .project-details{display:grid;gap:6px;margin-top:10px;color:var(--muted);font-size:.94rem}
    .report-grid{display:grid;grid-template-columns:1fr;gap:18px;align-items:start}
    .report-table{width:100%;border-collapse:collapse;border:1px solid var(--line);font-size:.9rem;table-layout:fixed}
    .report-table th,.report-table td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left;overflow-wrap:break-word;word-break:normal}
    .report-table th{background:#f7faf8;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#26332d;font-weight:950}
    .report-table tr:last-child td{border-bottom:none}
    .report-table td:first-child{width:28%;color:var(--muted);font-weight:650}
    .report-table td:last-child{font-weight:760}
    .report-section-table{margin-top:8px}
    .assumptions{margin:0;padding-left:18px;line-height:1.7}
    .foot{margin-top:26px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:.88rem;line-height:1.65}
    @media (max-width:760px){
      body{padding:14px}
      .report{padding:20px}
      .report-head{flex-direction:column}
      .report-grid{grid-template-columns:1fr}
    }
    @media print{
      @page{margin:.55in}
      body{background:#fff;padding:0}
      .page{max-width:none;border:none;box-shadow:none}
      .toolbar{display:none!important}
      .report{padding:0}
      .report-grid{grid-template-columns:1fr;gap:12px}
      .section{break-inside:avoid;page-break-inside:avoid}
      .report-table th,.report-table td{padding:7px 8px;font-size:.82rem}
    }`;
  }

  function build(options) {
    const status = options.status || "";
    const statusClassName = statusClass(status);

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${options.title || "ScopedLabs Report"} ? ScopedLabs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${styles()}</style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <button type="button" onclick="window.print()">Print / Save PDF</button>
      <button type="button" onclick="window.close()">Close</button>
    </div>
    <div class="report">
      <div class="brand-row">
        <img src="https://scopedlabs.com/assets/favicon/favicon-32x32.png?v=1" alt="">
        <div class="brand-name">ScopedLabs</div>
      </div>
      <div class="tagline">Engineering ? Analysis ? Tools</div>

      <div class="report-head">
        <div>
          <h1 class="report-title">${options.title || "ScopedLabs Report"}</h1>
          <div class="report-meta">${options.metaHtml || ""}</div>
        </div>
        <div class="report-status ${statusClassName}">${status}</div>
      </div>

      ${options.bodyHtml || ""}

      <div class="foot">ScopedLabs export preview for internal and client-facing documentation workflows.</div>
    </div>
  </div>
</body>
</html>`;
  }

  window.ScopedLabsAccessControlReportShell = Object.freeze({
    version: VERSION,
    statusClass,
    styles,
    build
  });
})();