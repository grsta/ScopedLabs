(() => {
  const $ = id => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let context = null;

  function render(rows){
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r=>{
      const d = document.createElement("div");
      d.className = "result-row";
      d.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(d);
    });
  }

  function showContinue(){
    $("continue-wrap").style.display = "block";
    $("continue").disabled = false;
    hasResult = true;
  }

  function hideContinue(){
    $("continue-wrap").style.display = "none";
    $("continue").disabled = true;
    hasResult = false;
  }

  function invalidate(){
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
  }

  function loadContext(){
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "infrastructure") return null;

    return parsed;
  }

  function loadFlow(){
    context = loadContext();
    if (!context) return;

    const el = $("flow-note");
    el.style.display = "block";

    const d = context.data;

    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">Room Context:</div>

        ${d.total ? `
        <div class="result-row">
          <span>Room Size</span>
          <span>${d.total.toFixed(0)} sq ft</span>
        </div>` : ""}

        ${d.density ? `
        <div class="result-row">
          <span>Planning Density</span>
          <span>${d.density}</span>
        </div>` : ""}
      </div>
    `;
  }

  function calc(){
    const total = parseFloat($("total").value);
    const used = parseFloat($("used").value);
    const reserve = parseFloat($("reserve").value);

    const free = total - used;
    const reserved = total * (reserve / 100);
    const available = free - reserved;

    let status = "Healthy";
    if (available < 6) status = "Tight";
    if (available < 2) status = "Critical";

    let insight = "Rack capacity is within safe limits.";
    if (status === "Tight") {
      insight = "Limited expansion room. Plan additional racks or reduce density.";
    }
    if (status === "Critical") {
      insight = "Rack is effectively full. Expansion requires new rack allocation.";
    }

    render([
      {label:"Total Rack RU", value: total},
      {label:"Used RU", value: used},
      {label:"Free RU", value: free},
      {label:"Reserved for Growth", value: reserved.toFixed(1)},
      {label:"Available RU After Reserve", value: available.toFixed(1)},
      {label:"Capacity Status", value: status},
      {label:"Insight", value: insight}
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "infrastructure",
      step: "rack-ru-planner",
      data: {
        total,
        used,
        free,
        available,
        status
      }
    }));

    showContinue();
  }

  function reset(){
    $("total").value = 42;
    $("used").value = 18;
    $("reserve").value = 20;
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    hideContinue();
  }

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  ["total","used","reserve"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").onclick = () => {
    window.location.href = "/tools/infrastructure/equipment-spacing/";
  };

  loadFlow();
})();
