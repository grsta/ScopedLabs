(() => {
  "use strict";

  const demo = {
    status: "RISK",
    score: 78,
    gaugeLabel: "Lens Selection Pressure",
    currentReading: "25.6 mm",
    markerLabel: "Adjusted focal demand",
    objective:
      "Evaluate whether the current camera geometry is forcing the lens into a narrow, high-pressure selection range.",
    summary:
      "The current geometry is pushing the design toward a long-range lens class. That reduces layout flexibility and increases the need to validate field-of-view, mounting angle, and detail assumptions before relying on the result.",
    dominantDriver: {
      label: "Focal Demand",
      summary:
        "Distance to target and target width are creating a narrow field-of-view requirement. This is the primary reason the design is landing in Risk."
    },
    keyResults: [
      { label: "Adjusted Focal Length", value: "25.6 mm" },
      { label: "Lens Class", value: "Long Range / Specialty" },
      { label: "Detail Requirement", value: "Recognition / ID pressure" }
    ],
    readings: [
      { label: "Distance to Target", value: "90 ft" },
      { label: "Target Width", value: "12 ft" },
      { label: "Sensor Width", value: "6.4 mm" },
      { label: "Detail Pressure", value: "High" }
    ],
    sections: [
      {
        label: "Why Risk?",
        type: "text",
        body:
          "The design is being asked to hold a tight field of view from a long standoff distance. That raises required focal length and leaves less tolerance for installation error, camera angle, and lens availability."
      },
      {
        label: "Likely Drivers",
        type: "list",
        items: [
          "Long distance between camera and target area.",
          "Narrow target width or constrained scene objective.",
          "Sensor size limits the horizontal field of view.",
          "Detail requirement may be too aggressive for a single camera view."
        ]
      },
      {
        label: "Path to Healthy",
        type: "list",
        items: [
          "Evaluate whether the camera can move closer to the target.",
          "Increase acceptable scene width if the operational objective allows it.",
          "Use a larger sensor format or different camera/lens family.",
          "Split the target area across multiple cameras instead of forcing one narrow view.",
          "Recheck whether the detail target matches the actual use case."
        ]
      },
      {
        label: "Follow-up Checks",
        type: "list",
        items: [
          "Validate the selected focal length against the manufacturer field-of-view chart.",
          "Confirm mounting height, angle, and alignment tolerance.",
          "Verify the target width and detail requirement before equipment selection.",
          "Re-run the estimate if distance, target width, sensor size, or detail target changes."
        ]
      }
    ]
  };

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

  function polarToCartesian(cx, cy, r, angleDeg) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad)
    };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M",
      start.x.toFixed(3),
      start.y.toFixed(3),
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x.toFixed(3),
      end.y.toFixed(3)
    ].join(" ");
  }

  function scoreToAngle(score) {
    const pct = clamp(score, 0, 100) / 100;
    return -90 + pct * 180;
  }

  function needleEnd(cx, cy, length, score) {
    const angle = scoreToAngle(score);
    const rad = (angle * Math.PI) / 180;

    return {
      x: cx + Math.cos(rad) * length,
      y: cy + Math.sin(rad) * length
    };
  }

  function renderList(items = []) {
    return `
      <ul class="slp-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    `;
  }

  function renderDetail(section) {
    if (!section) return "";

    if (section.type === "list") {
      return renderList(section.items || []);
    }

    return `<p>${escapeHtml(section.body || "")}</p>`;
  }

  function renderGauge(data) {
    const cx = 180;
    const cy = 178;
    const r = 132;
    const needle = needleEnd(cx, cy, 105, data.score);

    return `
      <svg class="slp-gauge-svg" viewBox="0 0 360 220" role="img" aria-label="${escapeHtml(data.gaugeLabel)}">
        <defs>
          <filter id="slpGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur"></feGaussianBlur>
            <feMerge>
              <feMergeNode in="blur"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
        </defs>

        <path class="slp-arc slp-arc-healthy" d="${describeArc(cx, cy, r, -90, -25)}"></path>
        <path class="slp-arc slp-arc-watch" d="${describeArc(cx, cy, r, -25, 35)}"></path>
        <path class="slp-arc slp-arc-risk" d="${describeArc(cx, cy, r, 35, 90)}"></path>

        <path class="slp-arc-bg" d="${describeArc(cx, cy, r - 34, -90, 90)}"></path>

        <line class="slp-needle" x1="${cx}" y1="${cy}" x2="${needle.x.toFixed(3)}" y2="${needle.y.toFixed(3)}"></line>
        <circle class="slp-hub" cx="${cx}" cy="${cy}" r="18"></circle>
        <circle class="slp-hub-dot" cx="${cx}" cy="${cy}" r="5"></circle>

        <text class="slp-zone slp-zone-healthy" x="62" y="184">Healthy</text>
        <text class="slp-zone slp-zone-watch" x="180" y="74" text-anchor="middle">Watch</text>
        <text class="slp-zone slp-zone-risk" x="298" y="184" text-anchor="end">Risk</text>

        <text class="slp-reading" x="180" y="142" text-anchor="middle">${escapeHtml(data.currentReading)}</text>
        <text class="slp-reading-label" x="180" y="162" text-anchor="middle">${escapeHtml(data.markerLabel)}</text>
      </svg>
    `;
  }

  function setActive(root, index) {
    const buttons = Array.from(root.querySelectorAll("[data-section-index]"));
    const panel = root.querySelector("[data-detail-panel]");
    const section = demo.sections[index];

    buttons.forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.sectionIndex) === index);
    });

    if (!panel || !section) return;

    panel.innerHTML = `
      <div class="slp-detail-kicker">Expanded Detail</div>
      <h3>${escapeHtml(section.label)}</h3>
      ${renderDetail(section)}
    `;
  }

  function render() {
    const root = document.querySelector("#lens-gauge-prototype");

    if (!root) return;

    root.innerHTML = `
      <section class="slp-shell">
        <div class="slp-header">
          <div>
            <div class="slp-kicker">ScopedLabs Diagnostic Prototype</div>
            <h1>Lens Selection Diagnostic Report Module</h1>
            <p>${escapeHtml(demo.objective)}</p>
          </div>
          <div class="slp-status slp-status-risk">${escapeHtml(demo.status)}</div>
        </div>

        <div class="slp-main">
          <aside class="slp-panel slp-summary">
            <div class="slp-panel-kicker">Status Summary</div>
            <div class="slp-risk-card">
              <span>Status</span>
              <strong>${escapeHtml(demo.status)}</strong>
            </div>
            <p>${escapeHtml(demo.summary)}</p>

            <div class="slp-mini-grid">
              ${demo.readings
                .map(
                  (item) => `
                    <div class="slp-mini">
                      <span>${escapeHtml(item.label)}</span>
                      <strong>${escapeHtml(item.value)}</strong>
                    </div>
                  `
                )
                .join("")}
            </div>
          </aside>

          <main class="slp-panel slp-gauge-card">
            <div class="slp-card-head">
              <div>
                <div class="slp-panel-kicker">Gauge Reading</div>
                <h2>${escapeHtml(demo.gaugeLabel)}</h2>
              </div>
              <div class="slp-current">
                <span>Current</span>
                <strong>${escapeHtml(demo.currentReading)}</strong>
              </div>
            </div>

            ${renderGauge(demo)}

            <div class="slp-results">
              ${demo.keyResults
                .map(
                  (item) => `
                    <div class="slp-result">
                      <span>${escapeHtml(item.label)}</span>
                      <strong>${escapeHtml(item.value)}</strong>
                    </div>
                  `
                )
                .join("")}
            </div>
          </main>

          <aside class="slp-panel slp-guidance">
            <div class="slp-panel-kicker">Corrective Guidance</div>
            <h2>${escapeHtml(demo.dominantDriver.label)}</h2>
            <p>${escapeHtml(demo.dominantDriver.summary)}</p>

            <div class="slp-chip-grid">
              ${demo.sections
                .map(
                  (section, index) => `
                    <button type="button" data-section-index="${index}">
                      ${escapeHtml(section.label)}
                    </button>
                  `
                )
                .join("")}
            </div>
          </aside>
        </div>

        <div class="slp-panel slp-detail" data-detail-panel></div>

        <div class="slp-footer-grid">
          <div>
            <span>Tool Page</span>
            <strong>Compact diagnostic workspace</strong>
          </div>
          <div>
            <span>Export Report</span>
            <strong>Full explanation expands in PDF output</strong>
          </div>
          <div>
            <span>Pipeline Ready</span>
            <strong>Structured result data can feed flow summaries</strong>
          </div>
        </div>
      </section>
    `;

    root.querySelectorAll("[data-section-index]").forEach((button) => {
      button.addEventListener("click", () => {
        setActive(root, Number(button.dataset.sectionIndex));
      });
    });

    setActive(root, 2);
  }

  document.addEventListener("DOMContentLoaded", render);
})();