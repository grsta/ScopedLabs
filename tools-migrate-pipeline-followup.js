#!/usr/bin/env node
/**
 * ScopedLabs pipeline follow-up migrator
 *
 * Goal:
 * - target report items with mode === "pipeline"
 * - fix repeated follow-up issues only
 * - create .bak backups before first modification
 *
 * Usage:
 *   node .\tools-migrate-pipeline-followup.js
 *   node .\tools-migrate-pipeline-followup.js E:\ScopedLabs
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || process.cwd());
const REPORT_PATH = path.join(ROOT, "tools-audit-report.json");

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function writeText(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function ensureBackup(file) {
  const bak = `${file}.bak`;
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(file, bak);
  }
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function has(text, pattern) {
  if (pattern instanceof RegExp) return pattern.test(text);
  return text.includes(pattern);
}

function loadReport() {
  const raw = readText(REPORT_PATH);
  if (!raw) {
    throw new Error(`Could not read report: ${REPORT_PATH}`);
  }
  return JSON.parse(raw);
}

function relToCategory(file, category) {
  return `/tools/${category}/`;
}

function inferNextHrefFromCategory(category, step) {
  const lanes = {
    "physical-security": [
      "scene-illumination",
      "mounting-height",
      "field-of-view",
      "camera-coverage-area",
      "camera-spacing",
      "blind-spot-check",
      "pixel-density",
      "lens-selection",
      "face-recognition-range",
      "license-plate-range"
    ],
    "power": [
      "va-watts-amps",
      "load-growth",
      "ups-runtime",
      "battery-bank-sizer"
    ],
    "network": [
      "poe-budget",
      "bandwidth",
      "oversubscription",
      "latency"
    ],
    "video-storage": [
      "bitrate",
      "storage",
      "retention",
      "raid",
      "survivability"
    ],
    "compute": [
      "cpu-sizing",
      "ram-sizing",
      "storage-iops",
      "storage-throughput",
      "vm-density",
      "gpu-vram",
      "power-thermal",
      "raid-rebuild-time",
      "backup-window",
      "nic-bonding"
    ],
    "thermal": [
      "heat-load-estimator",
      "btu-converter",
      "airflow-requirement",
      "fan-cfm-sizing",
      "ambient-rise",
      "exhaust-temperature",
      "room-cooling-capacity",
      "rack-thermal-density",
      "hot-cold-aisle",
      "psu-efficiency-heat"
    ],
    "wireless": [
      "channel-overlap",
      "coverage-radius",
      "client-density",
      "ap-capacity",
      "mesh-backhaul",
      "noise-floor-margin",
      "link-budget",
      "ptp-wireless-link",
      "roaming-thresholds"
    ],
    "infrastructure": [
      "rack-ru-planner",
      "rack-weight-load",
      "floor-load-rating",
      "equipment-spacing",
      "room-square-footage",
      "ups-room-sizing",
      "generator-runtime"
    ],
    "performance": [
      "cache-hit-ratio",
      "headroom-target",
      "queue-depth",
      "cpu-utilization-impact",
      "disk-saturation",
      "network-congestion",
      "latency-vs-throughput",
      "concurrency-scaling",
      "response-time-sla",
      "bottleneck-analyzer"
    ],
    "access-control": [
      "reader-type-selector",
      "fail-safe-fail-secure",
      "lock-power-budget",
      "panel-capacity",
      "access-level-sizing"
    ]
  };

  const lane = lanes[category] || [];
  const idx = lane.indexOf(step);
  if (idx === -1) return null;
  if (idx === lane.length - 1) return null;
  return `/tools/${category}/${lane[idx + 1]}/`;
}

function ensureResults(html) {
  if (has(html, /id=["']results["']/i)) return html;

  const analysisMatch = html.match(/<div[^>]*id=["']analysis-copy["'][^>]*>/i);
  if (analysisMatch) {
    return html.slice(0, analysisMatch.index) +
      `<div id="results" class="results-grid" aria-live="polite">
            <div class="muted">Enter values and press Calculate.</div>
          </div>
          ` +
      html.slice(analysisMatch.index);
  }

  const calcBtn = html.match(/id=["']calc["']/i);
  if (calcBtn) {
    return html.slice(0, calcBtn.index) +
      `<div id="results" class="results-grid" aria-live="polite">
            <div class="muted">Enter values and press Calculate.</div>
          </div>
          ` +
      html.slice(calcBtn.index);
  }

  return html;
}

function ensurePipeline(html) {
  if (has(html, /id=["']pipeline["']/i)) return html;
  const h1 = html.match(/<\/h1>/i);
  if (!h1) return html;
  const idx = h1.index + h1[0].length;
  return html.slice(0, idx) + `

      <div id="pipeline"></div>` + html.slice(idx);
}

function ensureDesignFlowCard(html, title) {
  if (has(html, /Part of a Design Flow/i)) return html;

  const subhead = html.match(/<p[^>]*class=["'][^"']*subhead[^"']*["'][^>]*>[\s\S]*?<\/p>/i);
  const card = `
      <section class="card" style="margin-top: 18px; border-color: rgba(120,255,120,0.18);">
        <div class="pill pill--free" style="margin-bottom: 10px; width: fit-content;">Part of a Design Flow</div>
        <h2 class="h3" style="margin-top: 0;">This tool continues the design flow</h2>
        <p class="muted" style="margin-bottom: 0;">
          Review and customize this explainer so it reflects how ${title} fits into the category pipeline.
        </p>
      </section>
`;

  if (!subhead) return html;
  const idx = subhead.index;
  return html.slice(0, idx) + card + html.slice(idx);
}

function ensureBreadcrumbs(html, category, title) {
  if (has(html, /class=["'][^"']*crumbs/i)) return html;

  const mainContainer = html.match(/<main[\s\S]*?<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>/i);
  if (!mainContainer) return html;
  const idx = mainContainer.index + mainContainer[0].length;

  const crumbs = `

      <div class="crumbs">
        <a href="/tools/">Tools</a>
        <span class="sep">/</span>
        <a href="/tools/${category}/">${category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</a>
        <span class="sep">/</span>
        <span>${title}</span>
      </div>
`;

  return html.slice(0, idx) + crumbs + html.slice(idx);
}

function ensureNextStepRowAndContinue(html, category, step) {
  const nextHref = inferNextHrefFromCategory(category, step);

  let out = html;

  if (!has(out, /id=["']continue["']/i) && nextHref) {
    const anchor = `
          <a id="continue" class="btn btn-primary" href="${nextHref}">
            Continue →
          </a>
`;
    if (has(out, /<\/section>\s*<footer/i)) {
      out = out.replace(/<\/section>\s*(<footer)/i, `
        <div id="next-step-row" class="btn-row" style="margin-top: 12px; display:none;">
${anchor}        </div>

      </section>
      $1`);
    } else if (has(out, /<\/section>/i)) {
      out = out.replace(/<\/section>(?![\s\S]*<\/section>)/i, `
        <div id="next-step-row" class="btn-row" style="margin-top: 12px; display:none;">
${anchor}        </div>
      </section>`);
    }
  }

  if (has(out, /id=["']continue["']/i) && !has(out, /id=["']next-step-row["']/i)) {
    out = out.replace(
      /(<a[^>]*id=["']continue["'][\s\S]*?<\/a>)/i,
      `<div id="next-step-row" class="btn-row" style="margin-top: 12px; display:none;">
$1
        </div>`
    );
  }

  return out;
}

function fixSharedScriptOrder(html) {
  const bodyEnd = html.lastIndexOf("</body>");
  if (bodyEnd === -1) return html;

  const scriptMatches = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)];
  const relevant = scriptMatches.filter(m =>
    m[1].includes("/assets/tool-flow.js") ||
    m[1].includes("/assets/catalog.js") ||
    m[1].includes("/assets/pipelines.js") ||
    m[1].includes("/assets/pipeline-state.js") ||
    m[1].includes("/assets/pipeline.js") ||
    m[1].includes("/assets/analyzer.js") ||
    m[1].includes("script.js")
  );

  if (!relevant.length) return html;

  const firstIdx = relevant[0].index;
  const lastMatch = relevant[relevant.length - 1];
  const lastIdx = lastMatch.index + lastMatch[0].length;

  const localScript = relevant.find(m => /script\.js/.test(m[1]) && !m[1].includes("/assets/"));
  const localTag = localScript ? localScript[0] : null;

  const ordered = [
    `<script src="/assets/tool-flow.js?v=pipeline-followup-001"></script>`,
    `<script src="/assets/catalog.js?v=pipeline-followup-001"></script>`,
    `<script src="/assets/pipelines.js?v=pipeline-followup-001"></script>`,
    `<script src="/assets/pipeline-state.js?v=pipeline-followup-001"></script>`,
    `<script src="/assets/pipeline.js?v=pipeline-followup-001"></script>`,
    `<script src="/assets/analyzer.js?v=pipeline-followup-001"></script>`
  ];

  if (localTag) ordered.push(localTag.trim());

  const rebuilt = "\n  " + ordered.join("\n  ") + "\n";

  return html.slice(0, firstIdx) + rebuilt + html.slice(lastIdx);
}

function ensureJsConst(js, name, value) {
  if (has(js, new RegExp(`const\\s+${name}\\s*=`))) return js;
  return `const ${name} = "${value}";\n` + js;
}

function ensureDomContentLoadedInit(js) {
  if (has(js, /window\.addEventListener\(["']DOMContentLoaded["']/)) return js;
  return js + `

window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});
`;
}

function ensureInvalidate(js) {
  if (has(js, "ScopedLabsAnalyzer.invalidate")) return js;
  return js + `

function invalidate() {
  ScopedLabsAnalyzer.invalidate({
    resultsEl: els.results,
    analysisEl: els.analysis,
    continueWrapEl: els.continueWrap,
    continueBtnEl: els.continueBtn,
    flowKey: FLOW_KEYS[STEP] || "",
    category: CATEGORY,
    step: STEP,
    lane: LANE,
    emptyMessage: "Enter values and press Calculate."
  });
}
`;
}

function ensureRenderOutput(js) {
  if (has(js, "ScopedLabsAnalyzer.renderOutput")) return js;
  return js + `

function renderSuccess(data) {
  ScopedLabsAnalyzer.renderOutput({
    resultsEl: els.results,
    analysisEl: els.analysis,
    summaryRows: [],
    derivedRows: [],
    status: data.status || "Healthy",
    interpretation: data.interpretation || "",
    dominantConstraint: data.dominantConstraint || "",
    guidance: data.guidance || ""
  });
}
`;
}

function ensureWriteFlow(js) {
  if (has(js, "ScopedLabsAnalyzer.writeFlow")) return js;
  return js + `

function writeFlow(data) {
  ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP] || STEP, {
    category: CATEGORY,
    step: STEP,
    data
  });
}
`;
}

function ensureFlowKeys(js, step, category) {
  if (has(js, "FLOW_KEYS")) return js;
  return `const FLOW_KEYS = {
  ${step}: "scopedlabs:pipeline:${category}:${step}"
};

` + js;
}

function migrateHtml(file, item) {
  let html = readText(file);
  if (!html) return { changed: false, reason: "missing html" };
  html = normalizeLineEndings(html);
  const before = html;

  html = ensureBreadcrumbs(html, item.category, item.title);
  html = ensurePipeline(html);
  html = ensureResults(html);
  html = ensureDesignFlowCard(html, item.title);
  html = ensureNextStepRowAndContinue(html, item.category, item.step);
  html = fixSharedScriptOrder(html);

  if (html !== before) {
    ensureBackup(file);
    writeText(file, html);
    return { changed: true };
  }
  return { changed: false, reason: "no change" };
}

function migrateJs(file, item) {
  let js = readText(file);
  if (!js) return { changed: false, reason: "missing js" };
  js = normalizeLineEndings(js);
  const before = js;

  js = ensureFlowKeys(js, item.step, item.category);
  js = ensureJsConst(js, "CATEGORY", item.category);
  js = ensureJsConst(js, "STEP", item.step);
  js = ensureJsConst(js, "LANE", "v1");
  js = ensureInvalidate(js);
  js = ensureRenderOutput(js);
  js = ensureWriteFlow(js);
  js = ensureDomContentLoadedInit(js);

  if (js !== before) {
    ensureBackup(file);
    writeText(file, js);
    return { changed: true };
  }
  return { changed: false, reason: "no change" };
}

function main() {
  const report = loadReport();
  const items = report.filter(x => x.mode === "pipeline" && x.issues.length);

  let htmlChanged = 0;
  let jsChanged = 0;
  let skipped = 0;

  for (const item of items) {
    const htmlFile = path.join(ROOT, item.file);
    const jsFile = path.join(ROOT, item.js);

    const h = migrateHtml(htmlFile, item);
    const j = migrateJs(jsFile, item);

    if (h.changed) htmlChanged += 1;
    if (j.changed) jsChanged += 1;
    if (!h.changed && !j.changed) skipped += 1;

    console.log(item.file);
    console.log(`  html: ${h.changed ? "updated" : `skipped (${h.reason})`}`);
    console.log(`  js:   ${j.changed ? "updated" : `skipped (${j.reason})`}`);
  }

  console.log("");
  console.log("PIPELINE FOLLOW-UP MIGRATION COMPLETE");
  console.log(`HTML files updated: ${htmlChanged}`);
  console.log(`JS files updated:   ${jsChanged}`);
  console.log(`Skipped:            ${skipped}`);
  console.log("Backups were created as *.bak before first modification.");
  console.log("Run the auditor again after this pass.");
}

main();