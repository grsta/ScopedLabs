const fs = require("fs");
const path = require("path");

const root = process.cwd();

const STYLE_VERSION = "nav-tabs-017";
const HELP_VERSION = "help-012";

const parked = new Set([
  "tools/power/ups-runtime-advanced/index.html"
]);

function rel(file) {
  return file.replace(root + path.sep, "").replace(/\\/g, "/");
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

const changed = [];

/* 1) Repair auth callback page lightly without overwriting its existing logic */
const callbackPath = path.join(root, "auth", "callback", "index.html");

if (fs.existsSync(callbackPath)) {
  let html = fs.readFileSync(callbackPath, "utf8");
  const before = html;

  if (!/\/assets\/style\.css/i.test(html)) {
    html = html.replace(
      /<\/head>/i,
      `  <link rel="stylesheet" href="/assets/style.css?v=${STYLE_VERSION}" />\n</head>`
    );
  }

  if (!/<main\b/i.test(html)) {
    html = html.replace(
      /<body([^>]*)>/i,
      `<body$1>
  <main class="container">
    <section class="hero hero--tight">
      <h1 class="h1">Signing you in…</h1>
      <p class="subhead">
        ScopedLabs is finishing your sign-in. If this page does not redirect automatically,
        return to your account page and try again.
      </p>
      <div class="btn-row">
        <a class="btn btn-primary" href="/account/">Go to account</a>
        <a class="btn btn-ghost" href="/tools/">Browse tools</a>
      </div>
    </section>
  </main>`
    );
  }

  if (!/site-footer/.test(html)) {
    html = html.replace(
      /<\/body>/i,
      `  <footer class="site-footer">
    <div class="muted">© <span data-year></span> ScopedLabs</div>
    <div class="footer-links">
      <a href="/tools/">Tools</a>
      <a href="/upgrade/">Upgrade</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/changelog/">Changelog</a>
      <a href="/disclaimer/">Disclaimer</a>
    </div>
  </footer>
</body>`
    );
  }

  if (html !== before) {
    fs.writeFileSync(callbackPath, html, "utf8");
    changed.push({ file: rel(callbackPath), action: "repaired auth callback shell" });
  }
}

/* 2) Normalize style.css cache version site-wide */
for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  html = html.replace(
    /href=(["'])([^"']*\/assets\/style\.css)(?:\?v=[^"']*)?\1/gi,
    `href="$2?v=${STYLE_VERSION}"`
  );

  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    changed.push({ file: rel(file), action: `style -> ${STYLE_VERSION}` });
  }
}

/* 3) Normalize active help.js cache version, excluding parked Gold tool */
for (const file of walk(path.join(root, "tools"))) {
  const relative = rel(file);
  if (parked.has(relative)) continue;

  let html = fs.readFileSync(file, "utf8");
  const before = html;

  if (/\/assets\/help\.js/i.test(html)) {
    html = html.replace(
      /src=(["'])\/assets\/help\.js(?:\?v=[^"']*)?\1/gi,
      `src="/assets/help.js?v=${HELP_VERSION}"`
    );
  }

  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    changed.push({ file: relative, action: `help -> ${HELP_VERSION}` });
  }
}

/* 4) Update the audit expectation to the current style version */
const auditPath = path.join(root, "scripts", "launch-readiness-audit.js");

if (fs.existsSync(auditPath)) {
  let audit = fs.readFileSync(auditPath, "utf8");
  const before = audit;

  audit = audit.replace(
    /const EXPECTED_STYLE_VERSION = "nav-tabs-\d+";/,
    `const EXPECTED_STYLE_VERSION = "${STYLE_VERSION}";`
  );

  if (audit !== before) {
    fs.writeFileSync(auditPath, audit, "utf8");
    changed.push({ file: rel(auditPath), action: `audit expects ${STYLE_VERSION}` });
  }
}

console.log("Launch-readiness repairs complete.");
console.table(changed);
