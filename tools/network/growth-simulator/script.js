(() => {
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEYS = {
    networkFlow: "scopedlabs:flow:network",
  };

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  function fmtMbps(v) {
    return `${v.toFixed(1)} Mbps`;
  }

  function fmtGbps(v) {
    return `${v.toFixed(3)} Gbps`;
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

  function renderInterpretation(blocks) {
    const el = $("interpretation");
    el.innerHTML = "";

    blocks.forEach((block) => {
      const card = document.createElement("div");
      card.className = "result-block";
      card.innerHTML = `
        <div class="result-label" style="margin-bottom:6px;">${block.title}</div>
        <div class="muted">${block.text}</div>
      `;
      el.appendChild(card);
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

  function saveFlowSnapshot(payload) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.networkFlow, JSON.stringify(payload));
    } catch (_) {
      // ignore storage errors
    }
  }

  function loadFlowSnapshot() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.networkFlow);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function maybePrefillFromFlow() {
    const flow = loadFlowSnapshot();
    if (!flow || typeof flow !== "object") return;

    if (Number.isFinite(flow.bandwidthMbps) && flow.bandwidthMbps > 0) {
      $("startMbps").value = String(Math.round(flow.bandwidthMbps));
      const note = $("flowNote");
      const text = $("flowNoteText");
      if (note && text) {
        note.hidden = false;
        text.textContent =
          "Starting demand was prefilled from earlier network sizing work. Use this simulator to see when present-day demand may outgrow current uplink assumptions.";
      }
    }
  }

  function estimateSaturationMonth(series, uplinkGbps, utilPct) {
    const safeLimitGbps = uplinkGbps * (utilPct / 100);
    for (let i = 0; i < series.length; i++) {
      if (series[i].reqGbps > safeLimitGbps) return i;
    }
    return null;
  }

  function buildInterpretation(end, saturationMonth, inputs) {
    const {
      startMbps,
      growthPct,
      months,
      uplinkGbps,
      utilPct,
    } = inputs;

    const startGbps = startMbps / 1000;
    const safeLimitGbps = uplinkGbps * (utilPct / 100);
    const growthRatio = startMbps > 0 ? end.req / startMbps : 0;

    let meaning = `Projected required bandwidth grows from ${fmtMbps(startMbps)} (${fmtGbps(startGbps)}) today to ${fmtMbps(end.req)} (${fmtGbps(end.reqGbps)}) by month ${months}.`;

    if (growthRatio >= 2) {
      meaning += " This is a major increase and should be treated as a real capacity planning event rather than a minor expansion.";
    } else if (growthRatio >= 1.3) {
      meaning += " This is a meaningful increase that can erode headroom faster than teams expect.";
    } else {
      meaning += " Growth remains moderate across the selected window, but should still be checked against real traffic history.";
    }

    let take = `At a target utilization of ${utilPct.toFixed(0)}%, your selected ${uplinkGbps} Gbps uplink provides about ${fmtGbps(safeLimitGbps)} of comfortable operating capacity.`;

    if (end.reqGbps > safeLimitGbps) {
      take += " The projection exceeds that comfort zone, which means burst traffic, failover events, or future adds could push the link into a congestion-prone range.";
    } else if (end.reqGbps > safeLimitGbps * 0.85) {
      take += " The design stays technically inside the target window, but margin is getting thin by the end of the projection.";
    } else {
      take += " The design retains usable margin over the projection window and does not appear immediately capacity-limited under the selected assumptions.";
    }

    let recommendation = "";

    if (saturationMonth !== null) {
      recommendation = `Plan to upgrade or split traffic before about month ${saturationMonth}. A larger uplink, segmented traffic domains, or revised growth assumptions should be considered before that point.`;
    } else if (end.links > 1) {
      recommendation = `Even though the link may remain viable for part of the projection window, the end-state requires ${end.links} parallel links at the selected utilization target. Review aggregation strategy now rather than waiting for congestion to appear in production.`;
    } else if (end.reqGbps > safeLimitGbps * 0.85) {
      recommendation = "This design is workable, but it would benefit from more future headroom. Consider validating it against the Oversubscription Estimator or moving to a larger uplink if growth is likely to accelerate.";
    } else {
      recommendation = "Current assumptions look reasonable. Re-check quarterly with actual utilization history and revisit sooner if camera count, video quality, or remote traffic patterns change.";
    }

    return [
      { title: "What this means", text: meaning },
      { title: "Engineering take", text: take },
      { title: "Recommended next step", text: recommendation },
    ];
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
      base = base * (1 + growthPct / 100);
    }

    const end = series[months];
    const saturationMonth = estimateSaturationMonth(series, uplinkGbps, utilPct);

    renderRows($("results"), [
      { label: "Start Demand", value: fmtMbps(startMbps) },
      { label: "Monthly Growth", value: `${growthPct.toFixed(2)}%` },
      { label: "Projection Window", value: `${months} months` },
      { label: "End Month Base", value: fmtMbps(end.base) },
      { label: "End Month Required", value: `${fmtMbps(end.req)} (${fmtGbps(end.reqGbps)})` },
      { label: "Selected Uplink", value: `${uplinkGbps} Gbps` },
      { label: "Target Utilization", value: `${utilPct.toFixed(0)}%` },
      { label: "Links Needed (end month)", value: `${end.links}` },
      {
        label: "Saturation Month",
        value: saturationMonth === null ? "Not reached in this window" : `Month ${saturationMonth}`,
      },
    ]);

    renderInterpretation(
      buildInterpretation(end, saturationMonth, {
        startMbps,
        growthPct,
        months,
        uplinkGbps,
        utilPct,
      })
    );

    buildTable(months, series);

    saveFlowSnapshot({
      tool: "growth-simulator",
      bandwidthMbps: end.req,
      months,
      monthlyGrowthPct: growthPct,
      targetUtilPct: utilPct,
      uplinkGbps,
      saturationMonth,
      timestamp: Date.now(),
    });
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
    $("interpretation").innerHTML = `<div class="muted">Run a simulation to see what the projected growth means for capacity planning.</div>`;
    $("tableWrap").innerHTML = `<div class="muted">Simulation output will appear here.</div>`;
  }

  $("calc").addEventListener("click", simulate);
  $("reset").addEventListener("click", reset);

  maybePrefillFromFlow();
  reset();
})();
