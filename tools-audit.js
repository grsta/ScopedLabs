#!/usr/bin/env node
/**
<<<<<<< HEAD
 * ScopedLabs tool audit (mode-aware + category index aware)
=======
 * ScopedLabs tool audit (mode-aware)
>>>>>>> 18f754b (Restore backup state)
 *
 * Usage:
 *   node tools-audit.js
 *   node tools-audit.js E:\ScopedLabs
 *
<<<<<<< HEAD
 * Optional manifest:
 *   tools-audit-manifest.json
 *   {
 *     "tools/physical-security/index.html": { "mode": "category_index" },
 *     "tools/physical-security/pixel-density/index.html": { "mode": "pipeline", "chart": true }
=======
 * Optional future manifest support:
 *   tools-audit-manifest.json
 *   {
 *     "tools/physical-security/pixel-density/index.html": { "mode": "pipeline", "chart": true },
 *     "tools/access-control/credential-format/index.html": { "mode": "standalone_basic" }
>>>>>>> 18f754b (Restore backup state)
 *   }
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || process.cwd());
const TOOLS_DIR = path.join(ROOT, "tools");
const MANIFEST_PATH = path.join(ROOT, "tools-audit-manifest.json");

const SHARED_SCRIPTS = {
  toolFlow: "/assets/tool-flow.js",
  catalog: "/assets/catalog.js",
  pipelines: "/assets/pipelines.js",
  pipelineState: "/assets/pipeline-state.js",
  pipeline: "/assets/pipeline.js",
  analyzer: "/assets/analyzer.js"
};

const REQUIRED_BODY_ATTRS_BASE = [
  "data-tier",
  "data-category"
];

const REQUIRED_BODY_ATTRS_PIPELINE = [
  "data-step",
  "data-lane"
];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
<<<<<<< HEAD
=======

>>>>>>> 18f754b (Restore backup state)
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function has(text, pattern) {
  if (!text) return false;
  if (pattern instanceof RegExp) return pattern.test(text);
  return text.includes(pattern);
}

function normalizeSrc(src) {
  return src.replace(/\?.*$/, "");
}

function findAllScripts(html) {
  const scripts = [];
  const re = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);
  return scripts;
}

function getBodyAttrs(html) {
  const m = html.match(/<body\b([^>]*)>/i);
  if (!m) return {};
  const raw = m[1];
  const attrs = {};
  const re = /([a-zA-Z0-9:_-]+)=["']([^"']*)["']/g;
  let x;
  while ((x = re.exec(raw))) attrs[x[1]] = x[2];
  return attrs;
}

function getTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : "";
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function getSlugFromPath(indexPath) {
  return path.basename(path.dirname(indexPath));
}

function getCategoryFromPath(indexPath) {
<<<<<<< HEAD
  const parts = rel(indexPath).split("/");
  return parts.length >= 3 ? parts[1] : "";
=======
  const relPath = rel(indexPath).split("/");
  return relPath.length >= 3 ? relPath[1] : "";
>>>>>>> 18f754b (Restore backup state)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasLocalScript(scripts) {
  return scripts.some((s) => /\/script\.js$|\.\/script\.js$/.test(s));
}

function getNormalizedScripts(html) {
  return findAllScripts(html).map(normalizeSrc);
}

function hasFooter(html) {
  return has(html, /<footer\b[^>]*class=["'][^"']*site-footer/i);
}

function hasYearHook(html) {
  return has(html, /\[data-year\]|data-year/);
}

function hasToolCard(html) {
  return has(html, /id=["']toolCard["']/i);
}

function hasLockedCard(html) {
  return has(html, /id=["']lockedCard["']/i);
}

function hasPipelineDom(html) {
  return has(html, /id=["']pipeline["']/i);
}

function hasFlowNoteDom(html) {
  return has(html, /id=["']flow-note["']/i);
}

function hasAnalysisCopy(html) {
  return has(html, /id=["']analysis-copy["']/i);
}

function hasResultsDom(html) {
  return has(html, /id=["']results["']/i);
}

function hasNextStepRow(html) {
  return has(html, /id=["']next-step-row["']/i);
}

function hasContinue(html) {
  return has(html, /id=["']continue["']/i);
}

function hasBestFor(html) {
  return has(html, /class=["'][^"']*tool-best-for/i);
}

function hasCrumbs(html) {
  return has(html, /class=["'][^"']*crumbs/i);
}

function hasDesignFlowCard(html) {
<<<<<<< HEAD
  return has(html, /Part of a Design Flow/i) || has(html, /Design Flow/i);
=======
  return has(html, /Part of a Design Flow/i);
>>>>>>> 18f754b (Restore backup state)
}

function hasPillPro(html) {
  return has(html, /pill--pro/i);
}

function hasPillFree(html) {
  return has(html, /pill--free/i);
}

function jsHasYearInit(jsText) {
  return has(jsText, /document\.querySelector\(\s*["']\[data-year\]["']\s*\)/);
}

<<<<<<< HEAD
function isCategoryIndex(indexPath) {
  const rp = rel(indexPath);
  const parts = rp.split("/");
  return parts.length === 3 && parts[0] === "tools" && parts[2] === "index.html";
}

function detectMode(indexPath, html, jsText, manifestEntry) {
  if (manifestEntry?.mode) return manifestEntry.mode;
  if (isCategoryIndex(indexPath)) return "category_index";
=======
function detectMode(indexPath, html, jsText, manifestEntry) {
  if (manifestEntry?.mode) return manifestEntry.mode;
>>>>>>> 18f754b (Restore backup state)

  const attrs = getBodyAttrs(html);
  const scripts = getNormalizedScripts(html);

<<<<<<< HEAD
  const bodyHasPipelineAttrs = !!attrs["data-step"] && !!attrs["data-lane"];
=======
  const bodyHasPipelineAttrs =
    !!attrs["data-step"] &&
    !!attrs["data-lane"];

>>>>>>> 18f754b (Restore backup state)
  const hasPipelineBits =
    hasPipelineDom(html) ||
    hasFlowNoteDom(html) ||
    scripts.includes(SHARED_SCRIPTS.pipelineState) ||
    scripts.includes(SHARED_SCRIPTS.pipeline) ||
    has(jsText, "FLOW_KEYS") ||
    has(jsText, "PREVIOUS_STEP") ||
    has(jsText, "renderFlowNote");

  const hasAnalyzerBits =
    scripts.includes(SHARED_SCRIPTS.analyzer) ||
    hasAnalysisCopy(html) ||
    has(jsText, "ScopedLabsAnalyzer.renderOutput") ||
    has(jsText, "ScopedLabsAnalyzer.invalidate");

  if (bodyHasPipelineAttrs && hasPipelineBits) return "pipeline";
  if (hasAnalyzerBits) return "standalone_analyzer";
  if (has(jsText, "ScopedLabsAnalyzer") || hasResultsDom(html)) return "standalone_basic";
  return "legacy";
}

function classifyTool(indexPath, html, jsText, manifest) {
  const attrs = getBodyAttrs(html);
  const slug = getSlugFromPath(indexPath);
  const categoryFromBody = (attrs["data-category"] || "").trim();
  const categoryFromPath = getCategoryFromPath(indexPath);
  const tier = (attrs["data-tier"] || "").trim().toLowerCase();
  const step = (attrs["data-step"] || "").trim();
  const manifestEntry = manifest?.[rel(indexPath)] || null;
  const mode = detectMode(indexPath, html, jsText, manifestEntry);

  return {
    slug,
    tier,
    step,
    mode,
    category: categoryFromBody || categoryFromPath,
    categoryFromBody,
    categoryFromPath,
    manifestEntry
  };
}

function checkBodyAttrs(info, attrs, issues) {
<<<<<<< HEAD
  if (info.mode === "category_index" || info.mode === "legacy") {
    if (!attrs["data-category"]) issues.push("Missing body attr: data-category");
    return;
  }

=======
>>>>>>> 18f754b (Restore backup state)
  for (const attr of REQUIRED_BODY_ATTRS_BASE) {
    if (!attrs[attr]) issues.push(`Missing body attr: ${attr}`);
  }

  if (info.mode === "pipeline") {
    for (const attr of REQUIRED_BODY_ATTRS_PIPELINE) {
      if (!attrs[attr]) issues.push(`Missing body attr: ${attr}`);
    }
  }
}

function checkPills(info, html, issues) {
<<<<<<< HEAD
  if (info.mode === "category_index") return;
  if (info.tier === "pro" && !hasPillPro(html)) issues.push("Pro tool missing .pill--pro");
  if (info.tier === "free" && !hasPillFree(html)) issues.push("Free tool missing .pill--free");
=======
  if (info.tier === "pro" && !hasPillPro(html)) {
    issues.push("Pro tool missing .pill--pro");
  }
  if (info.tier === "free" && !hasPillFree(html)) {
    issues.push("Free tool missing .pill--free");
  }
>>>>>>> 18f754b (Restore backup state)
}

function checkFooter(html, jsText, issues) {
  if (!hasFooter(html)) issues.push("Missing site footer");
  if (!hasYearHook(html)) issues.push("Missing footer [data-year] hook");
<<<<<<< HEAD
  if (jsText && !jsHasYearInit(jsText)) issues.push("Missing footer year init");
=======
  if (!jsHasYearInit(jsText)) issues.push("Missing footer year init");
>>>>>>> 18f754b (Restore backup state)
}

function checkSharedScriptsForMode(mode, scripts, issues) {
  const mustHaveByMode = {
    pipeline: [
      SHARED_SCRIPTS.toolFlow,
      SHARED_SCRIPTS.catalog,
      SHARED_SCRIPTS.pipelines,
      SHARED_SCRIPTS.pipelineState,
      SHARED_SCRIPTS.pipeline,
      SHARED_SCRIPTS.analyzer
    ],
<<<<<<< HEAD
    standalone_analyzer: [SHARED_SCRIPTS.analyzer],
    standalone_basic: [],
    category_index: [],
=======
    standalone_analyzer: [
      SHARED_SCRIPTS.analyzer
    ],
    standalone_basic: [],
>>>>>>> 18f754b (Restore backup state)
    legacy: []
  };

  const required = mustHaveByMode[mode] || [];
  const missing = [];
  let lastIndex = -1;

  for (const script of required) {
    const idx = scripts.findIndex((s) => s === script);
    if (idx === -1) {
      missing.push(script);
    } else if (mode === "pipeline" && idx < lastIndex) {
      issues.push(`Shared script out of order: ${script}`);
    } else {
      lastIndex = idx;
    }
  }

<<<<<<< HEAD
  if (missing.length) issues.push(`Missing shared scripts: ${missing.join(", ")}`);
=======
  if (missing.length) {
    issues.push(`Missing shared scripts: ${missing.join(", ")}`);
  }
>>>>>>> 18f754b (Restore backup state)
}

function checkHtml(indexPath, html, jsText, manifest) {
  const issues = [];
  const attrs = getBodyAttrs(html);
  const scripts = getNormalizedScripts(html);
  const info = classifyTool(indexPath, html, jsText, manifest);
  const title = getTitle(html);
  const hasChartJs = scripts.some((s) => s.includes("chart.js"));

  if (!/<body\b/i.test(html)) issues.push("Missing <body> tag");

  checkBodyAttrs(info, attrs, issues);
  checkPills(info, html, issues);
<<<<<<< HEAD
  checkFooter(html, jsText || "", issues);

  if (info.mode !== "category_index" && !hasLocalScript(scripts)) {
    issues.push("Missing local script.js include");
  }

=======
  checkFooter(html, jsText, issues);

  if (!hasLocalScript(scripts)) issues.push("Missing local script.js include");
>>>>>>> 18f754b (Restore backup state)
  if (!hasCrumbs(html)) issues.push("Missing breadcrumb block");

  if (info.mode === "pipeline") {
    if (!hasPipelineDom(html)) issues.push("Missing #pipeline");
    if (!hasFlowNoteDom(html)) issues.push("Missing #flow-note");
    if (!hasAnalysisCopy(html)) issues.push("Missing #analysis-copy");
    if (!hasResultsDom(html)) issues.push("Missing #results");
    if (!hasBestFor(html)) issues.push("Missing .tool-best-for");
    if (!hasDesignFlowCard(html)) issues.push('Missing "Part of a Design Flow" explainer card');
    if (!hasToolCard(html)) issues.push("Missing #toolCard");
    if (!hasNextStepRow(html)) issues.push("Missing #next-step-row");
    if (!hasContinue(html)) issues.push("Missing #continue");
<<<<<<< HEAD
    if (info.tier === "pro" && !hasLockedCard(html)) issues.push("Pro tool missing #lockedCard");
    if (info.tier === "free" && hasLockedCard(html)) issues.push("Free tool should not include #lockedCard");
=======

    if (info.tier === "pro" && !hasLockedCard(html)) {
      issues.push("Pro tool missing #lockedCard");
    }
    if (info.tier === "free" && hasLockedCard(html)) {
      issues.push("Free tool should not include #lockedCard");
    }
>>>>>>> 18f754b (Restore backup state)
  }

  if (info.mode === "standalone_analyzer") {
    if (!hasAnalysisCopy(html)) issues.push("Missing #analysis-copy");
    if (!hasResultsDom(html)) issues.push("Missing #results");
    if (!hasBestFor(html)) issues.push("Missing .tool-best-for");
    if (!hasToolCard(html)) issues.push("Missing #toolCard");
<<<<<<< HEAD
    if (info.tier === "pro" && !hasLockedCard(html)) issues.push("Pro tool missing #lockedCard");
    if (info.tier === "free" && hasLockedCard(html)) issues.push("Free tool should not include #lockedCard");
=======
    if (info.tier === "pro" && !hasLockedCard(html)) {
      issues.push("Pro tool missing #lockedCard");
    }
    if (info.tier === "free" && hasLockedCard(html)) {
      issues.push("Free tool should not include #lockedCard");
    }
>>>>>>> 18f754b (Restore backup state)
  }

  if (info.mode === "standalone_basic") {
    if (!hasResultsDom(html)) issues.push("Missing #results");
  }

<<<<<<< HEAD
  if (info.mode === "category_index") {
    if (!hasDesignFlowCard(html)) issues.push('Missing category pipeline/design-flow card');
    if (!has(html, /Free Tier/i)) issues.push('Missing Free Tier section');
    if (!has(html, /Pro Tier/i)) issues.push('Missing Pro Tier section');
  }

=======
>>>>>>> 18f754b (Restore backup state)
  checkSharedScriptsForMode(info.mode, scripts, issues);

  return {
    kind: "html",
    info,
    title,
    hasChartJs,
    issues
  };
}

function checkJs(indexPath, jsPath, jsText, htmlText, manifest) {
  const issues = [];
  const info = classifyTool(indexPath, htmlText, jsText, manifest);
  const attrs = getBodyAttrs(htmlText);
  const step = attrs["data-step"] || "";
  const category = info.category || "";

<<<<<<< HEAD
  if (info.mode !== "category_index" && !jsText) {
    return { kind: "js", info, issues: ["Missing script.js"] };
  }

  if (!jsText) {
    return { kind: "js", info, issues };
=======
  if (!jsText) {
    return {
      kind: "js",
      info,
      issues: ["Missing script.js"]
    };
>>>>>>> 18f754b (Restore backup state)
  }

  const modeRequirements = {
    pipeline: [
      "ScopedLabsAnalyzer.invalidate",
      "ScopedLabsAnalyzer.renderOutput",
      "ScopedLabsAnalyzer.writeFlow",
      "FLOW_KEYS",
      "const CATEGORY",
      "const STEP",
      "const PREVIOUS_STEP"
    ],
<<<<<<< HEAD
    standalone_analyzer: ["ScopedLabsAnalyzer.renderOutput"],
    standalone_basic: [],
    category_index: [],
=======
    standalone_analyzer: [
      "ScopedLabsAnalyzer.renderOutput"
    ],
    standalone_basic: [],
>>>>>>> 18f754b (Restore backup state)
    legacy: []
  };

  for (const p of modeRequirements[info.mode] || []) {
    if (!has(jsText, p)) issues.push(`Missing JS pattern: ${p}`);
  }

  const modeFunctions = {
    pipeline: [
      { re: /window\.addEventListener\(["']DOMContentLoaded["']/, msg: "Missing DOMContentLoaded init" },
      { re: /function\s+renderFlowNote\s*\(/, msg: "Missing renderFlowNote()" },
      { re: /function\s+invalidate\s*\(/, msg: "Missing invalidate()" },
      { re: /function\s+calc\s*\(/, msg: "Missing calc()" }
    ],
    standalone_analyzer: [
      { re: /window\.addEventListener\(["']DOMContentLoaded["']/, msg: "Missing DOMContentLoaded init" }
    ],
    standalone_basic: [],
<<<<<<< HEAD
    category_index: [],
=======
>>>>>>> 18f754b (Restore backup state)
    legacy: []
  };

  for (const req of modeFunctions[info.mode] || []) {
    if (!has(jsText, req.re)) issues.push(req.msg);
  }

  if (info.tier === "pro" && (info.mode === "pipeline" || info.mode === "standalone_analyzer")) {
    if (!has(jsText, "unlockCategoryPage")) issues.push("Pro tool JS missing unlockCategoryPage()");
    if (!has(jsText, "hasStoredAuth")) issues.push("Pro tool JS missing hasStoredAuth()");
    if (!has(jsText, "getUnlockedCategories")) issues.push("Pro tool JS missing getUnlockedCategories()");
  }

  if (info.tier === "free" && has(jsText, "unlockCategoryPage")) {
    issues.push("Free tool JS should not include unlockCategoryPage()");
  }

  if (category && has(jsText, "const CATEGORY")) {
<<<<<<< HEAD
    const ok = has(jsText, new RegExp(`const\\s+CATEGORY\\s*=\\s*["']${escapeRegExp(category)}["']`));
    if (!ok) issues.push(`CATEGORY constant does not match body data-category (${category})`);
  }

  if (step && has(jsText, "const STEP")) {
    const ok = has(jsText, new RegExp(`const\\s+STEP\\s*=\\s*["']${escapeRegExp(step)}["']`));
    if (!ok) issues.push(`STEP constant does not match body data-step (${step})`);
  }

  return { kind: "js", info, issues };
=======
    const bodyCategoryMismatch = !has(
      jsText,
      new RegExp(`const\\s+CATEGORY\\s*=\\s*["']${escapeRegExp(category)}["']`)
    );
    if (bodyCategoryMismatch) {
      issues.push(`CATEGORY constant does not match body data-category (${category})`);
    }
  }

  if (step && has(jsText, "const STEP")) {
    const bodyStepMismatch = !has(
      jsText,
      new RegExp(`const\\s+STEP\\s*=\\s*["']${escapeRegExp(step)}["']`)
    );
    if (bodyStepMismatch) {
      issues.push(`STEP constant does not match body data-step (${step})`);
    }
  }

  return {
    kind: "js",
    info,
    issues
  };
>>>>>>> 18f754b (Restore backup state)
}

function summarizeByMode(report) {
  const map = new Map();
  for (const item of report) {
    const current = map.get(item.mode) || { count: 0, withIssues: 0, issues: 0 };
    current.count += 1;
    if (item.issues.length) {
      current.withIssues += 1;
      current.issues += item.issues.length;
    }
    map.set(item.mode, current);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function main() {
  if (!fs.existsSync(TOOLS_DIR)) {
    console.error(`Tools directory not found: ${TOOLS_DIR}`);
    process.exit(1);
  }

  const manifest = readJson(MANIFEST_PATH) || {};
  const files = walk(TOOLS_DIR);
  const indexFiles = files.filter((f) => path.basename(f).toLowerCase() === "index.html");

  if (!indexFiles.length) {
    console.log("No tool index.html files found.");
    return;
  }

  const report = [];
  let totalIssues = 0;
  let withIssues = 0;

  for (const indexPath of indexFiles) {
    const html = readText(indexPath) || "";
    const jsPath = path.join(path.dirname(indexPath), "script.js");
    const jsText = readText(jsPath) || "";

    const htmlResult = checkHtml(indexPath, html, jsText, manifest);
    const jsResult = checkJs(indexPath, jsPath, jsText, html, manifest);

    const issues = [...htmlResult.issues, ...jsResult.issues];
<<<<<<< HEAD
=======

>>>>>>> 18f754b (Restore backup state)
    if (issues.length) {
      withIssues += 1;
      totalIssues += issues.length;
    }

    report.push({
      file: rel(indexPath),
      js: rel(jsPath),
      title: htmlResult.title,
      tier: htmlResult.info.tier || "unknown",
      category: htmlResult.info.category || "unknown",
      step: htmlResult.info.step || "unknown",
      mode: htmlResult.info.mode,
      hasChartJs: htmlResult.hasChartJs,
      issues
    });
  }

  report.sort((a, b) => {
    if (a.issues.length !== b.issues.length) return b.issues.length - a.issues.length;
    if (a.mode !== b.mode) return a.mode.localeCompare(b.mode);
    return a.file.localeCompare(b.file);
  });

  const modeSummary = summarizeByMode(report);

  console.log("");
<<<<<<< HEAD
  console.log("SCOPEDLABS TOOL AUDIT (CATEGORY INDEX AWARE)");
  console.log("===========================================");
=======
  console.log("SCOPEDLABS TOOL AUDIT (MODE-AWARE)");
  console.log("=================================");
>>>>>>> 18f754b (Restore backup state)
  console.log(`Root: ${ROOT}`);
  console.log(`Tools scanned: ${report.length}`);
  console.log(`Tools with issues: ${withIssues}`);
  console.log(`Total issues: ${totalIssues}`);
  console.log("");

  console.log("BY MODE");
  console.log("-------");
  for (const [mode, stats] of modeSummary) {
<<<<<<< HEAD
    console.log(`${mode}: count=${stats.count}, with_issues=${stats.withIssues}, issues=${stats.issues}`);
=======
    console.log(
      `${mode}: count=${stats.count}, with_issues=${stats.withIssues}, issues=${stats.issues}`
    );
>>>>>>> 18f754b (Restore backup state)
  }
  console.log("");

  for (const item of report) {
    const status = item.issues.length ? `FAIL (${item.issues.length})` : "PASS";
    console.log(`${status}  ${item.file}`);
    console.log(`  title: ${item.title || "(missing title)"}`);
    console.log(`  tier/category/step: ${item.tier} / ${item.category} / ${item.step}`);
    console.log(`  mode: ${item.mode}`);
    console.log(`  chart.js: ${item.hasChartJs ? "yes" : "no"}`);
<<<<<<< HEAD
    if (item.issues.length) {
      for (const issue of item.issues) console.log(`   - ${issue}`);
=======

    if (item.issues.length) {
      for (const issue of item.issues) {
        console.log(`   - ${issue}`);
      }
>>>>>>> 18f754b (Restore backup state)
    }
    console.log("");
  }

  const jsonOut = path.join(ROOT, "tools-audit-report.json");
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");
  console.log(`Saved JSON report: ${jsonOut}`);
}

main();