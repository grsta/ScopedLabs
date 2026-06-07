(function () {
  "use strict";

  const VERSION = "access-control-planning-visuals-003-engineering-visuals";

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
      ".access-control-planning-visual-shell{margin-top:14px;}",
      ".access-control-planning-visual-shell svg{display:block;width:100%;height:auto;border:1px solid rgba(120,255,120,.14);border-radius:16px;background:rgba(5,12,10,.24);box-shadow:inset 0 0 0 1px rgba(255,255,255,.02);}",
      ".access-control-planning-visual-shell .sl-vis-note{margin:10px 0 0;color:rgba(203,213,225,.72);font-size:.86rem;line-height:1.45;}"
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
    if (tone === "risk") return "rgba(255,105,105,.46)";
    if (tone === "watch") return "rgba(255,204,102,.46)";
    return "rgba(120,255,120,.34)";
  }

  function toneText(tone) {
    if (tone === "risk") return "rgba(255,170,170,.96)";
    if (tone === "watch") return "rgba(255,220,130,.96)";
    return "rgba(125,255,152,.96)";
  }

  function metricChip(label, value, x, y, w) {
    return [
      '<g class="sl-metric-chip">',
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="42" rx="8" fill="rgba(0,0,0,.18)" stroke="rgba(120,255,120,.13)" />',
      '<text x="' + (x + 10) + '" y="' + (y + 15) + '" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".8">' + escapeHtml(label).toUpperCase() + '</text>',
      '<text x="' + (x + 10) + '" y="' + (y + 31) + '" font-size="13" fill="rgba(238,255,244,.94)" font-weight="800">' + escapeHtml(value) + '</text>',
      '</g>'
    ].join("");
  }

  function statusBadge(label, tone, x, y) {
    return [
      '<rect x="' + x + '" y="' + y + '" width="78" height="28" rx="8" fill="' + toneFill(tone) + '" stroke="' + toneStroke(tone) + '" />',
      '<text x="' + (x + 39) + '" y="' + (y + 18) + '" text-anchor="middle" font-size="11" fill="' + toneText(tone) + '" font-weight="900" letter-spacing=".6">' + escapeHtml(label) + '</text>'
    ].join("");
  }

  function dimLine(x1, y1, x2, y2, label) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return [
      '<g stroke="rgba(203,213,225,.34)" stroke-width="1.1" fill="none" stroke-linecap="round">',
      '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke-dasharray="5 6" />',
      '<path d="M' + x1 + ' ' + (y1 - 7) + ' L' + x1 + ' ' + (y1 + 7) + '" />',
      '<path d="M' + x2 + ' ' + (y2 - 7) + ' L' + x2 + ' ' + (y2 + 7) + '" />',
      '</g>',
      '<rect x="' + (midX - 82) + '" y="' + (midY - 22) + '" width="164" height="18" rx="6" fill="rgba(0,0,0,.24)" stroke="rgba(203,213,225,.08)" />',
      '<text x="' + midX + '" y="' + (midY - 9) + '" font-size="10" fill="rgba(203,213,225,.72)" text-anchor="middle">' + escapeHtml(label) + '</text>'
    ].join("");
  }

  function pressureRail(label, value, x, y, w, tone) {
    const ratio = clamp(value, 0, 1);
    const fillW = Math.round(w * ratio);
    return [
      '<g>',
      '<text x="' + x + '" y="' + (y - 8) + '" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".6">' + escapeHtml(label).toUpperCase() + '</text>',
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="12" rx="6" fill="rgba(0,0,0,.24)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="' + x + '" y="' + y + '" width="' + fillW + '" height="12" rx="6" fill="' + toneFill(tone) + '" stroke="' + toneStroke(tone) + '" />',
      '<path d="M' + (x + Math.round(w * .45)) + ' ' + (y - 3) + ' V' + (y + 15) + ' M' + (x + Math.round(w * .72)) + ' ' + (y - 3) + ' V' + (y + 15) + '" stroke="rgba(203,213,225,.18)" stroke-width="1" />',
      '<text x="' + x + '" y="' + (y + 28) + '" font-size="9" fill="rgba(203,213,225,.52)">SAFE</text>',
      '<text x="' + (x + Math.round(w * .48)) + '" y="' + (y + 28) + '" font-size="9" fill="rgba(203,213,225,.52)" text-anchor="middle">WATCH</text>',
      '<text x="' + (x + w) + '" y="' + (y + 28) + '" font-size="9" fill="rgba(203,213,225,.52)" text-anchor="end">RISK</text>',
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
    const tone = statusTone(metrics.status || metrics.difficulty);
    const pressure = clamp(Number(metrics.cableDensity || 0) / 3.2, 0.06, 1);
    const statusText = statusLabel(metrics.status || metrics.difficulty);
    const cableTone = pressure > .72 ? "risk" : pressure > .45 ? "watch" : "safe";
    const pathStroke = cableTone === "risk" ? "rgba(255,150,150,.80)" : cableTone === "watch" ? "rgba(255,214,120,.82)" : "rgba(125,255,152,.82)";
    const cableCount = Math.max(1, Math.min(5, Math.round(Number(metrics.cables || 1))));
    const cableOffsets = Array.from({ length: cableCount }, (_, index) => (index - (cableCount - 1) / 2) * 5);
    const routedLabel = metrics.routedLabel || "?";

    function cablePath(offset) {
      const o = Number(offset || 0);
      return '<path d="M150 ' + (163 + o) + ' H268 V118 H496 V163 H610" fill="none" stroke="' + pathStroke + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />';
    }

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-cable-length">',
      '<svg viewBox="0 0 760 326" role="img" aria-label="Door cable routing planning visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs>',
      '<pattern id="accGridCableV3" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern>',
      '<marker id="accArrowCableV3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="rgba(203,213,225,.48)"/></marker>',
      '</defs>',
      '<rect x="24" y="24" width="712" height="278" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="254" rx="12" fill="url(#accGridCableV3)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">ROUTING TAKEOFF</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="800">Door cable path, slack, and takeoff pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      '<g opacity=".96">',
      '<rect x="66" y="137" width="84" height="52" rx="7" fill="rgba(120,255,120,.065)" stroke="rgba(120,255,120,.30)" />',
      '<path d="M78 151 H138 M78 162 H126 M78 173 H136" stroke="rgba(203,213,225,.32)" stroke-width="1" />',
      '<text x="108" y="209" font-size="10" fill="rgba(203,213,225,.64)" text-anchor="middle">PANEL / SOURCE</text>',
      '<rect x="610" y="137" width="84" height="52" rx="7" fill="rgba(120,255,120,.055)" stroke="rgba(120,255,120,.30)" />',
      '<path d="M638 145 V181 M638 145 H676 V181 H638" stroke="rgba(203,213,225,.35)" stroke-width="1.2" fill="none" />',
      '<circle cx="668" cy="163" r="2" fill="rgba(125,255,152,.78)" />',
      '<text x="652" y="209" font-size="10" fill="rgba(203,213,225,.64)" text-anchor="middle">CONTROLLED DOOR</text>',
      '</g>',
      '<path d="M150 163 H610" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="5 7" marker-end="url(#accArrowCableV3)" />',
      cableOffsets.map(cablePath).join(""),
      '<circle cx="268" cy="118" r="5" fill="rgba(0,0,0,.22)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="496" cy="118" r="5" fill="rgba(0,0,0,.22)" stroke="rgba(125,255,152,.72)" />',
      '<path d="M614 165 C642 136, 672 137, 675 164" fill="none" stroke="rgba(203,213,225,.42)" stroke-width="1.3" stroke-dasharray="4 5" />',
      '<text x="640" y="129" font-size="10" fill="rgba(203,213,225,.60)">service slack</text>',
      dimLine(150, 230, 610, 230, "straight-line distance: " + (metrics.distanceLabel || "?")),
      '<path d="M382 118 L430 93" stroke="rgba(203,213,225,.30)" stroke-width="1" />',
      '<text x="436" y="94" font-size="11" fill="rgba(238,255,244,.82)" font-weight="800">routing factor</text>',
      '<text x="436" y="109" font-size="10" fill="rgba(203,213,225,.62)">' + escapeHtml(metrics.routingLabel || "?") + ' / routed ' + escapeHtml(routedLabel) + '</text>',
      pressureRail("takeoff pressure", pressure, 52, 254, 220, cableTone),
      metricChip("total cable", metrics.totalAllDoorsLabel || "?", 296, 244, 126),
      metricChip("per door", metrics.perDoorTotalLabel || "?", 436, 244, 116),
      metricChip("slack", metrics.slackLabel || "?", 566, 244, 110),
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> This is a planning-scale routing overlay. Use it to compare straight-line distance, routing factor, service slack, and total cable takeoff pressure before field routing is finalized.</p>',
      '</div>'
    ].join("");
  }

  function buildDoorCountSvg(metrics = {}) {
    const tone = statusTone(metrics.status);
    const statusText = statusLabel(metrics.status);
    const perimeter = Math.max(0, Number(metrics.perimeterDoors || 0));
    const zones = Math.max(0, Number(metrics.zoneBaseLabel || metrics.zoneBase || 0));
    const high = Math.max(0, Number(metrics.highsecAddLabel || metrics.highsecAdd || 0));
    const doors = Math.max(1, Number(metrics.doors || perimeter + zones + high || 1));
    const readers = Math.max(0, Number(metrics.readers || 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const pressure = clamp(complexity / 140, 0.04, 1);
    const pressureTone = pressure > .72 ? "risk" : pressure > .45 ? "watch" : "safe";

    function doorTicks(value, x, y, toneName) {
      const count = Math.max(1, Math.min(8, Math.round(Number(value || 0))));
      const stroke = toneStroke(toneName || "safe");
      const fill = toneFill(toneName || "safe");
      const ticks = [];
      for (let i = 0; i < count; i += 1) {
        const dx = x + i * 20;
        ticks.push('<rect x="' + dx + '" y="' + y + '" width="12" height="28" rx="2" fill="' + fill + '" stroke="' + stroke + '" />');
        ticks.push('<circle cx="' + (dx + 9) + '" cy="' + (y + 15) + '" r="1.5" fill="rgba(238,255,244,.72)" />');
      }
      if (Number(value || 0) > 8) {
        ticks.push('<text x="' + (x + 164) + '" y="' + (y + 18) + '" font-size="11" fill="rgba(203,213,225,.66)">+' + escapeHtml(Math.round(Number(value || 0) - 8)) + '</text>');
      }
      return ticks.join("");
    }

    function groupRow(label, value, x, y, toneName) {
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="202" height="64" rx="10" fill="rgba(0,0,0,.14)" stroke="rgba(120,255,120,.10)" />',
        '<text x="' + (x + 12) + '" y="' + (y + 18) + '" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".7">' + escapeHtml(label).toUpperCase() + '</text>',
        '<text x="' + (x + 184) + '" y="' + (y + 19) + '" font-size="15" fill="rgba(238,255,244,.94)" font-weight="900" text-anchor="end">' + escapeHtml(value) + '</text>',
        doorTicks(value, x + 14, y + 28, toneName),
        '</g>'
      ].join("");
    }

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-count-planner">',
      '<svg viewBox="0 0 760 342" role="img" aria-label="Door count planning pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridDoorCountV3" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="294" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="270" rx="12" fill="url(#accGridDoorCountV3)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">DOOR SCHEDULE LOAD</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="800">Controlled doors, readers, and segmentation pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      groupRow("Perimeter", perimeter, 52, 112, "safe"),
      groupRow("Interior zones", zones, 279, 112, "safe"),
      groupRow("High-security", high, 506, 112, high > 0 ? "watch" : "safe"),
      '<path d="M112 206 H648" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M112 206 C214 184, 300 228, 382 206 S548 186, 648 206" fill="none" stroke="rgba(125,255,152,.38)" stroke-width="1.4" />',
      '<circle cx="112" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="382" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="648" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<text x="112" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">scope</text>',
      '<text x="382" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">controller grouping</text>',
      '<text x="648" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">reader count</text>',
      pressureRail("complexity pressure", pressure, 52, 258, 220, pressureTone),
      metricChip("total doors", String(metrics.doors ?? "?"), 296, 248, 110),
      metricChip("readers", String(metrics.readers ?? "?"), 420, 248, 100),
      metricChip("complexity", String(metrics.complexityIndex ?? "?"), 534, 248, 116),
      '<text x="650" y="262" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".8">CONTROL MODE</text>',
      '<text x="650" y="280" font-size="12" fill="rgba(238,255,244,.90)" font-weight="800" text-anchor="start">' + escapeHtml(metrics.bothSidesLabel || "?") + '</text>',
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> The door schedule visual is a planning summary. It shows which door groups are driving reader count and segmentation pressure before controller placement or final hardware scheduling.</p>',
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
