#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlFile = "tools/compute/gpu-vram/index.html";
const html = fs.readFileSync(path.join(root, htmlFile), "utf8");

const checks = [];

function check(code, pass, detail) {
  checks.push({ code, pass, detail });
}

function indexOfToken(token) {
  const idx = html.indexOf(token);
  return idx === -1 ? 999999999 : idx;
}

function hasAnyCrumbsBlock(text) {
  return text.includes('<div class="crumbs">') || text.includes("<div class='crumbs'>");
}

function hasKnownGpuCrumbsOwner(text) {
  const mainIdx = text.indexOf('<main class="container page">');
  if (mainIdx === -1) return false;

  const h1Idx = text.indexOf("<h1", mainIdx);
  const topChrome = h1Idx === -1 ? text.slice(mainIdx, mainIdx + 1200) : text.slice(mainIdx, h1Idx);

  return (
    hasAnyCrumbsBlock(topChrome) &&
    topChrome.includes('/tools/') &&
    topChrome.includes('/tools/compute/') &&
    topChrome.includes('Tools') &&
    topChrome.includes('Compute') &&
    topChrome.includes('GPU VRAM')
  );
}

const mainStart = indexOfToken("<main");
const lockedStart = indexOfToken('<section id="lockedCard"');
const toolStart = indexOfToken('<section id="toolCard"');
const chromeEnd = Math.min(lockedStart, toolStart);
const chrome = html.slice(mainStart, chromeEnd);

// KNOWN GPU BREADCRUMB OWNER:
// The visible GPU breadcrumb has historically lived directly under:
//   <main class="container page">
// as:
//   <div class="crumbs">
//     <a href="/tools/">Tools</a>
//     <span class="sep">/</span>
//     <a href="/tools/compute/">Compute</a>
//     <span class="sep">/</span>
//     <span>GPU VRAM</span>
//   </div>
//
// This audit intentionally checks that exact legacy .crumbs owner with plain
// string matching so future top-chrome cleanup lanes do not miss it by only
// checking breadcrumb/page-breadcrumb/tools-breadcrumb class names.

check(
  "GPU_TOP_CHROME_NO_KNOWN_MAIN_CRUMBS_OWNER",
  !hasKnownGpuCrumbsOwner(html),
  "GPU visible breadcrumbs are known to live as <div class=crumbs> immediately under <main class=container page>; that exact owner must not return."
);

check(
  "GPU_TOP_CHROME_NO_ANY_TOP_CHROME_CRUMBS_BLOCK",
  !hasAnyCrumbsBlock(chrome),
  "GPU visible top chrome should not include any legacy .crumbs breadcrumb block before locked/tool cards."
);

check(
  "GPU_TOP_CHROME_NO_PAGE_BREADCRUMBS",
  !/(page-breadcrumb|tools-breadcrumb|breadcrumbs|breadcrumb)[^\n]{0,300}(Tools|Compute|GPU VRAM)/i.test(chrome) &&
    !/Tools\s*\/\s*Compute\s*\/\s*GPU VRAM/i.test(chrome),
  "GPU visible top chrome should not show page breadcrumbs above the calculator."
);

check(
  "GPU_TOP_CHROME_NO_TOP_PRO_TIER_PILL",
  !/Pro Tier/i.test(chrome),
  "GPU visible top chrome should not show the Pro Tier pill above the calculator. Locked/auth card is outside this checked region."
);

check(
  "GPU_TOP_CHROME_NO_DESIGN_FLOW_CARD",
  !/Part of a Design Flow/i.test(html) &&
    !/This tool continues the Compute design flow/i.test(html),
  "GPU should not show the extra Part of a Design Flow explainer card."
);

check(
  "GPU_TOP_CHROME_NO_BEST_FOR_LINE",
  !/class=["'][^"']*tool-best-for/i.test(html) &&
    !/<strong>\s*Best for:\s*<\/strong>/i.test(html),
  "GPU should not show the legacy Best for helper line."
);

check(
  "GPU_TOP_CHROME_PRESERVES_FLOW_NOTE_ANCHOR",
  /<div\s+id=["']flow-note["'][^>]*hidden/i.test(html),
  "GPU should preserve the hidden flow-note anchor for shell/source-integrity behavior."
);

check(
  "GPU_TOP_CHROME_PRESERVES_LOCKED_CARD",
  /<section\s+id=["']lockedCard["']/i.test(html) &&
    /Unlock Pro/i.test(html),
  "GPU top chrome cleanup must not remove the locked/auth checkout card."
);

check(
  "GPU_TOP_CHROME_PRESERVES_TOOL_CARD",
  /<section\s+id=["']toolCard["']/i.test(html) &&
    /data-compute-tool-shell-card=["']true["']/i.test(html),
  "GPU top chrome cleanup must preserve the tool card and shell ownership token."
);

check(
  "GPU_TOP_CHROME_SCRIPT_VERSION_PRESENT",
  html.includes("./script.js?v=compute-gpu-vram-") &&
    html.includes("0622"),
  "GPU script cache-bust should remain present; later parity lanes may advance the exact version after top chrome cleanup."
);

let pass = 0;
let fail = 0;

console.log("SCOPEDLABS COMPUTE GPU VRAM TOP CHROME PARITY AUDIT V1\n");

for (const item of checks) {
  if (item.pass) pass += 1;
  else fail += 1;

  console.log("[" + (item.pass ? "PASS" : "FAIL") + "] " + item.code);
  console.log("  " + htmlFile);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

if (fail) process.exit(1);
