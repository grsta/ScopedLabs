const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const STEP = "access-level-sizing";
const CATEGORY = "access-control";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart = null;
  let hasResult = false;

  const els = {
    roles: $("roles"),
    areas: $("areas"),
    schedules: $("schedules"),
    doorGroups: $("doorGroups"),
    complexity: $("complexity"),
    results: $("results"),
    flowNote: $("flow-note"),
    completeWrap: $("complete-wrap"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart")
  };

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${label}</span>
        <span class="result-value">${value}</span>
      </div>
    `;
  }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    els.completeWrap.style.display = "none";
    if (chart) {
      chart.destroy();
      chart = null;
    }
    hasResult = false;
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
    const panels = num(d.panels);
    const expansions = num(d.expansions);
    const readers = num(d.readers);
    const powerBudget = num(d.totalPowerW || d.powerW);
    const panelCapacity = num(d.panelCapacity);
    const utilization = num(d.utilizationPct);

    const lines = [];

    if (panels) lines.push(`Panels: <strong>${panels}</strong>`);
    if (expansions || expansions === 0) lines.push(`Expansions: <strong>${expansions}</strong>`);
    if (readers) lines.push(`Readers: <strong>${readers}</strong>`);
    if (panelCapacity) lines.push(`Panel Capacity: <strong>${panelCapacity}</strong> readers`);
    if (utilization) lines.push(`Utilization: <strong>${utilization.toFixed(1)}%</strong>`);
    if (powerBudget) lines.push(`Estimated Controller Load: <strong>${powerBudget.toFixed(1)} W</strong>`);

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>Carried over system design:</strong><br>
      ${lines.length ? lines.join("<br>") : "Prior access-control sizing data detected."}
      <br><br>
      This final step evaluates whether the access structure itself will stay manageable or turn into long-term administrative overhead.
    `;
  }

  function getComplexityFactor(value) {
    if (value === "simple") return 0.8;
    if (value === "complex") return 1.3;
    return 1;
  }

  function getRecommendedLimit(complexity) {
    if (complexity === "simple") return 80;
    if (complexity === "complex") return 120;
    return 100;
  }

  function getRisk(total) {
    if (total > 150) {
      return {
        label: "High Complexity",
        insight:
          "Access levels are likely to become difficult to manage and prone to assignment errors. Role abstraction, door grouping, and schedule consolidation should be considered before deployment grows further."
      };
    }

    if (total > 80) {
      return {
        label: "Moderate Complexity",
        insight:
          "The structure is still workable, but administration will become more fragile over time unless naming, grouping, and permission inheritance are handled consistently."
      };
    }

    return {
      label: "Healthy",
      insight:
        "The structure should scale cleanly with minimal administrative overhead. Current complexity remains within a range that is typically manageable for day-to-day operations."
    };
  }

  function renderChart(total, roles, areas, schedules, groups, recommendedLimit) {
    if (!els.chart) return;

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const labels = [
      "Access Levels",
      "Role-Area Combos",
      "Schedules",
      "Door Groups"
    ];

    const values = [
      total,
      roles * areas,
      schedules,
      groups
    ];

    const maxValue = Math.max(...values, recommendedLimit, 160);
    const dominantIndex = values.indexOf(Math.max(...values));

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
        const watchMax = Math.min(150, x.max);

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

        if (x.max > 150) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(150),
            top,
            right - x.getPixelForValue(150),
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

        const rx = x.getPixelForValue(recommendedLimit);
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
        ctx.fillText(`Recommended Limit (${recommendedLimit})`, rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(8), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(88), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(158), top + 14);

        // Marker dot on dominant bar endpoint
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
            label: "Access Design Metrics",
            barPercentage: 0.5,
            categoryPercentage: 0.58,
            data: values,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            backgroundColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 150) return "rgba(255, 92, 92, 1)";
                if (v > 80) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 150) return "rgba(255, 77, 77, 0.30)";
              if (v > 80) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 150) return "rgba(255, 220, 220, 1)";
                if (v > 80) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 150) return "rgba(255, 105, 105, 1)";
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
                return ` ${context.raw}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: Math.ceil(maxValue * 1.08),
            ticks: {
              color: "rgba(220, 238, 230, 0.78)"
            },
            grid: {
              color: "rgba(110, 160, 140, 0.10)"
            },
            title: {
              display: true,
              text: "Complexity Magnitude",
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
    const roles = num(els.roles.value);
    const areas = num(els.areas.value);
    const schedules = num(els.schedules.value);
    const groups = num(els.doorGroups.value);
    const complexity = els.complexity.value;

    if (
      roles <= 0 ||
      areas <= 0 ||
      schedules < 0 ||
      groups < 0
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and run analysis.</div>`;
      if (chart) {
        chart.destroy();
        chart = null;
      }
      els.completeWrap.style.display = "none";
      return;
    }

    const base = roles * areas;
    const complexityFactor = getComplexityFactor(complexity);
    const schedulePenalty = 1 + schedules * 0.1;
    const groupPenalty = 1 + groups * 0.05;

    const total = Math.round(base * schedulePenalty * groupPenalty * complexityFactor);
    const combinations = base;
    const scalingPressure = total / Math.max(1, roles + areas);
    const recommendedLimit = getRecommendedLimit(complexity);
    const overshoot = Math.max(0, total - recommendedLimit);
    const adminLoadIndex = ((schedules * 0.8) + (groups * 0.6) + (roles * 0.4)).toFixed(1);

    const risk = getRisk(total);

    let thresholdMessage = "Structure remains below the recommended complexity limit.";
    if (total > recommendedLimit) {
      thresholdMessage = `Design exceeds the recommended complexity limit by ${overshoot} levels.`;
    } else {
      thresholdMessage = `Design remains ${recommendedLimit - total} levels under the recommended limit.`;
    }

    els.results.innerHTML = [
      row("Access Levels", total),
      row("Role-Area Combinations", combinations),
      row("Scaling Pressure", scalingPressure.toFixed(1)),
      row("Admin Load Index", adminLoadIndex),
      row("Recommended Limit", recommendedLimit),
      row("Complexity", risk.label),
      row("Threshold Check", thresholdMessage),
      row("Engineering Insight", risk.insight)
    ].join("");

    renderChart(total, roles, areas, schedules, groups, recommendedLimit);

    els.completeWrap.style.display = "block";

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "access-level-sizing",
      data: {
        total,
        risk: risk.label,
        combinations,
        scalingPressure,
        adminLoadIndex: Number(adminLoadIndex),
        recommendedLimit,
        overshoot
      }
    }));

    hasResult = true;
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.results.innerHTML = `<div class="muted">Run analysis.</div>`;
    if (chart) {
      chart.destroy();
      chart = null;
    }
    invalidate();
  });

  Object.values(els).forEach((el) => {
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT")) {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  if (els.chart) {
    els.chart.style.width = "100%";
    els.chart.style.height = "340px";
    els.chart.parentElement.style.minHeight = "340px";
  }

  loadFlow();
})();

function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});


function hasStoredAuth() {
  try {
    const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
    if (!k) return false;
    const raw = JSON.parse(localStorage.getItem(k));
    return !!(
      raw?.access_token ||
      raw?.currentSession?.access_token ||
      (Array.isArray(raw) ? raw[0]?.access_token : null)
    );
  } catch {
    return false;
  }
}


function getUnlockedCategories() {
  try {
    const raw = localStorage.getItem("sl_unlocked_categories");
    if (!raw) return [];
    return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}


function unlockCategoryPage() {
  const body = document.body;
  const category = String(body?.dataset?.category || "").trim().toLowerCase();
  const signedIn = hasStoredAuth();
  const unlocked = getUnlockedCategories().includes(category);

  const lockedCard = document.getElementById("lockedCard");
  const toolCard = document.getElementById("toolCard");

  if (signedIn && unlocked) {
    if (lockedCard) lockedCard.style.display = "none";
    if (toolCard) toolCard.style.display = "";
    return true;
  }

  if (lockedCard) lockedCard.style.display = "";
  if (toolCard) toolCard.style.display = "none";
  return false;
}


function invalidate() {
  ScopedLabsAnalyzer.invalidate({
    resultsEl: els.results,
    analysisEl: els.analysis,
    continueWrapEl: els.continueWrap,
    continueBtnEl: els.continueBtn,
    flowKey: FLOW_KEYS[STEP] || "",
    category: CATEGORY,
    step: STEP,
    lane: LANE,
    emptyMessage: "Enter values and press Calculate."
  });
}


function renderSuccess(data) {
  ScopedLabsAnalyzer.renderOutput({
    resultsEl: els.results,
    analysisEl: els.analysis,
    summaryRows: [],
    derivedRows: [],
    status: data.status || "Healthy",
    interpretation: data.interpretation || "",
    dominantConstraint: data.dominantConstraint || "",
    guidance: data.guidance || ""
  });
}


function writeFlow(data) {
  ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP] || STEP, {
    category: CATEGORY,
    step: STEP,
    data
  });
}
