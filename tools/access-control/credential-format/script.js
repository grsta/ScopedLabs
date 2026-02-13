// Credential Format Helper (planning math + guidance)
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

  function pow10(d) {
    // safe-ish for small digit counts
    return Math.pow(10, Math.max(0, d));
  }

  function calc() {
    const fcDigits = Math.max(0, Math.floor(n("fcDigits")));
    const cardDigits = Math.max(1, Math.floor(n("cardDigits")));
    const fmt = $("fmt").value; // decimal|binary
    const bits = parseInt($("bits").value, 10);
    const pop = Math.max(0, Math.floor(n("pop")));

    // Decimal capacity
    const fcCap = pow10(fcDigits);
    const cardCap = pow10(cardDigits);
    const totalDecimal = fcCap * cardCap;

    // Binary capacity rough estimate (ignoring parity bits)
    // Typical Wiegand formats include parity; we approximate usable bits as bits-2.
    const usableBits = Math.max(8, bits - 2);
    const totalBinary = Math.pow(2, usableBits);

    const chosenTotal = fmt === "decimal" ? totalDecimal : totalBinary;

    const utilization = chosenTotal > 0 ? (pop / chosenTotal) * 100 : 0;

    const fit =
      utilization < 10 ? "Excellent headroom" :
      utilization < 30 ? "Good headroom" :
      utilization < 60 ? "Moderate headroom" :
      utilization < 90 ? "Tight / risk of collisions" :
      "Over capacity / collision likely";

    const tips = [
      "Standardize one format across the site (avoid mixing readers/panels with different bit interpretations).",
      "Record the exact format in documentation (bit length, facility code range, card range).",
      "If multi-tenant: consider partitioning facility codes by tenant to reduce collision risk.",
      "If migrating: plan for card number translation or dual-format acceptance during cutover."
    ].join(" ");

    render([
      { label: "Format Type", value: fmt.toUpperCase() },
      { label: "Badge Population", value: `${pop}` },

      { label: "Decimal Capacity (FC × Card)", value: `${totalDecimal.toLocaleString()} (${fcCap.toLocaleString()} × ${cardCap.toLocaleString()})` },
      { label: "Binary Capacity (approx)", value: `${totalBinary.toLocaleString()} (usable bits ~ ${usableBits})` },

      { label: "Capacity Used", value: `${utilization.toFixed(2)} %` },
      { label: "Assessment", value: fit },
      { label: "Best Practices", value: tips }
    ]);
  }

  function reset() {
    $("fcDigits").value = 3;
    $("cardDigits").value = 5;
    $("fmt").value = "decimal";
    $("bits").value = "26";
    $("pop").value = 500;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();

