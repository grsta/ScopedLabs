(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let context = null;
  let chart = null;

  function safeParse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function loadContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;

    const parsed = safeParse(raw);
    if (!parsed || parsed.category !== "compute") return null;
    return parsed;
  }

  function formatHours(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "0m";
    if (hours >= 1) {
      const whole = Math.floor(hours);
      const mins = Math.round((hours % 1) * 60);
      return `${whole}h ${mins}m`;
    }
    return `${Math.round(hours * 60)}m`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function saveResult(payload) {
    sessionStorage.setItem(
      FLOW_KEY,
      JSON.stringify({
        category: "compute",
        step: "backup-window",
        data: payload
      })
    );
  }

  function clearState() {
    hasResult = false;
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    $("analysis-copy").style.display = "none";
    $("analysis-copy").innerHTML = "";
    $("chart-wrap").style.display = "none";
    $("complete-wrap").style.display = "none";
    $("continue-wrap").style.display = "none";

    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function invalidate() {
    clearState();
    sessionStorage.removeItem(FLOW_KEY);
  }

  function loadFlow() {
    context = loadContext();

    const el = $("flow-note");
    el.style.display = "none";
    el.innerHTML = "";

    if (!context) return;

    const d = context.data || {};
    const rows = [];

    if (Number.isFinite(d.hours)) {
      rows.push(`
        <div class="result-row">
          <span>Previous Recovery / Rebuild Window</span>
          <span>${formatHours(d.hours)}</span>
        </div>
      `);
    }

    if (d.risk) {
      rows.push(`
        <div class="result-row">
          <span>Previous Risk State</span>
          <span>${d.risk}</span>
        </div>
      `);
    }

    if (d.rebuildHours && Number.isFinite(d.rebuildHours)) {
      rows.push(`
        <div class="result-row">
          <span>Rebuild Duration</span>
          <span>${formatHours(d.rebuildHours)}</span>
        </div>
      `);
    }

    if (d.survivalHours && Number.isFinite(d.survivalHours)) {
      rows.push(`
        <div class="result-row">
          <span>Estimated Survival Window</span>
          <span>${formatHours(d.survivalHours)}</span>
        </div>
      `);
    }

    if (!rows.length) return;

    el.style.display = "block";
    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">System Context</div>
        <div class="muted">
          Carry-over from the previous compute step is active and is being used to judge whether the backup plan fits inside the platform's failure and recovery envelope.
        </div>
        ${rows.join("")}
      </div>
    `;
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

  function getStatus(score) {
    if (score > 65) return "RISK";
    if (score > 35) return "WATCH";
    return "HEALTHY";
  }

  function getStatusClass(status) {
    if (status === "HEALTHY") return "healthy";
    if (status === "WATCH") return "watch";
    return "risk";
  }

  function renderAnalysis(status, interpretation, guidance, dominantLabel) {
    const el = $("analysis-copy");
    el.style.display = "grid";
    el.innerHTML = `
      <div class="status-pill ${getStatusClass(status)}">Status: ${status}</div>

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

  function metricColor(value, isDominant) {
    if (isDominant) {
      if (value > 65) return "rgba(255, 92, 92, 1)";
      if (value > 35) return "rgba(255, 188, 82, 1)";
      return "rgba(120, 255, 170, 1)";
    }

    if (value > 65) return "rgba(255, 77, 77, 0.30)";
    if (value > 35) return "rgba(255, 170, 51, 0.24)";
    return "rgba(90, 170, 255, 0.15)";
  }

  function metricBorderColor(value, isDominant) {
    if (isDominant) {
      if (value > 65) return "rgba(255, 220, 220, 1)";
      if (value > 35) return "rgba(255, 240, 210, 1)";
      return "rgba(215, 255, 230, 1)";
    }

    return "rgba(120,170,200,0.18)";
  }

  function metricHoverColor(value) {
    if (value > 65) return "rgba(255, 105, 105, 1)";
    if (value > 35) return "rgba(255, 198, 95, 1)";
    return "rgba(135, 255, 182, 1)";
  }

  function buildChart(metrics, dominantIndex) {
    const canvas = $("analyzerChart");
    if (!canvas) return;

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const labels = metrics.map((m) => m.label);
    const values = metrics.map((m) => m.value);

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

        const rx = x.getPixelForValue(65);
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
        ctx.fillText("Reference Window (65)", rx + 8, bottom - 10);

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
        ctx.fillText(`${Math.round(dominantValue)}`, px + 10, py + 4);

        ctx.restore();
      }
    };

    const maxValue = Math.max(...values, 100);

    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Backup Risk Metrics",
            barPercentage: 0.5,
            categoryPercentage: 0.58,
            data: values,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            backgroundColor: (ctx) => {
              const i = ctx.dataIndex;
              const v = ctx.raw;
              return metricColor(v, i === dominantIndex);
            },
            borderColor: (ctx) => {
              const i = ctx.dataIndex;
              const v = ctx.raw;
              return metricBorderColor(v, i === dominantIndex);
            },
            hoverBackgroundColor: (ctx) => metricHoverColor(ctx.raw)
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
                return ` ${Math.round(context.raw)}`;
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
              text: "Backup Risk Magnitude",
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

    canvas.style.width = "100%";
    canvas.style.height = "340px";
    if (canvas.parentElement) {
      canvas.parentElement.style.minHeight = "340px";
    }

    $("chart-wrap").style.display = "block";
  }

  function calc() {
    context = loadContext();

    const dataTb = +$("dataTb").value;
    const changePct = +$("changePct").value;
    const type = $("type").value;
    const mbps = +$("mbps").value;
    const savingsPct = +$("savingsPct").value;
    const overheadPct = +$("overheadPct").value;

    if (
      !Number.isFinite(dataTb) || dataTb <= 0 ||
      !Number.isFinite(changePct) || changePct < 0 ||
      !Number.isFinite(mbps) || mbps <= 0 ||
      !Number.isFinite(savingsPct) || savingsPct < 0 ||
      !Number.isFinite(overheadPct) || overheadPct < 0
    ) {
      $("results").innerHTML = `<div class="muted">Enter valid values to calculate.</div>`;
      $("analysis-copy").style.display = "none";
      $("analysis-copy").innerHTML = "";
      $("chart-wrap").style.display = "none";
      $("complete-wrap").style.display = "none";
      $("continue-wrap").style.display = "none";
      if (chart) {
        chart.destroy();
        chart = null;
      }
      return;
    }

    let sourceTb = dataTb;
    if (type === "inc") sourceTb = dataTb * (changePct / 100);
    if (type === "diff") sourceTb = dataTb * Math.min(1, (changePct / 100) * 2);

    const protectedTb = sourceTb * (1 - savingsPct / 100);
    const effectiveTb = protectedTb * (1 + overheadPct / 100);

    const totalMB = effectiveTb * 1000000;
    const seconds = totalMB / mbps;
    const hours = seconds / 3600;

    const rebuildHours = Number.isFinite(context?.data?.hours)
      ? context.data.hours
      : Number.isFinite(context?.data?.rebuildHours)
        ? context.data.rebuildHours
        : null;

    const backupCoveragePct = rebuildHours && rebuildHours > 0
      ? clamp((hours / rebuildHours) * 100, 0, 200)
      : null;

    const schedulePressureScore = clamp((hours / 8) * 100, 0, 100);
    const recoveryCollisionScore = rebuildHours
      ? clamp((hours / rebuildHours) * 100, 0, 100)
      : clamp((hours / 12) * 100, 0, 100);
    const throughputDemandScore = clamp((effectiveTb / Math.max(hours, 0.01)) * 6, 0, 100);

    const metrics = [
      { label: "Schedule Pressure", value: schedulePressureScore },
      { label: "Recovery Collision", value: recoveryCollisionScore },
      { label: "Throughput Demand", value: throughputDemandScore }
    ];

    let dominantIndex = 0;
    for (let i = 1; i < metrics.length; i += 1) {
      if (metrics[i].value > metrics[dominantIndex].value) dominantIndex = i;
    }

    const dominantLabel = metrics[dominantIndex].label;

    const compositeScore = Math.round(
      (schedulePressureScore * 0.35) +
      (recoveryCollisionScore * 0.45) +
      (throughputDemandScore * 0.20)
    );

    const status = getStatus(compositeScore);

    let interpretation = "";
    let guidance = "";

    if (status === "HEALTHY") {
      interpretation = rebuildHours
        ? "Backup execution fits inside the known recovery envelope. The current data-change pattern and transport rate should allow completion before storage recovery becomes the dominant operational threat."
        : "Backup execution remains inside a workable maintenance window. The platform is not presently backup-bound, and routine protection jobs should complete without materially constraining operations.";

      guidance = "Maintain the current throughput target, keep incremental cadence tight, and monitor change-rate growth. Expansion pressure will first appear in backup duration and recovery overlap before it appears in raw storage consumption.";
    } else if (status === "WATCH") {
      interpretation = rebuildHours
        ? "Backup duration is starting to compete with the platform's recovery timeline. If a disk event or rebuild occurs during the same period, recovery operations and protection jobs begin contending for the same time budget."
        : "Backup duration is approaching the edge of a practical maintenance window. The system is still workable, but schedule elasticity is narrowing and scaling headroom is limited.";

      guidance = "Reduce protected data per cycle, improve effective throughput, or split jobs by tier. Watch what fails first: overnight schedule margin, recovery overlap, or ingest contention on production storage.";
    } else {
      interpretation = rebuildHours
        ? "Backup duration now exceeds or materially crowds the available recovery window. In this state, storage recovery, backup completion, and restore confidence are no longer aligned. The platform becomes operationally fragile under concurrent failure conditions."
        : "Backup duration has moved into a high-risk operating range. Protection jobs will be difficult to finish consistently, and restores become harder to validate against realistic outage windows.";

      guidance = `Re-architect the backup plan. The primary limit is ${dominantLabel.toLowerCase()}, not raw capacity. Increase throughput, segment datasets, shorten change scope, or move to a more aggressive tiered backup strategy before scaling further.`;
    }

    render([
      { label: "Backup Type", value: type.toUpperCase() },
      { label: "Source Data This Job", value: `${sourceTb.toFixed(2)} TB` },
      { label: "Protected Data After Savings", value: `${protectedTb.toFixed(2)} TB` },
      { label: "Effective Data with Overhead", value: `${effectiveTb.toFixed(2)} TB` },
      { label: "Effective Throughput", value: `${mbps.toFixed(0)} MB/s` },
      { label: "Backup Window", value: formatHours(hours) },
      { label: "Composite Risk Score", value: `${compositeScore} / 100` },
      { label: "Status", value: status },
      {
        label: "Backup vs Recovery Window",
        value: rebuildHours
          ? `${backupCoveragePct.toFixed(0)}% of rebuild window`
          : "No prior recovery window carry-over detected"
      }
    ]);

    renderAnalysis(status, interpretation, guidance, dominantLabel);
    buildChart(metrics, dominantIndex);

    saveResult({
      hours,
      backupHours: hours,
      risk: status,
      score: compositeScore,
      dominantMetric: dominantLabel,
      sourceTb,
      protectedTb,
      effectiveTb,
      throughputMbps: mbps
    });

    $("complete-wrap").style.display = "block";
    $("continue-wrap").style.display = "block";
    hasResult = true;
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("dataTb").value = 10;
    $("changePct").value = 5;
    $("type").value = "inc";
    $("mbps").value = 250;
    $("savingsPct").value = 20;
    $("overheadPct").value = 15;
    invalidate();
    loadFlow();
  });

  $("continueBtn").addEventListener("click", () => {
    window.location.href = "/tools/compute/";
  });

  ["dataTb", "changePct", "type", "mbps", "savingsPct", "overheadPct"].forEach((id) => {
    const el = $(id);
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      invalidate();
      loadFlow();
    });
  });

  loadFlow();
})();
