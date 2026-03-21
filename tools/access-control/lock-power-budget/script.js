(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;

  const els = {
    lockType: $("lockType"),
    voltage: $("voltage"),
    amps: $("amps"),
    locks: $("locks"),
    simul: $("simul"),
    headroom: $("headroom"),
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

  function render(rows) {
    els.results.innerHTML = "";
    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      els.results.appendChild(div);
    });
  }

  function loadFlowContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "access-control") return;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>Upstream decisions:</strong><br>
      ${parsed.data.recommendation || ""}<br>
      ${parsed.data.reader || ""}
    `;
  }

  function calc() {
    const amps = parseFloat(els.amps.value);
    const locks = parseInt(els.locks.value);
    const simul = parseInt(els.simul.value);
    const headroom = parseFloat(els.headroom.value);
    const voltage = parseInt(els.voltage.value);

    const peak = Math.min(locks, simul) * amps;
    const req = peak * (1 + headroom / 100);
    const watts = req * voltage;

    render([
      { label: "Peak Load", value: peak.toFixed(2) + " A" },
      { label: "Required Supply", value: req.toFixed(2) + " A" },
      { label: "Power", value: watts.toFixed(1) + " W" }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "lock-power-budget",
      data: { req, watts }
    }));

    showContinue();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", () => {
    els.results.innerHTML = `<div class="muted">Run calculation.</div>`;
    invalidate();
  });

  Object.values(els).forEach(el => {
    if (el && el.tagName === "INPUT" || el.tagName === "SELECT") {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/panel-capacity/";
  });

  loadFlowContext();
})();
