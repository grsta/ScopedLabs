(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;

  const els = {
    sec: $("sec"),
    cred: $("cred"),
    env: $("env"),
    throughput: $("throughput"),
    iface: $("iface"),
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

    const data = parsed.data;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>From previous step:</strong> ${data.recommendation} (${data.dominantFactor})
    `;
  }

  function calc() {
    const sec = els.sec.value;
    const cred = els.cred.value;
    const env = els.env.value;
    const throughput = els.throughput.value;
    const iface = els.iface.value;

    let interfaceRec = iface === "osdp"
      ? "OSDP (secure, supervised)"
      : "Wiegand (legacy, not encrypted)";

    let reader = "Smart card reader";
    if (cred === "mobile") reader = "Mobile credential reader";
    if (cred === "pin") reader = "Keypad reader";
    if (cred === "multi") reader = "Multi-factor reader";

    let security = sec === "high"
      ? "Use encrypted credentials + OSDP + MFA where needed"
      : sec === "med"
      ? "Encrypted credentials recommended"
      : "Standard credentials acceptable";

    let envNote = env === "harsh"
      ? "Use industrial/IP-rated reader"
      : env === "outdoor"
      ? "Use weather-rated reader"
      : "Indoor-rated reader is fine";

    let throughputNote = throughput === "handsfree"
      ? "Long-range / BLE readers required"
      : throughput === "fast"
      ? "Optimize for fast authentication"
      : "Standard read speed acceptable";

    render([
      { label: "Reader Type", value: reader },
      { label: "Interface", value: interfaceRec },
      { label: "Security", value: security },
      { label: "Environment", value: envNote },
      { label: "Throughput", value: throughputNote }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "reader-type-selector",
      data: {
        reader,
        interfaceRec,
        security
      }
    }));

    showContinue();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", () => {
    els.results.innerHTML = `<div class="muted">Run recommendation.</div>`;
    invalidate();
  });

  [els.sec, els.cred, els.env, els.throughput, els.iface].forEach(el => {
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/lock-power-budget/";
  });

  loadFlowContext();
})();