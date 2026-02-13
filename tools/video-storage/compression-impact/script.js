// Compression Impact (simple factors model)
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

  function qFactor(q) {
    if (q === "high") return 1.25;
    if (q === "low") return 0.80;
    return 1.00;
  }

  function mFactor(m) {
    if (m === "high") return 1.35;
    if (m === "low") return 0.80;
    return 1.00;
  }

  function gopFactor(gopSec) {
    // shorter GOP (more keyframes) increases bitrate
    // 1s -> higher, 4s -> lower, clamp to reasonable range
    const g = clamp(gopSec, 0.5, 10);
    if (g <= 1) return 1.15;
    if (g <= 2) return 1.00;
    if (g <= 4) return 0.92;
    return 0.88;
  }

  function gbFromMbps(mbps, hours) {
    const bits = mbps * 1_000_000 * (hours * 3600);
    const bytes = bits / 8;
    return bytes / 1_000_000_000;
  }

  function calc() {
    const baseline = Math.max(0, n("baseline"));
    const quality = $("quality").value;
    const motion = $("motion").value;
    const gop = n("gop");
    const hours = clamp(n("hours"), 0, 24);
    const days = Math.max(0, n("days"));
    const cams = Math.max(1, n("cams"));

    if (baseline <= 0) {
      render([{ label: "Error", value: "Enter a baseline bitrate (Mbps) > 0" }]);
      return;
    }

    const factor = qFactor(quality) * mFactor(motion) * gopFactor(gop);
    const newMbps = baseline * factor;

    const totalHours = hours * days;
    const oldGB = gbFromMbps(baseline, totalHours) * cams;
    const newGB = gbFromMbps(newMbps, totalHours) * cams;

    const deltaGB = newGB - oldGB;
    const deltaPct = oldGB > 0 ? (deltaGB / oldGB) * 100 : 0;

    const note =
      "Higher motion + higher quality + shorter keyframe interval increases bitrate. " +
      "Use longer GOP and moderate quality for storage efficiency.";

    render([
      { label: "Baseline Bitrate", value: `${baseline.toFixed(2)} Mbps` },
      { label: "Adjusted Bitrate", value: `${newMbps.toFixed(2)} Mbps` },
      { label: "Multiplier", value: `× ${factor.toFixed(2)}` },

      { label: "Storage (Baseline)", value: `${oldGB.toFixed(1)} GB` },
      { label: "Storage (Adjusted)", value: `${newGB.toFixed(1)} GB` },

      { label: "Change", value: `${deltaGB.toFixed(1)} GB (${deltaPct.toFixed(1)}%)` },
      { label: "Notes", value: note }
    ]);
  }

  function reset() {
    $("baseline").value = 4.0;
    $("quality").value = "med";
    $("motion").value = "med";
    $("gop").value = 2;
    $("hours").value = 24;
    $("days").value = 30;
    $("cams").value = 8;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
