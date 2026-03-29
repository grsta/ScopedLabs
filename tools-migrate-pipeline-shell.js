#!/usr/bin/env node
/**
 * ScopedLabs pipeline shell migrator
 *
 * Safe-ish first pass:
 * - creates .bak backups before changing files
 * - only targets tools listed in tools-audit-report.json with mode === "pipeline"
 * - only applies common wrapper upgrades
 * - skips files when structure is too ambiguous
 *
 * Usage:
 *   node .\tools-migrate-pipeline-shell.js
 *   node .\tools-migrate-pipeline-shell.js E:\ScopedLabs
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

function loadReport() {
  const raw = readText(REPORT_PATH);
  if (!raw) {
    throw new Error(`Could not read report: ${REPORT_PATH}`);
  }
  return JSON.parse(raw);
}

function has(text, pattern) {
  if (pattern instanceof RegExp) return pattern.test(text);
  return text.includes(pattern);
}

function injectAfter(matchRe, html, block) {
  const m = html.match(matchRe);
  if (!m) return { changed: false, text: html };
  const idx = m.index + m[0].length;
  return {
    changed: true,
    text: html.slice(0, idx) + block + html.slice(idx)
  };
}

function injectBefore(matchRe, html, block) {
  const m = html.match(matchRe);
  if (!m) return { changed: false, text: html };
  const idx = m.index;
  return {
    changed: true,
    text: html.slice(0, idx) + block + html.slice(idx)
  };
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function detectTier(html) {
  const m = html.match(/data-tier=["']([^"']+)["']/i);
  return (m?.[1] || "").toLowerCase();
}

function detectTitle(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "Tool";
}

function detectSubhead(html) {
  const m = html.match(/<p[^>]*class=["'][^"']*subhead[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  return m ? m[1].trim() : "";
}

function buildPillRow(tier) {
  const pillClass = tier === "pro" ? "pill--pro" : "pill--free";
  const pillText = tier === "pro" ? "Pro Tier" : "Free Tier";
  return `
      <div class="pill-row" style="margin-top: 6px;">
        <span class="pill ${pillClass}">${pillText}</span>
      </div>
`;
}

function buildDesignFlowCard(tier, title) {
  const pillClass = tier === "pro" ? "pill--pro" : "pill--free";
  const pillText = tier === "pro" ? "Part of a Design Flow" : "Part of a Design Flow";
  return `
      <section class="card" style="margin-top: 18px; border-color: rgba(120,255,120,0.18);">
        <div class="pill ${pillClass}" style="margin-bottom: 10px; width: fit-content;">${pillText}</div>
        <h2 class="h3" style="margin-top: 0;">This tool continues the design flow</h2>
        <p class="muted" style="margin-bottom: 0;">
          This tool has been upgraded to the newer ScopedLabs pipeline wrapper standard.
          Review and customize this explainer so it reflects the actual purpose of ${title}.
        </p>
        <p class="muted" style="margin-top: 12px; margin-bottom: 0;">
          TODO: replace this generic flow copy with tool-specific design guidance.
        </p>
      </section>
`;
}

function buildFooter() {
  return `
      <footer class="site-footer">
        <div class="muted">© <span data-year></span> ScopedLabs</div>
      </footer>
`;
}

function ensureChartJsIfNeeded(html, reportItem) {
  if (!reportItem.hasChartJs) return html;
  if (has(html, "cdn.jsdelivr.net/npm/chart.js")) return html;

  const result = injectAfter(
    /<script[^>]*src=["']https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2["'][^>]*><\/script>\s*/i,
    html,
    `  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n`
  );

  return result.text;
}

function ensurePipelineStateScript(html) {
  if (has(html, '/assets/pipeline-state.js')) return html;

  const result = injectAfter(
    /<script[^>]*src=["']\/assets\/pipelines\.js[^"']*["'][^>]*><\/script>\s*/i,
    html,
    `  <script src="/assets/pipeline-state.js?v=auto-shell-001"></script>\n`
  );

  return result.text;
}

function ensureFooterScriptsOrder(html) {
  const wanted = [
    '/assets/tool-flow.js',
    '/assets/catalog.js',
    '/assets/pipelines.js',
    '/assets/pipeline-state.js',
    '/assets/pipeline.js',
    '/assets/analyzer.js'
  ];

  const footerStart = html.lastIndexOf('<script src="/assets/');
  if (footerStart === -1) return html;

  const bodyEnd = html.lastIndexOf("</body>");
  if (bodyEnd === -1) return html;

  const footerChunk = html.slice(footerStart, bodyEnd);
  const localScriptMatch = footerChunk.match(/<script[^>]*src=["'](\.\/script\.js[^"']*|\/?[^"']*\/script\.js[^"']*)["'][^>]*><\/script>/i);
  const localScript = localScriptMatch ? localScriptMatch[0] : '';

  const newShared = [
    `  <script src="/assets/tool-flow.js?v=auto-shell-001"></script>`,
    `  <script src="/assets/catalog.js?v=auto-shell-001"></script>`,
    `  <script src="/assets/pipelines.js?v=auto-shell-001"></script>`,
    `  <script src="/assets/pipeline-state.js?v=auto-shell-001"></script>`,
    `  <script src="/assets/pipeline.js?v=auto-shell-001"></script>`,
    `  <script src="/assets/analyzer.js?v=auto-shell-001"></script>`
  ].join("\n");

  const rebuilt = `${newShared}\n${localScript ? `  ${localScript.trim()}\n` : ""}`;

  return html.slice(0, footerStart) + rebuilt + html.slice(bodyEnd);
}

function ensureFooter(html) {
  if (has(html, /<footer\b[^>]*class=["'][^"']*site-footer/i)) return html;
  const result = injectBefore(/<\/main>/i, html, buildFooter());
  return result.text;
}

function ensurePillRow(html) {
  if (has(html, /class=["'][^"']*pill-row/i)) return html;
  const tier = detectTier(html) || "free";
  const result = injectAfter(/<\/div>\s*\n\s*<h1/i, html.replace(/<\/div>\s*\n\s*<h1/i, `</div>\n${buildPillRow(tier)}\n      <h1`));
  return result.changed ? result.text : html;
}

function ensurePillRowSimple(html) {
  if (has(html, /class=["'][^"']*pill-row/i)) return html;
  const tier = detectTier(html) || "free";
  const h1Match = html.match(/<h1[^>]*>/i);
  if (!h1Match) return html;
  const idx = h1Match.index;
  return html.slice(0, idx) + buildPillRow(tier) + html.slice(idx);
}

function ensureDesignFlowCard(html) {
  if (has(html, /Part of a Design Flow/i)) return html;
  const title = detectTitle(html);
  const tier = detectTier(html) || "free";
  const subheadMatch = html.match(/<p[^>]*class=["'][^"']*subhead[^"']*["'][^>]*>[\s\S]*?<\/p>/i);
  if (!subheadMatch) return html;
  const idx = subheadMatch.index;
  return html.slice(0, idx) + buildDesignFlowCard(tier, title) + html.slice(idx);
}

function ensureToolCardId(html) {
  if (has(html, /id=["']toolCard["']/i)) return html;

  return html.replace(
    /<section([^>]*class=["'][^"']*tool-card[^"']*["'][^>]*)>/i,
    '<section id="toolCard"$1>'
  );
}

function ensureNextStepRow(html) {
  if (has(html, /id=["']next-step-row["']/i)) return html;
  if (!has(html, /id=["']continue["']/i)) return html;

  return html.replace(
    /(<a[^>]*id=["']continue["'][^>]*>[\s\S]*?<\/a>)/i,
    `<div id="next-step-row" class="btn-row" style="margin-top: 12px; display:none;">
          $1
        </div>`
  );
}

function ensureLockedCard(html) {
  const tier = detectTier(html);
  if (tier !== "pro") return html;
  if (has(html, /id=["']lockedCard["']/i)) return html;
  if (!has(html, /id=["']toolCard["']/i)) return html;

  const locked = `
      <section id="lockedCard" class="card tool-card" style="margin-top: 18px;">
        <div class="pill-row">
          <span class="pill pill--pro">Pro Tier</span>
        </div>

        <h2 class="h2">🔒 Locked</h2>
        <p class="muted">This tool is included with Pro access for this category.</p>

        <p class="muted"><strong>What this models</strong></p>
        <ul class="muted">
          <li>TODO: add tool-specific lock summary</li>
          <li>TODO: add second bullet</li>
          <li>TODO: add third bullet</li>
        </ul>

        <div class="actions">
          <a class="btn" href="/tools/">Back to Tools</a>
          <a class="btn btn-primary" href="/upgrade/">Unlock Pro</a>
        </div>
      </section>
`;

  return html.replace(/<section[^>]*id=["']toolCard["'][^>]*>/i, `${locked}\n      $&`);
}

function ensureAnalysisCopy(html) {
  if (has(html, /id=["']analysis-copy["']/i)) return html;
  return html.replace(
    /(<div[^>]*id=["']results["'][^>]*>[\s\S]*?<\/div>)/i,
    `$1
          <div id="analysis-copy" style="display:none;"></div>`
  );
}

function ensureFlowNote(html) {
  if (has(html, /id=["']flow-note["']/i)) return html;
  const bestForMatch = html.match(/<p[^>]*class=["'][^"']*tool-best-for[^"']*["'][^>]*>[\s\S]*?<\/p>/i);
  if (!bestForMatch) return html;
  const idx = bestForMatch.index + bestForMatch[0].length;
  return html.slice(0, idx) + `
      <div id="flow-note" class="flow-note" hidden>
        TODO: replace generic flow-note text.
      </div>
` + html.slice(idx);
}

function ensureJsYearInit(js) {
  if (has(js, /document\.querySelector\(\s*["']\[data-year\]["']\s*\)/)) return js;

  const domReady = js.match(/window\.addEventListener\(["']DOMContentLoaded["']\s*,\s*\(\)\s*=>\s*\{/);
  if (domReady) {
    return js.replace(
      /window\.addEventListener\(["']DOMContentLoaded["']\s*,\s*\(\)\s*=>\s*\{/,
      `window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();`
    );
  }

  return js + `

window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});
`;
}

function ensureJsConst(js, name, value) {
  if (has(js, new RegExp(`const\\s+${name}\\s*=`))) return js;
  return `const ${name} = "${value}";\n` + js;
}

function ensureJsFlowKeys(js) {
  if (has(js, "FLOW_KEYS")) return js;
  return `const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};\n\n` + js;
}

function ensureJsRenderFlowNote(js) {
  if (has(js, /function\s+renderFlowNote\s*\(/)) return js;
  return js + `

function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}
`;
}

function ensureJsCalc(js) {
  if (has(js, /function\s+calc\s*\(/)) return js;
  return js + `

function calc() {
  // TODO: implement calculate handler
}
`;
}

function ensureJsInvalidate(js) {
  if (has(js, /function\s+invalidate\s*\(/)) return js;
  return js + `

function invalidate() {
  // TODO: implement invalidation
}
`;
}

function ensureJsUnlockHelpers(js, tier) {
  if (tier !== "pro") return js;

  if (!has(js, "hasStoredAuth")) {
    js += `

function hasStoredAuth() {
  try {
    const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
    if (!k) return false;
    const raw = JSON.parse(localStorage.getItem(k));
    return !!(
      raw?.access_token ||
      raw?.currentSession?.access_token ||
      (Array.isArray(raw) ? raw[0]?.access_token : null)
    );
  } catch {
    return false;
  }
}
`;
  }

  if (!has(js, "getUnlockedCategories")) {
    js += `

function getUnlockedCategories() {
  try {
    const raw = localStorage.getItem("sl_unlocked_categories");
    if (!raw) return [];
    return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}
`;
  }

  if (!has(js, "unlockCategoryPage")) {
    js += `

function unlockCategoryPage() {
  const body = document.body;
  const category = String(body?.dataset?.category || "").trim().toLowerCase();
  const signedIn = hasStoredAuth();
  const unlocked = getUnlockedCategories().includes(category);

  const lockedCard = document.getElementById("lockedCard");
  const toolCard = document.getElementById("toolCard");

  if (signedIn && unlocked) {
    if (lockedCard) lockedCard.style.display = "none";
    if (toolCard) toolCard.style.display = "";
    return true;
  }

  if (lockedCard) lockedCard.style.display = "";
  if (toolCard) toolCard.style.display = "none";
  return false;
}
`;
  }

  return js;
}

function migrateHtml(file, reportItem) {
  let html = readText(file);
  if (!html) return { changed: false, reason: "missing html" };

  html = normalizeLineEndings(html);

  const before = html;

  html = ensureChartJsIfNeeded(html, reportItem);
  html = ensurePillRowSimple(html);
  html = ensureDesignFlowCard(html);
  html = ensureFlowNote(html);
  html = ensureToolCardId(html);
  html = ensureLockedCard(html);
  html = ensureAnalysisCopy(html);
  html = ensureNextStepRow(html);
  html = ensureFooter(html);
  html = ensurePipelineStateScript(html);
  html = ensureFooterScriptsOrder(html);

  if (html !== before) {
    ensureBackup(file);
    writeText(file, html);
    return { changed: true };
  }

  return { changed: false, reason: "no change" };
}

function migrateJs(file, reportItem) {
  let js = readText(file);
  if (!js) return { changed: false, reason: "missing js" };

  js = normalizeLineEndings(js);
  const before = js;

  const step = reportItem.step && reportItem.step !== "unknown" ? reportItem.step : path.basename(path.dirname(file));
  const category = reportItem.category || "unknown";

  js = ensureJsFlowKeys(js);
  js = ensureJsConst(js, "CATEGORY", category);
  js = ensureJsConst(js, "STEP", step);
  js = ensureJsConst(js, "PREVIOUS_STEP", "TODO_PREVIOUS_STEP");
  js = ensureJsRenderFlowNote(js);
  js = ensureJsInvalidate(js);
  js = ensureJsCalc(js);
  js = ensureJsYearInit(js);
  js = ensureJsUnlockHelpers(js, reportItem.tier);

  if (js !== before) {
    ensureBackup(file);
    writeText(file, js);
    return { changed: true };
  }

  return { changed: false, reason: "no change" };
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`Missing tools-audit-report.json at ${REPORT_PATH}`);
    process.exit(1);
  }

  const report = JSON.parse(readText(REPORT_PATH));
  const pipelineItems = report.filter((x) => x.mode === "pipeline" && x.issues.length);

  let htmlChanged = 0;
  let jsChanged = 0;
  let skipped = 0;

  for (const item of pipelineItems) {
    const htmlFile = path.join(ROOT, item.file);
    const jsFile = path.join(ROOT, item.js);

    const htmlResult = migrateHtml(htmlFile, item);
    const jsResult = migrateJs(jsFile, item);

    if (htmlResult.changed) htmlChanged += 1;
    if (jsResult.changed) jsChanged += 1;
    if (!htmlResult.changed && !jsResult.changed) skipped += 1;

    console.log(`${item.file}`);
    console.log(`  html: ${htmlResult.changed ? "updated" : `skipped (${htmlResult.reason})`}`);
    console.log(`  js:   ${jsResult.changed ? "updated" : `skipped (${jsResult.reason})`}`);
  }

  console.log("");
  console.log("PIPELINE SHELL MIGRATION COMPLETE");
  console.log(`HTML files updated: ${htmlChanged}`);
  console.log(`JS files updated:   ${jsChanged}`);
  console.log(`Skipped:            ${skipped}`);
  console.log("");
  console.log("Backups were created as *.bak before first modification.");
  console.log("Run the auditor again after this pass.");
}

main();