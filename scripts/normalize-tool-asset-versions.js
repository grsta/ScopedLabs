const fs = require("fs");
const path = require("path");

const ROOT = "E:/ScopedLabs/tools";

// Match the known-good RAID page
const VERSIONS = {
  style: "vs-raid-pro-017",
  auth: "0327",
  app: "0327",
  toolFlow: "19",
  catalog: "19",
  pipelines: "19",
  pipeline: "19",
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.toLowerCase() === "index.html") {
      results.push(filePath);
    }
  }

  return results;
}

function replaceAttr(html, regex, replacement) {
  if (!regex.test(html)) return { html, changed: false };
  const updated = html.replace(regex, replacement);
  return { html: updated, changed: updated !== html };
}

const files = walk(ROOT);
let changedCount = 0;

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");
  let changed = false;

  // Only touch actual tool pages, not category index pages
  const isToolPage =
    /data-tier\s*=\s*["'](free|pro)["']/i.test(html) ||
    /data-step\s*=\s*["'][^"']+["']/i.test(html) ||
    /class\s*=\s*["'][^"']*\btool-card\b[^"']*["']/i.test(html);

  if (!isToolPage) continue;

  let r;

  r = replaceAttr(
    html,
    /<link\s+rel="stylesheet"\s+href="\/assets\/style\.css\?v=[^"]*"\s*\/?>/i,
    `<link rel="stylesheet" href="/assets/style.css?v=${VERSIONS.style}" />`
  );
  html = r.html; changed ||= r.changed;

  r = replaceAttr(
    html,
    /<script\s+defer\s+src="\/assets\/auth\.js\?v=[^"]*"><\/script>/i,
    `<script defer src="/assets/auth.js?v=${VERSIONS.auth}"></script>`
  );
  html = r.html; changed ||= r.changed;

  r = replaceAttr(
    html,
    /<script\s+defer\s+src="\/assets\/app\.js\?v=[^"]*"><\/script>/i,
    `<script defer src="/assets/app.js?v=${VERSIONS.app}"></script>`
  );
  html = r.html; changed ||= r.changed;

  r = replaceAttr(
    html,
    /<script\s+src="\/assets\/tool-flow\.js\?v=[^"]*"><\/script>/i,
    `<script src="/assets/tool-flow.js?v=${VERSIONS.toolFlow}"></script>`
  );
  html = r.html; changed ||= r.changed;

  r = replaceAttr(
    html,
    /<script\s+src="\/assets\/catalog\.js\?v=[^"]*"><\/script>/i,
    `<script src="/assets/catalog.js?v=${VERSIONS.catalog}"></script>`
  );
  html = r.html; changed ||= r.changed;

  r = replaceAttr(
    html,
    /<script\s+src="\/assets\/pipelines\.js\?v=[^"]*"><\/script>/i,
    `<script src="/assets/pipelines.js?v=${VERSIONS.pipelines}"></script>`
  );
  html = r.html; changed ||= r.changed;

  r = replaceAttr(
    html,
    /<script\s+src="\/assets\/pipeline\.js\?v=[^"]*"><\/script>/i,
    `<script src="/assets/pipeline.js?v=${VERSIONS.pipeline}"></script>`
  );
  html = r.html; changed ||= r.changed;

  if (changed) {
    fs.writeFileSync(file, html, "utf8");
    changedCount++;
    console.log("Normalized:", file);
  }
}

console.log(`Done. Updated ${changedCount} tool pages.`);