(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/camera-spacing/";

  let hasResult = false;

  function deg2rad(x) {
    return x * Math.PI / 180;
  }

  function render(rows) {
    const el = $("results");
    if (!el) return;

    el.innerHTML = "";
    rows.forEach((r) => {
      const d = document.createElement("div");
      d.className = "result-row";
      d.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(d);
    });
  }

  function showContinue() {
    const btn = $("continue");
    if (!btn) return;
    btn.style.display = "inline-block";
    hasResult = true;
  }

  function hideContinue() {
    const btn = $("continue");
    if (!btn) return;
    btn.style.display = "none";
    hasResult = false;
  }

  function showFlowNote() {
    const note = $("flow-note");
    if (!note) return;

    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) {
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.category !== "physical-security" || parsed.step !== "field-of-view") {
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const data = parsed.data || {};
      const sceneWidth = Number(data.sceneWidth || 0);
      const dist = Number(data.dist || 0);
      const hfov = Number(data.hfov || 0);
      const fitClass = data.fitClass || "";

      if ($("dist") && dist > 0) $("dist").value = String(Math.round(dist));
      if ($("hfov") && hfov > 0) $("hfov").value = String(Math.round(hfov));

      note.innerHTML = `
        <strong>Flow context:</strong>
        Prior field-of-view results detected —
        estimated scene width <strong>${sceneWidth.toFixed(1)} ft</strong> at
        <strong>${dist.toFixed(1)} ft</strong> with
        <strong>${hfov.toFixed(1)}°</strong> HFOV,
        classified as <strong>${fitClass}</strong>.
        This step converts that lens width into real usable coverage after overlap reserve is applied.
      `;
      note.style.display = "block";
    } catch (err) {
      note.style.display = "none";
      note.innerHTML = "";
    }
  }

  function classifyOverlap(ov) {
    if (ov < 0.10) return "Low Overlap";
    if (ov <= 0.25) return "Balanced Overlap";
    return "High Overlap";
  }

  function classifyCoverageEfficiency(effArea, area) {
    const ratio = area > 0 ? effArea / area : 0;
    if (ratio < 0.65) return "Heavy Reserve";
    if (ratio < 0.85) return "Practical Reserve";
    return "Minimal Reserve";
  }

  function overlapInterpretation(overlapClass) {
    if (overlapClass === "Low Overlap") {
      return "Low overlap maximizes individual camera footprint, but increases the chance of soft gaps between adjacent views.";
    }
    if (overlapClass === "Balanced Overlap") {
      return "Balanced overlap is usually the best planning range for continuous scene coverage without wasting too much usable width.";
    }
    return "High overlap improves continuity and handoff between cameras, but reduces usable coverage efficiency and can increase camera count.";
  }

  function designGuidance(effWidth, width) {
    const ratio = width > 0 ? effWidth / width : 0;
    if (ratio < 0.70) {
      return "Usable width drops quickly once overlap reserve gets aggressive. This is appropriate when continuity matters more than raw coverage efficiency.";
    }
    if (ratio < 0.90) {
      return "This is a healthy reserve range for many practical layouts. You preserve usable width while still protecting against blind edges.";
    }
    return "Very little width is being reserved for overlap. Coverage efficiency is high, but spacing tolerance between cameras will be tighter.";
  }

  function calc() {
    const hfovEl = $("hfov");
    const vfovEl = $("vfov");
    const distEl = $("dist");
    const ovEl = $("ov");

    if (!hfovEl || !vfovEl || !distEl || !ovEl) return;

    const hfov = Math.max(1, parseFloat(hfovEl.value) || 1);
    const vfov = Math.max(1, parseFloat(vfovEl.value) || 1);
    const dist = Math.max(0.1, parseFloat(distEl.value) || 0.1);
    const ov = Math.max(0, Math.min(0.95, (parseFloat(ovEl.value) || 0) / 100));

    const halfW = Math.tan(deg2rad(hfov / 2)) * dist;
    const halfH = Math.tan(deg2rad(vfov / 2)) * dist;

    const width = halfW * 2;
    const height = halfH * 2;

    const effWidth = width * (1 - ov);
    const effHeight = height * (1 - ov);

    const area = width * height;
    const effArea = effWidth * effHeight;

    const overlapClass = classifyOverlap(ov);
    const efficiencyClass = classifyCoverageEfficiency(effArea, area);
    const interpretation = overlapInterpretation(overlapClass);
    const guidance = designGuidance(effWidth, width);

    render([
      { label: "Coverage Width", value: `${width.toFixed(1)} ft` },
      { label: "Coverage Height", value: `${height.toFixed(1)} ft` },
      { label: "Coverage Area", value: `${area.toFixed(0)} sq ft` },
      { label: "Overlap Reserve", value: `${(ov * 100).toFixed(0)}%` },
      { label: "Effective Width", value: `${effWidth.toFixed(1)} ft` },
      { label: "Effective Height", value: `${effHeight.toFixed(1)} ft` },
      { label: "Effective Area", value: `${effArea.toFixed(0)} sq ft` },
      { label: "Overlap Classification", value: overlapClass },
      { label: "Coverage Efficiency", value: efficiencyClass },
      { label: "Interpretation", value: interpretation },
      { label: "Design Guidance", value: guidance }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "physical-security",
      step: "camera-coverage-area",
      data: {
        hfov,
        vfov,
        dist,
        ov,
        width,
        height,
        area,
        effWidth,
        effHeight,
        effArea,
        overlapClass,
        efficiencyClass,
        interpretation,
        guidance
      }
    }));

    showContinue();
  }

  function reset() {
    if ($("hfov")) $("hfov").value = 90;
    if ($("vfov")) $("vfov").value = 55;
    if ($("dist")) $("dist").value = 60;
    if ($("ov")) $("ov").value = 15;
    if ($("results")) $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
    showFlowNote();
  }

  function invalidate() {
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
    showFlowNote();
  }

  const calcBtn = $("calc");
  const resetBtn = $("reset");
  const continueBtn = $("continue");

  if (calcBtn) calcBtn.addEventListener("click", calc);
  if (resetBtn) resetBtn.addEventListener("click", reset);

  ["hfov", "vfov", "dist", "ov"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  showFlowNote();
})();