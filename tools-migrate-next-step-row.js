#!/usr/bin/env node
/**
 * ScopedLabs next-step-row micro migrator (stronger pass)
 *
 * Fixes:
 * - missing #next-step-row
 * - missing #continue
 *
 * Strategy:
 * - wrap existing #continue anywhere in the file
 * - if no #continue exists, inject a new next-step-row before footer/body end
 * - uses known lane maps for next href
 * - makes .bak backups before first write
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
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
}

function normalize(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function loadReport() {
  const raw = readText(REPORT_PATH);
  if (!raw) throw new Error(`Could not read ${REPORT_PATH}`);
  return JSON.parse(raw);
}

function has(text, pattern) {
  if (pattern instanceof RegExp) return pattern.test(text);
  return text.includes(pattern);
}

function inferNextHref(category, step) {
  const lanes = {
    "physical-security": [
      "scene-illumination","mounting-height","field-of-view","camera-coverage-area","camera-spacing","blind-spot-check","pixel-density","lens-selection","face-recognition-range","license-plate-range"
    ],
    "power": [
      "va-watts-amps","load-growth","ups-runtime","battery-bank-sizer"
    ],
    "network": [
      "poe-budget","bandwidth","oversubscription","latency"
    ],
    "video-storage": [
      "bitrate","storage","retention","raid","survivability"
    ],
    "compute": [
      "cpu-sizing","ram-sizing","storage-iops","storage-throughput","vm-density","gpu-vram","power-thermal","raid-rebuild-time","backup-window","nic-bonding"
    ],
    "thermal": [
      "heat-load-estimator","btu-converter","airflow-requirement","fan-cfm-sizing","ambient-rise","exhaust-temperature","room-cooling-capacity","rack-thermal-density","hot-cold-aisle","psu-efficiency-heat"
    ],
    "wireless": [
      "channel-overlap","coverage-radius","client-density","ap-capacity","mesh-backhaul","noise-floor-margin","link-budget","ptp-wireless-link","roaming-thresholds"
    ],
    "infrastructure": [
      "rack-ru-planner","rack-weight-load","floor-load-rating","equipment-spacing","room-square-footage","ups-room-sizing","generator-runtime"
    ],
    "performance": [
      "cache-hit-ratio","headroom-target","queue-depth","cpu-utilization-impact","disk-saturation","network-congestion","latency-vs-throughput","concurrency-scaling","response-time-sla","bottleneck-analyzer"
    ],
    "access-control": [
      "reader-type-selector","fail-safe-fail-secure","lock-power-budget","panel-capacity","access-level-sizing"
    ]
  };

  const lane = lanes[category] || [];
  const idx = lane.indexOf(step);
  if (idx === -1 || idx === lane.length - 1) return null;
  return `/tools/${category}/${lane[idx + 1]}/`;
}

function wrapExistingContinue(html) {
  if (!has(html, /id=["']continue["']/i)) return { changed: false, html };
  if (has(html, /id=["']next-step-row["']/i)) return { changed: false, html };

  const updated = html.replace(
    /(<a[^>]*id=["']continue["'][\s\S]*?<\/a>)/i,
    `<div id="next-step-row" class="btn-row" style="margin-top: 12px; display:none;">
$1
        </div>`
  );

  return { changed: updated !== html, html: updated };
}

function injectNewContinue(html, category, step) {
  if (has(html, /id=["']continue["']/i)) return { changed: false, html };

  const nextHref = inferNextHref(category, step);
  if (!nextHref) return { changed: false, html };

  const block = `
        <div id="next-step-row" class="btn-row" style="margin-top: 12px; display:none;">
          <a id="continue" class="btn btn-primary" href="${nextHref}">
            Continue →
          </a>
        </div>
`;

  const footerMatch = html.match(/<footer\b/i);
  if (footerMatch) {
    const idx = footerMatch.index;
    return {
      changed: true,
      html: html.slice(0, idx) + block + html.slice(idx)
    };
  }

  const bodyEnd = html.match(/<\/body>/i);
  if (bodyEnd) {
    const idx = bodyEnd.index;
    return {
      changed: true,
      html: html.slice(0, idx) + block + html.slice(idx)
    };
  }

  const mainEnd = html.match(/<\/main>/i);
  if (mainEnd) {
    const idx = mainEnd.index;
    return {
      changed: true,
      html: html.slice(0, idx) + block + html.slice(idx)
    };
  }

  return { changed: false, html };
}

function migrateHtml(file, item) {
  let html = readText(file);
  if (!html) return { changed: false, reason: "missing html" };

  html = normalize(html);
  const before = html;

  const wrapped = wrapExistingContinue(html);
  html = wrapped.html;

  if (!wrapped.changed) {
    const injected = injectNewContinue(html, item.category, item.step);
    html = injected.html;
  }

  if (html !== before) {
    ensureBackup(file);
    writeText(file, html);
    return { changed: true };
  }

  return { changed: false, reason: "no change" };
}

function main() {
  const report = loadReport();
  const targets = report.filter(item =>
    item.mode === "pipeline" &&
    item.issues.some(x => x === "Missing #next-step-row" || x === "Missing #continue")
  );

  let changed = 0;
  let skipped = 0;

  for (const item of targets) {
    const htmlFile = path.join(ROOT, item.file);
    const result = migrateHtml(htmlFile, item);

    console.log(item.file);
    console.log(`  html: ${result.changed ? "updated" : `skipped (${result.reason})`}`);

    if (result.changed) changed += 1;
    else skipped += 1;
  }

  console.log("");
  console.log("NEXT-STEP-ROW MICRO MIGRATION COMPLETE");
  console.log(`HTML files updated: ${changed}`);
  console.log(`Skipped: ${skipped}`);
  console.log("Backups were created as *.bak before first modification.");
  console.log("Run the auditor again after this pass.");
}

main();