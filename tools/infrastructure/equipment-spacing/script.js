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
          <span>Total RU</span>
          <span>${d.total}</span>
        </div>` : ""}

        ${d.status ? `
        <div class="result-row">
          <span>Capacity Status</span>
          <span>${d.status}</span>
        </div>` : ""}
      </div>
    `;
  }

  function calc(){
    const rows = parseInt($("rows").value);
    const racksPer = parseInt($("racksPer").value);
    const rackW = parseFloat($("rackW").value);
    const rackD = parseFloat($("rackD").value);
    const cold = parseFloat($("cold").value);
    const hot = parseFloat($("hot").value);
    const end = parseFloat($("end").value);

    const lengthIn = racksPer * rackW + 2 * end;

    let widthIn = 0;
    for(let i=0;i<rows;i++){
      widthIn += rackD;
      if(i < rows-1){
        widthIn += (i % 2 === 0) ? cold : hot;
      }
    }

    const lengthFt = lengthIn / 12;
    const widthFt = widthIn / 12;
    const areaSqFt = lengthFt * widthFt;

    let layout = "Balanced";
    if (widthFt < 10) layout = "Tight";
    if (widthFt > 20) layout = "Spacious";

    let insight = "Layout is within typical deployment standards.";
    if (layout === "Tight") {
      insight = "Aisle spacing may restrict airflow and service access.";
    }
    if (layout === "Spacious") {
      insight = "Layout is service-friendly but may overuse floor space.";
    }

    render([
      {label:"Room Length", value:`${lengthFt.toFixed(1)} ft`},
      {label:"Room Width", value:`${widthFt.toFixed(1)} ft`},
      {label:"Floor Area", value:`${areaSqFt.toFixed(0)} sq ft`},
      {label:"Layout Density", value:layout},
      {label:"Insight", value:insight}
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "infrastructure",
      step: "equipment-spacing",
      data: {
        lengthFt,
        widthFt,
        areaSqFt,
        layout
      }
    }));

    showContinue();
  }

  function reset(){
    $("rows").value = 2;
    $("racksPer").value = 6;
    $("rackW").value = 24;
    $("rackD").value = 42;
    $("cold").value = 48;
    $("hot").value = 48;
    $("end").value = 36;
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    hideContinue();
  }

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  ["rows","racksPer","rackW","rackD","cold","hot","end"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").onclick = () => {
    window.location.href = "/tools/infrastructure/rack-weight-load/";
  };

  loadFlow();
})();
