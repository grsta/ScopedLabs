window.ScopedLabsAnalyzer = (() => {
  const DEFAULTS = {
    referenceValue: 65,
    healthyMax: 65,
    watchMax: 85,
    axisTitle: "Analyzer Magnitude",
    referenceLabel: "Healthy Margin Floor",
    healthyLabel: "Healthy",
    watchLabel: "Watch",
    riskLabel: "Risk",
    chartMax: null
  };

  function ensureRef(ref) {
    return ref && typeof ref === "object" ? ref : { current: null };
  }

  function clearChart(existingChartRef, existingWrapRef) {
    const chartRef = ensureRef(existingChartRef);
    const wrapRef = ensureRef(existingWrapRef);

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (wrapRef.current && wrapRef.current.parentNode) {
      wrapRef.current.parentNode.removeChild(wrapRef.current);
    }

    wrapRef.current = null;
  }

  function clearCurrentStepResult(flowKey, category, step) {
    const raw = sessionStorage.getItem(flowKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.category === category && parsed.step === step) {
        sessionStorage.removeItem(flowKey);
      }
    } catch (_) {
      sessionStorage.removeItem(flowKey);
    }
  }

  function readFlow(flowKey) {
    const raw = sessionStorage.getItem(flowKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function writeFlow(flowKey, payload) {
    sessionStorage.setItem(flowKey, JSON.stringify(payload));
  }

  function getStatus(score, healthyMax = 65, watchMax = 85) {
    if (score > watchMax) return "RISK";
    if (score > healthyMax) return "WATCH";
    return "HEALTHY";
  }

  function getStatusClass(status) {
    if (status === "RISK") return "risk";
    if (status === "WATCH") return "watch";
    return "healthy";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderRows(rows) {
    if (!Array.isArray(rows) || !rows.length) return "";

    return rows.map((row) => {
      const label = escapeHtml(row.label ?? "");
      const value = escapeHtml(row.value ?? "");
      return `
        <div class="result-row">
          <span class="result-label">${label}</span>
          <span class="result-value">${value}</span>
        </div>
      `;
    }).join("");
  }

  function ensureAnalysisStyles() {
    if (document.getElementById("scopedlabs-analyzer-styles")) return;

    const style = document.createElement("style");
    style.id = "scopedlabs-analyzer-styles";
    style.textContent = `
      .sl-analyzer-stack {
        display: grid;
        gap: 12px;
        margin-top: 14px;
      }

      .sl-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.04);
        font-size: .92rem;
        font-weight: 600;
        letter-spacing: .02em;
      }

      .sl-status-pill.healthy { color: #b6f7cb; }
      .sl-status-pill.watch { color: #ffe39a; }
      .sl-status-pill.risk { color: #ffb0b0; }

      .sl-analysis-note {
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        padding: 14px;
        background: rgba(255,255,255,.025);
      }

      .sl-analysis-note strong {
        display: block;
        margin-bottom: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  function renderAnalysisBlock({
    mountEl,
    status,
    interpretation,
    dominantConstraint,
    guidance
  }) {
    if (!mountEl) return;

    ensureAnalysisStyles();

    mountEl.style.display = "grid";
    mountEl.classList.add("sl-analyzer-stack");
    mountEl.innerHTML = `
      <div class="sl-status-pill ${getStatusClass(status)}">Status: ${escapeHtml(status)}</div>

      <div class="sl-analysis-note">
        <strong>Engineering Interpretation</strong>
        <div>${escapeHtml(interpretation)}</div>
      </div>

      <div class="sl-analysis-note">
        <strong>Dominant Constraint</strong>
        <div>${escapeHtml(dominantConstraint)}</div>
      </div>

      <div class="sl-analysis-note">
        <strong>Actionable Guidance</strong>
        <div>${escapeHtml(guidance)}</div>
      </div>
    `;
  }

  function clearAnalysisBlock(mountEl) {
    if (!mountEl) return;
    mountEl.style.display = "none";
    mountEl.innerHTML = "";
    mountEl.classList.remove("sl-analyzer-stack");
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
    const chartRef = ensureRef(existingChartRef);
    const wrapRef = ensureRef(existingWrapRef);

    clearChart(chartRef, wrapRef);

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

    wrapRef.current = wrap;

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

    chartRef.current = new Chart(canvas, {
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

  function renderOutput({
    resultsEl,
    analysisEl,
    summaryRows = [],
    derivedRows = [],
    status,
    interpretation,
    dominantConstraint,
    guidance,
    chart = null,
    existingChartRef,
    existingWrapRef
  }) {
    if (!resultsEl) return;

    clearChart(existingChartRef, existingWrapRef);
    resultsEl.innerHTML = `${renderRows(summaryRows)}${renderRows(derivedRows)}`;

    if (chart) {
      renderAnalyzerChart({
        mountEl: resultsEl,
        existingChartRef,
        existingWrapRef,
        labels: chart.labels,
        values: chart.values,
        displayValues: chart.displayValues,
        referenceValue: chart.referenceValue ?? DEFAULTS.referenceValue,
        healthyMax: chart.healthyMax ?? DEFAULTS.healthyMax,
        watchMax: chart.watchMax ?? DEFAULTS.watchMax,
        axisTitle: chart.axisTitle ?? DEFAULTS.axisTitle,
        referenceLabel: chart.referenceLabel ?? DEFAULTS.referenceLabel,
        healthyLabel: chart.healthyLabel ?? DEFAULTS.healthyLabel,
        watchLabel: chart.watchLabel ?? DEFAULTS.watchLabel,
        riskLabel: chart.riskLabel ?? DEFAULTS.riskLabel,
        chartMax: chart.chartMax ?? DEFAULTS.chartMax
      });
    }

    renderAnalysisBlock({
      mountEl: analysisEl,
      status,
      interpretation,
      dominantConstraint,
      guidance
    });
  }

  function invalidate({
    resultsEl,
    analysisEl,
    continueWrapEl,
    continueBtnEl,
    existingChartRef,
    existingWrapRef,
    flowKey,
    category,
    step,
    emptyMessage = "Enter values and press Calculate."
  }) {
    clearChart(existingChartRef, existingWrapRef);
    clearAnalysisBlock(analysisEl);
    clearCurrentStepResult(flowKey, category, step);

    if (resultsEl) {
      resultsEl.innerHTML = `<div class="muted">${escapeHtml(emptyMessage)}</div>`;
    }

    if (continueWrapEl) continueWrapEl.style.display = "none";
    if (continueBtnEl) continueBtnEl.disabled = true;
  }

  return {
    clearChart,
    clearCurrentStepResult,
    readFlow,
    writeFlow,
    getStatus,
    renderAnalyzerChart,
    renderOutput,
    invalidate
  };
})();