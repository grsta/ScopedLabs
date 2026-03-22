(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart = null;
  let chartWrap = null;
  let hasResult = false;

  const els = {
    doors: $("doors"),
    readersPerDoor: $("readersPerDoor"),
    inputsPerDoor: $("inputsPerDoor"),
    outputsPerDoor: $("outputsPerDoor"),
    baseDoors: $("baseDoors"),
    expDoors: $("expDoors"),
    maxExp: $("maxExp"),
    spare: $("spare"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    nextWrap: $("continue-wrap"),
    nextBtn: $("continue"),
    flowNote: $("flow-note")
  };

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    if (chartWrap && chartWrap.parentNode) {
      chartWrap.parentNode.removeChild(chartWrap);
    }
    chartWrap = null;
  }

  function showContinue() {
    els.nextWrap.style.display = "block";
    els.nextBtn.disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    els.nextWrap.style.display = "none";
    els.nextBtn.disabled = true;
    hasResult = false;
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    destroyChart();
    hideContinue();
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

  function loadFlowContext() {
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

    const lines = [];
    if (d.recommendation) lines.push(String(d.recommendation));
    if (d.reader) lines.push(String(d.reader));
    if (d.req) lines.push(`Power Load: ${Number(d.req).toFixed(2)} A`);

    if (!lines.length) return;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>System context:</strong><br>
      ${lines.join("<br>")}
    `;
  }

  function getStatus(loadPct) {
    if (loadPct > 85) return "RISK";
    if (loadPct > 65) return "WATCH";
    return "HEALTHY";
  }

  function getInsight(status) {
    if (status === "RISK") {
      return "Panel architecture is too dense. Expansion paths are near exhaustion, which increases upgrade cost and reduces flexibility for growth.";
    }
    if (status === "WATCH") {
      return "System is serviceable but nearing expansion limits. Plan for additional panels or segmentation before future adds consume remaining capacity.";
    }
    return "Panel architecture is balanced with solid remaining growth margin and manageable expansion pressure.";
  }

  function renderChart(metrics) {
    destroyChart();

    chartWrap = document.createElement("div");
    chartWrap.style.marginTop = "16px";
    chartWrap.style.width = "100%";
    chartWrap.style.height = "340px";
    chartWrap.style.minHeight = "340px";
    chartWrap.style.position = "relative";

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    chartWrap.appendChild(canvas);
    els.results.appendChild(chartWrap);

    const labels = [
      "System Load",
      "Expansion Pressure",
      "Panels x10",
      "Readers"
    ];

    const values = [
      metrics.loadPct,
      metrics.expansionPct,
      metrics.panels * 10,
      metrics.readers
    ];

    const displayValues = {
      0: `${metrics.loadPct.toFixed(0)}%`,
      1: `${metrics.expansionPct.toFixed(0)}%`,
      2: `${metrics.panels} panels`,
      3: `${metrics.readers} readers`
    };

    const dominantIndex = values.indexOf(Math.max(...values));
    const referenceValue = 65;
    const chartMax = Math.max(100, Math.ceil(Math.max(...values, 85) * 1.12));

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

        const healthyMax = Math.min(65, x.max);
        const watchMax = Math.min(85, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 65) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(65),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(65),
            bottom - top
          );
        }

        if (x.max > 85) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(85),
            top,
            right - x.getPixelForValue(85),
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
        ctx.fillText("Healthy Capacity Floor", rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(6), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(69), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(89), top + 14);

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

    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Panel Capacity Metrics",
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
                if (v > 85) return "rgba(255, 92, 92, 1)";
                if (v > 65) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 85) return "rgba(255, 77, 77, 0.30)";
              if (v > 65) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 85) return "rgba(255, 220, 220, 1)";
                if (v > 65) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 85) return "rgba(255, 105, 105, 1)";
              if (v > 65) return "rgba(255, 198, 95, 1)";
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
              text: "Capacity Stress Magnitude",
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
  }

  function calc() {
    const doors = +els.doors.value;
    const spare = +els.spare.value;
    const base = +els.baseDoors.value;
    const exp = +els.expDoors.value;
    const maxExp = +els.maxExp.value;

    if (
      !Number.isFinite(doors) || doors <= 0 ||
      !Number.isFinite(spare) || spare < 0 ||
      !Number.isFinite(base) || base <= 0 ||
      !Number.isFinite(exp) || exp <= 0 ||
      !Number.isFinite(maxExp) || maxExp <= 0
    ) {
      render([row("Error", "Enter valid values for all inputs.")]);
      destroyChart();
      hideContinue();
      return;
    }

    const target = Math.ceil(doors * (1 + spare / 100));
    const perPanel = base + (maxExp * exp);
    const panels = Math.ceil(target / perPanel);

    const remaining = target - (panels * base);
    const expansions = Math.ceil(Math.max(0, remaining) / exp);

    const readers = doors * +els.readersPerDoor.value;

    const loadPct = (target / (panels * perPanel)) * 100;
    const expansionPct = (expansions / (panels * maxExp)) * 100;

    const status = getStatus(loadPct);
    const insight = getInsight(status);

    render([
      row("Panels Required", panels),
      row("Expansion Modules", expansions),
      row("Total Readers", readers),
      row("System Load", `${loadPct.toFixed(0)}%`),
      row("Expansion Pressure", `${expansionPct.toFixed(0)}%`),
      row("Status", status),
      row("Engineering Insight", insight)
    ]);

    renderChart({
      loadPct,
      expansionPct,
      panels,
      readers
    });

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "panel-capacity",
      data: { panels, expansions, readers }
    }));

    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.results.innerHTML = `<div class="muted">Run calculation.</div>`;
    destroyChart();
    invalidate();
  });

  Object.values(els).forEach((el) => {
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT")) {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/access-level-sizing/";
  });

  loadFlowContext();
})();