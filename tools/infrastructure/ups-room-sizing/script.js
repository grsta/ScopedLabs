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
        <div style="font-weight:600;">Structural Context:</div>

        ${d.psf ? `
        <div class="result-row">
          <span>Floor Load</span>
          <span>${d.psf.toFixed(1)} psf</span>
        </div>` : ""}

        ${d.status ? `
        <div class="result-row">
          <span>Load Status</span>
          <span>${d.status}</span>
        </div>` : ""}
      </div>
    `;
  }

  function calc(){
    const ups = parseFloat($("ups").value);
    const batt = parseFloat($("batt").value);
    const areaEach = parseFloat($("areaEach").value);
    const factor = parseFloat($("factor").value);

    const totalCab = ups + batt;
    const baseArea = totalCab * areaEach;
    const finalArea = baseArea * factor;

    let density = "Balanced";
    if (factor < 1.3) density = "Tight";
    if (factor > 2.0) density = "Spacious";

    let insight = "UPS room sizing is within normal planning range.";
    if (density === "Tight") {
      insight = "Clearance is minimal. Ensure service access and ventilation.";
    }
    if (density === "Spacious") {
      insight = "Layout allows expansion but uses additional floor space.";
    }

    render([
      {label:"Total Cabinets", value: totalCab},
      {label:"Base Area", value:`${baseArea.toFixed(0)} sq ft`},
      {label:"Clearance Factor", value:`${factor.toFixed(1)}×`},
      {label:"Estimated Room Size", value:`${finalArea.toFixed(0)} sq ft`},
      {label:"Layout Density", value:density},
      {label:"Insight", value:insight}
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "infrastructure",
      step: "ups-room-sizing",
      data: {
        totalCab,
        finalArea,
        density
      }
    }));

    showContinue();
  }

  function reset(){
    $("ups").value = 2;
    $("batt").value = 4;
    $("areaEach").value = 20;
    $("factor").value = 1.5;
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    hideContinue();
  }

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  ["ups","batt","areaEach","factor"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").onclick = () => {
    window.location.href = "/tools/infrastructure/generator-runtime/";
  };

  loadFlow();
})();

