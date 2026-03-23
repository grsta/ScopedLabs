(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "ram-sizing";

  let hasResult = false;
  let cpuContext = null;
  let upstreamFlowContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    workload: $("workload"),
    concurrency: $("concurrency"),
    perProc: $("perProc"),
    osGb: $("osGb"),
    headroom: $("headroom"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function workloadFactor(w) {
    if (w === "db") return 1.3;
    if (w === "virtualization") return 1.25;
    if (w === "analytics") return 1.4;
    if (w === "web") return 1.1;
    return 1.0;
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

  function getStoredFlow() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function cacheUpstreamFlowContext() {
    const parsed = getStoredFlow();
    if (!parsed) return;
    if (parsed.category === CURRENT_CATEGORY && parsed.step !== CURRENT_STEP) {
      upstreamFlowContext = parsed;
    }
  }

  function loadCPUContext() {
    const parsed = getStoredFlow();
    if (!parsed || parsed.category !== "compute" || parsed.step !== "cpu-sizing" || !parsed.data) {
      return null;
    }
    return parsed.data;
  }

  function renderFlowNote() {
    const parsed = getStoredFlow();
    let source = null;

    if (parsed && parsed.category === CURRENT_CATEGORY && parsed.step !== CURRENT_STEP) {
      source = parsed;
      upstreamFlowContext = parsed;
    } else if (upstreamFlowContext && upstreamFlowContext.category === CURRENT_CATEGORY && upstreamFlowContext.step !== CURRENT_STEP) {
      source = upstreamFlowContext;
    }

    cpuContext = source && source.step === "cpu-sizing" ? source.data : loadCPUContext();

    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
    if (!source) return;

    const data = source.data || {};
    const parts = [];

    if (typeof data.cores === "number") {
      parts.push(`
        <div class="result-row">
          <span class="result-label">Recommended Cores</span>
          <span class="result-value">${data.cores}</span>
        </div>
      `);
    }

    if (typeof data.eff === "number") {
      parts.push(`
        <div class="result-row">
          <span class="result-label">Effective Load</span>
          <span class="result-value">${Number(data.eff).toFixed(2)} core-eq</span>
        </div>
      `);
    }

    if (typeof data.workload === "string") {
      parts.push(`
        <div class="result-row">
          <span class="result-label">Workload</span>
          <span class="result-value">${data.workload}</span>
        </div>
      `);
    }

    if (typeof data.status === "string" && source.step === "cpu-sizing") {
      parts.push(`
        <div class="result-row">
          <span class="result-label">CPU Status</span>
          <span class="result-value">${data.status}</span>
        </div>
      `);
    }

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">System Context</div>
        ${parts.join("") || `<div class="muted">Prior compute pipeline context detected.</div>`}
        <div class="muted">
          This step validates whether memory becomes the first scaling limiter after CPU sizing, or whether the design still has usable reserve for caching, virtualization density, and workload growth.
        </div>
      </div>
    `;
  }

  function getStatus(score) {
    if (score > 85) {
      return {
        label: "RISK",
        insight: "The design is crowding usable memory too tightly. Cache reserve, growth allowance, or virtualization flexibility will shrink first, which increases the chance of swap behavior, instability during burst activity, or forced early platform expansion."
      };
    }
    if (score > 65) {
      return {
        label: "WATCH",
        insight: "The design is workable, but memory margin is tightening. The system should run, although future growth, transient spikes, or denser workloads will erode available reserve more quickly than the raw capacity number suggests."
      };
    }
    return {
      label: "HEALTHY",
      insight: "The memory plan stays inside a sound operating envelope. Base overhead, workload demand, and reserve headroom remain balanced enough that RAM is unlikely to become the first design limiter under normal expansion."
    };
  }

  function renderAnalysis(status, interpretation, dominantConstraint, guidance) {
    const statusClass = status === "RISK" ? "risk" : status === "WATCH" ? "watch" : "healthy";
    els.analysisCopy.style.display = "grid";
    els.analysisCopy.innerHTML = `
      <div class="status-pill ${statusClass}">Status: ${status}</div>

      <div class="analysis-note">
        <strong>Engineering Interpretation</strong>
        <div>${interpretation}</div>
      </div>

      <div class="analysis-note">
        <strong>Dominant Constraint</strong>
        <div>${dominantConstraint}</div>
      </div>

      <div class="analysis-note">
        <strong>Actionable Guidance</strong>
        <div>${guidance}</div>
      </div>
    `;
  }

  function clearAnalyzerVisuals() {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (chartWrapRef.current && chartWrapRef.current.parentNode) {
      chartWrapRef.current.parentNode.removeChild(chartWrapRef.current);
    }
    chartWrapRef.current = null;
    els.analysisCopy.style.display = "none";
    els.analysisCopy.innerHTML = "";
  }

  function invalidate() {
    clearAnalyzerVisuals();

    const parsed = getStoredFlow();
    if (parsed && parsed.category === CURRENT_CATEGORY && parsed.step === CURRENT_STEP) {
      sessionStorage.removeItem(FLOW_KEY);
    }

    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    hideContinue();
    renderFlowNote();
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
    const concurrency = Math.max(1, Number(els.concurrency.value) || 0);
    const perProc = Math.max(0, Number(els.perProc.value) || 0);
    const osGb = Math.max(0, Number(els.osGb.value) || 0);
    const headroomPct = Math.max(0, Number(els.headroom.value) || 0);

    const processMemory = concurrency * perProc;
    const adjustedWorkloadMemory = processMemory * workloadFactor(workload);
    const subtotalMemory = adjustedWorkloadMemory + osGb;
    const reservedMemory = subtotalMemory * (headroomPct / 100);
    const totalRequired = subtotalMemory + reservedMemory;
    const recommended = Math.ceil(totalRequired / 8) * 8;
    const memoryHeadroom = Math.max(0, recommended - totalRequired);
    const reserveRatio = recommended > 0 ? (memoryHeadroom / recommended) * 100 : 0;

    const cachePressure = Math.min(160, (reservedMemory / Math.max(totalRequired, 1)) * 100 * 2.2);
    const densityPressure = Math.min(160, (concurrency * perProc / Math.max(recommended, 1)) * 100 * workloadFactor(workload));
    const capacityPressure = Math.min(160, (totalRequired / Math.max(recommended, 1)) * 100);

    const values = [capacityPressure, densityPressure, cachePressure];
    const labels = ["Capacity Pressure", "Density Pressure", "Reserve Stress"];
    const displayValues = [
      `${Math.round(capacityPressure)}%`,
      `${Math.round(densityPressure)}%`,
      `${Math.round(cachePressure)}%`
    ];

    const dominantIndex = values.indexOf(Math.max(...values));
    const dominantLabel = labels[dominantIndex];

    const compositeScore = Math.round(
      (capacityPressure * 0.45) +
      (densityPressure * 0.35) +
      (cachePressure * 0.20)
    );

    const status = getStatus(compositeScore);

    let dominantConstraint = "Balanced memory plan";
    if (dominantLabel === "Capacity Pressure") dominantConstraint = "Installed memory ceiling";
    if (dominantLabel === "Density Pressure") dominantConstraint = "Per-process / VM density";
    if (dominantLabel === "Reserve Stress") dominantConstraint = "Cache and operating reserve";

    let guidance = "";
    if (status.label === "HEALTHY") {
      guidance = "The design still has usable operating room. The next limitation is more likely to show up in storage latency, IOPS behavior, or workload imbalance before RAM becomes the first hard scaling wall.";
    } else if (status.label === "WATCH") {
      guidance = "Validate workload spikes and future density before locking hardware. This is where cache erosion, virtualization growth, or memory-heavy bursts can force an early jump to the next DIMM or platform tier.";
    } else {
      guidance = `Rework the memory plan before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so the design will lose flexibility there first. Reduce workload density, lower per-process footprint, or step up installed RAM and reserve margin.`;
    }

    let cpuCoupling = "CPU and RAM appear reasonably aligned";
    if (cpuContext && Number(cpuContext.cores) < 8 && totalRequired > 64) {
      cpuCoupling = "CPU tier may constrain scaling before the memory plan is fully utilized";
    } else if (cpuContext && Number(cpuContext.cores) >= 16 && totalRequired < 48) {
      cpuCoupling = "Memory footprint is comparatively light against the current CPU recommendation";
    }

    render([
      { label: "Process Memory", value: `${processMemory.toFixed(1)} GB` },
      { label: "Adjusted Workload Memory", value: `${adjustedWorkloadMemory.toFixed(1)} GB` },
      { label: "OS / Base Overhead", value: `${osGb.toFixed(1)} GB` },
      { label: "Reserve / Cache Allocation", value: `${reservedMemory.toFixed(1)} GB` },
      { label: "Total Required", value: `${totalRequired.toFixed(1)} GB` },
      { label: "Recommended Installed RAM", value: `${recommended} GB` },
      { label: "Usable Installed Headroom", value: `${memoryHeadroom.toFixed(1)} GB` },
      { label: "Reserve Ratio", value: `${reserveRatio.toFixed(1)}%` },
      { label: "CPU Coupling", value: cpuCoupling }
    ]);

    renderAnalyzerChart({
      mountEl: els.results,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      labels,
      values,
      displayValues,
      referenceValue: 65,
      healthyMax: 65,
      watchMax: 85,
      axisTitle: "Memory Stress Magnitude",
      referenceLabel: "Healthy Margin Floor",
      healthyLabel: "Healthy",
      watchLabel: "Watch",
      riskLabel: "Risk",
      chartMax: Math.max(120, Math.ceil(Math.max(...values, 85) * 1.08))
    });

    renderAnalysis(
      status.label,
      status.insight,
      dominantConstraint,
      guidance
    );

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      data: {
        ram: recommended,
        totalRequired,
        reserveRatio,
        dominantConstraint,
        workload,
        status: status.label
      }
    }));

    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.workload.value = "general";
    els.concurrency.value = 10;
    els.perProc.value = 2;
    els.osGb.value = 8;
    els.headroom.value = 25;
    invalidate();
  });

  ["workload", "concurrency", "perProc", "osGb", "headroom"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/storage-iops/";
  });

  cacheUpstreamFlowContext();
  renderFlowNote();
  hideContinue();
})();