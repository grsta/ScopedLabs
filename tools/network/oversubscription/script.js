(() => {
  "use strict";

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

  function fmt(v, d = 1) {
    return Number.isFinite(v) ? v.toFixed(d) : "—";
  }

  function fmtMbps(v, d = 1) {
    return Number.isFinite(v) ? `${v.toFixed(d)} Mbps` : "—";
  }

  function fmtRatio(v) {
    return Number.isFinite(v) ? `${v.toFixed(2)} : 1` : "—";
  }

  function setFlowNote(text) {
    const el = $("flow-note");
    if (!el) return;
    el.hidden = false;
    el.innerHTML = text;
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

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const locked = $("lockedCard");
    const tool = $("toolCard");

    if (!locked || !tool) return;

    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      locked.style.display = "none";
      tool.style.display = "";
      return;
    }

    locked.style.display = "";
    tool.style.display = "none";
  }

  function riskLabel(utilPct, targetPct) {
    if (utilPct <= targetPct) {
      return {
        text: "Within target peak utilization band",
        cls: "flag-ok"
      };
    }
    if (utilPct <= 85) {
      return {
        text: "Above target — tight uplink",
        cls: "flag-warn"
      };
    }
    if (utilPct <= 95) {
      return {
        text: "High risk — congestion likely under peak",
        cls: "flag-warn"
      };
    }
    return {
      text: "Redline — saturation risk",
      cls: "flag-bad"
    };
  }

  function maybePrefillFromBandwidth() {
    const flow = readFlow();
    if (!flow) {
      setFlowNote("Step 3 of the Network pipeline. Use this step to test whether peak traffic still fits through access, aggregation, and WAN uplinks with usable headroom.");
      return;
    }

    const peak = Number(flow.bandwidthPeakMbps);
    const uplink = Number(flow.uplinkMbps);

    if (Number.isFinite(peak) && peak > 0) {
      $("coreDemandMbps").value = Math.round(peak);
    }

    if (Number.isFinite(uplink) && uplink > 0) {
      $("wanMbps").value = Math.round(uplink);
      $("edgeUpMbps").value = Math.round(uplink);
    }

    if (Number.isFinite(peak) && peak > 0 && Number.isFinite(uplink) && uplink > 0) {
      setFlowNote(
        `Step 3 → Using Bandwidth results:<br>
        Peak: <strong>${fmt(peak, 1)} Mbps</strong> |
        Uplink: <strong>${fmt(uplink, 1)} Mbps</strong>`
      );
      return;
    }

    setFlowNote("Step 3 of the Network pipeline. Use this step to test whether peak traffic still fits through access, aggregation, and WAN uplinks with usable headroom.");
  }

  function showNextStep(payload) {
    const row = $("next-step-row");
    const btn = $("next-step-btn");
    if (!row || !btn) return;

    if (!payload || !payload.ok) {
      row.style.display = "none";
      return;
    }

    row.style.display = "flex";

    const params = new URLSearchParams({
      peak: String(Math.round(payload.coreDemandMbps || 0)),
      uplink: String(Math.round(payload.wanMbps || 0)),
      util: String(Math.round(payload.coreUtil || 0))
    });

    btn.href = `/tools/network/latency/?${params.toString()}`;
  }

  function calculate() {
    const overheadPct = clamp(num("overheadPct"), 0, 60);
    const overheadMult = 1 + overheadPct / 100;
    const targetUtilPct = clamp(num("targetUtilPct"), 10, 95);

    const edgeDownRaw = Math.max(0, num("edgeDownMbps"));
    const edgeUp = Math.max(0.0001, num("edgeUpMbps"));

    const aggDownRaw = Math.max(0, num("aggDownMbps"));
    const aggUp = Math.max(0.0001, num("aggUpMbps"));

    const coreDemandRaw = Math.max(0, num("coreDemandMbps"));
    const wanMbps = Math.max(0.0001, num("wanMbps"));

    const edgeDown = edgeDownRaw * overheadMult;
    const aggDown = aggDownRaw * overheadMult;
    const coreDemand = coreDemandRaw * overheadMult;

    const edgeRatio = edgeDown / edgeUp;
    const aggRatio = aggDown / aggUp;
    const coreRatio = coreDemand / wanMbps;

    const edgeUtil = edgeRatio * 100;
    const aggUtil = aggRatio * 100;
    const coreUtil = coreRatio * 100;

    const safeEdgeCap = edgeUp * (targetUtilPct / 100);
    const safeAggCap = aggUp * (targetUtilPct / 100);
    const safeCoreCap = wanMbps * (targetUtilPct / 100);

    const edgeHeadroom = safeEdgeCap - edgeDown;
    const aggHeadroom = safeAggCap - aggDown;
    const coreHeadroom = safeCoreCap - coreDemand;

    const edgeRisk = riskLabel(edgeUtil, targetUtilPct);
    const aggRisk = riskLabel(aggUtil, targetUtilPct);
    const coreRisk = riskLabel(coreUtil, targetUtilPct);

    const out = $("out");
    if (out) {
      out.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:.6rem; align-items:center;">
          <span class="pill">Overhead: +${fmt(overheadPct, 0)}%</span>
          <span class="pill">Target peak util: ${fmt(targetUtilPct, 0)}%</span>
        </div>

        <div class="spacer-md"></div>

        <div class="card" style="background:rgba(0,0,0,.12);">
          <div class="muted" style="line-height:1.65;">
            <div><strong>Access layer</strong></div>
            <div>Oversub ratio: <strong>${fmtRatio(edgeRatio)}</strong></div>
            <div>Peak utilization: <strong>${fmt(edgeUtil, 1)}%</strong> — <span class="${edgeRisk.cls}">${edgeRisk.text}</span></div>
            <div>Headroom at target band: <strong>${fmtMbps(edgeHeadroom, 1)}</strong></div>
          </div>
        </div>

        <div class="spacer-md"></div>

        <div class="card" style="background:rgba(0,0,0,.12);">
          <div class="muted" style="line-height:1.65;">
            <div><strong>Aggregation layer</strong></div>
            <div>Oversub ratio: <strong>${fmtRatio(aggRatio)}</strong></div>
            <div>Peak utilization: <strong>${fmt(aggUtil, 1)}%</strong> — <span class="${aggRisk.cls}">${aggRisk.text}</span></div>
            <div>Headroom at target band: <strong>${fmtMbps(aggHeadroom, 1)}</strong></div>
          </div>
        </div>

        <div class="spacer-md"></div>

        <div class="card" style="background:rgba(0,0,0,.12);">
          <div class="muted" style="line-height:1.65;">
            <div><strong>Core / WAN boundary</strong></div>
            <div>Demand-to-transport ratio: <strong>${fmtRatio(coreRatio)}</strong></div>
            <div>Peak utilization: <strong>${fmt(coreUtil, 1)}%</strong> — <span class="${coreRisk.cls}">${coreRisk.text}</span></div>
            <div>Headroom at target band: <strong>${fmtMbps(coreHeadroom, 1)}</strong></div>
          </div>
        </div>

        <div class="spacer-md"></div>

        <div class="muted" style="font-size:.95rem; line-height:1.55;">
          <strong>Engineering take:</strong>
          Oversubscription ratio alone is not the whole story. The real risk is whether peak demand still fits within transport capacity while preserving enough room for burst traffic, retries, and growth.
          <ul class="muted" style="margin:.4rem 0 0 1.15rem;">
            <li>Access: check whether edge demand can realistically exit the switch without queueing under burst conditions.</li>
            <li>Aggregation: high concentration here can turn several “fine” access switches into one congested upstream path.</li>
            <li>Core/WAN: use Bandwidth Planner peak values here whenever possible.</li>
          </ul>
        </div>
      `;
    }

    const payload = {
      ok: true,
      category: "network",
      tool: "oversubscription",
      step: "oversubscription",
      lane: "v1",
      edgeUtil,
      aggUtil,
      coreUtil,
      coreDemandMbps: coreDemand,
      wanMbps,
      targetUtilPct,
      timestamp: Date.now()
    };

    const flow = readFlow() || {};
    flow.category = "network";
    flow.tool = "oversubscription";
    flow.step = "oversubscription";
    flow.lane = "v1";
    flow.edgeUtilPct = edgeUtil;
    flow.aggUtilPct = aggUtil;
    flow.coreUtilPct = coreUtil;
    flow.coreDemandMbps = coreDemand;
    flow.wanMbps = wanMbps;
    flow.targetUtilPct = targetUtilPct;
    flow.timestamp = Date.now();

    writeFlow(flow);
    showNextStep(payload);
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

    const out = $("out");
    if (out) {
      out.innerHTML = `<div class="muted">Run the estimator to see oversubscription ratios, congestion risk, and carried-forward demand context.</div>`;
    }

    showNextStep(null);
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();

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

    if ($("toolCard") && $("toolCard").style.display !== "none") {
      reset();
      maybePrefillFromBandwidth();
    }
  });
})();