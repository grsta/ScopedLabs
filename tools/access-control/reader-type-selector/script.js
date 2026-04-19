(() => {
  "use strict";

  const CATEGORY = "access-control";
  const STEP = "reader-type-selector";
  const LANE = "v1";
  const PREVIOUS_STEP = "fail-safe-fail-secure";

  const FLOW_KEYS = {
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

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
    analysis: $("analysis-copy"),
    nextWrap: $("continue-wrap"),
    nextBtn: $("continue"),
    flowNote: $("flow-note")
  };

  function showContinue() {
    els.nextWrap.style.display = "flex";
    els.nextBtn.disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    els.nextWrap.style.display = "none";
    els.nextBtn.disabled = true;
    hasResult = false;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["lock-power-budget"]);
      sessionStorage.removeItem(FLOW_KEYS["panel-capacity"]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}

    hideContinue();
    els.results.innerHTML = `<div class="muted">Run recommendation.</div>`;
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    loadFlowContext();
  }

  function render(rows) {
    els.results.innerHTML = "";
    rows.forEach((r) => {
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
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    if (!parsed || parsed.category !== "access-control" || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const d = parsed.data || {};
    const lines = [];

    if (d.recommendation) lines.push(`Fail Mode: <strong>${d.recommendation}</strong>`);
    if (d.doorType) lines.push(`Door Type: <strong>${d.doorType}</strong>`);
    if (d.life) lines.push(`Life Safety: <strong>${d.life}</strong>`);
    if (d.threat) lines.push(`Threat: <strong>${d.threat}</strong>`);
    if (d.powerLoss) lines.push(`Power Reliability: <strong>${d.powerLoss}</strong>`);
    if (d.fire) lines.push(`Fire Integration: <strong>${d.fire}</strong>`);

    if (!lines.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${lines.join(" | ")}
      <br><br>
      Use that door-behavior decision to choose a reader style that fits the security need, environment, and user experience instead of selecting reader hardware in isolation.
    `;
  }

  function calc() {
    const sec = els.sec.value;
    const cred = els.cred.value;
    const env = els.env.value;
    const throughput = els.throughput.value;
    const iface = els.iface.value;

    let interfaceRec =
      iface === "osdp"
        ? "OSDP (secure, supervised)"
        : "Wiegand (legacy, not encrypted)";

    let reader = "Smart card reader";
    if (cred === "mobile") reader = "Mobile credential reader";
    if (cred === "pin") reader = "Keypad reader";
    if (cred === "multi") reader = "Multi-factor reader";

    let security =
      sec === "high"
        ? "Encrypted credentials + OSDP + MFA recommended"
        : sec === "med"
        ? "Encrypted credentials recommended"
        : "Standard credentials acceptable";

    let envNote =
      env === "harsh"
        ? "Use industrial/IP-rated reader"
        : env === "outdoor"
        ? "Use weather-rated reader"
        : "Indoor-rated reader is fine";

    let throughputNote =
      throughput === "handsfree"
        ? "Long-range / BLE readers required"
        : throughput === "fast"
        ? "Optimize for fast authentication"
        : "Standard read speed acceptable";

    let interpretation = "";
    if (cred === "multi" || sec === "high") {
      interpretation = "This door is being treated as a higher-assurance checkpoint, so reader choice should prioritize credential integrity and stronger supervision over convenience alone.";
    } else if (throughput === "handsfree") {
      interpretation = "This opening is being optimized for flow and convenience, which changes the reader decision away from standard wall-reader assumptions and toward faster user interaction patterns.";
    } else {
      interpretation = "The recommended reader type is balanced for normal access-control conditions, where security, usability, and environment all matter but none of them are extreme enough to dominate the design outright.";
    }

    const guidance =
      iface === "wg"
        ? "If the panel can support it, consider moving away from Wiegand on new deployments so the reader decision does not lock the project into weaker signaling and less supervision."
        : "OSDP is the stronger default here. Keep wiring, reader compatibility, and address planning aligned early so the interface choice stays clean through deployment.";

    render([
      { label: "Reader Type", value: reader },
      { label: "Interface", value: interfaceRec },
      { label: "Security", value: security },
      { label: "Environment", value: envNote },
      { label: "Throughput", value: throughputNote },
      { label: "Engineering Interpretation", value: interpretation },
      { label: "Actionable Guidance", value: guidance }
    ]);

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        readerType: reader,
        interfaceRec,
        security,
        envNote,
        throughputNote,
        environment: env,
        priority: sec
      }
    });

    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.sec.value = "low";
    els.cred.value = "card";
    els.env.value = "indoor";
    els.throughput.value = "standard";
    els.iface.value = "wg";
    invalidate();
  });

  [els.sec, els.cred, els.env, els.throughput, els.iface].forEach((el) => {
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/lock-power-budget/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    loadFlowContext();
    hideContinue();
  });
})();