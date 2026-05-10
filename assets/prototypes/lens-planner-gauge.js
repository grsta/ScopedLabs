(function () {"use strict";

const SVG_NS = "http://www.w3.org/2000/svg";

const DEFAULTS = {value: 25.6,min: 0,healthyMax: 8,watchMax: 18,max: 40,unit: "mm",title: "Lens Selection Pressure"};

let lastConfig = Object.assign({}, DEFAULTS);let refreshTimer = null;

function $(id) {return document.getElementById(id);}

function clamp(n, min, max) {if (!Number.isFinite(n)) return min;return Math.max(min, Math.min(max, n));}

function firstFinite() {for (let i = 0; i < arguments.length; i += 1) {const n = toNumber(arguments[i]);if (Number.isFinite(n)) return n;}return NaN;}

function toNumber(value) {if (typeof value === "number") return Number.isFinite(value) ? value : NaN;if (typeof value === "string") {const match = value.replace(/,/g, "").match(/-?\d+(.\d+)?/);return match ? Number(match[0]) : NaN;}return NaN;}

function fmt(value, digits) {if (!Number.isFinite(value)) return "—";return value.toFixed(digits);}

function ensureStyle() {if ($("slpgGaugeStyle")) return;

const style = document.createElement("style");
style.id = "slpgGaugeStyle";
style.textContent = `
  .slpg-gauge-shell {
    width: 100%;
    min-width: 0;
    color: #f8fafc;
  }

  .slpg-gauge-frame {
    width: 100%;
    min-width: 0;
    border: 1px solid rgba(148, 163, 184, .18);
    border-radius: 12px;
    background:
      radial-gradient(circle at 50% 78%, rgba(148, 163, 184, .13), transparent 38%),
      radial-gradient(circle at 30% 22%, rgba(132, 204, 22, .08), transparent 34%),
      radial-gradient(circle at 75% 30%, rgba(239, 68, 68, .10), transparent 34%),
      linear-gradient(180deg, rgba(2, 6, 12, .98), rgba(5, 12, 18, .98));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .05),
      inset 0 -24px 80px rgba(0, 0, 0, .45),
      0 20px 50px rgba(0, 0, 0, .28);
    overflow: hidden;
  }

  .slpg-gauge-svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .slpg-title {
    font: 700 16px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: .08em;
    fill: rgba(248, 250, 252, .9);
    text-transform: uppercase;
  }

  .slpg-subtitle {
    font: 500 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    fill: rgba(203, 213, 225, .72);
  }

  .slpg-zone-title {
    font: 800 15px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: .08em;
  }

  .slpg-zone-range {
    font: 600 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    fill: rgba(248, 250, 252, .74);
  }

  .slpg-tick-label {
    font: 700 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    fill: rgba(248, 250, 252, .86);
  }

  .slpg-callout {
    fill: rgba(4, 9, 15, .96);
    stroke-width: 2;
    filter: drop-shadow(0 0 18px rgba(0, 0, 0, .55));
  }

  .slpg-reading {
    font: 900 28px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    fill: #f8fafc;
    letter-spacing: .02em;
  }

  .slpg-small {
    font: 800 10px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    fill: rgba(203, 213, 225, .78);
    letter-spacing: .12em;
  }

  .slpg-meta-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    padding: 0 12px 12px;
    margin-top: -6px;
  }

  .slpg-meta-card {
    min-width: 0;
    border: 1px solid rgba(148, 163, 184, .17);
    border-radius: 8px;
    background: rgba(2, 6, 12, .72);
    padding: 10px 12px;
  }

  .slpg-meta-label {
    display: block;
    font: 800 10px/1.1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: rgba(203, 213, 225, .72);
    margin-bottom: 6px;
  }

  .slpg-meta-value {
    display: block;
    font: 900 16px/1.1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #f8fafc;
  }

  .slpg-meta-note {
    display: block;
    margin-top: 3px;
    font: 700 10px/1.1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: rgba(203, 213, 225, .62);
  }

  .slpg-status-healthy { color: #7ddc39; }
  .slpg-status-watch { color: #facc15; }
  .slpg-status-risk { color: #fb3d3d; }

  @media (max-width: 760px) {
    .slpg-meta-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;
document.head.appendChild(style);

}

function findMount() {return (document.querySelector("[data-slpg-gauge]") ||$("slpgGaugeMount") ||$("slpgGauge") ||$("lensGauge") ||$("lens-gauge"));}

function ensureGaugeShell() {if ($("slpgBaseArc") && $("slpgHealthyArc") && $("slpgWatchArc") && $("slpgRiskArc")) {return true;}

const mount = findMount();
if (!mount) return false;

mount.innerHTML = `
  <div class="slpg-gauge-shell">
    <div class="slpg-gauge-frame">
      <svg class="slpg-gauge-svg" viewBox="0 0 1000 560" role="img" aria-label="Lens selection pressure gauge">
        <defs>
          <linearGradient id="slpgHealthyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#2f9e12"/>
            <stop offset="45%" stop-color="#69d52f"/>
            <stop offset="100%" stop-color="#9bea4c"/>
          </linearGradient>

          <linearGradient id="slpgWatchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#a98205"/>
            <stop offset="45%" stop-color="#e4c30b"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>

          <linearGradient id="slpgRiskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8f1d1d"/>
            <stop offset="45%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#f24b4b"/>
          </linearGradient>

          <linearGradient id="slpgNeedleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f8fafc"/>
            <stop offset="55%" stop-color="#cbd5e1"/>
            <stop offset="100%" stop-color="#64748b"/>
          </linearGradient>

          <filter id="slpgArcGlow" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="7" result="blur"/>
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .8 0"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="slpgSoftShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000000" flood-opacity=".5"/>
          </filter>
        </defs>

        <rect x="1" y="1" width="998" height="558" rx="12" fill="transparent"/>

        <text x="36" y="46" class="slpg-title" id="slpgGaugeTitle">Lens Selection Pressure</text>
        <text x="36" y="72" class="slpg-subtitle" id="slpgGaugeSubtitle">Current planning reading</text>

        <path id="slpgBaseArc" fill="none" stroke="rgba(15,23,42,.92)" stroke-width="92" stroke-linecap="round"/>
        <path id="slpgHealthyArc" fill="none" stroke="url(#slpgHealthyGrad)" stroke-width="78" stroke-linecap="butt" filter="url(#slpgArcGlow)"/>
        <path id="slpgWatchArc" fill="none" stroke="url(#slpgWatchGrad)" stroke-width="78" stroke-linecap="butt" filter="url(#slpgArcGlow)"/>
        <path id="slpgRiskArc" fill="none" stroke="url(#slpgRiskGrad)" stroke-width="78" stroke-linecap="butt" filter="url(#slpgArcGlow)"/>
        <path id="slpgInnerRim" fill="none" stroke="rgba(248,250,252,.13)" stroke-width="2"/>

        <g id="slpgZoneLabels"></g>
        <g id="slpgTicks"></g>
        <g id="slpgNeedle"></g>
        <g id="slpgCallout"></g>
      </svg>

      <div class="slpg-meta-grid">
        <div class="slpg-meta-card">
          <span class="slpg-meta-label">Comfort Band</span>
          <span class="slpg-meta-value slpg-status-healthy" id="slpgComfortBand">8.0 – 18.0 mm</span>
          <span class="slpg-meta-note">Preferred planning range</span>
        </div>
        <div class="slpg-meta-card">
          <span class="slpg-meta-label">Current Reading</span>
          <span class="slpg-meta-value" id="slpgCurrentReading">25.6 mm</span>
          <span class="slpg-meta-note" id="slpgCurrentReadingNote">Lens selection pressure</span>
        </div>
        <div class="slpg-meta-card">
          <span class="slpg-meta-label">Margin to Healthy</span>
          <span class="slpg-meta-value slpg-status-watch" id="slpgMarginToHealthy">+7.6 mm</span>
          <span class="slpg-meta-note" id="slpgMarginNote">Above comfort band</span>
        </div>
        <div class="slpg-meta-card">
          <span class="slpg-meta-label">Status</span>
          <span class="slpg-meta-value slpg-status-risk" id="slpgStatusValue">Risk</span>
          <span class="slpg-meta-note" id="slpgStatusNote">Outside preferred range</span>
        </div>
      </div>
    </div>
  </div>
`;

return true;

}

function valueToAngle(value, cfg) {const pct = (clamp(value, cfg.min, cfg.max) - cfg.min) / (cfg.max - cfg.min);return 180 - pct * 180;}

function polarToCartesian(angleDeg, radius, cx, cy) {const angleRad = (angleDeg * Math.PI) / 180;return {x: cx + radius * Math.cos(angleRad),y: cy - radius * Math.sin(angleRad)};}

function describeArc(startAngle, endAngle, radius, cx, cy) {const start = polarToCartesian(startAngle, radius, cx, cy);const end = polarToCartesian(endAngle, radius, cx, cy);const largeArcFlag = Math.abs(startAngle - endAngle) > 180 ? "1" : "0";

return [
  "M", start.x, start.y,
  "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
].join(" ");

}

function svgEl(tag, attrs) {const el = document.createElementNS(SVG_NS, tag);Object.keys(attrs || {}).forEach((key) => {el.setAttribute(key, attrs[key]);});return el;}

function clear(el) {if (el) el.innerHTML = "";}

function statusForValue(value, cfg) {if (value <= cfg.healthyMax) {return {key: "healthy",label: "Healthy",color: "#7ddc39",stroke: "#7ddc39",note: "Inside healthy range"};}

if (value <= cfg.watchMax) {
  return {
    key: "watch",
    label: "Watch",
    color: "#facc15",
    stroke: "#facc15",
    note: "Inside watch range"
  };
}

return {
  key: "risk",
  label: "Risk",
  color: "#fb3d3d",
  stroke: "#fb3d3d",
  note: "Outside preferred range"
};

}

function normalizeConfig(input) {const source = input && typeof input === "object" ? input : {};const fromDom = readDomConfig();const fromSession = readSessionConfig();

const cfg = Object.assign({}, DEFAULTS, fromSession, fromDom, source);

cfg.value = firstFinite(
  typeof input === "number" ? input : NaN,
  source.value,
  source.currentReading,
  source.reading,
  source.lensSelectionPressure,
  source.lensPressure,
  source.lensPressureMm,
  source.adjustedLensMm,
  source.adjustedFocalLength,
  source.adjustedFocalLengthMm,
  source.requiredFocalLength,
  source.requiredFocalLengthMm,
  source.recommendedFocalLength,
  source.recommendedFocalLengthMm,
  source.recommendedLens,
  source.recommendedLensMm,
  source.focalLength,
  source.focalLengthMm,
  source.lensMm,
  fromDom.value,
  fromSession.value,
  findNumericByLabel(source, [/lens/i, /focal/i, /current reading/i, /pressure/i]),
  DEFAULTS.value
);

cfg.min = firstFinite(source.min, source.minimum, fromDom.min, fromSession.min, DEFAULTS.min);
cfg.healthyMax = firstFinite(
  source.healthyMax,
  source.comfortMin,
  source.preferredMin,
  fromDom.healthyMax,
  fromSession.healthyMax,
  DEFAULTS.healthyMax
);
cfg.watchMax = firstFinite(
  source.watchMax,
  source.comfortMax,
  source.preferredMax,
  fromDom.watchMax,
  fromSession.watchMax,
  DEFAULTS.watchMax
);
cfg.max = firstFinite(source.max, source.maximum, source.riskMax, fromDom.max, fromSession.max, DEFAULTS.max);

cfg.unit = String(source.unit || fromDom.unit || fromSession.unit || DEFAULTS.unit);
cfg.title = String(source.title || fromDom.title || fromSession.title || DEFAULTS.title);

if (cfg.max <= cfg.min) cfg.max = cfg.min + 1;
cfg.healthyMax = clamp(cfg.healthyMax, cfg.min, cfg.max);
cfg.watchMax = clamp(cfg.watchMax, cfg.healthyMax, cfg.max);
cfg.value = clamp(cfg.value, cfg.min, cfg.max);

return cfg;

}

function readField(selectors) {for (let i = 0; i < selectors.length; i += 1) {const el = document.querySelector(selectors[i]);if (!el) continue;

  if ("value" in el) {
    const n = toNumber(el.value);
    if (Number.isFinite(n)) return n;
  }

  const n = toNumber(el.textContent);
  if (Number.isFinite(n)) return n;
}

return NaN;

}

function readText(selectors) {for (let i = 0; i < selectors.length; i += 1) {const el = document.querySelector(selectors[i]);if (!el) continue;

  const value = "value" in el ? el.value : el.textContent;
  if (String(value || "").trim()) return String(value).trim();
}

return "";

}

function readDomConfig() {const directValue = readField(["#lensSelectionPressure","#lensPressure","#lensPressureMm","#adjustedLensMm","#adjustedFocalLength","#adjustedFocalLengthMm","#requiredFocalLength","#requiredFocalLengthMm","#recommendedFocalLength","#recommendedFocalLengthMm","#recommendedLens","#recommendedLensMm","#focalLength","#focalLengthMm","#lensMm","[name='lensSelectionPressure']","[name='lensPressure']","[name='adjustedLensMm']","[name='adjustedFocalLength']","[name='requiredFocalLength']","[name='recommendedFocalLength']","[name='recommendedLensMm']","[name='focalLength']","[data-gauge-value]"]);

return {
  value: directValue,
  min: readField(["#slpgMin", "[name='slpgMin']", "[data-gauge-min]"]),
  healthyMax: readField(["#slpgHealthyMax", "[name='slpgHealthyMax']", "[data-gauge-healthy-max]"]),
  watchMax: readField(["#slpgWatchMax", "[name='slpgWatchMax']", "[data-gauge-watch-max]"]),
  max: readField(["#slpgMax", "[name='slpgMax']", "[data-gauge-max]"]),
  unit: readText(["#slpgUnit", "[name='slpgUnit']", "[data-gauge-unit]"]),
  title: readText(["#slpgTitle", "[name='slpgTitle']", "[data-gauge-title]"])
};

}

function readSessionConfig() {try {const preferredKeys = ["lens-selection-helper","lensSelectionHelper","lens-selection","lensSelection","camera-lens","cameraLens","lens-planner","lensPlanner"];

  for (let i = 0; i < preferredKeys.length; i += 1) {
    const raw = sessionStorage.getItem(preferredKeys[i]);
    if (!raw) continue;

    const parsed = JSON.parse(raw);
    const cfg = configFromObject(parsed);
    if (Number.isFinite(cfg.value)) return cfg;
  }

  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!/lens|camera|planner|ScopedLabs/i.test(key || "")) continue;

    const raw = sessionStorage.getItem(key);
    if (!raw || raw.charAt(0) !== "{" && raw.charAt(0) !== "[") continue;

    const parsed = JSON.parse(raw);
    const cfg = configFromObject(parsed);
    if (Number.isFinite(cfg.value)) return cfg;
  }
} catch {}

return {};

}

function configFromObject(obj) {if (!obj || typeof obj !== "object") return {};

return {
  value: firstFinite(
    obj.value,
    obj.currentReading,
    obj.reading,
    obj.lensSelectionPressure,
    obj.lensPressure,
    obj.lensPressureMm,
    obj.adjustedLensMm,
    obj.adjustedFocalLength,
    obj.adjustedFocalLengthMm,
    obj.requiredFocalLength,
    obj.requiredFocalLengthMm,
    obj.recommendedFocalLength,
    obj.recommendedFocalLengthMm,
    obj.recommendedLens,
    obj.recommendedLensMm,
    obj.focalLength,
    obj.focalLengthMm,
    obj.lensMm,
    findNumericByLabel(obj, [/lens/i, /focal/i, /current reading/i, /pressure/i])
  ),
  min: firstFinite(obj.min, obj.minimum),
  healthyMax: firstFinite(obj.healthyMax, obj.comfortMin, obj.preferredMin),
  watchMax: firstFinite(obj.watchMax, obj.comfortMax, obj.preferredMax),
  max: firstFinite(obj.max, obj.maximum, obj.riskMax),
  unit: obj.unit,
  title: obj.title
};

}

function findNumericByLabel(source, labelTests) {const seen = new WeakSet();

function scan(value, depth) {
  if (!value || depth > 5) return NaN;

  if (typeof value !== "object") return NaN;

  if (seen.has(value)) return NaN;
  seen.add(value);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const n = scan(value[i], depth + 1);
      if (Number.isFinite(n)) return n;
    }
    return NaN;
  }

  const label = String(value.label || value.name || value.title || "").trim();
  if (label && labelTests.some((test) => test.test(label))) {
    const n = firstFinite(value.value, value.displayValue, value.reading, value.result);
    if (Number.isFinite(n)) return n;
  }

  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const n = scan(value[keys[i]], depth + 1);
    if (Number.isFinite(n)) return n;
  }

  return NaN;
}

return scan(source, 0);

}

function drawZoneLabels(cfg, cx, cy) {const group = $("slpgZoneLabels");clear(group);if (!group) return;

const zones = [
  {
    title: "HEALTHY",
    range: `${fmt(cfg.min, 0)} – ${fmt(cfg.healthyMax, 0)} ${cfg.unit}`,
    from: cfg.min,
    to: cfg.healthyMax,
    color: "#9bea4c"
  },
  {
    title: "WATCH",
    range: `${fmt(cfg.healthyMax, 0)} – ${fmt(cfg.watchMax, 0)} ${cfg.unit}`,
    from: cfg.healthyMax,
    to: cfg.watchMax,
    color: "#facc15"
  },
  {
    title: "RISK",
    range: `> ${fmt(cfg.watchMax, 0)} ${cfg.unit}`,
    from: cfg.watchMax,
    to: cfg.max,
    color: "#fb3d3d"
  }
];

zones.forEach((zone) => {
  const mid = (zone.from + zone.to) / 2;
  const angle = valueToAngle(mid, cfg);
  const point = polarToCartesian(angle, 222, cx, cy);

  const title = svgEl("text", {
    x: point.x,
    y: point.y,
    "text-anchor": "middle",
    class: "slpg-zone-title",
    fill: zone.color
  });
  title.textContent = zone.title;
  group.appendChild(title);

  const range = svgEl("text", {
    x: point.x,
    y: point.y + 24,
    "text-anchor": "middle",
    class: "slpg-zone-range"
  });
  range.textContent = zone.range;
  group.appendChild(range);
});

}

function drawTicks(cfg, cx, cy) {const ticks = $("slpgTicks");clear(ticks);if (!ticks) return;

const tickValues = [
  { value: cfg.min, label: `${fmt(cfg.min, 0)} ${cfg.unit}` },
  { value: cfg.healthyMax, label: `${fmt(cfg.healthyMax, 0)} ${cfg.unit}` },
  { value: cfg.watchMax, label: `${fmt(cfg.watchMax, 0)} ${cfg.unit}` },
  { value: cfg.max, label: `${fmt(cfg.max, 0)} ${cfg.unit}` }
];

tickValues.forEach((tick) => {
  const angle = valueToAngle(tick.value, cfg);
  const p1 = polarToCartesian(angle, 294, cx, cy);
  const p2 = polarToCartesian(angle, 338, cx, cy);
  const label = polarToCartesian(angle, 384, cx, cy);

  ticks.appendChild(svgEl("line", {
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    stroke: "rgba(248,250,252,.72)",
    "stroke-width": "2"
  }));

  const text = svgEl("text", {
    x: label.x,
    y: label.y + 8,
    "text-anchor": "middle",
    class: "slpg-tick-label"
  });
  text.textContent = tick.label;
  ticks.appendChild(text);
});

}

function drawNeedle(cfg, cx, cy, valueAngle, status) {const needle = $("slpgNeedle");clear(needle);if (!needle) return;

const pivot = polarToCartesian(valueAngle, 185, cx, cy);
const tip = polarToCartesian(valueAngle, 330, cx, cy);
const angleRad = (valueAngle * Math.PI) / 180;
const perp = angleRad + Math.PI / 2;
const width = 9;

const baseLeft = {
  x: pivot.x + Math.cos(perp) * width,
  y: pivot.y - Math.sin(perp) * width
};

const baseRight = {
  x: pivot.x - Math.cos(perp) * width,
  y: pivot.y + Math.sin(perp) * width
};

needle.appendChild(svgEl("path", {
  d: `M ${baseLeft.x} ${baseLeft.y} L ${tip.x} ${tip.y} L ${baseRight.x} ${baseRight.y} Z`,
  fill: "url(#slpgNeedleGrad)",
  stroke: "rgba(255,255,255,.75)",
  "stroke-width": "1",
  filter: "url(#slpgSoftShadow)"
}));

needle.appendChild(svgEl("circle", {
  cx: pivot.x,
  cy: pivot.y,
  r: "18",
  fill: "#e5e7eb",
  stroke: "rgba(255,255,255,.9)",
  "stroke-width": "3"
}));

needle.appendChild(svgEl("circle", {
  cx: pivot.x,
  cy: pivot.y,
  r: "7",
  fill: "#cbd5e1"
}));

needle.appendChild(svgEl("circle", {
  cx: tip.x,
  cy: tip.y,
  r: "6",
  fill: status.stroke
}));

}

function drawCallout(cfg, cx, cy, valueAngle, status) {const callout = $("slpgCallout");clear(callout);if (!callout) return;

const dot = polarToCartesian(valueAngle, 350, cx, cy);
const boxX = clamp(dot.x + 36, 610, 755);
const boxY = clamp(dot.y - 96, 58, 318);

callout.appendChild(svgEl("path", {
  d: `M ${dot.x} ${dot.y} L ${boxX} ${boxY + 58}`,
  stroke: status.stroke,
  "stroke-width": "2",
  fill: "none"
}));

callout.appendChild(svgEl("circle", {
  cx: dot.x,
  cy: dot.y,
  r: "12",
  fill: "#f8fafc",
  stroke: status.stroke,
  "stroke-width": "6",
  filter: `drop-shadow(0 0 10px ${status.stroke})`
}));

callout.appendChild(svgEl("rect", {
  x: boxX,
  y: boxY,
  width: "205",
  height: "92",
  rx: "16",
  class: "slpg-callout",
  stroke: status.stroke
}));

const reading = svgEl("text", {
  x: boxX + 24,
  y: boxY + 43,
  class: "slpg-reading"
});
reading.textContent = `${fmt(cfg.value, 1)} ${cfg.unit}`;
callout.appendChild(reading);

const small = svgEl("text", {
  x: boxX + 24,
  y: boxY + 72,
  class: "slpg-small"
});
small.textContent = "CURRENT READING";
callout.appendChild(small);

}

function setText(id, value) {const el = $(id);if (el) el.textContent = value;}

function setStatusClass(id, statusKey) {const el = $(id);if (!el) return;

el.classList.remove("slpg-status-healthy", "slpg-status-watch", "slpg-status-risk");
el.classList.add(`slpg-status-${statusKey}`);

}

function renderMeta(cfg, status) {const margin = cfg.value - cfg.watchMax;const marginText = margin > 0 ? `+${fmt(margin, 1)} ${cfg.unit}` : `${fmt(margin, 1)} ${cfg.unit}`;const marginNote = margin > 0 ? "Above comfort band" : "Inside comfort band";

setText("slpgComfortBand", `${fmt(cfg.healthyMax, 1)} – ${fmt(cfg.watchMax, 1)} ${cfg.unit}`);
setText("slpgCurrentReading", `${fmt(cfg.value, 1)} ${cfg.unit}`);
setText("slpgMarginToHealthy", marginText);
setText("slpgMarginNote", marginNote);
setText("slpgStatusValue", status.label);
setText("slpgStatusNote", status.note);
setText("slpgGaugeTitle", cfg.title);
setText("slpgGaugeSubtitle", "Current planning reading");

setStatusClass("slpgStatusValue", status.key);
setStatusClass("slpgMarginToHealthy", margin > 0 ? "watch" : "healthy");

}

function renderScopedLensPlannerGauge(input) {ensureStyle();

if (!ensureGaugeShell()) return null;

const cfg = normalizeConfig(input);
const status = statusForValue(cfg.value, cfg);
const cx = 500;
const cy = 430;
const r = 350;

const minAngle = valueToAngle(cfg.min, cfg);
const healthyAngle = valueToAngle(cfg.healthyMax, cfg);
const watchAngle = valueToAngle(cfg.watchMax, cfg);
const maxAngle = valueToAngle(cfg.max, cfg);
const valueAngle = valueToAngle(cfg.value, cfg);

$("slpgBaseArc").setAttribute("d", describeArc(180, 0, r, cx, cy));
$("slpgHealthyArc").setAttribute("d", describeArc(minAngle, healthyAngle, r, cx, cy));
$("slpgWatchArc").setAttribute("d", describeArc(healthyAngle, watchAngle, r, cx, cy));
$("slpgRiskArc").setAttribute("d", describeArc(watchAngle, maxAngle, r, cx, cy));
$("slpgInnerRim").setAttribute("d", describeArc(180, 0, 306, cx, cy));

drawZoneLabels(cfg, cx, cy);
drawTicks(cfg, cx, cy);
drawNeedle(cfg, cx, cy, valueAngle, status);
drawCallout(cfg, cx, cy, valueAngle, status);
renderMeta(cfg, status);

lastConfig = cfg;
return cfg;

}

function scheduleRefresh(input) {clearTimeout(refreshTimer);refreshTimer = setTimeout(() => {renderScopedLensPlannerGauge(input || readDomConfig());}, 60);}

function patchScopedLabsAnalyzer() {const analyzer = window.ScopedLabsAnalyzer;if (!analyzer || analyzer.__slpgGaugePatched) return;

["renderOutput", "writeFlow"].forEach((method) => {
  if (typeof analyzer[method] !== "function") return;

  const original = analyzer[method];
  analyzer[method] = function () {
    const result = original.apply(this, arguments);
    const payload = arguments[0];

    setTimeout(() => {
      const cfg = configFromObject(payload);
      if (Number.isFinite(cfg.value)) {
        renderScopedLensPlannerGauge(cfg);
      } else {
        scheduleRefresh();
      }
    }, 0);

    return result;
  };
});

analyzer.__slpgGaugePatched = true;

}

function bindAutoRefresh() {document.addEventListener("input", () => scheduleRefresh());document.addEventListener("change", () => scheduleRefresh());

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!target) return;

  if (
    target.matches("#calc, #calculate, #run, [data-calc], [data-calculate]") ||
    target.closest("#calc, #calculate, #run, [data-calc], [data-calculate]")
  ) {
    scheduleRefresh();
  }
});

window.addEventListener("slpg:gauge:update", (event) => {
  renderScopedLensPlannerGauge(event.detail || {});
});

window.addEventListener("scopedlabs:gauge:update", (event) => {
  renderScopedLensPlannerGauge(event.detail || {});
});

}

window.renderScopedLensPlannerGauge = renderScopedLensPlannerGauge;window.renderScopedLensPlannerGaugeFromTool = renderScopedLensPlannerGauge;window.ScopedLabsLensPlannerGauge = {render: renderScopedLensPlannerGauge,update: renderScopedLensPlannerGauge,refresh: function () {return renderScopedLensPlannerGauge(readDomConfig());},getState: function () {return Object.assign({}, lastConfig);}};

function init() {ensureStyle();renderScopedLensPlannerGauge(readDomConfig());bindAutoRefresh();patchScopedLabsAnalyzer();}

if (document.readyState === "loading") {document.addEventListener("DOMContentLoaded", init);} else {init();}})();