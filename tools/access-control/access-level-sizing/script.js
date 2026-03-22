(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart = null;
  let hasResult = false;

  const els = {
    roles: $("roles"),
    areas: $("areas"),
    schedules: $("schedules"),
    doorGroups: $("doorGroups"),
    complexity: $("complexity"),
    results: $("results"),
    flowNote: $("flow-note"),
    completeWrap: $("complete-wrap"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart")
  };

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    els.completeWrap.style.display = "none";
    if (chart) chart.destroy();
    hasResult = false;
  }

  function loadFlow() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "access-control") return;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>Carried over system design:</strong><br>
      Panels: <strong>${parsed.data.panels || 0}</strong><br>
      Expansions: <strong>${parsed.data.expansions || 0}</strong><br>
      Readers: <strong>${parsed.data.readers || 0}</strong><br><br>
      This step evaluates whether your access structure will scale cleanly or become operationally complex.
    `;
  }

  function calc() {
    const roles = +els.roles.value;
    const areas = +els.areas.value;
    const schedules = +els.schedules.value;
    const groups = +els.doorGroups.value;

    let base = roles * areas;

    let complexityFactor = 1;
    if (els.complexity.value === "simple") complexityFactor = 0.8;
    if (els.complexity.value === "complex") complexityFactor = 1.3;

    const total = Math.round(base * (1 + schedules * 0.1) * (1 + groups * 0.05) * complexityFactor);

    const combinations = roles * areas;
    const scalingPressure = total / (roles + areas);

    let risk = "Healthy";
    let insight = "System should scale cleanly with minimal administrative overhead.";

    if (total > 150) {
      risk = "High Complexity";
      insight = "Access levels are likely to become difficult to manage and prone to errors. Consider grouping strategies and role abstraction.";
    } else if (total > 80) {
      risk = "Moderate Complexity";
      insight = "System is manageable but will require structured grouping and consistent naming to avoid sprawl.";
    }

    els.results.innerHTML = `
      <div class="result-row"><span>Access Levels</span><span>${total}</span></div>
      <div class="result-row"><span>Role-Area Combinations</span><span>${combinations}</span></div>
      <div class="result-row"><span>Scaling Pressure</span><span>${scalingPressure.toFixed(1)}</span></div>
      <div class="result-row"><span>Complexity</span><span>${risk}</span></div>
      <div class="result-row"><span>Engineering Insight</span><span>${insight}</span></div>
    `;

    // GRAPH
    if (chart) chart.destroy();

    chart = new Chart(els.chart, {
      type: "bar",
      data: {
        labels: ["Access Levels", "Roles", "Areas", "Schedules"],
        datasets: [{
          label: "System Structure",
          data: [total, roles, areas, schedules]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });

    els.completeWrap.style.display = "block";

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "access-level-sizing",
      data: { total, risk, combinations, scalingPressure }
    }));

    hasResult = true;
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", () => {
    els.results.innerHTML = `<div class="muted">Run analysis.</div>`;
    invalidate();
  });

  Object.values(els).forEach(el => {
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT")) {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  loadFlow();
})();