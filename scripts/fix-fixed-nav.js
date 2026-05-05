const fs = require("fs");
const path = require("path");

const root = process.cwd();
const cssPath = path.join(root, "assets", "style.css");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) walk(full, out);
    if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }

  return out;
}

let css = read(cssPath);

/* Remove the first failed attempt completely */
css = css.replace(
  /\/\* ScopedLabs fixed header override[\s\S]*?(?=\/\*|$)/g,
  ""
);

/* Add corrected fixed header block */
const fixedBlock = `
/* ScopedLabs fixed header override — nav-tabs-021 */
:root {
  --sl-fixed-header-height: 96px;
}

html {
  scroll-padding-top: calc(var(--sl-fixed-header-height) + 18px);
}

body {
  padding-top: var(--sl-fixed-header-height);
}

.site-header {
  position: fixed !important;
  top: 0 !important;
  inset-inline: 0 !important;
  z-index: 9999 !important;
  width: 100% !important;
  transform: none !important;
}

@media (max-width: 720px) {
  :root {
    --sl-fixed-header-height: 118px;
  }
}
`;

css = css.trimEnd() + "\n\n" + fixedBlock + "\n";
write(cssPath, css);

/* Bump CSS cache references */
let touched = 0;
for (const file of walk(root)) {
  const before = read(file);
  const after = before.replace(
    /\/assets\/style\.css\?v=[^"]+/g,
    "/assets/style.css?v=nav-tabs-021"
  );

  if (after !== before) {
    write(file, after);
    touched++;
  }
}

console.log("Fixed nav override repaired.");
console.log(`HTML cache references updated: ${touched}`);
console.log("Version: nav-tabs-021");