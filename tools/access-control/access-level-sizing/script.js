(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

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
    reset: $("reset")
  };

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    els.completeWrap.style.display = "none";
    hasResult = false;
  }

  function loadFlow() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "access-control") return;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>System Context:</strong><br>
      ${parsed.data.panels || ""} panels<br>
      ${parsed.data.expansions || ""} expansions<br>
      ${parsed.data.readers || ""} readers
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

    let risk = "Healthy";
    let insight = "System should scale well.";

    if (total > 150) {
      risk = "High Complexity";
      insight = "Access levels likely to become difficult to manage.";
    } else if (total > 80) {
      risk = "Moderate Complexity";
      insight = "Structure is manageable but should be grouped carefully.";
    }

    els.results.innerHTML = `
      <div class="result-row"><span>Access Levels</span><span>${total}</span></div>
      <div class="result-row"><span>Complexity</span><span>${risk}</span></div>
      <div class="result-row"><span>Insight</span><span>${insight}</span></div>
    `;

    els.completeWrap.style.display = "block";

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "access-level-sizing",
      data: { total, risk }
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
