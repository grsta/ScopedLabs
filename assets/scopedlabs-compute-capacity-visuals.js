(function () {
  "use strict";

  const VERSION = "scopedlabs-compute-capacity-visuals-001-ram-envelope";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function number(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function gb(value, digits) {
    return number(value, 0).toFixed(typeof digits === "number" ? digits : 1) + " GB";
  }

  function pct(value) {
    return Math.round(number(value, 0)) + "%";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeStatus(status) {
    const value = String(status || "HEALTHY").toUpperCase();
    if (value === "RISK") return { label: "RISK", className: "is-risk", color: "#ef4444" };
    if (value === "WATCH") return { label: "WATCH", className: "is-watch", color: "#f59e0b" };
    return { label: "GOOD", className: "is-good", color: "#22c55e" };
  }

  function svgText(value) {
    return escapeHtml(value);
  }

  function buildRamCapacityEnvelopeSvg(result) {
    result = result || {};

    const status = normalizeStatus(result.status);
    const installed = Math.max(1, number(result.recommendedRamGb, result.recommended || 1));
    const demand = Math.max(0, number(result.demandRamGb, result.subtotalMemory || 0));
    const required = Math.max(0, number(result.requiredRamGb, result.totalRequired || demand));
    const reserve = Math.max(0, number(result.reserveRamGb, result.reservedMemory || Math.max(0, required - demand)));
    const headroom = Math.max(0, number(result.headroomRamGb, result.memoryHeadroom || Math.max(0, installed - required)));
    const reserveRatio = Math.max(0, number(result.reserveRatio, 0));
    const workloadLabel = result.workloadLabel || result.workload || "Current workload";
    const cpuCoupling = result.cpuCoupling || "CPU and RAM alignment not yet reviewed";

    const maxGb = Math.max(installed * 1.15, required * 1.15, installed + 8, 32);
    const plot = { x: 74, y: 78, w: 602, h: 250 };
    const yFor = function (value) {
      return plot.y + plot.h - clamp(value / maxGb, 0, 1) * plot.h;
    };
    const xFor = function (index) {
      return plot.x + (plot.w / 2) * index;
    };

    const points = [
      { label: "*1 demand basis", short: "*1", x: xFor(0), y: yFor(demand), value: demand, tone: "current" },
      { label: "*2 reserve pressure", short: "*2", x: xFor(1), y: yFor(required), value: required, tone: "growth" },
      { label: "*3 downstream validation", short: "*3", x: xFor(2), y: yFor(installed), value: installed, tone: "failover" }
    ];

    const curve = "M" + points.map(function (point) {
      return point.x.toFixed(1) + " " + point.y.toFixed(1);
    }).join(" L");

    const goodY = yFor(installed * 0.70);
    const watchY = yFor(installed * 0.90);
    const riskY = yFor(installed);
    const capacityY = yFor(installed);
    const requiredY = yFor(required);

    const xGrid = [0, 1, 2].map(function (index) {
      const x = xFor(index);
      return '<path d="M' + x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="grid"/>';
    }).join("");

    const yGrid = [0, 0.25, 0.50, 0.75, 1].map(function (step) {
      const y = plot.y + plot.h - plot.h * step;
      return '<path d="M' + plot.x + ' ' + y.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + (step === 0 || step === 1 ? "grid-major" : "grid") + '"/>';
    }).join("");

    const pointSvg = points.map(function (point, index) {
      const labelY = point.y > 150 ? point.y - 20 : point.y + 30;
      return [
        '<path d="M' + point.x.toFixed(1) + ' ' + point.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="6.5" class="marker-ring"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4.5" class="marker-' + point.tone + '"/>',
        '<text x="' + point.x.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" class="marker-worker tone-' + point.tone + '">' + svgText(point.short + " " + gb(point.value, index === 2 ? 0 : 1)) + '</text>',
        '<text x="' + point.x.toFixed(1) + '" y="' + (labelY + 13).toFixed(1) + '" text-anchor="middle" class="marker-core">' + svgText(point.label) + '</text>'
      ].join("");
    }).join("");

    const pressure = clamp((required / installed) * 100, 0, 140);

    return [
      '<svg viewBox="0 0 760 430" role="img" aria-label="RAM Capacity Envelope" data-compute-capacity-visual="ram-envelope">',
      '<defs>',
      '<linearGradient id="computeCapacityEnvelopeBg" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0%" stop-color="rgba(12,20,28,.98)"/>',
      '<stop offset="100%" stop-color="rgba(2,8,10,.98)"/>',
      '</linearGradient>',
      '<style>',
      '.bg{fill:url(#computeCapacityEnvelopeBg);stroke:rgba(126,245,213,.22);stroke-width:1.2}.frame{fill:none;stroke:rgba(126,245,213,.16);stroke-width:1}.plot-frame{fill:rgba(255,255,255,.01);stroke:rgba(126,245,213,.20);stroke-width:1}.zone-good{fill:rgba(34,197,94,.08)}.zone-watch{fill:rgba(250,204,21,.08)}.zone-risk{fill:rgba(206,32,41,.09)}.grid{fill:none;stroke:rgba(238,246,255,.08);stroke-width:1}.grid-major{fill:none;stroke:rgba(238,246,255,.14);stroke-width:1}.axis{fill:none;stroke:rgba(238,246,255,.42);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.tick{fill:rgba(203,213,225,.90);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}.axis-label{fill:rgba(203,213,225,.92);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px}.header{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:.5px}.subhead{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:600}.zone-label{font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:.7px}.zone-good-text{fill:rgba(74,222,128,.92)}.zone-watch-text{fill:rgba(250,204,21,.95)}.zone-risk-text{fill:rgba(206,32,41,.95)}.capacity-line{fill:none;stroke:#7ef5d5;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.watch-line{fill:none;stroke:rgba(250,204,21,.72);stroke-width:1;stroke-dasharray:5 5}.risk-line{fill:none;stroke:rgba(206,32,41,.86);stroke-width:1;stroke-dasharray:5 5}.required-line{fill:none;stroke:rgba(238,246,255,.34);stroke-width:1.1;stroke-dasharray:6 5}.curve-shadow{fill:none;stroke:rgba(126,245,213,.22);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.curve{fill:none;stroke:#9cfccf;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.marker-current{fill:#38d9ff;stroke:#04110d;stroke-width:1.2}.marker-growth{fill:#a78bfa;stroke:#04110d;stroke-width:1.2}.marker-failover{fill:#f59e0b;stroke:#04110d;stroke-width:1.2}.marker-ring{fill:none;stroke:rgba(238,246,255,.7);stroke-width:1}.marker-worker{font-family:Inter,Arial,Helvetica,sans-serif;font-size:9.5px;font-weight:850}.marker-core{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:8.8px;font-weight:650}.marker-worker.tone-current{fill:#38d9ff}.marker-worker.tone-growth{fill:#a78bfa}.marker-worker.tone-failover{fill:#f59e0b}.footer-text.tone-current{fill:#38d9ff}.footer-text.tone-growth{fill:#a78bfa}.footer-text.tone-failover{fill:#f59e0b}.ref-line{fill:none;stroke:rgba(238,246,255,.16);stroke-width:1;stroke-dasharray:4 4}.capacity-label{fill:#7ef5d5;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800}.required-label{fill:rgba(203,213,225,.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:700}.status-chip{stroke-width:1}.status-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.7px}.footer-strip{fill:rgba(255,255,255,.015);stroke:rgba(126,245,213,.14);stroke-width:1}.footer-text{fill:rgba(203,213,225,.88);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}',
      '</style>',
      '</defs>',
      '<rect x="14" y="14" width="732" height="402" rx="16" class="bg"/>',
      '<rect x="28" y="28" width="704" height="374" rx="12" class="frame"/>',
      '<text x="46" y="58" class="header">RAM Capacity Envelope</text>',
      '<text x="46" y="77" class="subhead">Shared Compute capacity visual · workload demand, reserve pressure, installed tier, and downstream validation</text>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + plot.h + '" class="plot-frame"/>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + (goodY - plot.y).toFixed(1) + '" class="zone-risk"/>',
      '<rect x="' + plot.x + '" y="' + goodY.toFixed(1) + '" width="' + plot.w + '" height="' + (watchY - goodY).toFixed(1) + '" class="zone-watch"/>',
      '<rect x="' + plot.x + '" y="' + watchY.toFixed(1) + '" width="' + plot.w + '" height="' + (plot.y + plot.h - watchY).toFixed(1) + '" class="zone-good"/>',
      yGrid,
      xGrid,
      '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
      '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
      '<text x="375" y="356" text-anchor="middle" class="axis-label">RAM planning checkpoints</text>',
      '<text x="36" y="206" text-anchor="middle" transform="rotate(-90 36 206)" class="axis-label">GB demand</text>',
      '<path d="M' + plot.x + ' ' + capacityY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="capacity-line"/>',
      '<text x="666" y="' + (capacityY - 8).toFixed(1) + '" text-anchor="end" class="capacity-label">Installed tier · ' + svgText(gb(installed, 0)) + '</text>',
      '<path d="M' + plot.x + ' ' + requiredY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="required-line"/>',
      '<text x="666" y="' + (requiredY - 7).toFixed(1) + '" text-anchor="end" class="required-label">Required · ' + svgText(gb(required, 1)) + '</text>',
      '<path d="M' + plot.x + ' ' + yFor(installed * 0.70).toFixed(1) + ' H' + (plot.x + plot.w) + '" class="watch-line"/>',
      '<path d="M' + plot.x + ' ' + yFor(installed * 0.90).toFixed(1) + ' H' + (plot.x + plot.w) + '" class="risk-line"/>',
      '<path d="' + curve + '" class="curve-shadow"/>',
      '<path d="' + curve + '" class="curve"/>',
      pointSvg,
      '<text x="94" y="96" class="zone-label zone-risk-text">RISK</text>',
      '<text x="94" y="' + (goodY + 16).toFixed(1) + '" class="zone-label zone-watch-text">WATCH</text>',
      '<text x="94" y="315" class="zone-label zone-good-text">GOOD</text>',
      '<rect x="528" y="42" width="154" height="28" rx="14" fill="rgba(255,255,255,.035)" stroke="' + status.color + '" class="status-chip"/>',
      '<text x="605" y="61" text-anchor="middle" fill="' + status.color + '" class="status-text">' + status.label + ' · pressure ' + pct(pressure) + '</text>',
      '<rect x="46" y="372" width="668" height="24" rx="8" class="footer-strip"/>',
      '<text x="58" y="388" class="footer-text tone-current">*1 demand basis</text>',
      '<text x="200" y="388" class="footer-text tone-growth">*2 reserve pressure · ' + svgText(gb(reserve, 1)) + '</text>',
      '<text x="414" y="388" class="footer-text tone-failover">*3 downstream validation · ' + svgText(cpuCoupling) + '</text>',
      '<text x="46" y="350" class="tick">' + svgText(workloadLabel) + ' · headroom ' + svgText(gb(headroom, 1)) + ' · reserve ' + svgText(pct(reserveRatio)) + '</text>',
      '</svg>'
    ].join("");
  }

  function renderRamCapacityEnvelope(options) {
    options = options || {};
    const card = options.card || null;
    const mount = options.mount || null;
    const result = options.result || {};

    if (!mount) return false;

    mount.innerHTML = buildRamCapacityEnvelopeSvg(result);

    if (card) {
      card.hidden = false;
      card.removeAttribute("hidden");
    }

    return true;
  }

  function clear(options) {
    options = options || {};
    const card = options.card || null;
    const mount = options.mount || null;

    if (mount) mount.innerHTML = "";

    if (card) {
      card.hidden = true;
      card.setAttribute("hidden", "");
    }
  }

  window.ScopedLabsComputeCapacityVisuals = Object.freeze({
    version: VERSION,
    buildRamCapacityEnvelopeSvg,
    renderRamCapacityEnvelope,
    clear
  });
})();
