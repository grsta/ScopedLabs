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

const html = read('guides/network-throughput-planning/index.html');
const css = read('assets/style.css');
const sitemap = read('sitemap.xml');

const requiredLinks = [
  '/tools/network/',
  '/guides/poe-budget-calculator/',
  '/tools/network/poe-budget/',
  '/tools/network/bandwidth/',
  '/tools/network/oversubscription/',
  '/tools/network/latency/',
  '/tools/network/growth-simulator/',
  '/tools/network/mtu-fragmentation/',
  '/tools/network/vpn-overhead/',
  '/tools/network/latency-jitter-buffer/',
  '/tools/network/packet-loss-impact/',
  '/tools/network/uplink-failure-impact/',
  '/privacy/',
  '/terms/',
  '/disclaimer/'
];

const requiredSections = [
  'Quick answer',
  'Core network planning sequence',
  'Where the PoE guide fits',
  'Supporting network checks',
  'Example workflow: camera and access network closet',
  'Common network planning mistakes',
  'Network planning FAQ'
];

check('Network guide file exists', html.length > 0);
check('Stylesheet file exists', css.length > 0);
check('Sitemap file exists', sitemap.length > 0);
check('Guide page scoped class present', html.includes('network-guide-polish'));
check('Guide stylesheet cache bust updated', html.includes('/assets/style.css?v=network-guide-polish-001-clean-parent'));
check('Browser title uses ASCII hyphen', html.includes('<title>Network &amp; Throughput Planning Guide - ScopedLabs</title>'));
check('No bullet title separator', !html.includes('\u2022'));
check('No pipe title separator', !html.includes(' | ScopedLabs'));
check('Canonical preserved', html.includes('<link rel="canonical" href="https://scopedlabs.com/guides/network-throughput-planning/"'));
check('Supabase/auth/app script block preserved', html.includes('@supabase/supabase-js@2') && html.includes('/assets/auth.js?v=auth-magiclink-session-restore-0527') && html.includes('/assets/app.js?v=network-0384'));
check('Guides nav remains active', html.includes('<a class="nav-tab is-active" href="/guides/" aria-current="page">Guides</a>'));
check('Top visible breadcrumbs removed', !html.includes('class="crumbs"'));
check('Visible pills removed from guide', !html.includes('class="pill"') && !html.includes('pill--pro') && !html.includes('pill-ok'));
check('On-page menu not added', !html.includes('guide-toc') && !html.includes('On this page'));
check('Footer uses copyright entity', html.includes('&copy; <span data-year></span> ScopedLabs'));
check('H1 present once', (html.split('<h1 class="h1">Network &amp; Throughput Planning Guide</h1>').length - 1) === 1);
check('Structured data present', html.includes('id="network-guide-structured-data"') && html.includes('Article') && html.includes('BreadcrumbList') && html.includes('FAQPage'));
check('Required sections present', requiredSections.every(text => html.includes(text)));
check('Required guide/tool links preserved', requiredLinks.every(link => html.includes(link)));
check('Core flow sequence restored', ['Establish PoE budget','Estimate bandwidth demand','Stress-test uplink oversubscription','Validate latency pressure'].every(text => html.includes(text)));
check('PoE guide parent link present', html.includes('/guides/poe-budget-calculator/') && html.includes('Read PoE Budget Guide'));
check('Planning disclaimer present', html.includes('ScopedLabs tools and guides are planning aids'));
check('Scoped CSS block present', css.includes('network-guide-polish-001-clean-parent'));
check('Scoped CSS guarded to Network guide body', css.includes('body.network-guide-polish .network-guide-answer'));
check('Homepage accepted scope still present', css.includes('homepage-product-story-037-final-cta-muted-path'));
check('Guides hub accepted scope still present', css.includes('guides-hub-polish-002-guide-cta-match'));
check('PoE guide accepted scope still present', css.includes('poe-guide-polish-004-ascii-title'));
check('Network guide sitemap lastmod updated', sitemap.includes('<loc>https://scopedlabs.com/guides/network-throughput-planning/</loc>') && sitemap.includes('<lastmod>2026-06-02</lastmod>'));

console.table(checks);

const safe = checks.filter(row => row.Status === 'SAFE').length;
const fail = checks.filter(row => row.Status === 'FAIL').length;

console.log('\nSummary:');
console.log('- SAFE: ' + safe);
console.log('- FAIL: ' + fail);

if (fail) process.exit(1);
