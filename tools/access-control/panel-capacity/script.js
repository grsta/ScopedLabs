(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;

  const els = {
    doors: $("doors"),
    readersPerDoor: $("readersPerDoor"),
    inputsPerDoor: $("inputsPerDoor"),
    outputsPerDoor: $("outputsPerDoor"),
    baseDoors: $("baseDoors"),
    expDoors: $("expDoors"),
    maxExp: $("maxExp"),
    spare: $("spare"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    nextWrap: $("continue-wrap"),
    nextBtn: $("continue"),
    flowNote: $("flow-note")
  };

  function showContinue() {
    els.nextWrap.style.display = "block";
    els.nextBtn.disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    els.nextWrap.style.display = "none";
    els.nextBtn.disabled = true;
    hasResult = false;
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
  }

  function loadFlowContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "access-control") return;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>System context:</strong><br>
      ${parsed.data.recommendation || ""}<br>
      ${parsed.data.reader || ""}<br>
      ${parsed.data.req ? `Power Load: ${parsed.data.req.toFixed(2)} A` : ""}
    `;
  }

  function calc() {
    const doors = +els.doors.value;
    const spare = +els.spare.value;

    const target = Math.ceil(doors * (1 + spare / 100));

    const base = +els.baseDoors.value;
    const exp = +els.expDoors.value;
    const maxExp = +els.maxExp.value;

    const perPanel = base + (maxExp * exp);
    const panels = Math.ceil(target / perPanel);

    const remaining = target - (panels * base);
    const expansions = Math.ceil(Math.max(0, remaining) / exp);

    const readers = doors * +els.readersPerDoor.value;

    let risk = "Balanced system.";
    if (expansions > panels * maxExp) {
      risk = "Expansion limit exceeded — add panels.";
    } else if (spare < 15) {
      risk = "Low spare capacity — scaling risk.";
    }

    els.results.innerHTML = `
      <div class="result-row"><span>Panels Required</span><span>${panels}</span></div>
      <div class="result-row"><span>Expansion Modules</span><span>${expansions}</span></div>
      <div class="result-row"><span>Total Readers</span><span>${readers}</span></div>
      <div class="result-row"><span>Risk</span><span>${risk}</span></div>
    `;

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "panel-capacity",
      data: { panels, expansions, readers }
    }));

    showContinue();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", () => {
    els.results.innerHTML = `<div class="muted">Run calculation.</div>`;
    invalidate();
  });

  Object.values(els).forEach(el => {
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT")) {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/access-level-sizing/";
  });

  loadFlowContext();
})();
