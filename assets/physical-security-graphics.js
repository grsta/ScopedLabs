/*!
 * ScopedLabs Physical Security Graphics Library
 * Category primitives layered on top of /assets/scopedlabs-graphics.js.
 * Version: physical-security-graphics-004-direct-fov-render
 *
 * Rule: render visual models only. Engineering formulas stay in each tool.
 */
(function () {
  "use strict";

  const VERSION = "physical-security-graphics-004-direct-fov-render";
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
    return x + 118;
  }

  function cameraPlanMarker(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const label = opts.label || "CAMERA";
    const color = opts.color || colors.camera;

    return "" +
      '<g data-ps-graphic-part="camera-marker">' +
        CAD.text(x + 63, y - 40, label, {
          anchor: "middle",
          fill: opts.labelFill || "rgba(248,250,252,.72)",
          size: 8.9,
          weight: 900,
          spacing: ".08em"
        }) +

        '<circle cx="' + fmt(x, 2) + '" cy="' + fmt(y, 2) + '" r="16" fill="rgba(125,255,158,.028)" stroke="rgba(125,255,158,.18)" stroke-width=".9" />' +
        '<circle cx="' + fmt(x, 2) + '" cy="' + fmt(y, 2) + '" r="3.7" fill="' + esc(color) + '" />' +

        CAD.line(x + 4, y, x + 26, y, {
          stroke: "rgba(125,255,158,.72)",
          width: 1.45,
          linecap: "round"
        }) +

        '<rect x="' + fmt(x + 26, 2) + '" y="' + fmt(y - 14, 2) + '" width="70" height="28" rx="2.5" fill="rgba(6,18,12,.90)" stroke="' + esc(color) + '" stroke-width="1.25" />' +
        '<rect x="' + fmt(x + 35, 2) + '" y="' + fmt(y - 8, 2) + '" width="45" height="16" rx="1.5" fill="rgba(125,255,158,.045)" stroke="rgba(125,255,158,.14)" stroke-width=".75" />' +

        '<path d="M ' + fmt(x + 96, 2) + ' ' + fmt(y - 11, 2) + ' L ' + fmt(x + 118, 2) + ' ' + fmt(y, 2) + ' L ' + fmt(x + 96, 2) + ' ' + fmt(y + 11, 2) + ' Z" fill="rgba(125,255,158,.145)" stroke="' + esc(color) + '" stroke-width="1.25" stroke-linejoin="round" />' +
        '<line x1="' + fmt(x + 118, 2) + '" y1="' + fmt(y - 9, 2) + '" x2="' + fmt(x + 118, 2) + '" y2="' + fmt(y + 9, 2) + '" stroke="rgba(125,255,158,.30)" stroke-width=".8" />' +
        '<circle cx="' + fmt(x + 118, 2) + '" cy="' + fmt(y, 2) + '" r="2" fill="' + esc(color) + '" />' +
      '</g>';
  }

  function fovCone(lensTipX, centerY, targetX, topY, bottomY, options) {
    const opts = options && typeof options === "object" ? options : {};

    return '<path data-ps-graphic-part="fov-cone" d="M ' +
      fmt(cameraX, 2) + ' ' + fmt(centerY, 2) +
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
    const svgH = 342;
    const stage = { x: 26, y: 24, width: 788, height: 292 };
    const cameraX = 156;
    const lensTipX = cameraLensTipX(cameraX);
    const centerY = 176;
    const targetX = 590;
    const requiredX = 706;
    const dimY = 280;
    const maxSpanPx = 178;
    const maxWidth = Math.max(calculatedWidth, requiredWidth, 1);
    const scale = maxSpanPx / maxWidth;
    const calcPx = clamp(calculatedWidth * scale, 34, maxSpanPx);
    const reqPx = clamp(requiredWidth * scale, 34, maxSpanPx);
    const calcTopY = centerY - calcPx / 2;
    const calcBottomY = centerY + calcPx / 2;
    const reqTopY = centerY - reqPx / 2;
    const reqBottomY = centerY + reqPx / 2;
    const arrowId = "psFovCadArrow002";
    const coneId = "psFovCadCone002";

    return "" +
      '<svg data-export-svg class="fov-geometry-svg sl-ps-gfx-svg" data-sl-engine="physical-security-graphics" data-sl-renderer="fov-geometry-plan" data-sl-category="physical-security" data-sl-version="' + esc(VERSION) + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="' + esc(m.ariaLabel || "Field of View CAD plan view") + '">' +
        CAD.defs("psFovCad002", {
          arrowId,
          coneId,
          coneFill: tone.soft
        }) +
        CAD.stage(stage.x, stage.y, stage.width, stage.height, {
          rx: 20
        }) +
        cadGrid(stage) +

        CAD.text(54, 54, "PHYSICAL SECURITY / FOV PLAN", {
          fill: "rgba(125,255,158,.74)",
          size: 10.2,
          weight: 925,
          spacing: ".11em"
        }) +
        CAD.text(54, 74, "Plan-view footprint comparison. Summary metrics stay outside the drawing frame.", {
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

        CAD.line(lensTipX, centerY, requiredX + 22, centerY, {
          stroke: "rgba(226,232,240,.18)",
          width: 0.85,
          dash: "5 8"
        }) +
        fovCone(lensTipX, centerY, targetX, calcTopY, calcBottomY, {
          fill: "url(#" + coneId + ")",
          stroke: tone.line,
          width: 1.05
        }) +
        cameraPlanMarker(cameraX, centerY, {
          label: "CAMERA"
        }) +

        targetPlane(targetX, calcTopY, calcBottomY, "CALCULATED", fmtFt(calculatedWidth), {
          color: tone.color,
          valueFill: "rgba(248,250,252,.74)"
        }) +
        targetPlane(requiredX, reqTopY, reqBottomY, "REQUIRED", fmtFt(requiredWidth), {
          color: colors.required,
          labelFill: "rgba(226,232,240,.68)",
          valueFill: "rgba(248,250,252,.68)",
          width: 1.18
        }) +
        spanLinks(targetX, calcTopY, calcBottomY, requiredX, reqTopY, reqBottomY) +

        CAD.axisLine(lensTipX, dimY, targetX, dimY, "Target distance: " + fmtFt(targetDistance), {
          markerId: arrowId,
          labelOffset: 18,
          color: colors.axis
        }) +
        CAD.dimensionLine(targetX, dimY - 44, requiredX, dimY - 44, "width comparison", {
          color: "rgba(226,232,240,.20)",
          labelFill: "rgba(226,232,240,.46)",
          labelOffset: -10,
          tick: 5
        }) +
        hfovCallout(lensTipX, centerY, targetX, calcTopY, calcBottomY, "HFOV " + fmt(hfovDeg, 1) + "?", {
          color: "rgba(226,232,240,.32)"
        }) +
      '</svg>';
  }

  const primitives = {
    cadGrid,
    cameraLensTipX,
    cameraPlanMarker,
    fovCone,
    targetPlane,
    spanLinks,
    hfovCallout
  };

  gfx.registerRenderer("fov-geometry-plan", renderFovGeometryPlanSvg);

  window.ScopedLabsPhysicalSecurityGraphics = {
    version: VERSION,
    category: CATEGORY,
    ready: true,
    colors,
    primitives,
    renderFovGeometryPlanSvg
  };
})();
