/* PoE Budget tool — lightweight planner math
   (Not controller simulation; just quick field-sizing.)
*/
(function () {
  const $ = (id) => document.getElementById(id);

  function num(id) {
    const el = $(id);
    if (!el) return NaN;
    const v = Number(el.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function fmtW(x) {
    if (!Number.isFinite(x)) return "—";
    return `${x.toFixed(1)} W`;
  }

  function fmtPct(x) {
    if (!Number.isFinite(x)) return "—";
    return `${x.toFixed(1)}%`;
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function calc() {
    const poeBudgetW = num("poeBudgetW");
    const marginPct = num("marginPct");

    const camsCount = num("camsCount");
    const camsW = num("camsW");

    const apsCount = num("apsCount");
    const apsW = num("apsW");

    const phonesCount = num("phonesCount");
    const phonesW = num("phonesW");

    const otherCount = num("otherCount");
    const otherW = num("otherW");

    const required = [poeBudgetW, marginPct, camsCount, camsW, apsCount, apsW, phonesCount, phonesW, otherCount, otherW];
    if (required.some((v) => !Number.isFinite(v) || v < 0)) {
      setText("statusText", "Enter valid non-negative values.");
      setText("totalDrawW", "—");
      setText("safeBudgetW", "—");
      setText("headroomW", "—");
      setText("utilPct", "—");
      return;
    }

    const totalDraw =
      (camsCount * camsW) +
      (apsCount * apsW) +
      (phonesCount * phonesW) +
      (otherCount * otherW);

    const safeBudget = poeBudgetW * (1 - (marginPct / 100));
    const headroom = safeBudget - totalDraw;
    const util = poeBudgetW > 0 ? (totalDraw / poeBudgetW) * 100 : NaN;

    setText("totalDrawW", fmtW(totalDraw));
    setText("safeBudgetW", fmtW(safeBudget));
    setText("headroomW", fmtW(headroom));
    setText("utilPct", fmtPct(util));

    let status = "OK: budget headroom looks good.";
    if (poeBudgetW <= 0) status = "Enter a PoE budget above 0W.";
    else if (headroom < 0) status = "FAIL: estimated draw exceeds safe budget (after margin).";
    else if (headroom < poeBudgetW * 0.10) status = "Warning: low headroom — consider higher budget or fewer loads.";
    else if (util > 80) status = "Warning: high utilization — spikes may bite you.";

    setText("statusText", status);
  }

  function reset() {
    // Defaults match the HTML values above — keep them consistent.
    $("poeBudgetW").value = 370;
    $("marginPct").value = 20;
    $("poeStandard").value = "at";
    $("poePorts").value = 16;

    $("camsCount").value = 12;
    $("camsW").value = 12;

    $("apsCount").value = 2;
    $("apsW").value = 15;

    $("phonesCount").value = 0;
    $("phonesW").value = 5;

    $("otherCount").value = 0;
    $("otherW").value = 10;

    setText("totalDrawW", "—");
    setText("safeBudgetW", "—");
    setText("headroomW", "—");
    setText("utilPct", "—");
    setText("statusText", "Enter values and calculate.");
  }

  window.addEventListener("DOMContentLoaded", () => {
    const calcBtn = $("calc");
    const resetBtn = $("reset");

    if (calcBtn) calcBtn.addEventListener("click", calc);
    if (resetBtn) resetBtn.addEventListener("click", reset);
  });
})();
