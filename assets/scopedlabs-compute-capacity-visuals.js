(function () {
  "use strict";

  const VERSION = "scopedlabs-compute-capacity-visuals-004-ram-envelope-layout";

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
    const cpuCoupling = result.cpuCoupling || "CPU/RAM alignment to verify downstream";

    const pressure = installed > 0 ? clamp((required / installed) * 100, 0, 140) : 0;

    const statusLabel = status.label === "HEALTHY" ? "GOOD" : status.label;
    const statusColor = status.color || (statusLabel === "GOOD" ? "rgba(44,255,155,.96)" : statusLabel === "RISK" ? "rgba(206,32,41,.96)" : "rgba(250,204,21,.96)");
    const statusFill = statusLabel === "GOOD"
      ? "rgba(44,255,155,.10)"
      : statusLabel === "RISK"
        ? "rgba(206,32,41,.12)"
        : "rgba(250,204,21,.10)";

    const width = 760;
    const height = 500;

    const plot = {
      x: 64,
      y: 108,
      w: 642,
      h: 280
    };

    const maxRaw = Math.max(installed, required, demand, 8) * 1.18;
    const yMax = Math.max(8, Math.ceil(maxRaw / 8) * 8);

    function yScale(value) {
      return plot.y + plot.h - (clamp(value, 0, yMax) / yMax) * plot.h;
    }

    function xScale(position) {
      return plot.x + clamp(position, 0, 1) * plot.w;
    }

    const current = { x: xScale(0.16), y: yScale(demand), label: "*1 demand basis", short: "*1", value: demand, tone: "current" };
    const reservePoint = { x: xScale(0.56), y: yScale(required), label: "*2 reserve pressure", short: "*2", value: required, tone: "growth" };
    const installedPoint = { x: xScale(0.88), y: yScale(installed), label: "*3 downstream validation", short: "*3", value: installed, tone: "failover" };

    const watchThreshold = installed * 0.70;
    const riskThreshold = installed * 0.90;

    const watchY = yScale(watchThreshold);
    const riskY = yScale(riskThreshold);
    const capacityY = yScale(installed);
    const requiredY = yScale(required);

    const riskZoneY = plot.y;
    const riskZoneH = Math.max(0, riskY - plot.y);
    const watchZoneY = riskY;
    const watchZoneH = Math.max(0, watchY - riskY);
    const goodZoneY = watchY;
    const goodZoneH = Math.max(0, plot.y + plot.h - watchY);

    const curvePath = [
      "M " + current.x.toFixed(1) + " " + current.y.toFixed(1),
      "Q " + ((current.x + reservePoint.x) / 2).toFixed(1) + " " + ((current.y + reservePoint.y) / 2 - 12).toFixed(1) + " " + reservePoint.x.toFixed(1) + " " + reservePoint.y.toFixed(1),
      "Q " + ((reservePoint.x + installedPoint.x) / 2).toFixed(1) + " " + ((reservePoint.y + installedPoint.y) / 2 - 10).toFixed(1) + " " + installedPoint.x.toFixed(1) + " " + installedPoint.y.toFixed(1)
    ].join(" ");

    const tickStep = yMax <= 32 ? 8 : 12;
    const yTicks = [];
    for (let value = 0; value <= yMax; value += tickStep) {
      yTicks.push(value);
    }
    if (yTicks[yTicks.length - 1] !== yMax) yTicks.push(yMax);

    const yGrid = yTicks.map(function (tick) {
      const y = yScale(tick);
      const cls = tick === 0 || tick === yMax ? "grid-major" : "grid";
      return [
        '<path d="M' + plot.x + ' ' + y.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + cls + '"/>',
        '<text x="' + (plot.x - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="tick">' + svgText(gb(tick, tick >= 10 ? 0 : 1)) + '</text>'
      ].join("");
    }).join("");

    const xTicks = [
      { label: "Demand", x: current.x },
      { label: "Required", x: reservePoint.x },
      { label: "Installed", x: installedPoint.x }
    ].map(function (tick) {
      return [
        '<path d="M' + tick.x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="grid"/>',
        '<text x="' + tick.x.toFixed(1) + '" y="' + (plot.y + plot.h + 16) + '" text-anchor="middle" class="tick">' + svgText(tick.label) + '</text>'
      ].join("");
    }).join("");

    function markerSvg(point, labelAnchor, valueAnchor, dx, dy) {
      const labelX = clamp(point.x + dx, plot.x + 58, plot.x + plot.w - 58);
      const labelY = clamp(point.y + dy, plot.y + 34, plot.y + plot.h - 24);
      return [
        '<path d="M' + point.x.toFixed(1) + ' ' + point.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="6.5" class="marker-ring"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4.5" class="marker-' + point.tone + '"/>',
        '<text x="' + labelX.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="' + labelAnchor + '" class="marker-worker tone-' + point.tone + '">' + svgText(point.short + " " + gb(point.value, point.tone === "failover" ? 0 : 1)) + '</text>',
        '<text x="' + labelX.toFixed(1) + '" y="' + (labelY + 13).toFixed(1) + '" text-anchor="' + valueAnchor + '" class="marker-core">' + svgText(point.label.replace(point.short + " ", "")) + '</text>'
      ].join("");
    }

    const footerCoupling = String(cpuCoupling).length > 46 ? String(cpuCoupling).slice(0, 43) + "..." : String(cpuCoupling);
    const workloadFooter = String(workloadLabel).length > 28 ? String(workloadLabel).slice(0, 25) + "..." : String(workloadLabel);

    return [
      '<svg data-export-svg="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="RAM Capacity Envelope analytic graph" data-compute-capacity-visual="ram-envelope" data-compute-visual="ram-capacity-envelope">',
      '<defs>',
      '<linearGradient id="computeRamEnvelopeBg" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#07110f"/>',
      '<stop offset="100%" stop-color="#040b09"/>',
      '</linearGradient>',
      '<style>',
      '.bg{fill:url(#computeRamEnvelopeBg);stroke:rgba(44,255,155,.22);stroke-width:1.2}.frame{fill:none;stroke:rgba(44,255,155,.16);stroke-width:1}.plot-frame{fill:rgba(255,255,255,.01);stroke:rgba(44,255,155,.20);stroke-width:1}.zone-good{fill:rgba(44,255,155,.05)}.zone-watch{fill:rgba(250,204,21,.055)}.zone-risk{fill:rgba(239,68,68,.06)}.grid{fill:none;stroke:rgba(238,246,255,.08);stroke-width:1}.grid-major{fill:none;stroke:rgba(238,246,255,.14);stroke-width:1}.axis{fill:none;stroke:rgba(238,246,255,.42);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.tick{fill:rgba(203,213,225,.90);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}.axis-label{fill:rgba(203,213,225,.92);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px}.header{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:.5px}.subhead{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:600}.zone-label{font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:.7px}.zone-good-text{fill:rgba(44,255,155,.92)}.zone-watch-text{fill:rgba(250,204,21,.95)}.zone-risk-text{fill:rgba(206,32,41,.95)}.capacity-line{fill:none;stroke:#2cff9b;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.watch-line{fill:none;stroke:rgba(250,204,21,.72);stroke-width:1;stroke-dasharray:5 5}.risk-line{fill:none;stroke:rgba(206,32,41,.86);stroke-width:1;stroke-dasharray:5 5}.required-line{fill:none;stroke:rgba(238,246,255,.34);stroke-width:1.1;stroke-dasharray:6 5}.curve-shadow{fill:none;stroke:rgba(44,255,155,.22);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.curve{fill:none;stroke:#2cff9b;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.marker-current{fill:#38d9ff;stroke:#04110d;stroke-width:1.2}.marker-growth{fill:#a78bfa;stroke:#04110d;stroke-width:1.2}.marker-failover{fill:#f59e0b;stroke:#04110d;stroke-width:1.2}.marker-ring{fill:none;stroke:rgba(238,246,255,.7);stroke-width:1}.marker-worker{font-family:Inter,Arial,Helvetica,sans-serif;font-size:9.5px;font-weight:850}.marker-core{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:8.8px;font-weight:650}.marker-worker.tone-current{fill:#38d9ff}.marker-worker.tone-growth{fill:#a78bfa}.marker-worker.tone-failover{fill:#f59e0b}.footer-text.tone-current{fill:#38d9ff}.footer-text.tone-growth{fill:#a78bfa}.footer-text.tone-failover{fill:#f59e0b}.ref-line{fill:none;stroke:rgba(238,246,255,.16);stroke-width:1;stroke-dasharray:4 4}.capacity-label{fill:#2cff9b;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800}.required-label{fill:rgba(203,213,225,.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:700}.status-chip{stroke-width:1}.status-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.7px}.footer-text{fill:rgba(203,213,225,.88);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}',
      '</style>',
      '</defs>',
      '<rect x="14" y="14" width="732" height="402" rx="16" class="bg"/>',
      '<rect x="28" y="28" width="704" height="374" rx="12" class="frame"/>',
      '<text x="46" y="58" class="header">RAM CAPACITY ENVELOPE</text>',
      '<text x="46" y="77" class="subhead">Demand curve vs installed RAM capacity</text>',
      '<rect x="628" y="42" width="68" height="28" rx="7" fill="' + statusFill + '" stroke="' + statusColor + '" class="status-chip"/>',
      '<text x="662" y="61" text-anchor="middle" fill="' + statusColor + '" class="status-text">' + svgText(statusLabel) + '</text>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + riskZoneH.toFixed(1) + '" class="zone-risk"/>',
      '<rect x="' + plot.x + '" y="' + watchZoneY.toFixed(1) + '" width="' + plot.w + '" height="' + watchZoneH.toFixed(1) + '" class="zone-watch"/>',
      '<rect x="' + plot.x + '" y="' + goodZoneY.toFixed(1) + '" width="' + plot.w + '" height="' + goodZoneH.toFixed(1) + '" class="zone-good"/>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + plot.h + '" class="plot-frame"/>',
      yGrid,
      xTicks,
      '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
      '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
      '<text x="385" y="456" text-anchor="middle" class="axis-label">RAM planning checkpoints</text>',
      '<text x="37" y="206" text-anchor="middle" transform="rotate(-90 37 206)" class="axis-label">GB</text>',
      '<path d="M' + plot.x + ' ' + riskY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="risk-line"/>',
      '<text x="' + (plot.x + 10) + '" y="' + (riskY - 7).toFixed(1) + '" class="zone-label zone-risk-text">RISK threshold ? ' + svgText(gb(riskThreshold, 1)) + '</text>',
      '<path d="M' + plot.x + ' ' + watchY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="watch-line"/>',
      '<text x="' + (plot.x + 10) + '" y="' + (watchY - 7).toFixed(1) + '" class="zone-label zone-watch-text">WATCH threshold ? ' + svgText(gb(watchThreshold, 1)) + '</text>',
      '<path d="M' + plot.x + ' ' + capacityY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="capacity-line"/>',
      '<text x="' + (plot.x + plot.w - 10) + '" y="' + (capacityY - 9).toFixed(1) + '" text-anchor="end" class="capacity-label">Installed capacity ? ' + svgText(gb(installed, 0)) + '</text>',
      '<path d="M' + plot.x + ' ' + requiredY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="required-line"/>',
      '<text x="' + (plot.x + plot.w - 10) + '" y="' + (requiredY + 14).toFixed(1) + '" text-anchor="end" class="required-label">Required ? ' + svgText(gb(required, 1)) + '</text>',
      '<path d="' + curvePath + '" class="curve-shadow"/>',
      '<path d="' + curvePath + '" class="curve"/>',
      markerSvg(current, "start", "start", 14, -24),
      markerSvg(reservePoint, "middle", "middle", 0, -30),
      markerSvg(installedPoint, "end", "end", -14, 30),
      '<text x="' + (plot.x + 18) + '" y="' + (plot.y + plot.h - 18) + '" class="zone-label zone-good-text">GOOD</text>',
      '<text x="176" y="430" text-anchor="middle" class="footer-text tone-current">*1 demand basis</text>',
      '<text x="380" y="430" text-anchor="middle" class="footer-text tone-growth">*2 reserve pressure</text>',
      '<text x="584" y="430" text-anchor="middle" class="footer-text tone-failover">*3 downstream validation</text>',
      '<text x="46" y="478" class="tick">' + svgText(workloadFooter) + ' ? headroom ' + svgText(gb(headroom, 1)) + ' ? reserve ' + svgText(pct(reserveRatio)) + ' ? required pressure ' + svgText(pct(pressure)) + '</text>',
      '<text x="706" y="478" text-anchor="end" class="tick">' + svgText(footerCoupling) + '</text>',
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
  
      const recommendedLogicalCores = Math.max(1, cpuEnvelopeNumber(
        outputs.recommendedLogicalCores || result.recommendedLogicalCores || result.cores,
        1
      ));
  
      const targetUtilizationPercent = cpuEnvelopeClamp(cpuEnvelopeNumber(
        inputs.targetUtilizationPercent || outputs.utilizationTarget || result.utilizationTarget,
        70
      ), 10, 95);
  
      const currentDemandCores = Math.max(0, cpuEnvelopeNumber(
        outputs.baseDemandCores || result.baseDemandCores,
        cpuEnvelopeNumber(outputs.effectiveDemandCores || result.effectiveDemandCores || result.eff, 0)
      ));
  
      const growthDemandCores = Math.max(currentDemandCores, cpuEnvelopeNumber(
        outputs.demandAfterGrowthCores || result.demandAfterGrowthCores,
        currentDemandCores
      ));
  
      const failoverDemandCores = Math.max(growthDemandCores, cpuEnvelopeNumber(
        outputs.effectiveDemandCores || result.effectiveDemandCores || result.eff,
        growthDemandCores
      ));
  
      const finalDemandCores = Math.max(currentDemandCores, growthDemandCores, failoverDemandCores);
      const usableCapacityCores = Math.max(0.1, recommendedLogicalCores * (targetUtilizationPercent / 100));
      const watchThresholdCores = recommendedLogicalCores * 0.70;
      const riskThresholdCores = recommendedLogicalCores * 0.90;
  
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
      const outputs = result && result.outputs ? result.outputs : {};
      const inputs = result && result.inputs ? result.inputs : {};
  
      function num(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      }
  
      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
  
      function esc(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }
  
      const status = cpuEnvelopeStatus(result || {}).toUpperCase();
      const statusColor = status === "GOOD" || status === "HEALTHY"
        ? "rgba(44,255,155,.96)"
        : status === "RISK"
          ? "rgba(206,32,41,.96)"
          : "rgba(250,204,21,.96)";
      const statusFill = status === "GOOD" || status === "HEALTHY"
        ? "rgba(44,255,155,.10)"
        : status === "RISK"
          ? "rgba(206,32,41,.12)"
          : "rgba(250,204,21,.10)";
      const statusLine = status === "GOOD" || status === "HEALTHY"
        ? "rgba(44,255,155,.90)"
        : status === "RISK"
          ? "rgba(206,32,41,.92)"
          : "rgba(250,204,21,.90)";
      const statusLabel = status === "HEALTHY" ? "GOOD" : status;
  
      const currentWorkers = Math.max(1, num(inputs.concurrency || result.concurrency, 16));
      const growthReserve = clamp(num(inputs.growthReservePercent || result.growthReservePercent, 20), 0, 200);
      const failoverMultiplier = clamp(num(inputs.failoverMultiplier || result.failoverMultiplier, 1), 1, 2);
  
      const growthWorkers = Math.max(currentWorkers, Math.round(currentWorkers * (1 + (growthReserve / 100))));
      const failoverWorkers = Math.max(growthWorkers, Math.round(growthWorkers * failoverMultiplier));
  
      const currentRequiredCores = Math.max(0, num(outputs.baseDemandCores || result.baseDemandCores, num(outputs.effectiveDemandCores || result.eff, 0)));
      const growthRequiredCores = Math.max(currentRequiredCores, num(outputs.demandAfterGrowthCores || result.demandAfterGrowthCores, currentRequiredCores * (1 + (growthReserve / 100))));
      const failoverRequiredCores = Math.max(growthRequiredCores, num(outputs.effectiveDemandCores || result.effectiveDemandCores || result.eff, growthRequiredCores));
  
      const recommendedLogicalCores = Math.max(1, num(outputs.recommendedLogicalCores || result.recommendedLogicalCores || result.cores, 1));
      const recommendedPhysicalCores = Math.max(1, num(outputs.recommendedPhysicalCores || result.recommendedPhysicalCores || result.physicalCores, Math.ceil(recommendedLogicalCores / 2)));
      const targetUtilizationPercent = clamp(num(inputs.targetUtilizationPercent || outputs.utilizationTarget || result.utilizationTarget, 70), 10, 95);
  
      const usableCapacityCores = Math.max(0.1, recommendedLogicalCores * (targetUtilizationPercent / 100));
      const watchThresholdCores = recommendedLogicalCores * 0.70;
      const riskThresholdCores = recommendedLogicalCores * 0.90;
  
      const width = 760;
      const height = 500;
  
      const plot = {
        x: 64,
        y: 108,
        w: 642,
        h: 280
      };
  
      const maxWorkers = Math.max(failoverWorkers, growthWorkers, currentWorkers, 1);
      const maxCores = Math.max(
        failoverRequiredCores,
        recommendedLogicalCores,
        riskThresholdCores,
        usableCapacityCores,
        1
      );
  
      const xMax = Math.max(4, Math.ceil(maxWorkers / 4) * 4);
      const yMax = Math.max(4, Math.ceil(maxCores / 4) * 4);
  
      function xScale(workers) {
        return plot.x + (clamp(workers, 0, xMax) / xMax) * plot.w;
      }
  
      function yScale(cores) {
        return plot.y + plot.h - (clamp(cores, 0, yMax) / yMax) * plot.h;
      }
  
      const current = {
        x: xScale(currentWorkers),
        y: yScale(currentRequiredCores)
      };
  
      const growth = {
        x: xScale(growthWorkers),
        y: yScale(growthRequiredCores)
      };
  
      const failover = {
        x: xScale(failoverWorkers),
        y: yScale(failoverRequiredCores)
      };
  
      const usableY = yScale(usableCapacityCores);
      const logicalY = yScale(recommendedLogicalCores);
      const watchY = yScale(watchThresholdCores);
      const riskY = yScale(riskThresholdCores);
  
      const riskZoneY = plot.y;
      const riskZoneH = Math.max(0, riskY - plot.y);
  
      const watchZoneY = riskY;
      const watchZoneH = Math.max(0, watchY - riskY);
  
      const goodZoneY = watchY;
      const goodZoneH = Math.max(0, plot.y + plot.h - watchY);
  
      const curveStartX = plot.x + 18;
      const curveStartY = yScale(Math.max(1, currentRequiredCores * 0.45));
  
      const curvePath = [
        "M " + curveStartX.toFixed(1) + " " + curveStartY.toFixed(1),
        "Q " + ((curveStartX + current.x) / 2).toFixed(1) + " " + ((curveStartY + current.y) / 2 + 8).toFixed(1) + " " + current.x.toFixed(1) + " " + current.y.toFixed(1),
        "Q " + ((current.x + growth.x) / 2).toFixed(1) + " " + ((current.y + growth.y) / 2 - 10).toFixed(1) + " " + growth.x.toFixed(1) + " " + growth.y.toFixed(1),
        "Q " + ((growth.x + failover.x) / 2).toFixed(1) + " " + ((growth.y + failover.y) / 2 - 10).toFixed(1) + " " + failover.x.toFixed(1) + " " + failover.y.toFixed(1)
      ].join(" ");
  
      const yTicks = [];
      const yStep = yMax <= 16 ? 2 : 4;
      for (let v = 0; v <= yMax; v += yStep) {
        yTicks.push(v);
      }
  
      const xTicks = [0, currentWorkers, growthWorkers, failoverWorkers]
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .sort((a, b) => a - b);
  
      const yGrid = yTicks.map(function (tick) {
        const y = yScale(tick);
        const cls = tick === 0 || tick === yMax ? "grid-major" : "grid";
        return [
          '<path d="M' + plot.x + ' ' + y.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + cls + '"/>',
          '<text x="' + (plot.x - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="tick">' + tick + '</text>'
        ].join("");
      }).join("");
  
      const xGrid = xTicks.map(function (tick) {
        const x = xScale(tick);
        return [
          '<path d="M' + x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="grid"/>',
          '<text x="' + x.toFixed(1) + '" y="' + (plot.y + plot.h + 16) + '" text-anchor="middle" class="tick">' + tick + '</text>'
        ].join("");
      }).join("");
  
      const currentLabel = currentWorkers + " workers · " + currentRequiredCores.toFixed(1) + " cores";
      const growthLabel = growthWorkers + " workers · " + growthRequiredCores.toFixed(1) + " cores";
      const failoverLabel = failoverWorkers + " workers · " + failoverRequiredCores.toFixed(1) + " cores";
  
      function markerLabelX(point) {
        return Math.max(plot.x + 44, Math.min(plot.x + plot.w - 50, point.x));
      }
  
      function markerLabelY(point) {
        return Math.min(plot.y + plot.h - 28, point.y + 18);
      }
  
      return [
        '<svg data-export-svg="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="CPU Capacity Envelope analytic graph" data-compute-visual="cpu-capacity-envelope">',
        '<defs>',
        '<linearGradient id="computeCpuEnvelopeBg" x1="0" y1="0" x2="0" y2="1">',
        '<stop offset="0%" stop-color="#07110f"/>',
        '<stop offset="100%" stop-color="#040b09"/>',
        '</linearGradient>',
        '<style>',
        '.bg{fill:url(#computeCpuEnvelopeBg);stroke:rgba(44,255,155,.22);stroke-width:1.2}.frame{fill:none;stroke:rgba(44,255,155,.16);stroke-width:1}.plot-frame{fill:rgba(255,255,255,.01);stroke:rgba(44,255,155,.20);stroke-width:1}.zone-good{fill:rgba(44,255,155,.05)}.zone-watch{fill:rgba(250,204,21,.055)}.zone-risk{fill:rgba(239,68,68,.06)}.grid{fill:none;stroke:rgba(238,246,255,.08);stroke-width:1}.grid-major{fill:none;stroke:rgba(238,246,255,.14);stroke-width:1}.axis{fill:none;stroke:rgba(238,246,255,.42);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.tick{fill:rgba(203,213,225,.90);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}.axis-label{fill:rgba(203,213,225,.92);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px}.header{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:.5px}.subhead{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:600}.zone-label{font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:.7px}.zone-good-text{fill:rgba(44,255,155,.92)}.zone-watch-text{fill:rgba(250,204,21,.95)}.zone-risk-text{fill:rgba(206,32,41,.95)}.capacity-line{fill:none;stroke:#2cff9b;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.watch-line{fill:none;stroke:rgba(250,204,21,.72);stroke-width:1;stroke-dasharray:5 5}.risk-line{fill:none;stroke:rgba(206,32,41,.86);stroke-width:1;stroke-dasharray:5 5}.logical-line{fill:none;stroke:rgba(238,246,255,.34);stroke-width:1.1;stroke-dasharray:6 5}.curve-shadow{fill:none;stroke:rgba(44,255,155,.22);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.curve{fill:none;stroke:#2cff9b;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.marker-current{fill:#38d9ff;stroke:#04110d;stroke-width:1.2}.marker-growth{fill:#a78bfa;stroke:#04110d;stroke-width:1.2}.marker-failover{fill:#f59e0b;stroke:#04110d;stroke-width:1.2}.marker-ring{fill:none;stroke:rgba(238,246,255,.7);stroke-width:1}.marker-worker{font-family:Inter,Arial,Helvetica,sans-serif;font-size:9.5px;font-weight:850}.marker-core{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:8.8px;font-weight:650}.marker-worker.tone-current{fill:#38d9ff}.marker-worker.tone-growth{fill:#a78bfa}.marker-worker.tone-failover{fill:#f59e0b}.footer-text.tone-current{fill:#38d9ff}.footer-text.tone-growth{fill:#a78bfa}.footer-text.tone-failover{fill:#f59e0b}.ref-line{fill:none;stroke:rgba(238,246,255,.16);stroke-width:1;stroke-dasharray:4 4}.capacity-label{fill:#2cff9b;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800}.logical-label{fill:rgba(203,213,225,.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:700}.status-chip{stroke-width:1}.status-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.7px}.footer-text{fill:rgba(203,213,225,.88);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}',
        '</style>',
        '</defs>',
        '<rect x="14" y="14" width="732" height="472" rx="16" class="bg"/>',
        '<rect x="26" y="26" width="708" height="448" rx="12" class="frame"/>',
        '<text x="38" y="50" class="header">CPU CAPACITY ENVELOPE</text>',
        '<text x="38" y="68" class="subhead">Demand curve vs usable CPU capacity</text>',
        '<rect x="654" y="34" width="68" height="26" rx="8" fill="' + statusFill + '" stroke="' + statusLine + '" class="status-chip"/>',
        '<text x="688" y="51" text-anchor="middle" fill="' + statusColor + '" class="status-text">' + esc(statusLabel) + '</text>',
        '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + plot.h + '" rx="8" class="plot-frame"/>',
        '<rect x="' + plot.x + '" y="' + riskZoneY.toFixed(1) + '" width="' + plot.w + '" height="' + riskZoneH.toFixed(1) + '" class="zone-risk"/>',
        '<rect x="' + plot.x + '" y="' + watchZoneY.toFixed(1) + '" width="' + plot.w + '" height="' + watchZoneH.toFixed(1) + '" class="zone-watch"/>',
        '<rect x="' + plot.x + '" y="' + goodZoneY.toFixed(1) + '" width="' + plot.w + '" height="' + goodZoneH.toFixed(1) + '" class="zone-good"/>',
        yGrid,
        xGrid,
        '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
        '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
        '<text x="42" y="101" class="axis-label">cores</text>',
        '<text x="385" y="442" text-anchor="middle" class="axis-label">Concurrent workers / projected load</text>',
        '<path d="M' + plot.x + ' ' + usableY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="capacity-line"/>',
        '<text x="694" y="' + (usableY - 8).toFixed(1) + '" text-anchor="end" class="capacity-label">Usable capacity · ' + usableCapacityCores.toFixed(1) + ' cores</text>',
        '<path d="M' + plot.x + ' ' + logicalY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="logical-line"/>',
        '<text x="694" y="' + (logicalY - 7).toFixed(1) + '" text-anchor="end" class="logical-label">Recommended logical cores · ' + recommendedLogicalCores + '</text>',
        '<path d="M' + plot.x + ' ' + watchY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="watch-line"/>',
        '<path d="M' + plot.x + ' ' + riskY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="risk-line"/>',
        '<path d="' + curvePath + '" class="curve-shadow"/>',
        '<path d="' + curvePath + '" class="curve"/>',
        '<path d="M' + current.x.toFixed(1) + ' ' + current.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
        '<path d="M' + growth.x.toFixed(1) + ' ' + growth.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
        '<path d="M' + failover.x.toFixed(1) + ' ' + failover.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
        '<circle cx="' + current.x.toFixed(1) + '" cy="' + current.y.toFixed(1) + '" r="6.5" class="marker-ring"/>',
        '<circle cx="' + current.x.toFixed(1) + '" cy="' + current.y.toFixed(1) + '" r="4.5" class="marker-current"/>',
        '<text x="' + markerLabelX(current).toFixed(1) + '" y="' + markerLabelY(current).toFixed(1) + '" text-anchor="middle" class="marker-worker tone-current">' + currentWorkers + ' workers</text>',
        '<text x="' + markerLabelX(current).toFixed(1) + '" y="' + (markerLabelY(current) + 12).toFixed(1) + '" text-anchor="middle" class="marker-core">' + currentRequiredCores.toFixed(1) + ' cores</text>',
        '<circle cx="' + growth.x.toFixed(1) + '" cy="' + growth.y.toFixed(1) + '" r="6.5" class="marker-ring"/>',
        '<circle cx="' + growth.x.toFixed(1) + '" cy="' + growth.y.toFixed(1) + '" r="4.5" class="marker-growth"/>',
        '<text x="' + markerLabelX(growth).toFixed(1) + '" y="' + markerLabelY(growth).toFixed(1) + '" text-anchor="middle" class="marker-worker tone-growth">' + growthWorkers + ' workers</text>',
        '<text x="' + markerLabelX(growth).toFixed(1) + '" y="' + (markerLabelY(growth) + 12).toFixed(1) + '" text-anchor="middle" class="marker-core">' + growthRequiredCores.toFixed(1) + ' cores</text>',
        '<circle cx="' + failover.x.toFixed(1) + '" cy="' + failover.y.toFixed(1) + '" r="6.5" class="marker-ring"/>',
        '<circle cx="' + failover.x.toFixed(1) + '" cy="' + failover.y.toFixed(1) + '" r="4.5" class="marker-failover"/>',
        '<text x="' + markerLabelX(failover).toFixed(1) + '" y="' + markerLabelY(failover).toFixed(1) + '" text-anchor="middle" class="marker-worker tone-failover">' + failoverWorkers + ' workers</text>',
        '<text x="' + markerLabelX(failover).toFixed(1) + '" y="' + (markerLabelY(failover) + 12).toFixed(1) + '" text-anchor="middle" class="marker-core">' + failoverRequiredCores.toFixed(1) + ' cores</text>',
        '<text x="72" y="' + (watchY - 7).toFixed(1) + '" class="logical-label">WATCH threshold · ' + watchThresholdCores.toFixed(1) + '</text>',
        '<text x="72" y="' + (riskY - 7).toFixed(1) + '" class="logical-label">RISK threshold · ' + riskThresholdCores.toFixed(1) + '</text>',
        '<text x="176" y="473" text-anchor="middle" class="footer-text tone-current">*1 demand basis</text>',
        '<text x="380" y="473" text-anchor="middle" class="footer-text tone-growth">*2 reserve pressure</text>',
        '<text x="584" y="473" text-anchor="middle" class="footer-text tone-failover">*3 downstream validation</text>',
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

    if (result && (result.recommendedLogicalCores || result.outputs?.recommendedLogicalCores || result.cores)) {
      return buildCpuCapacityEnvelopeSvg(result);
    }

    return buildRamCapacityEnvelopeSvg(result);
  }

  window.ScopedLabsComputeCapacityVisuals = Object.freeze({
    version: VERSION,
    buildCapacityEnvelopeSvg,
    buildCpuCapacityEnvelopeSvg,
    renderCpuCapacityEnvelope,
    buildRamCapacityEnvelopeSvg,
    renderRamCapacityEnvelope,
    clear
  });
})();
