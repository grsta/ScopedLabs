(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let chart = null;

  function showContinue() {
    $("continue-wrap").style.display = "block";
    $("continue").disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    $("continue-wrap").style.display = "none";
    $("continue").disabled = true;
    hasResult = false;
  }

  function workloadFactor(w) {
    if (w === "web") return 0.9;
    if (w === "db") return 1.1;
    if (w === "video") return 1.35;
    if (w === "compute") return 1.5;
    return 1.0;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${label}</span>
        <span class="result-value">${value}</span>
      </div>
    `;
  }

  function invalidate() {
    if (chart) {
      chart.destroy();
      chart = null;
    }

    sessionStorage.removeItem(FLOW_KEY);
    $("chart-wrap").style.display = "none";
    $("analysis-copy").style.display = "none";
    $("analysis-copy").innerHTML = "";
    hideContinue();
  }

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";
    rows.forEach((r) => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(div);
    });
  }

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    const flow = $("flow-note");

    flow.style.display = "none";
    flow.innerHTML = "";

    if (!raw) return;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed || parsed.category !== "compute" || parsed.step === "cpu-sizing") return;

    const data = parsed.data || {};
    const parts = [];

    if (typeof data.throughputMbps === "number") {
      parts.push(`Upstream throughput profile: <strong>${data.throughputMbps.toFixed(0)} MB/s</strong>`);
    }

    if (typeof data.backupHours === "number") {
      parts.push(`Observed backup window: <strong>${data.backupHours.toFixed(2)} hrs</strong>`);
    }

    if (typeof data.cores === "number") {
      parts.push(`Previous CPU recommendation: <strong>${data.cores} cores</strong>`);
    }

    flow.style.display = "block";
    flow.innerHTML = `
      <strong>System Context</strong><br>
      ${parts.length ? parts.join("<br>") : "Prior compute pipeline context detected."}
      <br><br>
      This step establishes the baseline CPU envelope that later memory, storage, and throughput decisions must live inside.
    `;
  }

  function getStatus(score) {
    if (score > 65) return "RISK";
    if (score > 35) return "WATCH";
    return "HEALTHY";
  }

  function renderAnalysis(status, interpretation, guidance, dominantLabel) {
    const el = $("analysis-copy");
    el.style.display = "grid";
    el.innerHTML = `
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

  function createAnalyzerChart(canvas, config) {
    if (!canvas) return null;

    const {
      labels,
      values,
      dominantIndex,
      chartTitle,
      referenceValue,
      referenceLabel,
      dominantSuffix = ""
    } = config;

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

        ctx.save();

        ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
        ctx.fillRect(left, top, x.getPixelForValue(35) - left, bottom - top);

        ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
        ctx.fillRect(
          x.getPixelForValue(35),
          top,
          x.getPixelForValue(65) - x.getPixelForValue(35),
          bottom - top
        );

        ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
        ctx.fillRect(
          x.getPixelForValue(65),
          top,
          right - x.getPixelForValue(65),
          bottom - top
        );

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
        ctx.fillText(referenceLabel, rx + 8, bottom - 10);

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

        ctx.fillStyle = "rgba(245,255,248,0.98)";
        ctx.font = "600 12px sans-serif";
        ctx.fillText(`${Math.round(dominantValue)}${dominantSuffix}`, px + 10, py + 4);

        ctx.restore();
      }
    };

    return new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: chartTitle,
            barPercentage: 0.5,
            categoryPercentage: 0.58,
            data: values,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            backgroundColor: (context) => {
              const i = context.dataIndex;
              if (i === dominantIndex) return "rgba(255, 188, 82, 1)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              if (i === dominantIndex) return "rgba(255, 240, 210, 1)";
              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const i = context.dataIndex;
              return i === dominantIndex ? "rgba(255, 198, 95, 1)" : "rgba(90, 170, 255, 0.20)";
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
            displayColors: false,
            callbacks: {
              label(context) {
                return ` ${Math.round(context.raw)}${dominantSuffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            min: 0,
            max: 100,
            ticks: {
              color: "rgba(220, 238, 230, 0.78)"
            },
            grid: {
              color: "rgba(110, 160, 140, 0.10)"
            },
            title: {
              display: true,
              text: chartTitle,
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

  function renderChart(loadPressure, coreDemand, utilPressure) {
    const canvas = $("analyzerChart");
    if (!canvas) return;

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const labels = ["Load Pressure", "Core Demand", "Utilization"];
    const values = [loadPressure, coreDemand, utilPressure];
    const dominantIndex = values.indexOf(Math.max(...values));

    chart = createAnalyzerChart(canvas, {
      labels,
      values,
      dominantIndex,
      chartTitle: "CPU Stress Magnitude",
      referenceValue: 65,
      referenceLabel: "Healthy Margin Floor (65)",
      dominantSuffix: "%"
    });

    $("chart-wrap").style.display = "block";
  }

  function calc() {
    const workload = $("workload").value;
    const concurrency = +$("concurrency").value;
    const cpuPct = +$("cpuPerWorker").value;
    const peak = +$("peak").value;
    const target = +$("targetUtil").value;
    const smt = $("smt").value;

    if (
      !Number.isFinite(concurrency) || concurrency <= 0 ||
      !Number.isFinite(cpuPct) || cpuPct < 0 ||
      !Number.isFinite(peak) || peak <= 0 ||
      !Number.isFinite(target) || target <= 0
    ) {
      $("results").innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
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

    const status = getStatus(compositeScore);

    let interpretation = "";
    let guidance = "";

    if (status === "HEALTHY") {
      interpretation = "CPU sizing is inside a workable operating envelope. Thread demand, burst factor, and utilization target leave room for normal scheduling overhead without making the processor complex the first scaling limit.";
      guidance = "You have usable headroom. The next failure point is more likely to appear in memory density, storage latency, or workload imbalance before raw CPU exhaustion becomes the dominant issue.";
    } else if (status === "WATCH") {
      interpretation = "CPU sizing is serviceable but tightening. As concurrency rises or burst conditions widen, scheduler pressure and per-core contention will begin reducing the safety margin for later expansion.";
      guidance = "Watch what fails first: burst handling, sustained queue depth, or poor thread placement across logical cores. This is the point where future growth can force a jump to the next CPU class sooner than expected.";
    } else {
      interpretation = "CPU sizing is being pushed too close to the edge. The workload is likely to hit scheduling pressure, burst contention, or reduced responsiveness before downstream memory and storage layers can be evaluated cleanly.";
      guidance = `Rework the compute baseline before continuing. The primary limiter is ${dominantLabel.toLowerCase()}, so expansion will become difficult here first. Reduce concurrency, lower per-worker CPU demand, or step up core count and processor tier.`;
    }

    let constraint = "Balanced";
    if (dominantLabel === "Utilization") constraint = "Utilization ceiling";
    if (dominantLabel === "Core Demand") constraint = "Core count density";
    if (dominantLabel === "Load Pressure") constraint = "Burst / scheduling pressure";

    render([
      { label: "Effective Demand", value: `${eff.toFixed(2)} cores` },
      { label: "Required Cores", value: `${cores.toFixed(2)}` },
      { label: "Recommended Logical Cores", value: `${rec} cores` },
      { label: "Recommended Physical Cores", value: `${physicalRec} cores` },
      { label: "Primary Constraint", value: constraint },
      { label: "System Status", value: status }
    ]);

    renderAnalysis(status, interpretation, guidance, dominantLabel);
    renderChart(loadPressure, coreDemand, utilPressure);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "cpu-sizing",
      data: {
        cores: rec,
        physicalCores: physicalRec,
        eff,
        workload,
        status
      }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("workload").value = "general";
    $("concurrency").value = 16;
    $("cpuPerWorker").value = 30;
    $("peak").value = "1.25";
    $("targetUtil").value = 70;
    $("smt").value = "on";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    invalidate();
    renderFlowNote();
  });

  ["workload", "concurrency", "cpuPerWorker", "peak", "targetUtil", "smt"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/ram-sizing/";
  });

  renderFlowNote();
  hideContinue();
})();