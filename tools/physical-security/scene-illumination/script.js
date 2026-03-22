(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let hasResult = false;

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
    $("continue-wrap").style.display = "block";
    $("continue").disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    $("continue-wrap").style.display = "none";
    $("continue").disabled = true;
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
      if (!parsed || parsed.category !== "physical-security" || parsed.step === "scene-illumination") {
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      note.innerHTML = `
        <strong>Flow context:</strong> Prior step data was detected from
        <strong>${parsed.step}</strong>. Recalculate this tool if you want to replace the current pipeline handoff.
      `;
      note.style.display = "block";
    } catch {
      note.style.display = "none";
      note.innerHTML = "";
    }
  }

  function classifyFootcandles(fc) {
    if (fc < 1) return "Very Low";
    if (fc < 3) return "Low Light";
    if (fc < 10) return "Moderate";
    return "High";
  }

  function suitability(fc) {
    if (fc < 1) {
      return "Scene will depend heavily on IR or extreme low-light camera performance. Expect increased noise, lower color fidelity, and weaker identification results.";
    }
    if (fc < 3) {
      return "Suitable for general surveillance and scene awareness, but still marginal for stronger identification tasks unless optics and camera settings are tightly controlled.";
    }
    if (fc < 10) {
      return "Lighting is strong enough for solid general surveillance and improved image quality. This is a practical planning range for many exterior and perimeter applications.";
    }
    return "Lighting level is strong and supports better detail capture, reduced low-light stress on the camera, and stronger downstream performance for identification-oriented design.";
  }

  function nextStepGuidance(fc, lumens, area) {
    if (fc < 2) {
      return "Before moving into mounting height and FOV decisions, confirm whether additional fixture output or scene lighting improvements are needed. Low illumination can make otherwise-correct coverage geometry perform poorly in practice.";
    }
    if (lumens > 30000 && area < 5000) {
      return "Required lumen output is fairly aggressive for the scene size. Validate whether the target footcandle level is truly necessary or whether fixture count, aiming, or zone lighting should be adjusted.";
    }
    return "This lighting baseline is workable for continuing into mounting height and coverage design. Next steps should verify angle, spacing, and pixel density against the intended surveillance objective.";
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
  }

  function calc() {
    const w = Math.max(0, parseFloat($("w").value) || 0);
    const d = Math.max(0, parseFloat($("d").value) || 0);
    const fc = Math.max(0, parseFloat($("fc").value) || 0);
    const uf = Math.max(0.01, (parseFloat($("uf").value) || 0) / 100);
    const llf = Math.max(0.01, (parseFloat($("llf").value) || 0) / 100);

    const area = w * d;
    const effectiveFactor = Math.max(0.05, uf * llf);
    const lumens = (fc * area) / effectiveFactor;
    const lightingClass = classifyFootcandles(fc);
    const guidance = suitability(fc);
    const nextGuidance = nextStepGuidance(fc, lumens, area);

    render([
      { label: "Area", value: `${area.toFixed(0)} sq ft` },
      { label: "Target Illumination", value: `${fc.toFixed(2)} fc` },
      { label: "Utilization Factor", value: `${(uf * 100).toFixed(0)}%` },
      { label: "Light Loss Factor", value: `${(llf * 100).toFixed(0)}%` },
      { label: "Effective Planning Factor", value: `${effectiveFactor.toFixed(2)}` },
      { label: "Estimated Lumens Required", value: `${lumens.toFixed(0)} lm` },
      { label: "Lighting Condition", value: lightingClass },
      { label: "Interpretation", value: guidance },
      { label: "Design Guidance", value: nextGuidance }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "physical-security",
      step: "scene-illumination",
      data: {
        w,
        d,
        fc,
        uf,
        llf,
        area,
        effectiveFactor,
        lumens,
        lightingClass,
        guidance,
        nextGuidance
      }
    }));

    showContinue();
    showFlowNote();
  }

  function reset() {
    $("w").value = 60;
    $("d").value = 40;
    $("fc").value = 2.0;
    $("uf").value = 70;
    $("llf").value = 80;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
    showFlowNote();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  ["w", "d", "fc", "uf", "llf"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/physical-security/mounting-height/";
  });

  showFlowNote();
  reset();
})();