#!/usr/bin/env node
/**
 * ScopedLabs category-page migrator
 *
 * Goal:
 * - target tools/<category>/index.html pages
 * - add a category-level pipeline/design-flow feature card
 * - create .bak backups before first change
 *
 * Usage:
 *   node .\tools-migrate-category-pages.js
 *   node .\tools-migrate-category-pages.js E:\ScopedLabs
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

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function getCategorySlug(indexPath) {
  const parts = rel(indexPath).split("/");
  return parts.length >= 3 ? parts[1] : "category";
}

function getCategoryLabel(html, indexPath) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, "").trim();

  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (title) {
    return title[1]
      .replace(/&amp;/g, "&")
      .replace(/\*ScopedLabs|• ScopedLabs|\| ScopedLabs|ScopedLabs/gi, "")
      .trim();
  }

  const slug = getCategorySlug(indexPath);
  return slug
    .split("-")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function detectPipelineHref(categorySlug) {
  const known = {
    "physical-security": "/tools/physical-security/scene-illumination/",
    "power": "/tools/power/va-watts-amps/",
    "network": "/tools/network/poe-budget/",
    "video-storage": "/tools/video-storage/bitrate-estimator/",
    "compute": "/tools/compute/cpu-sizing/",
    "wireless": "/tools/wireless/channel-overlap/",
    "infrastructure": "/tools/infrastructure/rack-ru-planner/",
    "thermal": "/tools/thermal/heat-load-estimator/",
    "performance": "/tools/performance/cache-hit-ratio/",
    "access-control": "/tools/access-control/reader-type-selector/"
  };

  return known[categorySlug] || `/tools/${categorySlug}/`;
}

function buildCategoryPipelineCard(categoryLabel, categorySlug, href) {
  return `
      <section class="card" data-auto-category-pipeline-card="true" style="margin-top: 18px; border-color: rgba(120,255,120,0.18);">
        <div class="pill pill--free" style="margin-bottom: 10px; width: fit-content;">Design Flow</div>
        <h2 class="h3" style="margin-top: 0;">Start the ${categoryLabel} design flow</h2>
        <p class="muted" style="margin-bottom: 0;">
          This category includes a guided pipeline so users can move step by step through the core design decisions instead of jumping between isolated tools.
        </p>
        <p class="muted" style="margin-top: 12px; margin-bottom: 0;">
          Update this card later with the exact category-specific flow summary and mini pipeline preview if needed.
        </p>
        <div class="btn-row" style="margin-top: 14px;">
          <a class="btn btn-primary" href="${href}">Start Pipeline</a>
        </div>
      </section>
`;
}

function insertAfterFirstIntroCard(html, cardHtml) {
  const mainMatch = html.match(/<main[\s\S]*?>[\s\S]*?<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>/i);
  if (!mainMatch) return { changed: false, text: html };

  const searchStart = mainMatch.index + mainMatch[0].length;
  const afterStart = html.slice(searchStart);

  const firstSectionMatch = afterStart.match(/<section\b[\s\S]*?<\/section>/i);
  if (!firstSectionMatch) return { changed: false, text: html };

  const insertAt = searchStart + firstSectionMatch.index + firstSectionMatch[0].length;
  return {
    changed: true,
    text: html.slice(0, insertAt) + "\n" + cardHtml + html.slice(insertAt)
  };
}

function insertAfterSubhead(html, cardHtml) {
  const subheadMatch = html.match(/<p[^>]*class=["'][^"']*subhead[^"']*["'][^>]*>[\s\S]*?<\/p>/i);
  if (!subheadMatch) return { changed: false, text: html };

  const insertAt = subheadMatch.index + subheadMatch[0].length;
  return {
    changed: true,
    text: html.slice(0, insertAt) + "\n" + cardHtml + html.slice(insertAt)
  };
}

function migrateCategoryPage(file) {
  let html = readText(file);
  if (!html) return { changed: false, reason: "missing html" };

  html = normalizeLineEndings(html);

  if (has(html, /data-auto-category-pipeline-card=["']true["']/i) || has(html, /Start the .* design flow/i)) {
    return { changed: false, reason: "card already present" };
  }

  const categorySlug = getCategorySlug(file);
  const categoryLabel = getCategoryLabel(html, file);
  const href = detectPipelineHref(categorySlug);
  const card = buildCategoryPipelineCard(categoryLabel, categorySlug, href);

  let result = insertAfterSubhead(html, card);
  if (!result.changed) {
    result = insertAfterFirstIntroCard(html, card);
  }
  if (!result.changed) {
    return { changed: false, reason: "could not find insertion point" };
  }

  ensureBackup(file);
  writeText(file, result.text);
  return { changed: true, href, categoryLabel };
}

function main() {
  const report = loadReport();
  const categoryPages = report.filter((x) => x.mode === "category_index");

  let changed = 0;
  let skipped = 0;

  for (const item of categoryPages) {
    const file = path.join(ROOT, item.file);
    const result = migrateCategoryPage(file);

    console.log(item.file);
    if (result.changed) {
      changed += 1;
      console.log(`  updated`);
      console.log(`  pipeline href: ${result.href}`);
    } else {
      skipped += 1;
      console.log(`  skipped (${result.reason})`);
    }
  }

  console.log("");
  console.log("CATEGORY PAGE MIGRATION COMPLETE");
  console.log(`Updated: ${changed}`);
  console.log(`Skipped: ${skipped}`);
  console.log("Backups were created as *.bak before first modification.");
  console.log("Run the auditor again after this pass.");
}

main();