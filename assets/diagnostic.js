(() => {
  "use strict";

  const STYLE_ID = "scopedlabs-diagnostic-v3-styles";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function normalizeStatus(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "RISK") return "RISK";
    if (raw === "WATCH") return "WATCH";
    return "HEALTHY";
  }

  function statusClass(value) {
    return normalizeStatus(value).toLowerCase();
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".slx-report {",
      "  margin-top: 18px;",
      "  border: 1px solid rgba(112,255,157,.18);",
      "  border-radius: 24px;",
      "  overflow: hidden;",
      "  background:",
      "    radial-gradient(circle at 20% 0%, rgba(73,255,137,.16), transparent 32%),",
      "    radial-gradient(circle at 92% 0%, rgba(255,79,67,.11), transparent 28%),",
      "    linear-gradient(180deg, rgba(7,20,15,.99), rgba(3,10,8,.99));",
      "  box-shadow: 0 28px 80px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.05);",
      "}",
      ".slx-header {",
      "  display: grid;",
      "  grid-template-columns: minmax(0,1fr) auto;",
      "  gap: 16px;",
      "  align-items: start;",
      "  padding: 18px 20px;",
      "  border-bottom: 1px solid rgba(255,255,255,.08);",
      "  background: rgba(0,0,0,.22);",
      "}",
      ".slx-brandline {",
      "  color: rgba(145,255,179,.86);",
      "  font-size: .72rem;",
      "  font-weight: 950;",
      "  letter-spacing: .14em;",
      "  text-transform: uppercase;",
      "}",
      ".slx-title {",
      "  margin: 6px 0 0;",
      "  color: rgba(255,255,255,.98);",
      "  font-size: 1.28rem;",
      "  line-height: 1.15;",
      "  letter-spacing: .01em;",
      "}",
      ".slx-summary {",
      "  margin: 9px 0 0;",
      "  max-width: 880px;",
      "  color: rgba(255,255,255,.70);",
      "  line-height: 1.55;",
      "}",
      ".slx-status {",
      "  border-radius: 999px;",
      "  padding: 10px 15px;",
      "  font-size: .78rem;",
      "  font-weight: 950;",
      "  letter-spacing: .11em;",
      "  text-transform: uppercase;",
      "  border: 1px solid rgba(255,255,255,.15);",
      "  white-space: nowrap;",
      "}",
      ".slx-status.healthy { color:#95ffba; background:rgba(52,255,139,.13); border-color:rgba(52,255,139,.34); }",
      ".slx-status.watch { color:#ffd56e; background:rgba(255,197,70,.13); border-color:rgba(255,197,70,.34); }",
      ".slx-status.risk { color:#ff9a92; background:rgba(255,82,70,.14); border-color:rgba(255,82,70,.40); }",
      ".slx-body {",
      "  display: grid;",
      "  grid-template-columns: 210px minmax(0,1fr) 300px;",
      "  gap: 14px;",
      "  padding: 16px;",
      "}",
      ".slx-panel {",
      "  border: 1px solid rgba(255,255,255,.10);",
      "  border-radius: 18px;",
      "  background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.028));",
      "  box-shadow: inset 0 1px 0 rgba(255,255,255,.035);",
      "}",
      ".slx-rail { padding: 15px; }",
      ".slx-section-label {",
      "  color: rgba(145,255,179,.82);",
      "  font-size: .70rem;",
      "  font-weight: 950;",
      "  letter-spacing: .11em;",
      "  text-transform: uppercase;",
      "}",
      ".slx-big-status {",
      "  margin-top: 10px;",
      "  border-radius: 16px;",
      "  padding: 13px 14px;",
      "  font-size: 1.12rem;",
      "  font-weight: 950;",
      "  letter-spacing: .08em;",
      "  text-align: center;",
      "  text-transform: uppercase;",
      "}",
      ".slx-big-status.healthy { color:#061009; background:linear-gradient(90deg,#75ff9f,#34e977); }",
      ".slx-big-status.watch { color:#171103; background:linear-gradient(90deg,#ffe08a,#ffbd43); }",
      ".slx-big-status.risk { color:#fff; background:linear-gradient(90deg,#e8423b,#a82325); }",
      ".slx-rail-note {",
      "  margin: 13px 0 0;",
      "  color: rgba(255,255,255,.68);",
      "  font-size: .86rem;",
      "  line-height: 1.5;",
      "}",
      ".slx-rail-divider { height:1px; background:rgba(255,255,255,.09); margin:14px 0; }",
      ".slx-key-mini { margin-top: 10px; }",
      ".slx-key-mini .k { color:rgba(255,255,255,.56); font-size:.72rem; margin-bottom:4px; }",
      ".slx-key-mini .v { color:#fff; font-weight:950; line-height:1.25; }",
      ".slx-gauge-panel { padding: 16px; min-height: 370px; }",
      ".slx-gauge-top {",
      "  display: grid;",
      "  grid-template-columns: minmax(0,1fr) auto;",
      "  gap: 12px;",
      "  align-items: start;",
      "}",
      ".slx-gauge-name { color:rgba(255,255,255,.70); font-weight:900; }",
      ".slx-reading-pill {",
      "  border: 1px solid rgba(255,255,255,.13);",
      "  border-radius: 14px;",
      "  padding: 10px 13px;",
      "  background: rgba(0,0,0,.24);",
      "  text-align: right;",
      "}",
      ".slx-reading-pill .v { color:#fff; font-size:1.45rem; font-weight:950; line-height:1; }",
      ".slx-reading-pill .k { color:rgba(255,255,255,.58); font-size:.72rem; margin-top:5px; text-transform:uppercase; letter-spacing:.08em; }",
      ".slx-arc-zone {",
      "  position: relative;",
      "  margin: 18px auto 10px;",
      "  width: min(100%, 590px);",
      "  height: 255px;",
      "}",
      ".slx-arc {",
      "  position: absolute;",
      "  left: 5%;",
      "  right: 5%;",
      "  bottom: 18px;",
      "  height: 220px;",
      "  border-radius: 260px 260px 0 0;",
      "  background: conic-gradient(from 240deg at 50% 100%, rgba(74,240,113,.95) 0deg, rgba(74,240,113,.95) 60deg, rgba(255,206,72,.96) 60deg, rgba(255,206,72,.96) 145deg, rgba(255,83,73,.96) 145deg, rgba(255,83,73,.96) 240deg, transparent 240deg, transparent 360deg);",
      "  box-shadow: 0 0 32px rgba(83,255,143,.10), inset 0 0 0 1px rgba(255,255,255,.13);",
      "}",
      ".slx-arc::after {",
      "  content: '';",
      "  position: absolute;",
      "  left: 12%;",
      "  right: 12%;",
      "  bottom: -1px;",
      "  height: 160px;",
      "  border-radius: 220px 220px 0 0;",
      "  background: linear-gradient(180deg, rgba(4,13,10,1), rgba(3,10,8,1));",
      "  box-shadow: inset 0 1px 0 rgba(255,255,255,.07);",
      "}",
      ".slx-needle-wrap {",
      "  position: absolute;",
      "  left: 50%;",
      "  bottom: 22px;",
      "  width: 0;",
      "  height: 0;",
      "  transform: rotate(var(--slx-angle));",
      "  transform-origin: bottom center;",
      "  z-index: 5;",
      "}",
      ".slx-needle {",
      "  position: absolute;",
      "  left: -4px;",
      "  bottom: 0;",
      "  width: 8px;",
      "  height: 145px;",
      "  border-radius: 999px;",
      "  background: linear-gradient(180deg, #fff, rgba(255,255,255,.70));",
      "  box-shadow: 0 0 18px rgba(255,255,255,.45);",
      "}",
      ".slx-hub {",
      "  position: absolute;",
      "  left: 50%;",
      "  bottom: 9px;",
      "  width: 46px;",
      "  height: 46px;",
      "  transform: translateX(-50%);",
      "  border-radius: 50%;",
      "  border: 2px solid rgba(255,255,255,.26);",
      "  background: radial-gradient(circle, #fff 0 13%, #1b2f24 15% 100%);",
      "  z-index: 6;",
      "}",
      ".slx-arc-labels {",
      "  position: absolute;",
      "  left: 7%;",
      "  right: 7%;",
      "  bottom: 44px;",
      "  display: grid;",
      "  grid-template-columns: repeat(3, 1fr);",
      "  z-index: 7;",
      "  font-size: .78rem;",
      "  font-weight: 950;",
      "  letter-spacing: .08em;",
      "  text-transform: uppercase;",
      "}",
      ".slx-arc-labels span:nth-child(1) { color:#a8ffbf; text-align:left; }",
      ".slx-arc-labels span:nth-child(2) { color:#ffd56e; text-align:center; }",
      ".slx-arc-labels span:nth-child(3) { color:#ff9b92; text-align:right; }",
      ".slx-center-readout {",
      "  position:absolute;",
      "  left:50%;",
      "  bottom:54px;",
      "  transform:translateX(-50%);",
      "  z-index:8;",
      "  text-align:center;",
      "}",
      ".slx-center-readout .v { color:#fff; font-size:2.1rem; font-weight:950; line-height:1; }",
      ".slx-center-readout .k { color:rgba(255,255,255,.62); font-size:.72rem; margin-top:6px; letter-spacing:.08em; text-transform:uppercase; }",
      ".slx-metrics {",
      "  display:grid;",
      "  grid-template-columns: repeat(3, minmax(0,1fr));",
      "  gap:10px;",
      "}",
      ".slx-metric {",
      "  border:1px solid rgba(255,255,255,.09);",
      "  border-radius:15px;",
      "  background:rgba(0,0,0,.22);",
      "  padding:12px;",
      "  min-height:74px;",
      "}",
      ".slx-metric .k { color:rgba(255,255,255,.56); font-size:.74rem; margin-bottom:6px; }",
      ".slx-metric .v { color:#fff; font-weight:950; line-height:1.25; }",
      ".slx-guidance { padding: 15px; }",
      ".slx-driver-title { margin:8px 0 8px; color:#fff; font-size:1.03rem; line-height:1.25; }",
      ".slx-driver-copy { margin:0; color:rgba(255,255,255,.72); line-height:1.58; }",
      ".slx-chip-grid { display:flex; flex-wrap:wrap; gap:8px; margin-top:15px; }",
      ".slx-chip {",
      "  border:1px solid rgba(120,255,157,.22);",
      "  border-radius:999px;",
      "  background:rgba(255,255,255,.06);",
      "  color:rgba(255,255,255,.90);",
      "  padding:8px 11px;",
      "  font-size:.80rem;",
      "  font-weight:950;",
      "  cursor:pointer;",
      "}",
      ".slx-chip:hover, .slx-chip.is-active { background:rgba(72,255,141,.16); border-color:rgba(72,255,141,.45); color:#fff; }",
      ".slx-detail { margin: 0 16px 16px; padding: 15px; }",
      ".slx-detail[hidden] { display:none !important; }",
      ".slx-detail h4 { margin:0 0 9px; color:#fff; font-size:1rem; }",
      ".slx-detail p { margin:0; color:rgba(255,255,255,.74); line-height:1.65; }",
      ".slx-detail ul { margin:0; padding-left:19px; color:rgba(255,255,255,.74); line-height:1.75; }",
      ".slx-detail li + li { margin-top:3px; }",
      ".slx-footer {",
      "  display:grid;",
      "  grid-template-columns: repeat(3, minmax(0,1fr));",
      "  gap:10px;",
      "  padding: 0 16px 16px;",
      "}",
      ".slx-foot {",
      "  border:1px solid rgba(255,255,255,.08);",
      "  border-radius:14px;",
      "  background:rgba(255,255,255,.035);",
      "  padding:11px;",
      "}",
      ".slx-foot .k { color:rgba(145,255,179,.78); font-size:.70rem; font-weight:950; letter-spacing:.08em; text-transform:uppercase; margin-bottom:5px; }",
      ".slx-foot .v { color:rgba(255,255,255,.74); font-size:.85rem; line-height:1.45; }",
      "@media (max-width: 1050px) {",
      "  .slx-body { grid-template-columns: 1fr; }",
      "  .slx-footer { grid-template-columns:1fr; }",
      "  .slx-arc-zone { height: 220px; }",
      "  .slx-needle { height: 118px; }",
      "}",
      "@media (max-width: 720px) {",
      "  .slx-header { grid-template-columns:1fr; }",
      "  .slx-metrics { grid-template-columns:1fr; }",
      "  .slx-reading-pill { text-align:left; }",
      "}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function renderList(items) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) return "<p>No detail available.</p>";
    return "<ul>" + list.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
  }

  function renderDetailBody(section) {
    if (!section) return "<p>No detail available.</p>";
    if (Array.isArray(section.items)) return renderList(section.items);
    return "<p>" + escapeHtml(section.body || "") + "</p>";
  }

  function renderMetricCards(items) {
    const list = Array.isArray(items) ? items.filter(Boolean).slice(0, 3) : [];
    return list.map((item) => {
      return [
        "<div class=\"slx-metric\">",
        "  <div class=\"k\">" + escapeHtml(item.label) + "</div>",
        "  <div class=\"v\">" + escapeHtml(item.value) + "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function render(options) {
    injectStyles();

    const settings = options || {};
    const target =
      typeof settings.target === "string"
        ? document.querySelector(settings.target)
        : settings.target || document.querySelector("#diagnostic-panel");

    if (!target) return null;

    const status = normalizeStatus(settings.status);
    const className = statusClass(status);

    const gauge = settings.gauge || {};
    const gaugeMax = Number(gauge.max || 100);
    const score = clamp(gauge.score ?? gauge.value ?? 0, 0, gaugeMax);
    const pct = clamp((score / gaugeMax) * 100, 0, 100);
    const angle = -62 + (pct * 1.24);

    const keyMetrics = Array.isArray(settings.keyMetrics) ? settings.keyMetrics.filter(Boolean) : [];
    const sections = Array.isArray(settings.sections) ? settings.sections.filter(Boolean) : [];

    const firstMetric = keyMetrics[0] || { label: "Current Reading", value: gauge.displayValue || String(score) };
    const secondMetric = keyMetrics[1] || { label: "Planning Context", value: "Gauge position captured" };
    const thirdMetric = keyMetrics[2] || { label: "Status", value: status };

    target.hidden = false;
    target.innerHTML = [
      "<div class=\"slx-report\">",
      "  <div class=\"slx-header\">",
      "    <div>",
      "      <div class=\"slx-brandline\">Diagnostic Planning Report</div>",
      "      <h3 class=\"slx-title\">" + escapeHtml(settings.title || "Planning Diagnostic") + "</h3>",
      "      <p class=\"slx-summary\">" + escapeHtml(settings.summary || "") + "</p>",
      "    </div>",
      "    <div class=\"slx-status " + className + "\">" + escapeHtml(status) + "</div>",
      "  </div>",
      "",
      "  <div class=\"slx-body\">",
      "    <aside class=\"slx-panel slx-rail\">",
      "      <div class=\"slx-section-label\">Status Summary</div>",
      "      <div class=\"slx-big-status " + className + "\">" + escapeHtml(status) + "</div>",
      "      <p class=\"slx-rail-note\">" + escapeHtml(settings.summary || "Diagnostic status generated from the current planning inputs.") + "</p>",
      "      <div class=\"slx-rail-divider\"></div>",
      "      <div class=\"slx-key-mini\"><div class=\"k\">" + escapeHtml(firstMetric.label) + "</div><div class=\"v\">" + escapeHtml(firstMetric.value) + "</div></div>",
      "      <div class=\"slx-key-mini\"><div class=\"k\">" + escapeHtml(secondMetric.label) + "</div><div class=\"v\">" + escapeHtml(secondMetric.value) + "</div></div>",
      "      <div class=\"slx-key-mini\"><div class=\"k\">" + escapeHtml(thirdMetric.label) + "</div><div class=\"v\">" + escapeHtml(thirdMetric.value) + "</div></div>",
      "    </aside>",
      "",
      "    <main class=\"slx-panel slx-gauge-panel\">",
      "      <div class=\"slx-gauge-top\">",
      "        <div>",
      "          <div class=\"slx-section-label\">Results Overview</div>",
      "          <div class=\"slx-gauge-name\">" + escapeHtml(gauge.label || "Diagnostic Pressure") + "</div>",
      "        </div>",
      "        <div class=\"slx-reading-pill\"><div class=\"v\">" + escapeHtml(gauge.displayValue || String(score)) + "</div><div class=\"k\">" + escapeHtml(gauge.markerLabel || "Current Reading") + "</div></div>",
      "      </div>",
      "      <div class=\"slx-arc-zone\" style=\"--slx-angle:" + angle.toFixed(2) + "deg\">",
      "        <div class=\"slx-arc\"></div>",
      "        <div class=\"slx-needle-wrap\"><div class=\"slx-needle\"></div></div>",
      "        <div class=\"slx-hub\"></div>",
      "        <div class=\"slx-center-readout\"><div class=\"v\">" + escapeHtml(gauge.displayValue || String(score)) + "</div><div class=\"k\">" + escapeHtml(gauge.markerLabel || "Current Reading") + "</div></div>",
      "        <div class=\"slx-arc-labels\"><span>" + escapeHtml(gauge.healthyLabel || "Healthy") + "</span><span>" + escapeHtml(gauge.watchLabel || "Watch") + "</span><span>" + escapeHtml(gauge.riskLabel || "Risk") + "</span></div>",
      "      </div>",
      "      <div class=\"slx-metrics\">" + renderMetricCards(keyMetrics) + "</div>",
      "    </main>",
      "",
      "    <aside class=\"slx-panel slx-guidance\">",
      "      <div class=\"slx-section-label\">Corrective Guidance / Path to Healthy</div>",
      "      <h4 class=\"slx-driver-title\">" + escapeHtml(settings.dominantDriver?.label || "Primary Constraint") + "</h4>",
      "      <p class=\"slx-driver-copy\">" + escapeHtml(settings.dominantDriver?.summary || "") + "</p>",
      "      <div class=\"slx-chip-grid\">" + sections.map((section, index) => {",
      "        return \"<button class=\\\"slx-chip\\\" type=\\\"button\\\" data-diagnostic-section=\\\"\" + index + \"\\\">\" + escapeHtml(section.label) + \"</button>\";",
      "      }).join(\"\") + \"</div>",
      "    </aside>",
      "  </div>",
      "",
      "  <div class=\"slx-panel slx-detail\" data-diagnostic-detail hidden></div>",
      "",
      "  <div class=\"slx-footer\">",
      "    <div class=\"slx-foot\"><div class=\"k\">Tool Page</div><div class=\"v\">Compact diagnostic workspace with expandable detail sections.</div></div>",
      "    <div class=\"slx-foot\"><div class=\"k\">Report Data</div><div class=\"v\">Structured data captured for future PDF reports and snapshots.</div></div>",
      "    <div class=\"slx-foot\"><div class=\"k\">Pipeline Ready</div><div class=\"v\">Flow outputs can feed future full design-flow summaries.</div></div>",
      "  </div>",
      "</div>"
    ].join("");

    const detail = target.querySelector("[data-diagnostic-detail]");
    const chips = Array.from(target.querySelectorAll("[data-diagnostic-section]"));

    function openSection(index) {
      const section = sections[index];
      if (!section || !detail) return;

      chips.forEach((chip) => chip.classList.remove("is-active"));
      if (chips[index]) chips[index].classList.add("is-active");

      detail.hidden = false;
      detail.innerHTML = "<h4>" + escapeHtml(section.label) + "</h4>" + renderDetailBody(section);
    }

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        openSection(Number(chip.dataset.diagnosticSection));
      });
    });

    const pathIndex = sections.findIndex((section) => /path|healthy|guidance/i.test(section.label || ""));
    if (pathIndex >= 0) {
      openSection(pathIndex);
    } else if (sections.length) {
      openSection(0);
    }

    return { openSection };
  }

  function clear(target) {
    const el =
      typeof target === "string"
        ? document.querySelector(target)
        : target || document.querySelector("#diagnostic-panel");

    if (!el) return;

    el.hidden = true;
    el.innerHTML = "";
  }

  window.ScopedLabsDiagnostic = {
    render,
    clear
  };
})();