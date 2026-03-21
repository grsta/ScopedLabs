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
        <div style="font-weight:600;">Rack Context:</div>

        ${d.total ? `
        <div class="result-row">
          <span>Rack Weight</span>
          <span>${d.total.toFixed(0)} lbs</span>
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
    const weight = parseFloat($("weight").value);
    const w = parseFloat($("w").value);
    const d = parseFloat($("d").value);
    const rating = parseFloat($("rating").value);

    const areaSqFt = (w/12)*(d/12);
    const psf = weight / areaSqFt;

    let status = "Within Limit";
    if (psf > rating * 0.8) status = "High Load";
    if (psf > rating) status = "Exceeds Rating";

    let insight = "Floor load is within safe limits.";
    if (status === "High Load") {
      insight = "Load is approaching structural limits. Validate distribution.";
    }
    if (status === "Exceeds Rating") {
      insight = "Structural risk present. Reinforcement or redistribution required.";
    }

    render([
      {label:"Footprint Area", value:`${areaSqFt.toFixed(2)} sq ft`},
      {label:"Calculated Load", value:`${psf.toFixed(1)} psf`},
      {label:"Floor Rating", value:`${rating} psf`},
      {label:"Load Status", value:status},
      {label:"Insight", value:insight}
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "infrastructure",
      step: "floor-load-rating",
      data: {
        psf,
        status
      }
    }));

    showContinue();
  }

  function reset(){
    $("weight").value = 2500;
    $("w").value = 24;
    $("d").value = 42;
    $("rating").value = 150;
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    hideContinue();
  }

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  ["weight","w","d","rating"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").onclick = () => {
    window.location.href = "/tools/infrastructure/ups-room-sizing/";
  };

  loadFlow();
})();
