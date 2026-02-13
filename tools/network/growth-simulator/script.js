(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function renderRows(targetEl, rows) {
    targetEl.innerHTML = "";
    rows.forEach((r) => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      targetEl.appendChild(div);
    });
  }

  function buildTable(months, series) {
    const wrap = $("tableWrap");
    wrap.innerHTML = "";

    const table = document.createElement("table");
    table.className = "table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="text-align:left;">Month</th>
        <th style="text-align:right;">Base (Mbps)</th>
        <th style="text-align:right;">Required (Mbps)</th>
        <th style="text-align:right;">Required (Gbps)</th>
        <th style="text-align:right;">Links Needed</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let i = 0; i <= months; i++) {
      const s = series[i];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:left;">${i}</td>
        <td style="text-align:right;">${s.base.toFixed(1)}</td>
        <td style="text-align:right;">${s.req.toFixed(1)}</td>
        <td style="text-align:right;">${s.reqGbps.toFixed(3)}</td>
        <td style="text-align:right;">${s.links}</td>
      `;
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  function simulate() {
    const startMbps = Math.max(0, n("startMbps"));
    const growthPct = Math.max(0, n("growthPct"));
    const months = Math.max(1, Math.floor(n("months")));

    const peak = parseFloat($("peak").value) || 1.0;
    const overheadPct = Math.max(0, n("overhead"));
    const utilPct = clamp(n("util"), 10, 100);
    const uplinkGbps = parseFloat($("uplink").value) || 1;

    const series = [];
    let base = startMbps;

    for (let m = 0; m <= months; m++) {
      const peakMbps = base * peak;
      const req = peakMbps * (1 + overheadPct / 100);

      const reqGbps = req / 1000;
      const neededAtTarget = reqGbps / (utilPct / 100);
      const links = uplinkGbps > 0 ? Math.max(1, Math.ceil(neededAtTarget / uplinkGbps)) : 0;

      series.push({ base, req, reqGbps, links });

      // compound growth for next month
      base = base * (1 + growthPct / 100);
    }

    // summarize end month
    const end = series[months];
    const resEl = $("results");

    renderRows(resEl, [
      { label: "Start Demand", value: `${startMbps.toFixed(1)} Mbps` },
      { label: "Monthly Growth", value: `${growthPct.toFixed(2)}%` },
      { label: "Projection Window", value: `${months} months` },

      { label: `End Month Base`, value: `${end.base.toFixed(1)} Mbps` },
      { label: `End Month Required`, value: `${end.req.toFixed(1)} Mbps (${end.reqGbps.toFixed(3)} Gbps)` },
      { label: "Selected Uplink", value: `${uplinkGbps} Gbps` },
      { label: "Links Needed (end month)", value: `${end.links}` },

      {
        label: "Notes",
        value:
          "Uses compound growth. Validate assumptions with real utilization history and include failover/N+1 headroom where required."
      }
    ]);

    buildTable(months, series);
  }

  function reset() {
    $("startMbps").value = 500;
    $("growthPct").value = 6;
    $("months").value = 18;
    $("peak").value = "1.15";
    $("overhead").value = 15;
    $("util").value = 70;
    $("uplink").value = "1";

    $("results").innerHTML = `<div class="muted">Enter values and press Simulate.</div>`;
    $("tableWrap").innerHTML = `<div class="muted">Simulation output will appear here.</div>`;
  }

  $("calc").addEventListener("click", simulate);
  $("reset").addEventListener("click", reset);

  reset();
})();
