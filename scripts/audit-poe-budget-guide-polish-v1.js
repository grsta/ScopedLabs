const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [];

function read(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function safe(label, ok, detail = '') {
  checks.push({ label, ok: Boolean(ok), detail });
}

const html = read('guides/poe-budget-calculator/index.html');
const css = read('assets/style.css');
const sitemap = read('sitemap.xml');

const requiredLinks = [
  '/tools/network/poe-budget/',
  '/guides/',
  '/tools/network/',
  '/privacy/',
  '/terms/',
  '/disclaimer/'
];

const requiredInputs = [
  'Switch PoE budget (W)',
  'Safety margin (%)',
  'PoE standard (assumption)',
  'PoE ports used (count)',
  'Device counts and watts each'
];

safe('PoE guide file exists', html.length > 0);
safe('Stylesheet file exists', css.length > 0);
safe('Sitemap file exists', sitemap.length > 0);
safe('Guide page scoped class present', html.includes('poe-guide-polish'));
safe('Guide stylesheet cache bust updated', html.includes('/assets/style.css?v=poe-guide-polish-001'));
safe('Canonical preserved', html.includes('<link rel="canonical" href="https://scopedlabs.com/guides/poe-budget-calculator/"'));
safe('Guides nav remains active', html.includes('<a class="nav-tab is-active" href="/guides/" aria-current="page">Guides</a>'));
safe('No visible pill markup on detail guide', !html.includes('class="pill"'));
safe('H1 present once', (html.split('<h1 class="h1">PoE Budget Calculator Guide</h1>').length - 1) === 1);
safe('Quick answer section present', html.includes('id="quick-answer-title"') && html.includes('powered device load + safety margin'));
safe('On-page guide anchors present', ['what-poe-budget-means','poe-planning-sequence','calculator-inputs','example-workflow','common-mistakes','poe-faq'].every(id => html.includes('id="' + id + '"')));
safe('Structured data present', html.includes('id="poe-guide-structured-data"') && html.includes('Article') && html.includes('BreadcrumbList') && html.includes('FAQPage'));
safe('Required guide links preserved', requiredLinks.every(link => html.includes(link)));
safe('Calculator input labels represented', requiredInputs.every(text => html.includes(text)));
safe('Example workflow metrics present', ['174 W','209 W','370 W'].every(text => html.includes(text)));
safe('Planning disclaimer present', html.includes('ScopedLabs guides and tools are planning aids'));
safe('Scoped CSS block present', css.includes('poe-guide-polish-001'));
safe('Scoped CSS guarded to PoE guide body', css.includes('body.poe-guide-polish .guide-layout'));
safe('Homepage accepted scope still present', css.includes('homepage-product-story-037-final-cta-muted-path'));
safe('Guides hub accepted scope still present', css.includes('guides-hub-polish-002-guide-cta-match'));
safe('PoE guide sitemap lastmod updated', sitemap.includes('<loc>https://scopedlabs.com/guides/poe-budget-calculator/</loc>') && sitemap.includes('<lastmod>2026-06-02</lastmod>'));

const fail = checks.filter(check => !check.ok);

for (const check of checks) {
  const status = check.ok ? 'SAFE' : 'FAIL';
  console.log(status + ': ' + check.label + (check.detail ? ' ? ' + check.detail : ''));
}

console.log('\nPoE Budget guide polish audit: SAFE ' + (checks.length - fail.length) + ' / FAIL ' + fail.length);
if (fail.length) process.exit(1);
