(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let context = null;

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

  function loadContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "compute") return null;

    return parsed;
  }

  function loadFlow() {
    context = loadContext();
    if (!context) return;

    const el = $("flow-note");
    el.style.display = "block";

    const d = context.data;

    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        <div style="font-weight:600;">System Context:</div>

        ${d.totalW ? `
        <div class="result-row">
          <span>Power Load</span>
          <span>${d.totalW.toFixed(0)} W</span>
        </div>` : ""}

        ${d.tons ? `
        <div class="result-row">
          <span>Cooling</span>
          <span>${d.tons.toFixed(2)} tons</span>
        </div>` : ""}
      </div>
    `;
  }

  function calc() {
    const driveTb = parseFloat($("driveTb").value);
    const mbps = parseFloat($("mbps").value);
    const loadFactor = parseFloat($("load").value);
    const raid = $("raid").value;
    const verify = $("verify").value;

    const effMbps = mbps * loadFactor;

    let penalty = 1.0;
    if (raid === "6") penalty = 1.15;
    if (raid === "5") penalty = 1.05;

    const totalMB = driveTb * 1_000_000;
    let hours = (totalMB / effMbps) * penalty / 3600;

    if (verify === "yes") hours *= 2;

    let risk = "Low";
    if (hours > 24) risk = "Elevated";
    if (hours > 48) risk = "High";
    if (hours > 72) risk = "Critical";

    let insight = "Rebuild exposure is acceptable.";
    if (risk === "Elevated") insight = "System is vulnerable during rebuild.";
    if (risk === "High") insight = "Failure risk increases significantly during rebuild.";
    if (risk === "Critical") insight = "High chance of data loss window — redesign recommended.";

    $("results").innerHTML = `
      <div class="result-row"><span>Rebuild Time</span><span>${hours.toFixed(1)} hrs</span></div>
      <div class="result-row"><span>Risk Level</span><span>${risk}</span></div>
      <div class="result-row"><span>Insight</span><span>${insight}</span></div>
    `;

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "raid-rebuild-time",
      data: { hours, risk }
    }));

    showContinue();
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    invalidate();
  });

  ["driveTb","mbps","load","raid","verify"].forEach(id => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/compute/backup-window/";
  });

  loadFlow();
})();
