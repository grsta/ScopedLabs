/*!
 * ScopedLabs Physical Security Graphics Library
 * Category primitives layered on top of /assets/scopedlabs-graphics.js.
 * Version: physical-security-graphics-016-report-visual-contract
 *
 * Rule: render visual models only. Engineering formulas stay in each tool.
 */
(function () {
  "use strict";

  const VERSION = "physical-security-graphics-040-license-plate-green-status-layout";
  const CATEGORY = "physical-security";
  const gfx = window.ScopedLabsGraphics;

  function esc(value) {
    if (gfx && gfx.helpers && typeof gfx.helpers.escapeHtml === "function") return gfx.helpers.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fmt(value, digits = 1) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits).replace(/\.0$/, "") : "?";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(Number(value)) ? fmt(value, digits) + " ft" : "?";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(Number(value)) ? fmt(value, digits) + "%" : "?";
  }

  function fallbackSvg(code, message, meta = {}) {
    return "" +
      '<svg data-export-svg data-sl-engine="physical-security-graphics" data-sl-diagnostic-code="' + esc(code) + '" viewBox="0 0 840 320" role="img" aria-label="ScopedLabs physical security graphics fallback">' +
        '<rect x="24" y="24" width="792" height="272" rx="18" fill="rgba(0,0,0,.16)" stroke="rgba(255,211,79,.35)" />' +
        '<text x="52" y="74" fill="rgba(255,226,128,.96)" font-size="18" font-weight="950">Graphic unavailable</text>' +
        '<text x="52" y="104" fill="rgba(226,232,240,.78)" font-size="13">The page stayed online, but the category renderer used a safe fallback.</text>' +
        '<text x="52" y="142" fill="rgba(255,226,128,.92)" font-size="13" font-weight="900">Diagnostic: ' + esc(code) + '</text>' +
        '<text x="52" y="168" fill="rgba(226,232,240,.68)" font-size="12">' + esc(message || "Review the renderer model.") + '</text>' +
        '<text x="52" y="200" fill="rgba(226,232,240,.48)" font-size="11">Renderer: ' + esc(meta.renderer || "unknown") + ' | Tool: ' + esc(meta.tool || "unknown") + '</text>' +
      '</svg>';
  }

  if (!gfx || typeof gfx.registerRenderer !== "function" || !gfx.CAD) {
    window.ScopedLabsPhysicalSecurityGraphics = {
      version: VERSION,
      category: CATEGORY,
      ready: false,
      reason: "ScopedLabsGraphics CAD kit was not available."
    };
    return;
  }

  const CAD = gfx.CAD;

  const colors = Object.assign({}, CAD.colors, {
    camera: "rgba(125,255,158,.92)",
    required: "rgba(226,232,240,.68)",
    compare: "rgba(226,232,240,.22)",
    axis: "rgba(226,232,240,.36)",
    grid: "rgba(226,232,240,.075)"
  });

  function toneFor(model) {
    const fitClass = String(model && model.fitClass || "").toLowerCase();
    const status = String(model && model.status || "").toLowerCase();
    const ratio = num(model && model.coverageRatio, NaN);

    if (fitClass.includes("narrow") || status.includes("risk") || ratio < 0.9) {
      return {
        label: "NARROW",
        color: "rgba(255,190,120,.88)",
        soft: "rgba(255,190,120,.095)",
        line: "rgba(255,190,120,.74)"
      };
    }

    if (fitClass.includes("wide") || status.includes("watch") || ratio > 1.35) {
      return {
        label: "WIDE",
        color: "rgba(255,211,79,.88)",
        soft: "rgba(255,211,79,.09)",
        line: "rgba(255,211,79,.74)"
      };
    }

    return {
      label: "FIT",
      color: "rgba(125,255,158,.88)",
      soft: "rgba(125,255,158,.075)",
      line: "rgba(125,255,158,.76)"
    };
  }

  function cadGrid(stage) {
    const lines = [];
    const step = 52;

    for (let x = stage.x + step; x < stage.x + stage.width; x += step) {
      lines.push(CAD.line(x, stage.y + 18, x, stage.y + stage.height - 18, {
        stroke: colors.grid,
        width: 0.55
      }));
    }

    for (let y = stage.y + step; y < stage.y + stage.height; y += step) {
      lines.push(CAD.line(stage.x + 18, y, stage.x + stage.width - 18, y, {
        stroke: colors.grid,
        width: 0.55
      }));
    }

    return lines.join("");
  }

  function cameraLensTipX(x) {
    return x + 21;
  }

  function cameraCadIcon(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const stroke = opts.stroke || opts.color || colors.camera;
    const fill = opts.fill || "rgba(15, 23, 42, 0.92)";
    const accent = opts.accent || opts.color || colors.camera;
    const scale = Number.isFinite(Number(opts.scale)) ? Number(opts.scale) : 0.5;
    const dataSymbol = opts.symbol || "camera-cad-small";

    return "" +
      '<g transform="translate(' + fmt(x, 2) + ' ' + fmt(y, 2) + ') scale(' + fmt(scale, 3) + ')" class="sl-cad-camera" data-ps-graphic-part="camera-marker" data-graphics-symbol="' + esc(dataSymbol) + '">' +
        '<rect x="-22" y="-13" width="44" height="26" rx="4" fill="' + esc(fill) + '" stroke="' + esc(stroke) + '" stroke-width="1.7" />' +
        '<path d="M 22 -8 L 42 -14 L 42 14 L 22 8 Z" fill="rgba(15, 23, 42, 0.96)" stroke="' + esc(stroke) + '" stroke-width="1.7" stroke-linejoin="round" />' +
        '<line x1="42" y1="-12" x2="42" y2="12" stroke="' + esc(accent) + '" stroke-width="1.7" stroke-linecap="round" />' +
        '<line x1="-13" y1="-13" x2="-13" y2="13" stroke="rgba(125, 255, 158, 0.38)" stroke-width=".9" />' +
        '<circle cx="-5" cy="0" r="4" fill="none" stroke="rgba(125, 255, 158, 0.55)" stroke-width="1.2" />' +
        '<circle cx="-30" cy="0" r="5" fill="rgba(2, 6, 23, 0.95)" stroke="' + esc(stroke) + '" stroke-width="1.7" />' +
        '<line x1="-25" y1="0" x2="-22" y2="0" stroke="' + esc(stroke) + '" stroke-width="1.7" stroke-linecap="round" />' +
        '<line x1="44" y1="0" x2="70" y2="0" stroke="' + esc(accent) + '" stroke-width="1.2" stroke-dasharray="4 5" stroke-linecap="round" />' +
      '</g>';
  }

  function cameraPlanMarker(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const label = opts.label || "CAMERA";
    const labelOffsetY = Number.isFinite(Number(opts.labelOffsetY)) ? Number(opts.labelOffsetY) : -18;

    return "" +
      CAD.text(x, y + labelOffsetY, label, {
        anchor: "middle",
        fill: opts.labelFill || "rgba(226, 232, 240, 0.92)",
        size: opts.labelSize || 8.2,
        weight: 900,
        spacing: ".08em"
      }) +
      cameraCadIcon(x, y, Object.assign({}, opts, {
        scale: Number.isFinite(Number(opts.scale)) ? Number(opts.scale) : 0.5
      }));
  }

  function fovCone(lensTipX, centerY, targetX, topY, bottomY, options) {
    const opts = options && typeof options === "object" ? options : {};

    return '<path data-ps-graphic-part="fov-cone" d="M ' +
      fmt(lensTipX, 2) + ' ' + fmt(centerY, 2) +
      ' L ' + fmt(targetX, 2) + ' ' + fmt(topY, 2) +
      ' L ' + fmt(targetX, 2) + ' ' + fmt(bottomY, 2) +
      ' Z" fill="' + esc(opts.fill || colors.greenSoft) +
      '" stroke="' + esc(opts.stroke || colors.green) +
      '" stroke-width="' + esc(opts.width || 1.05) + '" />';
  }

  function targetPlane(x, y1, y2, label, value, options) {
    const opts = options && typeof options === "object" ? options : {};
    const color = opts.color || colors.green;
    const tick = opts.tick ?? 8;
    const labelY = opts.labelY ?? Math.max(68, Math.min(y1, y2) - 18);
    const valueY = opts.valueY ?? Math.min(300, Math.max(y1, y2) + 24);

    return "" +
      '<g data-ps-graphic-part="target-plane">' +
        CAD.line(x, y1, x, y2, {
          stroke: color,
          width: opts.width || 1.45,
          linecap: "round"
        }) +
        CAD.line(x - tick, y1, x + tick, y1, {
          stroke: color,
          width: 0.8
        }) +
        CAD.line(x - tick, y2, x + tick, y2, {
          stroke: color,
          width: 0.8
        }) +
        CAD.text(x, labelY, label, {
          anchor: "middle",
          fill: opts.labelFill || color,
          size: 8.4,
          weight: 900,
          spacing: ".09em"
        }) +
        CAD.text(x, valueY, value, {
          anchor: "middle",
          fill: opts.valueFill || "rgba(248,250,252,.72)",
          size: 9.2,
          weight: 850
        }) +
      '</g>';
  }

  function dimensionLine(x1, y1, x2, y2, label, options) {
    return CAD.dimensionLine(x1, y1, x2, y2, label, options);
  }

  function axisLine(x1, y1, x2, y2, label, options) {
    return CAD.axisLine(x1, y1, x2, y2, label, options);
  }

  function metricChip(x, y, label, value, options) {
    return CAD.metricChip(x, y, label, value, options);
  }

  function statusPill(x, y, label, options) {
    return CAD.statusPill(x, y, label, options);
  }

  function cameraPositionMarker(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const color = opts.color || colors.camera;
    const label = opts.label || "";
    const r = Number.isFinite(Number(opts.radius)) ? Number(opts.radius) : 4.5;

    return "" +
      '<g data-ps-graphic-part="camera-position-marker">' +
        '<circle cx="' + fmt(x, 2) + '" cy="' + fmt(y, 2) + '" r="' + fmt(r + 9, 2) + '" fill="rgba(125,255,158,.035)" stroke="rgba(125,255,158,.18)" stroke-width=".85" />' +
        '<circle cx="' + fmt(x, 2) + '" cy="' + fmt(y, 2) + '" r="' + fmt(r, 2) + '" fill="' + esc(color) + '" />' +
        (label ? CAD.text(opts.labelX ?? (x - 18), opts.labelY ?? (y - 13), label, {
          fill: opts.labelFill || "rgba(248,250,252,.68)",
          size: opts.labelSize || 8.8,
          weight: 900
        }) : "") +
      '</g>';
  }

  function coverageFootprint(x, y, width, height, options) {
    const opts = options && typeof options === "object" ? options : {};
    const reserveRatio = clamp(num(opts.reserveRatio, 0.15), 0, 0.45);
    const reserveEach = Math.max(0, width * reserveRatio / 2);
    const usableX = x + reserveEach;
    const usableWidth = Math.max(1, width - reserveEach * 2);
    const rawStroke = opts.rawStroke || "rgba(125,255,158,.34)";
    const usableStroke = opts.usableStroke || colors.green;
    const reserveFill = opts.reserveFill || colors.amberSoft;

    return "" +
      '<g data-ps-graphic-part="coverage-footprint">' +
        CAD.rect(x, y, width, height, {
          rx: opts.rx ?? 14,
          fill: opts.rawFill || "rgba(125,255,158,.045)",
          stroke: rawStroke,
          strokeWidth: opts.rawStrokeWidth || 1.05
        }) +
        CAD.rect(x, y, reserveEach, height, {
          rx: opts.rx ?? 14,
          fill: reserveFill,
          stroke: opts.reserveStroke || "rgba(255,211,79,.24)",
          strokeWidth: 0.75
        }) +
        CAD.rect(x + width - reserveEach, y, reserveEach, height, {
          rx: opts.rx ?? 14,
          fill: reserveFill,
          stroke: opts.reserveStroke || "rgba(255,211,79,.24)",
          strokeWidth: 0.75
        }) +
        CAD.rect(usableX, y + (opts.usableInsetY ?? 12), usableWidth, Math.max(1, height - (opts.usableInsetY ?? 12) * 2), {
          rx: opts.usableRx ?? 10,
          fill: opts.usableFill || colors.greenSoft,
          stroke: usableStroke,
          strokeWidth: opts.usableStrokeWidth || 1.1
        }) +
        (opts.label ? CAD.text(x + width / 2, y + height / 2 + 4, opts.label, {
          anchor: "middle",
          fill: opts.labelFill || colors.green,
          size: opts.labelSize || 10.5,
          weight: 950,
          spacing: ".06em"
        }) : "") +
      '</g>';
  }

  function semanticBand(x, y, width, height, options) {
    const opts = options && typeof options === "object" ? options : {};
    return "" +
      '<g data-ps-graphic-part="' + esc(opts.part || "semantic-band") + '">' +
        CAD.rect(x, y, width, height, {
          rx: opts.rx ?? 10,
          fill: opts.fill || colors.greenSoft,
          stroke: opts.stroke || colors.green,
          strokeWidth: opts.strokeWidth || 1.05
        }) +
        (opts.label ? CAD.text(x + width / 2, y - 8, opts.label, {
          anchor: "middle",
          fill: opts.labelFill || opts.stroke || colors.green,
          size: opts.labelSize || 9.5,
          weight: 950,
          spacing: ".05em"
        }) : "") +
      '</g>';
  }

  function overlapBand(x, y, width, height, options) {
    return semanticBand(x, y, width, height, Object.assign({
      part: "overlap-band",
      fill: colors.amberSoft,
      stroke: colors.amber,
      label: "OVERLAP"
    }, options || {}));
  }

  function blindGap(x, y, width, height, options) {
    return semanticBand(x, y, width, height, Object.assign({
      part: "blind-gap",
      fill: colors.redSoft,
      stroke: colors.red,
      label: "BLIND GAP"
    }, options || {}));
  }

  function spanLinks(x1, yTop1, yBottom1, x2, yTop2, yBottom2) {
    return CAD.line(x1, yTop1, x2, yTop2, {
      stroke: colors.compare,
      width: 0.75,
      dash: "4 8"
    }) +
    CAD.line(x1, yBottom1, x2, yBottom2, {
      stroke: colors.compare,
      width: 0.75,
      dash: "4 8"
    });
  }

  function hfovCallout(x, y, targetX, topY, bottomY, label, options) {
    const opts = options && typeof options === "object" ? options : {};
    const labelX = x + Math.min(170, Math.max(118, (targetX - x) * 0.34));
    const labelY = y - 30;

    return CAD.line(x, y, Math.min(targetX - 16, x + 158), topY + 12, {
      stroke: "rgba(226,232,240,.10)",
      width: 0.75
    }) +
    CAD.line(x, y, Math.min(targetX - 16, x + 158), bottomY - 12, {
      stroke: "rgba(226,232,240,.10)",
      width: 0.75
    }) +
    '<path d="M ' + fmt(x + 38, 2) + ' ' + fmt(y - 10, 2) +
      ' Q ' + fmt(labelX - 28, 2) + ' ' + fmt(labelY - 18, 2) +
      ' ' + fmt(labelX + 14, 2) + ' ' + fmt(labelY - 7, 2) +
      '" fill="none" stroke="' + esc(opts.color || "rgba(226,232,240,.34)") + '" stroke-width=".8" />' +
    CAD.text(labelX, labelY, label, {
      anchor: "middle",
      fill: opts.labelFill || "rgba(226,232,240,.56)",
      size: 8.7,
      weight: 800,
      spacing: ".03em"
    });
  }

  function renderFovGeometryPlanSvg(model) {
    const m = model && typeof model === "object" ? model : {};
    const calculatedWidth = Math.max(num(m.calculatedWidthFt ?? m.sceneWidthFt ?? m.coverageWidthFt, 0), 0);
    const requiredWidth = Math.max(num(m.requiredWidthFt ?? m.targetSceneWidthFt ?? m.sceneFt, 0), 0);
    const targetDistance = Math.max(num(m.targetDistanceFt ?? m.distanceFt ?? m.dist, 0), 0);
    const hfovDeg = Math.max(num(m.hfovDeg ?? m.horizontalFovDeg ?? m.hfov, 0), 0);
    const ratio = requiredWidth > 0 ? calculatedWidth / requiredWidth : num(m.coverageRatio, 0);

    if (!Number.isFinite(calculatedWidth) || !Number.isFinite(requiredWidth) || calculatedWidth <= 0 || requiredWidth <= 0) {
      return fallbackSvg("SL-PS-GFX-FOV-BAD-MODEL", "Field of View renderer needs calculatedWidthFt and requiredWidthFt.", {
        renderer: "fov-geometry-plan",
        tool: m.tool || "field-of-view"
      });
    }

    const tone = toneFor(Object.assign({}, m, { coverageRatio: ratio }));
    const svgW = 840;
    const svgH = 360;
    const stage = { x: 26, y: 24, width: 788, height: 306 };

    const cameraX = 132;
    const centerY = 184;
    const lensTipX = cameraX + 36;
    const targetX = 600;
    const requiredX = 658;
    const dimY = 296;

    const maxSpanPx = 168;
    const maxWidth = Math.max(calculatedWidth, requiredWidth, 1);
    const scale = maxSpanPx / maxWidth;
    const calcPx = clamp(calculatedWidth * scale, 34, maxSpanPx);
    const reqPx = clamp(requiredWidth * scale, 34, maxSpanPx);

    const calcTopY = centerY - calcPx / 2;
    const calcBottomY = centerY + calcPx / 2;
    const reqTopY = centerY - reqPx / 2;
    const reqBottomY = centerY + reqPx / 2;

    const arrowId = "psFovTargetPlaneCadArrow012";
    const coneId = "psFovTargetPlaneCadCone012";
    const requiredColor = ratio < 1 ? "rgba(255,190,120,.82)" : "rgba(226,232,240,.64)";
    const requiredFill = ratio < 1 ? "rgba(255,190,120,.10)" : "rgba(226,232,240,.045)";

    return "" +
      '<svg data-suppress-legacy-chart-export="true" data-report-renderer="fov-geometry-plan" data-report-visual-owner="physical-security-graphics" data-export-svg class="fov-geometry-svg sl-ps-gfx-svg" data-sl-engine="physical-security-graphics" data-sl-renderer="fov-geometry-plan" data-sl-category="physical-security" data-sl-version="' + esc(VERSION) + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="' + esc(m.ariaLabel || "Field of View CAD target-plane view") + '">' +
        CAD.defs("psFovTargetPlaneCad012", {
          arrowId,
          coneId,
          coneFill: tone.soft
        }) +
        CAD.stage(stage.x, stage.y, stage.width, stage.height, {
          rx: 20
        }) +
        cadGrid(stage) +

        CAD.text(54, 54, "FIELD OF VIEW / TARGET PLANE", {
          fill: "rgba(125,255,158,.78)",
          size: 10.4,
          weight: 950,
          spacing: ".11em"
        }) +
        CAD.text(54, 75, "Camera cone projected to the target distance. Required width is shown as the offset reference bracket.", {
          fill: colors.muted,
          size: 9.4,
          weight: 720
        }) +
        CAD.statusPill(744, 42, tone.label, {
          width: 50,
          height: 21,
          color: tone.color,
          textFill: tone.color,
          size: 9.1
        }) +

        CAD.line(lensTipX, centerY, requiredX + 28, centerY, {
          stroke: "rgba(226,232,240,.17)",
          width: 0.85,
          dash: "5 8"
        }) +

        fovCone(lensTipX, centerY, targetX, calcTopY, calcBottomY, {
          fill: "url(#" + coneId + ")",
          stroke: tone.line,
          width: 1.22
        }) +

        '<text x="' + (cameraX - 82) + '" y="' + (centerY - 5) + '" fill="rgba(226,232,240,.88)" font-size="10.5" font-weight="900">CAM 1</text>' +
        '<text x="' + (cameraX - 82) + '" y="' + (centerY + 14) + '" fill="rgba(226,232,240,.56)" font-size="9.5" font-weight="700">HFOV ' + esc(fmt(hfovDeg, 1)) + ' deg</text>' +
        cameraCadIcon(cameraX, centerY, {
          scale: 0.50,
          color: tone.line,
          stroke: tone.line,
          accent: tone.line,
          symbol: "field-of-view-camera-marker"
        }) +

        '<rect x="' + (targetX - 10) + '" y="' + fmt(calcTopY, 1) + '" width="20" height="' + fmt(Math.max(1, calcBottomY - calcTopY), 1) + '" rx="9" fill="rgba(125,255,158,.045)" stroke="rgba(125,255,158,.20)" stroke-width=".8" />' +
        targetPlane(targetX, calcTopY, calcBottomY, "CALCULATED", fmtFt(calculatedWidth), {
          color: tone.color,
          valueFill: "rgba(248,250,252,.78)",
          labelY: Math.max(98, calcTopY - 22),
          valueY: Math.min(300, calcBottomY + 26)
        }) +

        '<rect x="' + (requiredX - 9) + '" y="' + fmt(reqTopY, 1) + '" width="18" height="' + fmt(Math.max(1, reqBottomY - reqTopY), 1) + '" rx="8" fill="' + requiredFill + '" stroke="rgba(226,232,240,.13)" stroke-width=".75" />' +
        targetPlane(requiredX, reqTopY, reqBottomY, "REQUIRED", fmtFt(requiredWidth), {
          color: requiredColor,
          labelFill: requiredColor,
          valueFill: "rgba(248,250,252,.70)",
          width: 1.12,
          labelY: Math.max(100, reqTopY - 22),
          valueY: Math.min(302, reqBottomY + 26)
        }) +

        spanLinks(targetX, calcTopY, calcBottomY, requiredX, reqTopY, reqBottomY) +

        CAD.axisLine(lensTipX, dimY, targetX, dimY, "Target distance: " + fmtFt(targetDistance), {
          markerId: arrowId,
          labelOffset: 19,
          color: colors.axis
        }) +

        CAD.dimensionLine(targetX, dimY - 45, requiredX, dimY - 45, "same target plane reference", {
          color: "rgba(226,232,240,.18)",
          labelFill: "rgba(226,232,240,.44)",
          labelOffset: -10,
          tick: 5
        }) +

        hfovCallout(lensTipX, centerY, targetX, calcTopY, calcBottomY, "cone angle", {
          color: "rgba(226,232,240,.28)",
          labelFill: "rgba(226,232,240,.46)"
        }) +

        CAD.metricChip(54, 258, "RATIO", fmt(ratio, 2) + "x", {
          accent: tone.color,
          valueFill: tone.color,
          width: 118
        }) +
        CAD.metricChip(186, 258, "CALCULATED", fmtFt(calculatedWidth), {
          accent: tone.color,
          valueFill: tone.color,
          width: 142
        }) +
        CAD.metricChip(342, 258, "REQUIRED", fmtFt(requiredWidth), {
          accent: requiredColor,
          valueFill: requiredColor,
          width: 132
        }) +
      '</svg>';
  }

  function renderCoverageFootprintPlanSvg(model) {
    const m = model && typeof model === "object" ? model : {};

    const rawWidth = Math.max(0, num(m.rawWidthFt ?? m.widthFt, 0));
    const usableWidth = Math.max(0, num(m.usableWidthFt ?? m.effectiveWidthFt, 0));
    const rawHeight = Math.max(0, num(m.rawHeightFt ?? m.heightFt, 0));
    const targetDistance = Math.max(0, num(m.targetDistanceFt ?? m.distanceFt, 0));
    const hfovDeg = Math.max(0, num(m.hfovDeg ?? m.hfov, 0));

    if (!rawWidth && !usableWidth) {
      return fallbackSvg(
        "SL-GFX-COVERAGE-FOOTPRINT-BAD-MODEL",
        "Coverage footprint renderer needs rawWidthFt or usableWidthFt.",
        {
          renderer: "coverage-footprint-plan",
          tool: m.tool || "camera-coverage-area"
        }
      );
    }

    const reservePct = clamp(num(m.reservePct ?? m.usableCoverageReservePct ?? m.ovPct, rawWidth > 0 ? Math.max(0, 100 - ((usableWidth / rawWidth) * 100)) : 0), 0, 95);
    const retainedPct = clamp(num(m.widthRetentionPct, rawWidth > 0 ? (usableWidth / rawWidth) * 100 : 0), 0, 100);
    const areaRetainedPct = clamp(num(m.areaRetentionPct, retainedPct), 0, 100);
    const reserveEachSideFt = Math.max(0, (rawWidth - usableWidth) / 2);
    const reserveEachSideRatio = clamp((1 - (retainedPct / 100)) / 2, 0, 0.475);
    const usableStartT = reserveEachSideRatio;
    const usableEndT = 1 - reserveEachSideRatio;

    const labelX = 52;
    const barX = 292;
    const barW = 280;
    const valueX = 740;
    const barH = 10;
    const row1Y = 78;
    const rowGap = 32;

    const stageX = 34;
    const stageY = 150;
    const stageW = 732;
    const stageH = 228;

    const cameraX = 122;
    const centerY = 264;
    const lensTipX = cameraX + 36;
    const cameraMarkerMarkup = cameraCadIcon(cameraX, centerY, {
          scale: 0.50,
          color: "rgba(125,255,152,.92)",
          stroke: "rgba(125,255,152,.92)",
          accent: "rgba(125,255,152,.78)",
          symbol: "coverage-area-camera-marker"
        });
    const targetX = 590;
    const rawHalf = 78;
    const nearHalf = 22;
    const rawTopY = centerY - rawHalf;
    const rawBotY = centerY + rawHalf;
    const rawMidY = centerY;

    function lerpPoint(a, b, t) {
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
      };
    }

    function polyPoints(points) {
      return points.map(function (point) {
        return fmt(point.x, 1) + " " + fmt(point.y, 1);
      }).join(" ");
    }

    // Collapse the near edge into a single optical apex so the FOV cone starts
    // at the CAD camera/lens instead of a blunt rectangular edge.
    const fovApex = { x: lensTipX, y: centerY };
    const nearLeft = fovApex;
    const nearRight = fovApex;
    const farLeft = { x: targetX, y: rawTopY };
    const farRight = { x: targetX, y: rawBotY };

    const nearUsableLeft = lerpPoint(nearLeft, nearRight, usableStartT);
    const nearUsableRight = lerpPoint(nearLeft, nearRight, usableEndT);
    const farUsableLeft = lerpPoint(farLeft, farRight, usableStartT);
    const farUsableRight = lerpPoint(farLeft, farRight, usableEndT);

    const rawFootprint = [nearLeft, nearRight, farRight, farLeft];
    const leftReserveBand = [nearLeft, nearUsableLeft, farUsableLeft, farLeft];
    const usableFootprint = [nearUsableLeft, nearUsableRight, farUsableRight, farUsableLeft];
    const rightReserveBand = [nearUsableRight, nearRight, farRight, farUsableRight];

    const usableTopY = farUsableLeft.y;
    const usableBotY = farUsableRight.y;
    const usableBarW = Math.max(8, barW * (retainedPct / 100));
    const reserveBarW = Math.max(8, barW * (reservePct / 100));
    const reserveTone = reservePct >= 35 ? "risk" : reservePct >= 20 ? "watch" : "normal";
    const reserveBarFill = reserveTone === "risk" ? "url(#coveragePlanRiskBar)" : "url(#coveragePlanReserveBar)";
    const reserveValueFill = reserveTone === "risk" ? "rgba(255,188,166,.96)" : "rgba(255,239,176,.96)";

    const title = m.title || "Plan view: raw footprint to usable width";
    const subtitle = m.subtitle || "One raw FOV polygon is split into amber reserve bands and the green usable footprint.";

    return "" +
      '<svg data-suppress-legacy-chart-export="true" data-report-renderer="coverage-footprint-plan" data-report-visual-owner="physical-security-graphics" data-export-svg data-sl-engine="physical-security-graphics" data-sl-renderer="coverage-footprint-plan" data-sl-category="physical-security" data-sl-version="' + esc(VERSION) + '" viewBox="0 0 800 398" role="img" aria-label="' + esc(m.ariaLabel || "Coverage reserve plan view visualization") + '">' +
        '<defs>' +
          '<linearGradient id="coveragePlanRawBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(84,212,116,.70)" /><stop offset="100%" stop-color="rgba(125,255,152,.86)" /></linearGradient>' +
          '<linearGradient id="coveragePlanUsableBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(104,240,138,.78)" /><stop offset="100%" stop-color="rgba(151,255,176,.92)" /></linearGradient>' +
          '<linearGradient id="coveragePlanReserveBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,211,79,.76)" /><stop offset="100%" stop-color="rgba(255,226,128,.90)" /></linearGradient>' +
          '<linearGradient id="coveragePlanRiskBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,138,102,.82)" /><stop offset="100%" stop-color="rgba(255,94,94,.92)" /></linearGradient>' +
          '<linearGradient id="coveragePlanRawFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(125,255,152,.020)" /><stop offset="100%" stop-color="rgba(125,255,152,.052)" /></linearGradient>' +
          '<linearGradient id="coveragePlanUsableFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(125,255,152,.18)" /><stop offset="100%" stop-color="rgba(125,255,152,.34)" /></linearGradient>' +
          '<linearGradient id="coveragePlanReserveFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,211,79,.24)" /><stop offset="100%" stop-color="rgba(255,226,128,.38)" /></linearGradient>' +
          '<pattern id="coveragePlanReserveHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><path d="M 0 0 L 0 8" stroke="rgba(255,239,176,.42)" stroke-width="1" /></pattern>' +
        '</defs>' +

        '<text x="52" y="26" fill="rgba(248,250,252,.92)" font-size="18" font-weight="900">' + esc(title) + '</text>' +
        '<text x="52" y="48" fill="rgba(226,232,240,.62)" font-size="12">' + esc(subtitle) + '</text>' +

        '<text x="' + labelX + '" y="' + row1Y + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Raw footprint width</text>' +
        '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="url(#coveragePlanRawBar)" />' +
        '<text x="' + valueX + '" y="' + row1Y + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + esc(fmtFt(rawWidth)) + '</text>' +

        '<text x="' + labelX + '" y="' + (row1Y + rowGap) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Usable width after reserve</text>' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + usableBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#coveragePlanUsableBar)" />' +
        '<text x="' + valueX + '" y="' + (row1Y + rowGap) + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + esc(fmtFt(usableWidth)) + ' | ' + esc(fmtPct(retainedPct, 1)) + ' retained</text>' +

        '<text x="' + labelX + '" y="' + (row1Y + rowGap * 2) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Held-back reserve</text>' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + reserveBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + reserveBarFill + '" />' +
        '<text x="' + valueX + '" y="' + (row1Y + rowGap * 2) + '" text-anchor="end" fill="' + reserveValueFill + '" font-size="11" font-weight="900">' + esc(fmtPct(reservePct, 1)) + ' reserve | ' + esc(fmtPct(areaRetainedPct, 1)) + ' area retained</text>' +

        '<rect x="' + stageX + '" y="' + stageY + '" width="' + stageW + '" height="' + stageH + '" rx="18" fill="rgba(0,0,0,.13)" stroke="' + (colors.stageStroke || "rgba(125,255,152,.16)") + '" />' +
        '<text x="' + (stageX + 18) + '" y="' + (stageY + 24) + '" fill="rgba(125,255,152,.78)" font-size="11" font-weight="950" letter-spacing=".08em">PLAN VIEW / SHARED FOOTPRINT GEOMETRY</text>' +

        '<text x="' + (cameraX - 80) + '" y="' + (centerY - 5) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">Cam 1</text>' +
        '<text x="' + (cameraX - 80) + '" y="' + (centerY + 14) + '" text-anchor="start" fill="rgba(226,232,240,.58)" font-size="10">HFOV ' + esc(fmt(hfovDeg, 0)) + ' deg</text>' +
        cameraMarkerMarkup +

        '<polygon points="' + polyPoints(rawFootprint) + '" fill="url(#coveragePlanRawFill)" stroke="rgba(226,232,240,.15)" stroke-width=".85" stroke-dasharray="6 7" />' +
        '<polygon points="' + polyPoints(leftReserveBand) + '" fill="url(#coveragePlanReserveFill)" stroke="rgba(255,226,128,.78)" stroke-width="1.15" />' +
        '<polygon points="' + polyPoints(leftReserveBand) + '" fill="url(#coveragePlanReserveHatch)" opacity=".62" />' +
        '<polygon points="' + polyPoints(rightReserveBand) + '" fill="url(#coveragePlanReserveFill)" stroke="rgba(255,226,128,.78)" stroke-width="1.15" />' +
        '<polygon points="' + polyPoints(rightReserveBand) + '" fill="url(#coveragePlanReserveHatch)" opacity=".62" />' +
        '<polygon points="' + polyPoints(usableFootprint) + '" fill="url(#coveragePlanUsableFill)" stroke="rgba(125,255,152,.96)" stroke-width="1.55" />' +

        '<line x1="' + lensTipX + '" y1="' + rawMidY + '" x2="' + targetX + '" y2="' + rawMidY + '" stroke="rgba(226,232,240,.26)" stroke-width="1" stroke-dasharray="4 6" />' +
        '<line x1="' + nearLeft.x + '" y1="' + nearLeft.y + '" x2="' + farLeft.x + '" y2="' + farLeft.y + '" stroke="rgba(255,226,128,.62)" stroke-width="1" stroke-dasharray="5 6" />' +
        '<line x1="' + nearRight.x + '" y1="' + nearRight.y + '" x2="' + farRight.x + '" y2="' + farRight.y + '" stroke="rgba(255,226,128,.62)" stroke-width="1" stroke-dasharray="5 6" />' +
        '<line x1="' + nearUsableLeft.x.toFixed(1) + '" y1="' + nearUsableLeft.y.toFixed(1) + '" x2="' + farUsableLeft.x.toFixed(1) + '" y2="' + farUsableLeft.y.toFixed(1) + '" stroke="rgba(125,255,152,.72)" stroke-width="1.25" />' +
        '<line x1="' + nearUsableRight.x.toFixed(1) + '" y1="' + nearUsableRight.y.toFixed(1) + '" x2="' + farUsableRight.x.toFixed(1) + '" y2="' + farUsableRight.y.toFixed(1) + '" stroke="rgba(125,255,152,.72)" stroke-width="1.25" />' +

        '<line x1="' + targetX + '" y1="' + rawTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.42)" stroke-width="1" />' +
        '<line x1="' + targetX + '" y1="' + rawTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + usableTopY.toFixed(1) + '" stroke="rgba(255,226,128,.90)" stroke-width="2" />' +
        '<line x1="' + targetX + '" y1="' + usableTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + usableBotY.toFixed(1) + '" stroke="rgba(125,255,152,.92)" stroke-width="2.2" />' +
        '<line x1="' + targetX + '" y1="' + usableBotY.toFixed(1) + '" x2="' + targetX + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(255,226,128,.90)" stroke-width="2" />' +

        '<text x="' + (targetX + 18) + '" y="' + (centerY - 12) + '" fill="rgba(125,255,152,.94)" font-size="12" font-weight="950">Usable width</text>' +
        '<text x="' + (targetX + 18) + '" y="' + (centerY + 9) + '" fill="rgba(125,255,152,.94)" font-size="14" font-weight="950">' + esc(fmtFt(usableWidth)) + '</text>' +
        '<text x="' + (targetX + 18) + '" y="' + (centerY + 27) + '" fill="rgba(226,232,240,.58)" font-size="10.5">after reserve</text>' +

        '<text x="' + (targetX + 18) + '" y="' + (rawTopY + 10).toFixed(1) + '" fill="rgba(255,226,128,.92)" font-size="10.5" font-weight="900">Reserve ' + esc(fmtFt(reserveEachSideFt)) + '</text>' +
        '<text x="' + (targetX + 18) + '" y="' + (rawBotY - 5).toFixed(1) + '" fill="rgba(255,226,128,.92)" font-size="10.5" font-weight="900">Reserve ' + esc(fmtFt(reserveEachSideFt)) + '</text>' +

        '<line x1="' + (targetX + 128) + '" y1="' + rawTopY.toFixed(1) + '" x2="' + (targetX + 128) + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
        '<line x1="' + (targetX + 121) + '" y1="' + rawTopY.toFixed(1) + '" x2="' + (targetX + 135) + '" y2="' + rawTopY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
        '<line x1="' + (targetX + 121) + '" y1="' + rawBotY.toFixed(1) + '" x2="' + (targetX + 135) + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
        '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY - 18) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">Raw</text>' +
        '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY - 3) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">footprint</text>' +
        '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY + 16) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="13" font-weight="950">' + esc(fmtFt(rawWidth)) + '</text>' +

        '<line x1="' + lensTipX + '" y1="354" x2="' + targetX + '" y2="354" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
        '<line x1="' + lensTipX + '" y1="348" x2="' + lensTipX + '" y2="360" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
        '<line x1="' + targetX + '" y1="348" x2="' + targetX + '" y2="360" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
        '<text x="' + ((lensTipX + targetX) / 2).toFixed(1) + '" y="376" text-anchor="middle" fill="rgba(226,232,240,.72)" font-size="11" font-weight="900">Target distance: ' + esc(fmtFt(targetDistance, 0)) + '</text>' +
      '</svg>';
  }

  function renderPixelDensityDetailPlanSvg(model) {
    const m = model && typeof model === "object" ? model : {};
    const ppf = Math.max(num(m.ppf ?? m.deliveredPpf, 0), 0);
    const targetPpf = Math.max(num(m.targetPpf ?? m.tppf, 0), 0);
    const sceneWidth = Math.max(num(m.sceneWidthFt ?? m.sceneW, 0), 0);
    const targetWidth = Math.max(num(m.targetWidthFt ?? m.tw, 0), 0);
    const resolutionPx = Math.max(num(m.resolutionPx ?? m.res, 0), 0);
    const pixelsOnTarget = Math.max(num(m.pixelsOnTarget, ppf * targetWidth), 0);
    const targetDistance = Math.max(num(m.targetDistanceFt ?? m.distanceFt ?? m.dist, 0), 0);
    const hfovDeg = Math.max(num(m.hfovDeg ?? m.hfov, 0), 0);
    const distanceForTarget = Math.max(num(m.distanceForTargetFt ?? m.distForTppf, 0), 0);
    const utilizationPct = Math.max(num(m.utilizationPct, distanceForTarget > 0 ? (targetDistance / distanceForTarget) * 100 : 0), 0);
    const ratio = targetPpf > 0 ? ppf / targetPpf : 0;
    const level = String(m.level || m.detailLevel || "Detail");

    if (!Number.isFinite(ppf) || !Number.isFinite(targetPpf) || ppf <= 0 || targetPpf <= 0) {
      return fallbackSvg("SL-PS-GFX-PIXEL-DENSITY-BAD-MODEL", "Pixel Density renderer needs ppf and targetPpf.", {
        renderer: "pixel-density-detail-plan",
        tool: m.tool || "pixel-density"
      });
    }

    const isRisk = ratio < 0.85;
    const isWatch = !isRisk && (ratio < 1 || utilizationPct > 95);
    const statusLabel = isRisk ? "RISK" : isWatch ? "WATCH" : "HEALTHY";
    const statusColor = isRisk ? "rgba(255,143,136,.92)" : isWatch ? "rgba(255,211,79,.92)" : "rgba(125,255,158,.90)";
    const coneFill = isRisk ? "rgba(255,143,136,.10)" : isWatch ? "rgba(255,211,79,.10)" : "rgba(125,255,158,.18)";
    const coneLine = isRisk ? "rgba(255,143,136,.76)" : isWatch ? "rgba(255,211,79,.76)" : "rgba(125,255,158,.82)";

    const labelX = 52;
    const barX = 292;
    const barW = 280;
    const valueX = 740;
    const barH = 10;
    const row1Y = 70;
    const rowGap = 32;
    const maxPpf = Math.max(ppf, targetPpf, 1);
    const deliveredBarW = Math.max(8, barW * Math.min(ppf / maxPpf, 1));
    const targetBarW = Math.max(8, barW * Math.min(targetPpf / maxPpf, 1));
    const targetPixels = targetPpf * targetWidth;
    const maxPixels = Math.max(pixelsOnTarget, targetPixels, 1);
    const pixelsBarW = Math.max(8, barW * Math.min(pixelsOnTarget / maxPixels, 1));

    const stageX = 34;
    const stageY = 150;
    const stageW = 732;
    const stageH = 228;
    const cameraX = 122;
    const centerY = 264;
    const lensTipX = cameraX + 36;
    const targetX = 590;
    const sceneHalf = 78;
    const sceneTopY = centerY - sceneHalf;
    const sceneBotY = centerY + sceneHalf;
    const targetRatio = sceneWidth > 0 ? targetWidth / sceneWidth : 0.12;
    const targetHalf = clamp(sceneHalf * targetRatio, 14, 42);
    const targetTopY = centerY - targetHalf;
    const targetBotY = centerY + targetHalf;

    const cameraMarkerMarkup = cameraCadIcon(cameraX, centerY, {
      scale: 0.50,
      color: coneLine,
      stroke: coneLine,
      accent: coneLine,
      symbol: "pixel-density-camera-marker"
    });

    return "" +
      '<svg data-suppress-legacy-chart-export="true" data-report-renderer="pixel-density-detail-plan" data-report-visual-owner="physical-security-graphics" data-export-svg class="pixel-density-detail-svg sl-ps-gfx-svg" data-sl-engine="physical-security-graphics" data-sl-renderer="pixel-density-detail-plan" data-sl-category="physical-security" data-sl-version="' + esc(VERSION) + '" viewBox="0 0 800 398" role="img" aria-label="' + esc(m.ariaLabel || "Pixel Density CAD detail validation view") + '">' +
        '<defs>' +
          '<linearGradient id="psPixelDetailDeliveredBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(84,212,116,.70)" /><stop offset="100%" stop-color="rgba(125,255,152,.90)" /></linearGradient>' +
          '<linearGradient id="psPixelDetailTargetBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,211,79,.60)" /><stop offset="100%" stop-color="rgba(255,226,128,.88)" /></linearGradient>' +
          '<linearGradient id="psPixelDetailPixelsBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(125,255,152,.58)" /><stop offset="100%" stop-color="rgba(125,255,152,.86)" /></linearGradient>' +
          '<linearGradient id="psPixelDetailCone" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' + coneFill + '" /><stop offset="100%" stop-color="rgba(125,255,158,.28)" /></linearGradient>' +
          '<pattern id="psPixelDetailScanLines" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M 0 0 L 6 0" stroke="rgba(125,255,158,.30)" stroke-width="1" /></pattern>' +
        '</defs>' +

        '<text x="52" y="26" fill="rgba(248,250,252,.92)" font-size="18" font-weight="900">Plan view: pixel detail at target width</text>' +
        '<text x="52" y="48" fill="rgba(226,232,240,.62)" font-size="12">Green shows delivered pixel density across the scene; the centered target bracket shows subject detail.</text>' +

        '<text x="' + labelX + '" y="' + row1Y + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Delivered pixel density</text>' +
        '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + deliveredBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#psPixelDetailDeliveredBar)" />' +
        '<text x="' + valueX + '" y="' + row1Y + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + esc(fmt(ppf, 1) + " PPF") + '</text>' +

        '<text x="' + labelX + '" y="' + (row1Y + rowGap) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Target pixel density</text>' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + targetBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#psPixelDetailTargetBar)" />' +
        '<text x="' + valueX + '" y="' + (row1Y + rowGap) + '" text-anchor="end" fill="rgba(255,226,128,.92)" font-size="11" font-weight="900">' + esc(fmt(targetPpf, 1) + " PPF") + '</text>' +

        '<text x="' + labelX + '" y="' + (row1Y + rowGap * 2) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Pixels on target</text>' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
        '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + pixelsBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#psPixelDetailPixelsBar)" />' +
        '<text x="' + valueX + '" y="' + (row1Y + rowGap * 2) + '" text-anchor="end" fill="' + esc(statusColor) + '" font-size="11" font-weight="900">' + esc(fmt(pixelsOnTarget, 0) + " px | " + level) + '</text>' +

        '<rect x="' + stageX + '" y="' + stageY + '" width="' + stageW + '" height="' + stageH + '" rx="18" fill="rgba(0,0,0,.13)" stroke="rgba(125,255,152,.16)" />' +
        '<text x="' + (stageX + 18) + '" y="' + (stageY + 24) + '" fill="rgba(125,255,152,.78)" font-size="11" font-weight="950" letter-spacing=".08em">PLAN VIEW / DETAIL DENSITY CHECK</text>' +
        '<text x="' + (stageX + stageW - 86) + '" y="' + (stageY + 24) + '" text-anchor="middle" fill="' + esc(statusColor) + '" font-size="10" font-weight="950">' + esc(statusLabel) + '</text>' +

        '<text x="' + (cameraX - 80) + '" y="' + (centerY - 5) + '" fill="rgba(226,232,240,.88)" font-size="10.5" font-weight="900">Cam 1</text>' +
        '<text x="' + (cameraX - 80) + '" y="' + (centerY + 14) + '" fill="rgba(226,232,240,.56)" font-size="9.5" font-weight="700">HFOV ' + esc(fmt(hfovDeg, 0)) + ' deg</text>' +
        cameraMarkerMarkup +

        '<path d="M ' + fmt(lensTipX, 1) + ' ' + fmt(centerY, 1) + ' L ' + fmt(targetX, 1) + ' ' + fmt(sceneTopY, 1) + ' L ' + fmt(targetX, 1) + ' ' + fmt(sceneBotY, 1) + ' Z" fill="url(#psPixelDetailCone)" stroke="' + esc(coneLine) + '" stroke-width="1.55" />' +
        '<line x1="' + lensTipX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + centerY + '" stroke="rgba(226,232,240,.24)" stroke-width="1" stroke-dasharray="4 6" />' +

        '<line x1="' + targetX + '" y1="' + sceneTopY + '" x2="' + targetX + '" y2="' + sceneBotY + '" stroke="rgba(226,232,240,.35)" stroke-width="1" />' +
        '<line x1="' + (targetX - 8) + '" y1="' + sceneTopY + '" x2="' + (targetX + 8) + '" y2="' + sceneTopY + '" stroke="rgba(226,232,240,.35)" stroke-width="1" />' +
        '<line x1="' + (targetX - 8) + '" y1="' + sceneBotY + '" x2="' + (targetX + 8) + '" y2="' + sceneBotY + '" stroke="rgba(226,232,240,.35)" stroke-width="1" />' +
        '<rect x="' + (targetX - 12) + '" y="' + fmt(targetTopY, 1) + '" width="24" height="' + fmt(Math.max(1, targetBotY - targetTopY), 1) + '" rx="7" fill="url(#psPixelDetailScanLines)" stroke="' + esc(statusColor) + '" stroke-width="1.4" />' +
        '<line x1="' + (targetX - 18) + '" y1="' + fmt(targetTopY, 1) + '" x2="' + (targetX + 18) + '" y2="' + fmt(targetTopY, 1) + '" stroke="' + esc(statusColor) + '" stroke-width="1.1" />' +
        '<line x1="' + (targetX - 18) + '" y1="' + fmt(targetBotY, 1) + '" x2="' + (targetX + 18) + '" y2="' + fmt(targetBotY, 1) + '" stroke="' + esc(statusColor) + '" stroke-width="1.1" />' +

        '<text x="' + (targetX + 24) + '" y="' + (centerY - 24) + '" fill="' + esc(statusColor) + '" font-size="12" font-weight="950">Delivered detail</text>' +
        '<text x="' + (targetX + 24) + '" y="' + (centerY - 3) + '" fill="' + esc(statusColor) + '" font-size="14" font-weight="950">' + esc(fmt(ppf, 1) + " PPF") + '</text>' +
        '<text x="' + (targetX + 24) + '" y="' + (centerY + 17) + '" fill="rgba(226,232,240,.62)" font-size="10.5">Target: ' + esc(fmt(targetPpf, 1) + " PPF") + '</text>' +
        '<text x="' + (targetX + 24) + '" y="' + (centerY + 37) + '" fill="rgba(226,232,240,.62)" font-size="10.5">Subject: ' + esc(fmtFt(targetWidth, 1)) + '</text>' +

        '<line x1="' + lensTipX + '" y1="354" x2="' + targetX + '" y2="354" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
        '<line x1="' + lensTipX + '" y1="348" x2="' + lensTipX + '" y2="360" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
        '<line x1="' + targetX + '" y1="348" x2="' + targetX + '" y2="360" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
        '<text x="' + ((lensTipX + targetX) / 2).toFixed(1) + '" y="376" text-anchor="middle" fill="rgba(226,232,240,.72)" font-size="11" font-weight="900">Target distance: ' + esc(fmtFt(targetDistance, 0)) + '</text>' +
      '</svg>';
  }

  const sharedCameraLayoutIsoRenderer = gfx.renderers && gfx.renderers["camera-layout-iso"];
  const sharedScenarioPressureLineRenderer = gfx.renderers && gfx.renderers["scenario-pressure-line"];

  function brandSharedPhysicalSecuritySvg(svg, rendererName) {
    let output = String(svg || "");
    if (!output.includes("<svg")) return output;

    if (/data-sl-engine="[^"]*"/.test(output)) {
      output = output.replace(/data-sl-engine="[^"]*"/, 'data-sl-engine="physical-security-graphics"');
    } else {
      output = output.replace(/<svg\b/, '<svg data-sl-engine="physical-security-graphics"');
    }

    if (/data-sl-category="[^"]*"/.test(output)) {
      output = output.replace(/data-sl-category="[^"]*"/, 'data-sl-category="' + esc(CATEGORY) + '"');
    } else {
      output = output.replace(/<svg\b/, '<svg data-sl-category="' + esc(CATEGORY) + '"');
    }

    if (/data-sl-version="[^"]*"/.test(output)) {
      output = output.replace(/data-sl-version="[^"]*"/, 'data-sl-version="' + esc(VERSION) + '"');
    } else {
      output = output.replace(/<svg\b/, '<svg data-sl-version="' + esc(VERSION) + '"');
    }

    if (/data-sl-renderer="[^"]*"/.test(output)) {
      output = output.replace(/data-sl-renderer="[^"]*"/, 'data-sl-renderer="' + esc(rendererName) + '"');
    } else {
      output = output.replace(/<svg\b/, '<svg data-sl-renderer="' + esc(rendererName) + '"');
    }

    if (/data-report-visual-owner="[^"]*"/.test(output)) {
      output = output.replace(/data-report-visual-owner="[^"]*"/, 'data-report-visual-owner="physical-security-graphics"');
    } else {
      output = output.replace(/<svg\b/, '<svg data-report-visual-owner="physical-security-graphics"');
    }

    if (/data-report-renderer="[^"]*"/.test(output)) {
      output = output.replace(/data-report-renderer="[^"]*"/, 'data-report-renderer="' + esc(rendererName) + '"');
    } else {
      output = output.replace(/<svg\b/, '<svg data-report-renderer="' + esc(rendererName) + '"');
    }

    if (/data-suppress-legacy-chart-export="[^"]*"/.test(output)) {
      output = output.replace(/data-suppress-legacy-chart-export="[^"]*"/, 'data-suppress-legacy-chart-export="true"');
    } else {
      output = output.replace(/<svg\b/, '<svg data-suppress-legacy-chart-export="true"');
    }

    return output;
  }

  function renderSharedPhysicalSecuritySvg(rendererName, sharedRenderer, model) {
    if (typeof sharedRenderer !== "function") {
      return fallbackSvg("SL-PS-GFX-SHARED-RENDERER-MISSING", "Shared renderer was not available for the Physical Security graphics contract.", {
        renderer: rendererName,
        tool: model && model.tool || "physical-security"
      });
    }

    const svg = sharedRenderer(model || {});
    if (typeof svg !== "string" || !svg.includes("<svg")) {
      return fallbackSvg("SL-PS-GFX-SHARED-RENDERER-BAD-OUTPUT", "Shared renderer did not return SVG output.", {
        renderer: rendererName,
        tool: model && model.tool || "physical-security"
      });
    }

    return brandSharedPhysicalSecuritySvg(svg, rendererName);
  }

  // data-physical-security-face-cad-target-marker-001
  function faceRecognitionCadTargetMarker(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const stroke = opts.stroke || opts.color || "rgba(125,255,158,.92)";
    const muted = opts.muted || "rgba(226,232,240,.42)";
    const soft = opts.soft || "rgba(125,255,158,.075)";
    const scale = Number.isFinite(Number(opts.scale)) ? Number(opts.scale) : 0.58;
    const label = opts.label || "";

    return "" +
      '<g transform="translate(' + fmt(x, 2) + ' ' + fmt(y, 2) + ') scale(' + fmt(scale, 3) + ')" class="sl-cad-face-target" data-ps-graphic-part="face-recognition-target-marker" data-graphics-symbol="cad-face-recognition-target">' +

        '<ellipse cx="0" cy="0" rx="64" ry="48" fill="' + esc(soft) + '" stroke="' + esc(stroke) + '" stroke-width="1.15" stroke-opacity=".62" />' +
        '<line x1="-86" y1="0" x2="-50" y2="0" stroke="' + esc(stroke) + '" stroke-width=".9" stroke-dasharray="5 6" stroke-linecap="round" stroke-opacity=".58" />' +
        '<line x1="50" y1="0" x2="86" y2="0" stroke="' + esc(stroke) + '" stroke-width=".9" stroke-dasharray="5 6" stroke-linecap="round" stroke-opacity=".58" />' +
        '<line x1="0" y1="-70" x2="0" y2="-42" stroke="' + esc(stroke) + '" stroke-width=".9" stroke-dasharray="5 6" stroke-linecap="round" stroke-opacity=".58" />' +
        '<line x1="0" y1="44" x2="0" y2="70" stroke="' + esc(stroke) + '" stroke-width=".9" stroke-dasharray="5 6" stroke-linecap="round" stroke-opacity=".58" />' +

        '<path d="M -46 38 C -38 17 -22 7 -8 3 C -3 8 3 8 8 3 C 24 8 39 19 46 38" fill="rgba(2,6,23,.62)" stroke="' + esc(stroke) + '" stroke-width="1.25" stroke-linejoin="round" />' +
        '<path d="M -29 37 C -24 20 -14 13 -5 10 L 0 18 L 5 10 C 15 13 24 20 29 37" fill="none" stroke="' + esc(muted) + '" stroke-width=".85" stroke-linecap="round" />' +

        '<path d="M -24 -18 C -21 -39 -7 -48 7 -45 C 22 -41 29 -25 24 -6 C 21 8 11 20 0 22 C -12 20 -22 7 -24 -18 Z" fill="rgba(2,6,23,.72)" stroke="' + esc(stroke) + '" stroke-width="1.35" />' +
        '<path d="M -23 -23 C -14 -38 1 -40 15 -32 C 26 -25 29 -12 25 -1 C 19 -8 8 -10 -2 -8 C -12 -6 -20 -10 -23 -23 Z" fill="none" stroke="' + esc(stroke) + '" stroke-width=".95" stroke-opacity=".8" />' +

        '<path d="M -15 -28 C -6 -35 5 -35 17 -28" fill="none" stroke="' + esc(muted) + '" stroke-width=".75" stroke-linecap="round" />' +
        '<path d="M -17 -21 C -5 -27 7 -27 18 -20" fill="none" stroke="' + esc(muted) + '" stroke-width=".7" stroke-linecap="round" />' +
        '<path d="M -14 -14 C -4 -20 7 -19 15 -13" fill="none" stroke="' + esc(muted) + '" stroke-width=".65" stroke-linecap="round" />' +

        '<path d="M -18 -2 C -10 4 10 4 18 -2" fill="none" stroke="' + esc(muted) + '" stroke-width=".75" stroke-linecap="round" stroke-opacity=".66" />' +
        '<line x1="-6" y1="19" x2="0" y2="30" stroke="' + esc(stroke) + '" stroke-width=".85" stroke-linecap="round" />' +
        '<line x1="6" y1="19" x2="0" y2="30" stroke="' + esc(stroke) + '" stroke-width=".85" stroke-linecap="round" />' +

        (label ? CAD.text(0, 84, label, {
          anchor: "middle",
          fill: stroke,
          size: 12,
          weight: 950,
          spacing: ".09em"
        }) : "") +
      '</g>';
  }

  // data-physical-security-face-recognition-renderer-001
  function renderFaceRecognitionRangePlanSvg(model) {
    const m = model && typeof model === "object" ? model : {};

    const maxDist = Math.max(0, num(m.maxDistFt ?? m.maxDist, 0));
    const actualDist = Math.max(0, num(m.actualDistanceFt ?? m.dist, 0));
    const deliveredPpf = Math.max(0, num(m.deliveredPpf, 0));
    const targetPpf = Math.max(0, num(m.targetPpf ?? m.ppf, 0));
    const marginFt = num(m.marginFt, maxDist - actualDist);
    const utilizationPct = Math.max(0, num(m.utilizationPct, maxDist > 0 ? (actualDist / maxDist) * 100 : 0));
    const status = String(m.status || "Healthy").toLowerCase();
    const classification = String(m.classification || "Face recognition");

    if (!maxDist || !actualDist || !targetPpf || !deliveredPpf) {
      return fallbackSvg("SL-PS-GFX-FACE-BAD-MODEL", "Face Recognition renderer needs max distance, actual distance, delivered PPF, and target PPF.", {
        renderer: "face-recognition-range-plan",
        tool: m.tool || "face-recognition-range"
      });
    }

    const svgW = 800;
    const svgH = 430;
    const stage = { x: 34, y: 92, width: 732, height: 286 };

    const statusLabel = status.includes("risk") ? "RISK" : status.includes("watch") ? "WATCH" : "HEALTHY";
    const statusColor = statusLabel === "RISK"
      ? "rgba(255,143,136,.92)"
      : statusLabel === "WATCH"
        ? "rgba(255,211,79,.92)"
        : "rgba(125,255,158,.90)";

    const statusSoft = statusLabel === "RISK"
      ? "rgba(255,143,136,.12)"
      : statusLabel === "WATCH"
        ? "rgba(255,211,79,.12)"
        : "rgba(125,255,158,.11)";

    const rangeMax = Math.max(maxDist, actualDist) * 1.18;
    const trackX1 = 128;
    const trackX2 = 686;
    const trackY = 220;
    const trackW = trackX2 - trackX1;

    function xForDistance(value) {
      return trackX1 + (clamp(value / rangeMax, 0, 1) * trackW);
    }

    const maxX = xForDistance(maxDist);
    const actualX = xForDistance(actualDist);
    const cameraX = 90;
    const cameraY = trackY;
    const targetTop = 142;
    const targetBottom = 300;
    const ppfRatio = clamp(deliveredPpf / Math.max(targetPpf, 1), 0, 1.4);
    const ppfBarW = clamp(260 * ppfRatio, 10, 340);

    const targetColor = marginFt < 0
      ? "rgba(255,143,136,.92)"
      : utilizationPct > 95
        ? "rgba(255,211,79,.92)"
        : "rgba(125,255,158,.92)";

    return "" +
      '<svg data-suppress-legacy-chart-export="true" data-report-renderer="face-recognition-range-plan" data-report-visual-owner="physical-security-graphics" data-export-svg class="face-recognition-range-svg sl-ps-gfx-svg" data-sl-engine="physical-security-graphics" data-sl-renderer="face-recognition-range-plan" data-sl-category="physical-security" data-sl-version="' + esc(VERSION) + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="' + esc(m.ariaLabel || "Face Recognition range validation visual") + '">' +
        '<defs>' +
          '<linearGradient id="psFaceEnvelope" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(125,255,158,.18)" /><stop offset="100%" stop-color="rgba(125,255,158,.04)" /></linearGradient>' +
          '<linearGradient id="psFaceBeyond" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,143,136,.10)" /><stop offset="100%" stop-color="rgba(255,143,136,.03)" /></linearGradient>' +
          '<linearGradient id="psFacePpfBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' + statusColor + '" stop-opacity=".54" /><stop offset="100%" stop-color="' + statusColor + '" stop-opacity=".92" /></linearGradient>' +
        '</defs>' +

        '<text x="52" y="34" fill="rgba(248,250,252,.92)" font-size="18" font-weight="950">Face recognition range validation</text>' +
        '<text x="52" y="56" fill="rgba(226,232,240,.62)" font-size="12">' + esc(classification) + ' / delivered face detail compared with working distance.</text>' +

        CAD.stage(stage.x, stage.y, stage.width, stage.height, { rx: 20 }) +
        cadGrid(stage) +
        CAD.statusPill(690, 148, statusLabel, {
          width: 64,
          height: 20,
          color: statusColor,
          textFill: statusColor,
          size: 9.2
        }) +

        '<text x="54" y="122" fill="rgba(125,255,158,.82)" font-size="10.4" font-weight="950" letter-spacing=".11em">RECOGNITION ENVELOPE / WORKING DISTANCE</text>' +
        '<text x="54" y="144" fill="rgba(226,232,240,.58)" font-size="9.8" font-weight="720">Camera geometry, face-width assumption, and pixels-per-face target.</text>' +

        cameraCadIcon(cameraX, cameraY, {
          scale: 0.52,
          color: "rgba(125,255,158,.90)",
          accent: "rgba(125,255,158,.78)",
          symbol: "face-recognition-camera"
        }) +

        '<path d="M ' + fmt(cameraLensTipX(cameraX), 1) + ' ' + fmt(cameraY, 1) + ' L ' + fmt(maxX, 1) + ' ' + fmt(targetTop, 1) + ' L ' + fmt(maxX, 1) + ' ' + fmt(targetBottom, 1) + ' Z" fill="rgba(125,255,158,.045)" stroke="rgba(125,255,158,.24)" stroke-width=".9" />' +

        '<rect x="' + fmt(trackX1, 1) + '" y="' + fmt(trackY - 34, 1) + '" width="' + fmt(Math.max(4, maxX - trackX1), 1) + '" height="68" rx="16" fill="url(#psFaceEnvelope)" stroke="rgba(125,255,158,.34)" stroke-width="1" />' +
        (actualDist > maxDist
          ? '<rect x="' + fmt(maxX, 1) + '" y="' + fmt(trackY - 34, 1) + '" width="' + fmt(Math.max(4, actualX - maxX), 1) + '" height="68" rx="12" fill="url(#psFaceBeyond)" stroke="rgba(255,143,136,.34)" stroke-width="1" />'
          : "") +

        CAD.dimensionLine(trackX1, 330, maxX, 330, "Modeled envelope: " + fmtFt(maxDist, 1), {
          color: "rgba(125,255,158,.58)",
          labelFill: "rgba(125,255,158,.84)",
          tick: 7
        }) +

        CAD.dimensionLine(trackX1, 360, actualX, 360, "Actual distance: " + fmtFt(actualDist, 1), {
          color: targetColor,
          labelFill: targetColor,
          tick: 7
        }) +

        '<line x1="' + fmt(maxX, 1) + '" y1="' + fmt(trackY - 56, 1) + '" x2="' + fmt(maxX, 1) + '" y2="' + fmt(trackY + 56, 1) + '" stroke="rgba(125,255,158,.70)" stroke-width="1.15" stroke-dasharray="5 6" />' +
        '<text x="' + fmt(maxX, 1) + '" y="' + fmt(trackY - 66, 1) + '" text-anchor="middle" fill="rgba(125,255,158,.84)" font-size="9" font-weight="900">MAX</text>' +

        '<line x1="' + fmt(actualX, 1) + '" y1="' + fmt(targetTop - 10, 1) + '" x2="' + fmt(actualX, 1) + '" y2="' + fmt(targetBottom + 10, 1) + '" stroke="' + targetColor + '" stroke-width="1.15" stroke-dasharray="6 7" opacity=".72" />' +

        faceRecognitionCadTargetMarker(actualX, trackY - 12, {
          scale: 0.50,
          stroke: targetColor,
          color: targetColor,
          muted: "rgba(226,232,240,.48)",
          soft: statusSoft,
          label: "TARGET"
        }) +

        '<text x="128" y="178" fill="rgba(226,232,240,.68)" font-size="9.5" font-weight="800">Recognition envelope</text>' +
        '<text x="' + fmt(Math.min(trackX2 - 8, actualX + 12), 1) + '" y="' + fmt(trackY - 44, 1) + '" fill="' + targetColor + '" font-size="10" font-weight="950">' + esc(fmt(Math.round(deliveredPpf), 0) + " px delivered") + '</text>' +

        '<rect x="414" y="132" width="270" height="10" rx="5" fill="rgba(255,255,255,.04)" stroke="rgba(226,232,240,.12)" />' +
        '<rect x="414" y="132" width="' + fmt(ppfBarW, 1) + '" height="10" rx="5" fill="url(#psFacePpfBar)" />' +
        '<text x="414" y="122" fill="rgba(226,232,240,.62)" font-size="9.4" font-weight="850">Delivered detail vs target</text>' +
        '<text x="684" y="122" text-anchor="end" fill="' + targetColor + '" font-size="9.4" font-weight="950">' + esc(fmt(deliveredPpf, 0) + " / " + fmt(targetPpf, 0) + " px") + '</text>' +

        CAD.metricChip(72, 386, "MAX RANGE", fmtFt(maxDist, 1), {
          accent: "rgba(125,255,158,.82)",
          valueFill: "rgba(125,255,158,.92)",
          width: 146
        }) +
        CAD.metricChip(236, 386, "ACTUAL", fmtFt(actualDist, 1), {
          accent: targetColor,
          valueFill: targetColor,
          width: 132
        }) +
        CAD.metricChip(386, 386, "DELIVERED", fmt(deliveredPpf, 0) + " px", {
          accent: targetColor,
          valueFill: targetColor,
          width: 136
        }) +
        CAD.metricChip(540, 386, "MARGIN", (marginFt >= 0 ? "+" : "-") + fmtFt(Math.abs(marginFt), 1), {
          accent: statusColor,
          valueFill: statusColor,
          width: 142
        }) +
      '</svg>';
  }

  // data-physical-security-license-plate-cad-target-001
  function licensePlateCadTargetMarker(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const stroke = opts.stroke || opts.color || "rgba(125,255,224,.92)";
    const muted = opts.muted || "rgba(226,232,240,.48)";
    const fill = opts.fill || "rgba(2,6,23,.76)";
    const scale = Number.isFinite(Number(opts.scale)) ? Number(opts.scale) : 0.38;
    const clarityRatio = clamp(Number(opts.clarityRatio || 1), 0.18, 1.45);
    const degrade = clamp(Number(opts.degrade || 0), 0, 1);
    const plateText = opts.text || "ABC-1234";

    const textOpacity = clamp(0.34 + (clarityRatio * 0.58), 0.34, 1);
    const lineOpacity = clamp(0.46 + (clarityRatio * 0.42), 0.46, 1);
    const pixelOpacity = clamp(degrade * 0.62, 0, 0.70);
    const ghostOffset = clamp(degrade * 3.2, 0, 4.2);

    return "" +
      '<g transform="translate(' + fmt(x, 2) + ' ' + fmt(y, 2) + ') scale(' + fmt(scale, 3) + ')" class="sl-cad-license-plate-target" data-ps-graphic-part="license-plate-target-marker" data-graphics-symbol="cad-license-plate-target">' +
        '<g opacity="' + fmt(lineOpacity, 2) + '">' +
          '<rect x="-150" y="-72" width="300" height="144" rx="18" fill="' + esc(fill) + '" stroke="' + esc(muted) + '" stroke-width="1.4" />' +
          '<rect x="-140" y="-62" width="280" height="124" rx="12" fill="rgba(2,6,23,.36)" stroke="' + esc(stroke) + '" stroke-width="1.1" stroke-opacity=".74" />' +

          '<circle cx="-104" cy="-44" r="8" fill="rgba(2,6,23,.60)" stroke="' + esc(stroke) + '" stroke-width=".95" />' +
          '<path d="M -104 -50 L -98 -47 L -98 -41 L -104 -38 L -110 -41 L -110 -47 Z" fill="none" stroke="' + esc(muted) + '" stroke-width=".8" />' +
          '<circle cx="104" cy="-44" r="8" fill="rgba(2,6,23,.60)" stroke="' + esc(stroke) + '" stroke-width=".95" />' +
          '<path d="M 104 -50 L 110 -47 L 110 -41 L 104 -38 L 98 -41 L 98 -47 Z" fill="none" stroke="' + esc(muted) + '" stroke-width=".8" />' +
          '<circle cx="-104" cy="44" r="8" fill="rgba(2,6,23,.60)" stroke="' + esc(stroke) + '" stroke-width=".95" />' +
          '<path d="M -104 38 L -98 41 L -98 47 L -104 50 L -110 47 L -110 41 Z" fill="none" stroke="' + esc(muted) + '" stroke-width=".8" />' +
          '<circle cx="104" cy="44" r="8" fill="rgba(2,6,23,.60)" stroke="' + esc(stroke) + '" stroke-width=".95" />' +
          '<path d="M 104 38 L 110 41 L 110 47 L 104 50 L 98 47 L 98 41 Z" fill="none" stroke="' + esc(muted) + '" stroke-width=".8" />' +

          '<line x1="-170" y1="-96" x2="-132" y2="-96" stroke="' + esc(stroke) + '" stroke-width="1.15" />' +
          '<line x1="-170" y1="-96" x2="-170" y2="-58" stroke="' + esc(stroke) + '" stroke-width="1.15" />' +
          '<line x1="170" y1="-96" x2="132" y2="-96" stroke="' + esc(stroke) + '" stroke-width="1.15" />' +
          '<line x1="170" y1="-96" x2="170" y2="-58" stroke="' + esc(stroke) + '" stroke-width="1.15" />' +
          '<line x1="-170" y1="96" x2="-132" y2="96" stroke="' + esc(stroke) + '" stroke-width="1.15" />' +
          '<line x1="-170" y1="96" x2="-170" y2="58" stroke="' + esc(stroke) + '" stroke-width="1.15" />' +
          '<line x1="170" y1="96" x2="132" y2="96" stroke="' + esc(stroke) + '" stroke-width="1.15" />' +
          '<line x1="170" y1="96" x2="170" y2="58" stroke="' + esc(stroke) + '" stroke-width="1.15" />' +

          '<line x1="-16" y1="-100" x2="16" y2="-100" stroke="' + esc(stroke) + '" stroke-width="1" />' +
          '<line x1="0" y1="-116" x2="0" y2="-84" stroke="' + esc(stroke) + '" stroke-width="1" />' +
          '<line x1="-16" y1="100" x2="16" y2="100" stroke="' + esc(stroke) + '" stroke-width="1" />' +
          '<line x1="0" y1="84" x2="0" y2="116" stroke="' + esc(stroke) + '" stroke-width="1" />' +
        '</g>' +

        '<g filter="url(#psPlateClarityBlur)" opacity="' + fmt(textOpacity, 2) + '">' +
          '<text x="' + fmt(-ghostOffset, 1) + '" y="24" text-anchor="middle" fill="none" stroke="rgba(248,250,252,.26)" stroke-width="3.6" font-size="52" font-weight="950" font-family="monospace" letter-spacing=".05em">' + esc(plateText) + '</text>' +
          '<text x="' + fmt(ghostOffset, 1) + '" y="24" text-anchor="middle" fill="none" stroke="' + esc(stroke) + '" stroke-width="1.35" font-size="52" font-weight="950" font-family="monospace" letter-spacing=".05em">' + esc(plateText) + '</text>' +
        '</g>' +

        '<rect x="-140" y="-62" width="280" height="124" rx="12" fill="url(#psPlatePixelPattern)" opacity="' + fmt(pixelOpacity, 2) + '" />' +
      '</g>';
  }

  // data-physical-security-license-plate-renderer-001
  function renderLicensePlateRangePlanSvg(model) {
    const m = model && typeof model === "object" ? model : {};

    const maxDist = Math.max(0, num(m.maxDistFt ?? m.maxDist, 0));
    const actualDist = Math.max(0, num(m.actualDistanceFt ?? m.dist, 0));
    const deliveredPpp = Math.max(0, num(m.deliveredPpp, 0));
    const targetPpp = Math.max(0, num(m.targetPpp ?? m.ppp, 0));
    const marginFt = num(m.marginFt, maxDist - actualDist);
    const utilizationPct = Math.max(0, num(m.utilizationPct, maxDist > 0 ? (actualDist / maxDist) * 100 : 0));
    const status = String(m.status || "Healthy").toLowerCase();
    const classification = String(m.classification || "License plate capture");

    if (!maxDist || !actualDist || !targetPpp || !deliveredPpp) {
      return fallbackSvg("SL-PS-GFX-PLATE-BAD-MODEL", "License Plate renderer needs max distance, actual distance, delivered PPP, and target PPP.", {
        renderer: "license-plate-range-plan",
        tool: m.tool || "license-plate-range"
      });
    }

    const svgW = 800;
    const svgH = 430;
    const stage = { x: 34, y: 92, width: 732, height: 286 };

    const statusLabel = status.includes("risk") ? "RISK" : status.includes("watch") ? "WATCH" : "HEALTHY";
    const statusColor = statusLabel === "RISK"
      ? "rgba(255,143,136,.92)"
      : statusLabel === "WATCH"
        ? "rgba(255,211,79,.92)"
        : "rgba(125,255,158,.90)";

    const statusSoft = statusLabel === "RISK"
      ? "rgba(255,143,136,.12)"
      : statusLabel === "WATCH"
        ? "rgba(255,211,79,.12)"
        : "rgba(125,255,158,.10)";

    const rangeMax = Math.max(maxDist, actualDist) * 1.18;
    const trackX1 = 128;
    const trackX2 = 686;
    const trackY = 225;
    const trackW = trackX2 - trackX1;

    function xForDistance(value) {
      return trackX1 + (clamp(value / rangeMax, 0, 1) * trackW);
    }

    const maxX = xForDistance(maxDist);
    const actualX = xForDistance(actualDist);
    const cameraX = 90;
    const cameraY = trackY;
    const laneTop = 158;
    const laneBottom = 292;

    const detailRatio = clamp(deliveredPpp / Math.max(targetPpp, 1), 0.18, 1.45);
    const degradation = clamp((1.08 - detailRatio) / 0.58, 0, 1);
    const blur = clamp(degradation * 2.2, 0, 2.4);
    const pppBarW = clamp(270 * Math.min(detailRatio, 1.25), 10, 338);

    const targetColor = marginFt < 0
      ? "rgba(255,143,136,.92)"
      : utilizationPct > 95
        ? "rgba(255,211,79,.92)"
        : "rgba(125,255,158,.92)";

    return "" +
      '<svg data-suppress-legacy-chart-export="true" data-report-renderer="license-plate-range-plan" data-report-visual-owner="physical-security-graphics" data-export-svg class="license-plate-range-svg sl-ps-gfx-svg" data-sl-engine="physical-security-graphics" data-sl-renderer="license-plate-range-plan" data-sl-category="physical-security" data-sl-version="' + esc(VERSION) + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="' + esc(m.ariaLabel || "License Plate range validation visual") + '">' +
        '<defs>' +
          '<linearGradient id="psPlateEnvelope" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(125,255,158,.16)" /><stop offset="100%" stop-color="rgba(125,255,158,.035)" /></linearGradient>' +
          '<linearGradient id="psPlateBeyond" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,143,136,.10)" /><stop offset="100%" stop-color="rgba(255,143,136,.03)" /></linearGradient>' +
          '<linearGradient id="psPlatePppBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' + targetColor + '" stop-opacity=".54" /><stop offset="100%" stop-color="' + targetColor + '" stop-opacity=".92" /></linearGradient>' +
          '<filter id="psPlateClarityBlur"><feGaussianBlur stdDeviation="' + fmt(blur, 2) + '" /></filter>' +
          '<pattern id="psPlatePixelPattern" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(2,6,23,.42)" /><rect x="1" y="1" width="3" height="3" fill="rgba(125,255,158,.18)" /><rect x="5" y="5" width="3" height="3" fill="rgba(248,250,252,.08)" /></pattern>' +
        '</defs>' +

        '<text x="52" y="34" fill="rgba(248,250,252,.92)" font-size="18" font-weight="950">License plate capture range validation</text>' +
        '<text x="52" y="56" fill="rgba(226,232,240,.62)" font-size="12">' + esc(classification) + ' / readable plate detail compared with working distance.</text>' +

        CAD.stage(stage.x, stage.y, stage.width, stage.height, { rx: 20 }) +
        cadGrid(stage) +
        CAD.statusPill(690, 148, statusLabel, {
          width: 64,
          height: 20,
          color: statusColor,
          textFill: statusColor,
          size: 9.2
        }) +

        '<text x="54" y="122" fill="rgba(125,255,158,.82)" font-size="10.4" font-weight="950" letter-spacing=".11em">PLATE CAPTURE ENVELOPE / READABILITY</text>' +
        '<text x="54" y="144" fill="rgba(226,232,240,.58)" font-size="9.8" font-weight="720">Camera geometry, plate-width assumption, and pixels-per-plate target.</text>' +

        cameraCadIcon(cameraX, cameraY, {
          scale: 0.52,
          color: "rgba(125,255,158,.90)",
          accent: "rgba(125,255,158,.78)",
          symbol: "license-plate-camera"
        }) +

        '<path d="M ' + fmt(cameraLensTipX(cameraX), 1) + ' ' + fmt(cameraY, 1) + ' L ' + fmt(maxX, 1) + ' ' + fmt(laneTop, 1) + ' L ' + fmt(maxX, 1) + ' ' + fmt(laneBottom, 1) + ' Z" fill="rgba(125,255,158,.04)" stroke="rgba(125,255,158,.23)" stroke-width=".9" />' +

        '<rect x="' + fmt(trackX1, 1) + '" y="' + fmt(trackY - 44, 1) + '" width="' + fmt(Math.max(4, maxX - trackX1), 1) + '" height="88" rx="18" fill="url(#psPlateEnvelope)" stroke="rgba(125,255,158,.34)" stroke-width="1" />' +
        (actualDist > maxDist
          ? '<rect x="' + fmt(maxX, 1) + '" y="' + fmt(trackY - 44, 1) + '" width="' + fmt(Math.max(4, actualX - maxX), 1) + '" height="88" rx="12" fill="url(#psPlateBeyond)" stroke="rgba(255,143,136,.34)" stroke-width="1" />'
          : "") +

        CAD.dimensionLine(trackX1, 330, maxX, 330, "Modeled envelope: " + fmtFt(maxDist, 1), {
          color: "rgba(125,255,158,.58)",
          labelFill: "rgba(125,255,158,.84)",
          tick: 7
        }) +

        CAD.dimensionLine(trackX1, 360, actualX, 360, "Actual distance: " + fmtFt(actualDist, 1), {
          color: targetColor,
          labelFill: targetColor,
          tick: 7
        }) +

        '<line x1="' + fmt(maxX, 1) + '" y1="' + fmt(trackY - 66, 1) + '" x2="' + fmt(maxX, 1) + '" y2="' + fmt(trackY + 66, 1) + '" stroke="rgba(125,255,158,.70)" stroke-width="1.15" stroke-dasharray="5 6" />' +
        '<text x="' + fmt(maxX, 1) + '" y="' + fmt(trackY - 76, 1) + '" text-anchor="middle" fill="rgba(125,255,158,.84)" font-size="9" font-weight="900">MAX</text>' +

        '<line x1="' + fmt(actualX, 1) + '" y1="' + fmt(laneTop - 12, 1) + '" x2="' + fmt(actualX, 1) + '" y2="' + fmt(laneBottom + 12, 1) + '" stroke="' + targetColor + '" stroke-width="1.15" stroke-dasharray="6 7" opacity=".72" />' +

        licensePlateCadTargetMarker(actualX, trackY - 4, {
          scale: 0.34,
          stroke: targetColor,
          color: targetColor,
          muted: "rgba(226,232,240,.52)",
          fill: "rgba(2,6,23,.78)",
          clarityRatio: detailRatio,
          degrade: degradation
        }) +

        '<text x="' + fmt(actualX, 1) + '" y="' + fmt(trackY + 82, 1) + '" text-anchor="middle" fill="' + targetColor + '" font-size="9" font-weight="950">TARGET PLATE</text>' +

        '<rect x="414" y="132" width="270" height="10" rx="5" fill="rgba(255,255,255,.04)" stroke="rgba(226,232,240,.12)" />' +
        '<rect x="414" y="132" width="' + fmt(pppBarW, 1) + '" height="10" rx="5" fill="url(#psPlatePppBar)" />' +
        '<text x="414" y="122" fill="rgba(226,232,240,.62)" font-size="9.4" font-weight="850">Delivered plate detail vs target</text>' +
        '<text x="684" y="122" text-anchor="end" fill="' + targetColor + '" font-size="9.4" font-weight="950">' + esc(fmt(deliveredPpp, 0) + " / " + fmt(targetPpp, 0) + " px") + '</text>' +

        CAD.metricChip(72, 386, "MAX RANGE", fmtFt(maxDist, 1), {
          accent: "rgba(125,255,158,.82)",
          valueFill: "rgba(125,255,158,.92)",
          width: 146
        }) +
        CAD.metricChip(236, 386, "ACTUAL", fmtFt(actualDist, 1), {
          accent: targetColor,
          valueFill: targetColor,
          width: 132
        }) +
        CAD.metricChip(386, 386, "DELIVERED", fmt(deliveredPpp, 0) + " px", {
          accent: targetColor,
          valueFill: targetColor,
          width: 136
        }) +
        CAD.metricChip(540, 386, "MARGIN", (marginFt >= 0 ? "+" : "-") + fmtFt(Math.abs(marginFt), 1), {
          accent: statusColor,
          valueFill: statusColor,
          width: 142
        }) +
      '</svg>';
  }

  // data-physical-security-scene-illumination-renderer-002
  function renderSceneIlluminationLightingPlanSvg(model) {
    const m = model && typeof model === "object" ? model : {};

    const areaWidth = Math.max(0, num(m.areaWidthFt ?? m.w ?? m.widthFt, 0));
    const areaDepth = Math.max(0, num(m.areaDepthFt ?? m.d ?? m.depthFt, 0));
    const areaSqFt = Math.max(0, num(m.areaSqFt ?? m.area, areaWidth * areaDepth));
    const targetFc = Math.max(0, num(m.targetFootcandles ?? m.fc, 0));
    const lumens = Math.max(0, num(m.estimatedLumens ?? m.lumens, 0));
    const effectiveFactor = clamp(num(m.effectiveFactor, 0), 0, 1);
    const ufPct = clamp(num(m.utilizationPct ?? m.ufPct, 0), 0, 100);
    const llfPct = clamp(num(m.lightLossPct ?? m.llfPct, 0), 0, 100);
    const lumenDensity = Math.max(0, num(m.lumenDensity, areaSqFt > 0 ? lumens / areaSqFt : 0));
    const status = String(m.status || "Healthy").toLowerCase();
    const lightingClass = String(m.lightingClass || "Lighting baseline");
    const goalLabel = String(m.lightingGoalLabel || m.goalLabel || "Scene lighting");

    if (!areaWidth || !areaDepth || !targetFc || !lumens) {
      return fallbackSvg("SL-PS-GFX-SCENE-ILLUMINATION-BAD-MODEL", "Scene Illumination renderer needs area width/depth, target footcandles, and estimated lumens.", {
        renderer: "scene-illumination-lighting-plan",
        tool: m.tool || "scene-illumination"
      });
    }

    const svgW = 800;
    const svgH = 526;
    const stage = { x: 34, y: 170, width: 732, height: 314 };

    const statusLabel = status.includes("risk") ? "RISK" : status.includes("watch") ? "WATCH" : "HEALTHY";
    const statusColor = statusLabel === "RISK"
      ? "rgba(255,143,136,.92)"
      : statusLabel === "WATCH"
        ? "rgba(255,211,79,.92)"
        : "rgba(125,255,158,.90)";

    const statusSoft = statusLabel === "RISK"
      ? "rgba(255,143,136,.12)"
      : statusLabel === "WATCH"
        ? "rgba(255,211,79,.12)"
        : "rgba(125,255,158,.12)";

    const barX = 292;
    const barW = 280;
    const labelX = 52;
    const valueX = 740;
    const row1Y = 78;
    const rowGap = 32;
    const barH = 10;

    const targetMax = Math.max(targetFc, 10);
    const fcBarW = Math.max(8, Math.min(barW, barW * (targetFc / targetMax)));
    const factorBarW = Math.max(8, Math.min(barW, barW * effectiveFactor));
    const lumensPerSqFtMax = Math.max(lumenDensity, 12);
    const loadBarW = Math.max(8, Math.min(barW, barW * (lumenDensity / lumensPerSqFtMax)));

    // Visual-only intensity model: higher fc targets draw larger/brighter halos; lower fc targets draw smaller/softer halos.
    // This is not a fixture photometric simulation.
    const haloFcVisual = clamp(Math.sqrt(Math.max(targetFc, 0.1) / 5), 0.26, 1.38);
    const haloMaintenanceVisual = clamp(0.78 + (effectiveFactor * 0.44), 0.78, 1.10);
    const haloVisual = clamp(haloFcVisual * haloMaintenanceVisual, 0.24, 1.42);

    const haloOuterRx = clamp(78 + (haloVisual * 54), 84, 154);
    const haloOuterRy = clamp(38 + (haloVisual * 28), 42, 78);
    const haloMidRx = clamp(46 + (haloVisual * 38), 50, 98);
    const haloMidRy = clamp(22 + (haloVisual * 22), 24, 52);
    const haloCoreRx = clamp(18 + (haloVisual * 24), 20, 50);
    const haloCoreRy = clamp(9 + (haloVisual * 14), 10, 28);

    const haloOuterOpacity = clamp(0.10 + (haloVisual * 0.58), 0.18, 0.88);
    const haloMidOpacity = clamp(0.15 + (haloVisual * 0.66), 0.22, 0.96);
    const haloCoreOpacity = clamp(0.22 + (haloVisual * 0.72), 0.30, 1.00);

    const planX = 112;
    const planY = 235;
    const planW = 520;
    const planH = 142;

    const chipGap = 14;
    const areaChipW = 132;
    const lumensChipW = 126;
    const ufChipW = 136;
    const effectiveChipW = 132;
    const chipRowW = areaChipW + lumensChipW + ufChipW + effectiveChipW + (chipGap * 3);
    const chipStartX = stage.x + ((stage.width - chipRowW) / 2);
    const chipRowY = 444;

    const fixtureY = planY + planH - 8;
    const fixtureXs = [
      planX + planW * 0.22,
      planX + planW * 0.50,
      planX + planW * 0.78
    ];

    function barRow(y, label, value, width, fill, stroke) {
      return "" +
        '<text x="' + labelX + '" y="' + y + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">' + esc(label) + '</text>' +
        '<rect x="' + barX + '" y="' + (y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="' + esc(stroke || "rgba(125,255,152,.12)") + '" />' +
        '<rect x="' + barX + '" y="' + (y - 8) + '" width="' + fmt(width, 1) + '" height="' + barH + '" rx="5" fill="' + esc(fill) + '" />' +
        '<text x="' + valueX + '" y="' + y + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + esc(value) + '</text>';
    }

    function fixture(x, y, index) {
      const haloCx = x;
      const haloCy = planY + Math.max(58, planH * 0.50);
      const fixtureScale = 0.34;
      const headOffsetFromBase = 122 * fixtureScale;
      const iconHeadY = planY + planH - 62;
      const iconBaseY = iconHeadY + headOffsetFromBase;

      return "" +
        '<g data-ps-graphic-part="lighting-fixture">' +
          '<ellipse cx="' + fmt(haloCx, 1) + '" cy="' + fmt(haloCy, 1) + '" rx="' + fmt(haloOuterRx, 1) + '" ry="' + fmt(haloOuterRy, 1) + '" fill="url(#psSceneLightHaloOuter)" opacity="' + fmt(haloOuterOpacity, 2) + '" />' +
          '<ellipse cx="' + fmt(haloCx, 1) + '" cy="' + fmt(haloCy + 1, 1) + '" rx="' + fmt(haloMidRx, 1) + '" ry="' + fmt(haloMidRy, 1) + '" fill="url(#psSceneLightHaloMid)" opacity="' + fmt(haloMidOpacity, 2) + '" />' +
          '<ellipse cx="' + fmt(haloCx, 1) + '" cy="' + fmt(haloCy + 1, 1) + '" rx="' + fmt(haloCoreRx, 1) + '" ry="' + fmt(haloCoreRy, 1) + '" fill="url(#psSceneLightHaloCore)" opacity="' + fmt(haloCoreOpacity, 2) + '" />' +

          '<line x1="' + fmt(haloCx, 1) + '" y1="' + fmt(haloCy + 18, 1) + '" x2="' + fmt(haloCx, 1) + '" y2="' + fmt(iconHeadY + 5, 1) + '" stroke="rgba(255,226,128,.14)" stroke-width=".8" stroke-dasharray="4 7" />' +

          streetLightFixtureCadIcon(haloCx, iconHeadY, {
            scale: fixtureScale,
            rotation: -90,
            stroke: "rgba(255,226,128,.92)",
            accent: "rgba(255,239,176,.90)",
            muted: "rgba(226,232,240,.52)"
          }) +

          '<text x="' + fmt(haloCx, 1) + '" y="' + fmt(iconBaseY + 14, 1) + '" text-anchor="middle" fill="rgba(255,239,176,.84)" font-size="8.2" font-weight="950">L' + index + '</text>' +
        '</g>';
    }

    return "" +
      '<svg data-suppress-legacy-chart-export="true" data-report-renderer="scene-illumination-lighting-plan" data-report-visual-owner="physical-security-graphics" data-export-svg class="scene-illumination-lighting-svg sl-ps-gfx-svg" data-sl-engine="physical-security-graphics" data-sl-renderer="scene-illumination-lighting-plan" data-sl-category="physical-security" data-sl-version="' + esc(VERSION) + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="' + esc(m.ariaLabel || "Scene Illumination CAD lighting baseline view") + '">' +
        '<defs>' +
          '<linearGradient id="psSceneIlluminationTargetBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,211,79,.62)" /><stop offset="100%" stop-color="rgba(255,226,128,.90)" /></linearGradient>' +
          '<linearGradient id="psSceneIlluminationFactorBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(125,255,158,.54)" /><stop offset="100%" stop-color="rgba(125,255,158,.88)" /></linearGradient>' +
          '<linearGradient id="psSceneIlluminationLoadBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' + statusColor + '" stop-opacity=".62" /><stop offset="100%" stop-color="' + statusColor + '" stop-opacity=".92" /></linearGradient>' +
          '<radialGradient id="psSceneLightHaloCore" cx="50%" cy="42%" r="60%"><stop offset="0%" stop-color="rgba(255,239,176,.54)" /><stop offset="45%" stop-color="rgba(125,255,158,.28)" /><stop offset="100%" stop-color="rgba(125,255,158,0)" /></radialGradient>' +
          '<radialGradient id="psSceneLightHaloMid" cx="50%" cy="42%" r="68%"><stop offset="0%" stop-color="rgba(125,255,158,.22)" /><stop offset="60%" stop-color="rgba(125,255,158,.10)" /><stop offset="100%" stop-color="rgba(125,255,158,0)" /></radialGradient>' +
          '<radialGradient id="psSceneLightHaloOuter" cx="50%" cy="42%" r="72%"><stop offset="0%" stop-color="rgba(255,211,79,.16)" /><stop offset="58%" stop-color="rgba(125,255,158,.07)" /><stop offset="100%" stop-color="rgba(255,143,136,0)" /></radialGradient>' +
          '<pattern id="psSceneIlluminationGrid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(226,232,240,.075)" stroke-width=".7" /></pattern>' +
          '<clipPath id="psSceneLightingAreaClip"><rect x="' + planX + '" y="' + planY + '" width="' + planW + '" height="' + planH + '" rx="16" /></clipPath>' +
        '</defs>' +

        '<text x="52" y="26" fill="rgba(248,250,252,.92)" font-size="18" font-weight="900">Scene lighting baseline</text>' +
        '<text x="52" y="48" fill="rgba(226,232,240,.62)" font-size="12">' + esc(goalLabel) + ' / ' + esc(lightingClass) + ' / maintained-light planning factor.</text>' +

        barRow(row1Y, "Target illumination", fmt(targetFc, 1) + " fc", fcBarW, "url(#psSceneIlluminationTargetBar)", "rgba(255,211,79,.14)") +
        barRow(row1Y + rowGap, "Effective planning factor", fmtPct(effectiveFactor * 100, 0), factorBarW, "url(#psSceneIlluminationFactorBar)", "rgba(125,255,152,.12)") +
        barRow(row1Y + rowGap * 2, "Output load density", fmt(lumenDensity, 2) + " lm/sq ft", loadBarW, "url(#psSceneIlluminationLoadBar)", statusColor) +

        CAD.stage(stage.x, stage.y, stage.width, stage.height, { rx: 20 }) +
        cadGrid(stage) +

        '<text x="54" y="194" fill="rgba(125,255,158,.78)" font-size="10.4" font-weight="950" letter-spacing=".11em">TOP-DOWN MAINTAINED-LIGHT PLAN</text>' +
        '<text x="54" y="214" fill="rgba(226,232,240,.56)" font-size="9.5" font-weight="720">Conceptual fixture falloff visualization, not a fixture photometric simulation.</text>' +
        CAD.statusPill(674, 190, statusLabel, {
          width: 66,
          height: 22,
          color: statusColor,
          textFill: statusColor,
          size: 9.1
        }) +

        '<rect x="' + planX + '" y="' + planY + '" width="' + planW + '" height="' + planH + '" rx="16" fill="rgba(125,255,158,.025)" stroke="' + statusColor + '" stroke-opacity=".48" stroke-width="1.15" />' +
        '<g clip-path="url(#psSceneLightingAreaClip)">' +
          '<rect x="' + planX + '" y="' + planY + '" width="' + planW + '" height="' + planH + '" rx="16" fill="url(#psSceneIlluminationGrid)" opacity=".72" />' +
          fixture(fixtureXs[0], fixtureY, 1) +
          fixture(fixtureXs[1], fixtureY, 2) +
          fixture(fixtureXs[2], fixtureY, 3) +
          '<rect x="' + planX + '" y="' + planY + '" width="' + planW + '" height="' + planH + '" rx="16" fill="' + statusSoft + '" opacity=".62" />' +
        '</g>' +
        '<rect x="' + planX + '" y="' + planY + '" width="' + planW + '" height="' + planH + '" rx="16" fill="none" stroke="' + statusColor + '" stroke-opacity=".55" stroke-width="1.1" />' +

        '<text x="' + (planX + 18) + '" y="' + (planY + 24) + '" fill="rgba(248,250,252,.88)" font-size="11" font-weight="950">MAINTAINED LIGHT ZONE</text>' +
        '<text x="' + (planX + 18) + '" y="' + (planY + 43) + '" fill="rgba(226,232,240,.64)" font-size="10" font-weight="760">Brighter overlap areas show stronger conceptual fixture contribution</text>' +
        '<text x="' + (planX + planW - 18) + '" y="' + (planY + 24) + '" text-anchor="end" fill="' + statusColor + '" font-size="11" font-weight="950">' + esc(fmt(targetFc, 1) + " fc target") + '</text>' +

        CAD.dimensionLine(planX, planY + planH + 24, planX + planW, planY + planH + 24, "Area width: " + fmtFt(areaWidth, 0), {
          color: colors.axis,
          labelFill: "rgba(226,232,240,.72)",
          tick: 7
        }) +
        CAD.dimensionLine(planX + planW + 36, planY, planX + planW + 36, planY + planH, "Depth: " + fmtFt(areaDepth, 0), {
          color: colors.axis,
          labelFill: "rgba(226,232,240,.72)",
          tick: 7
        }) +

        CAD.metricChip(chipStartX, chipRowY, "AREA", fmt(areaSqFt, 0) + " sq ft", {
          accent: "rgba(125,255,158,.82)",
          valueFill: "rgba(248,250,252,.88)",
          width: 132
        }) +
        CAD.metricChip(chipStartX + areaChipW + chipGap, chipRowY, "LUMENS", fmt(lumens, 0), {
          accent: statusColor,
          valueFill: statusColor,
          width: 126
        }) +
        CAD.metricChip(chipStartX + areaChipW + chipGap + lumensChipW + chipGap, chipRowY, "UF / LLF", fmtPct(ufPct, 0) + " / " + fmtPct(llfPct, 0), {
          accent: "rgba(255,226,128,.86)",
          valueFill: "rgba(255,239,176,.92)",
          width: 136
        }) +
        CAD.metricChip(chipStartX + areaChipW + chipGap + lumensChipW + chipGap + ufChipW + chipGap, chipRowY, "EFFECTIVE", fmtPct(effectiveFactor * 100, 0), {
          accent: statusColor,
          valueFill: statusColor,
          width: 132
        }) +
      '</svg>';
  }


  function renderCameraLayoutIsoSvg(model) {
    return renderSharedPhysicalSecuritySvg("camera-layout-iso", sharedCameraLayoutIsoRenderer, model);
  }

  function renderScenarioPressureLineSvg(model) {
    return renderSharedPhysicalSecuritySvg("scenario-pressure-line", sharedScenarioPressureLineRenderer, model);
  }


  // data-physical-security-light-fixture-primitive-001
  function streetLightFixtureCadIcon(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const stroke = opts.stroke || opts.color || "rgba(255,226,128,.90)";
    const accent = opts.accent || "rgba(255,239,176,.90)";
    const muted = opts.muted || "rgba(226,232,240,.44)";
    const fill = opts.fill || "rgba(8,18,18,.92)";
    const scale = Number.isFinite(Number(opts.scale)) ? Number(opts.scale) : 0.34;
    const rotation = Number.isFinite(Number(opts.rotation)) ? Number(opts.rotation) : -90;

    return "" +
      '<g transform="translate(' + fmt(x, 1) + ' ' + fmt(y, 1) + ') rotate(' + fmt(rotation, 1) + ') scale(' + fmt(scale, 3) + ')" class="sl-cad-light-fixture" data-ps-graphic-part="lighting-fixture-icon" data-graphics-symbol="cad-proportional-streetlight-topview">' +

        '<circle cx="-122" cy="0" r="18" fill="rgba(2,6,23,.76)" stroke="' + esc(muted) + '" stroke-width="1.3" />' +
        '<circle cx="-122" cy="0" r="12" fill="none" stroke="' + esc(stroke) + '" stroke-width="1.25" opacity=".86" />' +
        '<circle cx="-122" cy="0" r="7" fill="rgba(125,255,158,.035)" stroke="' + esc(stroke) + '" stroke-width="1.05" opacity=".78" />' +

        '<circle cx="-134" cy="-11" r="2.4" fill="none" stroke="' + esc(stroke) + '" stroke-width=".95" />' +
        '<line x1="-136.3" y1="-11" x2="-131.7" y2="-11" stroke="' + esc(stroke) + '" stroke-width=".65" />' +
        '<line x1="-134" y1="-13.3" x2="-134" y2="-8.7" stroke="' + esc(stroke) + '" stroke-width=".65" />' +

        '<circle cx="-110" cy="-11" r="2.4" fill="none" stroke="' + esc(stroke) + '" stroke-width=".95" />' +
        '<line x1="-112.3" y1="-11" x2="-107.7" y2="-11" stroke="' + esc(stroke) + '" stroke-width=".65" />' +
        '<line x1="-110" y1="-13.3" x2="-110" y2="-8.7" stroke="' + esc(stroke) + '" stroke-width=".65" />' +

        '<circle cx="-134" cy="11" r="2.4" fill="none" stroke="' + esc(stroke) + '" stroke-width=".95" />' +
        '<line x1="-136.3" y1="11" x2="-131.7" y2="11" stroke="' + esc(stroke) + '" stroke-width=".65" />' +
        '<line x1="-134" y1="8.7" x2="-134" y2="13.3" stroke="' + esc(stroke) + '" stroke-width=".65" />' +

        '<circle cx="-110" cy="11" r="2.4" fill="none" stroke="' + esc(stroke) + '" stroke-width=".95" />' +
        '<line x1="-112.3" y1="11" x2="-107.7" y2="11" stroke="' + esc(stroke) + '" stroke-width=".65" />' +
        '<line x1="-110" y1="8.7" x2="-110" y2="13.3" stroke="' + esc(stroke) + '" stroke-width=".65" />' +

        '<path d="M -110 -3 C -92 -4 -70 -4 -34 -3 L -34 3 C -70 4 -92 4 -110 3 Z" fill="rgba(2,6,23,.62)" stroke="' + esc(muted) + '" stroke-width=".95" />' +
        '<path d="M -106 -2 C -84 -2.5 -62 -2.5 -36 -2" fill="none" stroke="' + esc(stroke) + '" stroke-width=".65" opacity=".58" />' +
        '<path d="M -106 2 C -84 2.5 -62 2.5 -36 2" fill="none" stroke="' + esc(stroke) + '" stroke-width=".65" opacity=".46" />' +

        '<rect x="-37" y="-7" width="14" height="14" rx="1.6" fill="rgba(2,6,23,.78)" stroke="' + esc(muted) + '" stroke-width=".9" />' +
        '<circle cx="-30" cy="0" r="2.3" fill="none" stroke="' + esc(stroke) + '" stroke-width=".8" />' +
        '<line x1="-32.1" y1="0" x2="-27.9" y2="0" stroke="' + esc(stroke) + '" stroke-width=".55" />' +
        '<line x1="-30" y1="-2.1" x2="-30" y2="2.1" stroke="' + esc(stroke) + '" stroke-width=".55" />' +

        '<path d="M -21 -15 C -10 -18 13 -19 30 -15 C 43 -12 49 -4 49 0 C 49 4 43 12 30 15 C 13 19 -10 18 -21 15 C -26 10 -27 -10 -21 -15 Z" fill="' + esc(fill) + '" stroke="' + esc(muted) + '" stroke-width="1.2" />' +
        '<path d="M -17 -11 C -4 -14 15 -14 29 -11 C 39 -8 43 -2 43 0 C 43 2 39 8 29 11 C 15 14 -4 14 -17 11" fill="none" stroke="' + esc(stroke) + '" stroke-width=".95" opacity=".82" />' +

        '<path d="M 5 -10 C 8 -6 8 6 5 10" fill="none" stroke="' + esc(accent) + '" stroke-width=".55" opacity=".72" />' +
        '<path d="M 10 -10 C 13 -6 13 6 10 10" fill="none" stroke="' + esc(accent) + '" stroke-width=".55" opacity=".72" />' +
        '<path d="M 15 -10 C 18 -6 18 6 15 10" fill="none" stroke="' + esc(accent) + '" stroke-width=".55" opacity=".72" />' +
        '<path d="M 20 -9 C 23 -5 23 5 20 9" fill="none" stroke="' + esc(accent) + '" stroke-width=".55" opacity=".72" />' +

        '<line x1="45" y1="0" x2="58" y2="0" stroke="' + esc(accent) + '" stroke-width=".75" stroke-opacity=".48" stroke-dasharray="3 4" stroke-linecap="round" />' +
      '</g>';
  }

  function lightingFixturePlanMarker(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const label = opts.label || "";
    const labelY = Number.isFinite(Number(opts.labelY)) ? Number(opts.labelY) : y - 24;

    return "" +
      (label ? CAD.text(x, labelY, label, {
        anchor: "middle",
        fill: opts.labelFill || "rgba(255,239,176,.84)",
        size: opts.labelSize || 8.8,
        weight: 950,
        spacing: ".08em"
      }) : "") +
      streetLightFixtureCadIcon(x, y, opts);
  }


  const primitives = {
    cadGrid,
    cameraLensTipX,
    cameraCadIcon,
    cameraPlanMarker,
    streetLightFixtureCadIcon,
    lightingFixturePlanMarker,
    cameraPositionMarker,
    fovCone,
    targetPlane,
    dimensionLine,
    axisLine,
    coverageFootprint,
    overlapBand,
    blindGap,
    metricChip,
    statusPill,
    spanLinks,
    hfovCallout
  };

  gfx.registerRenderer("camera-layout-iso", renderCameraLayoutIsoSvg);
  gfx.registerRenderer("scenario-pressure-line", renderScenarioPressureLineSvg);
  gfx.registerRenderer("scene-illumination-lighting-plan", renderSceneIlluminationLightingPlanSvg);
  gfx.registerRenderer("face-recognition-range-plan", renderFaceRecognitionRangePlanSvg);
  gfx.registerRenderer("license-plate-range-plan", renderLicensePlateRangePlanSvg);
  gfx.registerRenderer("pixel-density-detail-plan", renderPixelDensityDetailPlanSvg);
  gfx.registerRenderer("coverage-footprint-plan", renderCoverageFootprintPlanSvg);
  gfx.registerRenderer("fov-geometry-plan", renderFovGeometryPlanSvg);

  window.ScopedLabsPhysicalSecurityGraphics = {
    version: VERSION,
    category: CATEGORY,
    ready: true,
    colors,
    primitives,
    renderCameraLayoutIsoSvg,
    renderScenarioPressureLineSvg,
    renderSceneIlluminationLightingPlanSvg,
    renderFaceRecognitionRangePlanSvg,
    renderLicensePlateRangePlanSvg,
    renderCoverageFootprintPlanSvg,
    renderPixelDensityDetailPlanSvg,
    renderFovGeometryPlanSvg
  };
})();
