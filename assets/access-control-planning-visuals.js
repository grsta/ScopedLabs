(function () {
  "use strict";

  const VERSION = "access-control-planning-visuals-034-elevator-cad-icons";

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


  function cadControlledDoorOpeningIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const tone = options.tone || "safe";

    const toneLine = toneStroke(tone);
    const toneFillValue = toneFill(tone);
    const readerLine = tone === "risk" ? "rgba(255,170,170,.72)" : tone === "watch" ? "rgba(255,220,130,.72)" : "rgba(125,255,152,.72)";
    const readerFillValue = tone === "risk" ? "rgba(255,105,105,.12)" : tone === "watch" ? "rgba(255,204,102,.14)" : "rgba(120,255,120,.12)";

    function sx(value) {
      return Math.round((x + value * scale) * 10) / 10;
    }

    function sy(value) {
      return Math.round((y + value * scale) * 10) / 10;
    }

    function sw(value) {
      return Math.round(value * scale * 10) / 10;
    }

    return [
      '<g class="sl-cad-controlled-door-icon" data-cad-icon="controlled-door-opening" aria-label="CAD controlled door opening">',

      '<rect x="' + sx(30) + '" y="' + sy(4) + '" width="' + sw(102) + '" height="' + sw(142) + '" fill="rgba(0,0,0,.06)" stroke="rgba(203,213,225,.48)" stroke-width="' + sw(1.2) + '" />',
      '<path d="M' + sx(38) + ' ' + sy(146) + ' V' + sy(16) + ' H' + sx(124) + ' V' + sy(146) + '" fill="none" stroke="rgba(203,213,225,.66)" stroke-width="' + sw(1.2) + '" />',
      '<path d="M' + sx(30) + ' ' + sy(4) + ' L' + sx(38) + ' ' + sy(16) + ' M' + sx(132) + ' ' + sy(4) + ' L' + sx(124) + ' ' + sy(16) + ' M' + sx(30) + ' ' + sy(146) + ' L' + sx(38) + ' ' + sy(146) + ' M' + sx(132) + ' ' + sy(146) + ' L' + sx(124) + ' ' + sy(146) + '" fill="none" stroke="rgba(148,213,210,.44)" stroke-width="' + sw(1) + '" />',

      '<path d="M' + sx(38) + ' ' + sy(146) + ' V' + sy(74) + '" fill="none" stroke="' + toneLine + '" stroke-width="' + sw(1.4) + '" />',
      '<path d="M' + sx(38) + ' ' + sy(146) + ' A' + sw(82) + ' ' + sw(82) + ' 0 0 0 ' + sx(118) + ' ' + sy(138) + '" fill="none" stroke="rgba(203,213,225,.48)" stroke-width="' + sw(1.1) + '" stroke-dasharray="' + sw(6) + ' ' + sw(5) + '" />',
      '<path d="M' + sx(38) + ' ' + sy(146) + ' L' + sx(118) + ' ' + sy(146) + '" stroke="rgba(203,213,225,.46)" stroke-width="' + sw(1) + '" />',

      '<circle cx="' + sx(48) + '" cy="' + sy(86) + '" r="' + sw(5.2) + '" fill="rgba(0,0,0,.14)" stroke="rgba(203,213,225,.70)" stroke-width="' + sw(1.1) + '" />',
      '<path d="M' + sx(52) + ' ' + sy(86) + ' H' + sx(75) + '" fill="none" stroke="rgba(203,213,225,.78)" stroke-width="' + sw(1.6) + '" stroke-linecap="round" />',

      '<rect x="' + sx(14) + '" y="' + sy(58) + '" width="' + sw(12) + '" height="' + sw(30) + '" rx="' + sw(2.4) + '" fill="' + readerFillValue + '" stroke="' + readerLine + '" stroke-width="' + sw(1.1) + '" />',
      '<path d="M' + sx(18) + ' ' + sy(64) + ' H' + sx(22) + '" stroke="' + readerLine + '" stroke-width="' + sw(1.1) + '" stroke-linecap="round" />',
      '<path d="M' + sx(18) + ' ' + sy(75) + ' q' + sw(4) + ' ' + sw(5) + ' 0 ' + sw(10) + ' M' + sx(14) + ' ' + sy(73) + ' q' + sw(8) + ' ' + sw(8) + ' 0 ' + sw(16) + ' M' + sx(10) + ' ' + sy(71) + ' q' + sw(12) + ' ' + sw(11) + ' 0 ' + sw(22) + '" fill="none" stroke="' + readerLine + '" stroke-width="' + sw(1) + '" stroke-linecap="round" />',

      '<rect x="' + sx(122) + '" y="' + sy(42) + '" width="' + sw(7) + '" height="' + sw(18) + '" fill="rgba(203,213,225,.06)" stroke="rgba(203,213,225,.50)" stroke-width="' + sw(1) + '" />',
      '<rect x="' + sx(122) + '" y="' + sy(104) + '" width="' + sw(7) + '" height="' + sw(18) + '" fill="' + toneFillValue + '" stroke="' + toneLine + '" stroke-width="' + sw(1) + '" />',

      '</g>'
    ].join("");
  }

  function cadAccessReaderIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const tone = options.tone || "safe";
    const label = options.label == null ? "" : String(options.label);
    const line = toneStroke(tone);
    const fill = toneFill(tone);
    const glow = tone === "risk" ? "rgba(255,170,170,.80)" : tone === "watch" ? "rgba(255,220,130,.82)" : "rgba(92,255,245,.84)";

    function sx(value) {
      return Math.round((x + value * scale) * 10) / 10;
    }

    function sy(value) {
      return Math.round((y + value * scale) * 10) / 10;
    }

    function sw(value) {
      return Math.round(value * scale * 10) / 10;
    }

    return [
      '<g class="sl-cad-access-reader-icon" data-cad-icon="access-reader" aria-label="CAD access reader">',
      '<rect x="' + sx(0) + '" y="' + sy(0) + '" width="' + sw(74) + '" height="' + sw(126) + '" rx="' + sw(13) + '" fill="rgba(0,0,0,.24)" stroke="rgba(226,232,240,.62)" stroke-width="' + sw(1.4) + '" />',
      '<rect x="' + sx(8) + '" y="' + sy(8) + '" width="' + sw(58) + '" height="' + sw(110) + '" rx="' + sw(9) + '" fill="' + fill + '" stroke="' + line + '" stroke-width="' + sw(1) + '" />',
      '<rect x="' + sx(29) + '" y="' + sy(19) + '" width="' + sw(16) + '" height="' + sw(4) + '" rx="' + sw(2) + '" fill="' + glow + '" />',
      '<circle cx="' + sx(37) + '" cy="' + sy(74) + '" r="' + sw(3.3) + '" fill="' + glow + '" />',
      '<path d="M' + sx(25) + ' ' + sy(64) + ' q' + sw(-10) + ' ' + sw(10) + ' 0 ' + sw(20) + ' M' + sx(49) + ' ' + sy(64) + ' q' + sw(10) + ' ' + sw(10) + ' 0 ' + sw(20) + ' M' + sx(19) + ' ' + sy(58) + ' q' + sw(-16) + ' ' + sw(16) + ' 0 ' + sw(32) + ' M' + sx(55) + ' ' + sy(58) + ' q' + sw(16) + ' ' + sw(16) + ' 0 ' + sw(32) + '" fill="none" stroke="' + glow + '" stroke-width="' + sw(1.05) + '" stroke-linecap="round" />',
      label ? '<text x="' + sx(37) + '" y="' + sy(112) + '" font-size="' + sw(11) + '" fill="rgba(238,255,244,.88)" font-weight="900" text-anchor="middle">' + escapeHtml(label) + '</text>' : '',
      '</g>'
    ].join("");
  }

  function cadElevatorBankIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const tone = options.tone || "safe";
    const cars = Math.max(1, Math.min(3, Math.round(Number(options.cars || 3))));
    const label = options.label == null ? "" : String(options.label);
    const signal = tone === "risk" ? "rgba(255,170,170,.78)" : tone === "watch" ? "rgba(255,220,130,.80)" : "rgba(92,255,245,.78)";

    function sx(value) {
      return Math.round((x + value * scale) * 10) / 10;
    }

    function sy(value) {
      return Math.round((y + value * scale) * 10) / 10;
    }

    function sw(value) {
      return Math.round(value * scale * 10) / 10;
    }

    function cab(index) {
      const cx = 18 + index * 64;
      return [
        '<rect x="' + sx(cx) + '" y="' + sy(50) + '" width="' + sw(48) + '" height="' + sw(88) + '" fill="rgba(0,0,0,.10)" stroke="rgba(226,232,240,.62)" stroke-width="' + sw(1.1) + '" />',
        '<path d="M' + sx(cx + 24) + ' ' + sy(52) + ' V' + sy(138) + '" stroke="rgba(226,232,240,.50)" stroke-width="' + sw(1) + '" />',
        '<rect x="' + sx(cx + 10) + '" y="' + sy(32) + '" width="' + sw(28) + '" height="' + sw(15) + '" fill="rgba(0,0,0,.20)" stroke="rgba(226,232,240,.45)" stroke-width="' + sw(.9) + '" />',
        '<path d="M' + sx(cx + 17) + ' ' + sy(42) + ' l' + sw(4) + ' ' + sw(-7) + ' l' + sw(4) + ' ' + sw(7) + ' M' + sx(cx + 31) + ' ' + sy(35) + ' l' + sw(4) + ' ' + sw(7) + ' l' + sw(4) + ' ' + sw(-7) + '" fill="none" stroke="' + signal + '" stroke-width="' + sw(1) + '" stroke-linecap="round" stroke-linejoin="round" />'
      ].join("");
    }

    const width = 36 + cars * 64;

    return [
      '<g class="sl-cad-elevator-bank-icon" data-cad-icon="elevator-bank" aria-label="CAD elevator bank">',
      '<path d="M' + sx(0) + ' ' + sy(140) + ' H' + sx(width + 20) + '" stroke="rgba(226,232,240,.58)" stroke-width="' + sw(1.3) + '" />',
      '<rect x="' + sx(8) + '" y="' + sy(18) + '" width="' + sw(width) + '" height="' + sw(122) + '" fill="rgba(0,0,0,.055)" stroke="rgba(226,232,240,.54)" stroke-width="' + sw(1.1) + '" />',
      Array.from({ length: cars }, (_, index) => cab(index)).join(""),
      '<rect x="' + sx(width + 22) + '" y="' + sy(76) + '" width="' + sw(14) + '" height="' + sw(36) + '" fill="rgba(0,0,0,.16)" stroke="rgba(226,232,240,.42)" stroke-width="' + sw(.9) + '" />',
      '<circle cx="' + sx(width + 29) + '" cy="' + sy(88) + '" r="' + sw(4) + '" fill="rgba(0,0,0,.20)" stroke="' + signal + '" stroke-width="' + sw(.9) + '" />',
      '<circle cx="' + sx(width + 29) + '" cy="' + sy(101) + '" r="' + sw(4) + '" fill="rgba(0,0,0,.20)" stroke="' + signal + '" stroke-width="' + sw(.9) + '" />',
      '<path d="M' + sx(width + 26.5) + ' ' + sy(89) + ' l' + sw(2.5) + ' ' + sw(-3) + ' l' + sw(2.5) + ' ' + sw(3) + ' M' + sx(width + 26.5) + ' ' + sy(100) + ' l' + sw(2.5) + ' ' + sw(3) + ' l' + sw(2.5) + ' ' + sw(-3) + '" fill="none" stroke="' + signal + '" stroke-width="' + sw(.75) + '" stroke-linecap="round" stroke-linejoin="round" />',
      label ? '<text x="' + sx(width / 2 + 8) + '" y="' + sy(15) + '" font-size="' + sw(12) + '" fill="rgba(238,255,244,.88)" font-weight="900" text-anchor="middle">' + escapeHtml(label) + '</text>' : '',
      '</g>'
    ].join("");
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
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Door cable path, slack, and takeoff pressure</text>',
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

    function contributionValue(raw, fallback) {
      const direct = Number(raw);
      if (Number.isFinite(direct)) return Math.max(0, direct);
      const backfill = Number(fallback);
      if (Number.isFinite(backfill)) return Math.max(0, backfill);
      return 0;
    }

    function contributionLabel(value) {
      const num = Number(value);
      if (!Number.isFinite(num)) return "?";
      return Math.abs(num - Math.round(num)) < 0.05 ? String(Math.round(num)) : num.toFixed(1);
    }

    function wrapLabel(text, maxLen, maxLines) {
      const source = String(text || "?").trim();
      if (!source) return ["?"];
      const words = source.split(/\s+/);
      const lines = [];
      let line = "";
      words.forEach((word) => {
        const candidate = line ? line + " " + word : word;
        if (candidate.length <= maxLen || !line) {
          line = candidate;
          return;
        }
        lines.push(line);
        line = word;
      });
      if (line) lines.push(line);
      if (lines.length <= maxLines) return lines;
      const trimmed = lines.slice(0, maxLines);
      const last = trimmed[maxLines - 1];
      trimmed[maxLines - 1] = last.length > maxLen - 1 ? last.slice(0, maxLen - 1) + "?" : last + "?";
      return trimmed;
    }

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

    function groupRow(label, displayValue, numericValue, x, y, toneName) {
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="202" height="64" rx="10" fill="rgba(0,0,0,.14)" stroke="rgba(120,255,120,.10)" />',
        '<text x="' + (x + 12) + '" y="' + (y + 18) + '" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".7">' + escapeHtml(label).toUpperCase() + '</text>',
        '<text x="' + (x + 184) + '" y="' + (y + 19) + '" font-size="15" fill="rgba(238,255,244,.94)" font-weight="900" text-anchor="end">' + escapeHtml(displayValue) + '</text>',
        doorTicks(numericValue, x + 14, y + 28, toneName),
        '</g>'
      ].join("");
    }

    function controlModeBlock(label, x, y, w, h) {
      const lines = wrapLabel(label, 22, 2);
      const tspans = lines.map((line, index) => {
        const dy = index === 0 ? 0 : 12;
        return '<tspan x="' + (x + 12) + '" dy="' + dy + '">' + escapeHtml(line) + '</tspan>';
      }).join('');
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="rgba(0,0,0,.14)" stroke="rgba(120,255,120,.10)" />',
        '<text x="' + (x + 12) + '" y="' + (y + 15) + '" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".8">CONTROL MODE</text>',
        '<text x="' + (x + 12) + '" y="' + (y + 30) + '" font-size="10.5" fill="rgba(238,255,244,.90)" font-weight="800">' + tspans + '</text>',
        '</g>'
      ].join('');
    }

    const zones = contributionValue(metrics.zoneBase, metrics.zoneBaseLabel);
    const high = contributionValue(metrics.highsecAdd, metrics.highsecAddLabel);
    const doors = Math.max(1, Number(metrics.doors || Math.round(perimeter + zones + high) || 1));
    const readers = Math.max(0, Number(metrics.readers || 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const pressure = clamp(complexity / 140, 0.04, 1);
    const pressureTone = pressure > .72 ? "risk" : pressure > .45 ? "watch" : "safe";

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-count-planner">',
      '<svg viewBox="0 0 760 388" role="img" aria-label="Door count planning pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridDoorCountV4" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="340" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="316" rx="12" fill="url(#accGridDoorCountV4)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">DOOR SCHEDULE LOAD</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Controlled doors, readers, and segmentation pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      groupRow("Perimeter", contributionLabel(perimeter), perimeter, 52, 112, "safe"),
      groupRow("Interior zones", contributionLabel(zones), zones, 279, 112, "safe"),
      groupRow("High-security", contributionLabel(high), high, 506, 112, high > 0 ? "watch" : "safe"),
      '<path d="M112 206 H648" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M112 206 C214 184, 300 228, 382 206 S548 186, 648 206" fill="none" stroke="rgba(125,255,152,.38)" stroke-width="1.4" />',
      '<circle cx="112" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="382" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="648" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<text x="112" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">scope</text>',
      '<text x="382" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">controller grouping</text>',
      '<text x="648" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">reader count</text>',
      pressureRail("complexity pressure", pressure, 52, 258, 220, pressureTone),
      metricChip("total doors", String(metrics.doors ?? doors ?? "?"), 296, 248, 110),
      metricChip("readers", String(metrics.readers ?? readers ?? "?"), 420, 248, 100),
      metricChip("complexity", String(metrics.complexityIndex ?? complexity ?? "?"), 534, 248, 116),
      controlModeBlock(metrics.bothSidesLabel || "?", 534, 292, 182, 52),
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Interior and high-security values are weighted planning contributions. The final controlled-door total is rounded after the weighted values are added, so rounded component labels may not equal the final total.</p>',
      '</div>'
    ].join("");
  }







  function buildSpecialLockingSvg(metrics = {}) {
    const tone = statusTone(metrics.status || metrics.authorityLevel);
    const statusText = statusLabel(metrics.status || metrics.authorityLevel);
    const openings = Math.max(0, Number(metrics.openingCount || 0));
    const riskScore = Math.max(0, Number(metrics.riskScore || 0));
    const pressure = clamp(riskScore / 100, 0.04, 1);
    const pressureTone = riskScore >= 75 ? "risk" : riskScore >= 45 ? "watch" : "safe";
    const openingTones = Array.isArray(metrics.openingTones) ? metrics.openingTones.filter(Boolean) : [];
    const exceptionCount = Math.max(0, Number(metrics.exceptionCount || 0));

    function highestOpeningTone(items) {
      if (items.includes("risk")) return "risk";
      if (items.includes("watch")) return "watch";
      return pressureTone;
    }

    function openingTone(index) {
      return openingTones[index] || pressureTone;
    }

    const hiddenOpeningTone = highestOpeningTone(openingTones.slice(4));

    const lockingType = metrics.lockingTypeLabel || metrics.lockingType || "?";
    const egressImpact = metrics.egressImpactLabel || metrics.egressImpact || "?";
    const releaseLogic = metrics.releaseLogicLabel || metrics.releaseLogic || "?";
    const authorityReview = metrics.authorityReviewLabel || metrics.authorityReview || "?";
    const overridePlan = metrics.overridePlanLabel || metrics.overridePlan || "?";

    function authorityBlock(label, value, x, y, w, toneName) {
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="42" rx="9" fill="' + toneFill(toneName || "safe") + '" stroke="' + toneStroke(toneName || "safe") + '" />',
        '<text x="' + (x + 12) + '" y="' + (y + 15) + '" font-size="8.5" fill="rgba(203,213,225,.66)" letter-spacing=".7">' + escapeHtml(label).toUpperCase() + '</text>',
        '<text x="' + (x + 12) + '" y="' + (y + 31) + '" font-size="10.5" fill="rgba(238,255,244,.92)" font-weight="750">' + escapeHtml(value) + '</text>',
        '</g>'
      ].join("");
    }

    function miniMetric(label, value, x, y, w, toneName) {
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" rx="8" fill="' + (toneName ? toneFill(toneName) : "rgba(0,0,0,.16)") + '" stroke="' + (toneName ? toneStroke(toneName) : "rgba(120,255,120,.12)") + '" />',
        '<text x="' + (x + 10) + '" y="' + (y + 12) + '" font-size="8.5" fill="rgba(203,213,225,.62)" letter-spacing=".65">' + escapeHtml(label).toUpperCase() + '</text>',
        '<text x="' + (x + 10) + '" y="' + (y + 24) + '" font-size="10.5" fill="rgba(238,255,244,.92)" font-weight="800">' + escapeHtml(value) + '</text>',
        '</g>'
      ].join("");
    }

    const releaseTone = String(metrics.releaseLogic || "").includes("needed") ? "watch" : "safe";
    const reviewTone = String(metrics.authorityReview || "").includes("required") ? "risk" : String(metrics.authorityReview || "").includes("likely") ? "watch" : "safe";
    const overrideTone = String(metrics.overridePlan || "").includes("missing") ? "risk" : String(metrics.overridePlan || "").includes("partial") ? "watch" : "safe";
    const egressTone = String(metrics.egressImpact || "").includes("yes") ? "watch" : String(metrics.egressImpact || "").includes("unknown") ? "watch" : "safe";
    const releaseCheckToneList = [egressTone, releaseTone, reviewTone, overrideTone];
    const releaseChecksClear = releaseCheckToneList.every((item) => item === "safe");
    const statusSource = tone === "watch" && releaseChecksClear
      ? "SOURCE: LOCKING SCOPE"
      : tone === "watch"
        ? "SOURCE: REVIEW PRESSURE"
        : tone === "risk"
          ? "SOURCE: AUTHORITY REVIEW"
          : "SOURCE: RELEASE CHECKS CLEAR";
    const statusSourceFill = tone === "risk"
      ? "rgba(255,170,170,.82)"
      : tone === "watch"
        ? "rgba(255,220,130,.84)"
        : "rgba(125,255,152,.72)";
    const pathTone = releaseCheckToneList.includes("risk")
      ? "risk"
      : releaseCheckToneList.includes("watch")
        ? "watch"
        : pressureTone;
    const openingNodeTone = highestOpeningTone(openingTones);
    const egressNodeTone = egressTone;
    const releaseNodeTone = releaseTone;

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="special-locking-scope">',
      '<svg viewBox="0 0 760 470" role="img" aria-label="Special locking authority review pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridSpecialLockingV21" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.040)" stroke-width="1"/></pattern></defs>',

      '<rect x="24" y="24" width="712" height="424" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="400" rx="12" fill="url(#accGridSpecialLockingV21)" stroke="rgba(120,255,120,.07)" />',

      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">SPECIAL LOCKING / HIGH-SECURITY SCOPE</text>',
      '<text x="52" y="84" font-size="18" fill="rgba(246,255,248,.96)" font-weight="650">Authority review and release coordination</text>',
      statusBadge(statusText, tone, 616, 51),
      '<text x="659" y="96" font-size="8" fill="' + statusSourceFill + '" text-anchor="middle" letter-spacing=".7">' + escapeHtml(statusSource) + '</text>',

      '<rect x="52" y="108" width="300" height="252" rx="12" fill="rgba(0,0,0,.13)" stroke="rgba(120,255,120,.10)" />',
      '<text x="70" y="132" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">FLAGGED OPENINGS</text>',
      Math.round(openings) > 0 ? cadControlledDoorOpeningIcon({ x: 76, y: 164, scale: 0.36, tone: openingTone(0) }) : '',
      Math.round(openings) > 1 ? cadControlledDoorOpeningIcon({ x: 122, y: 164, scale: 0.36, tone: openingTone(1) }) : '',
      Math.round(openings) > 2 ? cadControlledDoorOpeningIcon({ x: 168, y: 164, scale: 0.36, tone: openingTone(2) }) : '',
      Math.round(openings) > 3 ? cadControlledDoorOpeningIcon({ x: 214, y: 164, scale: 0.36, tone: openingTone(3) }) : '',
      Math.round(openings) > 4 ? '<text x="272" y="180" font-size="9" fill="' + toneStroke(hiddenOpeningTone) + '" font-weight="800">+' + escapeHtml(String(Math.round(openings) - 4)) + ' more</text>' : '',
      '<text x="198" y="132" font-size="8" fill="rgba(203,213,225,.58)" letter-spacing=".65">CONTROLLED OPENINGS</text>',
      '<text x="198" y="148" font-size="10.5" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(String(openings)) + ' flagged</text>',

      '<path d="M92 276 H308" stroke="rgba(203,213,225,.22)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M92 276 C154 256, 246 296, 308 276" fill="none" stroke="' + toneStroke(pathTone) + '" stroke-width="1.3" opacity=".72" />',
      '<circle cx="92" cy="276" r="4.8" fill="' + toneFill(openingNodeTone) + '" stroke="' + toneStroke(openingNodeTone) + '" />',
      '<circle cx="200" cy="276" r="4.8" fill="' + toneFill(egressNodeTone) + '" stroke="' + toneStroke(egressNodeTone) + '" />',
      '<circle cx="308" cy="276" r="4.8" fill="' + toneFill(releaseNodeTone) + '" stroke="' + toneStroke(releaseNodeTone) + '" />',
      '<text x="92" y="294" font-size="9.5" fill="rgba(203,213,225,.56)" text-anchor="middle">opening</text>',
      '<text x="200" y="294" font-size="9.5" fill="rgba(203,213,225,.56)" text-anchor="middle">egress</text>',
      '<text x="308" y="294" font-size="9.5" fill="rgba(203,213,225,.56)" text-anchor="middle">release</text>',
      pressureRail("authority pressure", pressure, 76, 322, 232, pressureTone),

      '<rect x="380" y="108" width="322" height="252" rx="12" fill="rgba(0,0,0,.13)" stroke="rgba(120,255,120,.10)" />',
      '<text x="398" y="132" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">AUTHORITY / RELEASE CHECKS</text>',
      authorityBlock("egress", egressImpact, 398, 146, 286, egressTone),
      authorityBlock("release", releaseLogic, 398, 202, 286, releaseTone),
      authorityBlock("review", authorityReview, 398, 254, 286, reviewTone),
      authorityBlock("override", overridePlan, 398, 306, 286, overrideTone),

      '<rect x="52" y="382" width="650" height="34" rx="10" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.10)" />',
      '<text x="68" y="403" font-size="8.5" fill="rgba(203,213,225,.62)" letter-spacing=".7">LOCKING</text>',
      '<text x="132" y="403" font-size="10.5" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(lockingType) + '</text>',
      miniMetric("openings", String(metrics.openingCount ?? "?"), 402, 384, 92),
      miniMetric("risk score", String(metrics.riskScore ?? "?"), 506, 384, 104, pressureTone),
      miniMetric("exceptions", String(exceptionCount), 622, 384, 80, exceptionCount ? "watch" : "safe"),

      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Special locking is a specialty planning branch. Use the visual to flag openings that need authority review, release coordination, egress validation, and documented override procedures before final design. Overall status can remain Watch when locking or high-security scope creates planning pressure even when individual release checks are clear.</p>',
      '</div>'
    ].join("");
  }

  function renderSpecialLocking(options = {}) {
    return show(options, buildSpecialLockingSvg(options.metrics || {}));
  }
  function buildElevatorReaderSvg(metrics = {}) {
    const tone = statusTone(metrics.status || metrics.systemStatus);
    const statusText = statusLabel(metrics.status || metrics.systemStatus);
    const cars = Math.max(0, Number(metrics.carReaders || 0));
    const dcs = Math.max(0, Number(metrics.dcsAdd || 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const pressure = clamp(complexity / 100, 0.04, 1);
    const pressureTone = complexity > 90 ? "risk" : complexity > 55 ? "watch" : "safe";
    const dcsTone = dcs > 0 ? "watch" : "safe";
    const placement = metrics.placementLabel || metrics.placement || "?";
    const dest = metrics.destLabel || metrics.destinationControl || "?";
    const bankCount = Math.max(1, Math.min(6, Math.round(Number(metrics.banks || 1))));
    const bankVisibleCount = Math.max(1, Math.min(3, bankCount));
    const carCount = Math.max(1, Math.min(8, Math.round(Number(metrics.cars || cars || 1))));

    function carNode(index) {
      const x = 72 + (index % 4) * 48;
      const y = 124 + Math.floor(index / 4) * 48;
      return cadAccessReaderIcon({ x, y, scale: 0.28, tone: pressureTone, label: String(index + 1) });
    }

    function bankNode(index) {
      const x = 370 + index * 86;
      return cadElevatorBankIcon({ x, y: 124, scale: 0.36, tone: pressureTone, cars: 1, label: "B" + (index + 1) });
    }

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="elevator-reader-count">',
      '<svg viewBox="0 0 760 388" role="img" aria-label="Elevator reader count pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridElevatorV8" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="340" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="316" rx="12" fill="url(#accGridElevatorV8)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">ELEVATOR READER COUNT</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Reader load, DCS adders, and integration pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      '<text x="72" y="114" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">CAR / CAB READERS</text>',
      Array.from({ length: carCount }, (_, index) => carNode(index)).join(''),
      cars > carCount ? '<text x="260" y="162" font-size="11" fill="rgba(203,213,225,.66)">+' + escapeHtml(Math.round(cars - carCount)) + '</text>' : '',
      '<path d="M300 166 H350" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="5 6" />',
      '<text x="378" y="114" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">ELEVATOR BANK GROUPS</text>',
      Array.from({ length: bankVisibleCount }, (_, index) => bankNode(index)).join(''),
      bankCount > bankVisibleCount ? '<text x="646" y="162" font-size="11" fill="rgba(203,213,225,.66)">+' + escapeHtml(Math.round(bankCount - bankVisibleCount)) + ' bank</text>' : '',
      '<rect x="598" y="138" width="74" height="46" rx="8" fill="' + toneFill(dcsTone) + '" stroke="' + toneStroke(dcsTone) + '" />',
      '<text x="635" y="157" text-anchor="middle" font-size="9" fill="rgba(203,213,225,.66)" letter-spacing=".8">DCS ADD</text>',
      '<text x="635" y="176" text-anchor="middle" font-size="14" fill="rgba(238,255,244,.94)" font-weight="900">' + escapeHtml(dcs) + '</text>',
      '<path d="M112 226 H648" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M112 226 C214 202, 300 246, 382 226 S548 204, 648 226" fill="none" stroke="rgba(125,255,152,.38)" stroke-width="1.4" />',
      '<circle cx="112" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="382" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="648" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<text x="112" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">cars</text>',
      '<text x="382" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">bank groups</text>',
      '<text x="648" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">integration</text>',
      pressureRail("integration pressure", pressure, 52, 282, 220, pressureTone),
      metricChip("total readers", String(metrics.totalReaders ?? "?"), 296, 272, 126),
      metricChip("in car", String(metrics.carReaders ?? "?"), 436, 272, 92),
      metricChip("lobby", String(metrics.lobbyReaders ?? "?"), 542, 272, 86),
      '<rect x="52" y="320" width="286" height="28" rx="8" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.10)" />',
      '<text x="62" y="337" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".7">PLACEMENT</text>',
      '<text x="132" y="337" font-size="10" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(placement) + '</text>',
      '<rect x="356" y="320" width="272" height="28" rx="8" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.10)" />',
      '<text x="366" y="337" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".7">DESTINATION CONTROL</text>',
      '<text x="498" y="337" font-size="10" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(dest) + '</text>',
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Elevator bank groups are scope markers, not lobby reader counts. Use the visual to compare car readers, actual lobby readers, DCS adders, and integration pressure before final elevator coordination.</p>',
      '</div>'
    ].join("");
  }

  function renderElevatorReader(options = {}) {
    return show(options, buildElevatorReaderSvg(options.metrics || {}));
  }
  function buildAntiPassbackSvg(metrics = {}) {
    const tone = statusTone(metrics.status || metrics.operationalRisk);
    const statusText = statusLabel(metrics.status || metrics.operationalRisk);
    const zones = Math.max(0, Number(metrics.recommendedZones || 0));
    const paired = Math.max(0, Number(metrics.pairedEntrances || 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const exposure = Math.max(0, Number(metrics.enforcementExposure || 0));
    const pressure = clamp(complexity / 18, 0.04, 1);
    const exposureRatio = clamp(exposure / 18, 0.04, 1);
    const pressureTone = complexity >= 12 ? "risk" : complexity >= 9 ? "watch" : "safe";
    const strategy = metrics.strategyLabel || "?";
    const mode = metrics.typeLabel || metrics.recommendedType || "?";

    function zoneNode(index) {
      const cols = 5;
      const x = 72 + (index % cols) * 54;
      const y = 126 + Math.floor(index / cols) * 42;
      return [
        '<rect x="' + x + '" y="' + y + '" width="36" height="24" rx="5" fill="rgba(120,255,120,.075)" stroke="rgba(125,255,152,.36)" />',
        '<text x="' + (x + 18) + '" y="' + (y + 16) + '" text-anchor="middle" font-size="10" fill="rgba(238,255,244,.88)" font-weight="800">Z' + (index + 1) + '</text>'
      ].join('');
    }

    function pairedGate(index) {
      const x = 394 + index * 42;
      return [
        '<g>',
        '<rect x="' + x + '" y="136" width="18" height="54" rx="4" fill="rgba(255,204,102,.09)" stroke="rgba(255,204,102,.40)" />',
        '<path d="M' + (x + 5) + ' 150 H' + (x + 13) + ' M' + (x + 5) + ' 165 H' + (x + 13) + ' M' + (x + 5) + ' 180 H' + (x + 13) + '" stroke="rgba(255,235,170,.48)" stroke-width="1" />',
        '</g>'
      ].join('');
    }

    const zoneCount = Math.max(2, Math.min(10, Math.round(zones || 2)));
    const pairCount = Math.max(1, Math.min(6, Math.round(paired || 1)));

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="anti-passback-zones">',
      '<svg viewBox="0 0 760 388" role="img" aria-label="Anti-passback zoning pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridApbV6" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="340" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="316" rx="12" fill="url(#accGridApbV6)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">ANTI-PASSBACK ZONES</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Zone structure, paired transitions, and enforcement pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      '<text x="72" y="114" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">ZONE MODEL</text>',
      Array.from({ length: zoneCount }, (_, index) => zoneNode(index)).join(''),
      zones > zoneCount ? '<text x="342" y="176" font-size="11" fill="rgba(203,213,225,.66)">+' + escapeHtml(Math.round(zones - zoneCount)) + '</text>' : '',
      '<path d="M338 164 H382" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="5 6" />',
      '<text x="392" y="114" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">PAIRED IN / OUT READS</text>',
      Array.from({ length: pairCount }, (_, index) => pairedGate(index)).join(''),
      paired > pairCount ? '<text x="660" y="166" font-size="11" fill="rgba(203,213,225,.66)">+' + escapeHtml(Math.round(paired - pairCount)) + '</text>' : '',
      '<path d="M112 226 H648" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M112 226 C210 202, 308 246, 382 226 S540 204, 648 226" fill="none" stroke="rgba(125,255,152,.38)" stroke-width="1.4" />',
      '<circle cx="112" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="382" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="648" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<text x="112" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">zones</text>',
      '<text x="382" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">transitions</text>',
      '<text x="648" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">policy friction</text>',
      pressureRail("complexity pressure", pressure, 52, 282, 220, pressureTone),
      pressureRail("enforcement exposure", exposureRatio, 296, 282, 190, pressureTone),
      metricChip("zones", String(metrics.recommendedZones ?? "?"), 506, 272, 82),
      metricChip("paired", String(metrics.pairedEntrances ?? "?"), 600, 272, 82),
      '<rect x="506" y="320" width="176" height="28" rx="8" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.10)" />',
      '<text x="516" y="337" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".7">MODE</text>',
      '<text x="564" y="337" font-size="10" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(mode) + '</text>',
      '<text x="52" y="337" font-size="10" fill="rgba(203,213,225,.62)">Strategy: ' + escapeHtml(strategy) + '</text>',
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Anti-passback is a specialty planning branch. Use the visual to compare zone count, paired transitions, complexity pressure, and operational exposure before enforcing APB rules in the platform.</p>',
      '</div>'
    ].join("");
  }

  function renderAntiPassback(options = {}) {
    return show(options, buildAntiPassbackSvg(options.metrics || {}));
  }
  function renderDoorCable(options = {}) {
    return show(options, buildDoorCableSvg(options.metrics || {}));
  }

  function renderDoorCount(options = {}) {
    return show(options, buildDoorCountSvg(options.metrics || {}));
  }

  window.ScopedLabsAccessControlPlanningVisuals = Object.freeze({
    cadControlledDoorOpeningIcon,
    cadAccessReaderIcon,
    cadElevatorBankIcon,
    VERSION,
    renderDoorCable,
    renderDoorCount,
    renderAntiPassback,
    buildAntiPassbackSvg,
    renderElevatorReader,
    buildElevatorReaderSvg,
    renderSpecialLocking,
    buildSpecialLockingSvg,
    hide,
    getDataUri,
    svgToDataUri
  });
})();
