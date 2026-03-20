(() => {
  const $ = (id) => document.getElementById(id);

  function num(id) {
    const el = $(id);
    if (!el) return NaN;
    const v = Number(el.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function fmtMbps(x) {
    if (!Number.isFinite(x)) return "—";
    return `${x.toFixed(2)} Mbps`;
  }

  function fmtPct(x) {
    if (!Number.isFinite(x)) return "—";
    return `${x.toFixed(1)}%`;
  }

  function setFlowNote(text) {
    const note = $("flow-note");
    if (!note) return;
    note.hidden = false;
    note.textContent = text;
  }

  function readFlow() {
    try {
      const raw =
        sessionStorage.getItem("pipeline:network") ||
        sessionStorage.getItem("scopedlabs:flow:network");
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeFlow(payload) {
    try {
      sessionStorage.setItem("pipeline:network", JSON.stringify(payload));
      sessionStorage.setItem("scopedlabs:flow:network", JSON.stringify(payload));
    } catch (_) {
      // ignore storage issues
    }
  }

  function buildRows(rows) {
    return rows.map((row) => {
      const cls = row.className ? ` ${row.className}` : "";
      return `
        <div class="result-row">
          <div class="k">${row.label}</div>
          <div class="v${cls}">${row.value}</div>
        </div>
      `;
    }).join("");
  }

  function classify(utilPeak, recUplink, uplinkMbps) {
    if (utilPeak > 100) {
      return {
        status: "FAIL — Peak demand exceeds uplink",
        statusClass: "flag-bad",
        interpretation: "Projected peak traffic exceeds the available uplink capacity. This design is congestion-prone and may drop or delay traffic under burst conditions.",
        recommendation: "Increase uplink capacity, segment traffic, or reduce modeled demand before deployment."
      };
    }

    if (utilPeak > 85) {
      return {
        status: "WARNING — Very high peak utilization",
        statusClass: "flag-warn",
        interpretation: "Peak conditions place the uplink near saturation. The network may still function, but margin for burst traffic, retries, and future growth is very thin.",
        recommendation: "Review uplink sizing now and consider moving to a larger uplink before additional devices are added."
      };
    }

    if (utilPeak > 70) {
      return {
        status: "CAUTION — Usable but getting tight",
        statusClass: "flag-warn",
        interpretation: "Peak demand stays inside the link, but the design is trending toward the upper end of a comfortable operating band.",
        recommendation: "Validate assumptions carefully and consider whether growth or failover events could push this design beyond target utilization."
      };
    }

    return {
      status: "GOOD — Capacity margin looks healthy",
      statusClass: "flag-ok",
      interpretation: "The modeled uplink appears to retain usable headroom under the selected average, peak, and overhead assumptions.",
      recommendation: "Proceed with this design, then continue into Oversubscription to validate how aggregation behaves when multiple uplinks are combined."
    };
  }

  function maybePrefillFromPoe() {
    const flow = readFlow();
    if (!flow) {
      setFlowNote("This is step 2 of the Network pipeline. After confirming edge power, estimate the traffic those devices place on the network.");
      return;
    }

    const poweredDevices = Number(flow.poweredDevices);
    if (Number.isFinite(poweredDevices) && poweredDevices > 0) {
      $("devices").value = String(poweredDevices);
      setFlowNote(`Step 1 carried forward ${poweredDevices} powered devices from PoE Budget. Adjust here if only a portion of them contribute meaningful traffic at the same time.`);
      return;
    }

    setFlowNote("This is step 2 of the Network pipeline. Estimate average and peak traffic before validating aggregation behavior.");
  }

  function calculateBandwidth() {
    const devices = num("devices");
    const bitrate = num("bitrate");
    const peakFactor = num("peakFactor");
    const overheadPct = num("overheadPct");
    const otherTraffic = num("otherTraffic");
    const uplinkMbps = num("uplinkMbps");
    const safeUtil = clamp(num("safeUtil"), 1, 99);

    const required = [devices, bitrate, peakFactor, overheadPct, otherTraffic, uplinkMbps, safeUtil];

    if (required.some((v) => !Number.isFinite(v))) {
      return { ok: false, message: "Enter valid numeric values." };
    }

    if (devices <= 0) {
      return { ok: false, message: "Active streams / devices must be greater than 0." };
    }

    if (bitrate < 0) {
      return { ok: false, message: "Average Mbps per stream / device cannot be negative." };
    }

    if (peakFactor < 1) {
      return { ok: false, message: "Peak factor must be at least 1." };
    }

    if (overheadPct < 0) {
      return { ok: false, message: "Protocol overhead cannot be negative." };
    }

    if (otherTraffic < 0) {
      return { ok: false, message: "Other traffic allowance cannot be negative." };
    }

    if (uplinkMbps <= 0) {
      return { ok: false, message: "Current uplink capacity must be greater than 0 Mbps." };
    }

    const overheadMult = 1 + (overheadPct / 100);

    const avgStream = devices * bitrate;
    const peakStream = avgStream * peakFactor;

    const avgWithOverhead = avgStream * overheadMult;
    const peakWithOverhead = peakStream * overheadMult;

    const avgTotal = avgWithOverhead + otherTraffic;
    const peakTotal = peakWithOverhead + otherTraffic;

    const utilAvg = (avgTotal / uplinkMbps) * 100;
    const utilPeak = (peakTotal / uplinkMbps) * 100;

    const recUplink = peakTotal / (safeUtil / 100);

    const statusPack = classify(utilPeak, recUplink, uplinkMbps);

    let engineeringTake = `Average modeled demand is ${fmtMbps(avgTotal)}, while peak modeled demand reaches ${fmtMbps(peakTotal)} against a ${fmtMbps(uplinkMbps)} uplink.`;

    if (utilPeak > safeUtil) {
      engineeringTake += ` Peak demand exceeds your preferred ${safeUtil.toFixed(0)}% operating target, so the current uplink does not preserve your desired headroom.`;
    } else {
      engineeringTake += ` Peak demand remains inside your preferred ${safeUtil.toFixed(0)}% operating target, so the current uplink is still aligned with your selected headroom policy.`;
    }

    return {
      ok: true,
      devices,
      bitrate,
      peakFactor,
      overheadPct,
      otherTraffic,
      uplinkMbps,
      safeUtil,
      avgStream,
      peakStream,
      avgTotal,
      peakTotal,
      utilAvg,
      utilPeak,
      recUplink,
      ...statusPack,
      engineeringTake
    };
  }

  function renderResults(data) {
    const results = $("results");
    if (!results) return;

    if (!data.ok) {
      results.innerHTML = `<div class="muted">${data.message}</div>`;
      return;
    }

    results.innerHTML = buildRows([
      { label: "Average modeled traffic", value: fmtMbps(data.avgStream) },
      { label: "Peak modeled traffic", value: fmtMbps(data.peakStream) },
      { label: "Average total incl. overhead + other traffic", value: fmtMbps(data.avgTotal) },
      { label: "Peak total incl. overhead + other traffic", value: fmtMbps(data.peakTotal) },
      { label: "Uplink utilization (average)", value: fmtPct(data.utilAvg) },
      { label: "Uplink utilization (peak)", value: fmtPct(data.utilPeak) },
      { label: "Recommended uplink at target utilization", value: fmtMbps(data.recUplink) },
      { label: "Status", value: data.status, className: data.statusClass },
      { label: "What this means", value: data.interpretation },
      { label: "Engineering take", value: data.engineeringTake },
      { label: "Recommendation", value: data.recommendation }
    ]);
  }

  function saveToPipeline(data) {
    if (!data.ok) return;

    const flow = readFlow() || {};

    flow.category = "network";
    flow.tool = "bandwidth";
    flow.step = "bandwidth";
    flow.lane = "v1";
    flow.bandwidthAvgMbps = data.avgTotal;
    flow.bandwidthPeakMbps = data.peakTotal;
    flow.bandwidthPeakUtilPct = data.utilPeak;
    flow.uplinkMbps = data.uplinkMbps;
    flow.recUplinkMbps = data.recUplink;
    flow.modeledDevices = data.devices;
    flow.timestamp = Date.now();

    writeFlow(flow);
  }

  function showNextStep(data) {
    const row = $("next-step-row");
    if (!row) return;
    row.style.display = data && data.ok ? "flex" : "none";
  }

  function calculate() {
    const data = calculateBandwidth();
    renderResults(data);
    saveToPipeline(data);
    showNextStep(data);
  }

  function reset() {
    $("devices").value = "16";
    $("bitrate").value = "4";
    $("peakFactor").value = "1.5";
    $("overheadPct").value = "12";
    $("otherTraffic").value = "25";
    $("uplinkMbps").value = "1000";
    $("safeUtil").value = "70";

    const results = $("results");
    if (results) {
      results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }

    showNextStep(null);
  }

  window.addEventListener("DOMContentLoaded", () => {
    const calcBtn = $("calc");
    const resetBtn = $("reset");

    if (calcBtn) calcBtn.addEventListener("click", calculate);
    if (resetBtn) resetBtn.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
          e.preventDefault();
          calculate();
        }
      }
    });

    maybePrefillFromPoe();
    reset();
  });
})();
