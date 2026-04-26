const fs = require("fs");
const path = require("path");

const root = process.cwd();
const cssPath = path.join(root, "assets", "style.css");
const STYLE_VERSION = "nav-tabs-006";

const LINKS = [
  { id: "home", label: "Home", href: "/" },
  { id: "tools", label: "Tools", href: "/tools/" },
  { id: "about", label: "About", href: "/about/" },
  { id: "contact", label: "Contact", href: "/contact/" },
  { id: "account", label: "Account", href: "/account/" }
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      walk(full, files);
    } else if (entry.isFile() && entry.name === "index.html") {
      files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return file.replace(root + path.sep, "").replace(/\\/g, "/");
}

function currentTopLevel(relative) {
  if (relative === "index.html") return "home";
  if (relative === "tools/index.html") return "tools";
  if (relative === "about/index.html") return "about";
  if (relative === "contact/index.html") return "contact";
  if (relative === "account/index.html") return "account";
  return null;
}

function buildNav(relative) {
  const current = currentTopLevel(relative);

  return LINKS
    .filter(link => link.id !== current)
    .map(link => `        <a class="nav-tab" href="${link.href}">${link.label}</a>`)
    .join("\n");
}

function updateHtml(file) {
  let html = fs.readFileSync(file, "utf8");
  const relative = rel(file);

  const navMatch = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i);
  if (!navMatch) return { file: relative, changed: false, reason: "no nav found" };

  const oldNav = navMatch[0];

  const newNav = `      <nav class="nav site-nav nav-tabs" aria-label="Primary">
${buildNav(relative)}
      </nav>`;

  let next = html.replace(oldNav, newNav);

  // Bump every style.css reference, whether it already has a version or not.
  next = next.replace(
    /href="\/assets\/style\.css(?:\?v=[^"]*)?"/g,
    `href="/assets/style.css?v=${STYLE_VERSION}"`
  );

  if (next !== html) {
    fs.writeFileSync(file, next, "utf8");
    return { file: relative, changed: true, reason: "updated" };
  }

  return { file: relative, changed: false, reason: "no change" };
}

function updateCss() {
  let css = fs.readFileSync(cssPath, "utf8");
  const lines = css.split(/\r?\n/);

  // Remove every old duplicate browser-tab nav block.
  const cleaned = [];
  let skipping = false;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper.includes("SCOPEDLABS BROWSER TAB NAV") && upper.includes("START")) {
      skipping = true;
      continue;
    }

    if (skipping && upper.includes("SCOPEDLABS BROWSER TAB NAV") && upper.includes("END")) {
      skipping = false;
      continue;
    }

    if (!skipping) cleaned.push(line);
  }

  const block = `
/* SCOPEDLABS BROWSER TAB NAV - START */
.nav-tabs {
  display: flex !important;
  align-items: flex-end !important;
  justify-content: flex-end;
  gap: 8px !important;
  flex-wrap: wrap;
  min-height: 44px;
  padding: 0 !important;
  margin: 0 0 -1px 0 !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.nav-tabs .nav-tab {
  position: relative;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;

  min-width: 112px;
  height: 42px;
  padding: 0 20px !important;
  margin: 0 !important;

  color: rgba(255, 255, 255, 0.78) !important;
  text-decoration: none !important;
  font-size: 0.94rem;
  font-weight: 750;
  letter-spacing: 0.01em;
  line-height: 1;

  background:
    linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.018)),
    rgba(10, 20, 22, 0.88) !important;

  border: 1px solid rgba(255,255,255,0.10) !important;
  border-bottom-color: rgba(120,255,120,0.22) !important;
  border-radius: 14px 14px 0 0 !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.07),
    0 8px 18px rgba(0,0,0,0.24) !important;

  outline: none !important;
  transform: none;
  isolation: isolate;
  overflow: visible;

  transition:
    color 160ms ease,
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

/* hard-disable old pseudo-shape tab rules */
.nav-tabs .nav-tab::before {
  content: none !important;
  display: none !important;
  clip-path: none !important;
}

.nav-tabs .nav-tab::after {
  content: "";
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: -1px;
  height: 2px;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
  opacity: 0;
  transition:
    background 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
}

.nav-tabs .nav-tab:hover,
.nav-tabs .nav-tab:focus-visible {
  color: rgba(235, 255, 240, 0.98) !important;

  background:
    linear-gradient(180deg, rgba(120,255,120,0.12), rgba(120,255,120,0.025)),
    rgba(16, 34, 28, 0.94) !important;

  border-color: rgba(120,255,120,0.32) !important;
  border-bottom-color: rgba(120,255,120,0.56) !important;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.09),
    0 0 0 1px rgba(120,255,120,0.055),
    0 0 18px rgba(120,255,120,0.13),
    0 10px 22px rgba(0,0,0,0.30) !important;

  transform: translateY(-1px);
}

.nav-tabs .nav-tab:hover::after,
.nav-tabs .nav-tab:focus-visible::after {
  background: rgba(120,255,120,0.95);
  box-shadow: 0 0 12px rgba(120,255,120,0.45);
  opacity: 1;
}

.nav-tabs a,
.nav-tabs a:hover,
.nav-tabs a:focus,
.nav-tabs a:focus-visible {
  text-decoration: none !important;
}

@media (max-width: 860px) {
  .nav-tabs {
    width: 100%;
    justify-content: center;
    gap: 6px !important;
    min-height: auto;
    padding-top: 8px !important;
    margin-bottom: 0 !important;
  }

  .nav-tabs .nav-tab {
    min-width: auto;
    height: 36px;
    padding: 0 14px !important;
    font-size: 0.86rem;
    border-radius: 999px !important;
  }

  .nav-tabs .nav-tab::after {
    bottom: 2px;
  }
}
/* SCOPEDLABS BROWSER TAB NAV - END */
`;

  css = cleaned.join("\n").trimEnd() + "\n\n" + block + "\n";
  fs.writeFileSync(cssPath, css, "utf8");
}

const results = walk(root).map(updateHtml);
updateCss();

console.log("Forced nav normalization complete.");
console.log("Style cache bumped to:", STYLE_VERSION);
console.table(results.filter(r => r.changed));
console.log("Skipped:");
console.table(results.filter(r => !r.changed));
