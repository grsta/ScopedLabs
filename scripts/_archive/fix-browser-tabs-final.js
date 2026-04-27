const fs = require("fs");
const path = require("path");

const root = process.cwd();
const stylePath = path.join(root, "assets", "style.css");
const NAV_VERSION = "nav-tabs-007";

const NEW_BLOCK = `/* SCOPEDLABS BROWSER TAB NAV - START */
.site-header {
  position: relative;
  z-index: 40;
  border-bottom: 1px solid rgba(120, 255, 120, 0.14);
}

.site-header .header-inner {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  min-height: 74px;
  padding-top: 12px;
  padding-bottom: 0;
}

.site-header .brand {
  margin-bottom: 14px;
}

.site-header .nav-tabs {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-left: auto;
  margin-bottom: -1px; /* makes tabs sit directly on the header rule */
  position: relative;
  z-index: 3;
}

.site-header .nav-tabs .nav-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 86px;
  height: 42px;
  padding: 0 18px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.84);

  border: 1px solid rgba(120, 255, 120, 0.14);
  border-bottom: none;
  border-radius: 14px 14px 0 0;

  background: linear-gradient(
    180deg,
    rgba(18, 29, 26, 0.98) 0%,
    rgba(8, 14, 13, 0.99) 100%
  );

  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 24px rgba(0, 0, 0, 0.22);

  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

/* remove any old wedge/trapezoid look */
.site-header .nav-tabs .nav-tab,
.site-header .nav-tabs .nav-tab::before,
.site-header .nav-tabs .nav-tab::after {
  clip-path: none !important;
}

/* browser-tab lower corner flow into the header rule */
.site-header .nav-tabs .nav-tab::before,
.site-header .nav-tabs .nav-tab::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 14px;
  height: 14px;
  pointer-events: none;
}

.site-header .nav-tabs .nav-tab::before {
  left: -14px;
  border-bottom-right-radius: 14px;
  box-shadow: 7px 7px 0 0 rgba(8, 14, 13, 0.99);
}

.site-header .nav-tabs .nav-tab::after {
  right: -14px;
  border-bottom-left-radius: 14px;
  box-shadow: -7px 7px 0 0 rgba(8, 14, 13, 0.99);
}

.site-header .nav-tabs .nav-tab:hover,
.site-header .nav-tabs .nav-tab:focus-visible {
  color: #ffffff;
  border-color: rgba(120, 255, 120, 0.24);
  background: linear-gradient(
    180deg,
    rgba(24, 38, 34, 0.99) 0%,
    rgba(10, 18, 16, 1) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 12px 26px rgba(0, 0, 0, 0.24);
}

.site-header .nav-tabs .nav-tab[aria-current="page"],
.site-header .nav-tabs .nav-tab.is-active {
  color: #f4fff1;
  border-color: rgba(120, 255, 120, 0.38);
  background: linear-gradient(
    180deg,
    rgba(32, 76, 44, 0.98) 0%,
    rgba(11, 28, 18, 1) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(220, 255, 220, 0.10),
    0 0 0 1px rgba(120, 255, 120, 0.06),
    0 12px 28px rgba(0, 0, 0, 0.24);
}

@media (max-width: 900px) {
  .site-header .header-inner {
    min-height: 70px;
  }

  .site-header .nav-tabs {
    gap: 8px;
  }

  .site-header .nav-tabs .nav-tab {
    min-width: auto;
    padding: 0 15px;
    height: 40px;
    font-size: 0.92rem;
  }
}

@media (max-width: 680px) {
  .site-header .header-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding-bottom: 0;
  }

  .site-header .brand {
    margin-bottom: 0;
  }

  .site-header .nav-tabs {
    margin-left: 0;
    flex-wrap: wrap;
    width: 100%;
    margin-bottom: -1px;
  }
}
/* SCOPEDLABS BROWSER TAB NAV - END */`;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === ".wrangler"
    ) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

function updateStyleCss() {
  let css = fs.readFileSync(stylePath, "utf8");

  const blockRegex =
    /\/\* SCOPEDLABS BROWSER TAB NAV - START \*\/[\s\S]*?\/\* SCOPEDLABS BROWSER TAB NAV - END \*\//g;

  css = css.replace(blockRegex, "").trimEnd();
  css += "\n\n" + NEW_BLOCK + "\n";

  fs.writeFileSync(stylePath, css, "utf8");
  console.log("UPDATED:", path.relative(root, stylePath));
}

function updateHtmlVersions() {
  const htmlFiles = walk(root);
  let changed = 0;

  for (const file of htmlFiles) {
    let html = fs.readFileSync(file, "utf8");
    const before = html;

    html = html.replace(
      /href=(["'])([^"']*assets\/style\.css)(?:\?v=[^"']*)?\1/gi,
      `href="$2?v=${NAV_VERSION}"`
    );

    if (html !== before) {
      fs.writeFileSync(file, html, "utf8");
      changed++;
      console.log("PATCHED:", path.relative(root, file));
    }
  }

  console.log(`HTML files updated: ${changed}`);
}

updateStyleCss();
updateHtmlVersions();

console.log("\\nDone.");
console.log(`Use hard refresh after push: Ctrl+F5`);