(() => {
  "use strict";

  const STYLE_ID = "scopedlabs-diagnostic-dashboard-styles";

  function h(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function arr(value) {
    return Array.isArray(value) - value.filter(Boolean) : [];
  }

  function statusOf(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "RISK") return "RISK";
    if (raw === "WATCH") return "WATCH";
    return "HEALTHY";
  }

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function normalizeItem(item) {
    if (item == null) return "";
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return String(item);

    const label = item.label - String(item.label) : "";
    const value = item.value != null && item.value !== "" - String(item.value) : "";
    const note = item.note || item.summary || item.body || "";

    if (label && value && note) return label + ": " + value + " - " + note;
    if (label && value) return label + ": " + value;
    if (label && note) return label + " - " + note;
    if (value && note) return value + " - " + note;
    return label || value || String(note || "");
  }

  function list(items, limit) {
    const shown = arr(items).map(normalizeItem).filter(Boolean).slice(0, limit || 99);
    if (!shown.length) return '<p class="sld-copy">No detail captured.</p>';
    return '<ul class="sld-list">' + shown.map((item) => '<li>' + h(item) + '</li>').join("") + '</ul>';
  }

  function section(label, itemsOrBody) {
    if (Array.isArray(itemsOrBody)) return { label, items: itemsOrBody };
    if (itemsOrBody && typeof itemsOrBody === "object") return itemsOrBody;
    return { label, body: String(itemsOrBody || "") };
  }

  function body(sectionData) {
    if (!sectionData) return '<p class="sld-copy">No detail captured.</p>';
    if (Array.isArray(sectionData.items)) return list(sectionData.items);
    return '<p class="sld-copy">' + h(sectionData.body || "") + '</p>';
  }

  function flowRows(flowOutputs) {
    const entries = Object.entries(flowOutputs || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (!entries.length) return '<p class="sld-copy">No flow data captured.</p>';

    return '<div class="sld-flow">' + entries.slice(0, 5).map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
      return '<div class="sld-flow-row"><span>' + h(label) + '</span><strong>' + h(value) + '</strong></div>';
    }).join("") + '</div>';
  }

  function gaugeSvg(score, max, status, reading) {
    const readingText = String(reading || "");
    const readingNumber = Number.parseFloat(readingText.replace(/[^0-9.\-]/g, ""));
    const useLensScale = /mm/i.test(readingText) && Number.isFinite(readingNumber);

    const domainMax = useLensScale ? 40 : Number(max || 100);
    const value = useLensScale ? readingNumber : Number(score || 0);
    const pct = clamp((value / domainMax) * 100, 0, 100);

    const cx = 320;
    const cy = 236;
    const r = 190;

    function point(percent, radius) {
      const angle = Math.PI - (Math.PI * clamp(percent, 0, 100) / 100);
      return {
        x: cx + radius * Math.cos(angle),
        y: cy - radius * Math.sin(angle)
      };
    }

    function arc(startPct, endPct, radius) {
      const start = point(startPct, radius);
      const end = point(endPct, radius);
      const large = Math.abs(endPct - startPct) > 50 ? 1 : 0;

      return "M " + start.x.toFixed(2) + " " + start.y.toFixed(2) +
        " A " + radius + " " + radius + " 0 " + large + " 1 " +
        end.x.toFixed(2) + " " + end.y.toFixed(2);
    }

    function scalePct(v) {
      return clamp((v / domainMax) * 100, 0, 100);
    }

    const healthyEnd = useLensScale ? scalePct(8) : 32;
    const watchEnd = useLensScale ? scalePct(18) : 66;
    const needleEnd = point(pct, 156);

    const statusColor = status === "RISK" ? "#ff5d55" : status === "WATCH" ? "#f5c84d" : "#78ff73";

    return [
      '<svg class="sld-gauge" viewBox="0 0 640 278" role="img" aria-label="Lens selection pressure gauge">',
      '<defs>',
      '<filter id="sldNeedleGlow" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
      '<linearGradient id="sldHealthy" x1="0" x2="1"><stop offset="0" stop-color="#4bd85d"/><stop offset="1" stop-color="#8cff4e"/></linearGradient>',
      '<linearGradient id="sldWatch" x1="0" x2="1"><stop offset="0" stop-color="#d4af31"/><stop offset="1" stop-color="#ffd24d"/></linearGradient>',
      '<linearGradient id="sldRisk" x1="0" x2="1"><stop offset="0" stop-color="#d7403b"/><stop offset="1" stop-color="#ff5b50"/></linearGradient>',
      '</defs>',

      '<path class="sld-gauge-ghost" d="' + arc(0, 100, r + 2) + '"/>',
      '<path class="sld-gauge-shadow healthy" d="' + arc(0, healthyEnd, r) + '"/>',
      '<path class="sld-gauge-shadow watch" d="' + arc(healthyEnd, watchEnd, r) + '"/>',
      '<path class="sld-gauge-shadow risk" d="' + arc(watchEnd, 100, r) + '"/>',

      '<path class="sld-gauge-band healthy" d="' + arc(0, healthyEnd, r - 14) + '"/>',
      '<path class="sld-gauge-band watch" d="' + arc(healthyEnd, watchEnd, r - 14) + '"/>',
      '<path class="sld-gauge-band risk" d="' + arc(watchEnd, 100, r - 14) + '"/>',

      '<path class="sld-gauge-inner" d="' + arc(0, 100, r - 58) + '"/>',

      '<line class="sld-needle" x1="' + cx + '" y1="' + cy + '" x2="' + needleEnd.x.toFixed(1) + '" y2="' + needleEnd.y.toFixed(1) + '" filter="url(#sldNeedleGlow)"/>',
      '<circle class="sld-needle-tip" cx="' + needleEnd.x.toFixed(1) + '" cy="' + needleEnd.y.toFixed(1) + '" r="7" fill="' + statusColor + '"/>',
      '<circle class="sld-needle-hub" cx="' + cx + '" cy="' + cy + '" r="10"/>',
      '<circle class="sld-needle-hub-core" cx="' + cx + '" cy="' + cy + '" r="4"/>',

      '<text class="sld-zone-label" x="132" y="169" text-anchor="middle">HEALTHY</text>',
      '<text class="sld-zone-label" x="320" y="101" text-anchor="middle">WATCH</text>',
      '<text class="sld-zone-label" x="508" y="169" text-anchor="middle">RISK</text>',

      '<text class="sld-zone-sub" x="132" y="187" text-anchor="middle">0-8 mm</text>',
      '<text class="sld-zone-sub" x="320" y="119" text-anchor="middle">8-18 mm</text>',
      '<text class="sld-zone-sub" x="508" y="187" text-anchor="middle">&gt;18 mm</text>',

      '<text class="sld-axis-label" x="106" y="256" text-anchor="middle">0 mm</text>',
      '<text class="sld-axis-label" x="248" y="74" text-anchor="middle">8 mm</text>',
      '<text class="sld-axis-label" x="390" y="74" text-anchor="middle">18 mm</text>',
      '<text class="sld-axis-label" x="534" y="256" text-anchor="middle">40 mm</text>',
      '<text class="sld-band-label" x="320" y="54" text-anchor="middle">Preferred planning band</text>',

      '<g class="sld-reading-box">',
      '<rect x="446" y="62" width="134" height="62" rx="10"/>',
      '<text x="466" y="91" class="sld-reading-value">' + h(readingText || String(value)) + '</text>',
      '<text x="466" y="112" class="sld-reading-label">CURRENT READING</text>',
      '</g>',
      '</svg>'
    ].join("");
  }

  function injectStyles() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".sld-card{margin-top:16px;border:1px solid rgba(106,255,151,.16);border-radius:18px;background:linear-gradient(180deg,rgba(4,13,10,.99),rgba(2,7,6,.995));box-shadow:0 26px 80px rgba(0,0,0,.40),inset 0 1px 0 rgba(255,255,255,.055);overflow:hidden;color:rgba(255,255,255,.88);font-family:inherit}",
      ".sld-head{display:grid;grid-template-columns:150px minmax(0,1fr) 310px 110px;border-bottom:1px solid rgba(255,255,255,.085);background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.018))}",
      ".sld-brand,.sld-title,.sld-meta,.sld-badge{min-width:0;padding:12px 14px;border-right:1px solid rgba(255,255,255,.075)}",
      ".sld-brand{display:flex;align-items:center;gap:9px;font-weight:950;color:#fff;letter-spacing:.01em}",
      ".sld-mark{width:18px;height:18px;border-radius:6px;display:inline-grid;place-items:center;background:linear-gradient(135deg,#7eff99,#42c96f);color:#08120b;font-weight:950;font-size:.78rem}",
      ".sld-kicker{color:rgba(126,255,164,.86);font-size:.64rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}",
      ".sld-title h3{margin:4px 0 0;color:#fff;font-size:1rem;line-height:1.18;font-weight:950;white-space:normal}",
      ".sld-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}",
      ".sld-meta .k{color:rgba(255,255,255,.45);font-size:.61rem;font-weight:950;letter-spacing:.09em;text-transform:uppercase}",
      ".sld-meta .v{margin-top:3px;color:rgba(255,255,255,.84);font-size:.72rem;font-weight:850;line-height:1.15}",
      ".sld-badge{display:grid;place-items:center;border-right:0}.sld-pro{border:1px solid rgba(255,218,88,.36);border-radius:10px;padding:7px 10px;color:#ffe07a;background:rgba(255,218,88,.075);font-size:.66rem;font-weight:950;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap}",

      ".sld-grid{display:grid;grid-template-columns:178px minmax(0,1fr) 278px;gap:8px;padding:8px}",
      ".sld-panel{border:1px solid rgba(255,255,255,.085);border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.042),rgba(255,255,255,.018));box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}",
      ".sld-rail,.sld-main,.sld-guidance,.sld-bottom{padding:11px}",

      ".sld-status{display:inline-flex;border-radius:8px;padding:7px 11px;min-width:84px;margin:8px 0 10px;justify-content:center;font-size:.71rem;font-weight:950;letter-spacing:.10em;text-transform:uppercase;border:1px solid rgba(255,255,255,.14)}",
      ".sld-status.healthy{color:#95ffba;background:rgba(52,255,139,.12);border-color:rgba(52,255,139,.30)}.sld-status.watch{color:#ffd56e;background:rgba(255,197,70,.12);border-color:rgba(255,197,70,.30)}.sld-status.risk{color:#ff9a92;background:rgba(255,82,70,.13);border-color:rgba(255,82,70,.36)}",
      ".sld-copy{color:rgba(255,255,255,.70);font-size:.78rem;line-height:1.5;margin:0}",
      ".sld-block{border-top:1px solid rgba(255,255,255,.075);margin-top:11px;padding-top:11px}",
      ".sld-big{color:#ff8f87;font-size:.98rem;font-weight:950;margin-top:5px}.sld-good{color:#89ffad;font-size:.82rem;font-weight:900;line-height:1.35;margin-top:5px}.sld-driver{color:rgba(255,255,255,.82);font-size:.76rem;line-height:1.42;margin-top:5px}",
      ".sld-section-map{display:grid;gap:5px;margin-top:8px}.sld-section{border:1px solid rgba(120,255,157,.13);border-radius:7px;background:rgba(255,255,255,.028);color:rgba(255,255,255,.74);padding:6px 8px;font-size:.69rem;font-weight:850;cursor:pointer;text-align:left;line-height:1.2}.sld-section:hover,.sld-section.is-active{background:rgba(72,255,141,.12);border-color:rgba(72,255,141,.34);color:#fff}",

      ".sld-main{min-width:0}.sld-main-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px}.sld-main h4{margin:3px 0 0;color:#fff;font-size:.98rem;font-weight:950}",
      ".sld-pressure{color:#82ffa3;font-size:.67rem;font-weight:950;letter-spacing:.11em;text-transform:uppercase;white-space:nowrap}",
      ".sld-gauge-wrap{position:relative;border-radius:13px;background:radial-gradient(circle at 50% 78%,rgba(255,255,255,.045),transparent 36%),linear-gradient(180deg,rgba(0,0,0,.20),rgba(0,0,0,.10));border:1px solid rgba(255,255,255,.065);padding:4px 8px 0;overflow:hidden}",
      ".sld-gauge{display:block;width:100%;height:auto;min-height:230px;overflow:visible}",
      ".sld-gauge-ghost{fill:none;stroke:rgba(255,255,255,.05);stroke-width:50;stroke-linecap:round}",
      ".sld-gauge-shadow{fill:none;stroke-width:46;stroke-linecap:butt;opacity:.30}.sld-gauge-shadow.healthy{stroke:#72ff72;stroke-linecap:round}.sld-gauge-shadow.watch{stroke:#ffd24d}.sld-gauge-shadow.risk{stroke:#ff5b50;stroke-linecap:round}.sld-gauge-band{fill:none;stroke-width:30;stroke-linecap:butt}.sld-gauge-band.healthy{stroke:url(#sldHealthy);stroke-linecap:round}.sld-gauge-band.watch{stroke:url(#sldWatch)}.sld-gauge-band.risk{stroke:url(#sldRisk);stroke-linecap:round}",
      ".sld-gauge-inner{fill:none;stroke:rgba(255,255,255,.13);stroke-width:1;stroke-dasharray:4 7}.sld-needle{stroke:rgba(255,255,255,.9);stroke-width:5;stroke-linecap:round}.sld-needle-tip{stroke:#fff;stroke-width:2}.sld-needle-hub{fill:rgba(255,255,255,.94)}.sld-needle-hub-core{fill:rgba(4,12,9,.92)}",
      ".sld-zone-label{font-size:10px;fill:rgba(255,255,255,.82);font-weight:950;letter-spacing:.07em}.sld-zone-sub{font-size:9px;fill:rgba(255,255,255,.62);font-weight:850}.sld-axis-label{font-size:9px;fill:rgba(255,255,255,.58);font-weight:850}.sld-band-label{font-size:9px;fill:rgba(255,255,255,.64);font-weight:900}",
      ".sld-reading-box rect{fill:rgba(3,8,7,.9);stroke:rgba(255,95,88,.68);stroke-width:1}.sld-reading-value{fill:#fff;font-size:18px;font-weight:950}.sld-reading-label{fill:rgba(255,255,255,.58);font-size:8px;font-weight:950;letter-spacing:.08em}",

      ".sld-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:8px}.sld-metric{border:1px solid rgba(255,255,255,.075);border-radius:10px;background:rgba(255,255,255,.028);padding:9px;min-height:60px}.sld-metric .k{color:rgba(255,255,255,.50);font-size:.62rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.sld-metric .v{color:rgba(255,255,255,.92);font-size:.82rem;font-weight:950;margin-top:5px;line-height:1.2}",
      ".sld-interpret{margin-top:8px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.075);background:rgba(0,0,0,.12)}.sld-interpret h4,.sld-guidance h4,.sld-bottom h4{margin:0 0 7px;color:#fff;font-size:.81rem;font-weight:950}",

      ".sld-guide-section{padding:11px 0;border-top:1px solid rgba(255,255,255,.075)}.sld-guide-section:first-child{border-top:0;padding-top:0}.sld-guide-section.why h4{color:#ff8f87}.sld-guide-section.drivers h4{color:#ffd56e}.sld-guide-section.actions h4,.sld-guide-section.target h4{color:#89ffad}",
      ".sld-list{margin:0;padding-left:17px;color:rgba(255,255,255,.72);font-size:.75rem;line-height:1.5}.sld-list li+li{margin-top:3px}",

      ".sld-bottom-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 8px 8px}.sld-bottom{min-height:104px}.sld-flow{display:grid;gap:4px;font-size:.71rem}.sld-flow-row{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(255,255,255,.055);padding-bottom:4px}.sld-flow-row span{color:rgba(255,255,255,.52)}.sld-flow-row strong{color:rgba(255,255,255,.86);font-weight:900;text-align:right}",

      ".sld-detail{margin:0 8px 8px;padding:12px}.sld-detail[hidden]{display:none!important}.sld-detail h4{margin:0 0 8px;color:#fff;font-size:.88rem}.sld-detail p{margin:0;color:rgba(255,255,255,.74);line-height:1.58;font-size:.8rem}",

      ".sld-foot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.085);background:rgba(255,255,255,.020)}.sld-foot-tile{padding:10px 12px;border-right:1px solid rgba(255,255,255,.075)}.sld-foot-tile:last-child{border-right:0}.sld-foot-tile .k{color:rgba(255,255,255,.46);font-size:.62rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.sld-foot-tile .v{color:rgba(255,255,255,.82);font-size:.72rem;line-height:1.35;margin-top:3px;font-weight:800}",

      "@media(max-width:1100px){.sld-head{grid-template-columns:150px minmax(0,1fr)}.sld-meta{grid-column:1/-1;border-top:1px solid rgba(255,255,255,.075);border-right:0}.sld-badge{position:absolute;right:14px;top:12px;padding:0;border-right:0}.sld-grid{grid-template-columns:190px minmax(0,1fr)}.sld-guidance{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}.sld-guide-section:nth-child(2){border-top:0;padding-top:0}.sld-bottom-grid,.sld-foot{grid-template-columns:repeat(2,minmax(0,1fr))}}",
      "@media(max-width:760px){.sld-head,.sld-grid,.sld-guidance,.sld-bottom-grid,.sld-foot,.sld-meta,.sld-metrics{grid-template-columns:1fr}.sld-brand,.sld-title,.sld-meta,.sld-badge,.sld-foot-tile{border-right:0;border-bottom:1px solid rgba(255,255,255,.075)}.sld-badge{position:static;place-items:start}.sld-gauge{min-height:160px}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function render(options = {}) {
    injectStyles();

    const target = typeof options.target === "string"
      - document.querySelector(options.target)
      : options.target || document.querySelector("#diagnostic-panel");

    if (!target) return null;

    const data = options.data || window.ScopedLabsDiagnosticData || window.ScopedLabsExportData || {};
    const status = statusOf(options.status || data.status);
    const statusClass = status.toLowerCase();
    const gauge = options.gauge || data.gauge || {};
    const max = Number(gauge.max || 100);
    const score = clamp(gauge.score ?? gauge.value ?? 0, 0, max);
    const metrics = arr(options.keyMetrics || data.keyResults);

    const first = metrics[0] || { label: gauge.markerLabel || "Current Reading", value: gauge.displayValue || String(score) };
    const second = metrics[1] || { label: "Planning Context", value: "Planning range" };
    const third = metrics[2] || { label: "Report Data", value: status };

    const sections = [
      section("Why this status?", data.whyThisStatus || options.summary || ""),
      section("Likely drivers", data.likelyDrivers || []),
      section("Possible planning actions", data.possiblePlanningActions || []),
      section("Follow-up checks", data.followUpChecks || []),
      section("Input assumptions", data.inputAssumptions || data.assumptions || []),
      section("Revision triggers", data.revisionTriggers || []),
      section("Planning limitations", data.planningLimitations || []),
      section("What this does not prove", data.whatThisDoesNotProve || [])
    ].filter((item) => item && (item.body || arr(item.items).length));

    const title = options.title || data.toolLabel || "Planning Diagnostic";
    const headline = data.resultSummary || data.statusSummary?.headline || "Planning diagnostic captured.";
    const summary = options.summary || data.whyThisStatus || data.statusSummary?.detail || "";
    const targetLabel = data.healthyTarget || data.statusSummary?.healthyTarget || "Preferred planning band";
    const reportId = (window.ScopedLabsExportConfig?.reportPrefix || "SL-REPORT") + "-001";
    const project = document.querySelector("#projectName")?.value || "Planning Review";
    const date = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

    target.hidden = false;
    target.innerHTML =
      '<div class="sld-card">' +
        '<div class="sld-head">' +
          '<div class="sld-brand"><span class="sld-mark">S</span><span>ScopedLabs</span></div>' +
          '<div class="sld-title"><div class="sld-kicker">' + h(title) + '</div><h3>' + h(headline) + '</h3></div>' +
          '<div class="sld-meta">' +
            '<div><div class="k">Report ID</div><div class="v">' + h(reportId) + '</div></div>' +
            '<div><div class="k">Date</div><div class="v">' + h(date) + '</div></div>' +
            '<div><div class="k">Project</div><div class="v">' + h(project) + '</div></div>' +
          '</div>' +
          '<div class="sld-badge"><span class="sld-pro">Pro Report</span></div>' +
        '</div>' +

        '<div class="sld-grid">' +
          '<aside class="sld-panel sld-rail">' +
            '<div class="sld-kicker">Status Summary</div>' +
            '<div class="sld-status ' + statusClass + '">' + h(status) + '</div>' +
            '<p class="sld-copy">' + h(summary) + '</p>' +
            '<div class="sld-block"><div class="sld-kicker">Key Result</div><div class="sld-big">' + h(first.value) + '</div></div>' +
            '<div class="sld-block"><div class="sld-kicker">Healthy Target</div><div class="sld-good">' + h(targetLabel) + '</div></div>' +
            '<div class="sld-block"><div class="sld-kicker">Primary Driver</div><div class="sld-driver">' + h(data.dominantDriver?.label || options.dominantDriver?.label || "Primary constraint") + '</div></div>' +
            '<div class="sld-block"><div class="sld-kicker">Report Sections</div><div class="sld-section-map">' +
              sections.slice(0, 8).map((item, index) => '<button class="sld-section" type="button" data-diagnostic-section="' + index + '">' + h(index + 1) + ". " + h(item.label) + '</button>').join("") +
            '</div></div>' +
          '</aside>' +

          '<section class="sld-panel sld-main">' +
            '<div class="sld-main-head"><div><div class="sld-kicker">Results Overview</div><h4>' + h(gauge.label || "Diagnostic Pressure") + '</h4></div><div class="sld-pressure">' + h(Math.round(score) + " / " + Math.round(max)) + ' pressure</div></div>' +
            '<div class="sld-gauge-wrap">' + gaugeSvg(score, max, status, gauge.displayValue || first.value) + '</div>' +
            '<div class="sld-metrics">' +
              metrics.slice(0, 3).map((item) => '<div class="sld-metric"><div class="k">' + h(item.label) + '</div><div class="v">' + h(item.value) + '</div></div>').join("") +
              '<div class="sld-metric"><div class="k">Status</div><div class="v">' + h(status) + '</div></div>' +
            '</div>' +
            '<div class="sld-interpret"><h4>Engineering Interpretation</h4><p class="sld-copy">' + h(summary) + '</p></div>' +
          '</section>' +

          '<aside class="sld-panel sld-guidance">' +
            '<div class="sld-guide-section why"><div class="sld-kicker">Corrective Guidance / Path to Healthy</div><h4>Why this status</h4>' + body(sections[0]) + '</div>' +
            '<div class="sld-guide-section drivers"><h4>Likely drivers</h4>' + list(data.likelyDrivers, 4) + '</div>' +
            '<div class="sld-guide-section actions"><h4>Possible planning actions</h4>' + list(data.possiblePlanningActions, 5) + '</div>' +
            '<div class="sld-guide-section target"><h4>Healthy Target</h4><p class="sld-copy">' + h(targetLabel) + '</p></div>' +
          '</aside>' +
        '</div>' +

        '<div class="sld-bottom-grid">' +
          '<div class="sld-panel sld-bottom"><h4>Follow-up Checks</h4>' + list(data.followUpChecks, 4) + '</div>' +
          '<div class="sld-panel sld-bottom"><h4>Revision Triggers</h4>' + list(data.revisionTriggers, 4) + '</div>' +
          '<div class="sld-panel sld-bottom"><h4>Flow Summary Data</h4>' + flowRows(data.flowOutputs) + '</div>' +
          '<div class="sld-panel sld-bottom"><h4>Report Notes</h4><p class="sld-copy">This is a planning and decision-support report. Final design should be validated with site conditions and manufacturer data.</p></div>' +
        '</div>' +

        '<div class="sld-panel sld-detail" data-diagnostic-detail hidden></div>' +

        '<div class="sld-foot">' +
          '<div class="sld-foot-tile"><div class="k">Tool</div><div class="v">' + h(data.toolLabel || title) + '</div></div>' +
          '<div class="sld-foot-tile"><div class="k">Category</div><div class="v">' + h(data.category || "Physical Security") + '</div></div>' +
          '<div class="sld-foot-tile"><div class="k">Pipeline</div><div class="v">Design & Layout</div></div>' +
          '<div class="sld-foot-tile"><div class="k">Next Step</div><div class="v">Face Recognition Range</div></div>' +
        '</div>' +
      '</div>';

    const detail = target.querySelector("[data-diagnostic-detail]");
    const chips = Array.from(target.querySelectorAll("[data-diagnostic-section]"));

    function openSection(index) {
      const item = sections[index];
      if (!item || !detail) return;
      chips.forEach((chip) => chip.classList.remove("is-active"));
      chips[index]?.classList.add("is-active");
      detail.hidden = false;
      detail.innerHTML = '<h4>' + h(item.label) + '</h4>' + body(item);
    }

    chips.forEach((chip) => {
      chip.addEventListener("click", () => openSection(Number(chip.dataset.diagnosticSection)));
    });

    if (sections.length) openSection(0);

    return { openSection };
  }

  function clear(target = "#diagnostic-panel") {
    const el = typeof target === "string" - document.querySelector(target) : target;
    if (!el) return;
    el.hidden = true;
    el.innerHTML = "";
  }

  const api = { render, clear };
  window.ScopedLabsDiagnosticDashboard = api;
  window.ScopedLabsDiagnostic = api;
})();