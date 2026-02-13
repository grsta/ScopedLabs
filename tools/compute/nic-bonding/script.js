// NIC Bonding Planner (simple model)
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
    const links = Math.max(1, Math.floor(n("links")));
    const speed = Math.max(0.1, n("speed")); // Gbps per link
    const mode = $("mode").value;
    const hash = $("hash").value;
    const flows = Math.max(1, Math.floor(n("flows")));
    const util = clamp(n("util"), 10, 100) / 100;

    const totalRaw = links * speed;
    let agg = speed; // default per-flow cap ~ 1 link unless round-robin / multi-queue special

    let behavior = "";
    let perFlowCap = speed;

    if (mode === "active-backup") {
      agg = speed; // one active link
      behavior = "One link active; others standby. Best for redundancy, not throughput.";
      perFlowCap = speed;
    } else if (mode === "lacp" || mode === "balance-xor") {
      // Aggregate depends on number of flows and hashing distribution.
      // Approx: effective links used ~ min(links, sqrt(flows)) (diminishing returns).
      const usedLinks = Math.min(links, Math.max(1, Math.floor(Math.sqrt(flows))));
      agg = usedLinks * speed;
      behavior = `Aggregates across links based on hash (${hash}). Single flow typically limited to one link.`;
      perFlowCap = speed;
    } else if (mode === "round-robin") {
      // Can exceed per-flow cap but often problematic; treat as full aggregate with penalty
      agg = totalRaw * 0.85;
      behavior = "Round-robin can spread packets across links; may cause reordering. Use only when supported end-to-end.";
      perFlowCap = totalRaw * 0.85;
    }

    const targetAgg = agg * util;

    const notes = [
      "Most LACP setups do NOT increase single TCP flow speed; they increase total capacity across many flows.",
      "Distribution depends on hash policy and traffic patterns (few big flows may not balance well).",
      "Redundancy depends on switch config (LACP) and cabling paths."
    ].join(" ");

    render([
      { label: "Mode", value: mode.toUpperCase() },
      { label: "Links × Speed", value: `${links} × ${speed} Gbps` },
      { label: "Raw Total Capacity", value: `${totalRaw.toFixed(2)} Gbps` },

      { label: "Estimated Aggregate (effective)", value: `${agg.toFixed(2)} Gbps` },
      { label: "Target Usable (util applied)", value: `${targetAgg.toFixed(2)} Gbps` },
      { label: "Single-Flow Cap (typical)", value: `${perFlowCap.toFixed(2)} Gbps` },

      { label: "Behavior", value: behavior },
      { label: "Notes", value: notes }
    ]);
  }

  function reset() {
    $("links").value = 2;
    $("speed").value = "10";
    $("mode").value = "active-backup";
    $("hash").value = "l2";
    $("flows").value = 20;
    $("util").value = 80;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  // If mode is active-backup, hash doesn't matter; keep it enabled but harmless.
  reset();
})();
