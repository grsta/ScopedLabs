const fs = require("fs");
const path = require("path");

const root = process.cwd();
const today = "2026-05-05";
const cssVersion = "nav-tabs-022";

const styleRel = "assets/style.css";
const sitemapRel = "sitemap.xml";
const guidesRel = "guides/index.html";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }

  return out;
}

function relFromFull(full) {
  return path.relative(root, full).replace(/\\/g, "/");
}

function navFor(rel) {
  const isHome = rel === "index.html";
  const isTools = rel === "tools/index.html" || rel.startsWith("tools/") || rel === "guides/index.html" || rel.startsWith("guides/");
  const isAbout = rel === "about/index.html" || rel.startsWith("about/");
  const isContact = rel === "contact/index.html" || rel.startsWith("contact/");
  const isAccount = rel === "account/index.html" || rel.startsWith("account/");

  const homeCurrent = isHome ? ' aria-current="page"' : "";
  const toolsCurrent = isTools ? ' aria-current="page"' : "";
  const aboutCurrent = isAbout ? ' aria-current="page"' : "";
  const contactCurrent = isContact ? ' aria-current="page"' : "";
  const accountCurrent = isAccount ? ' aria-current="page"' : "";

  const homeActive = isHome ? " is-active" : "";
  const toolsActive = isTools ? " is-active" : "";
  const aboutActive = isAbout ? " is-active" : "";
  const contactActive = isContact ? " is-active" : "";
  const accountActive = isAccount ? " is-active" : "";

  return `      <nav class="nav site-nav nav-tabs" aria-label="Primary">
        <a class="nav-tab${homeActive}" href="/"${homeCurrent}>Home</a>

        <details class="nav-dropdown${toolsActive}">
          <summary class="nav-tab nav-dropdown-toggle${toolsActive}"${toolsCurrent}>
            Tools
            <span class="nav-caret" aria-hidden="true">▾</span>
          </summary>
          <div class="nav-dropdown-menu" aria-label="Tools submenu">
            <a class="nav-dropdown-item" href="/tools/">All Tools</a>
            <a class="nav-dropdown-item" href="/guides/">Planning Guides</a>
          </div>
        </details>

        <a class="nav-tab${aboutActive}" href="/about/"${aboutCurrent}>About</a>
        <a class="nav-tab${contactActive}" href="/contact/"${contactCurrent}>Contact</a>
        <a class="nav-tab${accountActive}" href="/account/"${accountCurrent}>Account</a>
      </nav>`;
}

const guideCards = [
  {
    title: "Access Control",
    href: "/guides/access-control-planning/",
    desc: "Plan fail-safe and fail-secure behavior, reader selection, lock power, panel capacity, and access level structure."
  },
  {
    title: "Compute",
    href: "/guides/compute-planning/",
    desc: "Walk through CPU, RAM, storage IOPS, throughput, VM density, GPU, power, thermal, RAID, and backup-window planning."
  },
  {
    title: "Infrastructure",
    href: "/guides/infrastructure-planning/",
    desc: "Estimate room footprint, rack space, equipment spacing, rack weight, floor loading, UPS room needs, and generator runtime."
  },
  {
    title: "Network & Throughput",
    href: "/guides/network-throughput-planning/",
    desc: "Plan PoE budget, bandwidth demand, uplink oversubscription, latency, MTU, VPN overhead, packet loss, jitter, and failure behavior."
  },
  {
    title: "Performance",
    href: "/guides/performance-planning/",
    desc: "Review response targets, latency, throughput, queues, concurrency, CPU, disk, network, cache, bottlenecks, and headroom."
  },
  {
    title: "Physical Security",
    href: "/guides/physical-security-planning/",
    desc: "Plan camera lighting, mounting, field of view, coverage, spacing, blind spots, pixel density, lenses, and capture range."
  },
  {
    title: "Power & Runtime",
    href: "/guides/power-runtime-planning/",
    desc: "Estimate device load, VA, watts, amps, load growth, UPS runtime, battery sizing, reserve, and supporting runtime checks."
  },
  {
    title: "Thermal",
    href: "/guides/thermal-planning/",
    desc: "Estimate heat load, PSU losses, BTU conversion, rack density, airflow, fan CFM, aisle behavior, ambient rise, and cooling capacity."
  },
  {
    title: "Video & Storage",
    href: "/guides/video-storage-planning/",
    desc: "Plan video bitrate, usable storage, retention, RAID impact, survivability, codec effects, compression, archive cost, and failure exposure."
  },
  {
    title: "Wireless",
    href: "/guides/wireless-planning/",
    desc: "Plan coverage radius, channel overlap, RF noise margin, client density, AP capacity, link budget, backhaul, PtP links, and roaming."
  }
];

const cardsHtml = guideCards.map((card) => `      <a class="card" href="${card.href}">
        <div class="card-top"><span class="pill">Planning Guide</span></div>
        <h2 class="h2">${card.title}</h2>
        <p class="muted">${card.desc}</p>
      </a>`).join("\n\n");

const guidesHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Planning Guides | ScopedLabs</title>
  <meta name="description" content="Browse ScopedLabs planning guides for access control, compute, infrastructure, network, performance, physical security, power, thermal, video storage, and wireless design workflows.">
  <link rel="canonical" href="https://scopedlabs.com/guides/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ScopedLabs">
  <meta property="og:title" content="Planning Guides | ScopedLabs">
  <meta property="og:description" content="Browse ScopedLabs planning guides for practical engineering workflows across tools, calculators, and design categories.">
  <meta property="og:url" content="https://scopedlabs.com/guides/">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Planning Guides | ScopedLabs">
  <meta name="twitter:description" content="Browse ScopedLabs planning guides for practical engineering workflows across all tool categories.">

  <link rel="stylesheet" href="/assets/style.css?v=${cssVersion}" />
  <script src="/assets/app.js?v=0314" defer></script>
</head>

<body class="page-tools">
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="ScopedLabs Home">
        <span class="brand-dot" aria-hidden="true"></span>
        <span class="brand-icon-wrap" aria-hidden="true">
          <img
            class="brand-icon"
            src="/assets/favicon/favicon-32x32.png?v=1"
            alt=""
            width="32"
            height="32"
          />
        </span>
        <span class="brand-name">ScopedLabs</span>
      </a>

${navFor("guides/index.html")}
    </div>
  </header>

  <main class="container">
    <div class="crumbs">
      <a href="/tools/">Tools</a>
      <span class="sep">/</span>
      <span>Planning Guides</span>
    </div>

    <section class="page-head">
      <h1 class="h1">Planning Guides</h1>
      <p class="subhead">
        Written workflows that explain how ScopedLabs calculators fit together, what to check first,
        why each step matters, and which assumptions should be documented before a plan is treated as complete.
      </p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/tools/">Browse All Tools</a>
      </div>
    </section>

    <section class="tool-feature" aria-labelledby="guides-overview-title">
      <div class="tool-feature-top">
        <span class="pill">Guide Library</span>
      </div>
      <h2 class="h2" id="guides-overview-title">Use guides before calculators when you want the full workflow.</h2>
      <p class="muted">
        Tool pages are best for calculations. Planning guides are best for understanding the sequence behind those calculations:
        the baseline, the follow-up checks, the common mistakes, and the supporting tools that help validate a design.
      </p>
    </section>

    <section class="grid category-grid" aria-label="Planning guide categories">
${cardsHtml}
    </section>

    <section class="note" aria-label="Planning disclaimer">
      <p class="muted">
        ScopedLabs guides and tools are planning aids. They do not replace manufacturer documentation, project-specific engineering,
        professional review, code review, site survey, or final deployment validation.
      </p>
    </section>

    <footer class="site-footer">
      <div class="muted">© <span data-year></span> ScopedLabs</div>
      <div class="footer-links">
        <a href="/tools/">Tools</a>
        <a href="/upgrade/">Upgrade</a>
        <a href="/about/">About</a>
        <a href="/contact/">Contact</a>
        <a href="/changelog/">Changelog</a>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
        <a href="/disclaimer/">Disclaimer</a>
      </div>
    </footer>
  </main>
</body>
</html>
`;

write(guidesRel, guidesHtml);
console.log(`created/updated: ${guidesRel}`);

/* Patch navs and bump CSS references */
const htmlFiles = walk(root);
let navTouched = 0;
let cssTouched = 0;

for (const full of htmlFiles) {
  const rel = relFromFull(full);

  if (rel === "home-index-upload.html" || rel === "tools-index-upload.html") continue;

  let html = fs.readFileSync(full, "utf8");
  const before = html;

  html = html.replace(
    /<nav class="nav site-nav nav-tabs" aria-label="Primary">[\s\S]*?<\/nav>/g,
    navFor(rel).trimStart()
  );

  if (html !== before) {
    navTouched++;
  }

  const beforeCss = html;
  html = html.replace(
    /\/assets\/style\.css\?v=[^"]+/g,
    `/assets/style.css?v=${cssVersion}`
  );

  if (html !== beforeCss) {
    cssTouched++;
  }

  if (html !== before) {
    fs.writeFileSync(full, html, "utf8");
  }
}

/* Add dropdown CSS */
const cssPath = path.join(root, styleRel);
let css = fs.readFileSync(cssPath, "utf8");

css = css.replace(
  /\/\* ScopedLabs tools dropdown nav[\s\S]*?(?=\/\*|$)/g,
  ""
);

const dropdownCss = `
/* ScopedLabs tools dropdown nav — nav-tabs-022 */
.nav-dropdown {
  position: relative;
  display: inline-flex;
  align-items: stretch;
}

.nav-dropdown > summary {
  list-style: none;
  cursor: pointer;
  user-select: none;
}

.nav-dropdown > summary::-webkit-details-marker {
  display: none;
}

.nav-dropdown-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.nav-caret {
  font-size: 0.78em;
  line-height: 1;
  opacity: 0.78;
}

.nav-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 190px;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(120,255,120,0.16);
  background: rgba(8, 14, 12, 0.98);
  box-shadow:
    0 18px 40px rgba(0,0,0,0.42),
    inset 0 1px 0 rgba(255,255,255,0.05);
  display: grid;
  gap: 4px;
  z-index: 10020;
}

.nav-dropdown:not([open]) .nav-dropdown-menu {
  display: none;
}

.nav-dropdown-item {
  display: block;
  padding: 10px 11px;
  border-radius: 12px;
  color: rgba(230,245,235,0.88);
  text-decoration: none;
  font-size: 0.94rem;
  font-weight: 650;
  white-space: nowrap;
}

.nav-dropdown-item:hover,
.nav-dropdown-item:focus {
  color: rgba(255,255,255,0.98);
  background: rgba(120,255,120,0.10);
  outline: none;
}

@media (max-width: 720px) {
  .nav-dropdown {
    flex: 0 0 auto;
  }

  .nav-dropdown-menu {
    left: 0;
    min-width: 180px;
  }
}
`;

css = css.trimEnd() + "\n\n" + dropdownCss + "\n";
fs.writeFileSync(cssPath, css, "utf8");
console.log(`updated: ${styleRel}`);

/* Add /guides/ to sitemap */
let sitemap = read(sitemapRel);
const guidesLoc = "https://scopedlabs.com/guides/";

if (!sitemap.includes(guidesLoc)) {
  const entry = `  <url>
    <loc>${guidesLoc}</loc>
    <lastmod>${today}</lastmod>
  </url>
`;

  if (!sitemap.includes("</urlset>")) {
    throw new Error("Could not find closing </urlset> in sitemap.xml.");
  }

  sitemap = sitemap.replace("</urlset>", `${entry}</urlset>`);
  write(sitemapRel, sitemap);
  console.log(`updated: ${sitemapRel}`);
} else {
  console.log(`unchanged: ${sitemapRel} already contains /guides/`);
}

console.log("");
console.log("Tools dropdown + Guides landing page complete.");
console.log(`Navs patched: ${navTouched}`);
console.log(`CSS refs bumped: ${cssTouched}`);
console.log(`Version: ${cssVersion}`);
console.log("");
console.log("Review:");
console.log(`- ${guidesRel}`);
console.log(`- ${styleRel}`);
console.log(`- ${sitemapRel}`);