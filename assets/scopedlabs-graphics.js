/*!
 * ScopedLabs Graphics Engine
 * V8-grade foundation for report-safe SVG renderers.
 * Version: scopedlabs-graphics-010-camera-depth-spacing
 *
 * Rule: this engine renders visual models. It does not own engineering formulas.
 */
(function () {
  "use strict";

  const VERSION = "scopedlabs-graphics-019-analytical-line";
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


  function frameSizeDefaults(size) {
    const key = String(size || "standard").toLowerCase();

    if (key === "compact") {
      return {
        maxWidth: "760px",
        minHeight: "",
        wrapperClass: "sl-graphics-frame sl-graphics-frame--compact"
      };
    }

    if (key === "wide") {
      return {
        maxWidth: "1120px",
        minHeight: "",
        wrapperClass: "sl-graphics-frame sl-graphics-frame--wide"
      };
    }

    if (key === "tall") {
      return {
        maxWidth: "1040px",
        minHeight: "760px",
        wrapperClass: "sl-graphics-frame sl-graphics-frame--tall"
      };
    }

    if (key === "report") {
      return {
        maxWidth: "980px",
        minHeight: "",
        wrapperClass: "sl-graphics-frame sl-graphics-frame--report"
      };
    }

    return {
      maxWidth: "900px",
      minHeight: "",
      wrapperClass: "sl-graphics-frame sl-graphics-frame--standard"
    };
  }

  function styleToString(style) {
    return Object.keys(style || {})
      .filter((key) => style[key] !== undefined && style[key] !== null && String(style[key]).trim() !== "")
      .map((key) => {
        const cssKey = key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
        return cssKey + ":" + String(style[key]).trim();
      })
      .join(";");
  }

  function mergeInlineStyle(svgTag, addStyle) {
    const styleMatch = svgTag.match(/\sstyle=["']([^"']*)["']/i);
    const cleanAdd = String(addStyle || "").trim();

    if (!cleanAdd) return svgTag;

    if (!styleMatch) {
      return svgTag.replace("<svg ", '<svg style="' + escapeHtml(cleanAdd) + '" ');
    }

    const existing = styleMatch[1].trim().replace(/;$/, "");
    const merged = existing ? existing + ";" + cleanAdd : cleanAdd;

    return svgTag.replace(styleMatch[0], ' style="' + escapeHtml(merged) + '"');
  }

  function addSvgClass(svgTag, className) {
    const cleanClass = String(className || "").trim();

    if (!cleanClass) return svgTag;

    const classMatch = svgTag.match(/\sclass=["']([^"']*)["']/i);

    if (!classMatch) {
      return svgTag.replace("<svg ", '<svg class="' + escapeHtml(cleanClass) + '" ');
    }

    const existing = classMatch[1].trim();
    const merged = existing ? existing + " " + cleanClass : cleanClass;

    return svgTag.replace(classMatch[0], ' class="' + escapeHtml(merged) + '"');
  }

  function addSvgDataAttribute(svgTag, name, value) {
    const cleanName = String(name || "").trim();
    const cleanValue = String(value || "").trim();

    if (!cleanName || !cleanValue) return svgTag;
    if (svgTag.includes(cleanName + "=")) return svgTag;

    return svgTag.replace("<svg ", '<svg ' + cleanName + '="' + escapeHtml(cleanValue) + '" ');
  }

  function frameSvg(svg, options) {
    const opts = options && typeof options === "object" ? options : {};
    const input = typeof svg === "string" ? svg : "";

    if (!input.includes("<svg")) {
      report({
        code: "SL-GFX-FRAME-BAD-SVG",
        severity: "warn",
        renderer: opts.renderer || "",
        tool: opts.tool || "",
        message: "frameSvg expected an SVG string.",
        fallback: "input returned unchanged"
      });

      return input;
    }

    const size = String(opts.size || "standard").toLowerCase();
    const defaults = frameSizeDefaults(size);

    const maxWidth = opts.maxWidth || defaults.maxWidth;
    const minHeight = opts.minHeight || defaults.minHeight;
    const className = opts.className || "";
    const wrapper = opts.wrapper === true;

    const svgStyle = styleToString({
      width: "100%",
      maxWidth,
      height: "auto",
      display: "block",
      margin: opts.margin || "0 auto"
    });

    const svgTagMatch = input.match(/<svg\b[^>]*>/i);
    if (!svgTagMatch) return input;

    let svgTag = svgTagMatch[0];

    svgTag = mergeInlineStyle(svgTag, svgStyle);
    svgTag = addSvgClass(svgTag, "sl-graphics-frame-svg" + (className ? " " + className : ""));
    svgTag = addSvgDataAttribute(svgTag, "data-sl-frame-size", size);

    let output = input.replace(svgTagMatch[0], svgTag);

    if (!wrapper) return output;

    const wrapperStyle = styleToString({
      width: "100%",
      overflow: "visible",
      minHeight
    });

    return '<div class="' + escapeHtml(defaults.wrapperClass) + '" data-sl-graphics-frame="' + escapeHtml(size) + '" style="' + escapeHtml(wrapperStyle) + '">' + output + '</div>';
  }

  function tuneFrame(root, options) {
    const opts = options && typeof options === "object" ? options : {};
    const scope = root && root.querySelector ? root : document;
    const selector = opts.selector || ".sl-graphics-frame-svg, [data-sl-renderer]";
    const size = String(opts.size || "standard").toLowerCase();
    const defaults = frameSizeDefaults(size);
    const minHeight = opts.minHeight || defaults.minHeight;
    const maxDepth = Number.isFinite(Number(opts.depth)) ? Math.max(1, Number(opts.depth)) : 5;

    const nodes = Array.from(scope.querySelectorAll(selector));

    nodes.forEach((svg) => {
      if (!svg || !svg.style) return;

      svg.style.width = "100%";
      svg.style.height = "auto";
      svg.style.display = "block";
      svg.style.margin = opts.margin || "0 auto";

      if (opts.maxWidth) {
        svg.style.maxWidth = opts.maxWidth;
      }

      let node = svg.parentElement;
      let depth = 0;

      while (node && depth < maxDepth) {
        if (node.style) {
          node.style.overflow = "visible";

          if (minHeight && depth <= 2) {
            node.style.minHeight = minHeight;
          }
        }

        node = node.parentElement;
        depth += 1;
      }
    });

    return nodes.length;
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
    const depthLabel = m.depthLabel || "Coverage depth (visual)";

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

    const coneOverlapSvg = overlapSegments.length
      ? overlapSegments.map((item) => {
          const x1 = xForFt(item.startFt);
          const x2 = xForFt(item.endFt);
          const w = Math.max(0, x2 - x1);

          if (w <= 1) return "";

          const mid = x1 + w / 2;
          const shoulder = Math.min(28, Math.max(10, w * 0.22));
          const upperY = camY + 70;
          const baseY = coneY;
          const lowerY = runY - 18;

          return "" +
            '<path data-sl-visual-part="cone-overlap-zone" d="M ' + x1.toFixed(1) + ' ' + baseY + ' L ' + mid.toFixed(1) + ' ' + upperY + ' L ' + x2.toFixed(1) + ' ' + baseY + ' L ' + (x2 - shoulder).toFixed(1) + ' ' + lowerY + ' L ' + (x1 + shoulder).toFixed(1) + ' ' + lowerY + ' Z" fill="rgba(255,211,79,.105)" stroke="rgba(255,211,79,.40)" stroke-width="1" stroke-dasharray="5 5" />' +
            '<line x1="' + mid.toFixed(1) + '" y1="' + upperY + '" x2="' + mid.toFixed(1) + '" y2="' + lowerY + '" stroke="rgba(255,230,150,.28)" stroke-width="1" stroke-dasharray="3 5" />';
        }).join("")
      : "";

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
          const label = !m.hideOverlapSegmentLabels && w >= 46
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

    const widthDimensionSvg = ''
      + '<line x1="' + frontLeft.x + '" y1="' + frontLeft.y + '" x2="' + frontLeft.x + '" y2="' + (widthDimY - 2) + '" stroke="rgba(226,232,240,.34)" stroke-width="1" />'
      + '<line x1="' + frontRight.x + '" y1="' + frontRight.y + '" x2="' + frontRight.x + '" y2="' + (widthDimY - 2) + '" stroke="rgba(226,232,240,.34)" stroke-width="1" />'
      + '<line x1="' + frontLeft.x + '" y1="' + widthDimY + '" x2="' + frontRight.x + '" y2="' + widthDimY + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<line x1="' + frontLeft.x + '" y1="' + widthDimY + '" x2="' + (frontLeft.x + 8) + '" y2="' + (widthDimY - 4) + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<line x1="' + frontLeft.x + '" y1="' + widthDimY + '" x2="' + (frontLeft.x + 8) + '" y2="' + (widthDimY + 4) + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<line x1="' + frontRight.x + '" y1="' + widthDimY + '" x2="' + (frontRight.x - 8) + '" y2="' + (widthDimY - 4) + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<line x1="' + frontRight.x + '" y1="' + widthDimY + '" x2="' + (frontRight.x - 8) + '" y2="' + (widthDimY + 4) + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<text x="' + widthCenterX.toFixed(1) + '" y="' + widthLabelY + '" text-anchor="middle" fill="rgba(226,232,240,.84)" font-size="10.8" font-weight="900">Width / protected span: ' + escapeHtml(fmtFt(spanFt)) + '</text>';

    const depthDimensionSvg = ''
      + '<line x1="' + frontLeft.x + '" y1="' + frontLeft.y + '" x2="' + depthFront.x.toFixed(1) + '" y2="' + depthFront.y.toFixed(1) + '" stroke="rgba(226,232,240,.22)" stroke-width="1" />'
      + '<line x1="' + backLeft.x + '" y1="' + backLeft.y + '" x2="' + depthBack.x.toFixed(1) + '" y2="' + depthBack.y.toFixed(1) + '" stroke="rgba(226,232,240,.22)" stroke-width="1" />'
      + '<line x1="' + depthFront.x.toFixed(1) + '" y1="' + depthFront.y.toFixed(1) + '" x2="' + depthBack.x.toFixed(1) + '" y2="' + depthBack.y.toFixed(1) + '" stroke="rgba(226,232,240,.46)" stroke-width="1.05" />'
      + '<line x1="' + depthFront.x.toFixed(1) + '" y1="' + depthFront.y.toFixed(1) + '" x2="' + (depthFront.x + 6).toFixed(1) + '" y2="' + (depthFront.y - 6).toFixed(1) + '" stroke="rgba(226,232,240,.46)" stroke-width="1.05" />'
      + '<line x1="' + depthFront.x.toFixed(1) + '" y1="' + depthFront.y.toFixed(1) + '" x2="' + (depthFront.x + 6).toFixed(1) + '" y2="' + (depthFront.y + 6).toFixed(1) + '" stroke="rgba(226,232,240,.46)" stroke-width="1.05" />'
      + '<line x1="' + depthBack.x.toFixed(1) + '" y1="' + depthBack.y.toFixed(1) + '" x2="' + (depthBack.x + 6).toFixed(1) + '" y2="' + (depthBack.y - 6).toFixed(1) + '" stroke="rgba(226,232,240,.46)" stroke-width="1.05" />'
      + '<line x1="' + depthBack.x.toFixed(1) + '" y1="' + depthBack.y.toFixed(1) + '" x2="' + (depthBack.x + 6).toFixed(1) + '" y2="' + (depthBack.y + 6).toFixed(1) + '" stroke="rgba(226,232,240,.46)" stroke-width="1.05" />'
      + '<text x="' + depthCenterX.toFixed(1) + '" y="' + depthLabelY.toFixed(1) + '" text-anchor="middle" transform="rotate(' + depthAngle + ' ' + depthCenterX.toFixed(1) + ' ' + depthLabelY.toFixed(1) + ')" fill="rgba(226,232,240,.72)" font-size="10.2" font-weight="850">' + escapeHtml(depthLabel) + '</text>';

    const summaryTextSvg = '<text x="' + widthCenterX.toFixed(1) + '" y="' + (frontLeft.y + 68) + '" text-anchor="middle" fill="rgba(226,232,240,.76)" font-size="10.6" font-weight="900">Required span: ' + escapeHtml(fmtFt(spanFt)) + ' | Actual spacing: ' + escapeHtml(fmtFt(actualSpacingFt)) + ' | Shared overlap: ' + escapeHtml(fmtFt(totalOverlapFt)) + ' (' + escapeHtml(fmtPct(totalOverlapPctOfSpan, 1)) + ' of span)</text>';

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

        coneOverlapSvg +
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


  function renderCameraLayoutIsoSvg(model) {
    const validation = validateCameraLayoutModel(model);
    const tool = model && model.tool ? model.tool : "unknown";

    if (validation.warnings.length) {
      report({
        code: CODES.CAMERA_LAYOUT_BAD_SEGMENTS,
        severity: "warn",
        renderer: "camera-layout-iso",
        tool,
        message: "camera-layout-iso rendered with normalized/skipped segments.",
        details: { warnings: validation.warnings }
      });
    }

    if (!validation.ok) {
      const err = validation.errors[0];

      report({
        code: err.code,
        severity: "error",
        renderer: "camera-layout-iso",
        tool,
        message: err.message,
        fallback: "safe SVG fallback"
      });

      return fallbackSvg(err.code, err.message, {
        renderer: "camera-layout-iso",
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
    const depthLabel = m.depthLabel || "Coverage depth (visual)";

    const cameras = m.cameras;
    const coverageSegments = m.coverageSegments;
    const overlapSegments = m.overlapSegments;
    const gapSegments = m.gapSegments;

    const width = 800;
    const height = 642;

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
    const stageH = 408;

    const frontLeft = { x: 122, y: 500 };
    const frontRight = { x: 662, y: 500 };
    const backLeft = { x: 246, y: 372 };
    const backRight = { x: 694, y: 372 };

    const floorFrontY = frontLeft.y;
    const floorBackY = backLeft.y;

    const widthDimY = frontLeft.y + 18;
    const widthLabelY = frontLeft.y + 44;
    const widthCenterX = (frontLeft.x + frontRight.x) / 2;

    const depthFront = { x: frontLeft.x - 34, y: frontLeft.y + 6 };
    const depthBack = { x: backLeft.x - 34, y: backLeft.y - 6 };
    const depthCenterX = (depthFront.x + depthBack.x) / 2;
    const depthCenterY = (depthFront.y + depthBack.y) / 2;
    const depthLabelY = depthCenterY - 10;
    const depthAngle = -45;

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

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function pointOnEdge(start, end, ft) {
      const t = clamp(num(ft, 0) / spanFt, 0, 1);
      return {
        x: lerp(start.x, end.x, t),
        y: lerp(start.y, end.y, t)
      };
    }

    function frontPoint(ft) {
      return pointOnEdge(frontLeft, frontRight, ft);
    }

    function backPoint(ft) {
      return pointOnEdge(backLeft, backRight, ft);
    }

    function floorSegmentPath(startFt, endFt) {
      const fs = frontPoint(startFt);
      const fe = frontPoint(endFt);
      const bs = backPoint(startFt);
      const be = backPoint(endFt);

      return "M " + fs.x.toFixed(1) + " " + fs.y.toFixed(1) +
        " L " + fe.x.toFixed(1) + " " + fe.y.toFixed(1) +
        " L " + be.x.toFixed(1) + " " + be.y.toFixed(1) +
        " L " + bs.x.toFixed(1) + " " + bs.y.toFixed(1) + " Z";
    }

    function cameraMountPoint(centerFt) {
      const back = backPoint(centerFt);
      return {
        x: back.x,
        y: back.y - 48
      };
    }

    const floorPlane = ''
      + '<path d="M ' + frontLeft.x + ' ' + frontLeft.y
      + ' L ' + frontRight.x + ' ' + frontRight.y
      + ' L ' + backRight.x + ' ' + backRight.y
      + ' L ' + backLeft.x + ' ' + backLeft.y
      + ' Z" fill="rgba(255,255,255,.024)" stroke="rgba(226,232,240,.22)" stroke-width="1.1" />';

    const floorGuides = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const xFront = lerp(frontLeft.x, frontRight.x, t);
      const yFront = lerp(frontLeft.y, frontRight.y, t);
      const xBack = lerp(backLeft.x, backRight.x, t);
      const yBack = lerp(backLeft.y, backRight.y, t);

      return '<line x1="' + xFront.toFixed(1) + '" y1="' + yFront.toFixed(1) + '" x2="' + xBack.toFixed(1) + '" y2="' + yBack.toFixed(1) + '" stroke="rgba(226,232,240,.10)" stroke-width="1" />';
    }).join("");

    const floorCross = [0, 0.33, 0.66, 1].map((t) => {
      const left = {
        x: lerp(frontLeft.x, backLeft.x, t),
        y: lerp(frontLeft.y, backLeft.y, t)
      };
      const right = {
        x: lerp(frontRight.x, backRight.x, t),
        y: lerp(frontRight.y, backRight.y, t)
      };

      return '<line x1="' + left.x.toFixed(1) + '" y1="' + left.y.toFixed(1) + '" x2="' + right.x.toFixed(1) + '" y2="' + right.y.toFixed(1) + '" stroke="rgba(226,232,240,.08)" stroke-width="1" />';
    }).join("");

    const coverageSvg = coverageSegments.map((item) => {
      return '<path data-sl-visual-part="iso-covered-zone" d="' + floorSegmentPath(item.startFt, item.endFt) + '" fill="rgba(82,201,112,.18)" stroke="rgba(125,255,152,.30)" stroke-width="1.0" />';
    }).join("");

    const overlapSvg = overlapSegments.length
      ? overlapSegments.map((item, index) => {
          const path = floorSegmentPath(item.startFt, item.endFt);
          const fp1 = frontPoint(item.startFt);
          const fp2 = frontPoint(item.endFt);
          const labelX = (fp1.x + fp2.x) / 2;
          const labelY = frontLeft.y + 13 + (index % 2) * 10;

          const labelText = escapeHtml(fmtFt(item.endFt - item.startFt)) + ' overlap';
          const labelWidth = Math.max(64, labelText.length * 6.2);

          return ''
            + '<path data-sl-visual-part="iso-overlap-zone" d="' + path + '" fill="rgba(255,211,79,.20)" stroke="rgba(255,226,128,.66)" stroke-width="1.2" stroke-dasharray="5 4" />'
            + '<rect x="' + (labelX - labelWidth / 2).toFixed(1) + '" y="' + (labelY - 12).toFixed(1) + '" width="' + labelWidth.toFixed(1) + '" height="16" rx="8" fill="rgba(5,15,10,.78)" stroke="rgba(255,226,128,.28)" stroke-width="1" />'
            + '<text x="' + labelX.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" fill="rgba(255,230,150,.96)" font-size="10.2" font-weight="900">'
            + labelText + '</text>';
        }).join("")
      : '<text x="' + (frontRight.x - 4) + '" y="' + (frontLeft.y + 26) + '" text-anchor="end" fill="rgba(255,211,79,.78)" font-size="10.5" font-weight="850">No shared overlap segment</text>';

    const gapSvg = gapSegments.length
      ? gapSegments.map((item, index) => {
          const path = floorSegmentPath(item.startFt, item.endFt);
          const fp1 = frontPoint(item.startFt);
          const fp2 = frontPoint(item.endFt);
          const labelX = (fp1.x + fp2.x) / 2;
          const labelY = index % 2 === 0 ? frontLeft.y - 14 : frontLeft.y + 44;

          return ''
            + '<path data-sl-visual-part="iso-gap-zone" d="' + path + '" fill="rgba(255,138,102,.24)" stroke="rgba(255,138,102,.82)" stroke-width="1.15" />'
            + '<text x="' + labelX.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" fill="rgba(255,188,166,.98)" font-size="11" font-weight="950">'
            + escapeHtml(fmtFt(item.endFt - item.startFt)) + ' gap</text>';
        }).join("")
      : '<text x="' + (frontRight.x - 10) + '" y="' + (frontLeft.y - 12) + '" text-anchor="end" fill="rgba(125,255,152,.96)" font-size="12" font-weight="950">No modeled gap</text>';

    const frustumSvg = cameras.slice(0, 8).map((camera, index) => {
      const centerFt = num(camera.centerFt, spanFt / 2);
      const startFt = num(camera.footprintStartFt, centerFt);
      const endFt = num(camera.footprintEndFt, centerFt);

      const mount = cameraMountPoint(centerFt);
      const bs = backPoint(startFt);
      const be = backPoint(endFt);
      const fs = frontPoint(startFt);
      const fe = frontPoint(endFt);

      const headX = mount.x;
      const headY = mount.y - 2.5;

      const floorAnchor = backPoint(centerFt);

      const bracketBaseX = headX - 1.5;
      const bracketBaseY = headY + 1.5;
      const bracketTipX = headX - 7.8;
      const bracketTipY = headY + 5.2;

      const bodyLeft = headX - 6.8;
      const bodyRight = headX + 4.8;
      const bodyTop = headY - 4.0;
      const bodyBottom = headY + 3.0;

      const depthLineTopY = bodyBottom + 1.5;
      const depthLineBottomY = floorAnchor.y;

      const noseX = bodyRight + 2.6;
      const noseY = headY - 0.5;

      const lensCx = bodyRight + 0.8;
      const lensCy = headY - 0.4;

      const targetX = lerp(bs.x, be.x, 0.5);
      const targetY = lerp(bs.y, be.y, 0.5);

      return ''
        + '<path data-sl-visual-part="iso-camera-frustum" d="M ' + mount.x.toFixed(1) + ' ' + mount.y.toFixed(1)
        + ' L ' + bs.x.toFixed(1) + ' ' + bs.y.toFixed(1)
        + ' L ' + be.x.toFixed(1) + ' ' + be.y.toFixed(1)
        + ' L ' + fe.x.toFixed(1) + ' ' + fe.y.toFixed(1)
        + ' L ' + fs.x.toFixed(1) + ' ' + fs.y.toFixed(1)
        + ' Z" fill="rgba(82,201,112,.035)" stroke="rgba(125,255,152,.34)" stroke-width="1.0" />'
        + '<line data-sl-visual-part="iso-camera-depth-line" x1="' + floorAnchor.x.toFixed(1) + '" y1="' + depthLineTopY.toFixed(1) + '" x2="' + floorAnchor.x.toFixed(1) + '" y2="' + depthLineBottomY.toFixed(1) + '" stroke="rgba(226,232,240,.30)" stroke-width="1" stroke-dasharray="4 5" />'
        + '<circle data-sl-visual-part="iso-camera-floor-dot" cx="' + floorAnchor.x.toFixed(1) + '" cy="' + floorAnchor.y.toFixed(1) + '" r="2.0" fill="rgba(226,232,240,.74)" />'
        + '<line data-sl-visual-part="iso-camera-bracket" x1="' + bracketBaseX.toFixed(1) + '" y1="' + bracketBaseY.toFixed(1) + '" x2="' + bracketTipX.toFixed(1) + '" y2="' + bracketTipY.toFixed(1) + '" stroke="rgba(226,232,240,.52)" stroke-width="1.3" />'
        + '<circle data-sl-visual-part="iso-camera-joint" cx="' + bracketBaseX.toFixed(1) + '" cy="' + bracketBaseY.toFixed(1) + '" r="1.5" fill="rgba(226,232,240,.72)" />'
        + '<path data-sl-visual-part="iso-camera-body" d="M ' + bodyLeft.toFixed(1) + ' ' + bodyTop.toFixed(1)
        + ' L ' + bodyRight.toFixed(1) + ' ' + bodyTop.toFixed(1)
        + ' L ' + noseX.toFixed(1) + ' ' + noseY.toFixed(1)
        + ' L ' + bodyRight.toFixed(1) + ' ' + bodyBottom.toFixed(1)
        + ' L ' + bodyLeft.toFixed(1) + ' ' + bodyBottom.toFixed(1)
        + ' Z" fill="rgba(10,18,14,.98)" stroke="rgba(125,255,152,.92)" stroke-width="1.35" />'
        + '<line data-sl-visual-part="iso-camera-body-line" x1="' + (bodyLeft + 1.4).toFixed(1) + '" y1="' + bodyTop.toFixed(1) + '" x2="' + (bodyRight - 1.0).toFixed(1) + '" y2="' + bodyTop.toFixed(1) + '" stroke="rgba(226,232,240,.18)" stroke-width="1" />'
        + '<circle data-sl-visual-part="iso-camera-lens" cx="' + lensCx.toFixed(1) + '" cy="' + lensCy.toFixed(1) + '" r="1.75" fill="rgba(125,255,152,.88)" />'
        + '<circle data-sl-visual-part="iso-camera-lens-core" cx="' + lensCx.toFixed(1) + '" cy="' + lensCy.toFixed(1) + '" r="0.72" fill="rgba(8,18,12,.96)" />'
        + '<text x="' + headX.toFixed(1) + '" y="' + (bodyTop - 8).toFixed(1) + '" text-anchor="middle" fill="rgba(226,232,240,.74)" font-size="10.5" font-weight="850">' + escapeHtml(camera.label || ("Cam " + (index + 1))) + '</text>';
    }).join("");

    const cameraNote = cameras.length > 8
      ? '<text x="' + (stageX + stageW - 18) + '" y="' + (stageY + 26) + '" text-anchor="end" fill="rgba(226,232,240,.56)" font-size="10.5">Showing first 8 of ' + cameras.length + ' cameras</text>'
      : "";

    const widthDimensionSvg = ''
      + '<line x1="' + frontLeft.x + '" y1="' + frontLeft.y + '" x2="' + frontLeft.x + '" y2="' + (widthDimY - 2) + '" stroke="rgba(226,232,240,.34)" stroke-width="1" />'
      + '<line x1="' + frontRight.x + '" y1="' + frontRight.y + '" x2="' + frontRight.x + '" y2="' + (widthDimY - 2) + '" stroke="rgba(226,232,240,.34)" stroke-width="1" />'
      + '<line x1="' + frontLeft.x + '" y1="' + widthDimY + '" x2="' + frontRight.x + '" y2="' + widthDimY + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<line x1="' + frontLeft.x + '" y1="' + widthDimY + '" x2="' + (frontLeft.x + 8) + '" y2="' + (widthDimY - 4) + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<line x1="' + frontLeft.x + '" y1="' + widthDimY + '" x2="' + (frontLeft.x + 8) + '" y2="' + (widthDimY + 4) + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<line x1="' + frontRight.x + '" y1="' + widthDimY + '" x2="' + (frontRight.x - 8) + '" y2="' + (widthDimY - 4) + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<line x1="' + frontRight.x + '" y1="' + widthDimY + '" x2="' + (frontRight.x - 8) + '" y2="' + (widthDimY + 4) + '" stroke="rgba(226,232,240,.54)" stroke-width="1.05" />'
      + '<text x="' + widthCenterX.toFixed(1) + '" y="' + widthLabelY + '" text-anchor="middle" fill="rgba(226,232,240,.84)" font-size="10.8" font-weight="900">Width / protected span: ' + escapeHtml(fmtFt(spanFt)) + '</text>';

    const depthDimensionSvg = ''
      + '<line x1="' + frontLeft.x + '" y1="' + frontLeft.y + '" x2="' + depthFront.x.toFixed(1) + '" y2="' + depthFront.y.toFixed(1) + '" stroke="rgba(226,232,240,.22)" stroke-width="1" />'
      + '<line x1="' + backLeft.x + '" y1="' + backLeft.y + '" x2="' + depthBack.x.toFixed(1) + '" y2="' + depthBack.y.toFixed(1) + '" stroke="rgba(226,232,240,.22)" stroke-width="1" />'
      + '<line x1="' + depthFront.x.toFixed(1) + '" y1="' + depthFront.y.toFixed(1) + '" x2="' + depthBack.x.toFixed(1) + '" y2="' + depthBack.y.toFixed(1) + '" stroke="rgba(226,232,240,.46)" stroke-width="1.05" />'
      + '<text x="' + depthCenterX.toFixed(1) + '" y="' + depthLabelY.toFixed(1) + '" text-anchor="middle" transform="rotate(' + depthAngle + ' ' + depthCenterX.toFixed(1) + ' ' + depthLabelY.toFixed(1) + ')" fill="rgba(226,232,240,.72)" font-size="10.2" font-weight="850">' + escapeHtml(depthLabel) + '</text>';

    const summaryTextSvg = '<text x="' + widthCenterX.toFixed(1) + '" y="' + (frontLeft.y + 56) + '" text-anchor="middle" fill="rgba(226,232,240,.76)" font-size="10.6" font-weight="900">Required span: ' + escapeHtml(fmtFt(spanFt)) + ' | Actual spacing: ' + escapeHtml(fmtFt(actualSpacingFt)) + ' | Shared overlap: ' + escapeHtml(fmtFt(totalOverlapFt)) + ' (' + escapeHtml(fmtPct(totalOverlapPctOfSpan, 1)) + ' of span)</text>';

    return ""
      + '<svg data-export-svg data-sl-engine="graphics" data-sl-renderer="camera-layout-iso" data-sl-version="' + escapeHtml(VERSION) + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escapeHtml(m.ariaLabel || "ScopedLabs isometric camera layout visualization") + '">'
      + '<defs>'
      + '<linearGradient id="slIsoGreenBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(84,212,116,.70)" /><stop offset="100%" stop-color="rgba(125,255,152,.90)" /></linearGradient>'
      + '<linearGradient id="slIsoGapBar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(255,211,79,.76)" /><stop offset="100%" stop-color="rgba(255,138,102,.90)" /></linearGradient>'
      + '</defs>'

      + '<text x="52" y="28" fill="' + theme.text + '" font-size="18" font-weight="950">' + escapeHtml(m.title || "Isometric plan: spacing, overlap, and blind gaps") + '</text>'
      + '<text x="52" y="50" fill="' + theme.muted + '" font-size="12">' + escapeHtml(m.subtitle || "Report-safe isometric SVG. Green is covered, amber is shared overlap, red is uncovered.") + '</text>'

      + '<text x="' + labelX + '" y="' + row1Y + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Required protected span</text>'
      + '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />'
      + '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(226,232,240,.26)" />'
      + '<text x="' + valueX + '" y="' + row1Y + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(spanFt)) + '</text>'

      + '<text x="' + labelX + '" y="' + (row1Y + rowGap) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Merged covered span</text>'
      + '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />'
      + '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + coveredBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#slIsoGreenBar)" />'
      + '<text x="' + valueX + '" y="' + (row1Y + rowGap) + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(coveredFt)) + ' | ' + escapeHtml(fmtPct(coveredPct, 1)) + '</text>'

      + '<text x="' + labelX + '" y="' + (row1Y + rowGap * 2) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Uncovered span</text>'
      + '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />'
      + '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + gapBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + (uncoveredFt > 0 ? "url(#slIsoGapBar)" : "rgba(125,255,152,.50)") + '" />'
      + '<text x="' + valueX + '" y="' + (row1Y + rowGap * 2) + '" text-anchor="end" fill="' + gapTone + '" font-size="11" font-weight="900">' + escapeHtml(fmtFt(uncoveredFt)) + ' | ' + escapeHtml(fmtPct(gapPct, 1)) + '</text>'

      + '<text x="' + labelX + '" y="' + (row1Y + rowGap * 3) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Target / actual overlap</text>'
      + '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />'
      + '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 - 8) + '" width="' + targetOverlapBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + overlapTone + '" />'
      + '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 + 5) + '" width="' + actualOverlapBarW.toFixed(1) + '" height="4" rx="2" fill="' + actualOverlapTone + '" />'
      + '<text x="' + valueX + '" y="' + (row1Y + rowGap * 3) + '" text-anchor="end" fill="' + overlapTone + '" font-size="11" font-weight="900">Target ' + escapeHtml(fmtPct(targetOverlapPct, 1)) + ' | Actual ' + escapeHtml(fmtPct(actualOverlapPct, 1)) + '</text>'

      + '<rect x="' + stageX + '" y="' + stageY + '" width="' + stageW + '" height="' + stageH + '" rx="18" fill="rgba(0,0,0,.13)" stroke="' + theme.stageStroke + '" />'
      + '<text x="' + (stageX + 18) + '" y="' + (stageY + 26) + '" fill="rgba(125,255,152,.78)" font-size="11" font-weight="950" letter-spacing=".08em">' + escapeHtml(m.stageKicker || "ISO / CAMERA LAYOUT") + '</text>'
      + cameraNote

      + '<rect x="' + (stageX + 18) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(125,255,152,.82)" /><text x="' + (stageX + 40) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">covered</text>'
      + '<rect x="' + (stageX + 104) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(255,211,79,.82)" /><text x="' + (stageX + 126) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">overlap</text>'
      + '<rect x="' + (stageX + 192) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(255,138,102,.82)" /><text x="' + (stageX + 214) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">blind gap</text>'

      + floorPlane
      + floorGuides
      + floorCross
      + coverageSvg
      + overlapSvg
      + gapSvg
      + frustumSvg

      + widthDimensionSvg
      + depthDimensionSvg
      + summaryTextSvg

      + '<text x="' + (stageX + 20) + '" y="' + (stageY + stageH - 16) + '" fill="rgba(226,232,240,.56)" font-size="10.5">' + escapeHtml(m.footer || "Validate overlap and gaps before carrying the result forward.") + '</text>'
      + '</svg>';
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
  
  function renderScenarioPressureLineSvg(model) {
    const m = model && typeof model === "object" ? model : {};
    const rawPoints = Array.isArray(m.points)
      ? m.points
      : Array.isArray(m.candidates)
        ? m.candidates
        : [];

    const healthyMax = Number.isFinite(Number(m.healthyMax)) ? Number(m.healthyMax) : 25;
    const watchMax = Number.isFinite(Number(m.watchMax)) ? Number(m.watchMax) : 60;
    const lowerIsBetter = m.lowerIsBetter !== false;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const pointsData = rawPoints
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;

        const score = Number(item.score ?? item.value ?? item.y);
        if (!Number.isFinite(score)) return null;

        return {
          label: String(item.label || item.name || ("Scenario " + (index + 1))),
          score: clamp(score, 0, 100),
          isCurrent: !!item.isCurrent || !!item.current || index === Number(m.currentIndex || -1)
        };
      })
      .filter(Boolean)
      .slice(0, 6);

    if (!pointsData.length) {
      return fallbackSvg(
        "SL-GFX-SCENARIO-LINE-BAD-MODEL",
        "Scenario pressure line renderer needs at least one valid point.",
        {
          engine: "graphics",
          renderer: "scenario-pressure-line",
          tool: m.tool || ""
        }
      );
    }

    const width = Number.isFinite(Number(m.width)) ? Number(m.width) : 940;
    const height = Number.isFinite(Number(m.height)) ? Number(m.height) : 292;
    const left = 82;
    const right = 58;
    const top = 66;
    const bottom = 76;
    const plotW = width - left - right;
    const plotH = height - top - bottom;

    const yFor = (score) => top + plotH - ((clamp(score, 0, 100) / 100) * plotH);
    const xStep = pointsData.length > 1 ? plotW / (pointsData.length - 1) : plotW;

    const plotted = pointsData.map((item, index) => ({
      ...item,
      x: pointsData.length > 1 ? left + (xStep * index) : left + plotW / 2,
      y: yFor(item.score)
    }));

    const polyline = plotted.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");

    const colorFor = (score) => {
      if (lowerIsBetter) {
        if (score <= healthyMax) return "#7dff98";
        if (score <= watchMax) return "#ffd34f";
        return "#ff8f88";
      }

      if (score >= watchMax) return "#7dff98";
      if (score >= healthyMax) return "#ffd34f";
      return "#ff8f88";
    };

    const statusFor = (score) => {
      if (lowerIsBetter) {
        if (score <= healthyMax) return "Healthy";
        if (score <= watchMax) return "Watch";
        return "Risk";
      }

      if (score >= watchMax) return "Healthy";
      if (score >= healthyMax) return "Watch";
      return "Risk";
    };

    const labelFor = (label, max = 18) => {
      const clean = String(label || "");
      return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
    };

    const healthyY = yFor(healthyMax);
    const watchY = yFor(watchMax);
    const riskTop = top;
    const riskBottom = watchY;
    const watchTop = watchY;
    const watchBottom = healthyY;
    const healthyTop = healthyY;
    const healthyBottom = top + plotH;

    const title = m.title || "Planning pressure by scenario";
    const subtitle = m.subtitle || "Lower is better";
    const kicker = m.stageKicker || "SCENARIO ANALYTICS";
    const footer = m.footer || (lowerIsBetter ? "Pressure score / 100" : "Score / 100");

    const gridTicks = [0, 20, 40, 60, 80, 100];

    const gridLines = gridTicks.map((value) => {
      const y = yFor(value);
      const strong = value === 0 || value === 100 || value === healthyMax || value === watchMax;

      return '' +
        '<line x1="' + left + '" y1="' + y.toFixed(1) + '" x2="' + (left + plotW) + '" y2="' + y.toFixed(1) + '" stroke="rgba(226,232,240,' + (strong ? '.20' : '.085') + ')" stroke-width="' + (strong ? '1' : '.75') + '"></line>' +
        '<text x="' + (left - 16) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" fill="rgba(226,232,240,.46)" font-size="9.5" font-weight="800">' + value + '</text>';
    }).join("");

    const verticalGuides = plotted.map((p) => {
      return '<line x1="' + p.x.toFixed(1) + '" y1="' + top + '" x2="' + p.x.toFixed(1) + '" y2="' + (top + plotH).toFixed(1) + '" stroke="rgba(226,232,240,.07)" stroke-width=".75"></line>';
    }).join("");

    const bandLabelX = left + plotW + 12;

    return '' +
      '<svg data-sl-renderer="scenario-pressure-line" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escapeHtml(title) + '">' +
        '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="18" fill="rgba(5,16,13,.44)"></rect>' +
        '<rect x="14" y="14" width="' + (width - 28) + '" height="' + (height - 28) + '" rx="14" fill="rgba(255,255,255,.012)" stroke="rgba(125,255,152,.12)" stroke-width=".8"></rect>' +

        '<text x="' + left + '" y="29" fill="#7dff98" font-size="9.5" font-weight="950" letter-spacing=".16em">' + escapeHtml(kicker) + '</text>' +
        '<text x="' + left + '" y="50" fill="rgba(246,255,248,.93)" font-size="15.5" font-weight="950">' + escapeHtml(title) + '</text>' +
        '<text x="' + (width - right) + '" y="30" text-anchor="end" fill="rgba(226,232,240,.70)" font-size="10.5" font-weight="900">' + escapeHtml(subtitle) + '</text>' +
        '<text x="' + (width - right) + '" y="49" text-anchor="end" fill="rgba(226,232,240,.50)" font-size="9.5" font-weight="800">' + escapeHtml(footer) + '</text>' +

        '<rect x="' + left + '" y="' + riskTop.toFixed(1) + '" width="' + plotW + '" height="' + Math.max(0, riskBottom - riskTop).toFixed(1) + '" fill="rgba(255,96,88,.075)"></rect>' +
        '<rect x="' + left + '" y="' + watchTop.toFixed(1) + '" width="' + plotW + '" height="' + Math.max(0, watchBottom - watchTop).toFixed(1) + '" fill="rgba(255,211,79,.075)"></rect>' +
        '<rect x="' + left + '" y="' + healthyTop.toFixed(1) + '" width="' + plotW + '" height="' + Math.max(0, healthyBottom - healthyTop).toFixed(1) + '" fill="rgba(125,255,152,.070)"></rect>' +

        verticalGuides +
        gridLines +

        '<rect x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + plotH + '" fill="none" stroke="rgba(226,232,240,.24)" stroke-width=".9"></rect>' +
        '<line x1="' + left + '" y1="' + healthyY.toFixed(1) + '" x2="' + (left + plotW) + '" y2="' + healthyY.toFixed(1) + '" stroke="rgba(125,255,152,.42)" stroke-width=".9" stroke-dasharray="4 5"></line>' +
        '<line x1="' + left + '" y1="' + watchY.toFixed(1) + '" x2="' + (left + plotW) + '" y2="' + watchY.toFixed(1) + '" stroke="rgba(255,211,79,.42)" stroke-width=".9" stroke-dasharray="4 5"></line>' +

        '<text x="' + bandLabelX + '" y="' + ((healthyTop + healthyBottom) / 2 + 3).toFixed(1) + '" fill="rgba(125,255,152,.78)" font-size="8.8" font-weight="950">HEALTHY</text>' +
        '<text x="' + bandLabelX + '" y="' + ((watchTop + watchBottom) / 2 + 3).toFixed(1) + '" fill="rgba(255,211,79,.78)" font-size="8.8" font-weight="950">WATCH</text>' +
        '<text x="' + bandLabelX + '" y="' + ((riskTop + riskBottom) / 2 + 3).toFixed(1) + '" fill="rgba(255,143,136,.78)" font-size="8.8" font-weight="950">RISK</text>' +

        '<polyline points="' + polyline + '" fill="none" stroke="rgba(125,255,152,.92)" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"></polyline>' +

        plotted.map((p) => {
          const fill = colorFor(p.score);
          const label = labelFor(p.label, 17);
          const status = statusFor(p.score);
          const r = p.isCurrent ? 6.4 : 5.4;
          const currentRing = p.isCurrent
            ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="10.5" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="1" stroke-dasharray="2.5 3.5"></circle>'
            : '';

          return '' +
            currentRing +
            '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r + '" fill="rgba(5,16,13,.95)" stroke="' + fill + '" stroke-width="1.7"></circle>' +
            '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.1" fill="' + fill + '"></circle>' +
            '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 13).toFixed(1) + '" text-anchor="middle" fill="' + fill + '" font-size="11" font-weight="950">' + Math.round(p.score) + '</text>' +
            '<text x="' + p.x.toFixed(1) + '" y="' + (height - 39) + '" text-anchor="middle" fill="rgba(246,255,248,.82)" font-size="9.6" font-weight="900">' + escapeHtml(label) + '</text>' +
            '<text x="' + p.x.toFixed(1) + '" y="' + (height - 24) + '" text-anchor="middle" fill="' + fill + '" font-size="8.7" font-weight="900">' + escapeHtml(status) + '</text>';
        }).join("") +
      '</svg>';
  }

registerRenderer("scenario-pressure-line", renderScenarioPressureLineSvg);
  registerRenderer("camera-layout-iso", renderCameraLayoutIsoSvg);

  window.ScopedLabsGraphics = {
    version: VERSION,
    codes: CODES,
    theme,
    renderers,
    registerRenderer,
    render,
    frameSvg,
    tuneFrame,
    renderCameraLayoutSvg,
    renderScenarioPressureLineSvg,
    renderCameraLayoutIsoSvg,
    validateCameraLayoutModel,
    helpers: {
      escapeHtml,
      frameSizeDefaults,
      styleToString,
      fmt,
      fmtFt,
      fmtPct,
      normalizeSegments,
      fallbackSvg,
      report
    }
  };
})();