(function () {
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

  function fmtW(x) {
    if (!Number.isFinite(x)) return "—";
    return `${x.toFixed(1)} W`;
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
      // ignore storage errors
    }
  }

  function buildRows(rows) {
    return rows
      .map((row) => {
        const cls = row.className ? ` ${row.className}` : "";
        return `
          <div class="result-row">
            <div class="k">${row.label}</div>
            <div class="v${cls}">${row.value}</div>
          </div>
        `;
      })
      .join("");
  }

  function calculatePoeLoad() {
    const poeBudgetW = num("poeBudgetW");
    const marginPct = clamp(num("marginPct"), 0, 80);
    const poePorts = Math.max(0, Math.floor(num("poePorts")));

    const camsCount = Math.max(0, Math.floor(num("camsCount")));
    const camsW = Math.max(0, num("camsW"));

    const apsCount = Math.max(0, Math.floor(num("apsCount")));
    const apsW = Math.max(0, num("apsW"));

    const phonesCount = Math.max(0, Math.floor(num("phonesCount")));
    const phonesW = Math.max(0, num("phonesW"));

    const otherCount = Math.max(0, Math.floor(num("otherCount")));
    const otherW = Math.max(0, num("otherW"));

    const totalDevices = camsCount + apsCount + phonesCount + otherCount;

    const required = [
      poeBudgetW, marginPct, poePorts,
      camsCount, camsW,
      apsCount, apsW,
      phonesCount, phonesW,
      otherCount, otherW
    ];

    if (required.some((v) => !Number.isFinite(v) || v < 0)) {
      return {
        ok: false,
        message: "Enter valid non-negative values."
      };
    }

    const totalDrawW =
      (camsCount * camsW) +
      (apsCount * apsW) +
      (phonesCount * phonesW) +
      (otherCount * otherW);

    const safeBudgetW = poeBudgetW * (1 - (marginPct / 100));
    const headroomW = safeBudgetW - totalDrawW;
    const utilPct = poeBudgetW > 0 ? (totalDrawW / poeBudgetW) * 100 : 0;
    const portWarn = poePorts > 0 && totalDevices > poePorts;

    let status = "";
    let statusClass = "";
    let interpretation = "";
    let recommendation = "";

    if (poeBudgetW === 0) {
      status = "INPUT NEEDED";
      statusClass = "flag-warn";
      interpretation = "A switch budget above 0 W is required before this design can be evaluated.";
      recommendation = "Enter the actual PoE budget from the switch or injector datasheet.";
    } else if (totalDevices === 0) {
      status = "INPUT NEEDED";
      statusClass = "flag-warn";
      interpretation = "No powered devices are currently included, so there is no load to evaluate.";
      recommendation = "Add your expected device counts and typical watt draw.";
    } else if (headroomW < 0) {
      status = "FAIL — Over safe budget";
      statusClass = "flag-bad";
      interpretation = "Estimated device draw exceeds the safe planning budget after margin. The design may work inconsistently or fail under peak conditions.";
      recommendation = "Reduce load, split devices across switches, or move to a switch with a larger PoE budget.";
    } else if (headroomW <= poeBudgetW * 0.10 || utilPct > 80) {
      status = "WARNING — Thin headroom";
      statusClass = "flag-warn";
      interpretation = "The switch is close enough to capacity that IR, heaters, cold starts, or future adds could create instability.";
      recommendation = "Keep more reserve, validate worst-case draw, or upsize switch capacity before deployment.";
    } else {
      status = "GOOD — Within safe limits";
      statusClass = "flag-ok";
      interpretation = "The design appears to have usable planning headroom under the selected assumptions.";
      recommendation = "Proceed, but validate any devices with variable draw and re-check if more endpoints are added later.";
    }

    if (portWarn) {
      interpretation += " Device count also exceeds the available powered port count, which means the design is not physically supportable as entered.";
      recommendation = " Increase port capacity or reduce powered endpoints on this switch.";
    }

    return {
      ok: true,
      poeBudgetW,
      marginPct,
      poePorts,
      totalDevices,
      totalDrawW,
      safeBudgetW,
      headroomW,
      utilPct,
      portWarn,
      status,
      statusClass,
      interpretation,
      recommendation
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
      { label: "Total device draw", value: fmtW(data.totalDrawW) },
      { label: "Safe budget (after margin)", value: fmtW(data.safeBudgetW) },
      { label: "Headroom", value: fmtW(data.headroomW) },
      { label: "Utilization (vs switch budget)", value: fmtPct(data.utilPct) },
      { label: "Powered devices", value: `${data.totalDevices}` },
      { label: "PoE ports used", value: `${data.poePorts}` },
      { label: "Status", value: data.status, className: data.statusClass },
      { label: "What this means", value: data.interpretation },
      { label: "Recommendation", value: data.recommendation }
    ]);
  }

  function saveToPipeline(data) {
    if (!data.ok) return;

    const flow = readFlow() || {};

    flow.category = "network";
    flow.tool = "poe-budget";
    flow.step = 1;
    flow.lane = "v1";
    flow.poeBudgetW = data.poeBudgetW;
    flow.safeBudgetW = data.safeBudgetW;
    flow.poeHeadroomW = data.headroomW;
    flow.poeUtilPct = data.utilPct;
    flow.poweredDevices = data.totalDevices;
    flow.timestamp = Date.now();

    writeFlow(flow);
  }

  function showNextStep(data) {
    const row = $("next-step-row");
    if (!row) return;
    row.style.display = data && data.ok ? "flex" : "none";
  }

  function calc() {
    const data = calculatePoeLoad();
    renderResults(data);
    saveToPipeline(data);
    showNextStep(data);
  }

  function reset() {
    $("poeBudgetW").value = "370";
    $("marginPct").value = "20";
    $("poeStandard").value = "at";
    $("poePorts").value = "16";

    $("camsCount").value = "12";
    $("camsW").value = "12";
    $("apsCount").value = "2";
    $("apsW").value = "15";
    $("phonesCount").value = "0";
    $("phonesW").value = "5";
    $("otherCount").value = "0";
    $("otherW").value = "10";

    const results = $("results");
    if (results) {
      results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }

    showNextStep(null);
  }

  function maybeShowFlowNote() {
    const flow = readFlow();
    if (!flow) {
      setFlowNote("Start here for the Network pipeline. Confirm switch power headroom before estimating traffic demand.");
      return;
    }

    setFlowNote("This tool is the first Network pipeline step. Calculate switch headroom, then continue into Bandwidth Planner.");
  }

  window.addEventListener("DOMContentLoaded", () => {
    const calcBtn = $("calc");
    const resetBtn = $("reset");

    if (calcBtn) calcBtn.addEventListener("click", calc);
    if (resetBtn) resetBtn.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
          e.preventDefault();
          calc();
        }
      }
    });

    maybeShowFlowNote();
    reset();
  });
})();
