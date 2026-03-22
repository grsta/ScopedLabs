(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart = null;
  let chartWrap = null;
  let hasResult = false;

  const els = {
    doors: $("doors"),
    readersPerDoor: $("readersPerDoor"),
    inputsPerDoor: $("inputsPerDoor"),
    outputsPerDoor: $("outputsPerDoor"),
    baseDoors: $("baseDoors"),
    expDoors: $("expDoors"),
    maxExp: $("maxExp"),
    spare: $("spare"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    nextWrap: $("continue-wrap"),
    nextBtn: $("continue"),
    flowNote: $("flow-note")
  };

  function destroyChart() {
    if (chart) chart.destroy();
    if (chartWrap) chartWrap.remove();
    chart = null;
    chartWrap = null;
  }

  function showContinue() {
    els.nextWrap.style.display = "block";
    els.nextBtn.disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    els.nextWrap.style.display = "none";
    els.nextBtn.disabled = true;
    hasResult = false;
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    destroyChart();
    hideContinue();
  }

  function loadFlowContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "access-control") return;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>System context:</strong><br>
      ${parsed.data.recommendation || ""}<br>
      ${parsed.data.reader || ""}<br>
      ${parsed.data.req ? `Power Load: ${parsed.data.req.toFixed(2)} A` : ""}
    `;
  }

  function getStatus(loadPct) {
    if (loadPct > 85) return "RISK";
    if (loadPct > 65) return "WATCH";
    return "HEALTHY";
  }

  function calc() {
    const doors = +els.doors.value;
    const spare = +els.spare.value;

    const base = +els.baseDoors.value;
    const exp = +els.expDoors.value;
    const maxExp = +els.maxExp.value;

    const target = Math.ceil(doors * (1 + spare / 100));
    const perPanel = base + (maxExp * exp);
    const panels = Math.ceil(target / perPanel);

    const remaining = target - (panels * base);
    const expansions = Math.ceil(Math.max(0, remaining) / exp);

    const readers = doors * +els.readersPerDoor.value;

    const loadPct = (target / (panels * perPanel)) * 100;
    const expansionPct = (expansions / (panels * maxExp)) * 100;

    const status = getStatus(loadPct);

    let insight;
    if (status === "RISK") {
      insight = "System is near capacity. Future expansion will require additional panels or re-architecture.";
    } else if (status === "WATCH") {
      insight = "System is serviceable but nearing expansion limits. Plan for additional panels or segmentation.";
    } else {
      insight = "System is well balanced with strong expansion headroom.";
    }

    els.results.innerHTML = `
      <div class="result-row"><span>Panels Required</span><span>${panels}</span></div>
      <div class="result-row"><span>Expansion Modules</span><span>${expansions}</span></div>
      <div class="result-row"><span>Total Readers</span><span>${readers}</span></div>
      <div class="result-row"><span>System Load</span><span>${loadPct.toFixed(0)}%</span></div>
      <div class="result-row"><span>Expansion Pressure</span><span>${expansionPct.toFixed(0)}%</span></div>
      <div class="result-row"><span>Status</span><span>${status}</span></div>
      <div class="result-row"><span>Engineering Insight</span><span>${insight}</span></div>
    `;

    renderChart({
      loadPct,
      expansionPct
    });

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "panel-capacity",
      data: { panels, expansions, readers }
    }));

    showContinue();
  }

  function renderChart(metrics) {
    destroyChart();

    chartWrap = document.createElement("div");
    chartWrap.style.height = "340px";
    chartWrap.style.marginTop = "16px";

    const canvas = document.createElement("canvas");
    chartWrap.appendChild(canvas);
    els.results.appendChild(chartWrap);

    const values = [
      metrics.loadPct,
      metrics.expansionPct
    ];

    const labels = [
      "System Load",
      "Expansion Pressure"
    ];

    const dominantIndex = values.indexOf(Math.max(...values));

    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: values,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
          borderRadius: 8,
          backgroundColor: (ctx) => {
            const v = ctx.raw;
            const i = ctx.dataIndex;

            if (i === dominantIndex) {
              if (v > 85) return "rgba(255,90,90,1)";
              if (v > 65) return "rgba(255,200,80,1)";
              return "rgba(120,255,170,1)";
            }

            return "rgba(120,255,170,0.15)";
          }
        }]
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.results.innerHTML = `<div class="muted">Run calculation.</div>`;
    destroyChart();
    invalidate();
  });

  Object.values(els).forEach(el => {
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT")) {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/access-level-sizing/";
  });

  loadFlowContext();
})();