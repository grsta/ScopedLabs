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

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function calc() {
    const distance = Math.max(0, n("distance"));
    const routing = parseFloat($("routing").value);
    const slack = Math.max(0, n("slack"));
    const doors = Math.max(1, n("doors"));
    const runs = $("runs").value;
    const cables = Math.max(1, Math.floor(n("cables")));

    const routed = distance * routing;
    const routingLossPct = ((routing - 1) * 100);

    const perDoorSingle = routed + slack;
    const perDoorTotal = runs === "multi" ? perDoorSingle * cables : perDoorSingle;
    const totalAllDoors = perDoorTotal * doors;

    const cableDensity = perDoorTotal / Math.max(1, distance);

    // 🔥 classification
    let difficulty = "LOW";
    if (perDoorTotal > 400 || cableDensity > 4) difficulty = "HIGH";
    else if (perDoorTotal > 250 || cableDensity > 2.5) difficulty = "MODERATE";

    let recommendation = "Standard routing is acceptable.";
    if (difficulty === "HIGH") {
      recommendation = "Consider IDF placement or reducing home-run distances.";
    } else if (difficulty === "MODERATE") {
      recommendation = "Optimize pathways and avoid unnecessary slack.";
    }

    const insight =
      difficulty === "HIGH"
        ? "Cable runs are long and dense. Expect higher labor time, voltage drop concerns, and troubleshooting complexity."
        : difficulty === "MODERATE"
        ? "Install is manageable but requires attention to routing efficiency and labeling discipline."
        : "Cable design is clean and efficient. Install should be straightforward with minimal overhead.";

    $("results").innerHTML = [
      row("Routed Distance (per door)", `${routed.toFixed(1)} ft`),
      row("Routing Loss", `${routingLossPct.toFixed(0)}%`),
      row("Estimated Run (single cable)", `${perDoorSingle.toFixed(1)} ft`),
      row("Estimated Total per Door", `${perDoorTotal.toFixed(1)} ft`),
      row("Estimated Total Cable", `${totalAllDoors.toFixed(1)} ft`),
      row("Cable Density", cableDensity.toFixed(2)),
      row("Install Difficulty", difficulty),
      row("Design Guidance", recommendation),
      row("Engineering Insight", insight)
    ].join("");

    renderChart(perDoorTotal, cableDensity);
  }

  function renderChart(length, density) {
    destroyChart();

    const ctx = document.createElement("canvas");
    $("results").appendChild(ctx);

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Cable Length", "Density"],
        datasets: [{
          data: [length, density],
          borderWidth: 2,
          borderRadius: 8,
          backgroundColor: (ctx) => {
            const v = ctx.raw;
            if (v > 300) return "rgba(255,90,90,1)";
            if (v > 200) return "rgba(255,200,80,1)";
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

  function reset() {
    $("distance").value = 120;
    $("routing").value = "1.30";
    $("slack").value = 15;
    $("doors").value = 8;
    $("runs").value = "single";
    $("cables").value = 4;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    destroyChart();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
