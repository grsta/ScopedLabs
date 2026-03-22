(() => {
  const $ = (id) => document.getElementById(id);
  let chart = null;

  const els = {
    perimeter: $("perimeter"),
    zones: $("zones"),
    highsec: $("highsec"),
    compliance: $("compliance"),
    bothSides: $("bothSides"),
    results: $("results"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart"),
    returnBtn: $("returnBtn")
  };

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${label}</span>
        <span class="result-value">${value}</span>
      </div>
    `;
  }

  function compFactor(c) {
    if (c === "moderate") return 1.15;
    if (c === "strict") return 1.35;
    return 1.0;
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

  function getStatus(complexityIndex) {
    if (complexityIndex > 140) return "RISK";
    if (complexityIndex > 80) return "WATCH";
    return "HEALTHY";
  }

  function getGuidance(status) {
    if (status === "RISK") {
      return "System is becoming complex. Consider segmentation strategy, controller distribution, and phased deployment.";
    }
    if (status === "WATCH") {
      return "System complexity is rising. Ensure controller placement and wiring paths are well planned.";
    }
    return "Standard segmentation is acceptable.";
  }

  function getInsight(status) {
    if (status === "RISK") {
      return "High door count and segmentation will increase install time, wiring complexity, and long-term management overhead.";
    }
    if (status === "WATCH") {
      return "System is manageable but requires disciplined layout and clear segmentation boundaries.";
    }
    return "System is clean and scalable with minimal administrative overhead.";
  }

  function renderChart(data) {
    destroyChart();
    if (!els.chart) return;

    const labels = [
      "Doors",
      "Zones Impact",
      "Readers",
      "Complexity"
    ];

    const values = [
      data.doors,
      data.zonesImpact,
      data.readers,
      data.complexityIndex
    ];

    const displayValues = {
      0: `${data.doors} doors`,
      1: `${data.zonesImpact} impact`,
      2: `${data.readers} readers`,
      3: `${data.complexityIndex} complexity`
    };

    const dominantIndex = values.indexOf(Math.max(...values));
    const referenceValue = 80;
    const chartMax = Math.max(160, Math.ceil(Math.max(...values, referenceValue, 140) * 1.12));

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

        const healthyMax = Math.min(80, x.max);
        const watchMax = Math.min(140, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 80) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(80),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(80),
            bottom - top
          );
        }

        if (x.max > 140) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(140),
            top,
            right - x.getPixelForValue(140),
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
        ctx.fillText("Healthy", x.getPixelForValue(8), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(88), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(148), top + 14);

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

        ctx.fillStyle = "rgba(235, 248, 240, 0.92)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText(displayValues[dominantIndex], Math.min(px + 8, chartArea.right - 110), py - 8);

        ctx.restore();
      }
    };

    chart = new Chart(els.chart, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Door Planning Metrics",
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
                if (v > 140) return "rgba(255, 92, 92, 1)";
                if (v > 80) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 140) return "rgba(255, 77, 77, 0.30)";
              if (v > 80) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 140) return "rgba(255, 220, 220, 1)";
                if (v > 80) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 140) return "rgba(255, 105, 105, 1)";
              if (v > 80) return "rgba(255, 198, 95, 1)";
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
                const i = context.dataIndex;
                return ` ${displayValues[i]}`;
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
              text: "Planning Magnitude",
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

    if (els.chart) {
      els.chart.style.width = "100%";
      els.chart.style.height = "340px";
      if (els.chart.parentElement) {
        els.chart.parentElement.style.minHeight = "340px";
      }
    }
  }

  function calc() {
    const perimeter = Math.max(0, n("perimeter"));
    const zones = Math.max(0, n("zones"));
    const highsec = Math.max(0, n("highsec"));
    const compliance = els.compliance.value;
    const bothSides = els.bothSides.value;

    const perimeterDoors = perimeter;
    const zoneBase = zones * 1.6 * compFactor(compliance);
    const highsecAdd = highsec * (compliance === "strict" ? 2.0 : 1.3);

    let doors = Math.round(perimeterDoors + zoneBase + highsecAdd);
    doors = Math.max(0, doors);

    const readerMultiplier = bothSides === "yes" ? 2 : 1;
    const readers = doors * readerMultiplier;

    const zonesImpact = Math.round(zones * 5);
    const complexityIndex = Math.round(
      doors +
      zones * 2 +
      highsec * 5 +
      (bothSides === "yes" ? doors * 0.5 : 0)
    );

    const status = getStatus(complexityIndex);
    const guidance = getGuidance(status);
    const insight = getInsight(status);

    els.results.innerHTML = [
      row("Perimeter Doors", perimeterDoors),
      row("Interior Zone Doors", Math.round(zoneBase)),
      row("High-Security Additions", Math.round(highsecAdd)),
      row("Total Controlled Doors", doors),
      row("Estimated Reader Count", readers),
      row("Complexity Index", complexityIndex),
      row("System Status", status),
      row("Design Guidance", guidance),
      row("Engineering Insight", insight)
    ].join("");

    renderChart({
      doors,
      zonesImpact,
      readers,
      complexityIndex
    });
  }

  function reset() {
    els.perimeter.value = 8;
    els.zones.value = 6;
    els.highsec.value = 2;
    els.compliance.value = "basic";
    els.bothSides.value = "no";
    resetResults();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  [els.perimeter, els.zones, els.highsec, els.compliance, els.bothSides].forEach((el) => {
    el.addEventListener("input", resetResults);
    el.addEventListener("change", resetResults);
  });

  if (els.returnBtn) {
    els.returnBtn.addEventListener("click", () => {
      window.location.href = "/tools/access-control/";
    });
  }

  reset();
})();