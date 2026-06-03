const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [];

function read(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function check(label, ok, detail = '') {
  checks.push({ Status: ok ? 'SAFE' : 'FAIL', Check: label, Detail: detail });
}

const html = read('guides/poe-budget-calculator/index.html');
const css = read('assets/style.css');
const sitemap = read('sitemap.xml');

const requiredLinks = ['/tools/network/poe-budget/','/guides/','/privacy/','/terms/','/disclaimer/'];
const requiredInputs = ['Switch PoE budget (W)','Safety margin (%)','PoE standard (assumption)','PoE ports used (count)','Device counts and watts each'];

check('PoE guide file exists', html.length > 0);
check('Stylesheet file exists', css.length > 0);
check('Sitemap file exists', sitemap.length > 0);
check('Guide page scoped class present', html.includes('poe-guide-polish'));
check('Guide stylesheet cache bust updated', html.includes('/assets/style.css?v=poe-guide-polish-004-ascii-title'));
check('Canonical preserved', html.includes('<link rel="canonical" href="https://scopedlabs.com/guides/poe-budget-calculator/"'));
check('Guides nav remains active', html.includes('<a class="nav-tab is-active" href="/guides/" aria-current="page">Guides</a>'));
check('Browser title uses ASCII hyphen', html.includes('<title>PoE Budget Calculator Guide - ScopedLabs</title>'));
check('PoE guide has no bullet title separator', !html.includes('\u2022'));
check('Top visible breadcrumbs removed', !html.includes('class="crumbs"'));
check('Redundant category kicker removed', !html.includes('guide-kicker') && !html.includes('Network &amp; Throughput guide'));
check('On-page guide menu removed', !html.includes('guide-toc') && !html.includes('On this page'));
check('Footer uses copyright entity', html.includes('&copy; <span data-year></span> ScopedLabs'));
check('No visible pill markup on detail guide', !html.includes('class="pill"') && !html.includes('pill-row'));
check('H1 present once', (html.split('<h1 class="h1">PoE Budget Calculator Guide</h1>').length - 1) === 1);
check('Quick answer section present', html.includes('id="quick-answer-title"'));
check('Planning check steps restored', html.includes('guide-answer-steps') && html.includes('Confirm usable switch PoE budget') && html.includes('Keep planned load within available budget'));
check('Bad formula question mark removed', !html.includes('? switch PoE budget'));
check('Less/equal symbol avoided', !html.includes('&le; switch PoE budget') && !html.includes('? switch PoE budget'));
check('Structured data still present', html.includes('id="poe-guide-structured-data"') && html.includes('Article') && html.includes('BreadcrumbList') && html.includes('FAQPage'));
check('Required guide links preserved', requiredLinks.every(link => html.includes(link)));
check('Calculator input labels represented', requiredInputs.every(text => html.includes(text)));
check('Example workflow metrics present', ['174 W','209 W','370 W'].every(text => html.includes(text)));
check('Planning disclaimer present', html.includes('ScopedLabs guides and tools are planning aids'));
check('Scoped CSS block present', css.includes('poe-guide-polish-004-ascii-title'));
check('Planning check CSS present', css.includes('body.poe-guide-polish .guide-answer-steps'));
check('Homepage accepted scope still present', css.includes('homepage-product-story-037-final-cta-muted-path'));
check('Guides hub accepted scope still present', css.includes('guides-hub-polish-002-guide-cta-match'));
check('PoE guide sitemap entry still present', sitemap.includes('<loc>https://scopedlabs.com/guides/poe-budget-calculator/</loc>'));

console.table(checks);

const safe = checks.filter(row => row.Status === 'SAFE').length;
const fail = checks.filter(row => row.Status === 'FAIL').length;

console.log('\nSummary:');
console.log('- SAFE: ' + safe);
console.log('- FAIL: ' + fail);

if (fail) process.exit(1);
