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
        <div style="font-weight:600;">Layout Context:</div>

        ${d.areaSqFt ? `
        <div class="result-row">
          <span>Room Area</span>
          <span>${d.areaSqFt.toFixed(0)} sq ft</span>
        </div>` : ""}

        ${d.layout ? `
        <div class="result-row">
          <span>Layout Type</span>
          <span>${d.layout}</span>
        </div>` : ""}
      </div>
    `;
  }

  function calc(){
    const count = parseFloat($("count").value);
    const each = parseFloat($("each").value);
    const cap = parseFloat($("cap").value);

    const total = count * each;
    const percent = (total / cap) * 100;

    let status = "Within Capacity";
    if (percent > 80) status = "High Load";
    if (percent > 100) status = "Over Capacity";

    let insight = "Rack loading is within safe operating limits.";
    if (status === "High Load") {
      insight = "Rack is approaching capacity. Consider load distribution.";
    }
    if (status === "Over Capacity") {
      insight = "Rack exceeds rating. Risk of structural failure or damage.";
    }

    render([
      {label:"Devices", value: count},
      {label:"Total Weight", value: `${total.toFixed(0)} lbs`},
      {label:"Rack Capacity", value: `${cap.toFixed(0)} lbs`},
      {label:"Load %", value: `${percent.toFixed(1)}%`},
      {label:"Status", value: status},
      {label:"Insight", value: insight}
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "infrastructure",
      step: "rack-weight-load",
      data: {
        total,
        percent,
        status
      }
    }));

    showContinue();
  }

  function reset(){
    $("count").value = 20;
    $("each").value = 35;
    $("cap").value = 3000;
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    hideContinue();
  }

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  ["count","each","cap"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").onclick = () => {
    window.location.href = "/tools/infrastructure/floor-load-rating/";
  };

  loadFlow();
})();
