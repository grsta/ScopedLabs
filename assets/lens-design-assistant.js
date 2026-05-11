(() => {
  "use strict";

  const STYLE_ID = "scopedlabs-lens-design-assistant-style";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .slda-shell { display:grid; gap:14px; }
      .slda-head { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; padding-bottom:12px; border-bottom:1px solid rgba(148,163,184,.14); }
      .slda-kicker { color:#7dff98; font-size:.66rem; font-weight:950; letter-spacing:.15em; text-transform:uppercase; }
      .slda-title { margin:6px 0 0; color:#fff; font-size:1.14rem; font-weight:950; line-height:1.14; }
      .slda-copy { margin:7px 0 0; color:rgba(226,232,240,.72); font-size:.82rem; line-height:1.48; }
      .slda-status { border-radius:999px; padding:8px 12px; font-size:.68rem; font-weight:950; letter-spacing:.12em; text-transform:uppercase; border:1px solid rgba(255,96,88,.36); background:rgba(255,96,88,.11); color:#ff8f88; white-space:nowrap; }
      .slda-status.healthy { border-color:rgba(125,255,152,.34); background:rgba(125,255,152,.08); color:#7dff98; }
      .slda-status.watch { border-color:rgba(255,211,79,.34); background:rgba(255,211,79,.08); color:#ffd34f; }
      .slda-tabs { display:flex; flex-wrap:wrap; gap:8px; }
      .slda-custom-editor { border:1px solid rgba(148,163,184,.14); border-radius:16px; background:rgba(255,255,255,.025); padding:14px; }
      .slda-custom-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:12px; }
      .slda-assumption-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
      .slda-field label { display:block; color:rgba(203,213,225,.66); font-size:.58rem; font-weight:950; letter-spacing:.13em; text-transform:uppercase; margin-bottom:6px; }
      .slda-field input, .slda-field select { width:100%; border:1px solid rgba(148,163,184,.18); border-radius:10px; background:rgba(2,6,12,.72); color:#fff; padding:9px 10px; font-weight:850; outline:none; }
      .slda-field input:focus, .slda-field select:focus { border-color:rgba(125,255,152,.50); box-shadow:0 0 0 2px rgba(125,255,152,.10); }
      .slda-tab { border:1px solid rgba(148,163,184,.18); border-radius:999px; background:rgba(255,255,255,.035); color:rgba(226,232,240,.86); padding:8px 12px; font-weight:850; cursor:pointer; }
      .slda-tab.is-active { border-color:rgba(125,255,152,.42); color:#7dff98; background:rgba(125,255,152,.10); box-shadow:0 0 22px rgba(125,255,152,.08); }
      .slda-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .slda-panel { border:1px solid rgba(148,163,184,.14); border-radius:16px; background:rgba(255,255,255,.025); padding:14px; min-width:0; }
      .slda-value { margin-top:14px; color:#fff; font-size:1.4rem; font-weight:950; }
      .slda-mini-grid, .slda-target-grid, .slda-scenario-strip { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:12px; }
      .slda-card { border:1px solid rgba(148,163,184,.13); border-radius:12px; background:rgba(255,255,255,.025); padding:10px; min-width:0; }
      .slda-label { color:rgba(203,213,225,.64); font-size:.58rem; font-weight:950; letter-spacing:.13em; text-transform:uppercase; }
      .slda-card strong { display:block; margin-top:7px; color:#fff; font-size:.94rem; font-weight:950; line-height:1.18; }
      .slda-card .healthy, .slda-good { color:#7dff98 !important; }
      .slda-card .watch, .slda-watch { color:#ffd34f !important; }
      .slda-card .risk, .slda-risk { color:#ff8f88 !important; }
      .slda-note { margin-top:5px; color:rgba(203,213,225,.62); font-size:.72rem; line-height:1.35; }
      .slda-driver-stack { display:grid; gap:10px; margin-top:14px; }
      .slda-driver-row { display:grid; grid-template-columns:140px 1fr 44px; gap:10px; align-items:center; color:rgba(226,232,240,.82); font-size:.8rem; font-weight:800; }
      .slda-track { height:8px; border-radius:999px; background:rgba(148,163,184,.14); overflow:hidden; }
      .slda-fill { height:100%; border-radius:inherit; background:linear-gradient(90deg,#7dff98,#ffd34f,#ff6b62); }
      .slda-section-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:12px; }
      .slda-chip { border:1px solid rgba(125,255,152,.24); background:rgba(125,255,152,.08); color:#7dff98; border-radius:999px; padding:7px 10px; font-size:.62rem; font-weight:950; letter-spacing:.12em; text-transform:uppercase; white-space:nowrap; }
      .slda-fov-stage { border:1px solid rgba(148,163,184,.14); border-radius:16px; background:radial-gradient(circle at 10% 42%,rgba(125,255,152,.07),transparent 34%), radial-gradient(circle at 90% 50%,rgba(255,96,88,.07),transparent 34%), rgba(255,255,255,.022); min-height:390px; overflow:hidden; }
      .slda-fov-stage svg { display:block; width:100%; height:100%; min-height:390px; }
      .slda-action-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
      .slda-action-card { border:1px solid rgba(125,255,152,.14); border-radius:12px; background:rgba(125,255,152,.035); padding:10px; color:rgba(226,232,240,.74); font-size:.76rem; line-height:1.35; }
      .slda-action-card strong { display:block; color:#7dff98; margin-bottom:4px; }
      .slda-recommendation { border:1px solid rgba(255,211,79,.20); background:rgba(255,211,79,.06); border-radius:14px; padding:12px; color:rgba(226,232,240,.84); line-height:1.48; font-size:.82rem; margin-top:12px; }
      .slda-chart { border:1px solid rgba(148,163,184,.14); border-radius:14px; background:rgba(255,255,255,.022); overflow:hidden; margin-top:12px; }
      .slda-carry { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
      .slda-carry button { border:1px solid rgba(125,255,152,.30); background:rgba(125,255,152,.10); color:#7dff98; border-radius:10px; padding:9px 12px; font-weight:900; cursor:pointer; }
      @media (max-width:920px) {
        .slda-grid-2, .slda-mini-grid, .slda-target-grid, .slda-scenario-strip, .slda-action-grid, .slda-assumption-grid { grid-template-columns:1fr; }
        .slda-head, .slda-section-head { display:grid; }
        .slda-driver-row { grid-template-columns:1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function fmt(v, d = 1) { return num(v, 0).toFixed(d); }
  function ft(v) { return fmt(v, 1) + " ft"; }
  function mm(v) { return fmt(v, 1) + " mm"; }
  function ppf(v) { return Number(v) > 0 ? fmt(v, 1) + " PPF" : "No prior PPF"; }
  function meters(v) { return fmt(num(v, 0) * 0.3048, 1) + " m"; }

  function statusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "healthy") return "healthy";
    if (s === "watch") return "watch";
    return "risk";
  }

  function pressureStatus(v) {
    if (v <= 25) return "HEALTHY";
    if (v <= 60) return "WATCH";
    return "RISK";
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function nearestLens(target) {
    const list = [2.8, 3.6, 4, 6, 8, 12, 16, 25, 35, 50];
    return list.reduce((best, lens) => Math.abs(lens - target) < Math.abs(best - target) ? lens : best, list[0]);
  }

  function baseFromLive(data) {
    const distanceFt = num(data.dist, 0);
    const sceneWidthFt = num(data.tw, 0);
    const sensorWidthMm = num(data.sw, 6.4);
    const lensMm = num(data.selectedLens || data.adjustedFocal, 8);
    const calculatedLensMm = num(data.calculatedTargetFocal || data.baseFocal, 0);
    const framedWidthFt = lensMm > 0 ? (distanceFt * sensorWidthMm) / lensMm : sceneWidthFt;

    return {
      key: "live",
      label: "Custom Design",
      distanceFt,
      sceneWidthFt,
      sensorWidthMm,
      cameraFormatLabel: data.cameraFormatLabel || "",
      lensMm,
      calculatedLensMm,
      framedWidthFt,
      availablePpf: num(data.ppf, 0),
      coverageCount: 1,
      sourceStatus: data.status || "WATCH",
      sourceGuidance: data.guidance || "",
      sourceDominant: data.dominantConstraint || "",
      lensClass: data.lensClass || ""
    };
  }

  function evaluate(input) {
    const requiredWidthPerCamera = input.sceneWidthFt / Math.max(1, input.coverageCount);
    const framedWidthFt = input.lensMm > 0 ? (input.distanceFt * input.sensorWidthMm) / input.lensMm : input.sceneWidthFt;
    const calculatedLensMm = input.calculatedLensMm || ((input.sensorWidthMm * input.distanceFt) / Math.max(0.1, requiredWidthPerCamera));
    const fitRatio = calculatedLensMm > 0 ? input.lensMm / calculatedLensMm : 1;
    const coverageRatio = framedWidthFt / Math.max(0.1, requiredWidthPerCamera);

    const horizontalPixels = num(input.horizontalPixels, 0);
    const requiredPpf = num(input.requiredPpf, 0);
    const availablePpf = horizontalPixels > 0 && framedWidthFt > 0
      ? horizontalPixels / framedWidthFt
      : num(input.availablePpf, 0);

    const coveragePressure = coverageRatio >= 1 ? 15 : Math.min(100, Math.round((1 - coverageRatio) * 120));

    const detailPressure = requiredPpf > 0 && availablePpf > 0
      ? availablePpf >= requiredPpf ? 15
      : availablePpf >= requiredPpf * 0.85 ? 45
      : availablePpf >= requiredPpf * 0.55 ? 70
      : 92
      : availablePpf > 0
        ? availablePpf >= 120 ? 15 : availablePpf >= 80 ? 35 : availablePpf >= 40 ? 65 : 90
        : 55;

    const lensPressure = fitRatio >= 0.85 && fitRatio <= 1.45 ? 20 : fitRatio < 0.85 ? 82 : 58;
    const pressure = Math.max(coveragePressure, detailPressure, lensPressure);
    const status = input.key === "live" ? pressureStatus(pressure) : pressureStatus(pressure);

    let blocker = "Balanced";
    if (pressure === detailPressure) blocker = "Detail viability";
    if (pressure === coveragePressure) blocker = "Coverage fit";
    if (pressure === lensPressure) blocker = "Lens class";

    const overlapFraction = input.coverageCount > 1 ? 0.15 : 0;
    const overlapWidthFt = requiredWidthPerCamera * overlapFraction;
    const centerSpacingFt = input.coverageCount > 1 ? Math.max(0, requiredWidthPerCamera - overlapWidthFt) : 0;
    const totalSpan = centerSpacingFt * Math.max(0, input.coverageCount - 1);
    const cameraPositionsFt = [];

    for (let i = 0; i < input.coverageCount; i++) {
      cameraPositionsFt.push(input.coverageCount === 1 ? 0 : -totalSpan / 2 + centerSpacingFt * i);
    }

    return Object.assign({}, input, {
      requiredWidthPerCamera,
      framedWidthFt,
      calculatedLensMm,
      fitRatio,
      horizontalPixels,
      requiredPpf,
      availablePpf,
      coveragePressure,
      detailPressure,
      lensPressure,
      pressure,
      status,
      coverageStatus: pressureStatus(coveragePressure),
      detailStatus: pressureStatus(detailPressure),
      blocker,
      recommendedOverlapFraction: overlapFraction,
      overlapWidthFt,
      centerSpacingFt,
      cameraPositionsFt
    });
  }

  function formatLabelForSensor(sensorWidthMm) {
    const value = String(sensorWidthMm);
    if (value === "4.8") return "1/3 in approx";
    if (value === "5.57") return "1/2.8 in common";
    if (value === "6.4") return "1/2 in approx";
    if (value === "7.68") return "1/1.8 in approx";
    if (value === "12.8") return "1 in approx";
    return "Custom format";
  }

  function readCustomSaved(target, base) {
    try {
      const saved = JSON.parse(target.getAttribute("data-slda-custom") || "{}");
      return {
        key: "live",
        label: "Custom Design",
        distanceFt: num(saved.distanceFt, base.distanceFt),
        sceneWidthFt: num(saved.sceneWidthFt, base.sceneWidthFt),
        sensorWidthMm: num(saved.sensorWidthMm, base.sensorWidthMm),
        cameraFormatLabel: saved.cameraFormatLabel || formatLabelForSensor(num(saved.sensorWidthMm, base.sensorWidthMm)),
        lensMm: num(saved.lensMm, base.lensMm),
        calculatedLensMm: 0,
        framedWidthFt: 0,
        horizontalPixels: num(saved.horizontalPixels, base.horizontalPixels || 1920),
        requiredPpf: num(saved.requiredPpf, base.requiredPpf || 150),
        availablePpf: 0,
        coverageCount: Math.max(1, Math.min(4, Math.round(num(saved.coverageCount, base.coverageCount || 1)))),
        sourceStatus: "",
        sourceGuidance: "",
        sourceDominant: "",
        lensClass: base.lensClass || ""
      };
    } catch (error) {
      return Object.assign({}, base, {
        key: "live",
        label: "Custom Design",
        calculatedLensMm: 0,
        horizontalPixels: base.horizontalPixels || 1920,
        requiredPpf: base.requiredPpf || 150,
        availablePpf: 0
      });
    }
  }

  function readCustomFromDom(target, base) {
    const value = name => {
      const el = target.querySelector('[data-slda-input="' + name + '"]');
      return el ? el.value : "";
    };

    const sensorWidthMm = num(value("sensorWidthMm"), base.sensorWidthMm);

    return {
      distanceFt: num(value("distanceFt"), base.distanceFt),
      sceneWidthFt: num(value("sceneWidthFt"), base.sceneWidthFt),
      lensMm: num(value("lensMm"), base.lensMm),
      sensorWidthMm,
      cameraFormatLabel: formatLabelForSensor(sensorWidthMm),
      horizontalPixels: num(value("horizontalPixels"), 1920),
      requiredPpf: num(value("requiredPpf"), 150),
      coverageCount: Math.max(1, Math.min(4, Math.round(num(value("coverageCount"), 1))))
    };
  }

  function optionList(values, selected, suffix) {
    return values.map(value => {
      const display = suffix ? value.label : value;
      const optionValue = suffix ? value.value : value;
      return '<option value="' + optionValue + '"' + (String(optionValue) === String(selected) ? ' selected' : '') + '>' + display + '</option>';
    }).join("");
  }

  function renderCustomEditor(active) {
    if (active.key !== "live") return "";

    const lensValues = [2.8, 3.6, 4, 6, 8, 12, 16, 25, 35, 50];
    const formatValues = [
      { value: 4.8, label: "1/3 in approx" },
      { value: 5.57, label: "1/2.8 in common" },
      { value: 6.4, label: "1/2 in approx" },
      { value: 7.68, label: "1/1.8 in approx" },
      { value: 12.8, label: "1 in approx" }
    ];
    const resolutionValues = [
      { value: 1280, label: "1280 px / 720p" },
      { value: 1920, label: "1920 px / 1080p" },
      { value: 2560, label: "2560 px / 4MP" },
      { value: 3840, label: "3840 px / 4K" },
      { value: 7680, label: "7680 px / 8K" }
    ];
    const detailValues = [
      { value: 80, label: "Observation / general" },
      { value: 150, label: "Recognition-level detail" },
      { value: 250, label: "Identification-level detail" },
      { value: 300, label: "High-detail review" }
    ];
    const coverageValues = [
      { value: 1, label: "Single camera" },
      { value: 2, label: "Split coverage / 2 cameras" },
      { value: 3, label: "Split coverage / 3 cameras" },
      { value: 4, label: "Split coverage / 4 cameras" }
    ];

    return '<div class="slda-custom-editor">' +
      '<div class="slda-custom-head">' +
        '<div>' +
          '<div class="slda-kicker">Custom planning assumptions</div>' +
          '<p class="slda-copy">Edit the design assumptions here to test lens size, camera format, resolution, detail target, and split coverage without leaving the assistant.</p>' +
        '</div>' +
        '<div class="slda-chip">Custom What-If</div>' +
      '</div>' +
      '<div class="slda-assumption-grid">' +
        '<div class="slda-field"><label>Distance to target</label><input data-slda-input="distanceFt" type="number" min="1" step="1" value="' + fmt(active.distanceFt, 0) + '"></div>' +
        '<div class="slda-field"><label>Required scene width</label><input data-slda-input="sceneWidthFt" type="number" min="1" step="1" value="' + fmt(active.sceneWidthFt, 0) + '"></div>' +
        '<div class="slda-field"><label>Selected / available lens</label><select data-slda-input="lensMm">' + optionList(lensValues, active.lensMm) + '</select></div>' +
        '<div class="slda-field"><label>Camera format</label><select data-slda-input="sensorWidthMm">' + optionList(formatValues, active.sensorWidthMm, true) + '</select></div>' +
        '<div class="slda-field"><label>Horizontal pixels</label><select data-slda-input="horizontalPixels">' + optionList(resolutionValues, active.horizontalPixels || 1920, true) + '</select></div>' +
        '<div class="slda-field"><label>Detail requirement</label><select data-slda-input="requiredPpf">' + optionList(detailValues, active.requiredPpf || 150, true) + '</select></div>' +
        '<div class="slda-field"><label>Coverage strategy</label><select data-slda-input="coverageCount">' + optionList(coverageValues, active.coverageCount || 1, true) + '</select></div>' +
      '</div>' +
    '</div>';
  }

  function scenariosFrom(base, customBase) {
    const live = evaluate(Object.assign({}, customBase || base, {
      key: "live",
      label: "Custom Design"
    }));

    const splitCount = Math.min(4, Math.max(2, Math.ceil(live.sceneWidthFt / Math.max(1, live.framedWidthFt * 0.85))));
    const splitLensTarget = (live.sensorWidthMm * live.distanceFt) / Math.max(0.1, live.sceneWidthFt / splitCount);

    return [
      live,
      evaluate(Object.assign({}, live, { key: "split", label: "Suggested Split", coverageCount: splitCount, lensMm: nearestLens(splitLensTarget), calculatedLensMm: splitLensTarget })),
      evaluate(Object.assign({}, live, { key: "optimized", label: "Lens for Required Width", lensMm: nearestLens(live.calculatedLensMm), calculatedLensMm: live.calculatedLensMm })),
      evaluate(Object.assign({}, live, { key: "tighter", label: "Tighter Lens", lensMm: nearestLens(Math.max(live.lensMm, live.calculatedLensMm)), calculatedLensMm: live.calculatedLensMm }))
    ];
  }

  function driverTitle(d) {
    if (d.blocker === "Detail viability") return "Detail requirement is the dominant limiter.";
    if (d.blocker === "Coverage fit") return "Selected lens does not cover the required width.";
    if (d.blocker === "Lens class") return "Lens class is creating planning pressure.";
    return "Lens framing and detail are reasonably aligned.";
  }

  function driverSummary(d) {
    if (d.sourceDominant) return d.sourceDominant;
    if (d.blocker === "Detail viability") return "The selected lens may frame the scene, but the current detail context is not strong enough to treat the result as final.";
    if (d.blocker === "Coverage fit") return "The selected lens is too tight for the required scene width at the selected distance and camera format.";
    if (d.blocker === "Lens class") return "The selected or required focal length is outside a comfortable planning range and should be checked against real lens availability.";
    return "The selected design is within current planning guardrails, pending manufacturer FOV validation.";
  }

  function designText(d) {
    if (d.sourceGuidance) return d.sourceGuidance;
    if (d.detailStatus !== "HEALTHY") return "<strong>Changing lens size alone may not be enough.</strong> Confirm pixel density, detail requirement, and whether the scene should be split across more cameras.";
    if (d.coverageStatus !== "HEALTHY") return "<strong>The selected lens does not cover the required scene width.</strong> Use a wider lens, increase distance, or split the scene.";
    if (d.lensPressure > 60) return "<strong>The design may work, but lens class is under pressure.</strong> Verify availability, depth of field, mounting precision, and manufacturer FOV data.";
    return "<strong>This scenario is within current planning guardrails.</strong> Validate field of view and image quality before relying on it.";
  }

  function signedFt(v) {
    if (Math.abs(v) < 0.05) return "0 ft";
    return (v > 0 ? "+" : "") + fmt(v, 1) + " ft";
  }

  function renderFov(d) {
    const width = 920, height = 390, camX = 112, targetX = 785, centerY = 180, axisY = 328;
    const visualWidthFt = Math.max(d.sceneWidthFt, d.framedWidthFt, d.requiredWidthPerCamera, d.sceneWidthFt * 1.12, 1);
    const pxPerFt = 220 / visualWidthFt;
    const yFor = pos => centerY + pos * pxPerFt;
    const statusColor = s => s === "HEALTHY" ? "#7dff98" : s === "WATCH" ? "#ffd34f" : "#ff8f88";
    const detailBand = stepWidth => {
      if (!d.availablePpf) return "rgba(255,211,79,.16)";
      const stepPpf = d.availablePpf * (d.framedWidthFt / Math.max(0.1, stepWidth));
      if (stepPpf >= 120) return "rgba(125,255,152,.20)";
      if (stepPpf >= 80) return "rgba(255,211,79,.20)";
      return "rgba(255,96,88,.20)";
    };

    const sceneTop = yFor(-d.sceneWidthFt / 2);
    const sceneBottom = yFor(d.sceneWidthFt / 2);
    const cone = [], lines = [], centers = [], cams = [], rail = [], overlaps = [];
    const steps = 28;

    d.cameraPositionsFt.forEach((centerPos, idx) => {
      const camY = yFor(centerPos);
      const halfTarget = d.framedWidthFt * pxPerFt / 2;

      for (let step = 1; step <= steps; step++) {
        const t1 = (step - 1) / steps, t2 = step / steps;
        const x1 = camX + (targetX - camX) * t1;
        const x2 = camX + (targetX - camX) * t2;
        const h1 = d.framedWidthFt * t1 * pxPerFt / 2;
        const h2 = d.framedWidthFt * t2 * pxPerFt / 2;
        cone.push(`<path d="M ${x1.toFixed(1)} ${(camY - h1).toFixed(1)} L ${x2.toFixed(1)} ${(camY - h2).toFixed(1)} L ${x2.toFixed(1)} ${(camY + h2).toFixed(1)} L ${x1.toFixed(1)} ${(camY + h1).toFixed(1)} Z" fill="${detailBand(d.framedWidthFt * t2)}" />`);
      }

      lines.push(`<line x1="${camX}" y1="${camY.toFixed(1)}" x2="${targetX}" y2="${(camY - halfTarget).toFixed(1)}" stroke="rgba(226,232,240,.32)" stroke-width="1" /><line x1="${camX}" y1="${camY.toFixed(1)}" x2="${targetX}" y2="${(camY + halfTarget).toFixed(1)}" stroke="rgba(226,232,240,.32)" stroke-width="1" />`);
      centers.push(`<line x1="${camX}" y1="${camY.toFixed(1)}" x2="${targetX}" y2="${camY.toFixed(1)}" stroke="rgba(226,232,240,.20)" stroke-dasharray="5 7" />`);
      cams.push(`<circle cx="${camX}" cy="${camY.toFixed(1)}" r="10" fill="rgba(125,255,152,.13)" stroke="rgba(125,255,152,.78)" stroke-width="2" /><text x="${camX - 3}" y="${(camY + 4).toFixed(1)}" text-anchor="middle" fill="rgba(248,250,252,.90)" font-size="9" font-weight="950">${idx + 1}</text>`);
      rail.push(`<rect x="22" y="${(camY - 12).toFixed(1)}" width="64" height="24" rx="7" fill="rgba(2,6,12,.76)" stroke="rgba(125,255,152,.24)" /><text x="54" y="${(camY + 4).toFixed(1)}" text-anchor="middle" fill="rgba(248,250,252,.84)" font-size="10" font-weight="900">Cam ${idx + 1}</text>`);
    });

    const tickStep = d.distanceFt <= 30 ? 5 : d.distanceFt <= 80 ? 10 : d.distanceFt <= 160 ? 25 : 50;
    const ticks = [];
    for (let dist = 0; dist <= d.distanceFt; dist += tickStep) ticks.push(dist);
    if (ticks[ticks.length - 1] !== d.distanceFt) ticks.push(d.distanceFt);

    const tickSvg = ticks.map(dist => {
      const x = camX + (targetX - camX) * (dist / Math.max(1, d.distanceFt));
      return `<line x1="${x.toFixed(1)}" y1="${axisY - 7}" x2="${x.toFixed(1)}" y2="${axisY + 7}" stroke="rgba(226,232,240,.35)" /><text x="${x.toFixed(1)}" y="${axisY + 22}" text-anchor="middle" fill="rgba(226,232,240,.70)" font-size="9" font-weight="800">${fmt(dist, 0)} ft</text><text x="${x.toFixed(1)}" y="${axisY + 36}" text-anchor="middle" fill="rgba(226,232,240,.45)" font-size="8" font-weight="700">${meters(dist)}</text>`;
    }).join("");

    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Field of view coverage visualization">
      <rect width="${width}" height="${height}" fill="rgba(2,6,12,.18)" />
      <text x="22" y="28" fill="rgba(125,255,152,.92)" font-size="11" font-weight="950" letter-spacing="1.5">FOV / COVERAGE LAYOUT</text>
      <text x="22" y="49" fill="rgba(248,250,252,.82)" font-size="13" font-weight="900">${d.coverageCount} camera${d.coverageCount === 1 ? "" : "s"} | ${fmt(d.lensMm, 1)} mm lens | ${fmt(d.distanceFt, 0)} ft / ${meters(d.distanceFt)} distance | ${ppf(d.availablePpf)}</text>
      <text x="22" y="70" fill="rgba(203,213,225,.66)" font-size="11">Per-camera required width: ${ft(d.requiredWidthPerCamera)} | total scene: ${ft(d.sceneWidthFt)} / ${meters(d.sceneWidthFt)} | status: ${d.status}</text>
      ${rail.join("")}${cone.join("")}${centers.join("")}${lines.join("")}${cams.join("")}
      <line x1="${targetX}" y1="${sceneTop.toFixed(1)}" x2="${targetX}" y2="${sceneBottom.toFixed(1)}" stroke="${statusColor(d.status)}" stroke-width="3" />
      <text x="${targetX - 144}" y="${(sceneTop - 10).toFixed(1)}" fill="${statusColor(d.status)}" font-size="11" font-weight="950">Total required scene ${ft(d.sceneWidthFt)} / ${meters(d.sceneWidthFt)}</text>
      <line x1="${targetX + 54}" y1="${sceneTop.toFixed(1)}" x2="${targetX + 54}" y2="${sceneBottom.toFixed(1)}" stroke="rgba(226,232,240,.36)" stroke-dasharray="6 6" />
      <line x1="${camX}" y1="${axisY}" x2="${targetX}" y2="${axisY}" stroke="rgba(226,232,240,.30)" />
      ${tickSvg}
      <text x="${((camX + targetX) / 2).toFixed(1)}" y="${axisY - 18}" text-anchor="middle" fill="rgba(248,250,252,.74)" font-size="10" font-weight="900">Target distance: ${fmt(d.distanceFt, 0)} ft / ${meters(d.distanceFt)}</text>
      <text x="22" y="${height - 18}" fill="${statusColor(d.coverageStatus)}" font-size="10" font-weight="900">Coverage: ${d.coverageStatus}</text>
      <text x="132" y="${height - 18}" fill="${statusColor(d.detailStatus)}" font-size="10" font-weight="900">Detail: ${d.detailStatus}</text>
      <text x="232" y="${height - 18}" fill="rgba(226,232,240,.62)" font-size="10" font-weight="800">Left labels identify each camera. Position values are listed in the Camera Positions card.</text>
    </svg>`;
  }

  function renderChart(scenarios, activeKey) {
    const width = 920, height = 260, left = 70, right = 860, top = 34, bottom = 210;
    const x = i => left + (right - left) * (i / Math.max(1, scenarios.length - 1));
    const y = v => bottom - (bottom - top) * (v / 100);
    const color = s => s === "HEALTHY" ? "#7dff98" : s === "WATCH" ? "#ffd34f" : "#ff8f88";
    const path = scenarios.map((s, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(s.pressure).toFixed(1)}`).join(" ");
    const points = scenarios.map((s, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(s.pressure).toFixed(1)}" r="${s.key === activeKey ? 8 : 6}" fill="${color(s.status)}" stroke="#fff" stroke-width="2" /><text x="${x(i).toFixed(1)}" y="${(y(s.pressure) - 14).toFixed(1)}" text-anchor="middle" fill="${color(s.status)}" font-size="11" font-weight="950">${s.pressure}</text><text x="${x(i).toFixed(1)}" y="236" text-anchor="middle" fill="rgba(226,232,240,.72)" font-size="10" font-weight="850">${esc(s.label)}</text>`).join("");

    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Scenario pressure comparison">
      <rect width="${width}" height="${height}" fill="rgba(2,6,12,.18)" />
      <rect x="${left}" y="${y(25)}" width="${right - left}" height="${y(0) - y(25)}" fill="rgba(125,255,152,.10)" />
      <rect x="${left}" y="${y(60)}" width="${right - left}" height="${y(25) - y(60)}" fill="rgba(255,211,79,.075)" />
      <rect x="${left}" y="${y(100)}" width="${right - left}" height="${y(60) - y(100)}" fill="rgba(255,96,88,.075)" />
      <text x="${left}" y="22" fill="rgba(248,250,252,.86)" font-size="12" font-weight="950">Planning pressure by scenario</text>
      <text x="${right}" y="22" text-anchor="end" fill="rgba(203,213,225,.60)" font-size="10" font-weight="850">Lower is better</text>
      <path d="${path}" fill="none" stroke="rgba(125,255,152,.95)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${points}
    </svg>`;
  }

  function buildHtml(active, scenarios) {
    const suggestedCameras = Math.max(1, Math.min(4, Math.ceil(active.sceneWidthFt / Math.max(1, active.framedWidthFt * 0.85))));

    return `
      <div class="slda-shell">
        <div class="slda-head">
          <div>
            <div class="slda-kicker">Design Assistant</div>
            <h3 class="slda-title">Lens selection design path</h3>
            <p class="slda-copy">This module checks what the selected lens frames, whether the required scene width is covered, and what should be validated before carrying the design forward.</p>
          </div>
          <div class="slda-status ${statusClass(active.status)}">${active.status}</div>
        </div>

        <div class="slda-tabs">
          ${scenarios.map(s => `<button class="slda-tab ${s.key === active.key ? "is-active" : ""}" type="button" data-slda-scenario="${s.key}">${esc(s.label)}</button>`).join("")}
        </div>

        ${renderCustomEditor(active)}

        <div class="slda-grid-2">
          <div class="slda-panel">
            <div class="slda-kicker">Selected Scenario Result</div>
            <div class="slda-value">${mm(active.lensMm)} lens</div>
            <p class="slda-copy">Selected lens frames about ${ft(active.framedWidthFt)} at ${fmt(active.distanceFt, 0)} ft. Required width per camera is ${ft(active.requiredWidthPerCamera)}.</p>
            <div class="slda-mini-grid">
              <div class="slda-card"><div class="slda-label">Estimated View Width</div><strong class="${statusClass(active.coverageStatus)}">${ft(active.framedWidthFt)}</strong><div class="slda-note">What the selected lens frames.</div></div>
              <div class="slda-card"><div class="slda-label">Required Width</div><strong>${ft(active.requiredWidthPerCamera)}</strong><div class="slda-note">Scene width that must be covered.</div></div>
              <div class="slda-card"><div class="slda-label">Available Detail</div><strong class="${statusClass(active.detailStatus)}">${ppf(active.availablePpf)}</strong><div class="slda-note">Detail context from upstream when available.</div></div>
              <div class="slda-card"><div class="slda-label">Projected Status</div><strong class="${statusClass(active.status)}">${active.status}</strong><div class="slda-note">Combined framing/detail status.</div></div>
            </div>
          </div>

          <div class="slda-panel">
            <div class="slda-kicker">Dominant Driver</div>
            <h3 class="slda-title">${esc(driverTitle(active))}</h3>
            <p class="slda-copy">${esc(driverSummary(active))}</p>
            <div class="slda-driver-stack">
              <div class="slda-driver-row"><span>Coverage fit</span><div class="slda-track"><div class="slda-fill" style="width:${active.coveragePressure}%"></div></div><strong>${active.coveragePressure}%</strong></div>
              <div class="slda-driver-row"><span>Detail viability</span><div class="slda-track"><div class="slda-fill" style="width:${active.detailPressure}%"></div></div><strong>${active.detailPressure}%</strong></div>
              <div class="slda-driver-row"><span>Lens class pressure</span><div class="slda-track"><div class="slda-fill" style="width:${active.lensPressure}%"></div></div><strong>${active.lensPressure}%</strong></div>
            </div>
          </div>
        </div>

        <div class="slda-panel">
          <div class="slda-section-head">
            <div>
              <div class="slda-kicker">FOV / Framing Visualization</div>
              <h3 class="slda-title">What the selected lens sees at the entered distance</h3>
              <p class="slda-copy">The cone uses the selected lens, camera format, and distance to estimate framed width. The required scene width is shown at the target plane.</p>
            </div>
            <div class="slda-chip">Live FOV</div>
          </div>
          <div class="slda-fov-stage">${renderFov(active)}</div>
          <div class="slda-mini-grid">
            <div class="slda-card"><div class="slda-label">Coverage Layout</div><strong>${active.coverageCount} camera${active.coverageCount === 1 ? "" : "s"}</strong><div class="slda-note">Single or split-camera layout.</div></div>
            <div class="slda-card"><div class="slda-label">Recommended Overlap</div><strong>${active.coverageCount === 1 ? "None" : fmt(active.recommendedOverlapFraction * 100, 0) + "% / " + ft(active.overlapWidthFt)}</strong><div class="slda-note">Overlap between adjacent views.</div></div>
            <div class="slda-card"><div class="slda-label">Center Spacing</div><strong>${active.coverageCount === 1 ? "N/A" : ft(active.centerSpacingFt)}</strong><div class="slda-note">Target-plane spacing between view centers.</div></div>
            <div class="slda-card"><div class="slda-label">Camera Positions</div><strong>${active.cameraPositionsFt.map((pos, i) => "Cam " + (i + 1) + " " + signedFt(pos)).join(" | ")}</strong><div class="slda-note">Recommended center positions across scene width.</div></div>
          </div>
        </div>

        <div class="slda-action-grid">
          <div class="slda-action-card"><strong>Coverage check</strong>Does the selected lens frame the required scene width?</div>
          <div class="slda-action-card"><strong>Detail check</strong>Is there enough upstream detail context to trust the lens result?</div>
          <div class="slda-action-card"><strong>Design path</strong>If not acceptable, adjust scene width, camera count, lens, or downstream detail validation.</div>
        </div>

        <div class="slda-panel">
          <div class="slda-section-head">
            <div>
              <div class="slda-kicker">Design Targets / Path to Acceptable</div>
              <h3 class="slda-title">What needs to change to reach a usable design?</h3>
              <p class="slda-copy">This section explains whether changing lens size is enough, or whether the real blocker is scene width, camera count, resolution/detail context, or validation.</p>
            </div>
            <div class="slda-chip">Design Targets</div>
          </div>
          <div class="slda-target-grid">
            <div class="slda-card"><div class="slda-label">Max Width / Camera</div><strong>${ppf(active.availablePpf) === "No prior PPF" ? "Needs PPF" : ft(active.framedWidthFt)}</strong><div class="slda-note">Max framed width depends on detail target.</div></div>
            <div class="slda-card"><div class="slda-label">Suggested Cameras</div><strong>${suggestedCameras} camera${suggestedCameras === 1 ? "" : "s"}</strong><div class="slda-note">Based on selected lens framing pressure.</div></div>
            <div class="slda-card"><div class="slda-label">Lens For Target Width</div><strong>${mm(active.calculatedLensMm)}</strong><div class="slda-note">Calculated lens target before availability check.</div></div>
            <div class="slda-card"><div class="slda-label">Main Blocker</div><strong class="${statusClass(active.status)}">${active.blocker}</strong><div class="slda-note">Main condition keeping this scenario from healthy.</div></div>
          </div>
          <div class="slda-recommendation">${designText(active)}</div>
        </div>

        <div class="slda-panel">
          <div class="slda-section-head">
            <div>
              <div class="slda-kicker">Scenario Comparison</div>
              <h3 class="slda-title">Original vs design paths</h3>
              <p class="slda-copy">The chart compares planning pressure. Lower is better. A selected lens can still be risky when detail context is missing or the view is too wide.</p>
            </div>
            <div class="slda-chip">Scenario Analytics</div>
          </div>
          <div class="slda-scenario-strip">
            <div class="slda-card"><div class="slda-label">Selected Path</div><strong>${esc(active.label)}</strong><div class="slda-note">Scenario currently selected.</div></div>
            <div class="slda-card"><div class="slda-label">Selected Lens</div><strong>${mm(active.lensMm)}</strong><div class="slda-note">Selected or available planning lens size.</div></div>
            <div class="slda-card"><div class="slda-label">Coverage Status</div><strong class="${statusClass(active.coverageStatus)}">${active.coverageStatus}</strong><div class="slda-note">${ft(active.framedWidthFt)} framed vs ${ft(active.requiredWidthPerCamera)} required.</div></div>
            <div class="slda-card"><div class="slda-label">Pressure</div><strong class="${statusClass(active.status)}">${active.pressure} / 100</strong><div class="slda-note">Charted value.</div></div>
          </div>
          <div class="slda-chart">${renderChart(scenarios, active.key)}</div>
          <div class="slda-recommendation">${designText(active)}</div>
        </div>

        <div class="slda-panel">
          <div class="slda-section-head">
            <div>
              <div class="slda-kicker">Pipeline / Report Carry-Forward</div>
              <h3 class="slda-title">Use the selected scenario in the next sanity check</h3>
              <p class="slda-copy">The live tool still keeps the old export path. Report V2 can document the selected lens, calculated target, assumptions, and remaining validation checks.</p>
            </div>
            <div class="slda-chip">Live Shadow Path</div>
          </div>
          <div class="slda-carry">
            <button type="button" data-slda-open-report>Open Report V2</button>
            <span class="slda-copy">Continue uses the existing pipeline button below. Old Export Report remains available in the Documentation & Export card.</span>
          </div>
        </div>
      </div>
    `;
  }

  function render(target, rawData) {
    injectStyles();
    if (!target || !rawData) return;

    const base = baseFromLive(rawData);
    const customBase = readCustomSaved(target, base);
    const scenarios = scenariosFrom(base, customBase);
    const selectedKey = target.getAttribute("data-slda-scenario") || "live";
    const active = scenarios.find(s => s.key === selectedKey) || scenarios[0];

    target.hidden = false;
    target.innerHTML = buildHtml(active, scenarios);

    target.querySelectorAll("[data-slda-scenario]").forEach(button => {
      button.addEventListener("click", () => {
        target.setAttribute("data-slda-scenario", button.getAttribute("data-slda-scenario"));
        render(target, rawData);
      });
    });

    target.querySelectorAll("[data-slda-input]").forEach(input => {
      const eventName = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(eventName, () => {
        const next = readCustomFromDom(target, base);
        target.setAttribute("data-slda-custom", JSON.stringify(next));
        target.setAttribute("data-slda-scenario", "live");
        render(target, rawData);
      });
    });

    const reportBtn = target.querySelector("[data-slda-open-report]");
    if (reportBtn) {
      reportBtn.addEventListener("click", () => {
        const liveBtn = document.getElementById("openReportV2");
        if (liveBtn) liveBtn.click();
      });
    }
  }

  window.ScopedLabsLensDesignAssistant = { render };
})();
