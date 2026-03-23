(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chartRef = { current: null };
  let chartWrapRef = { current: null };
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
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

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

  function showContinue() {
    els.continueWrap.style.display = "block";
    els.continue.disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    els.continueWrap.style.display = "none";
    els.continue.disabled = true;
    hasResult = false;
  }

  function render(rows) {
    els.results.innerHTML = "";
    rows.forEach((r) => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      els.results.appendChild(div);
    });
  }

  function renderFlowNote() {
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

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>System Context</strong><br>
      ${parts.length ? parts.join("<br>") : "Prior compute pipeline context detected."}
      <br><br>
      This step establishes the baseline CPU envelope that later memory, storage, and throughput decisions must live inside.
    `;
  }

  function getStatus(score) {
    if (score > 85) {
      return {
        label: "RISK",
        insight: "CPU sizing is being pushed too close to the edge. The workload is likely to hit scheduling pressure, burst contention, or reduced responsiveness before downstream memory and storage layers can be evaluated cleanly."
      };
    }

    if (score > 65) {
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

  function invalidate() {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (chartWrapRef.current && chartWrapRef.current.parentNode) {
      chartWrapRef.current.parentNode.removeChild(chartWrapRef.current);
    }
    chartWrapRef.current = null;

    sessionStorage.removeItem(FLOW_KEY);
    els.analysisCopy.style.display = "none";
    els.analysisCopy.innerHTML = "";
    hideContinue();
  }

  function renderAnalyzerChart({
    mountEl,
    existingChartRef,
    existingWrapRef,
    labels,
    values,
    displayValues,
    referenceValue = 65,
    healthyMax = 65,
    watchMax = 85,
    axisTitle = "Analyzer Magnitude",
    referenceLabel = "Healthy Margin Floor",
    healthyLabel = "Healthy",
    watchLabel = "Watch",
    riskLabel = "Risk",
    chartMax = null
  }) {
    if (existingChartRef.current) {
      existingChartRef.current.destroy();
      existingChartRef.current = null;
    }

    if (existingWrapRef.current && existingWrapRef.current.parentNode) {
      existingWrapRef.current.parentNode.removeChild(existingWrapRef.current);
    }
    existingWrapRef.current = null;

    const wrap = document.createElement("div");
    wrap.style.marginTop = "16px";
    wrap.style.width = "100%";
    wrap.style.height = "340px";
    wrap.style.minHeight = "340px";
    wrap.style.position = "relative";

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    wrap.appendChild(canvas);
    mountEl.appendChild(wrap);

    existingWrapRef.current = wrap;

    const dominantIndex = values.indexOf(Math.max(...values));
    const resolvedChartMax = chartMax ?? Math.max(100, Math.ceil(Math.max(...values, watchMax) * 1.12));

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

        const resolvedHealthyMax = Math.min(healthyMax, x.max);
        const resolvedWatchMax = Math.min(watchMax, x.max);

        ctx.save();

        if (resolvedHealthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(resolvedHealthyMax) - left, bottom - top);
        }

        if (resolvedWatchMax > healthyMax) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(healthyMax),
            top,
            x.getPixelForValue(resolvedWatchMax) - x.getPixelForValue(healthyMax),
            bottom - top
          );
        }

        if (x.max > watchMax) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(watchMax),
            top,
            right - x.getPixelForValue(watchMax),
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
        ctx.fillText(referenceLabel, rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText(healthyLabel, x.getPixelForValue(Math.max(4, healthyMax * 0.08)), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText(watchLabel, x.getPixelForValue(healthyMax + Math.max(4, (watchMax - healthyMax) * 0.2)), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText(riskLabel, x.getPixelForValue(watchMax + 4), top + 14);

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
        ctx.fillText(
          displayValues[dominantIndex],
          Math.min(px + 8, chartArea.right - 110),
          py - 8
        );

        ctx.restore();
      }
    };

    existingChartRef.current = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Analyzer Metrics",
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
                if (v > watchMax) return "rgba(255, 92, 92, 1)";
                if (v > healthyMax) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > watchMax) return "rgba(255, 77, 77, 0.30)";
              if (v > healthyMax) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > watchMax) return "rgba(255, 220, 220, 1)";
                if (v > healthyMax) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > watchMax) return "rgba(255, 105, 105, 1)";
              if (v > healthyMax) return "rgba(255, 198, 95, 1)";
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
                return ` ${displayValues[context.dataIndex]}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: resolvedChartMax,
            ticks: {
              color: "rgba(220, 238, 230, 0.78)"
            },
            grid: {
              color: "rgba(110, 160, 140, 0.10)"
            },
            title: {
              display: true,
              text: axisTitle,
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
    const coreDemand = clamp((rec / 32) * 100, 0, 200);
    const utilPressure = clamp(target, 0, 100);

    const values = [loadPressure, coreDemand, utilPressure];
    const labels = ["Load Pressure", "Core Demand", "Utilization"];
    const dominantIndex = values.indexOf(Math.max(...values));
    const dominantLabel = labels[dominantIndex];

    const compositeScore = Math.round(
      (loadPressure * 0.35) +
      (Math.min(coreDemand, 100) * 0.30) +
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

    render([
      { label: "Effective Demand", value: `${eff.toFixed(2)} cores` },
      { label: "Required Cores", value: `${cores.toFixed(2)}` },
      { label: "Recommended Logical Cores", value: `${rec} cores` },
      { label: "Recommended Physical Cores", value: `${physicalRec} cores` },
      { label: "Primary Constraint", value: constraint },
      { label: "System Status", value: risk.label }
    ]);

    renderAnalysis(risk.label, risk.insight, guidance, dominantLabel);

    renderAnalyzerChart({
      mountEl: els.results,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      labels: ["Load Pressure", "Core Demand", "Utilization"],
      values: [loadPressure, coreDemand, utilPressure],
      displayValues: [
        `${Math.round(loadPressure)}%`,
        `${Math.round(coreDemand)}%`,
        `${Math.round(utilPressure)}%`
      ],
      referenceValue: 65,
      healthyMax: 65,
      watchMax: 85,
      axisTitle: "CPU Stress Magnitude",
      referenceLabel: "Healthy Margin Floor",
      healthyLabel: "Healthy",
      watchLabel: "Watch",
      riskLabel: "Risk",
      chartMax: Math.max(120, Math.ceil(Math.max(loadPressure, coreDemand, utilPressure, 85) * 1.08))
    });

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

    showContinue();
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
    renderFlowNote();
  });

  ["workload", "concurrency", "cpuPerWorker", "peak", "targetUtil", "smt"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    window.location.href = "/tools/compute/ram-sizing/";
  });

  renderFlowNote();
  hideContinue();
})();