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

const html = read('guides/physical-security-planning/index.html');
const css = read('assets/style.css');
const sitemap = read('sitemap.xml');

const requiredLinks = [
  '/tools/physical-security/',
  '/tools/physical-security/area-planner/',
  '/tools/physical-security/scene-illumination/',
  '/tools/physical-security/mounting-height/',
  '/tools/physical-security/field-of-view/',
  '/tools/physical-security/camera-coverage-area/',
  '/tools/physical-security/camera-spacing/',
  '/tools/physical-security/blind-spot-check/',
  '/tools/physical-security/pixel-density/',
  '/tools/physical-security/lens-selection/',
  '/tools/physical-security/face-recognition-range/',
  '/tools/physical-security/license-plate-range/',
  '/tools/physical-security/summary/',
  '/privacy/',
  '/terms/',
  '/disclaimer/'
];

const requiredSections = [
  'Quick answer',
  'Start with an area or zone',
  'Core camera planning sequence',
  'Optional specialty zones',
  'End with the Physical Security Summary',
  'Example workflow: parking lot and entry door',
  'Common physical security planning mistakes',
  'Physical security planning FAQ'
];

check('Physical Security guide file exists', html.length > 0);
check('Stylesheet file exists', css.length > 0);
check('Sitemap file exists', sitemap.length > 0);
check('Guide page scoped class present', html.includes('physical-security-guide-polish'));
check('Guide stylesheet cache bust updated', html.includes('/assets/style.css?v=physical-security-guide-polish-001-category-story'));
check('Browser title uses ASCII hyphen', html.includes('<title>Physical Security Planning Guide - ScopedLabs</title>'));
check('No bullet title separator', !html.includes('\u2022'));
check('No pipe title separator', !html.includes(' | ScopedLabs'));
check('Canonical preserved', html.includes('<link rel="canonical" href="https://scopedlabs.com/guides/physical-security-planning/"'));
check('Supabase/auth/app script block preserved', html.includes('@supabase/supabase-js@2') && html.includes('/assets/auth.js') && html.includes('/assets/app.js'));
check('Guides nav remains active', html.includes('<a class="nav-tab is-active" href="/guides/" aria-current="page">Guides</a>'));
check('Top visible breadcrumbs removed', !html.includes('class="crumbs"'));
check('Visible pills removed from guide', !html.includes('class="pill"') && !html.includes('pill-row'));
check('On-page menu not added', !html.includes('guide-toc') && !html.includes('On this page'));
check('Footer uses copyright entity', html.includes('&copy; <span data-year></span> ScopedLabs'));
check('H1 present once', (html.split('<h1 class="h1">Physical Security Planning Guide</h1>').length - 1) === 1);
check('Structured data present', html.includes('id="physical-security-guide-structured-data"') && html.includes('Article') && html.includes('BreadcrumbList') && html.includes('FAQPage'));
check('Required sections present', requiredSections.every(text => html.includes(text)));
check('Required guide/tool links preserved', requiredLinks.every(link => html.includes(link)));
check('Core flow sequence present', ['Create or select an area','Run core camera checks','Choose lens strategy','Review the Summary'].every(text => html.includes(text)));
check('Optional branches described', html.includes('Face Recognition') && html.includes('License Plate') && html.includes('optional specialty'));
check('Physical Security Summary represented', html.includes('/tools/physical-security/summary/') && html.includes('category master review page'));
check('Planning disclaimer present', html.includes('ScopedLabs tools and guides are planning aids'));
check('Scoped CSS block present', css.includes('physical-security-guide-polish-001-category-story'));
check('Scoped CSS guarded to Physical Security guide body', css.includes('body.physical-security-guide-polish .physical-security-guide-answer'));
check('Homepage accepted scope still present', css.includes('homepage-product-story-037-final-cta-muted-path'));
check('Guides hub accepted scope still present', css.includes('guides-hub-polish-002-guide-cta-match'));
check('PoE guide accepted scope still present', css.includes('poe-guide-polish-004-ascii-title'));
check('Network guide accepted scope still present', css.includes('network-guide-polish-001-clean-parent'));
check('Physical Security guide sitemap lastmod updated', sitemap.includes('<loc>https://scopedlabs.com/guides/physical-security-planning/</loc>') && sitemap.includes('<lastmod>2026-06-02</lastmod>'));

console.table(checks);

const safe = checks.filter(row => row.Status === 'SAFE').length;
const fail = checks.filter(row => row.Status === 'FAIL').length;

console.log('\nSummary:');
console.log('- SAFE: ' + safe);
console.log('- FAIL: ' + fail);

if (fail) process.exit(1);
