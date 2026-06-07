(function () {
  "use strict";

  const VERSION = "access-control-planning-visuals-002-cad-polish";

  function clamp(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureStyles() {
    if (document.getElementById("access-control-planning-visuals-styles")) return;

    const style = document.createElement("style");
    style.id = "access-control-planning-visuals-styles";
    style.textContent = [
      ".access-control-planning-visual-shell { margin-top: 14px; }",
      ".access-control-planning-visual-shell svg { display:block; width:100%; height:auto; border:1px solid rgba(120,255,120,.14); border-radius:16px; background: rgba(5,12,10,.24); }",
      ".access-control-planning-visual-shell .sl-vis-note { margin:10px 0 0; color: rgba(203,213,225,.72); font-size:.86rem; line-height:1.45; }"
    ].join("\n");

    document.head.appendChild(style);
  }

  function statusTone(status) {
    const clean = String(status || "").toUpperCase();
    if (clean.includes("RISK") || clean === "HIGH") return "risk";
    if (clean.includes("WATCH") || clean === "MODERATE") return "watch";
    return "safe";
  }

  function statusLabel(status) {
    const clean = String(status || "PENDING").toUpperCase();
    if (clean === "HEALTHY" || clean === "LOW") return "SAFE";
    if (clean === "MODERATE") return "WATCH";
    if (clean === "HIGH") return "RISK";
    return clean;
  }

  function toneFill(tone) {
    if (tone === "risk") return "rgba(255,105,105,.14)";
    if (tone === "watch") return "rgba(255,204,102,.14)";
    return "rgba(120,255,120,.10)";
  }

  function toneStroke(tone) {
    if (tone === "risk") return "rgba(255,105,105,.42)";
    if (tone === "watch") return "rgba(255,204,102,.42)";
    return "rgba(120,255,120,.32)";
  }

  function metricChip(label, value, x, y, w) {
    return [
      '<g>',
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="40" rx="8" fill="rgba(0,0,0,.18)" stroke="rgba(120,255,120,.14)" />',
      '<text x="' + (x + 10) + '" y="' + (y + 15) + '" font-size="9" fill="rgba(203,213,225,.64)" letter-spacing=".8">' + escapeHtml(label).toUpperCase() + '</text>',
      '<text x="' + (x + 10) + '" y="' + (y + 30) + '" font-size="13" fill="rgba(238,255,244,.94)" font-weight="800">' + escapeHtml(value) + '</text>',
      '</g>'
    ].join("");
  }

  function dimLine(x1, y1, x2, y2, label) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return [
      '<g stroke="rgba(203,213,225,.32)" stroke-width="1.2" fill="none" stroke-linecap="round">',
      '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke-dasharray="5 6" />',
      '<path d="M' + x1 + ' ' + (y1 - 6) + ' L' + x1 + ' ' + (y1 + 6) + '" />',
      '<path d="M' + x2 + ' ' + (y2 - 6) + ' L' + x2 + ' ' + (y2 + 6) + '" />',
      '</g>',
      '<text x="' + midX + '" y="' + (midY - 8) + '" font-size="11" fill="rgba(203,213,225,.66)" text-anchor="middle">' + escapeHtml(label) + '</text>'
    ].join("");
  }

  function renderInto(target, html) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el) return false;
    ensureStyles();
    el.innerHTML = html;
    return true;
  }

  function show(options = {}, html) {
    const card = typeof options.card === "string" ? document.getElementById(options.card) : options.card;
    const wrap = typeof options.wrap === "string" ? document.getElementById(options.wrap) : options.wrap;
    const target = typeof options.target === "string" ? document.getElementById(options.target) : options.target;

    if (!target) return false;

    renderInto(target, html);

    if (card) card.hidden = false;
    if (wrap) wrap.hidden = false;

    return true;
  }

  function hide(options = {}) {
    const card = typeof options.card === "string" ? document.getElementById(options.card) : options.card;
    const wrap = typeof options.wrap === "string" ? document.getElementById(options.wrap) : options.wrap;
    const target = typeof options.target === "string" ? document.getElementById(options.target) : options.target;

    if (target) target.innerHTML = "";
    if (wrap) wrap.hidden = true;
    if (card) card.hidden = true;

    return true;
  }

  function svgToDataUri(svg) {
    if (!svg) return "";
    const text = typeof svg === "string" ? svg : svg.outerHTML;
    if (!text) return "";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
  }

  function getDataUri(target) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el) return "";
    const svg = el.querySelector("svg");
    return svg ? svgToDataUri(svg) : "";
  }

  function buildDoorCableSvg(metrics = {}) {
    const status = statusTone(metrics.status || metrics.difficulty);
    const pressure = clamp(Number(metrics.cableDensity || 0) / 3.2, 0.08, 1);
    const routeY = 140 - Math.round(30 * pressure);
    const routeSag = 160 + Math.round(18 * pressure);
    const statusText = statusLabel(metrics.status || metrics.difficulty);

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-cable-length">',
      '<svg viewBox="0 0 760 292" role="img" aria-label="Door cable routing planning visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs>',
      '<pattern id="accGridCable" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern>',
      '</defs>',
      '<rect x="24" y="24" width="712" height="244" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="220" rx="12" fill="url(#accGridCable)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">CAD ROUTING PLAN</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="800">Door cable path + takeoff pressure</text>',
      '<rect x="618" y="50" width="74" height="28" rx="14" fill="' + toneFill(status) + '" stroke="' + toneStroke(status) + '" />',
      '<text x="655" y="68" text-anchor="middle" font-size="11" fill="rgba(246,255,248,.92)" font-weight="900">' + escapeHtml(statusText) + '</text>',
      '<rect x="72" y="124" width="78" height="44" rx="6" fill="rgba(120,255,120,.065)" stroke="rgba(120,255,120,.28)" />',
      '<text x="111" y="142" text-anchor="middle" font-size="10" fill="rgba(203,213,225,.68)" letter-spacing=".7">PANEL</text>',
      '<text x="111" y="158" text-anchor="middle" font-size="13" fill="rgba(238,255,244,.94)" font-weight="800">Source</text>',
      '<rect x="610" y="124" width="78" height="44" rx="6" fill="rgba(120,255,120,.065)" stroke="rgba(120,255,120,.28)" />',
      '<text x="649" y="142" text-anchor="middle" font-size="10" fill="rgba(203,213,225,.68)" letter-spacing=".7">DOOR</text>',
      '<text x="649" y="158" text-anchor="middle" font-size="13" fill="rgba(238,255,244,.94)" font-weight="800">Opening</text>',
      '<path d="M150 146 L610 146" stroke="rgba(203,213,225,.24)" stroke-width="1.4" stroke-dasharray="6 7" />',
      '<path d="M150 146 C230 ' + routeY + ', 306 ' + routeSag + ', 382 146 S536 ' + routeY + ', 610 146" fill="none" stroke="rgba(125,255,152,.82)" stroke-width="4" stroke-linecap="round" />',
      '<path d="M150 146 C230 ' + routeY + ', 306 ' + routeSag + ', 382 146 S536 ' + routeY + ', 610 146" fill="none" stroke="rgba(125,255,152,.18)" stroke-width="10" stroke-linecap="round" />',
      dimLine(150, 190, 610, 190, "straight-line distance: " + (metrics.distanceLabel || "—")),
      '<circle cx="382" cy="146" r="7" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.8)" />',
      '<path d="M382 146 L430 104" stroke="rgba(203,213,225,.34)" stroke-width="1.1" />',
      '<text x="436" y="101" font-size="11" fill="rgba(238,255,244,.82)" font-weight="800">routing factor</text>',
      '<text x="436" y="116" font-size="10" fill="rgba(203,213,225,.62)">' + escapeHtml(metrics.routingLabel || "—") + '</text>',
      metricChip("total cable", metrics.totalAllDoorsLabel || "—", 52, 218, 150),
      metricChip("per door", metrics.perDoorTotalLabel || "—", 216, 218, 150),
      metricChip("routed", metrics.routedLabel || "—", 380, 218, 150),
      metricChip("slack", metrics.slackLabel || "—", 544, 218, 150),
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> The green route is a planning path overlay, not a field routing drawing. Use it to compare straight-line distance, routing factor, slack, and total takeoff pressure.</p>',
      '</div>'
    ].join("");
  }

  function buildDoorCountSvg(metrics = {}) {
    const status = statusTone(metrics.status);
    const statusText = statusLabel(metrics.status);
    const perimeter = Math.max(0, Number(metrics.perimeterDoors || 0));
    const zones = Math.max(0, Number(metrics.zoneBaseLabel || metrics.zoneBase || 0));
    const high = Math.max(0, Number(metrics.highsecAddLabel || metrics.highsecAdd || 0));
    const doors = Math.max(1, Number(metrics.doors || perimeter + zones + high || 1));
    const readers = Math.max(0, Number(metrics.readers || 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const maxBar = Math.max(perimeter, zones, high, doors, readers, complexity, 1);
    const widthFor = (value) => Math.max(12, Math.round((Number(value || 0) / maxBar) * 356));

    function bar(label, value, y, fill) {
      return [
        '<text x="58" y="' + (y + 15) + '" font-size="12" fill="rgba(203,213,225,.74)" font-weight="700">' + escapeHtml(label) + '</text>',
        '<rect x="214" y="' + y + '" width="356" height="20" rx="4" fill="rgba(0,0,0,.20)" stroke="rgba(120,255,120,.10)" />',
        '<rect x="214" y="' + y + '" width="' + widthFor(value) + '" height="20" rx="4" fill="' + fill + '" />',
        '<text x="602" y="' + (y + 15) + '" font-size="13" fill="rgba(238,255,244,.94)" font-weight="900" text-anchor="end">' + escapeHtml(value) + '</text>'
      ].join("");
    }

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-count-planner">',
      '<svg viewBox="0 0 760 318" role="img" aria-label="Door count planning pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridDoorCount" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="270" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="246" rx="12" fill="url(#accGridDoorCount)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">CAD LOAD SUMMARY</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="800">Controlled doors, readers, and complexity</text>',
      '<rect x="618" y="50" width="74" height="28" rx="14" fill="' + toneFill(status) + '" stroke="' + toneStroke(status) + '" />',
      '<text x="655" y="68" text-anchor="middle" font-size="11" fill="rgba(246,255,248,.92)" font-weight="900">' + escapeHtml(statusText) + '</text>',
      '<path d="M214 108 L570 108" stroke="rgba(203,213,225,.22)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<text x="214" y="101" font-size="10" fill="rgba(203,213,225,.58)">relative planning load scale</text>',
      bar("Perimeter doors", perimeter, 124, "rgba(125,255,152,.64)"),
      bar("Interior zone adds", zones, 154, "rgba(125,255,200,.46)"),
      bar("High-security adds", high, 184, "rgba(255,204,102,.56)"),
      bar("Estimated readers", readers, 214, "rgba(120,180,255,.52)"),
      '<path d="M214 244 L570 244" stroke="rgba(120,255,120,.16)" stroke-width="1" />',
      metricChip("total doors", String(metrics.doors ?? "—"), 52, 254, 136),
      metricChip("readers", String(metrics.readers ?? "—"), 202, 254, 136),
      metricChip("complexity", String(metrics.complexityIndex ?? "—"), 352, 254, 136),
      metricChip("control mode", metrics.bothSidesLabel || "—", 502, 254, 190),
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> The bars show relative planning pressure from door groups, reader count, and complexity. They are intended for scope review, not a final hardware schedule.</p>',
      '</div>'
    ].join("");
  }

  function renderDoorCable(options = {}) {
    return show(options, buildDoorCableSvg(options.metrics || {}));
  }

  function renderDoorCount(options = {}) {
    return show(options, buildDoorCountSvg(options.metrics || {}));
  }

  window.ScopedLabsAccessControlPlanningVisuals = Object.freeze({
    VERSION,
    renderDoorCable,
    renderDoorCount,
    hide,
    getDataUri,
    svgToDataUri
  });
})();
