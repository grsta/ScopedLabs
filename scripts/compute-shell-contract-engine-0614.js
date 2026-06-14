const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const slugArgIndex = args.indexOf("--slug");
const slug = slugArgIndex >= 0 ? args[slugArgIndex + 1] : "cpu-sizing";

const tools = {
  "cpu-sizing": {
    slug: "cpu-sizing",
    title: "CPU Sizing",
    categoryLabel: "Compute",
    categorySlug: "compute",
    nextHref: "/tools/compute/ram-sizing/",
    nextLabel: "Continue → RAM Sizing",
    notesCopy: "These user-entered report notes save to this Compute tool and can be used as project documentation context."
  }
};

function fail(message) {
  console.error("FAIL:", message);
  process.exit(1);
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function read(file) {
  if (!fs.existsSync(file)) fail("Missing file: " + rel(file));
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function ensureAsset() {
  const asset = path.join(root, "assets", "scopedlabs-user-tool-notes.js");

  const js = `(function () {
  "use strict";

  const mounts = document.querySelectorAll("[data-scopedlabs-user-tool-notes]");
  if (!mounts.length) return;

  function getPageValue(name, fallback) {
    return document.body?.dataset?.[name] || fallback || "";
  }

  function keyFor(mount) {
    const category = mount.getAttribute("data-category-slug") || getPageValue("category", "site");
    const tool = mount.getAttribute("data-tool-slug") || getPageValue("step", location.pathname.replace(/\\/$/, "").split("/").pop() || "tool");
    return "scopedlabs:user-tool-notes:" + category + ":" + tool;
  }

  function render(mount) {
    if (mount.dataset.scopedlabsUserToolNotesReady === "true") return;
    mount.dataset.scopedlabsUserToolNotesReady = "true";

    const key = keyFor(mount);
    const saved = localStorage.getItem(key) || "";

    const label = document.createElement("label");
    label.className = "field full";

    const span = document.createElement("span");
    span.className = "label";
    span.textContent = "Notes";

    const textarea = document.createElement("textarea");
    textarea.id = mount.getAttribute("data-textarea-id") || "userToolNotes";
    textarea.setAttribute("data-scopedlabs-user-tool-notes-input", "true");
    textarea.setAttribute("data-report-user-tool-notes", "true");
    textarea.placeholder = mount.getAttribute("data-placeholder") || "Optional notes, assumptions, client context, or design caveats for this tool.";
    textarea.value = saved;

    textarea.addEventListener("input", function () {
      localStorage.setItem(key, textarea.value || "");
      window.ScopedLabsUserToolNotes = window.ScopedLabsUserToolNotes || {};
      window.ScopedLabsUserToolNotes[key] = textarea.value || "";
    });

    window.ScopedLabsUserToolNotes = window.ScopedLabsUserToolNotes || {};
    window.ScopedLabsUserToolNotes[key] = saved;

    label.appendChild(span);
    label.appendChild(textarea);
    mount.appendChild(label);
  }

  mounts.forEach(render);
})();`;

  return { asset, js, exists: fs.existsSync(asset) };
}

function ensureScriptBeforeLocal(html, src) {
  if (html.includes(src)) return html;

  const localToken = "./script.js?v=";
  const tokenIndex = html.indexOf(localToken);
  if (tokenIndex < 0) fail("Could not find local script.js line.");

  const lineStart = html.lastIndexOf("\n", tokenIndex) + 1;
  const line = html.slice(lineStart, html.indexOf("\n", tokenIndex));
  const indent = (line.match(/^\s*/) || [""])[0];

  return html.slice(0, lineStart) + `${indent}<script src="${src}"></script>\n` + html.slice(lineStart);
}

function ensureScriptAfterHelp(html, src) {
  if (html.includes(src)) return html;

  const helpToken = "/assets/help.js?v=help-026";
  const tokenIndex = html.indexOf(helpToken);
  if (tokenIndex < 0) fail("Could not find help.js line.");

  let lineEnd = html.indexOf("\n", tokenIndex);
  if (lineEnd < 0) lineEnd = html.length;

  return html.slice(0, lineEnd + 1) + `  <script src="${src}"></script>\n` + html.slice(lineEnd + 1);
}

function addBodyContract(html) {
  return html.replace(
    /<body ([^>]*data-category="compute"[^>]*)>/,
    (full, attrs) => {
      if (attrs.includes("data-compute-tool-shell")) return full;
      return `<body ${attrs} data-compute-tool-shell="0614">`;
    }
  );
}

function removeHeaderClutter(html) {
  html = html.replace(
    /\n\s*<div class="crumbs">\s*[\s\S]*?\s*<\/div>\s*\n\s*<div class="pill-row" style="margin-top: 6px;">\s*\n\s*<span class="pill pill--(?:free|pro)">(?:Free|Pro) Tier<\/span>\s*\n\s*<\/div>\s*\n(?=\s*<h1>)/,
    "\n"
  );

  html = html.replace(
    /\n\s*<div class="crumbs">\s*[\s\S]*?\s*<\/div>\s*\n(?=\s*<h1>)/,
    "\n"
  );

  return html;
}

function removeOldIntro(html) {
  html = html.replace(
    /\n\s*<section class="card" style="margin-top: 18px; border-color: rgba\(120,255,120,0\.18\);">\s*[\s\S]*?\s*<\/section>\s*\n\s*<p class="tool-best-for">\s*[\s\S]*?\s*<\/p>\s*(?=\n\s*<div id="flow-note")/,
    "\n"
  );

  html = html.replace(
    /\n\s*<p class="tool-best-for">\s*[\s\S]*?\s*<\/p>\s*/g,
    "\n"
  );

  return html;
}

function ensureToolCardHeadings(html) {
  html = html.replace(
    /<h2 class="card-title" style="margin-top: 0;">Inputs<\/h2>/,
    '<h2 class="card-title" style="margin-top: 0;">Planning Inputs</h2>'
  );

  html = html.replace(
    /<h2 class="card-title"[^>]*>\s*Inputs\s*<\/h2>/,
    '<h2 class="card-title" style="margin-top: 0;">Planning Inputs</h2>'
  );

  return html;
}

function ensureCalculationSource(html) {
  if (html.includes("Calculation Data Source")) return html;

  const modelMatch = html.match(/<p\b[^>]*>\s*Model:\s*[\s\S]*?<\/p>/i);
  if (!modelMatch) {
    const anchor = html.indexOf("</div>\n\n      <section");
    if (anchor < 0) return html;

    const fallback = `      <section class="card compute-calculation-source" style="margin-top: 14px; background: rgba(0,0,0,.14);">
        <h3 class="h3" style="margin-top: 0;">Calculation Data Source</h3>
        <p class="muted">
          Model: effective CPU demand is based on concurrency, per-worker utilization, workload factor, burst multiplier, and target utilization ceiling. This is a planning tool for capacity shaping, not a benchmark replacement.
        </p>
      </section>

`;
    return html.slice(0, anchor + 7) + "\n\n" + fallback + html.slice(anchor + 7);
  }

  const modelParagraph = modelMatch[0];

  const replacement = `      <section class="card compute-calculation-source" style="margin-top: 14px; background: rgba(0,0,0,.14);">
        <h3 class="h3" style="margin-top: 0;">Calculation Data Source</h3>
        ${modelParagraph}
      </section>`;

  return html.replace(modelParagraph, replacement);
}

function ensureExportContract(html, tool) {
  html = html.replace(
    /<section class="card" style="margin-top: 14px; background: rgba\(0,0,0,\.14\);">\s*<h3 class="h3" style="margin-top: 0;">Export Report<\/h3>/,
    '<section class="card compute-export-card" style="margin-top: 14px; background: rgba(0,0,0,.14);">\n        <h3 class="h3" style="margin-top: 0;">Export Report</h3>'
  );

  html = html.replace(
    /data-report-title="[^"]*"/,
    'data-report-title="Report details"'
  );

  html = html.replace(
    /data-report-copy="[^"]*"/,
    'data-report-copy="Optional metadata can be included in the generated report. Leave blank to use the default report naming."'
  );

  if (!html.includes('data-collapsed="true"')) {
    html = html.replace(
      /data-report-fields="reportTitle,projectName,clientName,preparedBy,customNotes"/,
      'data-report-fields="reportTitle,projectName,clientName,preparedBy,customNotes"\n          data-collapsed="true"'
    );
  }

  html = html.replace(
    /<p id="exportStatus" class="muted" style="margin-top:10px;"><\/p>/,
    '<div id="exportStatus" class="export-status"></div>'
  );

  html = html.replace(
    /<button id="exportReport" class="btn btn-primary" type="button"(?! disabled)>Open Export Report<\/button>/,
    '<button id="exportReport" class="btn btn-primary" type="button" disabled>Open Export Report</button>'
  );

  html = html.replace(
    /<button id="saveSnapshot" class="btn" type="button"(?! disabled)>Save Snapshot<\/button>/,
    '<button id="saveSnapshot" class="btn" type="button" disabled>Save Snapshot</button>'
  );

  if (!html.includes("data-scopedlabs-user-tool-notes-card")) {
    const notesBlock = `
        <details class="scopedlabs-user-tool-notes-inline" data-scopedlabs-user-tool-notes-card="true">
          <summary>User Tool Notes</summary>
          <p class="muted">${tool.notesCopy}</p>
          <div
            data-scopedlabs-user-tool-notes
            data-category-slug="${tool.categorySlug}"
            data-tool-slug="${tool.slug}"
            data-placeholder="Optional notes, assumptions, workload context, or caveats for the ${tool.title} report."
          ></div>
        </details>`;

    html = html.replace(
      /(\s*<div id="exportStatus" class="export-status"><\/div>)/,
      `$1${notesBlock}`
    );
  }

  return html;
}

function ensureFlowActions(html) {
  if (html.includes("compute-flow-actions")) return html;

  const pattern =
    /\n\s*<div class="btn-row" style="margin-top: 14px;">\s*\n\s*<a class="btn" href="\/tools\/compute\/">Back to Compute<\/a>\s*\n\s*<\/div>\s*\n\s*<\/section>\s*\n\s*<div id="continue-wrap" class="btn-row" style="display:none; margin-top:12px;">\s*([\s\S]*?)\s*<\/div>/;

  const match = html.match(pattern);
  if (!match) return html;

  const continueInner = match[1].trim();

  const replacement = `
    </section>

    <div class="compute-flow-actions">
      <a class="btn" href="/tools/compute/">Back to Compute</a>
      <div id="continue-wrap" class="btn-row" style="display:none;">
        ${continueInner}
      </div>
    </div>`;

  return html.replace(pattern, replacement);
}

function ensureStyles(html) {
  if (html.includes("COMPUTE SHELL CONTRACT 0614")) return html;

  const css = `
    /* COMPUTE SHELL CONTRACT 0614 */
    .compute-flow-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-top: 14px;
      flex-wrap: wrap;
    }

    .compute-flow-actions #continue-wrap {
      margin: 0 !important;
    }

    .compute-export-card .h3,
    .compute-calculation-source .h3 {
      margin-top: 0;
      font-size: 1rem;
      font-weight: 850;
      letter-spacing: normal;
    }

    .scopedlabs-user-tool-notes-inline {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(120,255,120,0.12);
    }

    .scopedlabs-user-tool-notes-inline summary {
      cursor: pointer;
      font-weight: 850;
      color: rgba(246,255,248,0.94);
    }

    @media (max-width: 760px) {
      .compute-flow-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .compute-flow-actions .btn,
      .compute-flow-actions #continue-wrap {
        width: 100%;
      }
    }
`;

  if (!html.includes("</style>")) fail("Missing </style> for Compute shell styles.");
  return html.replace("</style>", css + "  </style>");
}


function ensureComputeRuntimeContract(html) {
  html = html.replace(/<body ([^>]*)>/, function (full, attrs) {
    if (!/data-category=["']compute["']/.test(attrs)) return full;

    var next = attrs;
    var pairs = {
      "data-sl-clean-knowledge-card": "true",
      "data-sl-square-ctas": "true"
    };

    Object.keys(pairs).forEach(function (name) {
      var re = new RegExp(name + '="[^"]*"');
      if (re.test(next)) next = next.replace(re, name + '="' + pairs[name] + '"');
      else next += " " + name + '="' + pairs[name] + '"';
    });

    return "<body " + next + ">";
  });

  html = html
    .split(/\r?\n/)
    .filter(function (line) {
      return !line.includes("/assets/scopedlabs-compute-shell-contract.js");
    })
    .join("\n");

  var helpToken = "/assets/help.js?v=help-026";
  var helpIndex = html.indexOf(helpToken);
  if (helpIndex < 0) fail("Could not find help.js line for Compute runtime contract.");

  var helpLineEnd = html.indexOf("\n", helpIndex);
  if (helpLineEnd < 0) helpLineEnd = html.length;

  var lineStart = html.lastIndexOf("\n", helpIndex) + 1;
  var helpLine = html.slice(lineStart, helpLineEnd);
  var indent = (helpLine.match(/^\s*/) || [""])[0];

  html =
    html.slice(0, helpLineEnd + 1) +
    indent + '<script src="/assets/scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-001"></script>\n' +
    html.slice(helpLineEnd + 1);

  return html;
}

function verifyComputeRuntimeContract(html) {
  var missing = [];
  var foundForbidden = [];

  [
    'data-sl-clean-knowledge-card="true"',
    'data-sl-square-ctas="true"',
    '/assets/scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-001'
  ].forEach(function (token) {
    if (!html.includes(token)) missing.push(token);
  });

  var count = (html.match(/\/assets\/scopedlabs-compute-shell-contract\.js/g) || []).length;
  if (count !== 1) foundForbidden.push("duplicate compute runtime contract script count=" + count);

  return { missing: missing, foundForbidden: foundForbidden };
}

function verify(html, tool) {
  const required = [
    `data-step="${tool.slug}"`,
    `data-compute-tool-shell="0614"`,
    'id="pipeline"',
    'id="flow-note"',
    'id="toolCard"',
    'Planning Inputs',
    'Calculation Data Source',
    'compute-flow-actions',
    'Back to Compute',
    'id="continue"',
    'compute-export-card',
    'Export Report',
    'id="reportMetadataMount"',
    'data-collapsed="true"',
    'id="exportReport"',
    'id="saveSnapshot"',
    'id="exportStatus"',
    'User Tool Notes',
    'data-scopedlabs-user-tool-notes',
    '/assets/scopedlabs-report-metadata.js',
    '/assets/scopedlabs-tool-shell.js',
    '/assets/scopedlabs-assistant-export.js',
    '/assets/scopedlabs-user-tool-notes.js',
    './script.js?v=',
    '/assets/help.js?v=help-026'
  ];

  const missing = required.filter((token) => !html.includes(token));

  const forbidden = [
    '<div class="crumbs">',
    'Documentation & Export',
    'Part of a Design Flow',
    'class="tool-best-for"',
    '<span class="pill pill--free">Free Tier</span>',
    '<span class="pill pill--pro">Pro Tier</span>'
  ];

  const foundForbidden = forbidden.filter((token) => html.includes(token));

  return { missing, foundForbidden };
}

function modernizeTool(tool) {
  const indexFile = path.join(root, "tools", "compute", tool.slug, "index.html");
  const scriptFile = path.join(root, "tools", "compute", tool.slug, "script.js");

  let html = read(indexFile);
  const before = html;

  html = addBodyContract(html);
  html = removeHeaderClutter(html);
  html = removeOldIntro(html);
  html = ensureToolCardHeadings(html);
  html = ensureCalculationSource(html);
  html = ensureExportContract(html, tool);
  html = ensureFlowActions(html);
  html = ensureStyles(html);

  html = ensureScriptBeforeLocal(html, "/assets/scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-008-access-control-category-scope-key");
  html = ensureScriptBeforeLocal(html, "/assets/scopedlabs-tool-shell.js?v=scopedlabs-tool-shell-009-print-diagnostics");
  html = ensureScriptBeforeLocal(html, "/assets/scopedlabs-assistant-export.js?v=scopedlabs-assistant-export-002");
  html = ensureScriptAfterHelp(html, "/assets/scopedlabs-user-tool-notes.js?v=scopedlabs-user-tool-notes-001-compute-proof");

  html = ensureComputeRuntimeContract(html);

  const checks = verify(html, tool);
  const runtimeChecks = verifyComputeRuntimeContract(html);
  checks.missing.push(...runtimeChecks.missing);
  checks.foundForbidden.push(...runtimeChecks.foundForbidden);

  console.log("");
  console.log("========================================================================");
  console.log(tool.slug);
  console.log("========================================================================");
  console.log("Changed:", html !== before ? "YES" : "NO");
  console.log("Missing:", checks.missing.length ? checks.missing.join(", ") : "none");
  console.log("Forbidden:", checks.foundForbidden.length ? checks.foundForbidden.join(", ") : "none");

  if (checks.missing.length || checks.foundForbidden.length) {
    console.log("RESULT: WATCH");
  } else {
    console.log("RESULT: PASS");
  }

  if (apply) {
    write(indexFile, html);
    cp.execFileSync(process.execPath, ["--check", scriptFile], { stdio: "inherit" });
  }
}

if (!tools[slug]) fail("Unknown or unsupported slug for this first pass: " + slug);

const assetInfo = ensureAsset();

console.log("ScopedLabs Compute Shell Contract Engine - 0614");
console.log("Repo:", root);
console.log("Mode:", apply ? "APPLY" : "DRY RUN");
console.log("Target:", slug);
console.log("User notes asset exists:", assetInfo.exists ? "YES" : "NO");
console.log("User notes asset action:", assetInfo.exists ? "reuse" : (apply ? "create" : "would create"));

modernizeTool(tools[slug]);

if (apply && !assetInfo.exists) {
  write(assetInfo.asset, assetInfo.js);
  cp.execFileSync(process.execPath, ["--check", assetInfo.asset], { stdio: "inherit" });
  console.log("Created:", rel(assetInfo.asset));
}

if (!apply) {
  console.log("");
  console.log("Dry run only. Re-run with --apply after PASS.");
}