const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "1";

const faviconBlock = `
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png?v=${VERSION}">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon/favicon-16x16.png?v=${VERSION}">
<link rel="shortcut icon" href="/assets/favicon/favicon.ico?v=${VERSION}">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png?v=${VERSION}">
<link rel="manifest" href="/assets/favicon/site.webmanifest?v=${VERSION}">
<meta name="theme-color" content="#0b0f10">
`.trim();

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".vscode",
  "dist",
  "build",
  ".cache"
]);

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

function alreadyHasFavicon(html) {
  return (
    html.includes('href="/assets/favicon/favicon-32x32.png') ||
    html.includes("href='/assets/favicon/favicon-32x32.png") ||
    html.includes('href="/assets/favicon/favicon.ico') ||
    html.includes("href='/assets/favicon/favicon.ico")
  );
}

function injectIntoHead(html, filePath) {
  if (alreadyHasFavicon(html)) {
    console.log(`SKIP (already has favicon): ${filePath}`);
    return { changed: false, content: html };
  }

  const headCloseMatch = html.match(/<\/head>/i);
  if (!headCloseMatch) {
    console.log(`SKIP (no </head>): ${filePath}`);
    return { changed: false, content: html };
  }

  const updated = html.replace(/<\/head>/i, `  ${faviconBlock}\n</head>`);
  console.log(`UPDATED: ${filePath}`);
  return { changed: true, content: updated };
}

function main() {
  const htmlFiles = walk(ROOT);
  let changedCount = 0;

  for (const filePath of htmlFiles) {
    const original = fs.readFileSync(filePath, "utf8");
    const result = injectIntoHead(original, filePath);

    if (result.changed) {
      fs.writeFileSync(filePath, result.content, "utf8");
      changedCount += 1;
    }
  }

  console.log(`\nDone. Updated ${changedCount} HTML file(s).`);
}

main();