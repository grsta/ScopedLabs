// Codec Efficiency Comparator (rule-of-thumb savings)
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

  // Relative efficiency: lower means more efficient (needs fewer bits for similar quality)
  function eff(codec) {
    if (codec === "av1") return 0.60;
    if (codec === "h265") return 0.70;
    if (codec === "vp9") return 0.75;
    return 1.00; // h264 baseline
  }

  function gbFromMbps(mbps, hours) {
    // Mbps -> GB for a given number of hours
    // 1 byte = 8 bits, 1 GB = 1e9 bytes
    const bits = mbps * 1_000_000 * (hours * 3600);
    const bytes = bits / 8;
    return bytes / 1_000_000_000;
  }

  function calc() {
    const baseline = Math.max(0, n("baseline"));
    const fromCodec = $("fromCodec").value;
    const toCodec = $("toCodec").value;
    const hours = clamp(n("hours"), 0, 24);
    const days = Math.max(0, n("days"));
    const cams = Math.max(1, n("cams"));

    if (baseline <= 0) {
      render([{ label: "Error", value: "Enter a baseline bitrate (Mbps) > 0" }]);
      return;
    }

    // Convert baseline measured in "from codec" to estimated in "to codec"
    // Example: baseline in H.264 (1.00) -> H.265 (0.70): new = baseline * (0.70/1.00)
    const newMbps = baseline * (eff(toCodec) / eff(fromCodec));

    const perCamHours = hours * days;
    const oldGB = gbFromMbps(baseline, perCamHours) * cams;
    const newGB = gbFromMbps(newMbps, perCamHours) * cams;

    const savingsGB = Math.max(0, oldGB - newGB);
    const savingsPct = oldGB > 0 ? (savingsGB / oldGB) * 100 : 0;

    render([
      { label: "Baseline Bitrate", value: `${baseline.toFixed(2)} Mbps (${fromCodec.toUpperCase()})` },
      { label: "Estimated Target Bitrate", value: `${newMbps.toFixed(2)} Mbps (${toCodec.toUpperCase()})` },
      { label: "Hours × Days × Cams", value: `${hours.toFixed(1)}h × ${days.toFixed(0)}d × ${cams}` },

      { label: "Storage (Baseline)", value: `${oldGB.toFixed(1)} GB` },
      { label: "Storage (Target)", value: `${newGB.toFixed(1)} GB` },

      { label: "Estimated Savings", value: `${savingsGB.toFixed(1)} GB (${savingsPct.toFixed(1)}%)` },
      { label: "Notes", value: "Rule-of-thumb. Real results vary by encoder settings, motion, and lighting." }
    ]);
  }

  function reset() {
    $("baseline").value = 4.0;
    $("fromCodec").value = "h264";
    $("toCodec").value = "h265";
    $("hours").value = 24;
    $("days").value = 30;
    $("cams").value = 8;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();

