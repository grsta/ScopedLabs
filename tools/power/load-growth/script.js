(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let lastResult = null;

  function toNum(raw) {
    if (raw === null || raw === undefined) return NaN;
    const s = String(raw).trim().replace(/,/g, "");
    if (s === "") return NaN;
    return Number(s);
  }

  function fmt(n, decimals = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function showError(msg) {
    const errorCard = $("errorCard");
    const errorText = $("errorText");
    const resultsCard = $("resultsCard");

    if (resultsCard) resultsCard.hidden = true;
    if (errorCard) errorCard.hidden = false;
    if (errorText) errorText.textContent = msg;

    lastResult = null;
  }

  function clearError() {
    const errorCard = $("errorCard");
    if (errorCard) errorCard.hidden = true;
  }

  function showResults() {
    const resultsCard = $("resultsCard");
    const errorCard = $("errorCard");

    if (errorCard) errorCard.hidden = true;
    if (resultsCard) resultsCard.hidden = false;
  }

  function clearTable() {
    const tbody = document.querySelector("#yearTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
  }

  function addRow(year, projected, delta, deltaPct) {
    const tbody = document.querySelector("#yearTable tbody");
    if (!tbody) return;

    const tr = document.createElement("tr");

    const tdYear = document.createElement("td");
    tdYear.textContent = String(year);

    const tdProj = document.createElement("td");
    tdProj.textContent = `${fmt(projected)} kW`;

    const tdDelta = document.createElement("td");
    tdDelta.textContent = `${fmt(delta)} kW`;

    const tdPct = document.createElement("td");
    tdPct.textContent = `${fmt(deltaPct, 1)}%`;

    tr.appendChild(tdYear);
    tr.appendChild(tdProj);
    tr.appendChild(tdDelta);
    tr.appendChild(tdPct);

    tbody.appendChild(tr);
  }

  function readPipelineInput() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      return parsed;
    } catch (err) {
      console.warn("Could not read pipeline payload:", err);
      return null;
    }
  }

  function savePipelineResult(payload) {
    try {
      const wrapped = {
        category: "power",
        step: "load-growth",
        ts: Date.now(),
        data: payload,
      };
      sessionStorage.setItem(FLOW_KEY, JSON.stringify(wrapped));
    } catch (err) {
      console.warn("Could not save pipeline payload:", err);
    }
  }

  function invalidatePipelineResult() {
    lastResult = null;
    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.category === "power" && parsed.step === "load-growth") {
        sessionStorage.removeItem(FLOW_KEY);
      }
    } catch (err) {
      console.warn("Could not invalidate pipeline payload:", err);
    }
  }

  function prefillFromPipeline() {
    const incoming = readPipelineInput();
    if (!incoming || incoming.category !== "power") return;

    const data = incoming.data || {};
    const baseLoad = $("baseLoad");
    const notesEl = $("notes");

    if (
      baseLoad &&
      (!baseLoad.value || String(baseLoad.value).trim() === "") &&
      Number.isFinite(Number(data.baseLoadKw))
    ) {
      baseLoad.value = Number(data.baseLoadKw).toFixed(3);
    }

    if (notesEl && incoming.step === "va-watts-amps") {
      const msg = [
        "Imported prior result from VA / Watts / Amps.",
        Number.isFinite(Number(data.watts))
          ? `Starting load: ${fmt(Number(data.watts), 0)} W (${fmt(Number(data.baseLoadKw), 3)} kW).`
          : null,
        Number.isFinite(Number(data.designWatts20))
          ? `20% growth-planning reference from prior step: ${fmt(Number(data.designWatts20), 0)} W.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");

      notesEl.textContent = msg;
    }
  }

  function calc() {
    clearTable();

    const baseLoad = toNum($("baseLoad")?.value);      // kW
    const growthPct = toNum($("growthPct")?.value);    // %
    const years = Math.floor(toNum($("years")?.value));
    const headroomPct = toNum($("headroomPct")?.value);

    if (!Number.isFinite(baseLoad) || baseLoad < 0) {
      return showError("Enter a valid Current Load (kW). Example: 12.5");
    }

    if (!Number.isFinite(growthPct) || growthPct < 0) {
      return showError("Enter a valid Annual Growth (%). Example: 6");
    }

    if (!Number.isFinite(years) || years < 1 || years > 50) {
      return showError("Enter a valid Time Horizon (Years) between 1 and 50.");
    }

    const headroom = Number.isFinite(headroomPct) && headroomPct >= 0 ? headroomPct : 0;

    const g = growthPct / 100;
    const h = headroom / 100;

    addRow(0, baseLoad, 0, 0);

    for (let y = 1; y <= years; y++) {
      const projected = baseLoad * Math.pow(1 + g, y);
      const delta = projected - baseLoad;
      const deltaPct = baseLoad === 0 ? 0 : (delta / baseLoad) * 100;
      addRow(y, projected, delta, deltaPct);
    }

    const finalLoad = baseLoad * Math.pow(1 + g, years);
    const totalIncrease = finalLoad - baseLoad;
    const totalIncreasePct = baseLoad === 0 ? 0 : (totalIncrease / baseLoad) * 100;
    const recommendedCapacity = finalLoad * (1 + h);

    // Added engineering-oriented values
    const baseLoadWatts = baseLoad * 1000;
    const finalLoadWatts = finalLoad * 1000;
    const recommendedCapacityWatts = recommendedCapacity * 1000;
    const averageAnnualAddedKw = years > 0 ? totalIncrease / years : 0;
    const averageAnnualAddedWatts = averageAnnualAddedKw * 1000;
    const threeYearCheck = baseLoad * Math.pow(1 + g, Math.min(3, years));
    const fiveYearCheck = baseLoad * Math.pow(1 + g, Math.min(5, years));
    const continuousDesignKw = recommendedCapacity * 1.25;
    const continuousDesignWatts = continuousDesignKw * 1000;

    const finalLoadEl = $("finalLoad");
    const totalIncreaseEl = $("totalIncrease");
    const recommendedCapacityEl = $("recommendedCapacity");
    const notesEl = $("notes");

    if (finalLoadEl) finalLoadEl.textContent = `${fmt(finalLoad)} kW`;
    if (totalIncreaseEl) {
      totalIncreaseEl.textContent = `${fmt(totalIncrease)} kW (${fmt(totalIncreasePct, 1)}%)`;
    }
    if (recommendedCapacityEl) {
      recommendedCapacityEl.textContent = `${fmt(recommendedCapacity)} kW`;
    }

    const notes = [];
    notes.push(`Model: compound growth (Load × (1 + g)^years).`);
    notes.push(`Average added load: ${fmt(averageAnnualAddedKw)} kW/year.`);
    notes.push(`3-year check: ${fmt(threeYearCheck)} kW. 5-year check: ${fmt(fiveYearCheck)} kW.`);

    if (headroom > 0) {
      notes.push(`Headroom applied: ${fmt(headroom, 1)}%.`);
    }

    notes.push(
      `Engineering planning note: the recommended capacity is ${fmt(
        recommendedCapacity
      )} kW, while a more conservative 125% continuous-design reference would be about ${fmt(
        continuousDesignKw
      )} kW.`
    );

    if (growthPct >= 10) {
      notes.push(
        `Growth is aggressive. Consider sizing upstream power and UPS infrastructure to the recommended value rather than today's connected load.`
      );
    } else if (growthPct > 0) {
      notes.push(
        `Moderate growth assumed. This is suitable for phased expansion planning if the deployment is expected to grow over time.`
      );
    } else {
      notes.push(
        `No annual growth was applied. This is a static-load assumption and may undersize future expansion if field scope increases later.`
      );
    }

    if (notesEl) notesEl.textContent = notes.join(" ");

    lastResult = {
      baseLoadKw: baseLoad,
      baseLoadWatts,
      growthPct,
      years,
      headroomPct: headroom,
      finalLoadKw: finalLoad,
      finalLoadWatts,
      totalIncreaseKw: totalIncrease,
      totalIncreasePct,
      recommendedCapacityKw: recommendedCapacity,
      recommendedCapacityWatts,
      averageAnnualAddedKw,
      averageAnnualAddedWatts,
      threeYearCheckKw: threeYearCheck,
      fiveYearCheckKw: fiveYearCheck,
      continuousDesignKw,
      continuousDesignWatts,
      designLoadWatts: recommendedCapacityWatts,
    };

    savePipelineResult(lastResult);
    clearError();
    showResults();
  }

  function reset() {
    clearTable();
    clearError();
    invalidatePipelineResult();

    const ids = ["baseLoad", "growthPct", "years", "headroomPct"];
    ids.forEach((id) => {
      const el = $(id);
      if (el) el.value = "";
    });

    const resultsCard = $("resultsCard");
    if (resultsCard) resultsCard.hidden = true;

    const notesEl = $("notes");
    if (notesEl) notesEl.textContent = "";
  }

  function wire() {
    const btnCalc = $("calc");
    const btnReset = $("reset");

    if (!btnCalc || !btnReset) {
      showError("Load Growth tool wiring failed: missing #calc or #reset button IDs in the HTML.");
      return;
    }

    btnCalc.addEventListener("click", calc);
    btnReset.addEventListener("click", reset);

    ["baseLoad", "growthPct", "years", "headroomPct"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          calc();
        }
      });

      el.addEventListener("input", invalidatePipelineResult);
    });

    prefillFromPipeline();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
