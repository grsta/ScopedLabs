
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

  function number(v, fallback) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      if (m) return Number(m[0]);
    }
    return fallback;
  }

  function fmt(v, d) {
    return Number.isFinite(v) ? v.toFixed(d) : "?";
  }

  function findMount() {
    return document.querySelector("[data-slpg-gauge]") ||
      document.getElementById("slpgGaugeMount") ||
      document.getElementById("slpgGauge");
  }

  function readConfig(input) {
    const src = input && typeof input === "object" ? input : {};
    const cfg = Object.assign({}, DEFAULTS, src);

    cfg.value = number(
      src.value ||
      src.currentReading ||
      src.adjustedFocalLength ||
      src.adjustedFocalLengthMm ||
      src.requiredFocalLength ||
      src.recommendedFocalLength ||
      src.lensMm,
      DEFAULTS.value
    );

    cfg.min = number(src.min, DEFAULTS.min);
    cfg.healthyMax = number(src.healthyMax || src.comfortMin || src.preferredMin, DEFAULTS.healthyMax);
    cfg.watchMax = number(src.watchMax || src.comfortMax || src.preferredMax, DEFAULTS.watchMax);
    cfg.max = number(src.max || src.riskMax, DEFAULTS.max);
    cfg.unit = String(src.unit || DEFAULTS.unit);
    cfg.title = String(src.title || DEFAULTS.title);

    if (cfg.max <= cfg.min) cfg.max = cfg.min + 1;
    cfg.healthyMax = clamp(cfg.healthyMax, cfg.min, cfg.max);
    cfg.watchMax = clamp(cfg.watchMax, cfg.healthyMax, cfg.max);
    cfg.value = clamp(cfg.value, cfg.min, cfg.max);

    return cfg;
  }

  function statusFor(value, cfg) {
    if (value <= cfg.healthyMax) return {
      key: "healthy",
      label: "Healthy",
      className: "good",
      note: "Inside preferred design range"
    };

    if (value <= cfg.watchMax) return {
      key: "watch",
      label: "Watch",
      className: "watch",
      note: "Approaching planning limit"
    };

    return {
      key: "risk",
      label: "Risk",
      className: "risk",
      note: "Outside preferred planning range"
    };
  }

  function ensureStyle() {
    if (document.getElementById("slpgGaugeStyle")) return;

    const style = document.createElement("style");
    style.id = "slpgGaugeStyle";
    style.textContent = [
      '.slpg-shell{width:100%;min-width:0;color:#f8fafc}',
      '.slpg-report{border:1px solid rgba(148,163,184,.16);border-radius:16px;background:radial-gradient(circle at 82% 8%,rgba(255,96,88,.10),transparent 28%),radial-gradient(circle at 15% 8%,rgba(125,255,152,.08),transparent 32%),linear-gradient(180deg,rgba(5,12,18,.98),rgba(2,7,10,.98));box-shadow:inset 0 1px 0 rgba(255,255,255,.055),0 20px 50px rgba(0,0,0,.28);padding:18px}',
      '.slpg-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-bottom:15px;border-bottom:1px solid rgba(148,163,184,.12)}',
      '.slpg-kicker{color:#7dff98;font:950 10px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px}',
      '.slpg-title{margin:0;color:#fff;font:950 19px/1.12 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.slpg-sub{margin-top:8px;color:rgba(226,232,240,.68);font:650 12px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:560px}',
      '.slpg-status{min-width:104px;text-align:center;border-radius:12px;padding:10px 12px;font:950 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase}',
      '.slpg-status.good{color:#7dff98;border:1px solid rgba(125,255,152,.34);background:rgba(125,255,152,.08)}',
      '.slpg-status.watch{color:#ffd34f;border:1px solid rgba(255,211,79,.34);background:rgba(255,211,79,.08)}',
      '.slpg-status.risk{color:#ff8f88;border:1px solid rgba(255,96,88,.38);background:rgba(255,96,88,.10)}',
      '.slpg-main{display:grid;grid-template-columns:1.02fr .98fr;gap:12px;margin-top:14px}',
      '.slpg-result-card,.slpg-driver{border:1px solid rgba(148,163,184,.13);border-radius:14px;background:rgba(2,6,12,.54);padding:16px}',
      '.slpg-result-label{color:rgba(203,213,225,.68);font:900 10px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.14em;text-transform:uppercase}',
      '.slpg-result-value{margin-top:9px;color:#fff;font:950 42px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.03em}',
      '.slpg-result-value span{color:rgba(203,213,225,.66);font-size:18px;letter-spacing:0}',
      '.slpg-result-note,.slpg-driver p{margin-top:10px;color:rgba(226,232,240,.70);font:650 12px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.slpg-target-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}',
      '.slpg-mini{border:1px solid rgba(148,163,184,.13);border-radius:10px;background:rgba(255,255,255,.025);padding:10px}',
      '.slpg-mini-k{color:rgba(203,213,225,.64);font:850 9px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.13em;text-transform:uppercase}',
      '.slpg-mini-v{margin-top:6px;color:#fff;font:950 14px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.slpg-mini.good .slpg-mini-v{color:#7dff98}.slpg-mini.watch .slpg-mini-v{color:#ffd34f}.slpg-mini.risk .slpg-mini-v{color:#ff8f88}',
      '.slpg-driver h4{margin:0;color:#fff;font:950 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.slpg-stack{margin-top:13px;display:grid;gap:8px}',
      '.slpg-stack-row{display:grid;grid-template-columns:122px minmax(0,1fr) 42px;gap:10px;align-items:center;color:rgba(226,232,240,.76);font:750 11px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.slpg-track{height:8px;border-radius:999px;background:rgba(148,163,184,.13);overflow:hidden}',
      '.slpg-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,rgba(125,255,152,.85),rgba(255,211,79,.85),rgba(255,96,88,.88))}',
      '.slpg-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}',
      '.slpg-action{border:1px solid rgba(125,255,152,.14);border-radius:11px;background:rgba(125,255,152,.035);padding:10px;color:rgba(226,232,240,.78);font:700 11px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.slpg-action strong{display:block;color:#7dff98;font:950 10px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px}',
      '@media(max-width:760px){.slpg-head,.slpg-main,.slpg-target-row,.slpg-actions{grid-template-columns:1fr;display:grid}}'
    ].join("\\n");
    document.head.appendChild(style);
  }

  function render(input) {
    ensureStyle();

    const mount = findMount();
    if (!mount) return null;

    const cfg = readConfig(input);
    const status = statusFor(cfg.value, cfg);
    const margin = cfg.value - cfg.watchMax;
    const marginText = margin > 0 ? "+" + fmt(margin, 1) + " " + cfg.unit : fmt(margin, 1) + " " + cfg.unit;

    mount.innerHTML = [
      '<div class="slpg-shell">',
        '<section class="slpg-report">',
          '<div class="slpg-head">',
            '<div>',
              '<div class="slpg-kicker">Results Overview</div>',
              '<h3 class="slpg-title">' + cfg.title + '</h3>',
              '<div class="slpg-sub">This module summarizes the result as a planning condition: current reading, preferred target band, dominant constraint, and the next checks needed before treating the result as design-ready.</div>',
            '</div>',
            '<div class="slpg-status ' + status.className + '">' + status.label + '</div>',
          '</div>',

          '<div class="slpg-main">',
            '<div class="slpg-result-card">',
              '<div class="slpg-result-label">Adjusted focal length</div>',
              '<div class="slpg-result-value">' + fmt(cfg.value, 1) + ' <span>' + cfg.unit + '</span></div>',
              '<div class="slpg-result-note">' + status.note + '. Preferred planning band is ' + fmt(cfg.healthyMax, 1) + '?' + fmt(cfg.watchMax, 1) + ' ' + cfg.unit + '.</div>',

              '<div class="slpg-target-row">',
                '<div class="slpg-mini good"><div class="slpg-mini-k">Target Band</div><div class="slpg-mini-v">' + fmt(cfg.healthyMax, 1) + '?' + fmt(cfg.watchMax, 1) + ' ' + cfg.unit + '</div></div>',
                '<div class="slpg-mini watch"><div class="slpg-mini-k">Margin</div><div class="slpg-mini-v">' + marginText + '</div></div>',
                '<div class="slpg-mini ' + status.className + '"><div class="slpg-mini-k">Status</div><div class="slpg-mini-v">' + status.label + '</div></div>',
              '</div>',
            '</div>',

            '<div class="slpg-driver">',
              '<div class="slpg-kicker">Dominant Driver</div>',
              '<h4>Focal demand is limiting layout flexibility.</h4>',
              '<p>The combination of distance, target width, and sensor size pushes the scene toward a long-range lens class.</p>',

              '<div class="slpg-stack">',
                '<div class="slpg-stack-row"><span>Distance geometry</span><div class="slpg-track"><div class="slpg-fill" style="width:82%"></div></div><strong>82%</strong></div>',
                '<div class="slpg-stack-row"><span>Target width</span><div class="slpg-track"><div class="slpg-fill" style="width:74%"></div></div><strong>74%</strong></div>',
                '<div class="slpg-stack-row"><span>Detail requirement</span><div class="slpg-track"><div class="slpg-fill" style="width:66%"></div></div><strong>66%</strong></div>',
              '</div>',
            '</div>',
          '</div>',

          '<div class="slpg-actions">',
            '<div class="slpg-action"><strong>Reduce demand</strong>Move the camera closer or widen the acceptable target area.</div>',
            '<div class="slpg-action"><strong>Change optics</strong>Evaluate a larger sensor format or different lens class.</div>',
            '<div class="slpg-action"><strong>Validate field</strong>Confirm field of view and detail requirement before final design.</div>',
          '</div>',
        '</section>',
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { render(DEFAULTS); });
  } else {
    render(DEFAULTS);
  }
})();
