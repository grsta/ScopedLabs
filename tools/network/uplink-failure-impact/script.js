// Uplink Failure Impact (simple scoring + actionable outputs)
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

  function severity(score) {
    if (score >= 80) return "CRITICAL";
    if (score >= 55) return "HIGH";
    if (score >= 30) return "MEDIUM";
    return "LOW";
  }

  function calc() {
    const sites = Math.max(1, n("sites"));
    const users = Math.max(0, n("users"));
    const apps = $("apps").value;         // basic | mixed | critical
    const failover = $("failover").value; // yes | partial | no
    const minutes = Math.max(0, n("minutes"));

    // Base impact from scale
    // Sites: adds structural importance
    // Users: adds operational disruption
    let score = 0;
    score += clamp(sites * 12, 0, 36);      // 1 site=12, 3+=36 cap
    score += clamp(users * 0.8, 0, 32);     // 40 users ~32 cap

    // App criticality
    if (apps === "basic") score += 10;
    if (apps === "mixed") score += 20;
    if (apps === "critical") score += 32;

    // Failover reduces impact
    if (failover === "yes") score -= 18;
    if (failover === "partial") score -= 8;
    if (failover === "no") score += 0;

    // Duration amplifies
    // After 30 minutes, business pain ramps.
    const durFactor = clamp(minutes / 60, 0, 4); // 0..4 hours scaled
    score += clamp(durFactor * 6, 0, 24);

    score = clamp(score, 0, 100);
    const sev = severity(score);

    // Simple operational guidance
    const steps = [];
    steps.push("Confirm physical link (handoff, SFP, patch, power).");
    steps.push("Check WAN interface status, errors, and ISP demarc lights.");
    steps.push("Verify DNS + gateway reachability; test from LAN and edge.");
    if (failover !== "no") steps.push("Validate failover path: routing, NAT, and bandwidth shaping.");
    if (apps !== "basic") steps.push("Prioritize QoS for VoIP/video and throttle non-critical traffic.");
    steps.push("If outage persists: open ISP ticket, capture timestamps, interface logs, traceroutes.");

    render([
      { label: "Sites Affected", value: `${sites}` },
      { label: "Users Affected", value: `${users}` },
      { label: "Apps", value: apps.toUpperCase() },
      { label: "Failover", value: failover.toUpperCase() },
      { label: "Outage Duration", value: `${minutes.toFixed(0)} min` },

      { label: "Impact Score", value: `${score.toFixed(0)} / 100` },
      { label: "Severity", value: sev },

      { label: "Next Actions", value: steps.join(" ") }
    ]);
  }

  function reset() {
    $("sites").value = 1;
    $("users").value = 25;
    $("apps").value = "mixed";
    $("failover").value = "no";
    $("minutes").value = 60;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
