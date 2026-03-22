(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/camera-coverage-area/";

  let hasResult = false;

  function deg2rad(x) {
    return x * Math.PI / 180;
  }

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
      if (!parsed || parsed.category !== "physical-security" || parsed.step !== "mounting-height") {
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const data = parsed.data || {};
      const h = Number(data.h || 0);
      const dist = Number(data.dist || 0);
      const tilt = Number(data.tilt || 0);
      const tiltClass = data.tiltClass || "";

      if (dist > 0) $("dist").value = dist.toFixed(0);
      if (h > 0) $("h").value = h.toFixed(0);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Prior mounting-height results detected —
        mount height <strong>${h.toFixed(1)} ft</strong>,
        target distance <strong>${dist.toFixed(1)} ft</strong>,
        suggested tilt <strong>${tilt.toFixed(1)}°</strong>,
        angle quality <strong>${tiltClass}</strong>.
        Use field of view now to determine how much scene width that mounting geometry can realistically cover.
      `;
      note.style.display = "block";
    } catch {
      note.style.display = "none";
      note.innerHTML = "";
    }
  }

  function classifyFit(coverageRatio) {
    if (coverageRatio < 0.9) return "Too Narrow";
    if (coverageRatio <= 1.15) return "Good Fit";
    return "Too Wide";
  }

  function interpretation(fitClass) {
    if (fitClass === "Too Narrow") {
      return "Current field of view does not cover the full target scene width. You will likely need a wider lens, shorter standoff distance, or more cameras.";
    }
    if (fitClass === "Good Fit") {
      return "Field of view is in a practical range for the intended scene width. This is a workable baseline for downstream coverage-area and spacing decisions.";
    }
    return "Field of view is wider than necessary for the target scene width. This improves coverage breadth, but may dilute detail and weaken identification performance.";
  }

  function lensGuidance(hfov) {
    if (hfov < 50) {
      return "This is a relatively tight view. Good for concentrating detail, but scene coverage width will be limited.";
    }
    if (hfov <= 90) {
      return "This is a balanced field of view for many general surveillance applications.";
    }
    return "This is a wide view. Useful for broad awareness, but watch for reduced target detail at the far edges of coverage.";
  }

  function calc() {
    const dist = Math.max(0.1, parseFloat($("dist").value) || 0.1);
    const hfov = Math.max(1, parseFloat($("hfov").value) || 1);
    const scene = Math.max(0, parseFloat($("scene").value) || 0);
    const h = Math.max(0, parseFloat($("h").value) || 0);

    const sceneWidth = 2 * Math.tan(deg2rad(hfov / 2)) * dist;
    const halfWidth = sceneWidth / 2;
    const coverageRatio = scene > 0 ? sceneWidth / scene : 0;
    const fitClass = classifyFit(coverageRatio);
    const fitText = interpretation(fitClass);
    const lensText = lensGuidance(hfov);
    const diagonalReach = Math.sqrt((sceneWidth * sceneWidth) + (dist * dist));
    const widthPerFootHeight = h > 0 ? sceneWidth / h : 0;

    render([
      { label: "Estimated Scene Width @ Distance", value: `${sceneWidth.toFixed(1)} ft` },
      { label: "Half-Width from Centerline", value: `${halfWidth.toFixed(1)} ft` },
      { label: "Target Scene Width", value: `${scene.toFixed(1)} ft` },
      { label: "Coverage Fit", value: fitClass },
      { label: "Coverage Ratio", value: scene > 0 ? `${coverageRatio.toFixed(2)}x` : "N/A" },
      { label: "Approx. Diagonal Reach", value: `${diagonalReach.toFixed(1)} ft` },
      { label: "Scene Width per Foot of Mount Height", value: h > 0 ? `${widthPerFootHeight.toFixed(2)} ft/ft` : "N/A" },
      { label: "Interpretation", value: fitText },
      { label: "Lens Guidance", value: lensText }
    ]);

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "physical-security",
      step: "field-of-view",
      data: {
        dist,
        hfov,
        scene,
        h,
        sceneWidth,
        halfWidth,
        coverageRatio,
        fitClass,
        fitText,
        lensText,
        diagonalReach,
        widthPerFootHeight
      }
    }));

    showContinue();
    showFlowNote();
  }

  function reset() {
    $("dist").value = 40;
    $("hfov").value = 90;
    $("scene").value = 60;
    $("h").value = 12;
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

  ["dist", "hfov", "scene", "h"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  $("continue").addEventListener("click", () => {
    window.location.href = NEXT_URL;
  });

  showFlowNote();
})();
