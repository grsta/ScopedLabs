// VPN Overhead Estimator
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
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
    const baseline = n("baseline");
    const enc = $("enc").value;
    const mode = $("mode").value;
    const offload = $("offload").value;

    if (baseline <= 0) {
      render([{ label: "Error", value: "Enter baseline throughput > 0" }]);
      return;
    }

    // Approximate overhead factors (rule-of-thumb)
    let overheadPct = 0.15; // base 15%

    if (enc === "wireguard") overheadPct = 0.08;
    if (enc === "ipsec") overheadPct = 0.12;

    if (mode === "tcp") overheadPct += 0.05; // TCP-in-TCP penalty
    if (offload === "yes") overheadPct -= 0.03;

    overheadPct = Math.max(0.02, overheadPct);

    const delivered = baseline * (1 - overheadPct);
    const lost = baseline - delivered;

    // MTU reduction estimate
    let mtuLoss = 60;
    if (enc === "wireguard") mtuLoss = 40;
    if (enc === "ipsec") mtuLoss = 56;

    render([
      { label: "Baseline Throughput", value: `${baseline.toFixed(1)} Mbps` },
      { label: "Estimated Overhead", value: `${(overheadPct * 100).toFixed(1)} %` },
      { label: "Delivered Throughput", value: `${delivered.toFixed(1)} Mbps` },
      { label: "Throughput Lost", value: `${lost.toFixed(1)} Mbps` },
      { label: "Estimated MTU Reduction", value: `${mtuLoss} bytes` },
      { label: "Recommended Action", value: "Lower tunnel MTU or MSS clamp if fragmentation occurs." }
    ]);
  }

  function reset() {
    $("baseline").value = 200;
    $("enc").value = "openvpn";
    $("mode").value = "udp";
    $("offload").value = "no";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
