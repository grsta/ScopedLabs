// Storage Throughput Estimator
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
    const iops = Math.max(0, n("iops"));
    const kb = Math.max(0, n("kb"));
    const readPct = clamp(n("readPct"), 0, 100);
    const writePct = clamp(n("writePct"), 0, 100);
    const overheadPct = Math.max(0, n("overhead"));

    const totalPct = readPct + writePct;
    const rPct = totalPct === 0 ? 0.5 : readPct / totalPct;
    const wPct = totalPct === 0 ? 0.5 : writePct / totalPct;

    // MB/s = IOPS * KB / 1024
    const totalMBps = (iops * kb) / 1024;

    const readMBps = totalMBps * rPct;
    const writeMBps = totalMBps * wPct;

    const finalMBps = totalMBps * (1 + overheadPct / 100);

    render([
      { label: "I/O Size", value: `${kb.toFixed(0)} KB` },
      { label: "Read / Write Split", value: `${(rPct * 100).toFixed(0)}% / ${(wPct * 100).toFixed(0)}%` },

      { label: "Read Throughput", value: `${readMBps.toFixed(1)} MB/s` },
      { label: "Write Throughput", value: `${writeMBps.toFixed(1)} MB/s` },
      { label: "Subtotal Throughput", value: `${totalMBps.toFixed(1)} MB/s` },
      { label: "Overhead", value: `${overheadPct.toFixed(0)}%` },

      { label: "Estimated Required Throughput", value: `${finalMBps.toFixed(1)} MB/s` }
    ]);
  }

  function reset() {
    $("iops").value = 5000;
    $("kb").value = 32;
    $("readPct").value = 70;
    $("writePct").value = 30;
    $("overhead").value = 15;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
