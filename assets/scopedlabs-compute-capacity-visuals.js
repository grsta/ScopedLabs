(function () {
  "use strict";

  const VERSION = "scopedlabs-compute-capacity-visuals-020-storage-iops-export";

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
        x: xScale(0.18),
        y: yScale(demand),
        value: demand,
        tone: "current",
        label: "Demand",
        detail: "Current RAM demand basis: " + gb(demand, 1) + ". Workload: " + workloadLabel + "."
      },
      {
        x: xScale(0.56),
        y: yScale(required),
        value: required,
        tone: "growth",
        label: "Required",
        detail: "Required RAM with reserve pressure: " + gb(required, 1) + ". Reserve: " + gb(reserve, 1) + " / " + pct(reserveRatio) + "."
      }
    ]

    const watchThreshold = installed * 0.70;
    const riskThreshold = installed * 0.90;

    const watchY = yScale(watchThreshold);
    const riskY = yScale(riskThreshold);
    const capacityY = yScale(installed);
    const requiredY = yScale(required);
    const capacityMarker = {
      x: xScale(0.88),
      y: capacityY,
      value: installed,
      tone: "failover",
      label: "Installed",
      detail: "Installed RAM tier: " + gb(installed, 0) + ". " + cpuCoupling + "."
    };

    const riskZoneH = Math.max(0, riskY - plot.y);
    const watchZoneH = Math.max(0, watchY - riskY);
    const goodZoneH = Math.max(0, plot.y + plot.h - watchY);

    const curvePath = [
      "M " + points[0].x.toFixed(1) + " " + points[0].y.toFixed(1),
      "Q " + ((points[0].x + points[1].x) / 2).toFixed(1) + " " + ((points[0].y + points[1].y) / 2 - 12).toFixed(1) + " " + points[1].x.toFixed(1) + " " + points[1].y.toFixed(1)
    ].join(" ")

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
      '<path d="M' + capacityMarker.x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="capacity-marker-guide"/>',
      markerSvg(capacityMarker),
      '<text x="' + capacityMarker.x.toFixed(1) + '" y="' + (plot.y + plot.h + 20) + '" text-anchor="middle" class="tick-label">Installed</text>',
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
    function iopsLabel(value) {
      value = number(value, 0);
      if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + "M IOPS";
      if (Math.abs(value) >= 1000) return (value / 1000).toFixed(1) + "k IOPS";
      return Math.round(value).toLocaleString() + " IOPS";
    }

    function storageIopsStatus(result, utilizationPct) {
      const raw = String(result.status || result.risk || "").toUpperCase();
      if (raw === "RISK" || raw === "WATCH" || raw === "GOOD" || raw === "HEALTHY") {
        return raw === "HEALTHY" ? "GOOD" : raw;
      }

      if (utilizationPct >= 100) return "RISK";
      if (utilizationPct >= 75) return "WATCH";
      return "GOOD";
    }

    

    // compute-capacity-inline-icon-library-0705
    function computeCapacitySvgEscape(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    }

    function computeCapacityFooterIconStyles() {
      return ".footer-pill{fill:rgba(0,0,0,.18);stroke:rgba(112,255,145,.20);stroke-width:1}.footer-label{fill:rgba(203,213,225,.78);font-family:Inter,Arial,sans-serif;font-size:8.5px;font-weight:850;letter-spacing:.45px;text-transform:uppercase}.footer-value{fill:rgba(248,250,252,.92);font-family:Inter,Arial,sans-serif;font-size:9.5px;font-weight:850}.sl-icon-line{fill:none;stroke:rgba(226,232,240,.70);stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}.sl-icon-accent{fill:none;stroke:#2cff9b;stroke-width:1.45;stroke-linecap:round;stroke-linejoin:round}.sl-icon-dot{fill:#2cff9b}";
    }

    function computeCapacityIconSvg(iconKey, x, y) {
      const key = String(iconKey || "storage").toLowerCase();
      const icons = {
        storage: function storage() {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="storage pool icon">',
              '<rect x="0" y="3" width="23" height="6" rx="2" class="sl-icon-line"/>',
              '<rect x="0" y="11" width="23" height="6" rx="2" class="sl-icon-line"/>',
              '<rect x="0" y="19" width="23" height="6" rx="2" class="sl-icon-line"/>',
              '<circle cx="4" cy="6" r="1.1" class="sl-icon-dot"/>',
              '<circle cx="4" cy="14" r="1.1" class="sl-icon-dot"/>',
              '<circle cx="4" cy="22" r="1.1" class="sl-icon-dot"/>',
              '<path d="M9 6 H19" class="sl-icon-accent"/>',
              '<path d="M9 14 H19" class="sl-icon-accent"/>',
              '<path d="M9 22 H19" class="sl-icon-accent"/>',
            '</g>'
          ].join("");
        },

        workload: function workload() {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="workload demand icon">',
              '<rect x="0" y="15" width="4" height="4" rx="1" class="sl-icon-line"/>',
              '<rect x="6" y="11" width="4" height="8" rx="1" class="sl-icon-line"/>',
              '<rect x="12" y="7" width="4" height="12" rx="1" class="sl-icon-line"/>',
              '<path d="M0 23 H4 L7 18 L10 23 H14 L18 11 L22 23" class="sl-icon-accent"/>',
              '<path d="M17 6 H24" class="sl-icon-line"/>',
              '<path d="M21 3 L24 6 L21 9" class="sl-icon-line"/>',
            '</g>'
          ].join("");
        },

        raid: function raid() {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="RAID group icon">',
              '<rect x="0" y="4" width="6" height="18" rx="1.5" class="sl-icon-line"/>',
              '<rect x="9" y="4" width="6" height="18" rx="1.5" class="sl-icon-line"/>',
              '<rect x="18" y="4" width="6" height="18" rx="1.5" class="sl-icon-line"/>',
              '<path d="M3 10 H21" class="sl-icon-accent"/>',
              '<path d="M3 16 H21" class="sl-icon-accent" opacity="0.62"/>',
              '<path d="M7 25 L10 28 L16 22" class="sl-icon-accent"/>',
            '</g>'
          ].join("");
        },

        latency: function latency() {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="latency icon">',
              '<circle cx="12" cy="14" r="8" class="sl-icon-line"/>',
              '<path d="M9 3 H15" class="sl-icon-line"/>',
              '<path d="M12 3 V6" class="sl-icon-line"/>',
              '<path d="M12 14 L12 9" class="sl-icon-accent"/>',
              '<path d="M12 14 L17 16" class="sl-icon-accent"/>',
              '<path d="M2 26 C5 23 8 29 11 26 C14 23 17 29 20 26" class="sl-icon-accent" opacity="0.75"/>',
            '</g>'
          ].join("");
        },

        block: function block() {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="block size icon">',
              '<rect x="0" y="4" width="8" height="8" rx="1.5" class="sl-icon-line"/>',
              '<rect x="11" y="4" width="8" height="8" rx="1.5" class="sl-icon-line"/>',
              '<rect x="0" y="15" width="8" height="8" rx="1.5" class="sl-icon-line"/>',
              '<rect x="11" y="15" width="8" height="8" rx="1.5" class="sl-icon-line"/>',
              '<rect x="22" y="9" width="6" height="9" rx="1.3" class="sl-icon-accent"/>',
              '<path d="M19 13.5 H22" class="sl-icon-accent"/>',
            '</g>'
          ].join("");
        },

        network: function network() {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="network path icon">',
              '<circle cx="4" cy="7" r="3" class="sl-icon-line"/>',
              '<circle cx="20" cy="7" r="3" class="sl-icon-line"/>',
              '<circle cx="12" cy="21" r="3" class="sl-icon-line"/>',
              '<path d="M7 8 H17" class="sl-icon-accent"/>',
              '<path d="M6 10 L10 18" class="sl-icon-accent"/>',
              '<path d="M18 10 L14 18" class="sl-icon-accent"/>',
            '</g>'
          ].join("");
        },

        utilization: function utilization() {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="utilization gauge icon">',
              '<path d="M3 20 A9 9 0 0 1 21 20" class="sl-icon-line"/>',
              '<path d="M5 20 H19" class="sl-icon-line" opacity="0.55"/>',
              '<path d="M12 19 L18 12" class="sl-icon-accent"/>',
              '<circle cx="12" cy="20" r="2" class="sl-icon-dot"/>',
              '<path d="M4 24 H22" class="sl-icon-accent" opacity="0.72"/>',
            '</g>'
          ].join("");
        }
      };

      if (key === "media" || key === "server") return icons.storage();
      if (key === "gauge" || key === "util") return icons.utilization();
      return (icons[key] || icons.storage)();
    }

    function buildCapacityFooterStat(x, iconKey, label, value, options) {
      options = options || {};
      const y = Number.isFinite(Number(options.y)) ? Number(options.y) : 354;
      const width = Number.isFinite(Number(options.width)) ? Number(options.width) : 120;
      const iconX = Number.isFinite(Number(options.iconX)) ? Number(options.iconX) : 8;
      const iconY = Number.isFinite(Number(options.iconY)) ? Number(options.iconY) : 7;
      const labelX = Number.isFinite(Number(options.labelX)) ? Number(options.labelX) : 34;
      const labelY = Number.isFinite(Number(options.labelY)) ? Number(options.labelY) : 16;
      const valueY = Number.isFinite(Number(options.valueY)) ? Number(options.valueY) : 31;
      const escape = typeof options.escaper === "function" ? options.escaper : computeCapacitySvgEscape;

      return [
        '<g transform="translate(' + x + ' ' + y + ')">',
          '<rect x="0" y="0" width="' + width + '" height="42" rx="10" class="footer-pill"/>',
          computeCapacityIconSvg(iconKey, iconX, iconY),
          '<text x="' + labelX + '" y="' + labelY + '" class="footer-label">' + escape(label) + '</text>',
          '<text x="' + labelX + '" y="' + valueY + '" class="footer-value">' + escape(value) + '</text>',
        '</g>'
      ].join("");
    }

    // storage-iops-icon-envelope-polish-0705
    function buildStorageIopsCapacityEnvelopeSvg(result) {
      // storage-iops-deficit-label-stack-fix-0705
      // storage-iops-capacity-envelope-locked-promoted-0705
      // storage-iops-title-risk-polish-0705
      result = result || {};

      function localNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function escapeXml(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      }

      function formatNumber(value) {
        return Math.round(localNumber(value, 0)).toLocaleString();
      }

      function formatCompactIops(value) {
        const numeric = Math.round(localNumber(value, 0));
        if (Math.abs(numeric) >= 1000) {
          const compact = numeric / 1000;
          return (Math.abs(compact) >= 10 ? compact.toFixed(1) : compact.toFixed(1)).replace(/\.0$/, "") + "k";
        }
        return String(numeric);
      }

      function formatDecimal(value, digits) {
        const fixed = localNumber(value, 0).toFixed(digits == null ? 1 : digits);
        return fixed.replace(/\.0$/, "");
      }

      function chooseStep(maxValue) {
        if (maxValue <= 2000) return 250;
        if (maxValue <= 5000) return 500;
        if (maxValue <= 10000) return 1000;
        if (maxValue <= 20000) return 2000;
        if (maxValue <= 50000) return 5000;
        return 10000;
      }

      function mediaTierLabel(value) {
        const key = String(value || "").toLowerCase();
        if (key.indexOf("nvme") >= 0) return "NVMe pool";
        if (key.indexOf("ssd") >= 0) return "SSD / general";
        if (key.indexOf("hdd") >= 0) return "HDD tier";
        if (key.indexOf("hybrid") >= 0) return "Hybrid pool";
        return value ? String(value) : "Storage tier";
      }

      function workloadPatternLabel(value) {
        const key = String(value || "").toLowerCase();
        if (key === "bursty" || key.indexOf("burst") >= 0) return "Burst-heavy";
        if (key === "steady" || key.indexOf("steady") >= 0) return "Steady load";
        if (key.indexOf("write") >= 0) return "Write-heavy";
        if (key.indexOf("database") >= 0) return "Database";
        return value ? String(value) : "Workload";
      }

      const width = 760;
      const height = 430;
      const plot = { x: 58, y: 78, w: 646, h: 244 };

      const required = Math.max(0, localNumber(result.requiredIops || result.finalIops || result.finalRequiredIops, 0));
      const base = Math.max(0, localNumber(result.normalDemandIops || result.baseIops || result.baseDemandIops, required * 0.52));
      const burst = Math.max(0, localNumber(result.peakDemandIops || result.peakIops || result.burstIops, Math.max(required * 0.78, base)));
      const available = Math.max(0, localNumber(result.availableIops || result.platformIops || result.platformCeilingIops, 0));
      const reserve = Math.max(0, localNumber(result.reserveIops, 0) + localNumber(result.growthReserveIops, 0));
      const utilizationPct = available > 0 ? (required / available) * 100 : localNumber(result.utilizationPct, 0);
      const targetLatency = Math.max(0, localNumber(result.targetLatency || result.latencyMs, 0));
      const blockSizeKb = Math.max(0, localNumber(result.blockSizeKb, 0));
      const penalty = Math.max(0, localNumber(result.penalty || result.raidWritePenalty || result.writePenalty, 0));

      const fallbackStatus = available > 0
        ? (required / available <= 0.70 ? "GOOD" : required / available <= 0.90 ? "WATCH" : "RISK")
        : "RISK";

      const status = String(
        typeof storageIopsStatus === "function" ? storageIopsStatus(result, utilizationPct) : (result.status || fallbackStatus)
      ).toUpperCase();

      const statusPalette = {
        GOOD: { stroke: "#34d399", fill: "rgba(52,211,153,0.10)", text: "#7ef5d5" },
        WATCH: { stroke: "#facc15", fill: "rgba(250,204,21,0.10)", text: "#facc15" },
        RISK: { stroke: "#ef4444", fill: "rgba(239,68,68,0.11)", text: "#ef4444" },
        BLOCKED: { stroke: "#ef4444", fill: "rgba(239,68,68,0.11)", text: "#ef4444" }
      };

      const palette = statusPalette[status] || statusPalette.WATCH;

      const maxValue = Math.max(required, base, burst, available, reserve, 1);
      const yStep = chooseStep(maxValue);
      const yMax = Math.ceil((maxValue * 1.16) / yStep) * yStep;

      function yScale(value) {
        const clamped = clamp(value, 0, yMax);
        return plot.y + plot.h - (clamped / yMax) * plot.h;
      }

      const stageX = {
        lead: plot.x + 24,
        base: plot.x + 172,
        burst: plot.x + 376,
        required: plot.x + 560
      };

      const bandGoodMax = available > 0 ? available * 0.70 : yMax * 0.70;
      const bandWatchMax = available > 0 ? available * 0.90 : yMax * 0.90;

      const yGood = yScale(bandGoodMax);
      const yWatch = yScale(bandWatchMax);
      const yCeiling = yScale(available);
      const yBase = yScale(base);
      const yBurst = yScale(burst);
      const yRequired = yScale(required);
      const startY = yScale(Math.max(base * 0.45, 1));

      const curvePath = [
        "M " + stageX.lead.toFixed(1) + " " + startY.toFixed(1),
        "C " + (stageX.lead + 58).toFixed(1) + " " + (startY + 4).toFixed(1) + ", " + (stageX.base - 56).toFixed(1) + " " + (yBase + 12).toFixed(1) + ", " + stageX.base.toFixed(1) + " " + yBase.toFixed(1),
        "C " + (stageX.base + 70).toFixed(1) + " " + (yBase - 8).toFixed(1) + ", " + (stageX.burst - 64).toFixed(1) + " " + (yBurst + 8).toFixed(1) + ", " + stageX.burst.toFixed(1) + " " + yBurst.toFixed(1),
        "C " + (stageX.burst + 70).toFixed(1) + " " + (yBurst - 10).toFixed(1) + ", " + (stageX.required - 56).toFixed(1) + " " + (yRequired + 8).toFixed(1) + ", " + stageX.required.toFixed(1) + " " + yRequired.toFixed(1)
      ].join(" ");

      const delta = available - required;
      const bracketTop = Math.min(yCeiling, yRequired);
      const bracketBottom = Math.max(yCeiling, yRequired);
      const bracketLabel = delta >= 0
        ? "HEADROOM\n+" + formatCompactIops(delta)
        : "DEFICIT\n" + formatCompactIops(Math.abs(delta));
            const bracketLabelPrimary = delta >= 0 ? "HEADROOM" : "DEFICIT";
      const bracketLabelValue = delta >= 0 ? "+" + formatCompactIops(delta) : formatCompactIops(Math.abs(delta));
const bracketColor = delta >= 0 ? (status === "GOOD" ? "#7ef5d5" : "#facc15") : "#ef4444";
      const bracketTextY = bracketTop + ((bracketBottom - bracketTop) / 2) - 10;

      const yTicks = [];
      for (let v = 0; v <= yMax; v += yStep) yTicks.push(v);

      const StorageIopsIcons = {
        storage: function storage(x, y) {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="storage pool icon">',
              '<rect x="0" y="3" width="23" height="6" rx="2" class="sl-icon-line"/>',
              '<rect x="0" y="11" width="23" height="6" rx="2" class="sl-icon-line"/>',
              '<rect x="0" y="19" width="23" height="6" rx="2" class="sl-icon-line"/>',
              '<circle cx="4" cy="6" r="1.1" class="sl-icon-dot"/>',
              '<circle cx="4" cy="14" r="1.1" class="sl-icon-dot"/>',
              '<circle cx="4" cy="22" r="1.1" class="sl-icon-dot"/>',
              '<path d="M9 6 H19" class="sl-icon-accent"/>',
              '<path d="M9 14 H19" class="sl-icon-accent"/>',
              '<path d="M9 22 H19" class="sl-icon-accent"/>',
            '</g>'
          ].join("");
        },

        workload: function workload(x, y) {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="workload demand icon">',
              '<rect x="0" y="15" width="4" height="4" rx="1" class="sl-icon-line"/>',
              '<rect x="6" y="11" width="4" height="8" rx="1" class="sl-icon-line"/>',
              '<rect x="12" y="7" width="4" height="12" rx="1" class="sl-icon-line"/>',
              '<path d="M0 23 H4 L7 18 L10 23 H14 L18 11 L22 23" class="sl-icon-accent"/>',
              '<path d="M17 6 H24" class="sl-icon-line"/>',
              '<path d="M21 3 L24 6 L21 9" class="sl-icon-line"/>',
            '</g>'
          ].join("");
        },

        raid: function raid(x, y) {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="RAID group icon">',
              '<rect x="0" y="4" width="6" height="18" rx="1.5" class="sl-icon-line"/>',
              '<rect x="9" y="4" width="6" height="18" rx="1.5" class="sl-icon-line"/>',
              '<rect x="18" y="4" width="6" height="18" rx="1.5" class="sl-icon-line"/>',
              '<path d="M3 10 H21" class="sl-icon-accent"/>',
              '<path d="M3 16 H21" class="sl-icon-accent" opacity="0.62"/>',
              '<path d="M7 25 L10 28 L16 22" class="sl-icon-accent"/>',
            '</g>'
          ].join("");
        },

        latency: function latency(x, y) {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="latency icon">',
              '<circle cx="12" cy="14" r="8" class="sl-icon-line"/>',
              '<path d="M9 3 H15" class="sl-icon-line"/>',
              '<path d="M12 3 V6" class="sl-icon-line"/>',
              '<path d="M12 14 L12 9" class="sl-icon-accent"/>',
              '<path d="M12 14 L17 16" class="sl-icon-accent"/>',
              '<path d="M2 26 C5 23 8 29 11 26 C14 23 17 29 20 26" class="sl-icon-accent" opacity="0.75"/>',
            '</g>'
          ].join("");
        },

        block: function block(x, y) {
          return [
            '<g transform="translate(' + x + ' ' + y + ')" aria-label="block size icon">',
              '<rect x="0" y="4" width="8" height="8" rx="1.5" class="sl-icon-line"/>',
              '<rect x="11" y="4" width="8" height="8" rx="1.5" class="sl-icon-line"/>',
              '<rect x="0" y="15" width="8" height="8" rx="1.5" class="sl-icon-line"/>',
              '<rect x="11" y="15" width="8" height="8" rx="1.5" class="sl-icon-line"/>',
              '<rect x="22" y="9" width="6" height="9" rx="1.3" class="sl-icon-accent"/>',
              '<path d="M19 13.5 H22" class="sl-icon-accent"/>',
            '</g>'
          ].join("");
        }
      };

      function footerStat(x, iconMarkup, label, value) {
        return [
          '<g transform="translate(' + x + ' 354)">',
            '<rect x="0" y="0" width="120" height="42" rx="10" class="footer-pill"/>',
            iconMarkup,
            '<text x="34" y="16" class="footer-label">' + escapeXml(label) + '</text>',
            '<text x="34" y="31" class="footer-value">' + escapeXml(value) + '</text>',
          '</g>'
        ].join("");
      }

      const storageLabel = mediaTierLabel(result.mediaTier || result.storageLabel);
      const workloadLabel = workloadPatternLabel(result.workloadPattern || result.workloadLabel);
      const raidLabel = result.raidLabel || (penalty > 0 ? "Penalty x" + formatDecimal(penalty, 1) : "Penalty n/a");
      const latencyLabel = targetLatency > 0 ? formatDecimal(targetLatency, 1) + " ms" : "Target n/a";
      const blockLabel = blockSizeKb > 0 ? formatDecimal(blockSizeKb, 0) + " KB" : "Block n/a";

      const footerMarkup = [
        footerStat(70, StorageIopsIcons.storage(8, 7), "Storage", storageLabel),
        footerStat(194, StorageIopsIcons.workload(8, 6), "Workload", workloadLabel),
        footerStat(318, StorageIopsIcons.raid(8, 5), "RAID", raidLabel),
        footerStat(442, StorageIopsIcons.latency(8, 5), "Latency", latencyLabel),
        footerStat(566, StorageIopsIcons.block(8, 5), "Block", blockLabel)
      ].join("");

      const svgParts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="Storage IOPS Capacity Envelope">',
        '<defs>',
          '<linearGradient id="slIopsBg" x1="0" y1="0" x2="0" y2="1">',
            '<stop offset="0%" stop-color="#07110f"/>',
            '<stop offset="100%" stop-color="#040b09"/>',
          '</linearGradient>',
          '<style>',
            '.outer-card{fill:url(#slIopsBg);stroke:rgba(126,245,213,0.18);stroke-width:1.2;}',
            '.inner-frame{display:none;}',
            '.plot-frame{fill:rgba(255,255,255,0.015);stroke:rgba(126,245,213,0.24);stroke-width:1;}',
            '.band-good{fill:rgba(34,197,94,0.12);}',
            '.band-watch{fill:rgba(250,204,21,0.14);}',
            '.band-risk{fill:rgba(239,68,68,0.22);}',
            '.grid{fill:none;stroke:rgba(238,246,255,0.07);stroke-width:1;}',
            '.grid-major{fill:none;stroke:rgba(238,246,255,0.12);stroke-width:1;}',
            '.axis{fill:none;stroke:rgba(238,246,255,0.36);stroke-width:1.1;}',
            '.title{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:.5px;}',
            '.subtitle{fill:rgba(203,213,225,0.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:.35px;}',
            '.status-badge{fill:' + palette.fill + ';stroke:' + palette.stroke + ';stroke-width:1;}',
            '.status-text{fill:' + palette.text + ';font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.7px;}',
            '.tick{fill:rgba(203,213,225,0.88);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;}',
            '.axis-label{fill:rgba(203,213,225,0.90);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.4px;}',
            '.zone-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:800;letter-spacing:.7px;}',
            '.good-text{fill:rgba(74,222,128,0.90);}.watch-text{fill:rgba(250,204,21,0.92);}.risk-text{fill:#ef4444;}',
            '.ceiling-line{fill:none;stroke:#7ef5d5;stroke-width:1.5;stroke-dasharray:7 7;}',
            '.ceiling-label{fill:#7ef5d5;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;}',
            '.curve-shadow{fill:none;stroke:rgba(126,245,213,0.18);stroke-width:4;stroke-linecap:round;stroke-linejoin:round;}',
            '.curve-line{fill:none;stroke:#12f7b6;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}',
            '.drop-line{fill:none;stroke:rgba(238,246,255,0.16);stroke-width:1;stroke-dasharray:4 4;}',
            '.marker-ring{fill:none;stroke:rgba(238,246,255,0.70);stroke-width:1;}',
            '.marker-base{fill:#7ef5d5;stroke:#04110d;stroke-width:1.2;}',
            '.marker-burst{fill:#facc15;stroke:#04110d;stroke-width:1.2;}',
            '.marker-required{fill:' + (delta >= 0 ? "#eef6ff" : "#ef4444") + ';stroke:' + (delta >= 0 ? "#12f7b6" : "#04110d") + ';stroke-width:1.4;}',
            '.point-label{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;}',
            '.point-note{fill:rgba(203,213,225,0.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:600;}',
            '.bracket-line{fill:none;stroke:' + bracketColor + ';stroke-width:1.4;}',
            '.bracket-text{white-space:pre;fill:' + bracketColor + ';font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:900;}',
            '.footer-pill{fill:rgba(255,255,255,0.02);stroke:rgba(126,245,213,0.16);stroke-width:1;}',
            '.footer-label{fill:rgba(203,213,225,0.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;}',
            '.footer-value{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:800;}',
            '.sl-icon-line{fill:none;stroke:rgba(238,246,255,0.84);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;}',
            '.sl-icon-accent{fill:none;stroke:#7ef5d5;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;}',
            '.sl-icon-dot{fill:#7ef5d5;}',
          '</style>',
        '</defs>',
        '<rect x="14" y="14" width="732" height="402" rx="16" class="outer-card"/>',
        '',
        '<text x="' + (width / 2) + '" y="50" text-anchor="middle" class="title">Storage IOPS Capacity Envelope</text>',
        '<text x="' + (width / 2) + '" y="67" text-anchor="middle" class="subtitle">Demand curve vs available platform IOPS</text>',
        '<rect x="644" y="34" width="78" height="26" rx="6" class="status-badge"/>',
        '<text x="683" y="51" text-anchor="middle" class="status-text">' + escapeXml(status) + '</text>',
        '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + plot.h + '" rx="8" class="plot-frame"/>',
        '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + Math.max(0, yWatch - plot.y).toFixed(1) + '" class="band-risk"/>',
        '<rect x="' + plot.x + '" y="' + yWatch.toFixed(1) + '" width="' + plot.w + '" height="' + Math.max(0, yGood - yWatch).toFixed(1) + '" class="band-watch"/>',
        '<rect x="' + plot.x + '" y="' + yGood.toFixed(1) + '" width="' + plot.w + '" height="' + Math.max(0, plot.y + plot.h - yGood).toFixed(1) + '" class="band-good"/>',
        yTicks.map(function(tick) {
          const y = yScale(tick);
          const cls = tick === 0 || tick === yMax ? "grid-major" : "grid";
          return '<path d="M' + plot.x + ' ' + y.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + cls + '"/><text x="' + (plot.x - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="tick">' + formatNumber(tick) + '</text>';
        }).join(""),
        [stageX.lead, stageX.base, stageX.burst, stageX.required].map(function(x, index) {
          return '<path d="M' + x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="' + (index === 0 ? "grid-major" : "grid") + '"/>';
        }).join(""),
        '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
        '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
        '<text x="38" y="66" class="axis-label">IOPS</text>',
        '<text x="' + (plot.x + plot.w / 2) + '" y="348" text-anchor="middle" class="axis-label">Load stage</text>',
        '<text x="' + (plot.x + plot.w - 10) + '" y="' + (plot.y + 14).toFixed(1) + '" text-anchor="end" class="zone-text risk-text">RISK</text>',
        '<text x="' + (plot.x + plot.w - 10) + '" y="' + (yWatch + 14).toFixed(1) + '" text-anchor="end" class="zone-text watch-text">WATCH</text>',
        '<text x="' + (plot.x + plot.w - 10) + '" y="' + (yGood + 14).toFixed(1) + '" text-anchor="end" class="zone-text good-text">GOOD</text>',
        '<path d="M' + plot.x + ' ' + yCeiling.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="ceiling-line"/>',
        '<text x="' + (plot.x + plot.w - 12) + '" y="' + (yCeiling - 8).toFixed(1) + '" text-anchor="end" class="ceiling-label">Available platform *3: ' + formatCompactIops(available) + ' IOPS</text>',
        '<path d="' + curvePath + '" class="curve-shadow"/>',
        '<path d="' + curvePath + '" class="curve-line"/>',
        '<path d="M' + stageX.base.toFixed(1) + ' ' + yBase.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="drop-line"/>',
        '<path d="M' + stageX.burst.toFixed(1) + ' ' + yBurst.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="drop-line"/>',
        '<path d="M' + stageX.required.toFixed(1) + ' ' + yRequired.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="drop-line"/>',
        '<circle cx="' + stageX.base.toFixed(1) + '" cy="' + yBase.toFixed(1) + '" r="6.5" class="marker-ring"/><circle cx="' + stageX.base.toFixed(1) + '" cy="' + yBase.toFixed(1) + '" r="4.5" class="marker-base"/>',
        '<text x="' + (stageX.base - 38).toFixed(1) + '" y="' + (yBase - 34).toFixed(1) + '" class="point-label">BASE</text><text x="' + (stageX.base - 38).toFixed(1) + '" y="' + (yBase - 21).toFixed(1) + '" class="point-note">' + formatCompactIops(base) + ' IOPS</text>',
        '<circle cx="' + stageX.burst.toFixed(1) + '" cy="' + yBurst.toFixed(1) + '" r="6.5" class="marker-ring"/><circle cx="' + stageX.burst.toFixed(1) + '" cy="' + yBurst.toFixed(1) + '" r="4.5" class="marker-burst"/>',
        '<text x="' + (stageX.burst - 38).toFixed(1) + '" y="' + (yBurst - 34).toFixed(1) + '" class="point-label">BURST *1</text><text x="' + (stageX.burst - 38).toFixed(1) + '" y="' + (yBurst - 21).toFixed(1) + '" class="point-note">' + formatCompactIops(burst) + ' IOPS</text>',
        '<circle cx="' + stageX.required.toFixed(1) + '" cy="' + yRequired.toFixed(1) + '" r="7" class="marker-ring"/><circle cx="' + stageX.required.toFixed(1) + '" cy="' + yRequired.toFixed(1) + '" r="5" class="marker-required"/>',
        '<text x="' + (stageX.required - 66).toFixed(1) + '" y="' + (yRequired - 36).toFixed(1) + '" class="point-label">REQUIRED *2</text><text x="' + (stageX.required - 66).toFixed(1) + '" y="' + (yRequired - 23).toFixed(1) + '" class="point-note">' + formatCompactIops(required) + ' IOPS</text>',
        '<text x="' + stageX.base.toFixed(1) + '" y="' + (plot.y + plot.h + 18) + '" text-anchor="middle" class="tick">base</text>',
        '<text x="' + stageX.burst.toFixed(1) + '" y="' + (plot.y + plot.h + 18) + '" text-anchor="middle" class="tick">burst</text>',
        '<text x="' + stageX.required.toFixed(1) + '" y="' + (plot.y + plot.h + 18) + '" text-anchor="middle" class="tick">required</text>',
                '<path d="M' + (plot.x + plot.w - 24).toFixed(1) + ' ' + bracketTop.toFixed(1) + ' H' + (plot.x + plot.w - 8).toFixed(1) + '" class="bracket-line"/>',
        '<path d="M' + (plot.x + plot.w - 24).toFixed(1) + ' ' + bracketBottom.toFixed(1) + ' H' + (plot.x + plot.w - 8).toFixed(1) + '" class="bracket-line"/>',
        '<path d="M' + (plot.x + plot.w - 10).toFixed(1) + ' ' + bracketTop.toFixed(1) + ' V' + bracketBottom.toFixed(1) + '" class="bracket-line"/>',
        '<text x="' + (plot.x + plot.w - 1).toFixed(1) + '" y="' + (bracketTextY - 7).toFixed(1) + '" class="bracket-text" text-anchor="start"><tspan x="' + (plot.x + plot.w - 1).toFixed(1) + '" dy="0">' + escapeXml(bracketLabelPrimary) + '</tspan><tspan x="' + (plot.x + plot.w - 1).toFixed(1) + '" dy="14">' + escapeXml(bracketLabelValue) + '</tspan></text>',
        footerMarkup,
        '</svg>'
      ];

      return svgParts.join("");
    }

function renderStorageIopsCapacityEnvelope(options) {
      options = options || {};
      const card = options.card || null;
      const mount = options.mount || null;
      const result = options.result || {};

      if (!mount) return false;

      mount.innerHTML = buildStorageIopsCapacityEnvelopeSvg(result);

      if (card) {
        card.hidden = false;
        card.removeAttribute("hidden");
      }

      return true;
    }





    // compute-capacity-zone-band-contract-0705
    function computeCapacityZoneBandStyles() {
      return ".zone-risk{fill:rgba(239,68,68,.22)}.zone-watch{fill:rgba(250,204,21,.18)}.zone-good{fill:rgba(52,211,153,.17)}";
    }

    function buildCapacityZoneBands(plot, yGood, yWatch) {
      return [
        '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + Math.max(0, yWatch - plot.y).toFixed(1) + '" class="zone-risk"/>',
        '<rect x="' + plot.x + '" y="' + yWatch.toFixed(1) + '" width="' + plot.w + '" height="' + Math.max(0, yGood - yWatch).toFixed(1) + '" class="zone-watch"/>',
        '<rect x="' + plot.x + '" y="' + yGood.toFixed(1) + '" width="' + plot.w + '" height="' + Math.max(0, plot.y + plot.h - yGood).toFixed(1) + '" class="zone-good"/>'
      ];
    }


    // compute-capacity-guide-line-contract-0705
    function computeCapacityGuideLineStyles() {
      return ".checkpoint-line{fill:none;stroke:rgba(248,250,252,.24);stroke-width:1;stroke-dasharray:4 5}.ceiling-line{stroke:rgba(248,250,252,.88);stroke-width:2;stroke-dasharray:7 5}.ceiling-label{fill:rgba(248,250,252,.94);font-family:Inter,Arial,sans-serif;font-size:10px;font-weight:850}";
    }

    function buildCapacityCheckpointGuides(plot, checkpoints) {
      const points = Array.isArray(checkpoints) ? checkpoints : [];
      return points.map(function(x) {
        const numericX = Number(x);
        if (!Number.isFinite(numericX)) return "";
        return '<path d="M' + numericX.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="checkpoint-line"/>';
      }).join("");
    }

    // storage-throughput-capacity-envelope-0705
    function buildStorageThroughputCapacityEnvelopeSvg(result) {
      result = result || {};

      function localNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function escapeXml(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      }

      function formatMbps(value) {
        const numeric = localNumber(value, 0);
        if (Math.abs(numeric) >= 1000) return (numeric / 1000).toFixed(1).replace(/\.0$/, "") + " GB/s";
        return numeric.toFixed(1).replace(/\.0$/, "") + " MB/s";
      }

      function compactMbps(value) {
        const numeric = localNumber(value, 0);
        if (Math.abs(numeric) >= 1000) return (numeric / 1000).toFixed(1).replace(/\.0$/, "") + "G";
        return Math.round(numeric).toLocaleString();
      }

      function chooseStep(maxValue) {
        if (maxValue <= 250) return 50;
        if (maxValue <= 500) return 100;
        if (maxValue <= 1000) return 200;
        if (maxValue <= 2500) return 500;
        if (maxValue <= 5000) return 1000;
        return 2000;
      }

      const width = 760;
      const height = 430;
      const plot = { x: 58, y: 78, w: 646, h: 244 };

      const base = Math.max(0, localNumber(result.baseMBps || result.baseThroughputMBps, 0));
      const burst = Math.max(0, localNumber(result.burstAdjustedMBps || result.burstMBps, Math.max(base, localNumber(result.requiredThroughputMBps, 0) * 0.78)));
      const windowRequired = Math.max(0, localNumber(result.transferWindowRequiredMBps, 0));
      const required = Math.max(0, localNumber(result.requiredThroughputMBps || result.finalMBps || result.finalThroughputMBps, Math.max(burst, windowRequired)));
      const available = Math.max(0, localNumber(result.availableThroughputMBps || result.availableMBps || result.pathThroughputMBps, 0));
      const utilizationPct = available > 0 ? (required / available) * 100 : localNumber(result.throughputUtilizationPct || result.utilizationPct, 0);
      const headroom = available > 0 ? available - required : localNumber(result.headroomMBps, 0);
      const deficit = available > 0 ? Math.max(0, required - available) : Math.max(0, localNumber(result.deficitMBps, 0));

      const fallbackStatus = available > 0
        ? (required / available <= 0.70 ? "GOOD" : required / available <= 0.90 ? "WATCH" : "RISK")
        : "WATCH";

      const status = String(result.status || fallbackStatus).toUpperCase();
      const statusPalette = {
        GOOD: { stroke: "#34d399", fill: "rgba(52,211,153,0.10)", text: "#7ef5d5" },
        WATCH: { stroke: "#facc15", fill: "rgba(250,204,21,0.10)", text: "#facc15" },
        RISK: { stroke: "#ef4444", fill: "rgba(239,68,68,0.11)", text: "#ef4444" },
        BLOCKED: { stroke: "#ef4444", fill: "rgba(239,68,68,0.11)", text: "#ef4444" }
      };
      const palette = statusPalette[status] || statusPalette.WATCH;

      const maxValue = Math.max(base, burst, required, available, windowRequired, 1);
      const yStep = chooseStep(maxValue);
      const yMax = Math.ceil((maxValue * 1.16) / yStep) * yStep;

      function yScale(value) {
        return plot.y + plot.h - (clamp(value, 0, yMax) / yMax) * plot.h;
      }

      const stageX = {
        lead: plot.x + 24,
        base: plot.x + 172,
        burst: plot.x + 376,
        required: plot.x + 560
      };

      const checkpointGuides = buildCapacityCheckpointGuides(plot, [stageX.base, stageX.burst, stageX.required]);
      const yBase = yScale(base);
      const yBurst = yScale(burst);
      const yRequired = yScale(required);
      const yCeiling = available > 0 ? yScale(available) : plot.y + 10;
      const yGood = available > 0 ? yScale(available * 0.70) : plot.y + plot.h * 0.62;
      const yWatch = available > 0 ? yScale(available * 0.90) : plot.y + plot.h * 0.34;

      // storage-throughput-zone-bands-0705
      const zoneBands = buildCapacityZoneBands(plot, yGood, yWatch);


      const curvePath = [
        "M", stageX.lead.toFixed(1), yScale(Math.max(base * 0.58, 1)).toFixed(1),
        "C", (stageX.base - 86).toFixed(1), yBase.toFixed(1), (stageX.base - 42).toFixed(1), yBase.toFixed(1), stageX.base.toFixed(1), yBase.toFixed(1),
        "S", (stageX.burst - 48).toFixed(1), yBurst.toFixed(1), stageX.burst.toFixed(1), yBurst.toFixed(1),
        "S", (stageX.required - 54).toFixed(1), yRequired.toFixed(1), stageX.required.toFixed(1), yRequired.toFixed(1)
      ].join(" ");

      const bracketTop = yScale(Math.max(required, available));
      const bracketBottom = yScale(Math.min(required, available));
      const bracketLabelPrimary = deficit > 0 ? "deficit *3" : "headroom *3";
      const bracketLabelValue = deficit > 0 ? formatMbps(deficit) : formatMbps(Math.max(0, headroom));
      const bracketTextY = clamp((bracketTop + bracketBottom) / 2, plot.y + 30, plot.y + plot.h - 12);

      const transport = result.transportPathLabel || result.transportPath || "Transport path";
      const media = result.mediaTierLabel || result.mediaTier || "Media tier";
      const workload = result.workloadTypeLabel || result.workloadType || "Workload";

      const gridLines = [];
      for (let tick = 0; tick <= yMax; tick += yStep) {
        const y = yScale(tick);
        gridLines.push('<path d="M' + plot.x + ' ' + y.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + (tick === 0 ? "grid-major" : "grid") + '"/><text x="' + (plot.x - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="tick">' + compactMbps(tick) + '</text>');
      }

      return [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Storage Throughput Capacity Envelope">',
        '<defs><style>',
        '.bg{fill:#07100d}.panel{fill:rgba(255,255,255,.025);stroke:rgba(112,255,145,.16);stroke-width:1}.title{fill:#f8fafc;font-family:Inter,Arial,sans-serif;font-size:18px;font-weight:900}.sub{fill:rgba(203,213,225,.82);font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:700}.status-text{font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:900;letter-spacing:.8px}.zone-risk{fill:rgba(239,68,68,.22)}.zone-watch{fill:rgba(250,204,21,.18)}.zone-good{fill:rgba(52,211,153,.17)}.grid{stroke:rgba(148,163,184,.14);stroke-width:1}.grid-major{stroke:rgba(148,163,184,.24);stroke-width:1}.axis{stroke:rgba(226,232,240,.34);stroke-width:1.2}.tick{fill:rgba(203,213,225,.72);font-family:Inter,Arial,sans-serif;font-size:9px;font-weight:700}.axis-label{fill:rgba(203,213,225,.76);font-family:Inter,Arial,sans-serif;font-size:10px;font-weight:800}.zone-text{font-family:Inter,Arial,sans-serif;font-size:10px;font-weight:900;letter-spacing:.7px}.risk-text{fill:#ef4444}.watch-text{fill:#facc15}.good-text{fill:#34d399}.ceiling-line{stroke:#facc15;stroke-width:2;stroke-dasharray:7 5}.ceiling-label{fill:#facc15;font-family:Inter,Arial,sans-serif;font-size:10px;font-weight:850}.curve-shadow{fill:none;stroke:rgba(0,0,0,.4);stroke-width:6;stroke-linecap:round}.curve-line{fill:none;stroke:#2cff9b;stroke-width:2.2;stroke-linecap:round}.drop-line{stroke:rgba(226,232,240,.20);stroke-width:1;stroke-dasharray:4 5}.marker-ring{fill:none;stroke:rgba(238,246,255,.72);stroke-width:1}.marker-base{fill:#38d9ff;stroke:#04110d;stroke-width:1.2}.marker-burst{fill:#a78bfa;stroke:#04110d;stroke-width:1.2}.marker-required{fill:#2cff9b;stroke:#04110d;stroke-width:1.2}.point-label{fill:#f8fafc;font-family:Inter,Arial,sans-serif;font-size:10px;font-weight:900;letter-spacing:.6px}.point-note{fill:rgba(203,213,225,.84);font-family:Inter,Arial,sans-serif;font-size:9px;font-weight:750}.bracket-line{stroke:' + palette.stroke + ';stroke-width:1.5}.bracket-text{fill:' + palette.text + ';font-family:Inter,Arial,sans-serif;font-size:10px;font-weight:900}.chip-bg{fill:rgba(15,23,42,.72);stroke:rgba(112,255,145,.12)}.chip-text{fill:rgba(226,232,240,.86);font-family:Inter,Arial,sans-serif;font-size:9px;font-weight:750}' + computeCapacityGuideLineStyles() + computeCapacityFooterIconStyles() /* storage-throughput-footer-icon-style-injection-0705 */,
        '</style></defs>',
        '<rect width="' + width + '" height="' + height + '" class="bg"/>',
        '<rect x="24" y="22" width="712" height="384" rx="18" class="panel"/>',
        '<text x="380" y="54" text-anchor="middle" class="title">Storage Throughput Capacity Envelope</text>',
        '<text x="380" y="74" text-anchor="middle" class="sub">MB/s demand curve vs available path throughput</text>',
        '<rect x="632" y="36" width="64" height="28" rx="4" fill="' + palette.fill + '" stroke="' + palette.stroke + '"/>',
        '<text x="664" y="55" text-anchor="middle" fill="' + palette.text + '" class="status-text">' + escapeXml(status) + '</text>',
        zoneBands.join(""),
        checkpointGuides,
        gridLines.join(""),
        '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
        '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
        '<text x="38" y="66" class="axis-label">MB/s</text>',
        '<text x="' + (plot.x + plot.w / 2) + '" y="348" text-anchor="middle" class="axis-label">Throughput planning checkpoints</text>',
        '<text x="' + (plot.x + plot.w - 10) + '" y="' + (plot.y + 14).toFixed(1) + '" text-anchor="end" class="zone-text risk-text">RISK</text>',
        '<text x="' + (plot.x + plot.w - 10) + '" y="' + (yWatch + 14).toFixed(1) + '" text-anchor="end" class="zone-text watch-text">WATCH</text>',
        '<text x="' + (plot.x + plot.w - 10) + '" y="' + (yGood + 14).toFixed(1) + '" text-anchor="end" class="zone-text good-text">GOOD</text>',
        available > 0 ? '<path d="M' + plot.x + ' ' + yCeiling.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="ceiling-line"/><text x="' + (plot.x + plot.w - 12) + '" y="' + (yCeiling - 8).toFixed(1) + '" text-anchor="end" class="ceiling-label">Available path *3: ' + formatMbps(available) + '</text>' : '',
        '<path d="' + curvePath + '" class="curve-shadow"/>',
        '<path d="' + curvePath + '" class="curve-line"/>',
        '<path d="M' + stageX.base.toFixed(1) + ' ' + yBase.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="drop-line"/>',
        '<path d="M' + stageX.burst.toFixed(1) + ' ' + yBurst.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="drop-line"/>',
        '<path d="M' + stageX.required.toFixed(1) + ' ' + yRequired.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="drop-line"/>',
        '<circle cx="' + stageX.base.toFixed(1) + '" cy="' + yBase.toFixed(1) + '" r="6.5" class="marker-ring"/><circle cx="' + stageX.base.toFixed(1) + '" cy="' + yBase.toFixed(1) + '" r="4.5" class="marker-base"/>',
        '<text x="' + (stageX.base - 38).toFixed(1) + '" y="' + (yBase - 34).toFixed(1) + '" class="point-label">BASE</text><text x="' + (stageX.base - 38).toFixed(1) + '" y="' + (yBase - 21).toFixed(1) + '" class="point-note">' + formatMbps(base) + '</text>',
        '<circle cx="' + stageX.burst.toFixed(1) + '" cy="' + yBurst.toFixed(1) + '" r="6.5" class="marker-ring"/><circle cx="' + stageX.burst.toFixed(1) + '" cy="' + yBurst.toFixed(1) + '" r="4.5" class="marker-burst"/>',
        '<text x="' + (stageX.burst - 38).toFixed(1) + '" y="' + (yBurst - 34).toFixed(1) + '" class="point-label">BURST *1</text><text x="' + (stageX.burst - 38).toFixed(1) + '" y="' + (yBurst - 21).toFixed(1) + '" class="point-note">' + formatMbps(burst) + '</text>',
        '<circle cx="' + stageX.required.toFixed(1) + '" cy="' + yRequired.toFixed(1) + '" r="7" class="marker-ring"/><circle cx="' + stageX.required.toFixed(1) + '" cy="' + yRequired.toFixed(1) + '" r="5" class="marker-required"/>',
        '<text x="' + (stageX.required - 66).toFixed(1) + '" y="' + (yRequired - 36).toFixed(1) + '" class="point-label">REQUIRED *2</text><text x="' + (stageX.required - 66).toFixed(1) + '" y="' + (yRequired - 23).toFixed(1) + '" class="point-note">' + formatMbps(required) + '</text>',
        '<text x="' + stageX.base.toFixed(1) + '" y="' + (plot.y + plot.h + 18) + '" text-anchor="middle" class="tick">base</text>',
        '<text x="' + stageX.burst.toFixed(1) + '" y="' + (plot.y + plot.h + 18) + '" text-anchor="middle" class="tick">burst</text>',
        '<text x="' + stageX.required.toFixed(1) + '" y="' + (plot.y + plot.h + 18) + '" text-anchor="middle" class="tick">required</text>',
        available > 0 ? '<path d="M' + (plot.x + plot.w - 24).toFixed(1) + ' ' + bracketTop.toFixed(1) + ' H' + (plot.x + plot.w - 8).toFixed(1) + '" class="bracket-line"/><path d="M' + (plot.x + plot.w - 24).toFixed(1) + ' ' + bracketBottom.toFixed(1) + ' H' + (plot.x + plot.w - 8).toFixed(1) + '" class="bracket-line"/><path d="M' + (plot.x + plot.w - 10).toFixed(1) + ' ' + bracketTop.toFixed(1) + ' V' + bracketBottom.toFixed(1) + '" class="bracket-line"/><text x="' + (plot.x + plot.w - 1).toFixed(1) + '" y="' + (bracketTextY - 7).toFixed(1) + '" class="bracket-text" text-anchor="start"><tspan x="' + (plot.x + plot.w - 1).toFixed(1) + '" dy="0">' + escapeXml(bracketLabelPrimary) + '</tspan><tspan x="' + (plot.x + plot.w - 1).toFixed(1) + '" dy="14">' + escapeXml(bracketLabelValue) + '</tspan></text>' : '',
        buildCapacityFooterStat(58, "network", "Path", transport, { y: 360, width: 150, iconX: 9, iconY: 7, labelX: 38, labelY: 16, valueY: 31, escaper: escapeXml }),
        buildCapacityFooterStat(214, "media", "Media", media, { y: 360, width: 150, iconX: 9, iconY: 7, labelX: 38, labelY: 16, valueY: 31, escaper: escapeXml }),
        buildCapacityFooterStat(370, "workload", "Workload", workload, { y: 360, width: 162, iconX: 9, iconY: 6, labelX: 38, labelY: 16, valueY: 31, escaper: escapeXml }),
        buildCapacityFooterStat(538, "utilization", "Utilization", Math.round(utilizationPct) + "%", { y: 360, width: 166, iconX: 9, iconY: 6, labelX: 38, labelY: 16, valueY: 31, escaper: escapeXml }),
        '</svg>'
      ].join("");
    }

    function renderStorageThroughputCapacityEnvelope(options) {
      options = options || {};
      const card = options.card || null;
      const mount = options.mount || null;
      const result = options.result || {};

      if (!mount) return false;

      mount.innerHTML = buildStorageThroughputCapacityEnvelopeSvg(result);

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

    if (type === "storage-throughput" || type === "throughput" || type === "compute-storage-throughput") {
      return buildStorageThroughputCapacityEnvelopeSvg(result);
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
      buildStorageIopsCapacityEnvelopeSvg,
      renderStorageIopsCapacityEnvelope,
      buildStorageThroughputCapacityEnvelopeSvg,
      renderStorageThroughputCapacityEnvelope,
    clear
  });
})();

// compute-vm-density-capacity-envelope-0706
(function () {
  var api = window.ScopedLabsComputeCapacityVisuals || {};
  if (api.renderVmDensityCapacityEnvelope) {
    window.ScopedLabsComputeCapacityVisuals = api;
    return;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function num(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function pct(value, max) {
    var n = num(value, 0);
    var m = Math.max(1, num(max, 1));
    return Math.max(0, Math.min(100, (n / m) * 100));
  }

  function statusClass(status) {
    var value = String(status || "").toUpperCase();
    if (value === "RISK" || value === "BLOCKED") return "risk";
    if (value === "WATCH" || value === "REVIEW") return "watch";
    return "good";
  }

  function renderVmDensityCapacityEnvelope(target, result) {
    var mount = typeof target === "string" ? document.getElementById(target) : target;
    if (!mount) return false;

    var outputs = (result && result.outputs) || result || {};
    var inputs = (result && result.inputs) || {};
    var status = result.status || result.summaryStatus || outputs.status || "GOOD";
    var vms = num(outputs.vms || result.vms, 0);
    var cpuLimit = num(outputs.cpuLimitVms || outputs.cpuVMs || result.cpuVMs, vms);
    var ramLimit = num(outputs.ramLimitVms || outputs.ramVMs || result.ramVMs, vms);
    var cpuPool = num(outputs.cpuPoolVcpu || outputs.cpuPool || result.cpuPool, 0);
    var ramPool = num(outputs.ramPoolGb || outputs.ramPool || result.ramPool, 0);
    var cpuHeadroom = num(outputs.cpuHeadroomVcpu || result.effectiveCpuHeadroom, 0);
    var ramHeadroom = num(outputs.ramHeadroomGb || result.effectiveRamHeadroom, 0);
    var maxLimit = Math.max(1, cpuLimit, ramLimit, vms);
    var limiting = outputs.limiting || result.limiting || "Balanced";
    var densityClass = outputs.densityClass || result.densityClass || "Modeled";
    var statusTone = statusClass(status);

    mount.innerHTML = [
      '<div class="compute-capacity-envelope compute-vm-density-envelope" data-compute-vm-density-envelope-0706>',
      '<div class="compute-capacity-envelope__head">',
      '<div><h3>VM Density Capacity Envelope</h3><p>Host consolidation limit from CPU pool, RAM pool, spare policy, and overcommit assumptions.</p></div>',
      '<span class="scopedlabs-result-summary-status ' + esc(statusTone) + '">' + esc(status) + '</span>',
      '</div>',
      '<svg viewBox="0 0 720 260" role="img" aria-label="VM Density capacity envelope">',
      '<rect x="44" y="34" width="632" height="150" rx="14" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.12)"/>',
      '<line x1="82" y1="78" x2="638" y2="78" stroke="rgba(140,255,180,0.45)" stroke-width="8" stroke-linecap="round"/>',
      '<line x1="82" y1="126" x2="638" y2="126" stroke="rgba(120,190,255,0.38)" stroke-width="8" stroke-linecap="round"/>',
      '<line x1="82" y1="162" x2="' + (82 + pct(vms, maxLimit) * 5.56).toFixed(1) + '" y2="162" stroke="rgba(255,255,255,0.72)" stroke-width="6" stroke-linecap="round"/>',
      '<circle cx="' + (82 + pct(cpuLimit, maxLimit) * 5.56).toFixed(1) + '" cy="78" r="9" fill="rgba(140,255,180,0.95)"/>',
      '<circle cx="' + (82 + pct(ramLimit, maxLimit) * 5.56).toFixed(1) + '" cy="126" r="9" fill="rgba(120,190,255,0.95)"/>',
      '<circle cx="' + (82 + pct(vms, maxLimit) * 5.56).toFixed(1) + '" cy="162" r="10" fill="rgba(255,255,255,0.95)"/>',
      '<text x="82" y="58" fill="rgba(255,255,255,0.72)" font-size="13">CPU limit: ' + esc(cpuLimit) + ' VMs</text>',
      '<text x="82" y="112" fill="rgba(255,255,255,0.72)" font-size="13">RAM limit: ' + esc(ramLimit) + ' VMs</text>',
      '<text x="82" y="202" fill="rgba(255,255,255,0.72)" font-size="13">Modeled density: ' + esc(vms) + ' VMs | Limiting: ' + esc(limiting) + '</text>',
      '</svg>',
      '<div class="compute-capacity-envelope__stats">',
      '<span><strong>' + esc(vms) + '</strong><small>Modeled VMs</small></span>',
      '<span><strong>' + esc(limiting) + '</strong><small>Limiting Factor</small></span>',
      '<span><strong>' + esc(cpuHeadroom.toFixed ? cpuHeadroom.toFixed(1) : cpuHeadroom) + '</strong><small>vCPU Headroom</small></span>',
      '<span><strong>' + esc(ramHeadroom.toFixed ? ramHeadroom.toFixed(1) : ramHeadroom) + '</strong><small>GB RAM Headroom</small></span>',
      '</div>',
      '<p class="muted mini-note">Density class: ' + esc(densityClass) + '. CPU pool ' + esc(cpuPool.toFixed ? cpuPool.toFixed(1) : cpuPool) + ' vCPU-eq; RAM pool ' + esc(ramPool.toFixed ? ramPool.toFixed(1) : ramPool) + ' GB.</p>',
      '</div>'
    ].join("");

    return true;
  }

  api.renderVmDensityCapacityEnvelope = renderVmDensityCapacityEnvelope;
  window.ScopedLabsComputeCapacityVisuals = api;
})();
