#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = process.cwd();
const ASSETS_PIPELINES = path.join(ROOT, "assets", "pipelines.js");

const FREE_TOOLS = {
  power: new Set([
    "va-watts-amps",
    "battery-sizing",
    "inverter-efficiency",
  ]),
};

function die(msg) {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
}

function readFileSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

function writeFileSafe(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function loadPipelinesObject(filePath) {
  const code = readFileSafe(filePath);
  if (!code) die(`Missing ${filePath}`);

  const sandbox = {
    window: {},
    console: { log() {}, warn() {}, error() {} },
  };

  vm.createContext(sandbox);

  try {
    vm.runInContext(code, sandbox, { filename: filePath });
  } catch (err) {
    die(`Failed to evaluate assets/pipelines.js\n${err.stack || err.message}`);
  }

  const pipelines = sandbox.window.SCOPED_PIPELINES;
  if (!pipelines || !pipelines.categories) {
    die(`Could not find window.SCOPED_PIPELINES.categories in ${filePath}`);
  }

  return pipelines;
}

function fileExists(p) {
  return fs.existsSync(p);
}

function normalizeNewlines(s) {
  return s.replace(/\r\n/g, "\n");
}

function ensureBodyData(html, attrsWanted, report) {
  const bodyMatch = html.match(/<body\b[^>]*>/i);
  if (!bodyMatch) {
    report.errors.push("Missing <body> tag");
    return html;
  }

  let bodyTag = bodyMatch[0];
  let newBodyTag = bodyTag;

  for (const [attr, value] of Object.entries(attrsWanted)) {
    const attrRegex = new RegExp(`\\s${attr}=(["']).*?\\1`, "i");

    if (attrRegex.test(newBodyTag)) {
      const current = newBodyTag.match(attrRegex)?.[0] || "";
      if (!current.includes(`"${value}"`) && !current.includes(`'${value}'`)) {
        newBodyTag = newBodyTag.replace(attrRegex, ` ${attr}="${value}"`);
        report.changed.push(`Updated <body> ${attr}="${value}"`);
      } else {
        report.ok.push(`<body> ${attr} already correct`);
      }
    } else {
      newBodyTag = newBodyTag.replace(/<body\b/i, `<body ${attr}="${value}"`);
      report.changed.push(`Added <body> ${attr}="${value}"`);
    }
  }

  if (newBodyTag !== bodyTag) {
    html = html.replace(bodyTag, newBodyTag);
  }

  return html;
}

function ensureHeadScript(html, src, report, { defer = false } = {}) {
  const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = new RegExp(`<script\\b[^>]*src=["']${escaped}["'][^>]*><\\/script>`, "i");
  if (existing.test(html)) {
    report.ok.push(`Script present: ${src}`);
    return html;
  }

  const tag = defer
    ? `  <script defer src="${src}"></script>\n`
    : `  <script src="${src}"></script>\n`;

  const headClose = html.match(/<\/head>/i);
  if (!headClose) {
    report.errors.push(`Missing </head>; cannot insert ${src}`);
    return html;
  }

  html = html.replace(/<\/head>/i, `${tag}</head>`);
  report.changed.push(`Added script: ${src}`);
  return html;
}

function ensureSupabaseCdn(html, report) {
  const src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  return ensureHeadScript(html, src, report, { defer: false });
}

function ensureLocalScript(html, report) {
  const patterns = [
    /<script\b[^>]*src=["']\.\/script\.js["'][^>]*><\/script>/i,
    /<script\b[^>]*src=["']script\.js["'][^>]*><\/script>/i,
  ];

  if (patterns.some((p) => p.test(html))) {
    report.ok.push("Local script present");
    return html;
  }

  const bodyClose = html.match(/<\/body>/i);
  if (!bodyClose) {
    report.errors.push("Missing </body>; cannot insert local script");
    return html;
  }

  html = html.replace(/<\/body>/i, `  <script src="./script.js"></script>\n</body>`);
  report.changed.push(`Added local script: ./script.js`);
  return html;
}

function toolIsFree(category, stepId) {
  return FREE_TOOLS[category]?.has(stepId) || false;
}

function ensureProtectedToolStack(html, report) {
  html = ensureSupabaseCdn(html, report);
  html = ensureHeadScript(html, "/assets/auth.js", report, { defer: true });
  html = ensureHeadScript(html, "/assets/app.js", report, { defer: true });
  return html;
}

function ensurePipelineStack(html, report) {
  html = ensureHeadScript(html, "/assets/pipelines.js", report, { defer: false });
  html = ensureHeadScript(html, "/assets/pipeline.js", report, { defer: true });
  html = ensureHeadScript(html, "/assets/tool-flow.js", report, { defer: false });
  return html;
}

function updateScriptVersions(html, versionToken) {
  if (!versionToken) return html;

  html = html.replace(
    /(<script\b[^>]*src=["'](?:\/assets\/(?:auth|app|pipeline|tool-flow|pipelines)\.js))(?:\?v=[^"']*)?(["'][^>]*><\/script>)/gi,
    `$1?v=${versionToken}$2`
  );

  return html;
}

function syncOnePage({ category, lane, step, versionToken }) {
  const toolDir = path.join(ROOT, "tools", category, step.id);
  const indexPath = path.join(toolDir, "index.html");

  const report = {
    tool: `${category}/${step.id}`,
    file: indexPath,
    changed: [],
    ok: [],
    errors: [],
    skipped: false,
  };

  if (!fileExists(indexPath)) {
    report.errors.push("Missing index.html");
    return report;
  }

  let html = readFileSafe(indexPath);
  html = normalizeNewlines(html);

  const original = html;
  const isFree = toolIsFree(category, step.id);

  html = ensureBodyData(
    html,
    {
      "data-category": category,
      "data-step": step.id,
      "data-lane": lane,
    },
    report
  );

  html = ensurePipelineStack(html, report);
  html = ensureLocalScript(html, report);

  if (!isFree) {
    html = ensureProtectedToolStack(html, report);
  } else {
    report.ok.push("Free tool: skipped auth/app stack");
  }

  html = updateScriptVersions(html, versionToken);

  if (html !== original) {
    writeFileSafe(indexPath, html);
  }

  return report;
}

function main() {
  const category = process.argv[2];
  const lane = process.argv[3] || "v1";
  const versionToken = process.argv[4] || "";

  if (!category) {
    die(`Usage: node scripts/sync-pipeline-lane.js <category> [lane] [versionToken]

Example:
  node scripts/sync-pipeline-lane.js power v1 0315
`);
  }

  const pipelines = loadPipelinesObject(ASSETS_PIPELINES);
  const steps = pipelines?.categories?.[category]?.lanes?.[lane];

  if (!Array.isArray(steps) || !steps.length) {
    die(`No lane found for categories.${category}.lanes.${lane}`);
  }

  console.log(`\nSyncing pipeline lane: ${category} / ${lane}`);
  console.log(`Steps: ${steps.map((s) => s.id).join(" -> ")}\n`);

  const reports = steps.map((step) =>
    syncOnePage({ category, lane, step, versionToken })
  );

  let changedFiles = 0;
  let errorFiles = 0;

  for (const r of reports) {
    console.log(`--- ${r.tool}`);
    console.log(`File: ${path.relative(ROOT, r.file)}`);

    if (r.errors.length) {
      errorFiles += 1;
      for (const e of r.errors) console.log(`  ERROR: ${e}`);
    }

    for (const c of r.changed) console.log(`  CHANGED: ${c}`);
    for (const ok of r.ok) console.log(`  OK: ${ok}`);

    if (r.changed.length) changedFiles += 1;

    if (!r.errors.length && !r.changed.length) {
      console.log(`  OK: No changes needed`);
    }

    console.log("");
  }

  console.log("Summary");
  console.log(`  Tools checked:   ${reports.length}`);
  console.log(`  Files changed:   ${changedFiles}`);
  console.log(`  Files with errs: ${errorFiles}\n`);
}

main();