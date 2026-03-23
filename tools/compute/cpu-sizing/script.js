(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart = null;
  let hasResult = false;

  const els = {
    workload: $("workload"),
    concurrency: $("concurrency"),
    cpuPerWorker: $("cpuPerWorker"),
    peak: $("peak"),
    targetUtil: $("targetUtil"),
    smt: $("smt"),
    results: $("results"),
    flowNote: $("flow-note"),
    calc: $("calc"),
    reset: $("reset"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    analysisCopy: $("analysis-copy"),
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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    els.continueWrap.style.display = "none";
    els.continue.disabled = true;
    els.analysisCopy.style.display = "none";
    els.analysisCopy.innerHTML = "";
    $("chart-wrap").style.display = "none";
    if (chart) {
      chart.destroy();
      chart = null;
    }
    hasResult = false;
  }

  function workloadFactor(w) {
    if (w === "web") return 0.9;
    if (w === "db") return 1.1;
    if (w === "video") return 1.35;
    if (w === "compute") return 1.5;
    return 1.0;
  }

  function loadFlow() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";

    if (!raw) return;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed || parsed.category !== "compute" || parsed.step === "cpu-sizing") return;

    const d = parsed.data || {};
    const lines = [];

    if (typeof d.throughputMbps === "number") {
      lines.push(`Upstream throughput profile: <strong>${d.throughputMbps.toFixed(0)} MB/s</strong>`);
    }
    if (typeof d.backupHours === "number") {
      lines.push(`Observed backup window: <strong>${d.backupHours.toFixed(2)} hrs</strong>`);
    }
    if (typeof d.cores === "number") {
      lines.push(`Previous CPU recommendation: <strong>${d.cores} cores</strong>`);
    }

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>System Context</strong><br>
      ${lines.length ? lines.join("<br>") : "Prior compute pipeline context detected."}
      <br><br>
      This step establishes the baseline CPU envelope that later memory, storage, and throughput decisions must live inside.
    `;
  }

  function getStatus(score) {
    if (score > 65) {
      return {
        label: "RISK",
        insight: "CPU sizing is being pushed too close to the edge. The workload is likely to hit scheduling pressure, burst contention, or reduced responsiveness before downstream memory and storage layers can be evaluated cleanly."
      };
    }

    if (score > 35) {
      return {
        label: "WATCH",
        insight: "CPU sizing is serviceable but tightening. As concurrency rises or burst conditions widen, scheduler pressure and per-core contention will begin reducing the safety margin for later expansion."
      };
    }

    return {
      label: "HEALTHY",
      insight: "CPU sizing is inside a workable operating envelope. Thread demand, burst factor, and utilization target leave room for normal scheduling overhead without making the processor complex the first scaling limit."
    };
  }

  function renderAnalysis(status, interpretation, guidance, dominantLabel) {
    els.analysisCopy.style.display = "grid";
    els.analysisCopy.innerHTML = `
      <div class="status-pill ${status === "HEALTHY" ? "healthy" : status === "WATCH" ? "watch" : "risk"}">Status: ${status}</div>

      <div class="analysis-note">
        <strong>Engineering Interpretation</strong>
        <div>${interpretation}</div>
      </div>

      <div class="analysis-note">
        <strong>Dominant Constraint</strong>
        <div>${dominantLabel}</div>
      </div>

      <div class="analysis-note">
        <strong>Actionable Guidance</strong>
        <div>${guidance}</div>
      </div>
    `;
  }

  function renderChart(loadPressure, coreDemand, utilPressure, referenceWindow) {
    if (!els.chart) return;

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const labels = [
      "Load Pressure",
      "Core Demand",
      "Utilization"
    ];

    const values = [
      loadPressure,
      coreDemand,
      utilPressure
    ];

    const maxValue = Math.max(...values, referenceWindow, 100);
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

        const healthyMax = Math.min(35, x.max);
        const watchMax = Math.min(65, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 35) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(35),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(35),
            bottom - top
          );
        }

        if (x.max > 65) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(65),
            top,
            right - x.getPixelForValue(65),
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

        const rx = x.getPixelForValue(referenceWindow);
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
        ctx.fillText(`Healthy Margin Floor (${referenceWindow})`, rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(6), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(39), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(69), top + 14);

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
            label: "CPU Stress Metrics",
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
                if (v > 65) return "rgba(255, 92, 92, 1)";
                if (v > 35) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 65) return "rgba(255, 77, 77, 0.30)";
              if (v > 35) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 65) return "rgba(255, 220, 220, 1)";
                if (v > 35) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 65) return "rgba(255, 105, 105, 1)";
              if (v > 35) return "rgba(255, 198, 95, 1)";
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
                return ` ${context.raw.toFixed(0)}%`;
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
              text: "CPU Stress Magnitude",
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

    $("chart-wrap").style.display = "block";
  }

  function calc() {
    const workload = els.workload.value;
    const concurrency = +els.concurrency.value;
    const cpuPct = +els.cpuPerWorker.value;
    const peak = +els.peak.value;
    const target = +els.targetUtil.value;
    const smt = els.smt.value;

    if (
      !Number.isFinite(concurrency) || concurrency <= 0 ||
      !Number.isFinite(cpuPct) || cpuPct < 0 ||
      !Number.isFinite(peak) || peak <= 0 ||
      !Number.isFinite(target) || target <= 0
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      invalidate();
      return;
    }

    const avg = concurrency * (cpuPct / 100);
    const eff = avg * peak * workloadFactor(workload);
    const cores = eff / (target / 100);
    const rec = Math.ceil(cores);
    const physicalRec = smt === "on" ? Math.ceil(rec / 2) : rec;

    const loadPressure = clamp((eff / Math.max(rec, 1)) * 100, 0, 100);
    const coreDemand = clamp((rec / 32) * 100, 0, 100);
    const utilPressure = clamp(target, 0, 100);

    const values = [loadPressure, coreDemand, utilPressure];
    const labels = ["Load Pressure", "Core Demand", "Utilization"];
    const dominantIndex = values.indexOf(Math.max(...values));
    const dominantLabel = labels[dominantIndex];
    const compositeScore = Math.round(
      (loadPressure * 0.35) +
      (coreDemand * 0.30) +
      (utilPressure * 0.35)
    );

    const risk = getStatus(compositeScore);

    let guidance = "";
    if (risk.label === "HEALTHY") {
      guidance = "You have usable headroom. The next failure point is more likely to appear in memory density, storage latency, or workload imbalance before raw CPU exhaustion becomes the dominant issue.";
    } else if (risk.label === "WATCH") {
      guidance = "Watch what fails first: burst handling, sustained queue depth, or poor thread placement across logical cores. This is the point where future growth can force a jump to the next CPU class sooner than expected.";
    } else {
      guidance = `Rework the compute baseline before continuing. The primary limiter is ${dominantLabel.toLowerCase()}, so expansion will become difficult here first. Reduce concurrency, lower per-worker CPU demand, or step up core count and processor tier.`;
    }

    let constraint = "Balanced";
    if (dominantLabel === "Utilization") constraint = "Utilization ceiling";
    if (dominantLabel === "Core Demand") constraint = "Core count density";
    if (dominantLabel === "Load Pressure") constraint = "Burst / scheduling pressure";

    els.results.innerHTML = [
      row("Effective Demand", `${eff.toFixed(2)} cores`),
      row("Required Cores", `${cores.toFixed(2)}`),
      row("Recommended Logical Cores", `${rec} cores`),
      row("Recommended Physical Cores", `${physicalRec} cores`),
      row("Primary Constraint", constraint),
      row("System Status", risk.label)
    ].join("");

    renderAnalysis(risk.label, risk.insight, guidance, dominantLabel);
    renderChart(loadPressure, coreDemand, utilPressure, 65);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "cpu-sizing",
      data: {
        cores: rec,
        physicalCores: physicalRec,
        eff,
        workload,
        status: risk.label
      }
    }));

    els.continueWrap.style.display = "block";
    els.continue.disabled = false;
    hasResult = true;
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.workload.value = "general";
    els.concurrency.value = 16;
    els.cpuPerWorker.value = 30;
    els.peak.value = "1.25";
    els.targetUtil.value = 70;
    els.smt.value = "on";
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    invalidate();
    loadFlow();
  });

  ["workload", "concurrency", "cpuPerWorker", "peak", "targetUtil", "smt"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    window.location.href = "/tools/compute/ram-sizing/";
  });

  if (els.chart) {
    els.chart.style.width = "100%";
    els.chart.style.height = "340px";
    if (els.chart.parentElement) {
      els.chart.parentElement.style.minHeight = "340px";
    }
  }

  loadFlow();
})();