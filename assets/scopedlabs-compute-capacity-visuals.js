(function () {
  "use strict";

  const VERSION = "scopedlabs-compute-capacity-visuals-015-adaptive-cpu-scale";

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
    const reserveRatio = Math.max(0, number(result.reserveRatio, 0));
    const workloadLabel = result.workloadLabel || result.workload || "Current workload";
    const cpuCoupling = result.cpuCoupling || "CPU/RAM alignment to verify downstream";

    const statusLabel = status.label === "HEALTHY" ? "GOOD" : status.label;
    const isRisk = statusLabel === "RISK";
    const isWatch = statusLabel === "WATCH";
    const statusColor = isRisk ? "#ff4d5a" : isWatch ? "#facc15" : "#2cff9b";
    const statusFill = isRisk ? "rgba(206,32,41,.12)" : isWatch ? "rgba(250,204,21,.10)" : "rgba(44,255,155,.10)";

    const width = 760;
    const height = 430;

    const plot = { x: 70, y: 102, w: 640, h: 238 };

    const maxRaw = Math.max(installed, required, demand, 8) * 1.20;
    const yMax = Math.max(8, Math.ceil(maxRaw / 8) * 8);

    function yScale(value) {
      return plot.y + plot.h - (clamp(value, 0, yMax) / yMax) * plot.h;
    }

    function xScale(position) {
      return plot.x + clamp(position, 0, 1) * plot.w;
    }

    const points = [
      {
        x: xScale(0.16),
        y: yScale(demand),
        value: demand,
        tone: "current",
        label: "Demand",
        ref: "*1 demand basis",
        detail: "Current RAM demand basis: " + gb(demand, 1) + ". Workload: " + workloadLabel + "."
      },
      {
        x: xScale(0.56),
        y: yScale(required),
        value: required,
        tone: "growth",
        label: "Required",
        ref: "*2 reserve pressure",
        detail: "Required RAM with reserve pressure: " + gb(required, 1) + ". Reserve: " + gb(reserve, 1) + " / " + pct(reserveRatio) + "."
      },
      {
        x: xScale(0.88),
        y: yScale(installed),
        value: installed,
        tone: "failover",
        label: "Installed",
        ref: "*3 downstream validation",
        detail: "Installed RAM tier: " + gb(installed, 0) + ". " + cpuCoupling + "."
      }
    ];

    const watchThreshold = installed * 0.70;
    const riskThreshold = installed * 0.90;

    const watchY = yScale(watchThreshold);
    const riskY = yScale(riskThreshold);
    const capacityY = yScale(installed);
    const requiredY = yScale(required);

    const riskZoneH = Math.max(0, riskY - plot.y);
    const watchZoneH = Math.max(0, watchY - riskY);
    const goodZoneH = Math.max(0, plot.y + plot.h - watchY);

    const curvePath = [
      "M " + points[0].x.toFixed(1) + " " + points[0].y.toFixed(1),
      "Q " + ((points[0].x + points[1].x) / 2).toFixed(1) + " " + ((points[0].y + points[1].y) / 2 - 12).toFixed(1) + " " + points[1].x.toFixed(1) + " " + points[1].y.toFixed(1),
      "Q " + ((points[1].x + points[2].x) / 2).toFixed(1) + " " + ((points[1].y + points[2].y) / 2 - 10).toFixed(1) + " " + points[2].x.toFixed(1) + " " + points[2].y.toFixed(1)
    ].join(" ");

    const tickStep = yMax <= 32 ? 8 : 12;
    const yTicks = [];
    for (let value = 0; value <= yMax; value += tickStep) yTicks.push(value);
    if (yTicks[yTicks.length - 1] !== yMax) yTicks.push(yMax);

    const yGrid = yTicks.map(function (tick) {
      const y = yScale(tick);
      return [
        '<path d="M' + plot.x + ' ' + y.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + (tick === 0 || tick === yMax ? "grid-major" : "grid") + '"/>',
        '<text x="' + (plot.x - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="tick">' + svgText(gb(tick, tick >= 10 ? 0 : 1)) + '</text>'
      ].join("");
    }).join("");

    const xTicks = points.map(function (point) {
      return [
        '<path d="M' + point.x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="grid"/>',
        '<text x="' + point.x.toFixed(1) + '" y="' + (plot.y + plot.h + 20) + '" text-anchor="middle" class="tick">' + svgText(point.label) + '</text>'
      ].join("");
    }).join("");

    function markerSvg(point) {
      const tooltip = svgText(point.ref + " ? " + point.detail);

      return [
        '<g data-ref="' + svgText(point.ref) + '" tabindex="0" role="img" aria-label="' + tooltip + '">',
        '<title>' + tooltip + '</title>',
        '<path d="M' + point.x.toFixed(1) + ' ' + point.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="7" class="marker-ring"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4.8" class="marker-' + point.tone + '"/>',
        '</g>'
      ].join("");
    }

    return [
      '<svg data-export-svg="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="RAM Capacity Envelope analytic graph" data-compute-capacity-visual="ram-envelope" data-compute-visual="ram-capacity-envelope">',
      '<defs>',
      '<linearGradient id="computeRamEnvelopeBg" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#07110f"/>',
      '<stop offset="100%" stop-color="#040b09"/>',
      '</linearGradient>',
      '<style>',
      '.plot-frame{fill:rgba(255,255,255,.012);stroke:rgba(44,255,155,.20);stroke-width:1}.zone-good{fill:rgba(44,255,155,.055)}.zone-watch{fill:rgba(250,204,21,.055)}.zone-risk{fill:rgba(239,68,68,.06)}.grid{fill:none;stroke:rgba(238,246,255,.08);stroke-width:1}.grid-major{fill:none;stroke:rgba(238,246,255,.14);stroke-width:1}.axis{fill:none;stroke:rgba(238,246,255,.42);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.tick{fill:rgba(203,213,225,.90);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}.axis-label{fill:rgba(203,213,225,.92);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:750;letter-spacing:.5px}.header{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:.5px}.subhead{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:650}.zone-label{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.8px}.zone-good-text{fill:rgba(44,255,155,.96)}.zone-watch-text{fill:rgba(250,204,21,.95)}.zone-risk-text{fill:rgba(255,77,90,.95)}.capacity-line{fill:none;stroke:#2cff9b;stroke-width:1.6;stroke-linecap:round}.watch-line{fill:none;stroke:rgba(250,204,21,.70);stroke-width:1;stroke-dasharray:5 5}.risk-line{fill:none;stroke:rgba(255,77,90,.82);stroke-width:1;stroke-dasharray:5 5}.required-line{fill:none;stroke:rgba(238,246,255,.32);stroke-width:1;stroke-dasharray:6 5}.curve-shadow{fill:none;stroke:rgba(44,255,155,.22);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.curve{fill:none;stroke:#2cff9b;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.marker-current{fill:#38d9ff;stroke:#04110d;stroke-width:1.2}.marker-growth{fill:#a78bfa;stroke:#04110d;stroke-width:1.2}.marker-failover{fill:#f59e0b;stroke:#04110d;stroke-width:1.2}.marker-ring{fill:none;stroke:rgba(238,246,255,.72);stroke-width:1}.ref-line{fill:none;stroke:rgba(238,246,255,.16);stroke-width:1;stroke-dasharray:4 4}.capacity-label{fill:#2cff9b;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:850}.required-label{fill:rgba(203,213,225,.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:700}.status-chip{stroke-width:1}.status-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.7px}.legend-current{fill:#38d9ff}.legend-growth{fill:#a78bfa}.legend-failover{fill:#f59e0b}.legend-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800}',
      '</style>',
      '</defs>',
      '<text x="50" y="56" class="header">RAM CAPACITY ENVELOPE</text>',
      '<text x="50" y="76" class="subhead">Demand curve vs installed RAM capacity</text>',
      '<rect x="632" y="38" width="64" height="28" rx="3" fill="' + statusFill + '" stroke="' + statusColor + '" class="status-chip"/>',
      '<text x="664" y="57" text-anchor="middle" fill="' + statusColor + '" class="status-text">' + svgText(statusLabel) + '</text>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + riskZoneH.toFixed(1) + '" class="zone-risk"/>',
      '<rect x="' + plot.x + '" y="' + riskY.toFixed(1) + '" width="' + plot.w + '" height="' + watchZoneH.toFixed(1) + '" class="zone-watch"/>',
      '<rect x="' + plot.x + '" y="' + watchY.toFixed(1) + '" width="' + plot.w + '" height="' + goodZoneH.toFixed(1) + '" class="zone-good"/>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + plot.h + '" class="plot-frame"/>',
      yGrid,
      xTicks,
      '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
      '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
      '<text x="390" y="389" text-anchor="middle" class="axis-label">RAM planning checkpoints</text>',
      '<path d="M' + plot.x + ' ' + riskY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="risk-line"/>',
      '<path d="M' + plot.x + ' ' + watchY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="watch-line"/>',
      '<path d="M' + plot.x + ' ' + capacityY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="capacity-line"/>',
      '<path d="M' + plot.x + ' ' + requiredY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="required-line"/>',
      '<text x="' + (plot.x + 18) + '" y="' + (plot.y + 24) + '" class="zone-label zone-risk-text">RISK</text>',
      '<text x="' + (plot.x + 18) + '" y="' + (riskY + 22).toFixed(1) + '" class="zone-label zone-watch-text">WATCH</text>',
      '<text x="' + (plot.x + 18) + '" y="' + (plot.y + plot.h - 20) + '" class="zone-label zone-good-text">GOOD</text>',
      '<text x="' + (plot.x + plot.w - 12) + '" y="' + (capacityY - 10).toFixed(1) + '" text-anchor="end" class="capacity-label">Installed capacity - ' + svgText(gb(installed, 0)) + '</text>',
      '<text x="' + (plot.x + plot.w - 12) + '" y="' + (requiredY + 15).toFixed(1) + '" text-anchor="end" class="required-label">Required - ' + svgText(gb(required, 1)) + '</text>',
      '<path d="' + curvePath + '" class="curve-shadow"/>',
      '<path d="' + curvePath + '" class="curve"/>',
      points.map(markerSvg).join(""),
      '<text x="190" y="416" text-anchor="middle" class="legend-text legend-current">*1 demand basis</text>',
      '<text x="382" y="416" text-anchor="middle" class="legend-text legend-growth">*2 reserve pressure</text>',
      '<text x="586" y="416" text-anchor="middle" class="legend-text legend-failover">*3 downstream validation</text>',
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

  function cpuEnvelopeNumber(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
  
  function cpuEnvelopeClamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
  
  function cpuEnvelopeThresholds(result) {
      result = result || {};

      const outputs = result.outputs && typeof result.outputs === "object" ? result.outputs : {};
      const inputs = result.inputs && typeof result.inputs === "object" ? result.inputs : {};

      function firstNumber(values, fallback) {
        for (let i = 0; i < values.length; i += 1) {
          const parsed = Number(values[i]);
          if (Number.isFinite(parsed)) return parsed;
        }
        return fallback;
      }

      const recommendedLogicalCores = Math.max(1, firstNumber([
        outputs.recommendedLogicalCores,
        result.recommendedLogicalCores,
        outputs.logicalCores,
        result.logicalCores,
        result.cores
      ], 1));

      const targetUtilizationPercent = cpuEnvelopeClamp(firstNumber([
        inputs.targetUtilizationPercent,
        result.targetUtilizationPercent,
        outputs.utilizationTarget,
        result.utilizationTarget
      ], 70), 10, 95);

      const currentDemandCores = Math.max(0, firstNumber([
        outputs.baseDemandCores,
        result.baseDemandCores,
        outputs.currentDemandCores,
        result.currentDemandCores,
        outputs.effectiveDemandCores,
        result.effectiveDemandCores,
        result.eff
      ], 0));

      const growthDemandCores = Math.max(currentDemandCores, firstNumber([
        outputs.demandAfterGrowthCores,
        result.demandAfterGrowthCores,
        outputs.growthDemandCores,
        result.growthDemandCores
      ], currentDemandCores));

      const failoverDemandCores = Math.max(growthDemandCores, firstNumber([
        outputs.envelopeFinalDemandCores,
        result.envelopeFinalDemandCores,
        outputs.effectiveDemandCores,
        result.effectiveDemandCores,
        result.eff
      ], growthDemandCores));

      const finalDemandCores = Math.max(currentDemandCores, growthDemandCores, failoverDemandCores);
      const usableCapacityCores = Math.max(0.1, firstNumber([
        outputs.usableCapacityCores,
        result.usableCapacityCores,
        outputs.envelopeUsableCapacityCores,
        result.envelopeUsableCapacityCores
      ], recommendedLogicalCores * (targetUtilizationPercent / 100)));

      const watchThresholdCores = usableCapacityCores * 0.70;
      const riskThresholdCores = usableCapacityCores * 0.90;

      let status = "GOOD";

      if (finalDemandCores >= riskThresholdCores) {
        status = "RISK";
      } else if (finalDemandCores >= watchThresholdCores) {
        status = "WATCH";
      }

      return {
        status,
        finalDemandCores,
        currentDemandCores,
        growthDemandCores,
        failoverDemandCores,
        recommendedLogicalCores,
        usableCapacityCores,
        watchThresholdCores,
        riskThresholdCores,
        targetUtilizationPercent,
        statusAuthority: "cpu-capacity-envelope"
      };
    }

  function cpuEnvelopeStatus(result) {
      return cpuEnvelopeThresholds(result).status;
    }

  function buildCpuCapacityEnvelopeSvg(result) {
    result = result || {};
    const outputs = result.outputs && typeof result.outputs === "object" ? result.outputs : {};
    const inputs = result.inputs && typeof result.inputs === "object" ? result.inputs : {};

    function safeNum(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function firstNumber(values, fallback) {
      for (let i = 0; i < values.length; i += 1) {
        const parsed = Number(values[i]);
        if (Number.isFinite(parsed)) return parsed;
      }
      return fallback;
    }

    function localClamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function coreText(value, decimals) {
      const n = safeNum(value, 0);
      return n.toFixed(decimals == null ? 1 : decimals) + " cores";
    }

    const rawStatus = String(cpuEnvelopeStatus(result || {}) || result.envelopeStatus || result.status || "PENDING").toUpperCase();
    const statusLabel = rawStatus === "HEALTHY" ? "GOOD" : rawStatus;
    const isRisk = statusLabel === "RISK";
    const isWatch = statusLabel === "WATCH";
    const statusColor = isRisk ? "#ff4d5a" : isWatch ? "#facc15" : "#2cff9b";
    const statusFill = isRisk ? "rgba(206,32,41,.12)" : isWatch ? "rgba(250,204,21,.10)" : "rgba(44,255,155,.10)";

    const currentWorkers = Math.max(1, firstNumber([
      inputs.concurrency,
      outputs.currentWorkers,
      result.currentWorkers,
      result.concurrency
    ], 16));

    const growthReserve = localClamp(firstNumber([
      inputs.growthReservePercent,
      result.growthReservePercent
    ], 20), 0, 200);

    const failoverMultiplier = localClamp(firstNumber([
      inputs.failoverMultiplier,
      result.failoverMultiplier
    ], 1), 1, 2);

    const growthWorkers = Math.max(currentWorkers, Math.round(currentWorkers * (1 + (growthReserve / 100))));
    const failoverWorkers = Math.max(growthWorkers, Math.round(growthWorkers * failoverMultiplier));

    const currentDemand = Math.max(0, firstNumber([
      outputs.baseDemandCores,
      result.baseDemandCores,
      outputs.currentDemandCores,
      result.currentDemandCores,
      outputs.effectiveDemandCores,
      result.effectiveDemandCores,
      result.eff
    ], 0));

    const growthDemand = Math.max(currentDemand, firstNumber([
      outputs.demandAfterGrowthCores,
      result.demandAfterGrowthCores,
      outputs.growthDemandCores,
      result.growthDemandCores
    ], currentDemand * (1 + (growthReserve / 100))));

    const finalDemand = Math.max(growthDemand, firstNumber([
      outputs.envelopeFinalDemandCores,
      result.envelopeFinalDemandCores,
      outputs.effectiveDemandCores,
      result.effectiveDemandCores,
      result.eff
    ], growthDemand));

    const recommendedLogicalCores = Math.max(1, firstNumber([
      outputs.recommendedLogicalCores,
      result.recommendedLogicalCores,
      outputs.logicalCores,
      result.logicalCores,
      result.cores
    ], 1));

    const targetUtilizationPercent = localClamp(firstNumber([
      inputs.targetUtilizationPercent,
      outputs.utilizationTarget,
      result.utilizationTarget,
      result.targetUtilizationPercent
    ], 70), 10, 95);

    const usableCapacityCores = Math.max(0.1, firstNumber([
      outputs.usableCapacityCores,
      result.usableCapacityCores,
      outputs.envelopeUsableCapacityCores,
      result.envelopeUsableCapacityCores
    ], recommendedLogicalCores * (targetUtilizationPercent / 100)));

    const envelopeThresholds = cpuEnvelopeThresholds(result);
    const watchThresholdCores = Math.max(0.1, envelopeThresholds.watchThresholdCores);
    const riskThresholdCores = Math.max(watchThresholdCores, envelopeThresholds.riskThresholdCores);

    const width = 760;
    const height = 430;
    const plot = { x: 70, y: 102, w: 640, h: 238 };

    const visualPeakCores = Math.max(
      currentDemand,
      growthDemand,
      finalDemand,
      usableCapacityCores,
      0.25
    );
    const visualMinimumScaleCores = visualPeakCores <= 3
      ? 2
      : visualPeakCores <= 8
        ? 4
        : 8;
    const visualRecommendedDisplayCores = Math.min(
      recommendedLogicalCores,
      Math.max(visualPeakCores * 1.35, visualMinimumScaleCores)
    );
    const visualScaleBasisCores = Math.max(
      visualPeakCores * 1.22,
      visualRecommendedDisplayCores,
      visualMinimumScaleCores
    );
    const visualRoundStep = visualScaleBasisCores <= 4
      ? 0.5
      : visualScaleBasisCores <= 12
        ? 1
        : visualScaleBasisCores <= 32
          ? 4
          : visualScaleBasisCores <= 96
            ? 8
            : 16;
    const yMax = Math.max(
      visualMinimumScaleCores,
      Math.ceil(visualScaleBasisCores / visualRoundStep) * visualRoundStep
    );
    const recommendedAbovePlotScale = recommendedLogicalCores > yMax;

    function yScale(value) {
      return plot.y + plot.h - (localClamp(value, 0, yMax) / yMax) * plot.h;
    }

    function xScale(position) {
      return plot.x + localClamp(position, 0, 1) * plot.w;
    }

    const points = [
      {
        x: xScale(0.16),
        y: yScale(currentDemand),
        value: currentDemand,
        workers: currentWorkers,
        tone: "current",
        label: "Demand",
        ref: "*1 demand basis",
        detail: "Current CPU demand basis: " + currentWorkers + " workers / " + coreText(currentDemand, 1) + "."
      },
      {
        x: xScale(0.56),
        y: yScale(growthDemand),
        value: growthDemand,
        workers: growthWorkers,
        tone: "growth",
        label: "Reserve",
        ref: "*2 reserve pressure",
        detail: "Reserve pressure: " + growthWorkers + " workers / " + coreText(growthDemand, 1) + ". Growth reserve: " + growthReserve.toFixed(0) + "%."
      },
      {
        x: xScale(0.88),
        y: yScale(finalDemand),
        value: finalDemand,
        workers: failoverWorkers,
        tone: "failover",
        label: "Validation",
        ref: "*3 downstream validation",
        detail: "Downstream validation: " + failoverWorkers + " workers / " + coreText(finalDemand, 1) + ". Failover multiplier: " + failoverMultiplier.toFixed(2) + "x."
      }
    ];

    const visualWatchThresholdCores = watchThresholdCores > yMax
      ? usableCapacityCores * 0.70
      : watchThresholdCores;
    const visualRiskThresholdCores = riskThresholdCores > yMax
      ? usableCapacityCores * 0.90
      : riskThresholdCores;
    const watchY = yScale(visualWatchThresholdCores);
    const riskY = yScale(Math.max(visualRiskThresholdCores, visualWatchThresholdCores + (yMax * 0.04)));
    const usableY = yScale(usableCapacityCores);
    const logicalY = yScale(Math.min(recommendedLogicalCores, yMax));
    const logicalLabel = "Recommended - " + recommendedLogicalCores + " logical cores" + (recommendedAbovePlotScale ? " (above scale)" : "");

    const riskZoneH = Math.max(0, riskY - plot.y);
    const watchZoneH = Math.max(0, watchY - riskY);
    const goodZoneH = Math.max(0, plot.y + plot.h - watchY);

    const curveStartX = plot.x + 18;
    const curveStartY = yScale(Math.max(0.5, currentDemand * 0.50));
    const curvePath = [
      "M " + curveStartX.toFixed(1) + " " + curveStartY.toFixed(1),
      "Q " + ((curveStartX + points[0].x) / 2).toFixed(1) + " " + ((curveStartY + points[0].y) / 2 + 8).toFixed(1) + " " + points[0].x.toFixed(1) + " " + points[0].y.toFixed(1),
      "Q " + ((points[0].x + points[1].x) / 2).toFixed(1) + " " + ((points[0].y + points[1].y) / 2 - 10).toFixed(1) + " " + points[1].x.toFixed(1) + " " + points[1].y.toFixed(1),
      "Q " + ((points[1].x + points[2].x) / 2).toFixed(1) + " " + ((points[1].y + points[2].y) / 2 - 10).toFixed(1) + " " + points[2].x.toFixed(1) + " " + points[2].y.toFixed(1)
    ].join(" ");

    const yStep = yMax <= 4
      ? 0.5
      : yMax <= 8
        ? 1
        : yMax <= 16
          ? 2
          : yMax <= 40
            ? 4
            : yMax <= 96
              ? 8
              : 16;
    const yTicks = [];
    for (let value = 0; value <= yMax + 0.0001; value += yStep) {
      yTicks.push(Math.round(value * 10) / 10);
    }
    if (yTicks[yTicks.length - 1] !== yMax) yTicks.push(yMax);

    function yTickLabel(tick) {
      const rounded = Math.round(Number(tick) * 10) / 10;
      return Math.abs(rounded - Math.round(rounded)) < 0.01
        ? String(Math.round(rounded))
        : rounded.toFixed(1);
    }

    const yGrid = yTicks.map(function (tick) {
      const y = yScale(tick);
      return [
        '<path d="M' + plot.x + ' ' + y.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + (tick === 0 || tick === yMax ? "grid-major" : "grid") + '"/>',
        '<text x="' + (plot.x - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="tick">' + svgText(yTickLabel(tick)) + '</text>'
      ].join("");
    }).join("");

    const xTicks = points.map(function (point) {
      return [
        '<path d="M' + point.x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="grid"/>',
        '<text x="' + point.x.toFixed(1) + '" y="' + (plot.y + plot.h + 20) + '" text-anchor="middle" class="tick">' + svgText(point.label) + '</text>'
      ].join("");
    }).join("");

    function markerSvg(point) {
      return [
        '<g>',
        '<title>' + svgText(point.ref + " - " + point.detail) + '</title>',
        '<path d="M' + point.x.toFixed(1) + ' ' + point.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="7" class="marker-ring"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4.8" class="marker-' + point.tone + '"/>',
        '</g>'
      ].join("");
    }

    return [
      '<svg data-export-svg="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="CPU Capacity Envelope analytic graph" data-compute-visual="cpu-capacity-envelope">',
      '<defs>',
      '<linearGradient id="computeCpuEnvelopeBg" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#07110f"/>',
      '<stop offset="100%" stop-color="#040b09"/>',
      '</linearGradient>',
      '<style>',
      '.plot-frame{fill:rgba(255,255,255,.012);stroke:rgba(44,255,155,.20);stroke-width:1}.zone-good{fill:rgba(44,255,155,.055)}.zone-watch{fill:rgba(250,204,21,.055)}.zone-risk{fill:rgba(239,68,68,.06)}.grid{fill:none;stroke:rgba(238,246,255,.08);stroke-width:1}.grid-major{fill:none;stroke:rgba(238,246,255,.14);stroke-width:1}.axis{fill:none;stroke:rgba(238,246,255,.42);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.tick{fill:rgba(203,213,225,.90);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}.axis-label{fill:rgba(203,213,225,.92);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:750;letter-spacing:.5px}.header{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:.5px}.subhead{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:650}.zone-label{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.8px}.zone-good-text{fill:rgba(44,255,155,.96)}.zone-watch-text{fill:rgba(250,204,21,.95)}.zone-risk-text{fill:rgba(255,77,90,.95)}.capacity-line{fill:none;stroke:#2cff9b;stroke-width:1.6;stroke-linecap:round}.watch-line{fill:none;stroke:rgba(250,204,21,.70);stroke-width:1;stroke-dasharray:5 5}.risk-line{fill:none;stroke:rgba(255,77,90,.82);stroke-width:1;stroke-dasharray:5 5}.logical-line{fill:none;stroke:rgba(238,246,255,.32);stroke-width:1;stroke-dasharray:6 5}.curve-shadow{fill:none;stroke:rgba(44,255,155,.22);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.curve{fill:none;stroke:#2cff9b;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.marker-current{fill:#38d9ff;stroke:#04110d;stroke-width:1.2}.marker-growth{fill:#a78bfa;stroke:#04110d;stroke-width:1.2}.marker-failover{fill:#f59e0b;stroke:#04110d;stroke-width:1.2}.marker-ring{fill:none;stroke:rgba(238,246,255,.72);stroke-width:1}.ref-line{fill:none;stroke:rgba(238,246,255,.16);stroke-width:1;stroke-dasharray:4 4}.capacity-label{fill:#2cff9b;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:850}.logical-label{fill:rgba(203,213,225,.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:700}.status-chip{stroke-width:1}.status-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.7px}.legend-current{fill:#38d9ff}.legend-growth{fill:#a78bfa}.legend-failover{fill:#f59e0b}.legend-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800}',
      '</style>',
      '</defs>',
      '<text x="50" y="56" class="header">CPU CAPACITY ENVELOPE</text>',
      '<text x="50" y="76" class="subhead">Demand curve vs usable CPU capacity</text>',
      '<rect x="632" y="38" width="64" height="28" rx="7" fill="' + statusFill + '" stroke="' + statusColor + '" class="status-chip"/>',
      '<text x="664" y="57" text-anchor="middle" fill="' + statusColor + '" class="status-text">' + svgText(statusLabel) + '</text>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + riskZoneH.toFixed(1) + '" class="zone-risk"/>',
      '<rect x="' + plot.x + '" y="' + riskY.toFixed(1) + '" width="' + plot.w + '" height="' + watchZoneH.toFixed(1) + '" class="zone-watch"/>',
      '<rect x="' + plot.x + '" y="' + watchY.toFixed(1) + '" width="' + plot.w + '" height="' + goodZoneH.toFixed(1) + '" class="zone-good"/>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + plot.h + '" class="plot-frame"/>',
      yGrid,
      xTicks,
      '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
      '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
      '<text x="390" y="389" text-anchor="middle" class="axis-label">CPU planning checkpoints</text>',
      '<text x="42" y="212" text-anchor="middle" transform="rotate(-90 42 212)" class="axis-label">cores</text>',
      '<path d="M' + plot.x + ' ' + riskY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="risk-line"/>',
      '<path d="M' + plot.x + ' ' + watchY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="watch-line"/>',
      '<path d="M' + plot.x + ' ' + usableY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="capacity-line"/>',
      '<path d="M' + plot.x + ' ' + logicalY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="logical-line"/>',
      '<text x="' + (plot.x + 18) + '" y="' + (plot.y + 24) + '" class="zone-label zone-risk-text">RISK</text>',
      '<text x="' + (plot.x + 18) + '" y="' + (riskY + 22).toFixed(1) + '" class="zone-label zone-watch-text">WATCH</text>',
      '<text x="' + (plot.x + 18) + '" y="' + (plot.y + plot.h - 20) + '" class="zone-label zone-good-text">GOOD</text>',
      '<text x="' + (plot.x + plot.w - 12) + '" y="' + (usableY - 10).toFixed(1) + '" text-anchor="end" class="capacity-label">Usable capacity - ' + svgText(coreText(usableCapacityCores, 1)) + '</text>',
      '<text x="' + (plot.x + plot.w - 12) + '" y="' + (logicalY + 15).toFixed(1) + '" text-anchor="end" class="logical-label">' + svgText(logicalLabel) + '</text>',
      '<path d="' + curvePath + '" class="curve-shadow"/>',
      '<path d="' + curvePath + '" class="curve"/>',
      points.map(markerSvg).join(""),
      '<text x="190" y="416" text-anchor="middle" class="legend-text legend-current">*1 demand basis</text>',
      '<text x="382" y="416" text-anchor="middle" class="legend-text legend-growth">*2 reserve pressure</text>',
      '<text x="586" y="416" text-anchor="middle" class="legend-text legend-failover">*3 downstream validation</text>',
      '</svg>'
    ].join("");
}

  function renderCpuCapacityEnvelope(options) {
    options = options || {};
    const card = options.card || null;
    const mount = options.mount || null;
    const result = options.result || {};

    if (!mount) return false;

    mount.innerHTML = buildCpuCapacityEnvelopeSvg(result);

    if (card) {
      card.hidden = false;
      card.removeAttribute("hidden");
    }

    return true;
  }

  function buildCapacityEnvelopeSvg(config) {
    config = config || {};
    const type = String(config.type || config.kind || config.tool || "").toLowerCase();
    const result = config.result || config.payload || config;

    if (type === "cpu" || type === "cpu-sizing" || type === "compute-cpu") {
      return buildCpuCapacityEnvelopeSvg(result);
    }

    if (type === "ram" || type === "ram-sizing" || type === "compute-ram") {
      return buildRamCapacityEnvelopeSvg(result);
    }

    if (result && (
      result.recommendedLogicalCores ||
      result.cores ||
      (result.outputs && result.outputs.recommendedLogicalCores)
    )) {
      return buildCpuCapacityEnvelopeSvg(result);
    }

    return buildRamCapacityEnvelopeSvg(result);
  }

  window.ScopedLabsComputeCapacityVisuals = Object.freeze({
    version: VERSION,
    cpuEnvelopeThresholds,
    cpuEnvelopeStatus,
    buildCapacityEnvelopeSvg,
    buildCpuCapacityEnvelopeSvg,
    renderCpuCapacityEnvelope,
    buildRamCapacityEnvelopeSvg,
    renderRamCapacityEnvelope,
    clear
  });
})();
