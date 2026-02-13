// Reader Type Selector (guidance + simple rules)
(() => {
  const $ = (id) => document.getElementById(id);

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
    const sec = $("sec").value;           // low|med|high
    const cred = $("cred").value;         // card|mobile|pin|multi
    const env = $("env").value;           // indoor|outdoor|harsh
    const throughput = $("throughput").value; // standard|fast|handsfree
    const iface = $("iface").value;       // wg|osdp

    // Interface
    const ifaceRec =
      iface === "osdp"
        ? "OSDP (secure channel + supervision)"
        : "Wiegand (legacy; consider migrating to OSDP)";

    // Credential technology suggestion
    let tech = "13.56 MHz smart card (DESFire-class) reader";
    if (cred === "mobile") tech = "Mobile credential reader (NFC/BLE) with smart-card fallback";
    if (cred === "pin") tech = "Keypad + proximity reader (PIN + card optional)";
    if (cred === "multi") tech = "Multi-factor reader (PIN + smart card / mobile)";

    // Security adjustments
    let secNote = "Standard access.";
    if (sec === "med") secNote = "Prefer encrypted smart credentials + OSDP supervision.";
    if (sec === "high") secNote = "Use encrypted credentials, OSDP secure channel, and consider MFA at sensitive doors.";

    // Throughput adjustments
    let thrNote = "Tap-to-read is fine for typical doors.";
    if (throughput === "fast") thrNote = "High throughput: pick a responsive reader + fast unlock timing; avoid long MFA flows at busy entries.";
    if (throughput === "handsfree") thrNote = "Hands-free: consider long-range / BLE with careful tuning to prevent unintended reads.";

    // Environment adjustments
    let envNote = "Indoor rating is fine.";
    if (env === "outdoor") envNote = "Outdoor: choose IP-rated reader, UV-stable housing, and consider heater/condensation issues.";
    if (env === "harsh") envNote = "Harsh: choose industrial/IP67 rated devices, sealed connectors, and robust mounting.";

    // Bottom-line rec summary
    const bottom = [
      sec === "high" ? "Encrypted smart credentials + OSDP + MFA where needed." :
      sec === "med" ? "Encrypted smart credentials + OSDP preferred." :
      "Smart card or mobile is fine; plan for future upgrade."
    ].join(" ");

    const cautions = [
      "Avoid mixing credential formats without a documented migration plan.",
      "If staying Wiegand: understand it’s not encrypted; cabling can be tapped.",
      "If using mobile: confirm offline/phone-dead fallback behavior.",
      "For high-security: validate end-to-end (credential → reader → panel) supports secure channel and proper key management."
    ].join(" ");

    render([
      { label: "Recommended Interface", value: ifaceRec },
      { label: "Recommended Reader Type", value: tech },
      { label: "Security Guidance", value: secNote },
      { label: "Environment Guidance", value: envNote },
      { label: "Throughput Guidance", value: thrNote },
      { label: "Bottom Line", value: bottom },
      { label: "Cautions", value: cautions }
    ]);
  }

  function reset() {
    $("sec").value = "low";
    $("cred").value = "card";
    $("env").value = "indoor";
    $("throughput").value = "standard";
    $("iface").value = "wg";
    $("results").innerHTML = `<div class="muted">Enter values and press Recommend.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
