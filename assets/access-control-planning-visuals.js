(function () {
  "use strict";

  const VERSION = "access-control-planning-visuals-001-shared";

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
      ".access-control-planning-visual-shell svg { display:block; width:100%; height:auto; border:1px solid rgba(120,255,120,.14); border-radius:16px; background: radial-gradient(circle at 18% 12%, rgba(120,255,120,.08), transparent 34%), rgba(5,12,10,.24); }",
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

  function metricChip(label, value, x, y, w) {
    return [
      '<g>',
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="44" rx="10" fill="rgba(0,0,0,.22)" stroke="rgba(120,255,120,.16)" />',
      '<text x="' + (x + 12) + '" y="' + (y + 17) + '" font-size="10" fill="rgba(203,213,225,.68)" letter-spacing=".7">' + escapeHtml(label).toUpperCase() + '</text>',
      '<text x="' + (x + 12) + '" y="' + (y + 33) + '" font-size="14" fill="rgba(238,255,244,.94)" font-weight="800">' + escapeHtml(value) + '</text>',
      '</g>'
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
    const total = Number(metrics.totalAllDoors || 0);
    const routed = Number(metrics.routed || 0);
    const slack = Number(metrics.slack || 0);
    const density = Number(metrics.cableDensity || 0);
    const pressure = clamp(density / 3.2, 0.08, 1);
    const routeEnd = 132 + Math.round(436 * pressure);
    const y = 142;
    const statusText = status === "risk" ? "RISK" : status === "watch" ? "WATCH" : "SAFE";

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-cable-length">',
      '<svg viewBox="0 0 760 300" role="img" aria-label="Door cable routing pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs>',
      '<linearGradient id="accCableLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="rgba(125,255,152,.35)"/><stop offset="100%" stop-color="rgba(125,255,152,.9)"/></linearGradient>',
      '</defs>',
      '<rect x="24" y="24" width="712" height="252" rx="18" fill="rgba(0,0,0,.12)" stroke="rgba(120,255,120,.12)" />',
      '<text x="44" y="54" font-size="13" fill="rgba(180,255,200,.72)" letter-spacing="1.4">MODERN ROUTING VISUAL</text>',
      '<text x="44" y="78" font-size="22" fill="rgba(246,255,248,.96)" font-weight="800">Door cable routing pressure</text>',
      '<text x="44" y="101" font-size="13" fill="rgba(203,213,225,.72)">Module-owned replacement for legacy Chart.js cable visual.</text>',
      '<rect x="54" y="126" width="76" height="52" rx="10" fill="rgba(120,255,120,.08)" stroke="rgba(120,255,120,.24)" />',
      '<text x="72" y="146" font-size="11" fill="rgba(203,213,225,.7)">PANEL</text>',
      '<text x="70" y="164" font-size="15" fill="rgba(238,255,244,.94)" font-weight="800">Source</text>',
      '<rect x="616" y="126" width="88" height="52" rx="10" fill="rgba(120,255,120,.08)" stroke="rgba(120,255,120,.24)" />',
      '<text x="644" y="146" font-size="11" fill="rgba(203,213,225,.7)">DOOR</text>',
      '<text x="638" y="164" font-size="15" fill="rgba(238,255,244,.94)" font-weight="800">Opening</text>',
      '<path d="M132 ' + y + ' C 226 ' + (y - 62) + ', 324 ' + (y + 62) + ', ' + routeEnd + ' ' + y + ' S 572 ' + (y + 20) + ', 616 ' + y + '" fill="none" stroke="url(#accCableLine)" stroke-width="8" stroke-linecap="round" />',
      '<path d="M132 ' + (y + 26) + ' L616 ' + (y + 26) + '" stroke="rgba(203,213,225,.22)" stroke-width="2" stroke-dasharray="7 8" />',
      '<text x="330" y="' + (y + 52) + '" font-size="12" fill="rgba(203,213,225,.68)" text-anchor="middle">straight-line baseline</text>',
      '<circle cx="' + routeEnd + '" cy="' + y + '" r="11" fill="rgba(125,255,152,.26)" stroke="rgba(125,255,152,.82)" />',
      '<text x="' + routeEnd + '" y="' + (y - 20) + '" font-size="12" fill="rgba(238,255,244,.9)" text-anchor="middle" font-weight="800">route factor</text>',
      '<rect x="604" y="42" width="96" height="34" rx="17" fill="' + (status === "risk" ? "rgba(255,105,105,.14)" : status === "watch" ? "rgba(255,204,102,.14)" : "rgba(120,255,120,.12)") + '" stroke="' + (status === "risk" ? "rgba(255,105,105,.42)" : status === "watch" ? "rgba(255,204,102,.42)" : "rgba(120,255,120,.32)") + '" />',
      '<text x="652" y="64" text-anchor="middle" font-size="12" fill="rgba(246,255,248,.92)" font-weight="900">' + statusText + '</text>',
      metricChip("Total cable", metrics.totalAllDoorsLabel || (total ? total.toFixed(1) + " ft" : "—"), 44, 212, 152),
      metricChip("Per door", metrics.perDoorTotalLabel || "—", 212, 212, 152),
      metricChip("Routed", metrics.routedLabel || (routed ? routed.toFixed(1) + " ft" : "—"), 380, 212, 152),
      metricChip("Slack", metrics.slackLabel || (slack ? slack.toFixed(1) + " ft" : "—"), 548, 212, 152),
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Routing pressure scales with cable density and shows the difference between straight-line distance and planned routed cable quantity.</p>',
      '</div>'
    ].join("");
  }

  function buildDoorCountSvg(metrics = {}) {
    const status = statusTone(metrics.status);
    const perimeter = Math.max(0, Number(metrics.perimeterDoors || 0));
    const zones = Math.max(0, Number(metrics.zoneBaseLabel || metrics.zoneBase || 0));
    const high = Math.max(0, Number(metrics.highsecAddLabel || metrics.highsecAdd || 0));
    const doors = Math.max(1, Number(metrics.doors || perimeter + zones + high || 1));
    const readers = Math.max(0, Number(metrics.readers || 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const barMax = Math.max(doors, readers, complexity, 1);
    const widthFor = (value) => Math.max(18, Math.round((Number(value || 0) / barMax) * 456));
    const statusText = status === "risk" ? "RISK" : status === "watch" ? "WATCH" : "SAFE";

    function bar(label, value, y, fill) {
      return [
        '<text x="54" y="' + (y + 18) + '" font-size="13" fill="rgba(203,213,225,.78)" font-weight="700">' + escapeHtml(label) + '</text>',
        '<rect x="208" y="' + y + '" width="456" height="24" rx="12" fill="rgba(0,0,0,.22)" stroke="rgba(120,255,120,.12)" />',
        '<rect x="208" y="' + y + '" width="' + widthFor(value) + '" height="24" rx="12" fill="' + fill + '" />',
        '<text x="682" y="' + (y + 18) + '" font-size="14" fill="rgba(238,255,244,.94)" font-weight="900" text-anchor="end">' + escapeHtml(value) + '</text>'
      ].join("");
    }

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-count-planner">',
      '<svg viewBox="0 0 760 318" role="img" aria-label="Door count planning pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<rect x="24" y="24" width="712" height="270" rx="18" fill="rgba(0,0,0,.12)" stroke="rgba(120,255,120,.12)" />',
      '<text x="44" y="54" font-size="13" fill="rgba(180,255,200,.72)" letter-spacing="1.4">MODERN PLANNING VISUAL</text>',
      '<text x="44" y="78" font-size="22" fill="rgba(246,255,248,.96)" font-weight="800">Door count and reader pressure</text>',
      '<text x="44" y="101" font-size="13" fill="rgba(203,213,225,.72)">Module-owned replacement for legacy Chart.js scope visual.</text>',
      '<rect x="604" y="42" width="96" height="34" rx="17" fill="' + (status === "risk" ? "rgba(255,105,105,.14)" : status === "watch" ? "rgba(255,204,102,.14)" : "rgba(120,255,120,.12)") + '" stroke="' + (status === "risk" ? "rgba(255,105,105,.42)" : status === "watch" ? "rgba(255,204,102,.42)" : "rgba(120,255,120,.32)") + '" />',
      '<text x="652" y="64" text-anchor="middle" font-size="12" fill="rgba(246,255,248,.92)" font-weight="900">' + statusText + '</text>',
      bar("Perimeter doors", perimeter, 128, "rgba(125,255,152,.72)"),
      bar("Interior zone doors", zones, 164, "rgba(125,255,200,.54)"),
      bar("High-security adds", high, 200, "rgba(255,204,102,.62)"),
      bar("Estimated readers", readers, 236, "rgba(120,180,255,.58)"),
      '<path d="M208 116 L664 116" stroke="rgba(203,213,225,.18)" stroke-width="2" stroke-dasharray="7 8" />',
      '<text x="208" y="110" font-size="11" fill="rgba(203,213,225,.58)">relative load scale</text>',
      metricChip("Total doors", String(metrics.doors ?? "—"), 44, 264, 136),
      metricChip("Readers", String(metrics.readers ?? "—"), 196, 264, 136),
      metricChip("Complexity", String(metrics.complexityIndex ?? "—"), 348, 264, 136),
      metricChip("Control mode", metrics.bothSidesLabel || "—", 500, 264, 188),
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Bar lengths compare the main drivers behind controlled-door count, reader count, and planning complexity.</p>',
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
