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

  function showComplete(){
    $("continue-wrap").style.display = "block";
    hasResult = true;
  }

  function hideComplete(){
    $("continue-wrap").style.display = "none";
    hasResult = false;
  }

  function invalidate(){
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    hideComplete();
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
        <div style="font-weight:600;">UPS Context:</div>

        ${d.finalArea ? `
        <div class="result-row">
          <span>UPS Area</span>
          <span>${d.finalArea.toFixed(0)} sq ft</span>
        </div>` : ""}

        ${d.density ? `
        <div class="result-row">
          <span>Layout Density</span>
          <span>${d.density}</span>
        </div>` : ""}
      </div>
    `;
  }

  function fmtHours(h){
    if (!isFinite(h)) return "—";
    const d = Math.floor(h/24);
    const hr = Math.floor(h % 24);
    return d > 0 ? `${d}d ${hr}h` : `${hr}h`;
  }

  function calc(){
    const fuel = parseFloat($("fuel").value);
    const rate = parseFloat($("rate").value);
    const load = parseFloat($("load").value);
    const reserve = parseFloat($("reserve").value);

    const usable = fuel * (1 - reserve/100);
    const effRate = rate * load;
    const hours = usable / effRate;

    let tier = "Standard Backup";
    if (hours < 8) tier = "Short Duration";
    if (hours > 24) tier = "Extended Runtime";

    let insight = "Generator capacity is adequate for typical outage scenarios.";
    if (tier === "Short Duration") {
      insight = "Limited runtime. Consider additional fuel storage or redundancy.";
    }
    if (tier === "Extended Runtime") {
      insight = "Strong resilience. Suitable for prolonged outages.";
    }

    render([
      {label:"Usable Fuel", value:`${usable.toFixed(1)} gal`},
      {label:"Effective Burn Rate", value:`${effRate.toFixed(2)} gal/hr`},
      {label:"Runtime", value: fmtHours(hours)},
      {label:"Resilience Tier", value:tier},
      {label:"Insight", value:insight}
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "infrastructure",
      step: "generator-runtime",
      data: { hours, tier }
    }));

    showComplete();
  }

  function reset(){
    $("fuel").value = 100;
    $("rate").value = 4.0;
    $("load").value = "0.75";
    $("reserve").value = 10;
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    hideComplete();
  }

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  ["fuel","rate","load","reserve"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  loadFlow();
})();
