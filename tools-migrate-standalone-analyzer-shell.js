#!/usr/bin/env node
/**
 * ScopedLabs standalone-analyzer shell migrator
 *
 * Goal:
 * - target report items with mode === "standalone_analyzer"
 * - add common wrapper shell pieces only
 * - create .bak backups before first modification
 *
 * Usage:
 *   node .\tools-migrate-standalone-analyzer-shell.js
 *   node .\tools-migrate-standalone-analyzer-shell.js E:\ScopedLabs
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

function detectTier(html, reportItem) {
  const m = html.match(/data-tier=["']([^"']+)["']/i);
  return (m?.[1] || reportItem.tier || "free").toLowerCase();
}

function detectCategory(html, reportItem) {
  const m = html.match(/data-category=["']([^"']+)["']/i);
  return (m?.[1] || reportItem.category || "").trim().toLowerCase();
}

function detectTitle(html, reportItem) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, "").trim();

  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (title) {
    return title[1]
      .replace(/&amp;/g, "&")
      .replace(/\*ScopedLabs|• ScopedLabs|\| ScopedLabs|ScopedLabs/gi, "")
      .trim();
  }

  return reportItem.title || "Tool";
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

function buildLockedCard(category) {
  return `
      <section id="lockedCard" class="card tool-card" style="margin-top: 18px;">
        <div class="pill-row">
          <span class="pill pill--pro">Pro Tier</span>
        </div>

        <h2 class="h2">🔒 Locked</h2>
        <p class="muted">This tool is included with Pro access for this category.</p>

        <p class="muted"><strong>What this models</strong></p>
        <ul class="muted">
          <li>Advanced analyzer workflow for ${category || "this category"}</li>
          <li>Scenario comparison and deeper engineering guidance</li>
          <li>Pro-only decision support output</li>
        </ul>

        <div class="actions">
          <a class="btn" href="/tools/${category || ""}/">Back to Category</a>
          <a class="btn btn-primary" href="/upgrade/">Unlock Pro</a>
        </div>
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

function wrapToolCardSection(html) {
  if (has(html, /id=["']toolCard["']/i)) return html;

  const resultsCardRe = /<section([^>]*class=["'][^"']*tool-card[^"']*["'][^>]*)>/i;
  if (resultsCardRe.test(html)) {
    return html.replace(resultsCardRe, '<section id="toolCard"$1>');
  }

  const calcButton = html.match(/id=["']calc["']/i);
  if (!calcButton) return html;

  const sectionBeforeCalc = html.slice(0, calcButton.index).match(/<section\b[^>]*>/gi);
  if (!sectionBeforeCalc || !sectionBeforeCalc.length) return html;

  const lastSectionTag = sectionBeforeCalc[sectionBeforeCalc.length - 1];
  const startIndex = html.lastIndexOf(lastSectionTag, calcButton.index);
  if (startIndex === -1) return html;

  return html.slice(0, startIndex) + '<section id="toolCard" class="card tool-card" style="margin-top: 18px;">\n' + html.slice(startIndex);
}

function ensurePillRow(html, tier) {
  if (has(html, /class=["'][^"']*pill-row/i)) return html;
  const h1Match = html.match(/<h1[^>]*>/i);
  if (!h1Match) return html;
  const idx = h1Match.index;
  return html.slice(0, idx) + buildPillRow(tier) + html.slice(idx);
}

function ensureFooter(html) {
  if (has(html, /<footer\b[^>]*class=["'][^"']*site-footer/i)) return html;

  if (has(html, /<\/main>/i)) {
    return html.replace(/<\/main>/i, `${buildFooter()}\n  </main>`);
  }

  if (has(html, /<\/body>/i)) {
    return html.replace(/<\/body>/i, `${buildFooter()}\n</body>`);
  }

  return html;
}

function ensureYearHookJs(js) {
  if (has(js, /document\.querySelector\(\s*["']\[data-year\]["']\s*\)/)) return js;

  if (has(js, /window\.addEventListener\(["']DOMContentLoaded["']/)) {
    return js.replace(
      /window\.addEventListener\(["']DOMContentLoaded["']\s*,\s*(\(\)\s*=>\s*\{|\w+\s*=>\s*\{|\w+\s*\)\s*=>\s*\{|\s*function\s*\(\)\s*\{)/,
      (m) => `${m}\n  const year = document.querySelector("[data-year]");\n  if (year) year.textContent = new Date().getFullYear();`
    );
  }

  return js + `

window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});
`;
}

function ensureUnlockHelpers(js) {
  let out = js;

  if (!has(out, "hasStoredAuth")) {
    out += `

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

  if (!has(out, "getUnlockedCategories")) {
    out += `

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

  if (!has(out, "unlockCategoryPage")) {
    out += `

function unlockCategoryPage() {
  const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
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

  return out;
}

function ensureDomContentLoadedInit(js, tier) {
  if (has(js, /window\.addEventListener\(["']DOMContentLoaded["']/)) return js;

  return js + `

window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  ${tier === "pro" ? `unlockCategoryPage();
  setTimeout(() => {
    unlockCategoryPage();
  }, 400);` : ""}
});
`;
}

function ensureLockedCard(html, tier, category) {
  if (tier !== "pro") return html;
  if (has(html, /id=["']lockedCard["']/i)) return html;
  if (!has(html, /id=["']toolCard["']/i)) return html;

  return html.replace(
    /<section[^>]*id=["']toolCard["'][^>]*>/i,
    `${buildLockedCard(category)}\n$&`
  );
}

function ensureResultsFallback(html) {
  if (has(html, /id=["']results["']/i)) return html;

  const analysisMatch = html.match(/id=["']analysis-copy["']/i);
  if (analysisMatch) {
    const sectionBefore = html.slice(0, analysisMatch.index).match(/<div\b[^>]*>/gi);
    if (sectionBefore && sectionBefore.length) {
      const lastDiv = sectionBefore[sectionBefore.length - 1];
      const lastDivIdx = html.lastIndexOf(lastDiv, analysisMatch.index);
      if (lastDivIdx !== -1) {
        return html.slice(0, lastDivIdx) +
          '<div id="results" class="results-grid" aria-live="polite">\n  <div class="muted">Enter values and calculate.</div>\n</div>\n' +
          html.slice(lastDivIdx);
      }
    }
  }

  return html;
}

function migrateHtml(file, reportItem) {
  let html = readText(file);
  if (!html) return { changed: false, reason: "missing html" };

  html = normalizeLineEndings(html);
  const before = html;

  const tier = detectTier(html, reportItem);
  const category = detectCategory(html, reportItem);

  html = ensurePillRow(html, tier);
  html = wrapToolCardSection(html);
  html = ensureResultsFallback(html);
  html = ensureLockedCard(html, tier, category);
  html = ensureFooter(html);

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

  js = ensureYearHookJs(js);

  if (reportItem.tier === "pro") {
    js = ensureUnlockHelpers(js);
  }

  js = ensureDomContentLoadedInit(js, reportItem.tier);

  if (js !== before) {
    ensureBackup(file);
    writeText(file, js);
    return { changed: true };
  }

  return { changed: false, reason: "no change" };
}

function main() {
  const report = loadReport();
  const items = report.filter((x) => x.mode === "standalone_analyzer" && x.issues.length);

  let htmlChanged = 0;
  let jsChanged = 0;
  let skipped = 0;

  for (const item of items) {
    const htmlFile = path.join(ROOT, item.file);
    const jsFile = path.join(ROOT, item.js);

    const htmlResult = migrateHtml(htmlFile, item);
    const jsResult = migrateJs(jsFile, item);

    if (htmlResult.changed) htmlChanged += 1;
    if (jsResult.changed) jsChanged += 1;
    if (!htmlResult.changed && !jsResult.changed) skipped += 1;

    console.log(item.file);
    console.log(`  html: ${htmlResult.changed ? "updated" : `skipped (${htmlResult.reason})`}`);
    console.log(`  js:   ${jsResult.changed ? "updated" : `skipped (${jsResult.reason})`}`);
  }

  console.log("");
  console.log("STANDALONE ANALYZER SHELL MIGRATION COMPLETE");
  console.log(`HTML files updated: ${htmlChanged}`);
  console.log(`JS files updated:   ${jsChanged}`);
  console.log(`Skipped:            ${skipped}`);
  console.log("Backups were created as *.bak before first modification.");
  console.log("Run the auditor again after this pass.");
}

main();