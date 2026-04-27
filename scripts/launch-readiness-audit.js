const fs = require("fs");
const path = require("path");

const root = process.cwd();

const ACTIVE_CATEGORIES = new Set([
  "access-control",
  "compute",
  "infrastructure",
  "network",
  "performance",
  "physical-security",
  "power",
  "thermal",
  "video-storage",
  "wireless"
]);

const PARKED = new Set([
  "tools/power/ups-runtime-advanced/index.html"
]);

const EXPECTED_STYLE_VERSION = "nav-tabs-017";
const EXPECTED_HELP_VERSION = "help-012";

const issues = [];

function rel(file) {
  return file.replace(root + path.sep, "").replace(/\\/g, "/");
}

function add(severity, area, file, detail) {
  issues.push({
    severity,
    area,
    file,
    detail
  });
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      walk(full, files);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      files.push(full);
    }
  }

  return files;
}

function isActivePage(relative) {
  return !PARKED.has(relative);
}

function isActiveToolPage(relative) {
  const parts = relative.split("/");
  return (
    parts.length === 4 &&
    parts[0] === "tools" &&
    ACTIVE_CATEGORIES.has(parts[1]) &&
    parts[3] === "index.html" &&
    !PARKED.has(relative)
  );
}

function linkTargetExists(href) {
  if (!href || href.startsWith("#")) return true;
  if (/^(https?:)?\/\//i.test(href)) return true;
  if (/^(mailto:|tel:|javascript:)/i.test(href)) return true;

  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return true;

  if (clean.startsWith("/assets/")) return true;
  if (clean.startsWith("/api/")) return true;

  const target = path.join(root, clean);

  if (clean.endsWith("/")) {
    return fs.existsSync(path.join(target, "index.html"));
  }

  if (path.extname(clean)) {
    return fs.existsSync(target);
  }

  return fs.existsSync(path.join(target, "index.html")) || fs.existsSync(target);
}

const htmlFiles = walk(root);
const activeHtmlFiles = htmlFiles.filter(file => isActivePage(rel(file)));

for (const file of htmlFiles) {
  const relative = rel(file);
  const active = isActivePage(relative);
  const html = fs.readFileSync(file, "utf8");
  const size = Buffer.byteLength(html, "utf8");

  if (!active) {
    add("INFO", "parked", relative, "Excluded parked/future tool from active launch audit.");
    continue;
  }

  if (size < 500) {
    add("FAIL", "blank-or-small-page", relative, `File looks too small: ${size} bytes`);
  }

  if (!/<!doctype html>/i.test(html)) {
    add("FAIL", "html-structure", relative, "Missing <!doctype html>.");
  }

  if (!/<title>[\s\S]*?<\/title>/i.test(html)) {
    add("FAIL", "html-structure", relative, "Missing <title>.");
  }

  if (!/<main\b/i.test(html)) {
    add("WARN", "html-structure", relative, "Missing <main> element.");
  }

  if (/[ÃÂ�]/.test(html) || /â€|â€¢|â€™|â€œ|â€|â€“|â€”/.test(html)) {
    add("WARN", "encoding", relative, "Possible mojibake/encoding artifact found.");
  }

  const styleMatch = html.match(/href=["'][^"']*\/assets\/style\.css(?:\?v=([^"']+))?["']/i);
  if (!styleMatch) {
    add("FAIL", "style", relative, "Missing /assets/style.css reference.");
  } else if (styleMatch[1] !== EXPECTED_STYLE_VERSION) {
    add("WARN", "style", relative, `style.css version is ${styleMatch[1] || "(none)"}, expected ${EXPECTED_STYLE_VERSION}.`);
  }

  const appCount = (html.match(/\/assets\/app\.js/g) || []).length;
  if (appCount > 1) {
    add("WARN", "scripts", relative, `Duplicate /assets/app.js references found: ${appCount}`);
  }

  if (/<header class="site-header">/i.test(html)) {
    if (!/nav-tabs/.test(html)) {
      add("WARN", "nav", relative, "Header exists but nav-tabs was not found.");
    }

    if (!/href="\/account\/"/.test(html)) {
      add("WARN", "nav", relative, "Header nav missing Account link.");
    }
  }

  if (!/site-footer/.test(html)) {
    add("WARN", "footer", relative, "Missing site-footer.");
  } else {
    if (!/footer-links/.test(html)) {
      add("WARN", "footer", relative, "Missing footer-links.");
    }

    if (!/href="\/changelog\/"/.test(html)) {
      add("WARN", "footer", relative, "Missing Changelog footer link.");
    }

    if (!/href="\/disclaimer\/"/.test(html)) {
      add("WARN", "footer", relative, "Missing Disclaimer footer link.");
    }
  }

  if (/\bcoming\b/i.test(html)) {
    const m = html.match(/.{0,80}\bcoming\b.{0,120}/i);
    add("WARN", "stale-copy", relative, `Standalone "coming" found: ${m ? m[0].replace(/\s+/g, " ").trim() : ""}`);
  }

  if (/Export\s*&\s*documentation/i.test(html)) {
    add("WARN", "stale-copy", relative, "Old 'Export & documentation' wording found.");
  }

  if (/View Pro features/.test(html)) {
    add("WARN", "stale-copy", relative, "Button casing found: 'View Pro features'.");
  }

  if (isActiveToolPage(relative)) {
    const helpMatch = html.match(/\/assets\/help\.js(?:\?v=([^"']+))?/i);

    if (!helpMatch) {
      add("FAIL", "knowledge-base", relative, "Active tool page missing /assets/help.js.");
    } else if (helpMatch[1] && helpMatch[1] !== EXPECTED_HELP_VERSION) {
      add("WARN", "knowledge-base", relative, `help.js version is ${helpMatch[1]}, expected ${EXPECTED_HELP_VERSION}.`);
    }
  }

  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
  const checked = new Set();

  for (const href of hrefs) {
    if (checked.has(href)) continue;
    checked.add(href);

    if (!linkTargetExists(href)) {
      add("FAIL", "internal-link", relative, `Broken internal link target: ${href}`);
    }
  }
}

/* Help JSON folder counts */
const helpToolsDir = path.join(root, "assets", "help", "tools");

if (!fs.existsSync(helpToolsDir)) {
  add("FAIL", "knowledge-base", "assets/help/tools", "Missing help tools directory.");
} else {
  for (const category of ACTIVE_CATEGORIES) {
    const dir = path.join(helpToolsDir, category);

    if (!fs.existsSync(dir)) {
      add("FAIL", "knowledge-base", `assets/help/tools/${category}`, "Missing category help folder.");
      continue;
    }

    const count = fs.readdirSync(dir).filter(name => name.endsWith(".json")).length;

    if (count !== 10) {
      add("WARN", "knowledge-base", `assets/help/tools/${category}`, `Expected 10 JSON files, found ${count}.`);
    }
  }
}

/* Temporary scripts review */
const scriptsDir = path.join(root, "scripts");
const approvedScripts = new Set([
  "launch-readiness-audit.js",
  "check-tools.js",
  "audit-supabase-config.js",
  "normalize-tool-asset-versions.js",
  "sync-pipeline-lane.js"
]);

if (fs.existsSync(scriptsDir)) {
  const scripts = fs.readdirSync(scriptsDir).filter(name => name.endsWith(".js"));

  for (const script of scripts) {
    if (!approvedScripts.has(script)) {
      add("INFO", "scripts-review", `scripts/${script}`, "Review whether this helper script should stay, be archived, or be deleted.");
    }
  }
}

const fail = issues.filter(i => i.severity === "FAIL");
const warn = issues.filter(i => i.severity === "WARN");
const info = issues.filter(i => i.severity === "INFO");

console.log("\nSCOPEDLABS LAUNCH-READINESS AUDIT");
console.log("=================================");
console.log("HTML pages scanned:", htmlFiles.length);
console.log("Active pages scanned:", activeHtmlFiles.length);
console.log("FAIL:", fail.length);
console.log("WARN:", warn.length);
console.log("INFO:", info.length);

function printGroup(title, rows) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));

  if (!rows.length) {
    console.log("None");
    return;
  }

  console.table(rows);
}

printGroup("FAIL ITEMS", fail);
printGroup("WARN ITEMS", warn);
printGroup("INFO / MANUAL REVIEW", info);

if (!fail.length && !warn.length) {
  console.log("\nRESULT: CLEAN launch-readiness audit.");
} else if (!fail.length) {
  console.log("\nRESULT: No blocking failures. Review warnings before launch.");
} else {
  console.log("\nRESULT: Blocking failures found. Repair FAIL items first.");
}
