
(function () {
  "use strict";

  const DEFAULTS = {
    value: 25.6,
    min: 0,
    healthyMax: 8,
    watchMax: 18,
    max: 40,
    unit: "mm",
    title: "Lens Selection Pressure"
  };

  function clamp(n, min, max) {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function num(v, fallback) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const m = v.replace(/,/g, "").match(/-?\\d+(\\.\\d+)?/);
      if (m) return Number(m[0]);
    }
    return fallback;
  }

  function fmt(v, digits) {
    return Number.isFinite(v) ? v.toFixed(digits) : "?";
  }

  function findMount() {
    return (
      document.querySelector("[data-slpg-gauge]") ||
      document.getElementById("slpgGaugeMount") ||
      document.getElementById("slpgGauge")
    );
  }

  function ensureStyle() {
    if (document.getElementById("slpgGaugeStyle")) return;

    const style = document.createElement("style");
    style.id = "slpgGaugeStyle";
    style.textContent = [
      ".slpg-shell{width:100%;min-width:0;color:#f8fafc}",
      ".slpg-frame{border:1px solid rgba(148,163,184,.18);border-radius:16px;background:radial-gradient(circle at 50% 52%,rgba(148,163,184,.12),transparent 34%),radial-gradient(circle at 26% 24%,rgba(132,204,22,.09),transparent 32%),radial-gradient(circle at 78% 30%,rgba(239,68,68,.11),transparent 32%),linear-gradient(180deg,rgba(2,6,12,.98),rgba(4,10,16,.98));box-shadow:inset 0 1px 0 rgba(255,255,255,.05),inset 0 -24px 80px rgba(0,0,0,.45),0 20px 50px rgba(0,0,0,.28);overflow:hidden}",
      ".slpg-svg{display:block;width:100%;height:auto;overflow:visible}",
      ".slpg-title{font:900 15px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.13em;fill:rgba(248,250,252,.92)}",
      ".slpg-subtitle{font:650 11px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:rgba(203,213,225,.68)}",
      ".slpg-zone-title{font:950 13px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.09em;fill:rgba(248,250,252,.9)}",
      ".slpg-zone-range{font:750 11px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:rgba(248,250,252,.66)}",
      ".slpg-axis{font:850 10px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:rgba(248,250,252,.72)}",
      ".slpg-reading{font:950 28px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:#f8fafc;letter-spacing:.02em}",
      ".slpg-small{font:900 10px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:rgba(203,213,225,.8);letter-spacing:.13em}",
      ".slpg-meta-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 12px 12px;margin-top:-8px}",
      ".slpg-meta-card{min-width:0;border:1px solid rgba(148,163,184,.17);border-radius:8px;background:rgba(2,6,12,.72);padding:10px 12px}",
      ".slpg-meta-label{display:block;font:850 10px/1.1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(203,213,225,.72);margin-bottom:6px}",
      ".slpg-meta-value{display:block;font:950 16px/1.1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f8fafc}",
      ".slpg-meta-note{display:block;margin-top:3px;font:750 10px/1.1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:rgba(203,213,225,.62)}",
      ".slpg-status-healthy{color:#7ddc39}.slpg-status-watch{color:#facc15}.slpg-status-risk{color:#fb3d3d}",
      "@media(max-width:760px){.slpg-meta-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}"
    ].join("\\n");

    document.head.appendChild(style);
  }

  function statusFor(value, cfg) {
    if (value <= cfg.healthyMax) return { key: "healthy", label: "Healthy", color: "#7ddc39", note: "Inside healthy range" };
    if (value <= cfg.watchMax) return { key: "watch", label: "Watch", color: "#facc15", note: "Inside watch range" };
    return { key: "risk", label: "Risk", color: "#fb3d3d", note: "Outside preferred range" };
  }

  function readConfig(input) {
    const source = input && typeof input === "object" ? input : {};
    const cfg = Object.assign({}, DEFAULTS, source);

    cfg.value = num(
      source.value ||
      source.currentReading ||
      source.adjustedFocalLength ||
      source.adjustedFocalLengthMm ||
      source.requiredFocalLength ||
      source.recommendedFocalLength ||
      source.lensMm,
      DEFAULTS.value
    );

    cfg.min = num(source.min, DEFAULTS.min);
    cfg.healthyMax = num(source.healthyMax || source.comfortMin || source.preferredMin, DEFAULTS.healthyMax);
    cfg.watchMax = num(source.watchMax || source.comfortMax || source.preferredMax, DEFAULTS.watchMax);
    cfg.max = num(source.max || source.riskMax, DEFAULTS.max);
    cfg.unit = String(source.unit || DEFAULTS.unit);
    cfg.title = String(source.title || DEFAULTS.title);

    if (cfg.max <= cfg.min) cfg.max = cfg.min + 1;
    cfg.healthyMax = clamp(cfg.healthyMax, cfg.min, cfg.max);
    cfg.watchMax = clamp(cfg.watchMax, cfg.healthyMax, cfg.max);
    cfg.value = clamp(cfg.value, cfg.min, cfg.max);

    return cfg;
  }

  function point(angleDeg, radius, cx, cy) {
    const a = angleDeg * Math.PI / 180;
    return {
      x: cx + Math.cos(a) * radius,
      y: cy - Math.sin(a) * radius
    };
  }

  function render(input) {
    ensureStyle();

    const mount = findMount();
    if (!mount) return null;

    const cfg = readConfig(input);
    const status = statusFor(cfg.value, cfg);

    const pct = (cfg.value - cfg.min) / (cfg.max - cfg.min);
    const needleAngle = 178 - pct * 150;

    const pivot = { x: 500, y: 318 };
    const tip = point(needleAngle, 228, pivot.x, pivot.y);
    const marker = point(needleAngle, 270, pivot.x, pivot.y);

    const boxX = clamp(marker.x + 34, 650, 758);
    const boxY = clamp(marker.y - 76, 74, 156);

    const margin = cfg.value - cfg.watchMax;
    const marginText = margin > 0 ? "+" + fmt(margin, 1) + " " + cfg.unit : fmt(margin, 1) + " " + cfg.unit;
    const marginNote = margin > 0 ? "Above comfort band" : "Inside comfort band";

    mount.innerHTML = [
      '<div class="slpg-shell">',
        '<div class="slpg-frame">',
          '<svg class="slpg-svg" viewBox="0 0 1000 520" role="img" aria-label="Lens selection pressure gauge">',
            '<defs>',
              '<linearGradient id="slpgGreen" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#2f9e12"/><stop offset="55%" stop-color="#75e339"/><stop offset="100%" stop-color="#a3ff3f"/></linearGradient>',
              '<linearGradient id="slpgAmber" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#b77900"/><stop offset="55%" stop-color="#facc15"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient>',
              '<linearGradient id="slpgRed" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#991b1b"/><stop offset="55%" stop-color="#ef4444"/><stop offset="100%" stop-color="#fb7185"/></linearGradient>',
              '<linearGradient id="slpgNeedle" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff"/><stop offset="55%" stop-color="#e5e7eb"/><stop offset="100%" stop-color="#94a3b8"/></linearGradient>',
              '<filter id="slpgGlow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
              '<filter id="slpgShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000" flood-opacity=".55"/></filter>',
            '</defs>',

            '<rect x="1" y="1" width="998" height="518" rx="16" fill="transparent"/>',

            '<text x="38" y="44" class="slpg-title">' + cfg.title.toUpperCase() + '</text>',
            '<text x="38" y="70" class="slpg-subtitle">Current planning reading</text>',

            '<path d="M 112 360 C 184 148 342 78 500 78 C 658 78 816 148 888 360" fill="none" stroke="rgba(15,23,42,.95)" stroke-width="106" stroke-linecap="round" filter="url(#slpgShadow)"/>',

            '<path d="M 112 360 C 154 236 230 151 332 106" fill="none" stroke="url(#slpgGreen)" stroke-width="82" stroke-linecap="round" filter="url(#slpgGlow)"/>',
            '<path d="M 332 106 C 438 60 562 60 668 106" fill="none" stroke="url(#slpgAmber)" stroke-width="82" stroke-linecap="butt" filter="url(#slpgGlow)"/>',
            '<path d="M 668 106 C 770 151 846 236 888 360" fill="none" stroke="url(#slpgRed)" stroke-width="82" stroke-linecap="round" filter="url(#slpgGlow)"/>',

            '<path d="M 195 351 C 250 206 360 147 500 147 C 640 147 750 206 805 351" fill="none" stroke="rgba(248,250,252,.13)" stroke-width="2" stroke-dasharray="5 9"/>',

            '<text x="252" y="238" text-anchor="middle" class="slpg-zone-title" fill="#a3ff3f">HEALTHY</text>',
            '<text x="252" y="262" text-anchor="middle" class="slpg-zone-range">0 - 8 mm</text>',

            '<text x="500" y="144" text-anchor="middle" class="slpg-zone-title" fill="#facc15">WATCH</text>',
            '<text x="500" y="168" text-anchor="middle" class="slpg-zone-range">8 - 18 mm</text>',

            '<text x="748" y="238" text-anchor="middle" class="slpg-zone-title" fill="#fb3d3d">RISK</text>',
            '<text x="748" y="262" text-anchor="middle" class="slpg-zone-range">&gt; 18 mm</text>',

            '<text x="116" y="397" text-anchor="middle" class="slpg-axis">0 mm</text>',
            '<text x="330" y="96" text-anchor="middle" class="slpg-axis">8 mm</text>',
            '<text x="670" y="96" text-anchor="middle" class="slpg-axis">18 mm</text>',
            '<text x="884" y="397" text-anchor="middle" class="slpg-axis">40 mm</text>',

            '<line x1="' + pivot.x + '" y1="' + pivot.y + '" x2="' + tip.x + '" y2="' + tip.y + '" stroke="url(#slpgNeedle)" stroke-width="7" stroke-linecap="round" filter="url(#slpgShadow)"/>',
            '<circle cx="' + tip.x + '" cy="' + tip.y + '" r="9" fill="' + status.color + '" stroke="#f8fafc" stroke-width="3"/>',
            '<circle cx="' + pivot.x + '" cy="' + pivot.y + '" r="18" fill="#e5e7eb" stroke="rgba(255,255,255,.9)" stroke-width="3"/>',
            '<circle cx="' + pivot.x + '" cy="' + pivot.y + '" r="7" fill="#0b1117"/>',

            '<path d="M ' + marker.x + ' ' + marker.y + ' L ' + boxX + ' ' + (boxY + 58) + '" stroke="' + status.color + '" stroke-width="2" fill="none"/>',
            '<circle cx="' + marker.x + '" cy="' + marker.y + '" r="12" fill="#f8fafc" stroke="' + status.color + '" stroke-width="6" filter="drop-shadow(0 0 10px ' + status.color + ')"/>',
            '<rect x="' + boxX + '" y="' + boxY + '" width="205" height="92" rx="16" fill="rgba(5,8,13,.96)" stroke="' + status.color + '" stroke-width="2" filter="drop-shadow(0 0 14px rgba(244,63,94,.45))"/>',
            '<text x="' + (boxX + 24) + '" y="' + (boxY + 43) + '" class="slpg-reading">' + fmt(cfg.value, 1) + ' ' + cfg.unit + '</text>',
            '<text x="' + (boxX + 24) + '" y="' + (boxY + 72) + '" class="slpg-small">CURRENT READING</text>',
          '</svg>',

          '<div class="slpg-meta-grid">',
            '<div class="slpg-meta-card"><span class="slpg-meta-label">Comfort Band</span><span class="slpg-meta-value slpg-status-healthy">' + fmt(cfg.healthyMax, 1) + ' - ' + fmt(cfg.watchMax, 1) + ' ' + cfg.unit + '</span><span class="slpg-meta-note">Preferred planning range</span></div>',
            '<div class="slpg-meta-card"><span class="slpg-meta-label">Current Reading</span><span class="slpg-meta-value">' + fmt(cfg.value, 1) + ' ' + cfg.unit + '</span><span class="slpg-meta-note">Lens selection pressure</span></div>',
            '<div class="slpg-meta-card"><span class="slpg-meta-label">Margin to Healthy</span><span class="slpg-meta-value ' + (margin > 0 ? "slpg-status-watch" : "slpg-status-healthy") + '">' + marginText + '</span><span class="slpg-meta-note">' + marginNote + '</span></div>',
            '<div class="slpg-meta-card"><span class="slpg-meta-label">Status</span><span class="slpg-meta-value slpg-status-' + status.key + '">' + status.label + '</span><span class="slpg-meta-note">' + status.note + '</span></div>',
          '</div>',
        '</div>',
      '</div>'
    ].join("");

    return cfg;
  }

  window.renderScopedLensPlannerGauge = render;
  window.renderScopedLensPlannerGaugeFromTool = render;
  window.ScopedLabsLensPlannerGauge = {
    render: render,
    update: render,
    refresh: function () {
      return render(DEFAULTS);
    }
  };

  function init() {
    render(DEFAULTS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
