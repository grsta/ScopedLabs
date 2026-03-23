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