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
    if (!context) return;

    const el = $("flow-note");
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
    if (score < 35) return "HEALTHY";
    if (score < 65) return "WATCH";
    return "RISK";
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

  function buildChart(metrics, dominantIndex) {
    const canvas = $("analyzerChart");
    const ctx = canvas.getContext("2d");
    const labels = metrics.map((m) => m.label);
    const values = metrics.map((m) => m.value);

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const markerDotPlugin = {
      id: "scopedlabsMarkerDot",
      afterDatasetsDraw(chartInstance) {
        const { ctx: drawCtx } = chartInstance;
        const meta = chartInstance.getDatasetMeta(0);
        const element = meta.data[dominantIndex];
        if (!element) return;

        const props = element.getProps(["x", "y", "base"], true);
        const dotX = props.x;
        const dotY = props.y;

        drawCtx.save();
        drawCtx.beginPath();
        drawCtx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        drawCtx.fillStyle = "rgba(140, 255, 181, 1)";
        drawCtx.shadowBlur = 10;
        drawCtx.shadowColor = "rgba(140, 255, 181, .65)";
        drawCtx.fill();
        drawCtx.restore();
      }
    };

    const referenceLinePlugin = {
      id: "scopedlabsReferenceLine",
      afterDraw(chartInstance) {
        const { ctx: drawCtx, chartArea, scales } = chartInstance;
        if (!chartArea || !scales.x) return;

        const x = scales.x.getPixelForValue(65);

        drawCtx.save();
        drawCtx.strokeStyle = "rgba(255,255,255,.45)";
        drawCtx.lineWidth = 1;
        drawCtx.setLineDash([6, 6]);
        drawCtx.beginPath();
        drawCtx.moveTo(x, chartArea.top);
        drawCtx.lineTo(x, chartArea.bottom);
        drawCtx.stroke();
        drawCtx.setLineDash([]);

        drawCtx.fillStyle = "rgba(255,255,255,.65)";
        drawCtx.font = "12px sans-serif";
        drawCtx.fillText("Ref 65", x + 8, chartArea.top + 14);
        drawCtx.restore();
      }
    };

    const valueLabelPlugin = {
      id: "scopedlabsValueLabel",
      afterDatasetsDraw(chartInstance) {
        const { ctx: drawCtx } = chartInstance;
        const meta = chartInstance.getDatasetMeta(0);
        const element = meta.data[dominantIndex];
        if (!element) return;

        const props = element.getProps(["x", "y"], true);
        const value = values[dominantIndex];

        drawCtx.save();
        drawCtx.fillStyle = "rgba(255,255,255,.92)";
        drawCtx.font = "600 12px sans-serif";
        drawCtx.textAlign = "left";
        drawCtx.fillText(`${Math.round(value)}`, props.x + 10, props.y + 4);
        drawCtx.restore();
      }
    };

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Risk Score",
            data: values,
            borderRadius: 10,
            borderSkipped: false,
            backgroundColor: values.map((_, i) =>
              i === dominantIndex ? "rgba(120, 255, 170, 0.88)" : "rgba(120, 255, 170, 0.25)"
            ),
            borderColor: values.map((_, i) =>
              i === dominantIndex ? "rgba(120, 255, 170, 1)" : "rgba(120, 255, 170, 0.30)"
            ),
            borderWidth: 1.5,
            barThickness: 20,
            categoryPercentage: 0.72,
            barPercentage: 0.82
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        animation: false,
        layout: {
          padding: {
            top: 12,
            right: 24,
            bottom: 12,
            left: 8
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            backgroundColor: "rgba(10,12,16,.96)",
            borderColor: "rgba(255,255,255,.10)",
            borderWidth: 1,
            titleColor: "rgba(255,255,255,.92)",
            bodyColor: "rgba(255,255,255,.82)",
            displayColors: false,
            callbacks: {
              label(context) {
                return `Risk Score: ${Math.round(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: {
              color(context) {
                const v = context.tick && typeof context.tick.value === "number" ? context.tick.value : -1;
                if (v >= 0 && v <= 35) return "rgba(110, 230, 150, 0.12)";
                if (v > 35 && v <= 65) return "rgba(255, 210, 110, 0.12)";
                return "rgba(255, 120, 120, 0.12)";
              }
            },
            border: {
              color: "rgba(255,255,255,.10)"
            },
            ticks: {
              color: "rgba(255,255,255,.65)",
              stepSize: 20
            }
          },
          y: {
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              color: "rgba(255,255,255,.82)",
              font: {
                size: 12,
                weight: "600"
              }
            }
          }
        }
      },
      plugins: [markerDotPlugin, referenceLinePlugin, valueLabelPlugin]
    });

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
      $("chart-wrap").style.display = "none";
      $("complete-wrap").style.display = "none";
      $("continue-wrap").style.display = "none";
      return;
    }

    let sourceTb = dataTb;
    if (type === "inc") sourceTb = dataTb * (changePct / 100);
    if (type === "diff") sourceTb = dataTb * Math.min(1, (changePct / 100) * 2);

    const protectedTb = sourceTb * (1 - savingsPct / 100);
    const effectiveTb = protectedTb * (1 + overheadPct / 100);

    const totalMB = effectiveTb * 1_000_000;
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

    const throughputDemandScore = clamp((effectiveTb / Math.max(hours, 0.01)) * 6, 0, 100);
    const schedulePressureScore = clamp((hours / 8) * 100, 0, 100);
    const recoveryCollisionScore = rebuildHours
      ? clamp((hours / rebuildHours) * 100, 0, 100)
      : clamp((hours / 12) * 100, 0, 100);

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
        ? `Backup execution fits inside the known recovery envelope. The current data-change pattern and transport rate should allow completion before storage recovery becomes the dominant operational threat.`
        : `Backup execution remains inside a workable maintenance window. The platform is not presently backup-bound, and routine protection jobs should complete without materially constraining operations.`;

      guidance = `Maintain the current throughput target, keep incremental cadence tight, and monitor change-rate growth. Expansion pressure will first appear in backup duration and recovery overlap before it appears in raw storage consumption.`;
    } else if (status === "WATCH") {
      interpretation = rebuildHours
        ? `Backup duration is starting to compete with the platform's recovery timeline. If a disk event or rebuild occurs during the same period, recovery operations and protection jobs begin contending for the same time budget.`
        : `Backup duration is approaching the edge of a practical maintenance window. The system is still workable, but schedule elasticity is narrowing and scaling headroom is limited.`;

      guidance = `Reduce protected data per cycle, improve effective throughput, or split jobs by tier. Watch what fails first: overnight schedule margin, recovery overlap, or ingest contention on production storage.`;
    } else {
      interpretation = rebuildHours
        ? `Backup duration now exceeds or materially crowds the available recovery window. In this state, storage recovery, backup completion, and restore confidence are no longer aligned. The platform becomes operationally fragile under concurrent failure conditions.`
        : `Backup duration has moved into a high-risk operating range. Protection jobs will be difficult to finish consistently, and restores become harder to validate against realistic outage windows.`;

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
      {
        label: "Status",
        value: status
      },
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
      if (hasResult) invalidate();
    });
  });

  loadFlow();
})();
