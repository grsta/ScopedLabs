const fs = require("fs");
const path = require("path");

const root = process.cwd();
const cssPath = path.join(root, "assets", "style.css");
const STYLE_VERSION = "nav-tabs-004";

const start = "/* SCOPEDLABS BROWSER TAB NAV - START */";
const end = "/* SCOPEDLABS BROWSER TAB NAV - END */";

let css = fs.readFileSync(cssPath, "utf8");

// Remove any existing nav-tab block completely
const blockRegex = new RegExp(`${start}[\\s\\S]*?${end}\\s*`, "g");
css = css.replace(blockRegex, "").trimEnd();

const cleanBlock = `

${start}
.nav-tabs {
  display: flex !important;
  align-items: flex-end !important;
  justify-content: flex-end;
  gap: 8px !important;
  flex-wrap: wrap;
  min-height: 48px;
  padding: 0 !important;
  margin: 0;
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

  /* hard reset old pill/nav styling */
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  transform: none;
  isolation: isolate;
  overflow: visible;

  transition:
    color 160ms ease,
    transform 160ms ease;
}

.nav-tabs .nav-tab::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;

  /* real browser-tab shape: no clip-path, no slanted wedge */
  clip-path: none !important;

  background:
    linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.018)),
    rgba(10, 20, 22, 0.88);

  border: 1px solid rgba(255,255,255,0.10);
  border-bottom-color: rgba(120,255,120,0.22);
  border-radius: 14px 14px 0 0;

  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.07),
    0 8px 18px rgba(0,0,0,0.24);
}

.nav-tabs .nav-tab::after {
  content: "";
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
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
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  transform: translateY(-1px);
}

.nav-tabs .nav-tab:hover::before,
.nav-tabs .nav-tab:focus-visible::before {
  clip-path: none !important;
  background:
    linear-gradient(180deg, rgba(120,255,120,0.12), rgba(120,255,120,0.025)),
    rgba(16, 34, 28, 0.94);
  border-color: rgba(120,255,120,0.32);
  border-bottom-color: rgba(120,255,120,0.56);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.09),
    0 0 0 1px rgba(120,255,120,0.055),
    0 0 18px rgba(120,255,120,0.13),
    0 10px 22px rgba(0,0,0,0.30);
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
  }

  .nav-tabs .nav-tab {
    min-width: auto;
    height: 36px;
    padding: 0 14px !important;
    font-size: 0.86rem;
  }

  .nav-tabs .nav-tab::before {
    border-radius: 999px;
  }
}
${end}
`;

css = css + cleanBlock + "\n";
fs.writeFileSync(cssPath, css, "utf8");

// Bump style cache across all index.html files
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

const changed = [];

for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  const next = html.replace(
    /href="\/assets\/style\.css\?v=[^"]*"/g,
    `href="/assets/style.css?v=${STYLE_VERSION}"`
  );

  if (next !== html) {
    fs.writeFileSync(file, next, "utf8");
    changed.push(file.replace(root + path.sep, "").replace(/\\/g, "/"));
  }
}

console.log("Clean nav block installed.");
console.log("Style cache bumped to:", STYLE_VERSION);
console.table(changed.map(file => ({ file })));
