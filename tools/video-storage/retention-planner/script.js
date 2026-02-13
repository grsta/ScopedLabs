// Retention Planner
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

  function gbFromMbps(mbps, hours) {
    const bits = mbps * 1_000_000 * (hours * 3600);
    const bytes = bits / 8;
    return bytes / 1_000_000_000;
  }

  function calc() {
    const cams = Math.max(1, n("cams"));
    const bitrate = Math.max(0, n("bitrate"));
    const hours = Math.max(0, n("hours"));
    const days = Math.max(1, n("days"));
    const overheadPct = Math.max(0, n("overhead"));

    if (bitrate <= 0) {
      render([{ label: "Error", value: "Enter bitrate > 0 Mbps" }]);
      return;
    }

    const perCamGB = gbFromMbps(bitrate, hours * days);
    const baseTotal = perCamGB * cams;
    const overhead = baseTotal * (overheadPct / 100);
    const finalTotal = baseTotal + overhead;

    render([
      { label: "Cameras", value: cams },
      { label: "Bitrate per Camera", value: `${bitrate.toFixed(2)} Mbps` },
      { label: "Retention", value: `${days} days` },

      { label: "Storage (Base)", value: `${baseTotal.toFixed(1)} GB` },
      { label: "Overhead Added", value: `${overhead.toFixed(1)} GB` },
      { label: "Total Storage Required", value: `${finalTotal.toFixed(1)} GB` },

      { label: "Equivalent", value: `${(finalTotal/1000).toFixed(2)} TB` }
    ]);
  }

  function reset() {
    $("cams").value = 16;
    $("bitrate").value = 4;
    $("hours").value = 24;
    $("days").value = 30;
    $("overhead").value = 10;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
