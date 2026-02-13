// RAID Rebuild Time Estimator (rule-of-thumb)
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

  function fmtHours(totalHours) {
    if (!Number.isFinite(totalHours) || totalHours < 0) return "—";
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    if (h <= 0) return `${Math.max(1, m)}m`;
    return `${h}h ${m}m`;
  }

  function calc() {
    const driveTb = Math.max(0, n("driveTb"));
    const mbps = Math.max(1, n("mbps"));
    const loadFactor = parseFloat($("load").value); // effective speed multiplier
    const raid = $("raid").value; // 5|6|10
    const verify = $("verify").value; // yes|no

    if (driveTb <= 0) {
      render([{ label: "Error", value: "Drive size must be > 0 TB" }]);
      return;
    }

    // Effective rebuild speed
    const effMbps = mbps * (Number.isFinite(loadFactor) ? loadFactor : 0.7);

    // Data to process: rebuild generally scans/rewrites large portions.
    // Use 1× drive size as baseline for RAID10 mirror rebuild,
    // and 1× for RAID5/6 as well (controller behavior varies).
    // RAID6 parity calc tends to be heavier—apply a small penalty.
    let penalty = 1.0;
    if (raid === "6") penalty = 1.15;
    if (raid === "5") penalty = 1.05;
    if (raid === "10") penalty = 1.0;

    const totalMB = driveTb * 1_000_000; // TB -> MB (decimal)
    const seconds = (totalMB / effMbps) * penalty;

    let hours = seconds / 3600;

    if (verify === "yes") {
      // add a second pass at similar speed
      hours *= 2;
    }

    const riskNote =
      raid === "5"
        ? "RAID5 is vulnerable during rebuild (single-parity). Consider RAID6 for large drives."
        : raid === "6"
          ? "RAID6 offers better fault tolerance during rebuild (dual-parity)."
          : "RAID10 rebuilds can be faster, but capacity overhead is higher.";

    const tips = [
      "Rebuild time is often longer in production due to I/O contention and controller throttling.",
      "Large HDD arrays can take many hours to days; monitor URE risk and consider hot spares.",
      "If you must rebuild under load, expect effective speed to drop significantly."
    ].join(" ");

    render([
      { label: "Drive Size", value: `${driveTb.toFixed(1)} TB` },
      { label: "Base Rebuild Speed", value: `${mbps.toFixed(0)} MB/s` },
      { label: "Effective Speed", value: `${effMbps.toFixed(0)} MB/s` },
      { label: "RAID Type", value: `RAID ${raid}` },
      { label: "Verify/Scrub", value: verify === "yes" ? "YES" : "NO" },

      { label: "Estimated Rebuild Time", value: fmtHours(hours) },
      { label: "Notes", value: `${riskNote} ${tips}` }
    ]);
  }

  function reset() {
    $("driveTb").value = 16;
    $("mbps").value = 120;
    $("load").value = "0.7";
    $("raid").value = "5";
    $("verify").value = "no";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
