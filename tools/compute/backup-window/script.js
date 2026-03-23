(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart = null;
  let hasResult = false;
  let context = null;

  const els = {
    dataTb: $("dataTb"),
    changePct: $("changePct"),
    type: $("type"),
    mbps: $("mbps"),
    savingsPct: $("savingsPct"),
    overheadPct: $("overheadPct"),
    results: $("results"),
    flowNote: $("flow-note"),
    completeWrap: $("complete-wrap"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continueBtn"),
    analysisCopy: $("analysis-copy"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("analyzerChart")
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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    els.completeWrap.style.display = "none";
    els.continueWrap.style.display = "none";
    els.analysisCopy.style.display = "none";
    els.analysisCopy.innerHTML = "";
    $("chart-wrap").style.display = "none";
    if (chart) {
      chart.destroy();
      chart = null;
    }
    hasResult = false;
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

  function loadFlow() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed || parsed.category !== "compute") return;

    context = parsed;
    const d = parsed.data || {};
    const lines = [];

    if (Number.isFinite(d.hours)) {
      lines.push(`Previous Recovery / Rebuild Window: <strong>${formatHours(d.hours)}</strong>`);
    }

    if (d.risk) {
      lines.push(`Previous Risk State: <strong>${d.risk}</strong>`);
    }

    if (Number.isFinite(d.rebuildHours)) {
      lines.push(`Rebuild Duration: <strong>${formatHours(d.rebuildHours)}</strong>`);
    }

    if (Number.isFinite(d.survivalHours)) {
      lines.push(`Estimated Survival Window: <strong>${formatHours(d.survivalHours)}</strong>`);
    }

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>Carried over system design:</strong><br>
      ${lines.length ? lines.join("<br>") : "Prior compute recovery data detected."}
      <br><br>
      This final step evaluates whether the backup plan fits inside the platform's recovery and failure envelope without turning protection jobs into an operational bottleneck.
    `;
  }

  function getStatus(score) {
    if (score > 65) {
      return {
        label: "RISK",
        insight:
          "Backup duration is now materially crowding the available recovery envelope. Recovery operations, backup completion, and restore confidence are no longer aligned under failure pressure."
      };
    }

    if (score > 35) {
      return {
        label: "WATCH",
        insight:
          "Backup duration is beginning to compete with recovery timing. The platform is still workable, but backup windows are consuming schedule margin that would otherwise absorb recovery events."
      };
    }

    return {
      label: "HEALTHY",
      insight:
        "Backup execution remains inside a workable operating envelope. The current data-change pattern and transport rate should allow protection jobs to complete without materially constraining recovery timing."
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

  function renderChart(schedulePressure, recoveryCollision, throughputDemand, referenceWindow) {
    if (!els.chart) return;

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const labels = [
      "Schedule Pressure",
      "Recovery Collision",
      "Throughput Demand"
    ];

    const values = [
      schedulePressure,
      recoveryCollision,
      throughputDemand
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
        ctx.fillText(`Reference Window (${referenceWindow})`, rx + 8, bottom - 10);

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
            label: "Backup Risk Metrics",
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

    $("chart-wrap").style.display = "block";
  }

  function calc() {
    context = null;
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.category === "compute") {
          context = parsed;
        }
      } catch {}
    }

    const dataTb = num(els.dataTb.value);
    const changePct = num(els.changePct.value);
    const type = els.type.value;
    const mbps = num(els.mbps.value);
    const savingsPct = num(els.savingsPct.value);
    const overheadPct = num(els.overheadPct.value);

    if (
      dataTb <= 0 ||
      changePct < 0 ||
      mbps <= 0 ||
      savingsPct < 0 ||
      overheadPct < 0
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and run analysis.</div>`;
      if (chart) {
        chart.destroy();
        chart = null;
      }
      els.completeWrap.style.display = "none";
      els.continueWrap.style.display = "none";
      els.analysisCopy.style.display = "none";
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

    const schedulePressure = clamp((hours / 8) * 100, 0, 100);
    const recoveryCollision = rebuildHours
      ? clamp((hours / rebuildHours) * 100, 0, 100)
      : clamp((hours / 12) * 100, 0, 100);
    const throughputDemand = clamp((effectiveTb / Math.max(hours, 0.01)) * 6, 0, 100);

    const values = [schedulePressure, recoveryCollision, throughputDemand];
    const dominantIndex = values.indexOf(Math.max(...values));
    const dominantLabel = ["Schedule Pressure", "Recovery Collision", "Throughput Demand"][dominantIndex];

    const compositeScore = Math.round(
      (schedulePressure * 0.35) +
      (recoveryCollision * 0.45) +
      (throughputDemand * 0.20)
    );

    const risk = getStatus(compositeScore);

    let guidance = "";
    if (risk.label === "HEALTHY") {
      guidance = "Maintain the current throughput target, keep incremental cadence tight, and monitor change-rate growth. Expansion pressure will first appear in backup duration and recovery overlap before it appears in raw storage consumption.";
    } else if (risk.label === "WATCH") {
      guidance = "Reduce protected data per cycle, improve effective throughput, or split jobs by tier. Watch what fails first: overnight schedule margin, recovery overlap, or ingest contention on production storage.";
    } else {
      guidance = `Re-architect the backup plan. The primary limit is ${dominantLabel.toLowerCase()}, not raw capacity. Increase throughput, segment datasets, shorten change scope, or move to a more aggressive tiered backup strategy before scaling further.`;
    }

    els.results.innerHTML = `
      ${row("Backup Type", type.toUpperCase())}
      ${row("Source Data This Job", `${sourceTb.toFixed(2)} TB`)}
      ${row("Protected Data After Savings", `${protectedTb.toFixed(2)} TB`)}
      ${row("Effective Data with Overhead", `${effectiveTb.toFixed(2)} TB`)}
      ${row("Effective Throughput", `${mbps.toFixed(0)} MB/s`)}
      ${row("Backup Window", formatHours(hours))}
      ${row("Composite Risk Score", `${compositeScore} / 100`)}
      ${row("Status", risk.label)}
      ${row(
        "Backup vs Recovery Window",
        rebuildHours
          ? `${backupCoveragePct.toFixed(0)}% of rebuild window`
          : "No prior recovery window carry-over detected"
      )}
    `;

    renderAnalysis(risk.label, risk.insight, guidance, dominantLabel);
    renderChart(schedulePressure, recoveryCollision, throughputDemand, 65);

    saveResult({
      hours,
      backupHours: hours,
      risk: risk.label,
      score: compositeScore,
      dominantMetric: dominantLabel,
      sourceTb,
      protectedTb,
      effectiveTb,
      throughputMbps: mbps
    });

    els.completeWrap.style.display = "block";
    els.continueWrap.style.display = "block";
    hasResult = true;
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.dataTb.value = 10;
    els.changePct.value = 5;
    els.type.value = "inc";
    els.mbps.value = 250;
    els.savingsPct.value = 20;
    els.overheadPct.value = 15;

    sessionStorage.removeItem(FLOW_KEY);
    els.results.innerHTML = `<div class="muted">Run calculation.</div>`;
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
    els.analysisCopy.style.display = "none";
    els.analysisCopy.innerHTML = "";
    els.completeWrap.style.display = "none";
    els.continueWrap.style.display = "none";
    $("chart-wrap").style.display = "none";

    if (chart) {
      chart.destroy();
      chart = null;
    }

    hasResult = false;
    loadFlow();
  });

  els.continueBtn.addEventListener("click", () => {
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
