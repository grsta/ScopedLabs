// MTU & Fragmentation Helper
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
    const mtu = n("mtu");
    const ipver = $("ipver").value; // "4" or "6"
    const l4 = $("l4").value;       // "tcp" or "udp"
    const extra = n("extra");
    const payload = n("payload");

    const ipHdr = ipver === "6" ? 40 : 20;
    const l4Hdr = l4 === "udp" ? 8 : 20;

    const totalHdr = ipHdr + l4Hdr + extra;

    const maxPayload = Math.max(0, mtu - totalHdr);
    const willFragment = payload > maxPayload;

    render([
      { label: "MTU", value: `${mtu.toFixed(0)} bytes` },
      { label: "IP Header", value: `${ipHdr} bytes` },
      { label: "L4 Header", value: `${l4Hdr} bytes (${l4.toUpperCase()})` },
      { label: "Extra Overhead", value: `${extra.toFixed(0)} bytes` },
      { label: "Total Overhead", value: `${totalHdr.toFixed(0)} bytes` },
      { label: "Max Payload (no frag)", value: `${maxPayload.toFixed(0)} bytes` },
      { label: "Test Payload", value: `${payload.toFixed(0)} bytes` },
      { label: "Fragmentation Risk", value: willFragment ? "YES" : "NO" }
    ]);
  }

  function reset() {
    $("mtu").value = 1500;
    $("ipver").value = "4";
    $("l4").value = "tcp";
    $("extra").value = 0;
    $("payload").value = 1400;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
