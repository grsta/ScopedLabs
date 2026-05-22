/*!
 * ScopedLabs Physical Security Graphics Library
 * Category primitives layered on top of /assets/scopedlabs-graphics.js.
 * Version: physical-security-graphics-001-cad-library-v1
 *
 * Rule: render visual models only. Engineering formulas stay in each tool.
 */
(function () {
  "use strict";

  const VERSION = "physical-security-graphics-001-cad-library-v1";
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
    return Number.isFinite(n) ? n.toFixed(digits).replace(/\.0$/, "") : "—";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(Number(value)) ? fmt(value, digits) + " ft" : "—";
  }

  function fallbackSvg(code, message, meta = {}) {
    return "" +
      '<svg data-export-svg data-sl-engine="physical-security-graphics" data-sl-diagnostic-code="' + esc(code) + '" viewBox="0 0 820 260" role="img" aria-label="ScopedLabs physical security graphics fallback">' +
        '<rect x="24" y="24" width="772" height="212" rx="18" fill="rgba(0,0,0,.16)" stroke="rgba(255,211,79,.35)" />' +
        '<text x="52" y="74" fill="rgba(255,226,128,.96)" font-size="18" font-weight="950">Graphic unavailable</text>' +
        '<text x="52" y="104" fill="rgba(226,232,240,.78)" font-size="13">The page stayed online, but the category renderer used a safe fallback.</text>' +
        '<text x="52" y="142" fill="rgba(255,226,128,.92)" font-size="13" font-weight="900">Diagnostic: ' + esc(code) + '</text>' +
        '<text x="52" y="168" fill="rgba(226,232,240,.68)" font-size="12">' + esc(message || "Review the renderer model.") + '</text>' +
        '<text x="52" y="200" fill="rgba(226,232,240,.48)" font-size="11">Renderer: ' + esc(meta.renderer || "unknown") + ' | Tool: ' + esc(meta.tool || "unknown") + '</text>' +
      '</svg>';
  }

  if (!gfx || typeof gfx.registerRenderer !== "function" || !gfx.CAD) {
    window.ScopedLabsPhysicalSecurityGraphics = { version: VERSION, category: CATEGORY, ready: false, reason: "ScopedLabsGraphics CAD kit was not available." };
    return;
  }

  const CAD = gfx.CAD;

  const colors = Object.assign({}, CAD.colors, {
    camera: "rgba(125,255,158,.92)",
    required: "rgba(226,232,240,.70)",
    compare: "rgba(226,232,240,.22)",
    axis: "rgba(226,232,240,.38)",
    grid: "rgba(226,232,240,.09)"
  });

  function toneFor(model) {
    const fitClass = String(model && model.fitClass || "").toLowerCase();
    const status = String(model && model.status || "").toLowerCase();
    const ratio = num(model && model.coverageRatio, NaN);

    if (fitClass.includes("narrow") || status.includes("risk") || ratio < 0.9) {
      return { label: "NARROW", color: "rgba(255,190,120,.88)", soft: "rgba(255,190,120,.105)", line: "rgba(255,190,120,.76)" };
    }

    if (fitClass.includes("wide") || status.includes("watch") || ratio > 1.35) {
      return { label: "WIDE", color: "rgba(255,211,79,.88)", soft: "rgba(255,211,79,.10)", line: "rgba(255,211,79,.76)" };
    }

    return { label: "FIT", color: "rgba(125,255,158,.88)", soft: "rgba(125,255,158,.085)", line: "rgba(125,255,158,.78)" };
  }

  function cadGrid(stage) {
    const lines = [];
    const step = 48;
    for (let x = stage.x + step; x < stage.x + stage.width; x += step) {
      lines.push(CAD.line(x, stage.y + 16, x, stage.y + stage.height - 16, { stroke: colors.grid, width: 0.65 }));
    }
    for (let y = stage.y + step; y < stage.y + stage.height; y += step) {
      lines.push(CAD.line(stage.x + 16, y, stage.x + stage.width - 16, y, { stroke: colors.grid, width: 0.65 }));
    }
    return lines.join("");
  }

  function cameraPlanMarker(x, y, options) {
    const opts = options && typeof options === "object" ? options : {};
    const label = opts.label || "CAMERA";
    const color = opts.color || colors.camera;

    return "" +
      '<g data-ps-graphic-part="camera-marker">' +
        '<circle cx="' + fmt(x, 2) + '" cy="' + fmt(y, 2) + '" r="18" fill="rgba(125,255,158,.035)" stroke="rgba(125,255,158,.22)" stroke-width="1" />' +
        '<rect x="' + fmt(x - 10, 2) + '" y="' + fmt(y - 8, 2) + '" width="16" height="16" rx="4" fill="rgba(6,18,12,.86)" stroke="' + esc(color) + '" stroke-width="1.1" />' +
        '<path d="M ' + fmt(x + 6, 2) + ' ' + fmt(y - 6, 2) + ' L ' + fmt(x + 18, 2) + ' ' + fmt(y, 2) + ' L ' + fmt(x + 6, 2) + ' ' + fmt(y + 6, 2) + ' Z" fill="rgba(125,255,158,.18)" stroke="' + esc(color) + '" stroke-width="1" />' +
        '<circle cx="' + fmt(x - 2, 2) + '" cy="' + fmt(y, 2) + '" r="2.3" fill="' + esc(color) + '" />' +
        CAD.text(x - 38, y - 25, label, { fill: opts.labelFill || "rgba(248,250,252,.70)", size: 9.4, weight: 900, spacing: ".06em" }) +
      '</g>';
  }

  function fovCone(cameraX, centerY, targetX, topY, bottomY, options) {
    const opts = options && typeof options === "object" ? options : {};
    return '<path data-ps-graphic-part="fov-cone" d="M ' + fmt(cameraX, 2) + ' ' + fmt(centerY, 2) + ' L ' + fmt(targetX, 2) + ' ' + fmt(topY, 2) + ' L ' + fmt(targetX, 2) + ' ' + fmt(bottomY, 2) + ' Z" fill="' + esc(opts.fill || colors.greenSoft) + '" stroke="' + esc(opts.stroke || colors.green) + '" stroke-width="' + esc(opts.width || 1.05) + '" />';
  }

  function targetPlane(x, y1, y2, label, value, options) {
    const opts = options && typeof options === "object" ? options : {};
    const color = opts.color || colors.green;
    const tick = opts.tick ?? 9;
    const labelY = opts.labelY ?? Math.max(64, Math.min(y1, y2) - 13);
    const valueY = opts.valueY ?? Math.min(308, Math.max(y1, y2) + 18);

    return "" +
      '<g data-ps-graphic-part="target-plane">' +
        CAD.line(x, y1, x, y2, { stroke: color, width: opts.width || 1.55, linecap: "round" }) +
        CAD.line(x - tick, y1, x + tick, y1, { stroke: color, width: 0.9 }) +
        CAD.line(x - tick, y2, x + tick, y2, { stroke: color, width: 0.9 }) +
        CAD.text(x, labelY, label, { anchor: "middle", fill: opts.labelFill || color, size: 8.8, weight: 950, spacing: ".09em" }) +
        CAD.text(x, valueY, value, { anchor: "middle", fill: opts.valueFill || "rgba(248,250,252,.72)", size: 9.5, weight: 900 }) +
      '</g>';
  }

  function spanLinks(x1, yTop1, yBottom1, x2, yTop2, yBottom2) {
    return CAD.line(x1, yTop1, x2, yTop2, { stroke: colors.compare, width: 0.8, dash: "4 7" }) +
      CAD.line(x1, yBottom1, x2, yBottom2, { stroke: colors.compare, width: 0.8, dash: "4 7" });
  }

  function hfovCallout(x, y, targetX, topY, bottomY, label, options) {
    const opts = options && typeof options === "object" ? options : {};
    const arcPath = "M " + fmt(x + 36, 2) + " " + fmt(y - 11, 2) + " Q " + fmt(x + 76, 2) + " " + fmt(y - 34, 2) + " " + fmt(x + 121, 2) + " " + fmt(y - 28, 2);
    return CAD.line(x, y, Math.min(targetX - 12, x + 148), topY + 14, { stroke: "rgba(226,232,240,.105)", width: 0.8 }) +
      CAD.line(x, y, Math.min(targetX - 12, x + 148), bottomY - 14, { stroke: "rgba(226,232,240,.105)", width: 0.8 }) +
      '<path d="' + arcPath + '" fill="none" stroke="' + esc(opts.color || "rgba(226,232,240,.42)") + '" stroke-width="0.9" />' +
      CAD.text(x + 130, y - 25, label, { fill: opts.labelFill || "rgba(226,232,240,.62)", size: 9.3, weight: 850, spacing: ".03em" });
  }

  function renderFovGeometryPlanSvg(model) {
    const m = model && typeof model === "object" ? model : {};
    const calculatedWidth = Math.max(num(m.calculatedWidthFt ?? m.sceneWidthFt ?? m.coverageWidthFt, 0), 0);
    const requiredWidth = Math.max(num(m.requiredWidthFt ?? m.targetSceneWidthFt ?? m.sceneFt, 0), 0);
    const targetDistance = Math.max(num(m.targetDistanceFt ?? m.distanceFt ?? m.dist, 0), 0);
    const hfovDeg = Math.max(num(m.hfovDeg ?? m.horizontalFovDeg ?? m.hfov, 0), 0);
    const mountHeight = Math.max(num(m.mountHeightFt ?? m.mountFt ?? m.h, 0), 0);
    const ratio = requiredWidth > 0 ? calculatedWidth / requiredWidth : num(m.coverageRatio, 0);

    if (!Number.isFinite(calculatedWidth) || !Number.isFinite(requiredWidth) || calculatedWidth <= 0 || requiredWidth <= 0) {
      return fallbackSvg("SL-PS-GFX-FOV-BAD-MODEL", "Field of View renderer needs calculatedWidthFt and requiredWidthFt.", { renderer: "fov-geometry-plan", tool: m.tool || "field-of-view" });
    }

    const tone = toneFor(Object.assign({}, m, { coverageRatio: ratio }));
    const svgW = 840;
    const svgH = 360;
    const stage = { x: 28, y: 24, width: 784, height: 296 };
    const cameraX = 142;
    const centerY = 176;
    const targetX = 578;
    const requiredX = 682;
    const dimY = 284;
    const maxSpanPx = 170;
    const maxWidth = Math.max(calculatedWidth, requiredWidth, 1);
    const scale = maxSpanPx / maxWidth;
    const calcPx = clamp(calculatedWidth * scale, 32, maxSpanPx);
    const reqPx = clamp(requiredWidth * scale, 32, maxSpanPx);
    const calcTopY = centerY - calcPx / 2;
    const calcBottomY = centerY + calcPx / 2;
    const reqTopY = centerY - reqPx / 2;
    const reqBottomY = centerY + reqPx / 2;
    const arrowId = "psFovCadArrow001";
    const coneId = "psFovCadCone001";

    return "" +
      '<svg data-export-svg class="fov-geometry-svg sl-ps-gfx-svg" data-sl-engine="physical-security-graphics" data-sl-renderer="fov-geometry-plan" data-sl-category="physical-security" data-sl-version="' + esc(VERSION) + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="' + esc(m.ariaLabel || "Field of View CAD plan view") + '">' +
        CAD.defs("psFovCad001", { arrowId, coneId, coneFill: tone.soft }) +
        CAD.stage(stage.x, stage.y, stage.width, stage.height, { rx: 20 }) +
        cadGrid(stage) +
        CAD.text(54, 53, "PHYSICAL SECURITY / FOV PLAN", { fill: "rgba(125,255,158,.76)", size: 10.5, weight: 950, spacing: ".11em" }) +
        CAD.text(54, 74, "Camera position, target distance, calculated footprint, and requested scene width.", { fill: colors.muted, size: 10, weight: 760 }) +
        CAD.statusPill(735, 42, tone.label, { width: 50, height: 21, color: tone.color, textFill: tone.color, size: 9.3 }) +
        CAD.metricChip(54, 96, "CALCULATED", fmtFt(calculatedWidth), { width: 132, accent: tone.color, valueFill: tone.color }) +
        CAD.metricChip(54, 140, "REQUIRED", fmtFt(requiredWidth), { width: 132, accent: colors.required, valueFill: "rgba(248,250,252,.74)" }) +
        CAD.metricChip(54, 184, "RATIO", fmt(ratio, 2) + "x", { width: 132, accent: tone.color, valueFill: tone.color }) +
        CAD.metricChip(54, 228, "MOUNT", mountHeight > 0 ? fmtFt(mountHeight) : "context", { width: 132, accent: colors.required, valueFill: "rgba(248,250,252,.70)" }) +
        CAD.line(cameraX, centerY, requiredX + 22, centerY, { stroke: "rgba(226,232,240,.18)", width: 0.9, dash: "5 7" }) +
        fovCone(cameraX, centerY, targetX, calcTopY, calcBottomY, { fill: "url(#" + coneId + ")", stroke: tone.line, width: 1.1 }) +
        cameraPlanMarker(cameraX, centerY, { label: "CAMERA" }) +
        targetPlane(targetX, calcTopY, calcBottomY, "CALC WIDTH", fmtFt(calculatedWidth), { color: tone.color, valueFill: "rgba(248,250,252,.74)" }) +
        targetPlane(requiredX, reqTopY, reqBottomY, "REQ WIDTH", fmtFt(requiredWidth), { color: colors.required, labelFill: "rgba(226,232,240,.70)", valueFill: "rgba(248,250,252,.70)", width: 1.25 }) +
        spanLinks(targetX, calcTopY, calcBottomY, requiredX, reqTopY, reqBottomY) +
        CAD.axisLine(cameraX, dimY, targetX, dimY, "Target distance: " + fmtFt(targetDistance), { markerId: arrowId, labelOffset: 18, color: colors.axis }) +
        CAD.dimensionLine(targetX, dimY - 42, requiredX, dimY - 42, "width comparison", { color: "rgba(226,232,240,.22)", labelFill: "rgba(226,232,240,.48)", labelOffset: -10, tick: 5 }) +
        hfovCallout(cameraX, centerY, targetX, calcTopY, calcBottomY, "HFOV " + fmt(hfovDeg, 1) + "°", { color: "rgba(226,232,240,.36)" }) +
      '</svg>';
  }

  const primitives = { cadGrid, cameraPlanMarker, fovCone, targetPlane, spanLinks, hfovCallout };
  gfx.registerRenderer("fov-geometry-plan", renderFovGeometryPlanSvg);

  window.ScopedLabsPhysicalSecurityGraphics = { version: VERSION, category: CATEGORY, ready: true, colors, primitives, renderFovGeometryPlanSvg };
})();
