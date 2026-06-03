const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [];

function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

function safe(label, ok, detail = '') {
  checks.push({ label, ok: Boolean(ok), detail });
}

const html = read('guides/index.html');
const css = read('assets/style.css');
const sitemap = read('sitemap.xml');

const guideUrls = [
  '/guides/poe-budget-calculator/',
  '/guides/access-control-planning/',
  '/guides/compute-planning/',
  '/guides/infrastructure-planning/',
  '/guides/network-throughput-planning/',
  '/guides/performance-planning/',
  '/guides/physical-security-planning/',
  '/guides/power-runtime-planning/',
  '/guides/thermal-planning/',
  '/guides/video-storage-planning/',
  '/guides/wireless-planning/'
];

safe('Guides hub file exists', html.length > 0);
safe('Stylesheet exists', css.length > 0);
safe('Sitemap exists', sitemap.length > 0);
safe('Hub body scoped class present', html.includes('guides-hub-polish'));
safe('Hub cache bust updated', html.includes('/assets/style.css?v=guides-hub-polish-002-guide-cta-match'));
safe('Primary nav still marks Guides active', html.includes('<a class="nav-tab is-active" href="/guides/" aria-current="page">Guides</a>'));
safe('Footer legal/disclaimer links preserved', ['/privacy/','/terms/','/disclaimer/'].every(token => html.includes(token)));
safe('PoE featured guide surfaced', html.includes('Featured calculator guide: PoE Budget') && html.includes('/guides/poe-budget-calculator/'));
safe('PoE calculator link preserved', html.includes('/tools/network/poe-budget/'));
safe('Category guide heading present', html.includes('Category planning guides'));
safe('No visible pill markup remains on guides hub', !html.includes('class="pill"'));
safe('Category guide cards count is 10', (html.match(/data-guide-category-card/g) || []).length === 10, String((html.match(/data-guide-category-card/g) || []).length));
safe('Category guide CTAs count is 10', (html.match(/Open guide/g) || []).length === 10, String((html.match(/Open guide/g) || []).length));
safe('Structured data script present', html.includes('id="guides-hub-item-list"') && html.includes('CollectionPage') && html.includes('ItemList'));
safe('All guide URLs linked from hub', guideUrls.every(url => html.includes(url)));
safe('All guide URLs listed in sitemap', guideUrls.every(url => sitemap.includes('https://scopedlabs.com' + url)));
safe('Guides hub sitemap lastmod updated', sitemap.includes('<loc>https://scopedlabs.com/guides/</loc>') && sitemap.includes('<lastmod>2026-06-02</lastmod>'));
safe('Scoped CSS block present', (css.includes('guides-hub-polish-001') || css.includes('guides-hub-polish-002-guide-cta-match')));
safe('Scoped CSS uses body guard', css.includes('body.guides-hub-polish .guide-hub-feature'));
safe('Guide CTA inherits shared Tools card CTA styling', !css.includes('body.guides-hub-polish .category-card-cta') && css.includes('.page-tools .category-card-cta'));
safe('Homepage accepted scope untouched by guide CSS', css.includes('body.homepage-product-story .homepage-category-grid'));

const fail = checks.filter(check => !check.ok);

for (const check of checks) {
  const status = check.ok ? 'SAFE' : 'FAIL';
  console.log(status + ': ' + check.label + (check.detail ? ' ? ' + check.detail : ''));
}

console.log('\nGuides hub polish audit: SAFE ' + (checks.length - fail.length) + ' / FAIL ' + fail.length);
if (fail.length) process.exit(1);
