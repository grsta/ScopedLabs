(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;
  let context = null;

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

        ${d.hours ? `
        <div class="result-row">
          <span>Rebuild Time</span>
          <span>${d.hours.toFixed(1)} hrs</span>
        </div>` : ""}

        ${d.risk ? `
        <div class="result-row">
          <span>Risk Level</span>
          <span>${d.risk}</span>
        </div>` : ""}
      </div>
    `;
  }

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(div);
    });
  }

  function calc() {
    const dataTb = +$("dataTb").value;
    const changePct = +$("changePct").value;
    const type = $("type").value;
    const mbps = +$("mbps").value;
    const savings = +$("savingsPct").value;
    const overhead = +$("overheadPct").value;

    let data = dataTb;

    if (type === "inc") data = dataTb * (changePct / 100);
    if (type === "diff") data = dataTb * Math.min(1, (changePct / 100) * 2);

    const afterSavings = data * (1 - savings / 100);
    const effective = afterSavings * (1 + overhead / 100);

    const totalMB = effective * 1_000_000;
    const seconds = totalMB / mbps;
    const hours = seconds / 3600;

    const windowText =
      hours >= 1
        ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`
        : `${Math.round(hours * 60)}m`;

    let insight = "Backup window is within reasonable limits.";
    if (hours > 6) insight = "Backup may exceed maintenance window.";
    if (hours > 12) insight = "Backup strategy needs optimization.";
    if (hours > 24) insight = "Recovery time may be unacceptable.";

    if (context && context.data?.hours) {
      const rebuild = context.data.hours;
      if (hours > rebuild) {
        insight = "Backup takes longer than rebuild window — high recovery risk.";
      }
    }

    render([
      { label: "Backup Type", value: type.toUpperCase() },
      { label: "Data to Copy", value: `${data.toFixed(2)} TB` },
      { label: "Effective Data", value: `${effective.toFixed(2)} TB` },
      { label: "Throughput", value: `${mbps} MB/s` },
      { label: "Backup Window", value: windowText },
      { label: "Insight", value: insight }
    ]);

    $("complete-wrap").style.display = "block";

    hasResult = true;
  }

  $("calc").addEventListener("click", calc);

  $("reset").addEventListener("click", () => {
    $("results").innerHTML = `<div class="muted">Run calculation.</div>`;
    $("complete-wrap").style.display = "none";
    hasResult = false;
  });

  loadFlow();
})();
