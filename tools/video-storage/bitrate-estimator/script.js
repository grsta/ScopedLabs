// Bitrate Estimator (rule-of-thumb model)
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(div);
    });
  }

  function codecFactor(codec) {
    // lower factor = more efficient (needs fewer bits)
    if (codec === "h265") return 0.70;
    if (codec === "vp9") return 0.75;
    if (codec === "av1") return 0.60;
    return 1.00; // h264 baseline
  }

  function sceneFactor(scene) {
    if (scene === "low") return 0.75;
    if (scene === "high") return 1.35;
    return 1.00;
  }

  function qualityFactor(q) {
    if (q === "conservative") return 1.25;
    if (q === "aggressive") return 0.80;
    return 1.00;
  }

  function calc() {
    const res = $("res").value;
    let w = n("w");
    let h = n("h");
    const fps = Math.max(1, n("fps"));
    const codec = $("codec").value;
    const scene = $("scene").value;
    const quality = $("quality").value;

    if (res !== "custom") {
      const [rw, rh] = res.split("x").map(Number);
      w = rw; h = rh;
      $("w").value = w;
      $("h").value = h;
    }

    const pixels = Math.max(1, w * h);

    // baseline bits-per-pixel-per-frame (bpppf) for "balanced" H.264
    // This is a practical heuristic, not a standard.
    const bpppf = 0.07;

    const mbps =
      (pixels * fps * bpppf *
        sceneFactor(scene) *
        qualityFactor(quality) *
        codecFactor(codec)) / 1_000_000;

    // Add small overhead for audio/transport/metadata variability
    const overhead = 1.10;
    const est = mbps * overhead;

    const low = est * 0.8;
    const high = est * 1.25;

    render([
      { label: "Resolution", value: `${w}×${h}` },
      { label: "Frame Rate", value: `${fps.toFixed(0)} fps` },
      { label: "Codec", value: codec.toUpperCase() },
      { label: "Scene", value: scene.toUpperCase() },
      { label: "Quality", value: quality.toUpperCase() },

      { label: "Estimated Bitrate", value: `${est.toFixed(2)} Mbps` },
      { label: "Suggested Range", value: `${low.toFixed(2)} – ${high.toFixed(2)} Mbps` },
      { label: "Notes", value: "Rule-of-thumb estimate. Real bitrate varies by encoder settings, lighting, and motion." }
    ]);
  }

  function reset() {
    $("res").value = "1920x1080";
    $("w").value = 1920;
    $("h").value = 1080;
    $("fps").value = 15;
    $("codec").value = "h264";
    $("scene").value = "med";
    $("quality").value = "balanced";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  // if user selects resolution presets, we auto-fill W/H
  $("res").addEventListener("change", () => {
    if ($("res").value !== "custom") calc();
  });

  reset();
})();
