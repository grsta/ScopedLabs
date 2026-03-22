(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart = null;

  const els = {
    entrances: $("entrances"),
    interiorAreas: $("interiorAreas"),
    floors: $("floors"),
    strategy: $("strategy"),
    type: $("type"),
    results: $("results"),
    flowNote: $("flow-note"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart")
  };

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${label}</span>
        <span class="result-value">${value}</span>
      </div>
    `;
  }

  function render(rows) {
    els.results.innerHTML = rows.join("");
  }

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function resetResults() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    destroyChart();
  }

  function invalidate() {
    sessionStorage.removeItem(FLOW_KEY);
    resetResults();
  }

  function loadFlow() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed || parsed.category !== "access-control") return;

    const d = parsed.data || {};
    const bits = [];

    if (Number.isFinite(Number(d.total))) {
      bits.push(`Prior Access Levels: <strong>${d.total}</strong>`);
    }
    if (Number.isFinite(Number(d.combinations))) {
      bits.push(`Role-Area Combos: <strong>${d.combinations}</strong>`);
    }
    if (Number.isFinite(Number(d.scalingPressure))) {
      bits.push(`Scaling Pressure: <strong>${Number(d.scalingPressure).toFixed(1)}</strong>`);
    }
    if (d.risk) {
      bits.push(`Complexity Status: <strong>${d.risk}</strong>`);
    }

    if (!bits.length) return;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>Carried over access-control context:</strong><br>
      ${bits.join("<br>")}
      <br><br>
      Use APB sparingly. If the overall access design is already complex, excessive zone segmentation can add operational friction faster than it adds security value.
    `;
  }

  function getStrategyFactor(strategy) {
    if (strategy === "minimal") return 0.65;
    if (strategy === "balanced") return 1.0;
    return 1.35;
  }

  function getTypeFactor(type) {
    return type === "hard" ? 1.25 : 0.75;
  }

  function getRecommendedZones(entrances, interior, floors, strategy) {
    let zones = 2;
    let perimeterZones = 2;
    let interiorZones = 0;
    let floorZones = 0;

    if (strategy === "minimal") {
      perimeterZones = 2;
      interiorZones = Math.round(interior * 0.15);
      floorZones = 0;
    } else if (strategy === "balanced") {
      perimeterZones = 2;
      interiorZones = Math.round(interior * 0.6);
      floorZones = floors > 1 ? Math.round((floors - 1) * 0.5) : 0;
    } else {
      perimeterZones = 2;
      interiorZones = interior;
      floorZones = Math.max(0, floors - 1);
    }

    zones = Math.max(2, perimeterZones + interiorZones + floorZones);

    return {
      total: zones,
      perimeterZones,
      interiorZones,
      floorZones
    };
  }

  function getOperationalRisk(complexityIndex, type, strategy) {
    if (type === "hard" && (strategy === "strict" || complexityIndex >= 14)) {
      return "HIGH";
    }
    if (complexityIndex >= 9) {
      return "MODERATE";
    }
    return "LOW";
  }

  function getModeRecommendation(type, strategy, complexityIndex) {
    if (type === "hard" && complexityIndex >= 12) {
      return "Consider SOFT APB or narrower enforcement scope";
    }
    if (strategy === "minimal") {
      return "Perimeter-focused APB is likely enough";
    }
    if (strategy === "balanced") {
      return "Balanced APB with key interior checkpoints is appropriate";
    }
    return "Strict APB only makes sense if operations can tolerate enforcement friction";
  }

  function getInterpretation({
    zones,
    pairedEntrances,
    complexityIndex,
    operationalRisk,
    type,
    strategy,
    enforcementExposure
  }) {
    if (operationalRisk === "HIGH") {
      return `This anti-passback design is enforcement-heavy. With ${zones} recommended zones and ${pairedEntrances} paired perimeter transitions, hard APB can easily create nuisance lockouts if reads are missed or circulation paths are inconsistent. Keep APB scope tighter unless you have a strong threat model and reliable bidirectional read coverage.`;
    }

    if (operationalRisk === "MODERATE") {
      return `This design is workable, but it needs discipline. The zone count and transition structure are high enough that operator training, exception handling, and reader placement quality will determine whether APB improves control or just adds friction.`;
    }

    return `This anti-passback design stays relatively manageable. The recommended zone structure is restrained enough that APB can add useful control without becoming an administrative burden, especially if exemptions and emergency paths are planned cleanly.`;
  }

  function renderChart(metrics) {
    destroyChart();
    if (!els.chart) return;

    const labels = [
      "Recommended Zones",
      "Paired Entrances",
      "Complexity Index",
      "Enforcement Exposure"
    ];

    const values = [
      metrics.recommendedZones,
      metrics.pairedEntrances,
      metrics.complexityIndex,
      metrics.enforcementExposure
    ];

    const dominantIndex = values.indexOf(Math.max(...values));
    const referenceValue = 10;
    const chartMax = Math.max(18, Math.ceil(Math.max(...values, referenceValue) * 1.2));

    const chartBgPlugin = {
      id: "chartBgPlugin",
      beforeDraw(c) {
        const { ctx, chartArea } = c;
        if (!chartArea) return;
        const { left, top, width, height } = chartArea;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(left, top, width, height);
        ctx.restore();
      }
    };

    const thresholdBandPlugin = {
      id: "thresholdBandPlugin",
      beforeDatasetsDraw(c) {
        const { ctx, chartArea, scales } = c;
        if (!chartArea || !scales.x) return;

        const x = scales.x;
        const { top, bottom, left, right } = chartArea;

        const healthyMax = Math.min(6, x.max);
        const watchMax = Math.min(10, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 6) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(6),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(6),
            bottom - top
          );
        }

        if (x.max > 10) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(10),
            top,
            right - x.getPixelForValue(10),
            bottom - top
          );
        }

        ctx.restore();
      },
      afterDatasetsDraw(c) {
        const { ctx, chartArea, scales } = c;
        if (!chartArea || !scales.x || !scales.y) return;

        const x = scales.x;
        const y = scales.y;
        const { top, bottom } = chartArea;

        ctx.save();

        const rx = x.getPixelForValue(referenceValue);
        ctx.strokeStyle = "rgba(120, 255, 170, 0.98)";
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rx, top);
        ctx.lineTo(rx, bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(220, 255, 235, 0.96)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Complexity Watch Limit", rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(0.8), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(6.8), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(10.8), top + 14);

        const dominantValue = values[dominantIndex];
        const px = x.getPixelForValue(dominantValue);
        const py = y.getPixelForValue(labels[dominantIndex]);

        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(225, 255, 240, 1)";
        ctx.fill();
        ctx.strokeStyle = "rgba(120, 255, 170, 0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
      }
    };

    chart = new Chart(els.chart, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "APB Design Metrics",
            data: values,
            barPercentage: 0.5,
            categoryPercentage: 0.58,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            backgroundColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 10) return "rgba(255, 92, 92, 1)";
                if (v > 6) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 10) return "rgba(255, 77, 77, 0.30)";
              if (v > 6) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 10) return "rgba(255, 220, 220, 1)";
                if (v > 6) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 10) return "rgba(255, 105, 105, 1)";
              if (v > 6) return "rgba(255, 198, 95, 1)";
              return "rgba(135, 255, 182, 1)";
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        animation: {
          duration: 700,
          easing: "easeOutQuart"
        },
        layout: {
          padding: {
            top: 28,
            right: 12,
            left: 10,
            bottom: 0
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(8, 18, 18, 0.96)",
            titleColor: "#e8fff1",
            bodyColor: "#d9f7e7",
            borderColor: "rgba(100, 255, 180, 0.25)",
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label(context) {
                return ` ${context.raw}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: chartMax,
            ticks: {
              color: "rgba(220, 238, 230, 0.78)"
            },
            grid: {
              color: "rgba(110, 160, 140, 0.10)"
            },
            title: {
              display: true,
              text: "Operational Magnitude",
              color: "rgba(230, 255, 240, 0.92)"
            }
          },
          y: {
            ticks: {
              color: "rgba(228, 245, 235, 0.92)"
            },
            grid: {
              display: false
            }
          }
        }
      },
      plugins: [chartBgPlugin, thresholdBandPlugin]
    });

    els.chart.style.width = "100%";
    els.chart.style.height = "340px";
    if (els.chart.parentElement) {
      els.chart.parentElement.style.minHeight = "340px";
    }
  }

  function calc() {
    const entrances = Math.max(0, n("entrances"));
    const interior = Math.max(0, n("interiorAreas"));
    const floors = Math.max(1, n("floors"));
    const strategy = els.strategy.value;
    const type = els.type.value;

    const zoneBreakdown = getRecommendedZones(entrances, interior, floors, strategy);
    const pairedFactor = type === "hard" ? 1.0 : 0.6;
    const pairedEntrances = Math.round(entrances * pairedFactor);

    const transitionDensity = entrances + interior + Math.max(0, floors - 1);
    const complexityIndexRaw =
      (zoneBreakdown.total * getStrategyFactor(strategy) * 0.9) +
      (pairedEntrances * 0.45) +
      ((floors - 1) * 0.8) +
      (interior * 0.25) +
      (getTypeFactor(type) * 1.2);

    const complexityIndex = Number(clamp(complexityIndexRaw, 1, 18).toFixed(1));
    const enforcementExposure = Number(clamp((pairedEntrances * getTypeFactor(type)) + (zoneBreakdown.total * 0.35), 1, 18).toFixed(1));
    const operationalRisk = getOperationalRisk(complexityIndex, type, strategy);
    const modeRecommendation = getModeRecommendation(type, strategy, complexityIndex);

    let recommendedType = type.toUpperCase();
    if (type === "hard" && operationalRisk === "HIGH") {
      recommendedType = "SOFT or SELECTIVE HARD";
    } else if (type === "soft" && strategy === "minimal") {
      recommendedType = "SOFT";
    }

    const interpretation = getInterpretation({
      zones: zoneBreakdown.total,
      pairedEntrances,
      complexityIndex,
      operationalRisk,
      type,
      strategy,
      enforcementExposure
    });

    render([
      row("Recommended Zones", zoneBreakdown.total),
      row("Perimeter Zones", zoneBreakdown.perimeterZones),
      row("Interior Zones", zoneBreakdown.interiorZones),
      row("Floor Segments", zoneBreakdown.floorZones),
      row("Suggested Paired Entrances (IN/OUT)", pairedEntrances),
      row("APB Complexity Index", complexityIndex),
      row("Operational Risk", operationalRisk),
      row("Recommended Enforcement Mode", recommendedType),
      row("Design Guidance", modeRecommendation),
      row("Engineering Interpretation", interpretation)
    ]);

    renderChart({
      recommendedZones: zoneBreakdown.total,
      pairedEntrances,
      complexityIndex,
      enforcementExposure
    });

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "anti-passback-zones",
      data: {
        recommendedZones: zoneBreakdown.total,
        perimeterZones: zoneBreakdown.perimeterZones,
        interiorZones: zoneBreakdown.interiorZones,
        floorZones: zoneBreakdown.floorZones,
        pairedEntrances,
        complexityIndex,
        operationalRisk,
        recommendedType
      }
    }));
  }

  function reset() {
    els.entrances.value = 6;
    els.interiorAreas.value = 4;
    els.floors.value = 2;
    els.strategy.value = "minimal";
    els.type.value = "soft";
    sessionStorage.removeItem(FLOW_KEY);
    resetResults();
    loadFlow();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  [els.entrances, els.interiorAreas, els.floors, els.strategy, els.type].forEach((el) => {
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  resetResults();
  loadFlow();
})();
