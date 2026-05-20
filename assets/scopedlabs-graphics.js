/*!
 * ScopedLabs Graphics Engine
 * V8-grade foundation for report-safe SVG renderers.
 * Version: scopedlabs-graphics-002-v8
 *
 * Rule: this engine renders visual models. It does not own engineering formulas.
 */
(function () {
  "use strict";

  const VERSION = "scopedlabs-graphics-002-v8";
  const ENGINE = "graphics";
  const renderers = {};

  const theme = {
    text: "rgba(248,250,252,.94)",
    muted: "rgba(226,232,240,.62)",
    covered: "rgba(125,255,152,.86)",
    overlap: "rgba(255,211,79,.86)",
    gap: "rgba(255,138,102,.90)",
    stageStroke: "rgba(125,255,152,.16)"
  };

  const CODES = {
    UNKNOWN_RENDERER: "SL-GFX-UNKNOWN-RENDERER",
    RENDER_EXCEPTION: "SL-GFX-RENDER-EXCEPTION",
    BAD_OUTPUT: "SL-GFX-BAD-OUTPUT",
    CAMERA_LAYOUT_MISSING_SPAN: "SL-GFX-CAMERA-LAYOUT-MISSING-SPAN",
    CAMERA_LAYOUT_BAD_MODEL: "SL-GFX-CAMERA-LAYOUT-BAD-MODEL",
    CAMERA_LAYOUT_BAD_SEGMENTS: "SL-GFX-CAMERA-LAYOUT-BAD-SEGMENTS"
  };

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fmt(value, digits = 1) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits).replace(/\.0$/, "") : "—";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(Number(value)) ? fmt(value, digits) + " ft" : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(Number(value)) ? fmt(value, digits) + "%" : "—";
  }

  function report(payload) {
    const item = Object.assign({ engine: ENGINE }, payload || {});

    if (window.ScopedLabsDiagnostics && typeof window.ScopedLabsDiagnostics.report === "function") {
      return window.ScopedLabsDiagnostics.report(item);
    }

    try {
      if (console && typeof console.warn === "function") {
        console.warn("[" + item.code + "] " + item.message, item);
      }
    } catch {}

    return item;
  }

  function fallbackSvg(code, message, meta = {}) {
    return "" +
      '<svg data-export-svg data-sl-engine="graphics" data-sl-diagnostic-code="' + escapeHtml(code) + '" viewBox="0 0 800 260" role="img" aria-label="ScopedLabs graphics fallback">' +
        '<rect x="24" y="24" width="752" height="212" rx="18" fill="rgba(0,0,0,.16)" stroke="rgba(255,211,79,.35)" />' +
        '<text x="52" y="74" fill="rgba(255,226,128,.96)" font-size="18" font-weight="950">Graphic unavailable</text>' +
        '<text x="52" y="104" fill="rgba(226,232,240,.78)" font-size="13">The tool stayed online, but the visual renderer used a safe fallback.</text>' +
        '<text x="52" y="142" fill="rgba(255,226,128,.92)" font-size="13" font-weight="900">Diagnostic: ' + escapeHtml(code) + '</text>' +
        '<text x="52" y="168" fill="rgba(226,232,240,.68)" font-size="12">' + escapeHtml(message || "Review the renderer model.") + '</text>' +
        '<text x="52" y="200" fill="rgba(226,232,240,.48)" font-size="11">Renderer: ' + escapeHtml(meta.renderer || "unknown") + ' | Tool: ' + escapeHtml(meta.tool || "unknown") + '</text>' +
      '</svg>';
  }

  function normalizeSegments(items, spanFt, kind) {
    const span = Math.max(1, num(spanFt, 1));
    const warnings = [];

    const segments = (Array.isArray(items) ? items : [])
      .map((item, index) => {
        const rawStart = Number(item && item.startFt);
        const rawEnd = Number(item && item.endFt);

        if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) {
          warnings.push(kind + " segment " + index + " missing numeric startFt/endFt");
          return null;
        }

        const startFt = clamp(rawStart, 0, span);
        const endFt = clamp(rawEnd, 0, span);

        if (endFt <= startFt) {
          warnings.push(kind + " segment " + index + " endFt <= startFt");
          return null;
        }

        return Object.assign({}, item, {
          startFt,
          endFt,
          lengthFt: endFt - startFt
        });
      })
      .filter(Boolean);

    return { segments, warnings };
  }

  function validateCameraLayoutModel(model) {
    const errors = [];
    const warnings = [];
    const m = model && typeof model === "object" ? model : {};

    const spanFt = Number(m.protectedSpanFt);

    if (!Number.isFinite(spanFt) || spanFt <= 0) {
      errors.push({
        code: CODES.CAMERA_LAYOUT_MISSING_SPAN,
        message: "camera-layout requires protectedSpanFt greater than 0."
      });
    }

    const safeSpan = Number.isFinite(spanFt) && spanFt > 0 ? spanFt : 1;

    const coverage = normalizeSegments(m.coverageSegments, safeSpan, "coverage");
    const overlap = normalizeSegments(m.overlapSegments, safeSpan, "overlap");
    const gaps = normalizeSegments(m.gapSegments, safeSpan, "gap");

    warnings.push(...coverage.warnings, ...overlap.warnings, ...gaps.warnings);

    const cameras = Array.isArray(m.cameras) ? m.cameras : [];

    const safeCameras = cameras.map((camera, index) => {
      const centerFt = Number(camera && camera.centerFt);

      if (!Number.isFinite(centerFt)) {
        warnings.push("camera " + index + " missing numeric centerFt");
      }

      return Object.assign({}, camera, {
        label: camera && camera.label ? camera.label : "Cam " + (index + 1),
        centerFt: Number.isFinite(centerFt) ? centerFt : safeSpan / 2,
        footprintStartFt: Number.isFinite(Number(camera && camera.footprintStartFt)) ? Number(camera.footprintStartFt) : centerFt,
        footprintEndFt: Number.isFinite(Number(camera && camera.footprintEndFt)) ? Number(camera.footprintEndFt) : centerFt
      });
    });

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      model: Object.assign({}, m, {
        protectedSpanFt: safeSpan,
        cameras: safeCameras,
        coverageSegments: coverage.segments,
        overlapSegments: overlap.segments,
        gapSegments: gaps.segments
      })
    };
  }

  function renderCameraLayoutSvg(model) {
    const validation = validateCameraLayoutModel(model);
    const tool = model && model.tool ? model.tool : "unknown";

    if (validation.warnings.length) {
      report({
        code: CODES.CAMERA_LAYOUT_BAD_SEGMENTS,
        severity: "warn",
        renderer: "camera-layout",
        tool,
        message: "camera-layout rendered with normalized/skipped segments.",
        details: { warnings: validation.warnings }
      });
    }

    if (!validation.ok) {
      const err = validation.errors[0];

      report({
        code: err.code,
        severity: "error",
        renderer: "camera-layout",
        tool,
        message: err.message,
        fallback: "safe SVG fallback"
      });

      return fallbackSvg(err.code, err.message, {
        renderer: "camera-layout",
        tool
      });
    }

    const m = validation.model;
    const spanFt = Math.max(1, num(m.protectedSpanFt, 1));
    const coveredFt = clamp(num(m.coveredSpanFt, 0), 0, spanFt);
    const uncoveredFt = clamp(num(m.uncoveredSpanFt, 0), 0, spanFt);
    const targetOverlapPct = clamp(num(m.targetOverlapPct, 0), 0, 100);
    const actualOverlapPct = clamp(num(m.actualOverlapPct, 0), 0, 100);
    const actualSpacingFt = Math.max(0, num(m.actualSpacingFt, 0));

    const cameras = m.cameras;
    const coverageSegments = m.coverageSegments;
    const overlapSegments = m.overlapSegments;
    const gapSegments = m.gapSegments;

    const width = 800;
    const height = 590;

    const labelX = 52;
    const barX = 304;
    const barW = 304;
    const valueX = 728;
    const barH = 10;
    const row1Y = 72;
    const rowGap = 32;

    const stageX = 34;
    const stageY = 198;
    const stageW = 732;
    const stageH = 360;

    const runX = 126;
    const runY = 452;
    const runW = 536;
    const bandH = 14;

    const camY = 318;
    const coneY = 408;

    const xForFt = (ft) => runX + (clamp(num(ft, 0), 0, spanFt) / spanFt) * runW;

    const coveredPct = clamp((coveredFt / spanFt) * 100, 0, 100);
    const gapPct = clamp((uncoveredFt / spanFt) * 100, 0, 100);

    const coveredBarW = Math.max(8, Math.min(barW, barW * (coveredPct / 100)));
    const gapBarW = uncoveredFt <= 0 ? 8 : Math.max(8, Math.min(barW, barW * (gapPct / 100)));
    const targetOverlapBarW = Math.max(8, Math.min(barW, barW * (targetOverlapPct / 100)));
    const actualOverlapBarW = Math.max(8, Math.min(barW, barW * (actualOverlapPct / 100)));

    const totalOverlapFt = overlapSegments.reduce((sum, item) => sum + Math.max(0, item.endFt - item.startFt), 0);
    const totalOverlapPctOfSpan = spanFt > 0 ? (totalOverlapFt / spanFt) * 100 : 0;

    const overlapTone = targetOverlapPct >= 35
      ? "rgba(255,138,102,.88)"
      : targetOverlapPct >= 25
        ? "rgba(255,211,79,.88)"
        : "rgba(255,226,128,.84)";

    const actualOverlapTone = actualOverlapPct + 0.01 < targetOverlapPct
      ? "rgba(255,211,79,.90)"
      : "rgba(125,255,152,.88)";

    const gapTone = uncoveredFt > 0 ? theme.gap : "rgba(125,255,152,.90)";

    const cameraSvg = cameras.slice(0, 8).map((camera, index) => {
      const centerFt = num(camera.centerFt, spanFt / 2);
      const cx = xForFt(centerFt);
      const left = clamp(xForFt(camera.footprintStartFt), runX, runX + runW);
      const right = clamp(xForFt(camera.footprintEndFt), runX, runX + runW);

      return "" +
        '<path d="M ' + cx.toFixed(1) + ' ' + camY + ' L ' + left.toFixed(1) + ' ' + coneY + ' L ' + right.toFixed(1) + ' ' + coneY + ' Z" fill="rgba(125,255,152,.075)" stroke="rgba(125,255,152,.34)" stroke-width="1.05" />' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + camY + '" r="8.5" fill="rgba(8,18,12,.96)" stroke="rgba(125,255,152,.86)" stroke-width="1.7" />' +
        '<line x1="' + cx.toFixed(1) + '" y1="' + (camY + 10) + '" x2="' + cx.toFixed(1) + '" y2="' + coneY + '" stroke="rgba(226,232,240,.14)" stroke-width="1" stroke-dasharray="4 5" />' +
        '<text x="' + cx.toFixed(1) + '" y="' + (camY - 18) + '" text-anchor="middle" fill="rgba(226,232,240,.70)" font-size="10.5" font-weight="850">' + escapeHtml(camera.label || "Cam " + (index + 1)) + '</text>';
    }).join("");

    const coverageSvg = coverageSegments.map((item) => {
      const x1 = xForFt(item.startFt);
      const x2 = xForFt(item.endFt);
      const w = Math.max(0, x2 - x1);

      return '<rect x="' + x1.toFixed(1) + '" y="' + (runY - bandH / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bandH + '" rx="5" fill="url(#slCoveredBand)" stroke="rgba(125,255,152,.86)" stroke-width="1.2" />';
    }).join("");

    const overlapSvg = overlapSegments.length
      ? overlapSegments.map((item, index) => {
          const x1 = xForFt(item.startFt);
          const x2 = xForFt(item.endFt);
          const w = Math.max(0, x2 - x1);
          const labelXPos = x1 + w / 2;
          const label = w >= 46
            ? '<text x="' + labelXPos.toFixed(1) + '" y="' + (runY + 35 + (index % 2) * 13) + '" text-anchor="middle" fill="rgba(255,230,150,.94)" font-size="10.5" font-weight="900">' + escapeHtml(fmtFt(item.endFt - item.startFt)) + ' overlap</text>'
            : "";

          return '<rect x="' + x1.toFixed(1) + '" y="' + (runY + 12).toFixed(1) + '" width="' + w.toFixed(1) + '" height="8" rx="4" fill="rgba(255,211,79,.82)" stroke="rgba(255,235,168,.90)" stroke-width="1" />' + label;
        }).join("")
      : '<text x="' + (runX + runW - 8) + '" y="' + (runY + 35) + '" text-anchor="end" fill="rgba(255,211,79,.78)" font-size="10.5" font-weight="850">No shared overlap segment</text>';

    const gapSvg = gapSegments.length
      ? gapSegments.map((item, index) => {
          const x1 = xForFt(item.startFt);
          const x2 = xForFt(item.endFt);
          const w = Math.max(0, x2 - x1);
          const labelXPos = x1 + w / 2;
          const labelY = index % 2 === 0 ? runY - 24 : runY + 58;

          return '<rect x="' + x1.toFixed(1) + '" y="' + (runY - bandH / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bandH + '" rx="5" fill="rgba(255,138,102,.18)" stroke="rgba(255,138,102,.90)" stroke-width="1.15" />' +
            '<text x="' + labelXPos.toFixed(1) + '" y="' + labelY + '" text-anchor="middle" fill="rgba(255,188,166,.98)" font-size="11" font-weight="950">' + escapeHtml(fmtFt(item.endFt - item.startFt)) + ' gap</text>';
        }).join("")
      : '<text x="' + (runX + runW - 8) + '" y="' + (runY - 24) + '" text-anchor="end" fill="rgba(125,255,152,.96)" font-size="12" font-weight="950">No modeled gap</text>';

    const cameraNote = cameras.length > 8
      ? '<text x="' + (stageX + stageW - 18) + '" y="' + (stageY + 26) + '" text-anchor="end" fill="rgba(226,232,240,.56)" font-size="10.5">Showing first 8 of ' + cameras.length + ' cameras</text>'
      : "";

    return "" +
      '<svg data-export-svg data-sl-engine="graphics" data-sl-renderer="camera-layout" data-sl-version="' + escapeHtml(VERSION) + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escapeHtml(m.ariaLabel || "ScopedLabs camera layout visualization") + '">' +
        '<defs><linearGradient id="slCoveredBand" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(82,201,112,.62)" /><stop offset="100%" stop-color="rgba(151,255,176,.92)" /></linearGradient><linearGradient id="slGreenBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(84,212,116,.70)" /><stop offset="100%" stop-color="rgba(125,255,152,.90)" /></linearGradient><linearGradient id="slGapBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,211,79,.76)" /><stop offset="100%" stop-color="rgba(255,138,102,.90)" /></linearGradient></defs>' +

        '<text x="52" y="28" fill="' + theme.text + '" font-size="18" font-weight="950">' + escapeHtml(m.title || "Plan view: spacing, overlap, and blind gaps") + '</text>' +
        '<text x="52" y="50" fill="' + theme.muted + '" font-size="12">' + escapeHtml(m.subtitle || "Green is covered, amber is shared overlap, red is uncovered.") + '</text>' +

        '<text x="' + labelX + '" y="' + row1Y + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Required protected span</text>' +
        '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(226,232,240,.26)" />' +
        '<text x="' + valueX + '" y="' + row1Y + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(spanFt)) + '</text>' +

        '<text x="' + labelX + '" y="' + (row1Y + rowGap) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Merged covered span</text>' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + coveredBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#slGreenBar)" />' +
        '<text x="' + valueX + '" y="' + (row1Y + rowGap) + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(coveredFt)) + ' | ' + escapeHtml(fmtPct(coveredPct, 1)) + '</text>' +

        '<text x="' + labelX + '" y="' + (row1Y + rowGap * 2) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Uncovered span</text>' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + gapBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + (uncoveredFt > 0 ? "url(#slGapBar)" : "rgba(125,255,152,.50)") + '" />' +
        '<text x="' + valueX + '" y="' + (row1Y + rowGap * 2) + '" text-anchor="end" fill="' + gapTone + '" font-size="11" font-weight="900">' + escapeHtml(fmtFt(uncoveredFt)) + ' | ' + escapeHtml(fmtPct(gapPct, 1)) + '</text>' +

        '<text x="' + labelX + '" y="' + (row1Y + rowGap * 3) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Target / actual overlap</text>' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 - 8) + '" width="' + targetOverlapBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + overlapTone + '" />' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 + 5) + '" width="' + actualOverlapBarW.toFixed(1) + '" height="4" rx="2" fill="' + actualOverlapTone + '" />' +
        '<text x="' + valueX + '" y="' + (row1Y + rowGap * 3) + '" text-anchor="end" fill="' + overlapTone + '" font-size="11" font-weight="900">Target ' + escapeHtml(fmtPct(targetOverlapPct, 1)) + ' | Actual ' + escapeHtml(fmtPct(actualOverlapPct, 1)) + '</text>' +

        '<rect x="' + stageX + '" y="' + stageY + '" width="' + stageW + '" height="' + stageH + '" rx="18" fill="rgba(0,0,0,.13)" stroke="' + theme.stageStroke + '" />' +
        '<text x="' + (stageX + 18) + '" y="' + (stageY + 26) + '" fill="rgba(125,255,152,.78)" font-size="11" font-weight="950" letter-spacing=".08em">' + escapeHtml(m.stageKicker || "PLAN VIEW / CAMERA LAYOUT") + '</text>' +
        cameraNote +

        '<rect x="' + (stageX + 18) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(125,255,152,.82)" /><text x="' + (stageX + 40) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">covered</text>' +
        '<rect x="' + (stageX + 104) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(255,211,79,.82)" /><text x="' + (stageX + 126) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">overlap</text>' +
        '<rect x="' + (stageX + 192) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(255,138,102,.82)" /><text x="' + (stageX + 214) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">blind gap</text>' +

        cameraSvg +
        '<line x1="' + runX + '" y1="' + runY + '" x2="' + (runX + runW) + '" y2="' + runY + '" stroke="rgba(226,232,240,.28)" stroke-width="1.05" />' +
        coverageSvg +
        overlapSvg +
        gapSvg +
        '<line x1="' + runX + '" y1="' + (runY + 48) + '" x2="' + (runX + runW) + '" y2="' + (runY + 48) + '" stroke="rgba(226,232,240,.34)" stroke-width="1" />' +
        '<line x1="' + runX + '" y1="' + (runY + 41) + '" x2="' + runX + '" y2="' + (runY + 55) + '" stroke="rgba(226,232,240,.40)" stroke-width="1" />' +
        '<line x1="' + (runX + runW) + '" y1="' + (runY + 41) + '" x2="' + (runX + runW) + '" y2="' + (runY + 55) + '" stroke="rgba(226,232,240,.40)" stroke-width="1" />' +
        '<text x="' + (runX + runW / 2) + '" y="' + (runY + 70) + '" text-anchor="middle" fill="rgba(226,232,240,.78)" font-size="11" font-weight="900">Required span: ' + escapeHtml(fmtFt(spanFt)) + ' | Actual spacing: ' + escapeHtml(fmtFt(actualSpacingFt)) + ' | Shared overlap: ' + escapeHtml(fmtFt(totalOverlapFt)) + ' (' + escapeHtml(fmtPct(totalOverlapPctOfSpan, 1)) + ' of span)</text>' +

        '<text x="' + (stageX + 20) + '" y="' + (stageY + stageH - 15) + '" fill="rgba(226,232,240,.56)" font-size="10.5">' + escapeHtml(m.footer || "Validate overlap and gaps before carrying the result forward.") + '</text>' +
      '</svg>';
  }

  function registerRenderer(type, fn) {
    if (!type || typeof fn !== "function") return false;
    renderers[type] = fn;
    return true;
  }

  function render(type, model) {
    const renderer = renderers[type];

    if (typeof renderer !== "function") {
      report({
        code: CODES.UNKNOWN_RENDERER,
        severity: "error",
        renderer: type || "",
        tool: model && model.tool,
        message: "No graphics renderer registered for this type.",
        fallback: "safe SVG fallback"
      });

      return fallbackSvg(CODES.UNKNOWN_RENDERER, "No graphics renderer registered for: " + type, {
        renderer: type || "unknown",
        tool: model && model.tool
      });
    }

    try {
      const output = renderer(model || {});

      if (typeof output !== "string" || !output.includes("<svg")) {
        report({
          code: CODES.BAD_OUTPUT,
          severity: "error",
          renderer: type,
          tool: model && model.tool,
          message: "Renderer did not return SVG output.",
          fallback: "safe SVG fallback"
        });

        return fallbackSvg(CODES.BAD_OUTPUT, "Renderer did not return valid SVG output.", {
          renderer: type,
          tool: model && model.tool
        });
      }

      return output;
    } catch (error) {
      report({
        code: CODES.RENDER_EXCEPTION,
        severity: "error",
        renderer: type,
        tool: model && model.tool,
        message: "Graphics renderer threw an exception.",
        cause: error && error.message,
        fallback: "safe SVG fallback"
      });

      return fallbackSvg(CODES.RENDER_EXCEPTION, error && error.message ? error.message : "Renderer exception.", {
        renderer: type,
        tool: model && model.tool
      });
    }
  }

  registerRenderer("camera-layout", renderCameraLayoutSvg);

  window.ScopedLabsGraphics = {
    version: VERSION,
    codes: CODES,
    theme,
    renderers,
    registerRenderer,
    render,
    renderCameraLayoutSvg,
    validateCameraLayoutModel,
    helpers: {
      escapeHtml,
      fmt,
      fmtFt,
      fmtPct,
      normalizeSegments,
      fallbackSvg,
      report
    }
  };
})();