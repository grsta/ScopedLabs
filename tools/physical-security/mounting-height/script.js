(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/field-of-view/";

  let hasResult = false;

  function rad2deg(x) { return x * 180 / Math.PI; }
  function deg2rad(x) { return x * Math.PI / 180; }

  function render(rows) {
    const el = $("results");
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
    $("continue").style.display = "inline-block";
    hasResult = true;
  }

  function hideContinue() {
    $("continue").style.display = "none";
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
      if (!parsed || parsed.category !== "physical-security" || parsed.step !== "scene-illumination") {
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const data = parsed.data || {};
      const area = Number(data.area || 0);
      const fc = Number(data.fc || 0);
      const lumens = Number(data.lumens || 0);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Prior scene illumination results detected —
        area <strong>${area.toFixed(0)} sq ft</strong>,
        target illumination <strong>${fc.toFixed(2)} fc</strong>,
        estimated lumen requirement <strong>${lumens.toFixed(0)} lm</strong>.
        Use mounting height to balance subject angle and scene coverage before locking field of view.
      `;
      note.style.display = "block";
    } catch {
      note.style.display = "none";
      note.innerHTML = "";
    }
  }

  function classifyTilt(tilt) {
    if (tilt < 10) return "Too Shallow";
    if (tilt < 25) return "Balanced";
    if (tilt < 45) return "Strong";
    return "Too Steep";
  }

  function angleInterpretation(tilt) {
    if (tilt < 10) {
      return "Angle is very shallow. This tends to overemphasize the horizon, weakens face detail, and reduces practical identification quality.";
    }
    if (tilt < 25) {
      return "Angle is balanced for general surveillance. It supports broad situational awareness, but may still be light on subject detail for stronger identification tasks.";
    }
    if (tilt < 45) {
      return "Angle is strong for practical surveillance design. It usually provides a better compromise between coverage and usable subject geometry.";
    }
    return "Angle is steep. Coverage may still work, but top-down compression can reduce face detail and make subjects look visually flattened.";
  }

  function heightGuidance(h) {
    if (h < 9) {
      return "Mount height is relatively low. This can improve subject angle and detail, but raises tamper and vandalism risk.";
    }
    if (h <= 15) {
      return "Mount height is in a practical working range for many building exteriors and perimeter applications.";
    }
    return "Mount height is relatively high. This helps with tamper resistance and broad coverage, but can hurt identification geometry if tilt becomes too steep.";
  }

  function calc() {
    const h = Math.max(0, parseFloat($("h").value) || 0);
    const dist = Math.max(0.1, parseFloat($("dist").value) || 0.1);
    const th = Math.max(0, parseFloat($("th").value) || 0);
    const vfov = Math.max(1, parseFloat($("vfov").value) || 1);

    const drop = h - th;
    const tilt = rad2deg(Math.atan2(drop, dist));
    const span = 2 * Math.tan(deg2rad(vfov / 2)) * dist;
    const topEdgeHeight = h - Math.tan(deg2rad(Math.max(0, tilt - (vfov / 2)))) * dist;
    const bottomEdgeHeight = h - Math.tan(deg2rad(tilt + (vfov / 2))) * dist;
    const tiltClass = classifyTilt(tilt);
    const interpretation = angleInterpretation(tilt);
    const guidance = heightGuidance(h);

    render([
      { label: "Vertical Drop (mount - target)", value: `${drop.toFixed(2)} ft` },
      { label: "Suggested Down-Tilt", value: `${tilt.toFixed(1)}°` },
      { label: "Vertical Coverage Span @ Distance", value: `${span.toFixed(1)} ft` },
      { label: "Approx. Top of View @ Distance", value: `${topEdgeHeight.toFixed(1)} ft` },
      { label: "Approx. Bottom of View @ Distance", value: `${bottomEdgeHeight.toFixed(1)} ft` },
      { label: "Angle Quality", value: tiltClass },
      { label: "Interpretation", value: interpretation },
      { label: "Design Guidance", value: guidance }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "physical-security",
      step: "mounting-height",
      data: {
        h,
        dist,
        th,
        vfov,
        drop,
        tilt,
        span,
        topEdgeHeight,
        bottomEdgeHeight,
        tiltClass,
        interpretation,
        guidance
      }
    }));

    showContinue();
    showFlowNote();
  }

  function reset() {
    $("h").value = 12;
    $("dist").value = 40;
    $("th").value = 5.5;
    $("vfov").value = 55;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
    showFlowNote();
  }

  function invalidate() {
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
    showFlowNote();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  ["h", "dist", "th", "vfov"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = NEXT_URL;
  });

  showFlowNote();
})();