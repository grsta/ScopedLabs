(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";
    rows.forEach((r) => {
      const d = document.createElement("div");
      d.className = "result-row";
      d.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(d);
    });
  }

  function showContinue() {
    $("continue-wrap").style.display = "block";
    $("continue").disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    $("continue-wrap").style.display = "none";
    $("continue").disabled = true;
    hasResult = false;
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
  }

  function calc() {
    const equip = Math.max(1, parseFloat($("equip").value) || 0);
    const factor = Math.max(1, parseFloat($("factor").value) || 0);
    const growth = Math.max(0, parseFloat($("growth").value) || 0);

    const base = equip * factor;
    const total = base * (1 + growth / 100);

    let density = "Balanced";
    if (factor < 1.6) density = "Tight";
    if (factor > 2.6) density = "Conservative";

    let guidance = "Room sizing appears reasonable for an early planning estimate.";
    if (density === "Tight") {
      guidance = "Clearance factor is aggressive. Validate aisle width, service access, and cable paths before committing.";
    } else if (density === "Conservative") {
      guidance = "Clearance factor is generous. Good for growth and serviceability, but confirm the extra square footage is justified.";
    }

    render([
      { label: "Equipment Footprint", value: `${equip.toFixed(0)} sq ft` },
      { label: "Clearance Factor", value: `${factor.toFixed(1)}×` },
      { label: "Base Room Size", value: `${base.toFixed(0)} sq ft` },
      { label: "Growth Reserve", value: `${growth.toFixed(0)}%` },
      { label: "Estimated Room Size", value: `${total.toFixed(0)} sq ft` },
      { label: "Planning Density", value: density },
      { label: "Guidance", value: guidance }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "infrastructure",
      step: "room-square-footage",
      data: {
        equip,
        factor,
        growth,
        base,
        total,
        density,
        guidance
      }
    }));

    showContinue();
  }

  function reset() {
    $("equip").value = 250;
    $("factor").value = 2.0;
    $("growth").value = 20;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  ["equip", "factor", "growth"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/infrastructure/rack-ru-planner/";
  });

  reset();
})();
