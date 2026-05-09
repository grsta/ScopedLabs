(() => {
  "use strict";

  const STYLE_ID = "scopedlabs-diagnostic-v2-styles";

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

  function asArray(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function normalizeDetailItem(item) {
    if (item == null) return "";

    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      return String(item);
    }

    if (typeof item === "object") {
      const label = item.label ? String(item.label) : "";
      const value = item.value != null && item.value !== "" ? String(item.value) : "";
      const note = item.note || item.summary || item.body || "";

      if (label && value && note) return `${label}: ${value} - ${note}`;
      if (label && value) return `${label}: ${value}`;
      if (label && note) return `${label} - ${note}`;
      if (value && note) return `${value} - ${note}`;
      if (label) return label;
      if (value) return value;
      if (note) return String(note);
    }

    return String(item);
  }

  function makeSection(label, itemsOrBody, fallbackType = "items") {
    if (Array.isArray(itemsOrBody)) {
      const items = itemsOrBody.map(normalizeDetailItem).filter(Boolean);
      return items.length ? { label, items } : null;
    }

    if (itemsOrBody && typeof itemsOrBody === "object") {
      if (Array.isArray(itemsOrBody.items)) {
        const items = itemsOrBody.items.map(normalizeDetailItem).filter(Boolean);
        return items.length ? { label: itemsOrBody.label || label, items } : null;
      }

      if (itemsOrBody.body) {
        return { label: itemsOrBody.label || label, body: String(itemsOrBody.body) };
      }
    }

    if (itemsOrBody) {
      return fallbackType === "body"
        ? { label, body: String(itemsOrBody) }
        : { label, items: [String(itemsOrBody)] };
    }

    return null;
  }

  function compactSections(sections) {
    const used = new Set();
    return asArray(sections).filter((section) => {
      const label = String(section?.label || "").trim();
      if (!label) return false;
      const key = label.toLowerCase();
      if (used.has(key)) return false;
      used.add(key);
      return true;
    });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .sl-diagnostic-card {
        margin-top: 16px;
        border: 1px solid rgba(112, 255, 161, 0.20);
        border-radius: 24px;
        background:
          radial-gradient(circle at 12% 0%, rgba(83, 255, 143, 0.13), transparent 32%),
          radial-gradient(circle at 96% 5%, rgba(255, 78, 67, 0.10), transparent 30%),
          linear-gradient(180deg, rgba(7, 22, 16, 0.98), rgba(2, 9, 7, 0.99));
        box-shadow:
          0 26px 70px rgba(0, 0, 0, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.055);
        padding: 18px;
        overflow: hidden;
      }

      .sl-diagnostic-top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: start;
        margin-bottom: 16px;
      }

      .sl-kicker {
        color: rgba(145, 255, 179, 0.84);
        font-size: 0.73rem;
        font-weight: 950;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .sl-diagnostic-title {
        margin: 5px 0 0;
        color: rgba(255, 255, 255, 0.97);
        font-size: 1.24rem;
        line-height: 1.15;
      }

      .sl-diagnostic-summary {
        margin: 10px 0 0;
        color: rgba(255, 255, 255, 0.72);
        line-height: 1.56;
        max-width: 900px;
      }

      .sl-status-block {
        display: grid;
        gap: 8px;
        justify-items: end;
      }

      .sl-status-pill {
        border-radius: 999px;
        padding: 9px 14px;
        font-size: 0.78rem;
        font-weight: 950;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        border: 1px solid rgba(255, 255, 255, 0.16);
        white-space: nowrap;
      }

      .sl-status-pill.healthy {
        color: #95ffba;
        background: rgba(52, 255, 139, 0.13);
        border-color: rgba(52, 255, 139, 0.34);
      }

      .sl-status-pill.watch {
        color: #ffd56e;
        background: rgba(255, 197, 70, 0.13);
        border-color: rgba(255, 197, 70, 0.34);
      }

      .sl-status-pill.risk {
        color: #ff9a92;
        background: rgba(255, 82, 70, 0.14);
        border-color: rgba(255, 82, 70, 0.40);
      }

      .sl-status-mini {
        color: rgba(255, 255, 255, 0.52);
        font-size: 0.78rem;
        font-weight: 800;
        text-align: right;
      }

      .sl-diagnostic-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.52fr) minmax(285px, 0.92fr);
        gap: 14px;
      }

      .sl-panel {
        border: 1px solid rgba(255, 255, 255, 0.10);
        border-radius: 19px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.058), rgba(255, 255, 255, 0.028));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
      }

      .sl-gauge-panel {
        padding: 16px;
      }

      .sl-gauge-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: end;
        margin-bottom: 13px;
      }

      .sl-gauge-name {
        color: rgba(255, 255, 255, 0.67);
        font-size: 0.82rem;
        font-weight: 900;
        letter-spacing: 0.03em;
      }

      .sl-gauge-reading {
        color: #ffffff;
        font-size: 1.92rem;
        font-weight: 950;
        line-height: 1;
        margin-top: 3px;
      }

      .sl-gauge-score-label {
        color: rgba(255, 255, 255, 0.58);
        font-size: 0.78rem;
        font-weight: 850;
        margin-top: 6px;
      }

      .sl-gauge-marker-label {
        color: rgba(255, 255, 255, 0.62);
        font-size: 0.78rem;
        font-weight: 850;
        text-align: right;
      }

      .sl-gauge-track-wrap {
        position: relative;
        padding: 18px 0 10px;
      }

      .sl-gauge-track {
        position: relative;
        height: 20px;
        border-radius: 999px;
        background:
          linear-gradient(90deg,
            rgba(61, 244, 126, 0.95) 0%,
            rgba(61, 244, 126, 0.95) 35%,
            rgba(255, 204, 73, 0.94) 35%,
            rgba(255, 204, 73, 0.94) 70%,
            rgba(255, 81, 69, 0.96) 70%,
            rgba(255, 81, 69, 0.96) 100%);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.16),
          0 0 26px rgba(75, 255, 140, 0.08);
      }

      .sl-gauge-track::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0));
        pointer-events: none;
      }

      .sl-gauge-target-band {
        position: absolute;
        top: -7px;
        bottom: -7px;
        border-radius: 999px;
        border: 1px dashed rgba(255, 255, 255, 0.55);
        background: rgba(255, 255, 255, 0.05);
        pointer-events: none;
        z-index: 1;
      }

      .sl-gauge-marker {
        position: absolute;
        top: 50%;
        width: 14px;
        height: 36px;
        border-radius: 999px;
        background: #ffffff;
        border: 3px solid #92ffb7;
        box-shadow:
          0 0 0 4px rgba(146, 255, 183, 0.12),
          0 0 30px rgba(146, 255, 183, 0.82);
        transform: translate(-50%, -50%);
        z-index: 2;
      }

      .sl-gauge-scale {
        display: grid;
        grid-template-columns: 35fr 35fr 30fr;
        gap: 8px;
        margin-top: 10px;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .sl-gauge-scale span:nth-child(1) { color: #96ffb8; }
      .sl-gauge-scale span:nth-child(2) { color: #ffd56e; text-align: center; }
      .sl-gauge-scale span:nth-child(3) { color: #ff9b92; text-align: right; }

      .sl-target-note {
        margin-top: 8px;
        color: rgba(255, 255, 255, 0.58);
        font-size: 0.79rem;
        line-height: 1.45;
      }

      .sl-metric-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .sl-metric {
        min-height: 74px;
        border: 1px solid rgba(255, 255, 255, 0.095);
        border-radius: 15px;
        background: rgba(0, 0, 0, 0.20);
        padding: 12px;
      }

      .sl-metric-label {
        color: rgba(255, 255, 255, 0.58);
        font-size: 0.76rem;
        line-height: 1.3;
        margin-bottom: 6px;
      }

      .sl-metric-value {
        color: #ffffff;
        font-size: 1rem;
        font-weight: 950;
        line-height: 1.2;
      }

      .sl-driver-panel {
        padding: 16px;
        display: flex;
        flex-direction: column;
      }

      .sl-driver-title {
        margin: 6px 0 8px;
        color: #ffffff;
        font-size: 1.04rem;
        line-height: 1.25;
      }

      .sl-driver-copy {
        margin: 0;
        color: rgba(255, 255, 255, 0.73);
        line-height: 1.58;
      }

      .sl-driver-target {
        margin-top: 12px;
        color: rgba(255, 255, 255, 0.62);
        font-size: 0.86rem;
        line-height: 1.48;
      }

      .sl-chip-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }

      .sl-chip {
        border: 1px solid rgba(120, 255, 157, 0.20);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.90);
        padding: 8px 11px;
        font-size: 0.82rem;
        font-weight: 900;
        cursor: pointer;
      }

      .sl-chip:hover,
      .sl-chip.is-active {
        background: rgba(72, 255, 141, 0.16);
        border-color: rgba(72, 255, 141, 0.44);
        color: #ffffff;
      }

      .sl-detail-panel {
        margin-top: 14px;
        padding: 15px;
      }

      .sl-detail-panel[hidden] {
        display: none !important;
      }

      .sl-detail-panel h4 {
        margin: 0 0 9px;
        color: #ffffff;
        font-size: 1rem;
      }

      .sl-detail-panel p {
        margin: 0;
        color: rgba(255,255,255,.74);
        line-height: 1.65;
      }

      .sl-detail-panel ul {
        margin: 0;
        padding-left: 19px;
        color: rgba(255,255,255,.74);
        line-height: 1.75;
      }

      .sl-detail-panel li + li {
        margin-top: 3px;
      }

      .sl-report-foot {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .sl-foot-tile {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: rgba(255,255,255,.035);
        padding: 11px;
      }

      .sl-foot-tile .k {
        color: rgba(145, 255, 179, 0.78);
        font-size: .72rem;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
        margin-bottom: 5px;
      }

      .sl-foot-tile .v {
        color: rgba(255,255,255,.74);
        font-size: .86rem;
        line-height: 1.45;
      }

      .sl-report-map {
        margin-top: 14px;
        padding: 14px;
      }

      .sl-report-map-title {
        color: rgba(145, 255, 179, 0.84);
        font-size: 0.76rem;
        font-weight: 950;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 10px;
      }

      .sl-report-map-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .sl-report-map-item {
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.16);
        color: rgba(255, 255, 255, 0.68);
        font-size: 0.78rem;
        font-weight: 800;
        padding: 7px 10px;
      }

      @media (max-width: 940px) {
        .sl-diagnostic-top,
        .sl-diagnostic-grid,
        .sl-report-foot {
          grid-template-columns: 1fr;
        }

        .sl-status-block {
          justify-items: start;
        }

        .sl-status-mini,
        .sl-gauge-marker-label {
          text-align: left;
        }

        .sl-metric-row {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function renderList(items = []) {
    const list = asArray(items).map(normalizeDetailItem).filter(Boolean);
    if (!list.length) return "<p>No detail available.</p>";

    return (
      "<ul>" +
      list.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") +
      "</ul>"
    );
  }

  function renderDetailBody(section) {
    if (!section) return "<p>No detail available.</p>";
    if (Array.isArray(section.items)) return renderList(section.items);
    return "<p>" + escapeHtml(section.body || "") + "</p>";
  }

  function renderReportMap(reportSections) {
    const labels = asArray(reportSections)
      .map((section) => String(section?.label || "").trim())
      .filter(Boolean);

    if (!labels.length) return "";

    return `
      <div class="sl-panel sl-report-map">
        <div class="sl-report-map-title">Report Packet Data Captured</div>
        <div class="sl-report-map-list">
          ${labels.map((label) => `<span class="sl-report-map-item">${escapeHtml(label)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function buildSections(options, diagnosticData) {
    const baseSections = asArray(options.sections);
    const extraSections = [
      makeSection("Key drivers", diagnosticData.keyDrivers),
      makeSection("Input assumptions", diagnosticData.inputAssumptions || diagnosticData.assumptions),
      makeSection("Revision triggers", diagnosticData.revisionTriggers),
      makeSection("Planning limitations", diagnosticData.planningLimitations),
      makeSection("What this supports", diagnosticData.whatThisSupports),
      makeSection("What this does not prove", diagnosticData.whatThisDoesNotProve)
    ].filter(Boolean);

    return compactSections([...baseSections, ...extraSections]);
  }

  function render(options = {}) {
    injectStyles();

    const target =
      typeof options.target === "string"
        ? document.querySelector(options.target)
        : options.target || document.querySelector("#diagnostic-panel");

    if (!target) return null;

    const diagnosticData = options.data || window.ScopedLabsDiagnosticData || window.ScopedLabsExportData || {};
    const status = normalizeStatus(options.status || diagnosticData.status);
    const statusClass = status.toLowerCase();

    const gauge = options.gauge || diagnosticData.gauge || {};
    const gaugeMax = Number(gauge.max || 100);
    const score = clamp(gauge.score ?? gauge.value ?? 0, 0, gaugeMax);
    const markerPct = clamp((score / gaugeMax) * 100, 0, 100);

    const targetBand = gauge.targetBand || {};
    const targetMin = clamp(targetBand.min ?? 0, 0, gaugeMax);
    const targetMax = clamp(targetBand.max ?? 35, 0, gaugeMax);
    const targetLeftPct = clamp((targetMin / gaugeMax) * 100, 0, 100);
    const targetWidthPct = clamp(((targetMax - targetMin) / gaugeMax) * 100, 0, 100);
    const targetBandLabel = targetBand.label || diagnosticData.healthyTarget || "Preferred planning band";

    const keyMetrics = asArray(options.keyMetrics || diagnosticData.keyResults);
    const sections = buildSections(options, diagnosticData);

    const resultSummary = diagnosticData.resultSummary || diagnosticData.statusSummary?.headline || "Planning diagnostic captured.";
    const summary = options.summary || diagnosticData.whyThisStatus || diagnosticData.statusSummary?.detail || "";
    const title = options.title || diagnosticData.toolLabel || "Planning Diagnostic";
    const schemaLabel = diagnosticData.schemaVersion
      ? `Schema v${diagnosticData.schemaVersion}`
      : "Structured data";

    const firstMetric = keyMetrics[0]?.value || gauge.displayValue || String(score);
    const secondMetric = keyMetrics[1]?.value || "Planning range";
    const thirdMetric = keyMetrics[2]?.value || status;
    const scoreText = `${Math.round(score)} / ${Math.round(gaugeMax)} pressure score`;

    target.hidden = false;
    target.innerHTML = `
      <div class="sl-diagnostic-card">
        <div class="sl-diagnostic-top">
          <div>
            <div class="sl-kicker">Diagnostic Dashboard</div>
            <h3 class="sl-diagnostic-title">${escapeHtml(title)}</h3>
            <p class="sl-diagnostic-summary">${escapeHtml(summary)}</p>
          </div>
          <div class="sl-status-block">
            <div class="sl-status-pill ${statusClass}">${escapeHtml(status)}</div>
            <div class="sl-status-mini">${escapeHtml(schemaLabel)}</div>
          </div>
        </div>

        <div class="sl-diagnostic-grid">
          <div class="sl-panel sl-gauge-panel">
            <div class="sl-gauge-head">
              <div>
                <div class="sl-gauge-name">${escapeHtml(gauge.label || "Diagnostic Pressure")}</div>
                <div class="sl-gauge-reading">${escapeHtml(gauge.displayValue || String(score))}</div>
                <div class="sl-gauge-score-label">${escapeHtml(scoreText)}</div>
              </div>
              <div class="sl-gauge-marker-label">${escapeHtml(gauge.markerLabel || "Current Reading")}</div>
            </div>

            <div class="sl-gauge-track-wrap">
              <div class="sl-gauge-track" role="img" aria-label="${escapeHtml(gauge.label || "Diagnostic gauge")}">
                <div class="sl-gauge-target-band" style="left:${targetLeftPct}%;width:${targetWidthPct}%;"></div>
                <div class="sl-gauge-marker" style="left:${markerPct}%"></div>
              </div>

              <div class="sl-gauge-scale" aria-hidden="true">
                <span>${escapeHtml(gauge.healthyLabel || "Healthy")}</span>
                <span>${escapeHtml(gauge.watchLabel || "Watch")}</span>
                <span>${escapeHtml(gauge.riskLabel || "Risk")}</span>
              </div>
            </div>

            <div class="sl-target-note">Target: ${escapeHtml(targetBandLabel)}</div>

            <div class="sl-metric-row">
              ${keyMetrics.slice(0, 3).map((item) => `
                <div class="sl-metric">
                  <div class="sl-metric-label">${escapeHtml(item.label)}</div>
                  <div class="sl-metric-value">${escapeHtml(item.value)}</div>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="sl-panel sl-driver-panel">
            <div class="sl-kicker">Status Summary</div>
            <h4 class="sl-driver-title">${escapeHtml(resultSummary)}</h4>
            <p class="sl-driver-copy">${escapeHtml(options.dominantDriver?.summary || diagnosticData.dominantDriver?.summary || "")}</p>
            <div class="sl-driver-target">${escapeHtml(diagnosticData.healthyTarget || targetBandLabel)}</div>

            <div class="sl-chip-wrap">
              ${sections.map((section, index) => `
                <button class="sl-chip" type="button" data-diagnostic-section="${index}">
                  ${escapeHtml(section.label)}
                </button>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="sl-panel sl-detail-panel" data-diagnostic-detail hidden></div>

        <div class="sl-report-foot">
          <div class="sl-foot-tile">
            <div class="k">Current Reading</div>
            <div class="v">${escapeHtml(firstMetric)}</div>
          </div>
          <div class="sl-foot-tile">
            <div class="k">Planning Context</div>
            <div class="v">${escapeHtml(secondMetric)}</div>
          </div>
          <div class="sl-foot-tile">
            <div class="k">Report Data</div>
            <div class="v">${escapeHtml(thirdMetric)} captured for export and pipeline summary.</div>
          </div>
        </div>

        ${renderReportMap(diagnosticData.reportSections)}
      </div>
    `;

    const detail = target.querySelector("[data-diagnostic-detail]");
    const chips = Array.from(target.querySelectorAll("[data-diagnostic-section]"));

    function openSection(index) {
      const section = sections[index];

      if (!section || !detail) return;

      chips.forEach((chip) => chip.classList.remove("is-active"));
      chips[index]?.classList.add("is-active");

      detail.hidden = false;
      detail.innerHTML = `
        <h4>${escapeHtml(section.label)}</h4>
        ${renderDetailBody(section)}
      `;
    }

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        openSection(Number(chip.dataset.diagnosticSection));
      });
    });

    if (sections.length) openSection(0);

    return {
      openSection
    };
  }

  function clear(target = "#diagnostic-panel") {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;

    el.hidden = true;
    el.innerHTML = "";
  }

  window.ScopedLabsDiagnostic = {
    render,
    clear
  };
})();