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
    return Array.isArray(value) ? value.filter(Boolean) : [];
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

    const label = item.label ? String(item.label) : "";
    const value = item.value != null && item.value !== "" ? String(item.value) : "";
    const note = item.note || item.summary || item.body || "";

    if (label && value && note) return label + ": " + value + " ? " + note;
    if (label && value) return label + ": " + value;
    if (label && note) return label + " ? " + note;
    if (value && note) return value + " ? " + note;
    return label || value || String(note || "");
  }

  function list(items, limit) {
    const shown = arr(items).map(normalizeItem).filter(Boolean).slice(0, limit || 99);
    if (!shown.length) return '<p class="sld-copy">No detail captured.</p>';
    return '<ul class="sld-list">' + shown.map((item) => '<li>' + h(item) + '</li>').join("") + '</ul>';
  }

  function body(section) {
    if (!section) return '<p class="sld-copy">No detail captured.</p>';
    if (Array.isArray(section.items)) return list(section.items);
    return '<p class="sld-copy">' + h(section.body || "") + '</p>';
  }

  function section(label, itemsOrBody) {
    if (Array.isArray(itemsOrBody)) return { label, items: itemsOrBody };
    if (itemsOrBody && typeof itemsOrBody === "object") return itemsOrBody;
    return { label, body: String(itemsOrBody || "") };
  }

  function flowRows(flowOutputs) {
    const entries = Object.entries(flowOutputs || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (!entries.length) return '<p class="sld-copy">No flow summary data captured.</p>';

    return '<div class="sld-flow">' + entries.slice(0, 6).map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
      return '<div class="sld-flow-row"><span>' + h(label) + '</span><strong>' + h(value) + '</strong></div>';
    }).join("") + '</div>';
  }

  function gaugeSvg(score, status) {
    const pct = clamp(score, 0, 100);
    const angle = Math.PI - (Math.PI * pct / 100);
    const cx = 250;
    const cy = 205;
    const r = 165;
    const mx = cx + r * Math.cos(angle);
    const my = cy - r * Math.sin(angle);
    const color = status === "RISK" ? "#ff6961" : status === "WATCH" ? "#ffd45c" : "#7dff9a";

    return [
      '<svg class="sld-gauge" viewBox="0 0 500 250" role="img" aria-label="Diagnostic pressure gauge">',
      '<path d="M70 196 A180 180 0 0 1 190 64" fill="none" stroke="rgba(125,255,154,.28)" stroke-width="44" stroke-linecap="round"/>',
      '<path d="M190 64 A180 180 0 0 1 310 64" fill="none" stroke="rgba(255,212,92,.28)" stroke-width="44" stroke-linecap="round"/>',
      '<path d="M310 64 A180 180 0 0 1 430 196" fill="none" stroke="rgba(255,105,97,.30)" stroke-width="44" stroke-linecap="round"/>',
      '<path d="M82 188 A168 168 0 0 1 190 77" fill="none" stroke="#75ff66" stroke-width="24" stroke-linecap="round"/>',
      '<path d="M190 77 A168 168 0 0 1 310 77" fill="none" stroke="#ffd34a" stroke-width="24" stroke-linecap="round"/>',
      '<path d="M310 77 A168 168 0 0 1 418 188" fill="none" stroke="#ff5148" stroke-width="24" stroke-linecap="round"/>',
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + mx.toFixed(1) + '" y2="' + my.toFixed(1) + '" stroke="rgba(255,255,255,.88)" stroke-width="5" stroke-linecap="round"/>',
      '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="8" fill="' + color + '" stroke="#fff" stroke-width="2"/>',
      '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="rgba(255,255,255,.92)"/>',
      '<text x="118" y="150" text-anchor="middle" class="sld-gauge-label">HEALTHY</text>',
      '<text x="250" y="104" text-anchor="middle" class="sld-gauge-label">WATCH</text>',
      '<text x="382" y="150" text-anchor="middle" class="sld-gauge-label">RISK</text>',
      '<text x="74" y="226" text-anchor="middle" class="sld-gauge-small">0</text>',
      '<text x="250" y="72" text-anchor="middle" class="sld-gauge-small">Preferred planning band</text>',
      '<text x="426" y="226" text-anchor="middle" class="sld-gauge-small">100</text>',
      '</svg>'
    ].join("");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".sld-card{margin-top:16px;border:1px solid rgba(120,255,160,.16);border-radius:16px;background:radial-gradient(circle at 18% 0%,rgba(88,255,145,.11),transparent 34%),radial-gradient(circle at 88% 10%,rgba(255,80,70,.10),transparent 30%),linear-gradient(180deg,rgba(4,13,10,.99),rgba(1,7,5,.995));box-shadow:0 26px 80px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.06);overflow:hidden;color:rgba(255,255,255,.88)}",
      ".sld-head{display:grid;grid-template-columns:minmax(170px,.7fr) minmax(0,1.5fr) minmax(260px,1fr) auto;border-bottom:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.026)}",
      ".sld-brand,.sld-title,.sld-meta,.sld-badge{padding:13px 15px;border-right:1px solid rgba(255,255,255,.075)}",
      ".sld-brand{display:flex;align-items:center;gap:9px;font-weight:950;color:#fff}",
      ".sld-mark{width:18px;height:18px;border-radius:6px;display:inline-grid;place-items:center;background:linear-gradient(135deg,#7dff9a,#42c96f);color:#101b12;font-weight:950}",
      ".sld-kicker{color:rgba(145,255,179,.86);font-size:.66rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}",
      ".sld-title h3{margin:4px 0 0;color:#fff;font-size:1rem;line-height:1.2}",
      ".sld-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}",
      ".sld-meta .k{color:rgba(255,255,255,.48);font-size:.64rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}",
      ".sld-meta .v{margin-top:3px;color:rgba(255,255,255,.86);font-size:.75rem;font-weight:800}",
      ".sld-badge{display:grid;place-items:center;border-right:0}.sld-pro{border:1px solid rgba(255,218,88,.34);border-radius:12px;padding:8px 12px;color:#ffe07a;background:rgba(255,218,88,.08);font-size:.72rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}",
      ".sld-grid{display:grid;grid-template-columns:minmax(190px,.78fr) minmax(360px,1.9fr) minmax(270px,1.05fr);gap:10px;padding:10px}",
      ".sld-panel{border:1px solid rgba(255,255,255,.095);border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.048),rgba(255,255,255,.02));box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}",
      ".sld-rail,.sld-main,.sld-guidance,.sld-bottom{padding:12px}",
      ".sld-status{display:inline-flex;border-radius:9px;padding:8px 12px;min-width:92px;margin:8px 0 10px;justify-content:center;font-size:.76rem;font-weight:950;letter-spacing:.10em;text-transform:uppercase;border:1px solid rgba(255,255,255,.16)}",
      ".sld-status.healthy{color:#95ffba;background:rgba(52,255,139,.13);border-color:rgba(52,255,139,.34)}.sld-status.watch{color:#ffd56e;background:rgba(255,197,70,.13);border-color:rgba(255,197,70,.34)}.sld-status.risk{color:#ff9a92;background:rgba(255,82,70,.14);border-color:rgba(255,82,70,.40)}",
      ".sld-copy{color:rgba(255,255,255,.71);font-size:.8rem;line-height:1.48;margin:0}",
      ".sld-block{border-top:1px solid rgba(255,255,255,.08);margin-top:12px;padding-top:12px}",
      ".sld-big{color:#ff8f87;font-size:1rem;font-weight:950;margin-top:5px}.sld-good{color:#8cffad;font-size:.9rem;font-weight:950;margin-top:5px}.sld-driver{color:rgba(255,255,255,.82);font-size:.78rem;line-height:1.45;margin-top:5px}",
      ".sld-section-map{display:grid;gap:6px;margin-top:8px}.sld-section{border:1px solid rgba(120,255,157,.14);border-radius:8px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.76);padding:6px 8px;font-size:.72rem;font-weight:850;cursor:pointer;text-align:left}.sld-section:hover,.sld-section.is-active{background:rgba(72,255,141,.14);border-color:rgba(72,255,141,.38);color:#fff}",
      ".sld-main-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px}.sld-main h4{margin:3px 0 0;color:#fff;font-size:1.02rem}",
      ".sld-gauge-wrap{position:relative;margin-top:4px;border-radius:14px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07);padding:8px 8px 0}.sld-gauge{display:block;width:100%;height:auto;min-height:190px;overflow:visible}.sld-gauge-label{font-size:11px;fill:rgba(255,255,255,.76);font-weight:850}.sld-gauge-small{font-size:10px;fill:rgba(255,255,255,.58);font-weight:800}",
      ".sld-callout{position:absolute;right:22px;top:34px;border:1px solid rgba(255,95,88,.62);border-radius:10px;background:rgba(2,7,6,.84);padding:9px 12px;min-width:104px}.sld-callout .v{color:#fff;font-size:1.08rem;font-weight:950}.sld-callout .k{margin-top:2px;color:rgba(255,255,255,.56);font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}",
      ".sld-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.sld-metric{border:1px solid rgba(255,255,255,.085);border-radius:10px;background:rgba(255,255,255,.032);padding:10px;min-height:64px}.sld-metric .k{color:rgba(255,255,255,.52);font-size:.67rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.sld-metric .v{color:rgba(255,255,255,.92);font-size:.86rem;font-weight:950;margin-top:5px;line-height:1.2}",
      ".sld-interpret{margin-top:10px;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.16)}.sld-interpret h4,.sld-guidance h4,.sld-bottom h4{margin:0 0 7px;color:#fff;font-size:.86rem}",
      ".sld-guide-section{padding:12px 0;border-top:1px solid rgba(255,255,255,.08)}.sld-guide-section:first-child{border-top:0;padding-top:0}.sld-guide-section.why h4{color:#ff8f87}.sld-guide-section.drivers h4{color:#ffd56e}.sld-guide-section.actions h4,.sld-guide-section.target h4{color:#8cffad}",
      ".sld-list{margin:0;padding-left:18px;color:rgba(255,255,255,.72);font-size:.78rem;line-height:1.55}.sld-list li+li{margin-top:3px}",
      ".sld-bottom-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:0 10px 10px}.sld-bottom{min-height:112px}.sld-flow{display:grid;gap:5px;font-size:.75rem}.sld-flow-row{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:4px}.sld-flow-row span{color:rgba(255,255,255,.54)}.sld-flow-row strong{color:rgba(255,255,255,.86);text-align:right}",
      ".sld-detail{margin:0 10px 10px;padding:14px}.sld-detail[hidden]{display:none!important}.sld-detail h4{margin:0 0 8px;color:#fff;font-size:.92rem}.sld-detail p{margin:0;color:rgba(255,255,255,.74);line-height:1.6;font-size:.82rem}",
      ".sld-foot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.022)}.sld-foot-tile{padding:11px 14px;border-right:1px solid rgba(255,255,255,.08)}.sld-foot-tile:last-child{border-right:0}.sld-foot-tile .k{color:rgba(255,255,255,.48);font-size:.66rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.sld-foot-tile .v{color:rgba(255,255,255,.82);font-size:.76rem;line-height:1.35;margin-top:3px}",
      "@media(max-width:1180px){.sld-head,.sld-grid,.sld-bottom-grid,.sld-foot{grid-template-columns:1fr}.sld-brand,.sld-title,.sld-meta,.sld-badge,.sld-foot-tile{border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.sld-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}",
      "@media(max-width:720px){.sld-meta,.sld-metrics{grid-template-columns:1fr}.sld-callout{position:static;margin:8px 0 0}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function render(options = {}) {
    injectStyles();

    const target = typeof options.target === "string"
      ? document.querySelector(options.target)
      : options.target || document.querySelector("#diagnostic-panel");

    if (!target) return null;

    const data = options.data || window.ScopedLabsDiagnosticData || window.ScopedLabsExportData || {};
    const status = statusOf(options.status || data.status);
    const statusClass = status.toLowerCase();
    const gauge = options.gauge || data.gauge || {};
    const score = clamp(gauge.score ?? gauge.value ?? 0, 0, gauge.max || 100);
    const max = Number(gauge.max || 100);
    const pct = clamp((score / max) * 100, 0, 100);
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
            '<div class="sld-main-head"><div><div class="sld-kicker">Results Overview</div><h4>' + h(gauge.label || "Diagnostic Pressure") + '</h4></div><div class="sld-kicker">' + h(Math.round(score) + " / " + Math.round(max)) + ' Pressure</div></div>' +
            '<div class="sld-gauge-wrap">' + gaugeSvg(pct, status) +
              '<div class="sld-callout"><div class="v">' + h(gauge.displayValue || first.value) + '</div><div class="k">Current Reading</div></div>' +
            '</div>' +
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
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    el.hidden = true;
    el.innerHTML = "";
  }

  const api = { render, clear };
  window.ScopedLabsDiagnosticDashboard = api;
  window.ScopedLabsDiagnostic = api;
})();