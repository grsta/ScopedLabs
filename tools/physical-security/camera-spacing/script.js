(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/blind-spot-check/";

  let previousCoverage = null;

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
  }

  function hideContinue() {
    const btn = $("continue");
    if (!btn) return;
    btn.style.display = "none";
  }

  function showFlowNote() {
    const note = $("flow-note");
    if (!note) return;

    previousCoverage = null;

    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) {
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.category !== "physical-security" || parsed.step !== "camera-coverage-area") {
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const d = parsed.data || {};
      previousCoverage = d;

      const effWidth = Number(d.effWidth || 0);
      const width = Number(d.width || 0);
      const dist = Number(d.dist || 0);
      const hfov = Number(d.hfov || 0);
      const ovPct = Number(d.ov || 0) * 100;

      if ($("dist") && dist > 0) $("dist").value = String(Math.round(dist));
      if ($("hfov") && hfov > 0) $("hfov").value = String(Math.round(hfov));
      if ($("ov") && ovPct >= 0) $("ov").value = String(Math.round(ovPct));

      note.innerHTML = `
        <strong>Flow context:</strong>
        Prior coverage results detected —
        raw width <strong>${width.toFixed(1)} ft</strong>,
        effective width <strong>${effWidth.toFixed(1)} ft</strong>,
        distance <strong>${dist.toFixed(1)} ft</strong>,
        horizontal FOV <strong>${hfov.toFixed(1)}°</strong>.
        This step uses that coverage footprint to estimate perimeter spacing and camera count.
      `;
      note.style.display = "block";
    } catch (err) {
      note.style.display = "none";
      note.innerHTML = "";
    }
  }

  function classifySpacing(actualSpacing, recommendedSpacing) {
    const ratio = recommendedSpacing > 0 ? actualSpacing / recommendedSpacing : 0;
    if (ratio < 0.9) return "Tight Spacing";
    if (ratio <= 1.05) return "Balanced Spacing";
    return "Wide Spacing";
  }

  function spacingInterpretation(type) {
    if (type === "Tight Spacing") {
      return "Cameras are being placed closer than the recommended spacing. This increases redundancy and cost, but lowers the risk of missed coverage between views.";
    }
    if (type === "Balanced Spacing") {
      return "Spacing is in a practical range for continuous coverage while maintaining reasonable deployment efficiency.";
    }
    return "Spacing is wider than the recommended overlap-based spacing. Expect softer transitions or blind areas between adjacent cameras.";
  }

  function designGuidance(cams, len, recommendedSpacing) {
    if (cams <= 2) {
      return "This is a sparse layout. Verify end conditions and camera edge performance carefully, especially at corners or transition zones.";
    }
    if (recommendedSpacing < 20) {
      return "Recommended spacing is relatively tight. This usually reflects either a wide overlap target or limited single-camera usable width.";
    }
    if (len > 500) {
      return "Long perimeters amplify small spacing errors. Use this result as a planning baseline, then verify real-world obstructions and corner geometry before final placement.";
    }
    return "This is a workable planning baseline for perimeter layout. The next step should verify whether this spacing leaves any practical blind zones.";
  }

  function calc() {
    const lenEl = $("len");
    const distEl = $("dist");
    const hfovEl = $("hfov");
    const ovEl = $("ov");

    if (!lenEl || !distEl || !hfovEl || !ovEl) return;

    const len = Math.max(1, parseFloat(lenEl.value) || 1);
    const dist = Math.max(0.1, parseFloat(distEl.value) || 0.1);
    const hfov = Math.max(1, parseFloat(hfovEl.value) || 1);
    const ov = Math.max(0, Math.min(0.95, (parseFloat(ovEl.value) || 0) / 100));

    const rawWidth = 2 * Math.tan(deg2rad(hfov / 2)) * dist;
    const coverageWidth = previousCoverage && Number(previousCoverage.effWidth) > 0
      ? Number(previousCoverage.effWidth)
      : rawWidth * (1 - ov);

    const recommendedSpacing = coverageWidth;
    const cams = Math.max(1, Math.ceil(len / recommendedSpacing));
    const actualSpacing = len / cams;
    const overlapRecovered = rawWidth > 0 ? (1 - (actualSpacing / rawWidth)) * 100 : 0;

    const spacingType = classifySpacing(actualSpacing, recommendedSpacing);
    const interpretation = spacingInterpretation(spacingType);
    const guidance = designGuidance(cams, len, recommendedSpacing);

    render([
      { label: "Raw Coverage Width per Camera", value: `${rawWidth.toFixed(1)} ft` },
      { label: "Usable Width for Spacing", value: `${coverageWidth.toFixed(1)} ft` },
      { label: "Recommended Spacing", value: `${recommendedSpacing.toFixed(1)} ft` },
      { label: "Perimeter Length", value: `${len.toFixed(0)} ft` },
      { label: "Estimated Cameras Needed", value: `${cams}` },
      { label: "Actual Spacing", value: `${actualSpacing.toFixed(1)} ft` },
      { label: "Recovered Overlap @ Actual Spacing", value: `${overlapRecovered.toFixed(1)}%` },
      { label: "Spacing Classification", value: spacingType },
      { label: "Interpretation", value: interpretation },
      { label: "Design Guidance", value: guidance }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "physical-security",
      step: "camera-spacing",
      data: {
        len,
        dist,
        hfov,
        ov,
        rawWidth,
        coverageWidth,
        recommendedSpacing,
        cams,
        actualSpacing,
        overlapRecovered,
        spacingType,
        interpretation,
        guidance
      }
    }));

    showContinue();
    showFlowNote();
  }

  function reset() {
    if ($("len")) $("len").value = 300;
    if ($("dist")) $("dist").value = 60;
    if ($("hfov")) $("hfov").value = 90;
    if ($("ov")) $("ov").value = 15;
    if ($("results")) $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    sessionStorage.removeItem(FLOW_KEY);
    previousCoverage = null;
    hideContinue();
    showFlowNote();
  }

  function invalidate() {
    sessionStorage.removeItem(FLOW_KEY);
    previousCoverage = null;
    hideContinue();
    showFlowNote();
  }

  const calcBtn = $("calc");
  const resetBtn = $("reset");
  const continueBtn = $("continue");

  if (calcBtn) calcBtn.addEventListener("click", calc);
  if (resetBtn) resetBtn.addEventListener("click", reset);

  ["len", "dist", "hfov", "ov"].forEach((id) => {
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
