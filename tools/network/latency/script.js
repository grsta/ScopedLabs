(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function num(id) {
    const el = $(id);
    if (!el) return NaN;
    const v = Number(el.value);
    return Number.isFinite(v) ? Math.max(0, v) : NaN;
  }

  function fmt(v, d = 0) {
    return Number.isFinite(v) ? v.toFixed(d) : "—";
  }

  function hasStoredAuth() {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
      if (!k) return false;
      const raw = JSON.parse(localStorage.getItem(k));
      return !!(
        raw?.access_token ||
        raw?.currentSession?.access_token ||
        (Array.isArray(raw) ? raw[0]?.access_token : null)
      );
    } catch {
      return false;
    }
  }

  function getUnlockedCategories() {
    try {
      const raw = localStorage.getItem("sl_unlocked_categories");
      if (!raw) return [];
      return raw
        .split(",")
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const locked = $("lockedCard");
    const tool = $("toolCard");

    if (!locked || !tool) return false;

    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      locked.style.display = "none";
      tool.style.display = "";
      return true;
    }

    locked.style.display = "";
    tool.style.display = "none";
    return false;
  }

  function readFlow() {
    try {
      const raw =
        sessionStorage.getItem("pipeline:network") ||
        sessionStorage.getItem("scopedlabs:flow:network");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeFlow(payload) {
    try {
      sessionStorage.setItem("pipeline:network", JSON.stringify(payload));
      sessionStorage.setItem("scopedlabs:flow:network", JSON.stringify(payload));
    } catch {}
  }

  function setFlowNote(text) {
    const note = $("flow-note");
    if (!note) return;
    note.hidden = false;
    note.innerHTML = text;
  }

  function maybePrefillFromOversub() {
    const flow = readFlow();

    if (!flow) {
      setFlowNote("Final step of the Network pipeline. Build a realistic end-to-end latency budget using the transport path you designed upstream.");
      return;
    }

    const coreUtil = Number(flow.coreUtilPct);
    const wanMbps = Number(flow.wanMbps);
    const coreDemand = Number(flow.coreDemandMbps);

    if (Number.isFinite(coreUtil)) {
      if (coreUtil > 90) {
        $("wanMs").value = "70";
        $("bufferMs").value = "40";
      } else if (coreUtil > 75) {
        $("wanMs").value = "55";
        $("bufferMs").value = "30";
      } else {
        $("wanMs").value = "40";
        $("bufferMs").value = "20";
      }
    }

    if (Number.isFinite(coreUtil) && Number.isFinite(wanMbps) && Number.isFinite(coreDemand)) {
      setFlowNote(
        `Step 4 → Using Oversubscription results:<br>
        Core/WAN utilization: <strong>${fmt(coreUtil, 1)}%</strong> |
        Demand: <strong>${fmt(coreDemand, 1)} Mbps</strong> |
        Transport: <strong>${fmt(wanMbps, 1)} Mbps</strong>`
      );
      return;
    }

    setFlowNote("Final step of the Network pipeline. Build a realistic end-to-end latency budget using the transport path you designed upstream.");
  }

  function classify(totalMs, targetMs) {
    if (totalMs <= targetMs) {
      return {
        status: "GOOD — Within target budget",
        cls: "flag-ok",
        recommendation: "The modeled path is within the selected latency target. Validate with real traffic if needed."
      };
    }

    if (totalMs <= targetMs * 1.25) {
      return {
        status: "CAUTION — Slightly above target",
        cls: "flag-warn",
        recommendation: "Usable, but delay may be noticeable in live workflows."
      };
    }

    return {
      status: "WARNING — Above practical target",
      cls: "flag-bad",
      recommendation: "Likely to feel slow. Reduce the dominant stage first."
    };
  }

  function largestStage(stages) {
    return stages.slice().sort((a, b) => b.value - a.value)[0];
  }

  function calculate() {
    const stages = [
      { label: "Source / encode", value: num("encodeMs") },
      { label: "Switching / routing", value: num("switchMs") },
      { label: "Uplink / aggregation", value: num("uplinkMs") },
      { label: "WAN / VPN transport", value: num("wanMs") },
      { label: "Decode / processing", value: num("decodeMs") },
      { label: "Client render", value: num("renderMs") },
      { label: "Jitter buffer / reserve", value: num("bufferMs") }
    ];

    const targetMs = num("targetMs");

    if (stages.some((s) => !Number.isFinite(s.value)) || !Number.isFinite(targetMs)) {
      $("out").innerHTML = `<div class="muted">Enter valid values.</div>`;
      return;
    }

    const totalMs = stages.reduce((sum, s) => sum + s.value, 0);
    const dominant = largestStage(stages);
    const statusPack = classify(totalMs, targetMs);

    const breakdown = stages.map(s => `<li>${s.label}: ${fmt(s.value)} ms</li>`).join("");

    $("out").innerHTML = `
      <div class="muted">
        <div><strong>Total latency:</strong> ${fmt(totalMs)} ms</div>
        <div><strong>Target:</strong> ${fmt(targetMs)} ms</div>
        <div><strong>Status:</strong> <span class="${statusPack.cls}">${statusPack.status}</span></div>
        <div><strong>Largest contributor:</strong> ${dominant.label}</div>
      </div>

      <div class="spacer-md"></div>

      <div class="muted">
        <strong>Recommendation:</strong> ${statusPack.recommendation}
      </div>

      <div class="spacer-md"></div>

      <ul class="muted">${breakdown}</ul>

      <div class="spacer-lg"></div>

      <div class="actions">
        <a class="btn btn-primary" href="/tools/network/">← Return to Network Category</a>
      </div>
    `;

    const flow = readFlow() || {};
    flow.totalLatencyMs = totalMs;
    flow.timestamp = Date.now();
    writeFlow(flow);
  }

  function reset() {
    $("encodeMs").value = 80;
    $("switchMs").value = 5;
    $("uplinkMs").value = 10;
    $("wanMs").value = 40;
    $("decodeMs").value = 60;
    $("renderMs").value = 30;
    $("bufferMs").value = 20;
    $("targetMs").value = 300;

    $("out").innerHTML = '<div class="muted">Run calculation.</div>';
  }

  function init() {
    reset();
    maybePrefillFromOversub();
  }

  window.addEventListener("DOMContentLoaded", () => {
    $("calc")?.addEventListener("click", calculate);
    $("reset")?.addEventListener("click", reset);

    let unlocked = unlockCategoryPage();
    if (unlocked) init();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked) init();
    }, 400);
  });

})();
