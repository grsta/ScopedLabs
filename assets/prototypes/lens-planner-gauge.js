
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

  function toNumber(v, fallback) {
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
    return document.querySelector("[data-slpg-gauge]") ||
      document.getElementById("slpgGaugeMount") ||
      document.getElementById("slpgGauge");
  }

  function statusFor(value, cfg) {
    if (value <= cfg.healthyMax) return { key: "healthy", label: "HEALTHY", color: "#7dff98", note: "Inside healthy range" };
    if (value <= cfg.watchMax) return { key: "watch", label: "WATCH", color: "#ffd34f", note: "Inside watch range" };
    return { key: "risk", label: "RISK", color: "#ff6058", note: "Outside preferred range" };
  }

  function readConfig(input) {
    const src = input && typeof input === "object" ? input : {};
    const cfg = Object.assign({}, DEFAULTS, src);

    cfg.value = toNumber(
      src.value ||
      src.currentReading ||
      src.adjustedFocalLength ||
      src.adjustedFocalLengthMm ||
      src.requiredFocalLength ||
      src.recommendedFocalLength ||
      src.lensMm,
      DEFAULTS.value
    );

    cfg.min = toNumber(src.min, DEFAULTS.min);
    cfg.healthyMax = toNumber(src.healthyMax || src.comfortMin || src.preferredMin, DEFAULTS.healthyMax);
    cfg.watchMax = toNumber(src.watchMax || src.comfortMax || src.preferredMax, DEFAULTS.watchMax);
    cfg.max = toNumber(src.max || src.riskMax, DEFAULTS.max);
    cfg.unit = String(src.unit || DEFAULTS.unit);
    cfg.title = String(src.title || DEFAULTS.title);

    if (cfg.max <= cfg.min) cfg.max = cfg.min + 1;
    cfg.healthyMax = clamp(cfg.healthyMax, cfg.min, cfg.max);
    cfg.watchMax = clamp(cfg.watchMax, cfg.healthyMax, cfg.max);
    cfg.value = clamp(cfg.value, cfg.min, cfg.max);

    return cfg;
  }

  function ensureStyle() {
    if (document.getElementById("slpgGaugeStyle")) return;

    const style = document.createElement("style");
    style.id = "slpgGaugeStyle";
    style.textContent = [
      ".slpg-shell{width:100%;min-width:0;color:#f8fafc}",
      ".slpg-card{border:1px solid rgba(148,163,184,.18);border-radius:16px;background:radial-gradient(circle at 78% 22%,rgba(255,96,88,.13),transparent 32%),radial-gradient(circle at 22% 20%,rgba(125,255,152,.10),transparent 34%),linear-gradient(180deg,rgba(4,10,15,.98),rgba(2,7,10,.98));box-shadow:inset 0 1px 0 rgba(255,255,255,.055),0 20px 50px rgba(0,0,0,.30);padding:18px;overflow:hidden}",
      ".slpg-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}",
      ".slpg-kicker{color:#7dff98;font:950 10px/1 system-ui;letter-spacing:.16em;text-transform:uppercase;margin-bottom:7px}",
      ".slpg-title{color:#fff;font:950 18px/1.15 system-ui;margin:0}",
      ".slpg-summary{color:rgba(248,250,252,.68);font:600 12px/1.45 system-ui;margin-top:7px;max-width:520px}",
      ".slpg-status{border:1px solid currentColor;border-radius:12px;padding:9px 13px;font:950 12px/1 system-ui;letter-spacing:.12em;background:rgba(255,255,255,.035);box-shadow:0 0 18px rgba(255,255,255,.06)}",
      ".slpg-rail-wrap{position:relative;padding:48px 10px 42px;margin:8px 0 16px}",
      ".slpg-band{height:24px;border-radius:999px;display:flex;overflow:hidden;background:#111827;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 14px 35px rgba(0,0,0,.35)}",
      ".slpg-seg{height:100%}.slpg-green{background:linear-gradient(90deg,#2f9e12,#7dff39)}.slpg-yellow{background:linear-gradient(90deg,#b77900,#facc15)}.slpg-red{background:linear-gradient(90deg,#dc2626,#fb7185)}",
      ".slpg-target{position:absolute;top:35px;height:50px;border-left:2px dashed rgba(255,255,255,.45);border-right:2px dashed rgba(255,255,255,.45);background:rgba(255,255,255,.035);border-radius:8px}",
      ".slpg-target-label{position:absolute;top:10px;transform:translateX(-50%);color:rgba(248,250,252,.72);font:850 10px/1 system-ui;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}",
      ".slpg-marker{position:absolute;top:22px;width:3px;height:78px;background:#fff;border-radius:999px;box-shadow:0 0 14px rgba(255,255,255,.55);transform:translateX(-50%)}",
      ".slpg-marker:before{content:'';position:absolute;top:-8px;left:50%;width:18px;height:18px;border-radius:999px;background:var(--slpg-color);border:3px solid #fff;transform:translateX(-50%);box-shadow:0 0 18px var(--slpg-color)}",
      ".slpg-callout{position:absolute;top:-12px;transform:translateX(-50%);min-width:138px;border:1px solid var(--slpg-color);border-radius:12px;background:rgba(4,9,14,.96);padding:10px 12px;box-shadow:0 0 22px color-mix(in srgb,var(--slpg-color) 45%,transparent),0 16px 30px rgba(0,0,0,.35)}",
      ".slpg-callout-value{font:950 20px/1 system-ui;color:#fff}.slpg-callout-label{margin-top:5px;color:rgba(203,213,225,.78);font:900 9px/1 system-ui;letter-spacing:.12em;text-transform:uppercase}",
      ".slpg-scale{display:flex;justify-content:space-between;margin-top:10px;color:rgba(248,250,252,.64);font:850 10px/1 system-ui}",
      ".slpg-zones{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}",
      ".slpg-zone{border:1px solid rgba(148,163,184,.16);border-radius:10px;background:rgba(2,6,12,.58);padding:10px 12px}",
      ".slpg-zone strong{display:block;font:950 11px/1 system-ui;letter-spacing:.12em;margin-bottom:6px}.slpg-zone span{color:rgba(203,213,225,.70);font:750 11px/1.25 system-ui}",
      ".slpg-meta-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}",
      ".slpg-meta{border:1px solid rgba(148,163,184,.17);border-radius:10px;background:rgba(2,6,12,.68);padding:11px 12px}",
      ".slpg-meta-label{display:block;color:rgba(203,213,225,.72);font:850 10px/1.1 system-ui;letter-spacing:.12em;text-transform:uppercase;margin-bottom:7px}",
      ".slpg-meta-value{display:block;color:#f8fafc;font:950 17px/1.1 system-ui}.slpg-meta-note{display:block;margin-top:4px;color:rgba(203,213,225,.62);font:750 10px/1.15 system-ui}",
      ".slpg-status-healthy{color:#7dff98}.slpg-status-watch{color:#ffd34f}.slpg-status-risk{color:#ff6058}",
      "@media(max-width:760px){.slpg-top,.slpg-meta-grid,.slpg-zones{grid-template-columns:1fr;display:grid}.slpg-top{gap:10px}.slpg-callout{min-width:120px}.slpg-callout-value{font-size:17px}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function render(input) {
    ensureStyle();

    const mount = findMount();
    if (!mount) return null;

    const cfg = readConfig(input);
    const status = statusFor(cfg.value, cfg);

    const span = cfg.max - cfg.min;
    const pct = clamp(((cfg.value - cfg.min) / span) * 100, 0, 100);
    const healthyPct = clamp(((cfg.healthyMax - cfg.min) / span) * 100, 0, 100);
    const watchPct = clamp(((cfg.watchMax - cfg.healthyMax) / span) * 100, 0, 100);
    const riskPct = clamp(100 - healthyPct - watchPct, 0, 100);

    const targetLeft = healthyPct;
    const targetWidth = watchPct;
    const margin = cfg.value - cfg.watchMax;
    const marginText = margin > 0 ? "+" + fmt(margin, 1) + " " + cfg.unit : fmt(margin, 1) + " " + cfg.unit;
    const marginNote = margin > 0 ? "Above comfort band" : "Inside comfort band";

    mount.innerHTML = [
      '<div class="slpg-shell">',
        '<div class="slpg-card" style="--slpg-color:' + status.color + '">',
          '<div class="slpg-top">',
            '<div>',
              '<div class="slpg-kicker">Results Overview</div>',
              '<h3 class="slpg-title">' + cfg.title + '</h3>',
              '<div class="slpg-summary">The current reading is plotted against the preferred planning band, watch range, and risk range so the output reads like a planning decision instead of a raw calculator result.</div>',
            '</div>',
            '<div class="slpg-status slpg-status-' + status.key + '">' + status.label + '</div>',
          '</div>',

          '<div class="slpg-rail-wrap">',
            '<div class="slpg-target" style="left:' + targetLeft + '%;width:' + targetWidth + '%"></div>',
            '<div class="slpg-target-label" style="left:' + (targetLeft + targetWidth / 2) + '%">Preferred planning band</div>',
            '<div class="slpg-callout" style="left:' + pct + '%">',
              '<div class="slpg-callout-value">' + fmt(cfg.value, 1) + ' ' + cfg.unit + '</div>',
              '<div class="slpg-callout-label">Current Reading</div>',
            '</div>',
            '<div class="slpg-marker" style="left:' + pct + '%"></div>',
            '<div class="slpg-band">',
              '<div class="slpg-seg slpg-green" style="width:' + healthyPct + '%"></div>',
              '<div class="slpg-seg slpg-yellow" style="width:' + watchPct + '%"></div>',
              '<div class="slpg-seg slpg-red" style="width:' + riskPct + '%"></div>',
            '</div>',
            '<div class="slpg-scale">',
              '<span>' + fmt(cfg.min, 0) + ' ' + cfg.unit + '</span>',
              '<span>' + fmt(cfg.healthyMax, 0) + ' ' + cfg.unit + '</span>',
              '<span>' + fmt(cfg.watchMax, 0) + ' ' + cfg.unit + '</span>',
              '<span>' + fmt(cfg.max, 0) + ' ' + cfg.unit + '</span>',
            '</div>',
          '</div>',

          '<div class="slpg-zones">',
            '<div class="slpg-zone"><strong class="slpg-status-healthy">HEALTHY</strong><span>' + fmt(cfg.min, 0) + '?' + fmt(cfg.healthyMax, 0) + ' ' + cfg.unit + '</span></div>',
            '<div class="slpg-zone"><strong class="slpg-status-watch">WATCH</strong><span>' + fmt(cfg.healthyMax, 0) + '?' + fmt(cfg.watchMax, 0) + ' ' + cfg.unit + '</span></div>',
            '<div class="slpg-zone"><strong class="slpg-status-risk">RISK</strong><span>Above ' + fmt(cfg.watchMax, 0) + ' ' + cfg.unit + '</span></div>',
          '</div>',

          '<div class="slpg-meta-grid">',
            '<div class="slpg-meta"><span class="slpg-meta-label">Comfort Band</span><span class="slpg-meta-value slpg-status-healthy">' + fmt(cfg.healthyMax, 1) + ' - ' + fmt(cfg.watchMax, 1) + ' ' + cfg.unit + '</span><span class="slpg-meta-note">Preferred planning range</span></div>',
            '<div class="slpg-meta"><span class="slpg-meta-label">Current Reading</span><span class="slpg-meta-value">' + fmt(cfg.value, 1) + ' ' + cfg.unit + '</span><span class="slpg-meta-note">Lens selection pressure</span></div>',
            '<div class="slpg-meta"><span class="slpg-meta-label">Margin to Healthy</span><span class="slpg-meta-value ' + (margin > 0 ? "slpg-status-watch" : "slpg-status-healthy") + '">' + marginText + '</span><span class="slpg-meta-note">' + marginNote + '</span></div>',
            '<div class="slpg-meta"><span class="slpg-meta-label">Status</span><span class="slpg-meta-value slpg-status-' + status.key + '">' + status.label + '</span><span class="slpg-meta-note">' + status.note + '</span></div>',
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
    refresh: function () { return render(DEFAULTS); }
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
