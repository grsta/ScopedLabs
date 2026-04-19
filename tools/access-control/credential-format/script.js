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
    rows.forEach((r) => {
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
    return Math.pow(10, Math.max(0, d));
  }

  function calc() {
    const fcDigits = Math.max(0, Math.floor(n("fcDigits")));
    const cardDigits = Math.max(1, Math.floor(n("cardDigits")));
    const fmt = $("fmt").value;
    const bits = parseInt($("bits").value, 10);
    const pop = Math.max(0, Math.floor(n("pop")));

    const fcCap = pow10(fcDigits);
    const cardCap = pow10(cardDigits);
    const totalDecimal = fcCap * cardCap;

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

    let interpretation = "";
    if (utilization < 10) {
      interpretation = "This format leaves abundant numbering headroom relative to the expected badge population. Collision pressure is low, and you are less likely to create future migration pain if badge count grows modestly.";
    } else if (utilization < 30) {
      interpretation = "This format still has comfortable remaining capacity. The design should scale reasonably well, although format standardization and clean documentation still matter if multiple sites or tenants are involved.";
    } else if (utilization < 60) {
      interpretation = "This format is workable, but headroom is no longer generous. Growth, tenant separation, or mixed credential populations can consume the remaining numbering space faster than expected.";
    } else if (utilization < 90) {
      interpretation = "This format is entering a tight planning band. You may still deploy it, but future growth and migration flexibility are becoming constrained enough that collisions or numbering overlap deserve attention now.";
    } else {
      interpretation = "This format is effectively overcommitted for the expected badge population. Collision risk or numbering overlap becomes likely enough that a larger or more carefully partitioned format should be considered before rollout.";
    }

    const tips = [
      "Standardize one format across the site to avoid reader/panel interpretation mismatches.",
      "Document the exact format clearly: bit length, facility code range, and card range.",
      "If multi-tenant, partition facility codes intentionally instead of ad hoc growth.",
      "If migrating, plan card translation or dual-format acceptance during the cutover window."
    ].join(" ");

    render([
      { label: "Format Type", value: fmt.toUpperCase() },
      { label: "Badge Population", value: `${pop}` },
      { label: "Decimal Capacity (FC × Card)", value: `${totalDecimal.toLocaleString()} (${fcCap.toLocaleString()} × ${cardCap.toLocaleString()})` },
      { label: "Binary Capacity (approx)", value: `${totalBinary.toLocaleString()} (usable bits ~ ${usableBits})` },
      { label: "Capacity Used", value: `${utilization.toFixed(2)} %` },
      { label: "Assessment", value: fit },
      { label: "Engineering Interpretation", value: interpretation },
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

  [$("fcDigits"), $("cardDigits"), $("fmt"), $("bits"), $("pop")].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", reset);
    el.addEventListener("change", reset);
  });

  reset();
})();

