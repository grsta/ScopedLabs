(() => {
  const $ = (id) => document.getElementById(id);
  let chart = null;

  const els = {
    cars: $("cars"),
    banks: $("banks"),
    floors: $("floors"),
    dest: $("dest"),
    placement: $("placement"),
    results: $("results"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart")
  };

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${label}</span>
        <span class="result-value">${value}</span>
      </div>
    `;
  }

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function resetResults() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    destroyChart();
  }

  function getPerBankReaders(floors) {
    return floors > 12 ? 2 : 1;
  }

  function getStatus(complexityIndex) {
    if (complexityIndex > 90) return "RISK";
    if (complexityIndex > 55) return "WATCH";
    return "HEALTHY";
  }

  function getGuidance(status, placement, dest) {
    if (status === "RISK") {
      return "Reader strategy is becoming complex. Coordinate early with the elevator contractor and validate kiosk, car, and override behaviors before procurement.";
    }
    if (status === "WATCH") {
      return "Design is workable, but integration detail matters. Confirm reader placement, throughput expectations, and emergency override sequences.";
    }
    if (dest === "yes" && placement === "car") {
      return "DCS is present, so verify whether lobby authentication is actually required before locking into in-car-only hardware.";
    }
    return "Reader strategy is straightforward and should deploy cleanly with normal coordination.";
  }

  function getInsight(status, placement, dest, total) {
    if (status === "RISK") {
      return `This elevator access design is hardware-heavy. At ${total} estimated readers, the challenge is less about count and more about integration behavior, queue flow, and how cleanly elevator logic is coordinated with access control.`;
    }
    if (status === "WATCH") {
      return "This is a moderate-complexity elevator access design. Hardware count is manageable, but reader location and user flow will determine whether the system feels smooth or frustrating in daily use.";
    }
    if (dest === "yes") {
      return "The reader count remains reasonable, but DCS changes where authentication belongs. Keep user interaction aligned with the destination-selection point, not just the elevator car.";
    }
    return "This is a clean elevator reader design with limited deployment overhead and predictable control behavior.";
  }

  function renderChart(data) {
    destroyChart();
    if (!els.chart) return;

    const labels = [
      "Total Readers",
      "Cars Impact",
      "Lobby Impact",
      "Complexity"
    ];

    const values = [
      data.totalReaders,
      data.carReaders,
      data.lobbyReaders + data.dcsAdd,
      data.complexityIndex
    ];

    const displayValues = {
      0: `${data.totalReaders} readers`,
      1: `${data.carReaders} in-car`,
      2: `${data.lobbyReaders + data.dcsAdd} lobby/DCS`,
      3: `${data.complexityIndex} complexity`
    };

    const dominantIndex = values.indexOf(Math.max(...values));
    const referenceValue = 30;
    const chartMax = Math.max(100, Math.ceil(Math.max(...values, referenceValue, 60) * 1.12));

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

        const healthyMax = Math.min(30, x.max);
        const watchMax = Math.min(55, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 30) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(30),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(30),
            bottom - top
          );
        }

        if (x.max > 55) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(55),
            top,
            right - x.getPixelForValue(55),
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
        ctx.fillText("Planning Watch Limit", rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(4), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(34), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(59), top + 14);

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
        ctx.fillText(displayValues[dominantIndex], Math.min(px + 8, chartArea.right - 110), py - 8);

        ctx.restore();
      }
    };

    chart = new Chart(els.chart, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Elevator Reader Metrics",
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
                if (v > 55) return "rgba(255, 92, 92, 1)";
                if (v > 30) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 55) return "rgba(255, 77, 77, 0.30)";
              if (v > 30) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 55) return "rgba(255, 220, 220, 1)";
                if (v > 30) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 55) return "rgba(255, 105, 105, 1)";
              if (v > 30) return "rgba(255, 198, 95, 1)";
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
                const i = context.dataIndex;
                return ` ${displayValues[i]}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: chartMax,
            ticks: {
              color: "rgba(220, 238, 230, 0.78)"
            },
            grid: {
              color: "rgba(110, 160, 140, 0.10)"
            },
            title: {
              display: true,
              text: "Planning Magnitude",
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

    if (els.chart) {
      els.chart.style.width = "100%";
      els.chart.style.height = "340px";
      if (els.chart.parentElement) {
        els.chart.parentElement.style.minHeight = "340px";
      }
    }
  }

  function calc() {
    const cars = Math.max(0, Math.floor(n("cars")));
    const banks = Math.max(1, Math.floor(n("banks")));
    const floors = Math.max(0, Math.floor(n("floors")));
    const dest = els.dest.value;
    const placement = els.placement.value;

    if (cars <= 0) {
      els.results.innerHTML = row("Error", "Enter Elevator Cars > 0");
      destroyChart();
      return;
    }

    let carReaders = 0;
    let lobbyReaders = 0;

    if (placement === "car") {
      carReaders = cars;
    } else if (placement === "lobby") {
      lobbyReaders = banks * getPerBankReaders(floors);
    } else {
      carReaders = cars;
      lobbyReaders = banks * getPerBankReaders(floors);
    }

    let dcsAdd = 0;
    if (dest === "yes") {
      if (placement === "lobby" || placement === "both") {
        dcsAdd = banks;
      } else {
        dcsAdd = Math.max(1, Math.round(banks * 0.5));
      }
    }

    const totalReaders = carReaders + lobbyReaders + dcsAdd;

    const complexityIndex = Math.round(
      totalReaders +
      floors * 1.5 +
      banks * 4 +
      (dest === "yes" ? 12 : 0) +
      (placement === "both" ? 10 : placement === "lobby" ? 4 : 0)
    );

    const status = getStatus(complexityIndex);
    const guidance = getGuidance(status, placement, dest);
    const insight = getInsight(status, placement, dest, totalReaders);

    els.results.innerHTML = [
      row("Cars", cars),
      row("Banks", banks),
      row("Secured Floors", floors),
      row("Destination Control", dest === "yes" ? "YES" : "NO"),
      row("Placement", placement.toUpperCase()),
      row("Car Readers (est.)", carReaders),
      row("Lobby Readers (est.)", lobbyReaders),
      row("DCS Adders (est.)", dcsAdd),
      row("Estimated Total Readers", totalReaders),
      row("Planning Complexity", complexityIndex),
      row("System Status", status),
      row("Design Guidance", guidance),
      row("Engineering Insight", insight)
    ].join("");

    renderChart({
      totalReaders,
      carReaders,
      lobbyReaders,
      dcsAdd,
      complexityIndex
    });
  }

  function reset() {
    els.cars.value = 6;
    els.banks.value = 2;
    els.floors.value = 8;
    els.dest.value = "no";
    els.placement.value = "car";
    resetResults();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  [els.cars, els.banks, els.floors, els.dest, els.placement].forEach((el) => {
    el.addEventListener("input", resetResults);
    el.addEventListener("change", resetResults);
  });

  reset();
})();