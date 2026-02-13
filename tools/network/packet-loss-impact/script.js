// Packet Loss Impact (simple, practical model)
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

  function fmt(x, d = 2) {
    if (!Number.isFinite(x)) return "—";
    const y = Math.abs(x) < 1e-9 ? 0 : x;
    return y.toFixed(d);
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

  function qualityLabel(traffic, lossPct, proto) {
    // practical rule-of-thumb thresholds
    // Voice is most sensitive; video next; data least.
    const L = lossPct;

    if (proto === "udp") {
      if (traffic === "voice") {
        if (L <= 0.3) return "Good";
        if (L <= 1.0) return "Degraded";
        return "Poor";
      }
      if (traffic === "video") {
        if (L <= 0.5) return "Good";
        if (L <= 2.0) return "Degraded";
        return "Poor";
      }
      // data over UDP is uncommon; treat moderate
      if (L <= 1.0) return "Good";
      if (L <= 3.0) return "Degraded";
      return "Poor";
    }

    // TCP hides loss via retransmit, but throughput and latency suffer.
    if (traffic === "voice") {
      if (L <= 0.1) return "Good";
      if (L <= 0.5) return "Degraded (retransmit delay)";
      return "Poor (retransmit delay)";
    }
    if (traffic === "video") {
      if (L <= 0.2) return "Good";
      if (L <= 1.0) return "Degraded (buffering)";
      return "Poor (buffering)";
    }
    // data
    if (L <= 1.0) return "Good";
    if (L <= 3.0) return "Degraded";
    return "Poor";
  }

  function guidance(traffic, lossPct, proto) {
    const L = lossPct;

    const tips = [];
    if (L >= 1.0) tips.push("Check cabling/terminations, duplex mismatches, Wi-Fi RSSI/SNR, and switch port errors.");
    if (proto === "udp" && L >= 0.5) tips.push("Real-time streams: prioritize QoS, reduce bitrate, or move to wired backhaul.");
    if (proto === "tcp" && L >= 0.5) tips.push("TCP: expect retransmits; improve link quality or reduce congestion (queueing/bufferbloat).");
    if (traffic === "voice" && L >= 0.3) tips.push("Voice: target ≤0.3% loss for clean calls.");
    if (traffic === "video" && L >= 0.5) tips.push("Video: target ≤0.5% loss to avoid visible artifacts/buffering.");
    if (tips.length === 0) tips.push("Loss level is generally acceptable; keep monitoring during peak load.");

    return tips.join(" ");
  }

  function calc() {
    const baseline = n("baseline");        // Mbps
    let lossPct = n("lossPct");            // %
    const rttMs = n("rtt");                // ms
    const traffic = $("traffic").value;    // voice|video|data
    const proto = $("proto").value;        // tcp|udp

    lossPct = clamp(lossPct, 0, 100);
    const loss = lossPct / 100;

    if (baseline <= 0) {
      render([{ label: "Error", value: "Enter a Baseline Throughput (Mbps) > 0" }]);
      return;
    }

    // Delivered throughput:
    // UDP: delivered ≈ baseline * (1-loss) (loss shows up as missing packets/artifacts)
    // TCP: delivered "goodput" suffers more than (1-loss) due to retransmit + RTT penalty.
    // Simple penalty factor: 1 / (1 + loss * (RTT/1000) * K)
    // K tuned to be gentle at small loss, meaningful at higher loss/RTT.
    const K = 6.0;

    let delivered;
    if (proto === "udp") {
      delivered = baseline * (1 - loss);
    } else {
      const penalty = 1 / (1 + loss * (rttMs / 1000) * K);
      delivered = baseline * (1 - loss) * penalty;
    }

    delivered = Math.max(0, delivered);
    const lostMbps = Math.max(0, baseline - delivered);

    const q = qualityLabel(traffic, lossPct, proto);
    const note = guidance(traffic, lossPct, proto);

    render([
      { label: "Baseline Throughput", value: `${fmt(baseline, 2)} Mbps` },
      { label: "Packet Loss", value: `${fmt(lossPct, 2)} %` },
      { label: "RTT", value: `${fmt(rttMs, 0)} ms` },
      { label: "Protocol", value: proto.toUpperCase() },
      { label: "Traffic Type", value: traffic.toUpperCase() },

      { label: "Estimated Delivered", value: `${fmt(delivered, 2)} Mbps` },
      { label: "Estimated Loss Impact", value: `${fmt(lostMbps, 2)} Mbps` },
      { label: "Experience Risk", value: q },

      { label: "Guidance", value: note }
    ]);
  }

  function reset() {
    $("baseline").value = 100;
    $("lossPct").value = 1;
    $("rtt").value = 30;
    $("traffic").value = "video";
    $("proto").value = "tcp";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();

