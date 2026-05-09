(() => {
  "use strict";

  const STYLE_ID = "scopedlabs-diagnostic-styles";

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

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .sl-diagnostic-card {
        margin-top: 14px;
        border: 1px solid rgba(120, 255, 120, 0.18);
        border-radius: 18px;
        background:
          radial-gradient(circle at 18% 0%, rgba(51, 255, 135, 0.12), transparent 34%),
          linear-gradient(180deg, rgba(11, 28, 20, 0.98), rgba(5, 12, 9, 0.98));
        box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
        padding: 18px;
        overflow: hidden;
      }

      .sl-diagnostic-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .sl-diagnostic-kicker {
        color: rgba(150, 255, 185, 0.78);
        font-size: 0.76rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 5px;
      }

      .sl-diagnostic-title {
        margin: 0;
        font-size: 1.16rem;
        line-height: 1.2;
      }

      .sl-diagnostic-subtitle {
        margin: 7px 0 0;
        color: rgba(255, 255, 255, 0.64);
        line-height: 1.5;
        max-width: 760px;
      }

      .sl-diagnostic-status {
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border: 1px solid rgba(255, 255, 255, 0.14);
        white-space: nowrap;
      }

      .sl-diagnostic-status.healthy {
        color: #8dffb3;
        background: rgba(44, 255, 130, 0.12);
        border-color: rgba(44, 255, 130, 0.32);
      }

      .sl-diagnostic-status.watch {
        color: #ffd37a;
        background: rgba(255, 186, 73, 0.13);
        border-color: rgba(255, 186, 73, 0.34);
      }

      .sl-diagnostic-status.risk {
        color: #ff9b92;
        background: rgba(255, 86, 72, 0.14);
        border-color: rgba(255, 86, 72, 0.38);
      }

      .sl-diagnostic-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.85fr);
        gap: 16px;
        align-items: stretch;
      }

      .sl-gauge-panel,
      .sl-driver-panel,
      .sl-detail-panel {
        border: 1px solid rgba(255, 255, 255, 0.10);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.045);
        padding: 15px;
      }

      .sl-gauge-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-end;
        margin-bottom: 12px;
      }

      .sl-gauge-label {
        color: rgba(255, 255, 255, 0.68);
        font-weight: 700;
        font-size: 0.88rem;
      }

      .sl-gauge-value {
        font-size: 1.55rem;
        font-weight: 900;
        line-height: 1;
      }

      .sl-gauge-track {
        position: relative;
        height: 18px;
        border-radius: 999px;
        overflow: visible;
        background:
          linear-gradient(90deg,
            rgba(50, 255, 130, 0.85) 0%,
            rgba(50, 255, 130, 0.85) 25%,
            rgba(255, 204, 88, 0.9) 25%,
            rgba(255, 204, 88, 0.9) 60%,
            rgba(255, 92, 78, 0.92) 60%,
            rgba(255, 92, 78, 0.92) 100%);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.14);
      }

      .sl-gauge-marker {
        position: absolute;
        top: 50%;
        width: 16px;
        height: 30px;
        border-radius: 999px;
        background: #ffffff;
        border: 3px solid #92ffb7;
        box-shadow: 0 0 24px rgba(130, 255, 180, 0.72);
        transform: translate(-50%, -50%);
      }

      .sl-gauge-scale {
        display: grid;
        grid-template-columns: 25fr 35fr 40fr;
        gap: 8px;
        margin-top: 9px;
        color: rgba(255,255,255,.58);
        font-size: .76rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .05em;
      }

      .sl-gauge-scale span:nth-child(2) {
        text-align: center;
      }

      .sl-gauge-scale span:nth-child(3) {
        text-align: right;
      }

      .sl-key-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }

      .sl-key-metric {
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 14px;
        background: rgba(0,0,0,.18);
        padding: 11px;
      }

      .sl-key-metric .k {
        color: rgba(255,255,255,.55);
        font-size: .78rem;
        margin-bottom: 5px;
      }

      .sl-key-metric .v {
        font-weight: 900;
        line-height: 1.25;
      }

      .sl-driver-title {
        margin: 0 0 7px;
        font-size: 0.96rem;
      }

      .sl-driver-copy {
        margin: 0;
        color: rgba(255,255,255,.68);
        line-height: 1.55;
      }

      .sl-detail-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .sl-detail-chip {
        border: 1px solid rgba(120,255,120,.18);
        border-radius: 999px;
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.86);
        padding: 8px 10px;
        font-size: .84rem;
        font-weight: 800;
        cursor: pointer;
      }

      .sl-detail-chip:hover,
      .sl-detail-chip.is-active {
        background: rgba(63, 255, 142, 0.14);
        border-color: rgba(63, 255, 142, 0.38);
      }

      .sl-detail-panel {
        margin-top: 14px;
      }

      .sl-detail-panel[hidden] {
        display: none !important;
      }

      .sl-detail-panel h4 {
        margin: 0 0 8px;
        font-size: 0.98rem;
      }

      .sl-detail-panel p {
        margin: 0;
        color: rgba(255,255,255,.70);
        line-height: 1.6;
      }

      .sl-detail-panel ul {
        margin: 0;
        padding-left: 18px;
        color: rgba(255,255,255,.70);
        line-height: 1.7;
      }

      @media (max-width: 900px) {
        .sl-diagnostic-head,
        .sl-diagnostic-layout {
          grid-template-columns: 1fr;
          display: grid;
        }

        .sl-key-metrics {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function renderList(items = []) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];

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

  function render(options = {}) {
    injectStyles();

    const target =
      typeof options.target === "string"
        ? document.querySelector(options.target)
        : options.target || document.querySelector("#diagnostic-panel");

    if (!target) return null;

    const status = normalizeStatus(options.status);
    const statusClass = status.toLowerCase();

    const gauge = options.gauge || {};
    const gaugeMax = Number(gauge.max || 100);
    const score = clamp(gauge.score ?? gauge.value ?? 0, 0, gaugeMax);
    const markerPct = clamp((score / gaugeMax) * 100, 0, 100);

    const keyMetrics = Array.isArray(options.keyMetrics) ? options.keyMetrics : [];
    const sections = Array.isArray(options.sections) ? options.sections : [];

    target.hidden = false;
    target.innerHTML = `
      <div class="sl-diagnostic-card">
        <div class="sl-diagnostic-head">
          <div>
            <div class="sl-diagnostic-kicker">Diagnostic Gauge</div>
            <h3 class="sl-diagnostic-title">${escapeHtml(options.title || "Planning Diagnostic")}</h3>
            <p class="sl-diagnostic-subtitle">${escapeHtml(options.summary || "")}</p>
          </div>
          <div class="sl-diagnostic-status ${statusClass}">${escapeHtml(status)}</div>
        </div>

        <div class="sl-diagnostic-layout">
          <div class="sl-gauge-panel">
            <div class="sl-gauge-meta">
              <div>
                <div class="sl-gauge-label">${escapeHtml(gauge.label || "Diagnostic Pressure")}</div>
                <div class="sl-gauge-value">${escapeHtml(gauge.displayValue || String(score))}</div>
              </div>
              <div class="sl-gauge-label">${escapeHtml(gauge.markerLabel || "Current Position")}</div>
            </div>

            <div class="sl-gauge-track" role="img" aria-label="${escapeHtml(gauge.label || "Diagnostic gauge")}">
              <div class="sl-gauge-marker" style="left:${markerPct}%"></div>
            </div>

            <div class="sl-gauge-scale" aria-hidden="true">
              <span>${escapeHtml(gauge.healthyLabel || "Healthy")}</span>
              <span>${escapeHtml(gauge.watchLabel || "Watch")}</span>
              <span>${escapeHtml(gauge.riskLabel || "Risk")}</span>
            </div>

            <div class="sl-key-metrics">
              ${keyMetrics.map((item) => `
                <div class="sl-key-metric">
                  <div class="k">${escapeHtml(item.label)}</div>
                  <div class="v">${escapeHtml(item.value)}</div>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="sl-driver-panel">
            <div class="sl-diagnostic-kicker">Dominant Driver</div>
            <h4 class="sl-driver-title">${escapeHtml(options.dominantDriver?.label || "Primary Constraint")}</h4>
            <p class="sl-driver-copy">${escapeHtml(options.dominantDriver?.summary || "")}</p>

            <div class="sl-detail-chips">
              ${sections.map((section, index) => `
                <button class="sl-detail-chip" type="button" data-diagnostic-section="${index}">
                  ${escapeHtml(section.label)}
                </button>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="sl-detail-panel" data-diagnostic-detail hidden></div>
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