// Backup Window Estimator
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
    const dataTb = Math.max(0, n("dataTb"));
    const changePct = Math.max(0, n("changePct"));
    const type = $("type").value; // full|inc|diff
    const mbps = Math.max(1, n("mbps"));
    const savingsPct = Math.max(0, n("savingsPct"));
    const overheadPct = Math.max(0, n("overheadPct"));

    if (dataTb <= 0) {
      render([{ label: "Error", value: "Dataset size must be > 0 TB" }]);
      return;
    }

    // Determine effective data to copy
    let dataToCopyTb = dataTb;

    if (type === "inc") {
      dataToCopyTb = dataTb * (changePct / 100);
    } else if (type === "diff") {
      // differential tends to grow over time; approximate as 2× daily change if not reset often
      dataToCopyTb = dataTb * Math.min(1, (changePct / 100) * 2);
    }

    // Apply savings (compression/dedup reduces bytes written)
    const afterSavingsTb = dataToCopyTb * (1 - savingsPct / 100);

    // Apply overhead (encryption, small files, verification, metadata, etc.)
    const effectiveTb = afterSavingsTb * (1 + overheadPct / 100);

    // Convert TB -> MB (decimal) then divide by MB/s to seconds
    const totalMB = effectiveTb * 1_000_000; // 1 TB = 1,000,000 MB
    const seconds = totalMB / mbps;

    const hours = seconds / 3600;
    const mins = (hours - Math.floor(hours)) * 60;

    const windowText =
      hours >= 1
        ? `${Math.floor(hours)}h ${Math.round(mins)}m`
        : `${Math.round(hours * 60)}m`;

    // Throughput guidance
    const note = [
      "Throughput is usually limited by: source read speed, network, target write, and backup software overhead.",
      "If small files: real throughput can be much lower than link speed.",
      "Consider adding a verification window (hash/check) if required."
    ].join(" ");

    render([
      { label: "Backup Type", value: type.toUpperCase() },
      { label: "Data to Copy (raw)", value: `${dataToCopyTb.toFixed(3)} TB` },
      { label: "After Savings", value: `${afterSavingsTb.toFixed(3)} TB` },
      { label: "After Overhead", value: `${effectiveTb.toFixed(3)} TB` },

      { label: "Effective Throughput", value: `${mbps.toFixed(0)} MB/s` },
      { label: "Estimated Backup Window", value: windowText },
      { label: "Notes", value: note }
    ]);
  }

  function reset() {
    $("dataTb").value = 10;
    $("changePct").value = 5;
    $("type").value = "inc";
    $("mbps").value = 250;
    $("savingsPct").value = 20;
    $("overheadPct").value = 15;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
