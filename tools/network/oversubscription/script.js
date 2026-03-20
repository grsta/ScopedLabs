(() => {
  "use strict";

  // =========================
  // HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);

  const num = (id) => {
    const el = $(id);
    if (!el) return NaN;
    const v = Number(el.value);
    return Number.isFinite(v) ? v : NaN;
  };

  const fmt = (v, d = 1) =>
    Number.isFinite(v) ? v.toFixed(d) : "—";

  // =========================
  // PIPELINE HELPERS
  // =========================
  function readFlow() {
    try {
      const raw = sessionStorage.getItem("pipeline:network");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveFlow(payload) {
    sessionStorage.setItem(
      "pipeline:network",
      JSON.stringify(payload)
    );
  }

  function setFlowNote(text) {
    const el = $("flow-note");
    if (!el) return;
    el.style.display = "block";
    el.innerHTML = text;
  }

  function showNext(payload) {
    const row = $("next-step-row");
    const btn = $("next-step-btn");
    if (!row || !btn) return;

    if (!payload) {
      row.style.display = "none";
      return;
    }

    row.style.display = "block";

    btn.href =
      "/tools/network/latency/?" +
      new URLSearchParams({
        peak: payload.bandwidthPeakMbps || "",
        avg: payload.bandwidthAvgMbps || "",
        uplink: payload.uplinkMbps || ""
      }).toString();
  }

  // =========================
  // PREFILL FROM BANDWIDTH
  // =========================
  function prefillFromBandwidth() {
    const flow = readFlow();
    if (!flow || flow.category !== "network") return;

    if (flow.bandwidthPeakMbps) {
      $("coreDemandMbps").value = Math.round(flow.bandwidthPeakMbps);
    }

    if (flow.uplinkMbps) {
      $("wanMbps").value = Math.round(flow.uplinkMbps);
    }

    setFlowNote(
      `Step 3 → Using Bandwidth results:<br>
      Peak: <strong>${fmt(flow.bandwidthPeakMbps)} Mbps</strong> |
      Uplink: <strong>${fmt(flow.uplinkMbps)} Mbps</strong>`
    );
  }

  // =========================
  // CALC LOGIC
  // =========================
  function calculate() {
    const overheadPct = num("overheadPct") || 0;
    const targetUtilPct = num("targetUtilPct") || 70;

    const overheadMult = 1 + overheadPct / 100;

    const edgeDown = num("edgeDownMbps") * overheadMult;
    const edgeUp = num("edgeUpMbps");

    const aggDown = num("aggDownMbps") * overheadMult;
    const aggUp = num("aggUpMbps");

    const coreDemand = num("coreDemandMbps") * overheadMult;
    const wan = num("wanMbps");

    const edgeUtil = (edgeDown / edgeUp) * 100;
    const aggUtil = (aggDown / aggUp) * 100;
    const coreUtil = (coreDemand / wan) * 100;

    const out = $("out");

    out.innerHTML = `
      <div class="card">
        <strong>Access Layer</strong><br>
        Utilization: ${fmt(edgeUtil)}%
      </div>

      <div class="card">
        <strong>Aggregation Layer</strong><br>
        Utilization: ${fmt(aggUtil)}%
      </div>

      <div class="card">
        <strong>Core / WAN</strong><br>
        Utilization: ${fmt(coreUtil)}%
      </div>
    `;

    // =========================
    // SAVE TO PIPELINE
    // =========================
    const payload = {
      ok: true,
      category: "network",
      step: "oversubscription",

      bandwidthPeakMbps: coreDemand,
      bandwidthAvgMbps: aggDown,
      uplinkMbps: wan,

      utilEdge: edgeUtil,
      utilAgg: aggUtil,
      utilCore: coreUtil,

      timestamp: Date.now()
    };

    saveFlow(payload);
    showNext(payload);
  }

  function reset() {
    $("edgeDownMbps").value = "2400";
    $("edgeUpMbps").value = "1000";
    $("aggDownMbps").value = "8000";
    $("aggUpMbps").value = "2000";
    $("coreDemandMbps").value = "1200";
    $("wanMbps").value = "1000";
    $("overheadPct").value = "15";
    $("targetUtilPct").value = "70";

    $("out").innerHTML =
      '<div class="muted">Run the estimator to see results.</div>';

    showNext(null);
  }

  // =========================
  // INIT
  // =========================
  window.addEventListener("DOMContentLoaded", () => {
    $("calc").addEventListener("click", calculate);
    $("reset").addEventListener("click", reset);

    prefillFromBandwidth();
    showNext(null);
  });
})();