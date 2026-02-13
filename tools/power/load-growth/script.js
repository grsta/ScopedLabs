(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function toNum(raw) {
    if (raw === null || raw === undefined) return NaN;
    const s = String(raw).trim().replace(/,/g, "");
    if (s === "") return NaN;
    return Number(s);
  }

  function fmt(n, decimals = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(decimals);
  }

  function showError(msg) {
    const errorCard = $("errorCard");
    const errorText = $("errorText");
    const resultsCard = $("resultsCard");

    // Hide results if there's an error
    if (resultsCard) resultsCard.hidden = true;

    // Show error panel
    if (errorCard) errorCard.hidden = false;
    if (errorText) errorText.textContent = msg;
  }

  function clearError() {
    const errorCard = $("errorCard");
    if (errorCard) errorCard.hidden = true;
  }

  function showResults() {
    const resultsCard = $("resultsCard");
    const errorCard = $("errorCard");

    // ✅ Key behavior: never show error panel when results are shown
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

  function calc() {
    clearTable();

    const baseLoad = toNum($("baseLoad")?.value);
    const growthPct = toNum($("growthPct")?.value);
    const years = Math.floor(toNum($("years")?.value));
    const headroomPct = toNum($("headroomPct")?.value);

    // Validation
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

    // Build year-by-year (Year 0 = current)
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

    // Write results
    const finalLoadEl = $("finalLoad");
    const totalIncreaseEl = $("totalIncrease");
    const recommendedCapacityEl = $("recommendedCapacity");
    const notesEl = $("notes");

    if (finalLoadEl) finalLoadEl.textContent = `${fmt(finalLoad)} kW`;
    if (totalIncreaseEl) totalIncreaseEl.textContent = `${fmt(totalIncrease)} kW (${fmt(totalIncreasePct, 1)}%)`;
    if (recommendedCapacityEl) recommendedCapacityEl.textContent = `${fmt(recommendedCapacity)} kW`;

    const notes = [];
    notes.push(`Model: compound growth (Load × (1 + g)^years).`);
    if (headroom > 0) notes.push(`Headroom applied: ${fmt(headroom, 1)}%.`);
    if (notesEl) notesEl.textContent = notes.join(" ");

    // ✅ Success path: hide error, show results
    clearError();
    showResults();
  }

  function reset() {
    clearTable();
    clearError();

    const ids = ["baseLoad", "growthPct", "years", "headroomPct"];
    ids.forEach((id) => {
      const el = $(id);
      if (el) el.value = "";
    });

    const resultsCard = $("resultsCard");
    if (resultsCard) resultsCard.hidden = true;
  }

  function wire() {
    const btnCalc = $("calc");
    const btnReset = $("reset");

    // If IDs don’t match HTML, fail loudly but cleanly
    if (!btnCalc || !btnReset) {
      showError("Load Growth tool wiring failed: missing #calc or #reset button IDs in the HTML.");
      return;
    }

    btnCalc.addEventListener("click", calc);
    btnReset.addEventListener("click", reset);

    // Enter to calculate
    ["baseLoad", "growthPct", "years", "headroomPct"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          calc();
        }
      });
    });
  }

  // Wire after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
