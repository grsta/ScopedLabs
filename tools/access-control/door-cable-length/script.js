(() => {
  const $ = (id) => document.getElementById(id);
  let chart = null;

  const els = {
    distance: $("distance"),
    routing: $("routing"),
    slack: $("slack"),
    doors: $("doors"),
    runs: $("runs"),
    cables: $("cables"),
    results: $("results"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart")
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

  function setCableEnabledFromRuns() {
    const isMulti = els.runs.value === "multi";
    els.cables.disabled = !isMulti;
    if (!isMulti) els.cables.value = 1;
  }

  function getDifficulty(perDoorTotal, cableDensity, totalAllDoors) {
    if (perDoorTotal > 350 || cableDensity > 3.2 || totalAllDoors > 4000) return "HIGH";
    if (perDoorTotal > 220 || cableDensity > 2.0 || totalAllDoors > 2000) return "MODERATE";
    return "LOW";
  }

  function getRecommendation(difficulty, runs, distance) {
    if (difficulty === "HIGH") {
      return "Consider moving control hardware closer, reducing home-run distance, or splitting pathways by door group.";
    }
    if (difficulty === "MODERATE") {
      return "Routing is workable, but pathway efficiency, labeling, and slack discipline will matter in the field.";
    }
    if (runs === "multi" && distance > 150) {
      return "Runs are still acceptable, but verify pathway fill and service loop planning before rough-in.";
    }
    return "Standard routing is acceptable.";
  }

  function getInsight(difficulty) {
    if (difficulty === "HIGH") {
      return "Cable planning is entering a high-effort zone. Expect more labor, higher pathway congestion, and greater install/debug overhead if routing is not controlled carefully.";
    }
    if (difficulty === "MODERATE") {
      return "Cable design is reasonable, but not effortless. Installation success will depend on pathway cleanliness, termination consistency, and avoiding unnecessary reroutes.";
    }
    return "Cable design is clean and efficient. Install should be straightforward with minimal overhead.";
  }

  function renderChart(metrics) {
    destroyChart();
    if (!els.chart) return;

    const labels = [
      "Per-Door Cable",
      "Routing Loss %",
      "Cable Density",
      "Total Cable / 100"
    ];

    const values = [
      metrics.perDoorTotal,
      metrics.routingLossPct,
      metrics.cableDensity * 40,
      metrics.totalAllDoors / 100
    ];

    const displayNote = {
      0: `${metrics.perDoorTotal.toFixed(1)} ft`,
      1: `${metrics.routingLossPct.toFixed(0)}%`,
      2: `${metrics.cableDensity.toFixed(2)}`,
      3: `${metrics.totalAllDoors.toFixed(0)} ft total`
    };

    const dominantIndex = values.indexOf(Math.max(...values));
    const referenceValue = 220;
    const chartMax = Math.max(300, Math.ceil(Math.max(...values, referenceValue) * 1.12));

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

        const healthyMax = Math.min(160, x.max);
        const watchMax = Math.min(220, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 160) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(160),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(160),
            bottom - top
          );
        }

        if (x.max > 220) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(220),
            top,
            right - x.getPixelForValue(220),
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
        ctx.fillText("Install Watch Limit", rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(8), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(168), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(228), top + 14);

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
        ctx.fillText(displayNote[dominantIndex], Math.min(px + 8, chartArea.right - 80), py - 8);

        ctx.restore();
      }
    };

    chart = new Chart(els.chart, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Cable Planning Metrics",
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
                if (v > 220) return "rgba(255, 92, 92, 1)";
                if (v > 160) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 220) return "rgba(255, 77, 77, 0.30)";
              if (v > 160) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 220) return "rgba(255, 220, 220, 1)";
                if (v > 160) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 220) return "rgba(255, 105, 105, 1)";
              if (v > 160) return "rgba(255, 198, 95, 1)";
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
                return ` ${displayNote[i]}`;
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
              text: "Installation Magnitude",
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
    const distance = Math.max(0, n("distance"));
    const routing = parseFloat(els.routing.value);
    const slack = Math.max(0, n("slack"));
    const doors = Math.max(1, n("doors"));
    const runs = els.runs.value;
    const cables = Math.max(1, Math.floor(n("cables")));

    const routed = distance * (Number.isFinite(routing) ? routing : 1.3);
    const routingLossPct = (routing - 1) * 100;
    const perDoorSingle = routed + slack;
    const perDoorTotal = runs === "multi" ? perDoorSingle * cables : perDoorSingle;
    const totalAllDoors = perDoorTotal * doors;
    const cableDensity = perDoorTotal / Math.max(1, distance);

    const difficulty = getDifficulty(perDoorTotal, cableDensity, totalAllDoors);
    const recommendation = getRecommendation(difficulty, runs, distance);
    const insight = getInsight(difficulty);

    els.results.innerHTML = [
      row("Routed Distance (per door)", `${routed.toFixed(1)} ft`),
      row("Routing Loss", `${routingLossPct.toFixed(0)}%`),
      row("Estimated Run (single cable)", `${perDoorSingle.toFixed(1)} ft`),
      row("Estimated Total per Door", `${perDoorTotal.toFixed(1)} ft`),
      row("Estimated Total Cable", `${totalAllDoors.toFixed(1)} ft`),
      row("Cable Density", cableDensity.toFixed(2)),
      row("Install Difficulty", difficulty),
      row("Design Guidance", recommendation),
      row("Engineering Insight", insight)
    ].join("");

    renderChart({
      perDoorTotal,
      routingLossPct,
      cableDensity,
      totalAllDoors
    });
  }

  function reset() {
    els.distance.value = 120;
    els.routing.value = "1.30";
    els.slack.value = 15;
    els.doors.value = 8;
    els.runs.value = "single";
    els.cables.value = 4;
    setCableEnabledFromRuns();
    resetResults();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  els.runs.addEventListener("change", () => {
    setCableEnabledFromRuns();
    resetResults();
  });

  [els.distance, els.routing, els.slack, els.doors, els.cables].forEach((el) => {
    el.addEventListener("input", resetResults);
    el.addEventListener("change", resetResults);
  });

  reset();
})();
