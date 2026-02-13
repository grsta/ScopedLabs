// Storage IOPS Estimator
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
    const tps = Math.max(0, n("tps"));
    const reads = Math.max(0, n("reads"));
    const writes = Math.max(0, n("writes"));
    const penalty = parseFloat($("penalty").value);
    const headroomPct = Math.max(0, n("headroom"));

    const readIops = tps * reads;
    const writeIops = tps * writes * (Number.isFinite(penalty) ? penalty : 1);

    const total = readIops + writeIops;
    const final = total * (1 + headroomPct / 100);

    render([
      { label: "Read IOPS", value: readIops.toFixed(0) },
      { label: "Write IOPS (penalized)", value: writeIops.toFixed(0) },
      { label: "Subtotal IOPS", value: total.toFixed(0) },
      { label: "Headroom", value: `${headroomPct.toFixed(0)} %` },
      { label: "Estimated Required IOPS", value: final.toFixed(0) }
    ]);
  }

  function reset() {
    $("tps").value = 2000;
    $("reads").value = 2;
    $("writes").value = 1;
    $("penalty").value = "4";
    $("headroom").value = 30;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
