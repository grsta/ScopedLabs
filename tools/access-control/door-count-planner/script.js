(() => {
  const $ = (id) => document.getElementById(id);
  let chart = null;

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

  function compFactor(c) {
    if (c === "moderate") return 1.15;
    if (c === "strict") return 1.35;
    return 1.0;
  }

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function calc() {
    const perimeter = Math.max(0, n("perimeter"));
    const zones = Math.max(0, n("zones"));
    const highsec = Math.max(0, n("highsec"));
    const compliance = $("compliance").value;
    const bothSides = $("bothSides").value;

    const perimeterDoors = perimeter;
    const zoneBase = zones * 1.6 * compFactor(compliance);
    const highsecAdd = highsec * (compliance === "strict" ? 2.0 : 1.3);

    let doors = Math.round(perimeterDoors + zoneBase + highsecAdd);
    doors = Math.max(0, doors);

    const readerMultiplier = bothSides === "yes" ? 2 : 1;
    const readers = doors * readerMultiplier;

    const complexityIndex =
      doors +
      zones * 2 +
      highsec * 5 +
      (bothSides === "yes" ? doors * 0.5 : 0);

    // 🔥 classification
    let status = "HEALTHY";
    if (complexityIndex > 140) status = "RISK";
    else if (complexityIndex > 80) status = "WATCH";

    let guidance = "Standard segmentation is acceptable.";
    if (status === "WATCH") {
      guidance = "System complexity is rising. Ensure controller placement and wiring paths are well planned.";
    }
    if (status === "RISK") {
      guidance = "System is becoming complex. Consider segmentation strategy, controller distribution, and phased deployment.";
    }

    let insight =
      status === "RISK"
        ? "High door count and segmentation will increase install time, wiring complexity, and long-term management overhead."
        : status === "WATCH"
        ? "System is manageable but requires disciplined layout and clear segmentation boundaries."
        : "System is clean and scalable with minimal administrative overhead.";

    $("results").innerHTML = [
      row("Perimeter Doors", perimeterDoors),
      row("Interior Zone Doors", Math.round(zoneBase)),
      row("High-Security Additions", Math.round(highsecAdd)),
      row("Total Controlled Doors", doors),
      row("Estimated Reader Count", readers),
      row("Complexity Index", complexityIndex.toFixed(0)),
      row("System Status", status),
      row("Design Guidance", guidance),
      row("Engineering Insight", insight)
    ].join("");

    renderChart({
      doors,
      zones,
      readers,
      complexityIndex
    });
  }

  function renderChart(data) {
    destroyChart();

    const ctx = document.createElement("canvas");
    $("results").appendChild(ctx);

    const values = [
      data.doors,
      data.zones * 5,
      data.readers,
      data.complexityIndex
    ];

    const labels = [
      "Doors",
      "Zones Impact",
      "Readers",
      "Complexity"
    ];

    const dominant = values.indexOf(Math.max(...values));

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: values,
          borderWidth: 2,
          borderRadius: 8,
          backgroundColor: (ctx) => {
            const v = ctx.raw;
            if (v > 140) return "rgba(255,90,90,1)";
            if (v > 80) return "rgba(255,200,80,1)";
            return "rgba(120,255,170,1)";
          }
        }]
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#cfe" }
          },
          y: {
            ticks: { color: "#cfe" }
          }
        }
      }
    });
  }

  const returnBtn = document.getElementById("returnBtn");
if (returnBtn) {
  returnBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/";
  });
}

  function reset() {
    $("perimeter").value = 8;
    $("zones").value = 6;
    $("highsec").value = 2;
    $("compliance").value = "basic";
    $("bothSides").value = "no";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    destroyChart();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();