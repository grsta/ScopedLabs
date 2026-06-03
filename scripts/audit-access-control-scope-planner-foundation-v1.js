const fs = require('fs');
const path = require('path');

const root = process.cwd();
const rows = [];

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function check(label, ok, detail = '') {
  rows.push({ Status: ok ? 'SAFE' : 'FAIL', Check: label, Detail: detail });
}

const planner = read('tools/access-control/scope-planner/index.html');
const plannerScript = read('tools/access-control/scope-planner/script.js');
const state = read('assets/access-control-scope-state.js');
const category = read('tools/access-control/index.html');
const style = read('assets/style.css');
const sitemap = read('sitemap.xml');
const failSafe = read('tools/access-control/fail-safe-fail-secure/index.html');
const reader = read('tools/access-control/reader-type-selector/index.html');

check('Scope Planner page exists', exists('tools/access-control/scope-planner/index.html'));
check('Scope Planner script exists', exists('tools/access-control/scope-planner/script.js'));
check('Access Control scope state asset exists', exists('assets/access-control-scope-state.js'));
check('Scope state exposes global API', state.includes('window.ScopedLabsAccessControlScopeState') && state.includes('readLedger') && state.includes('upsertScope') && state.includes('saveRouteIntent'));
check('Scope ledger schema present', state.includes('scopedlabs.access-control.scope-ledger.v1'));
check('Active scope storage key present', state.includes('scopedlabs:pipeline:access-control:active-scope'));
check('Planner title and noindex present', planner.includes('<title>Access Scope Planner - ScopedLabs</title>') && planner.includes('noindex,follow'));
check('Planner loads scope state before local script', planner.indexOf('/assets/access-control-scope-state.js') > -1 && planner.indexOf('/assets/access-control-scope-state.js') < planner.indexOf('./script.js?v=access-control-scope-planner-001'));
check('Planner has required fields', ['scopeName','scopeType','egressRole','freeEgress','fireRated','fireRelease','powerLossIntent','readerNeed','lockIntent','controllerGroup'].every(id => planner.includes('id="' + id + '"')));
check('Planner captures scope types', ['single-door','door-group','access-zone','elevator-bank','anti-passback-zone','egress-path'].every(token => planner.includes(token)));
check('Planner computes review flags', plannerScript.includes('calculateReviewFlags') && plannerScript.includes('Free mechanical egress not confirmed') && plannerScript.includes('Maglock intent'));
check('Planner saves active scope and route intent', plannerScript.includes('state.upsertScope') && plannerScript.includes('state.saveRouteIntent'));
check('Planner routes to Fail-Safe', plannerScript.includes('/tools/access-control/fail-safe-fail-secure/'));
check('Planner ledger cards render', plannerScript.includes('access-scope-card') && plannerScript.includes('data-use-scope'));
check('Category landing start links point to planner', category.includes('/tools/access-control/scope-planner/') && !category.includes('href="/tools/access-control/fail-safe-fail-secure/">Start Guided Flow'));
check('Category flow preview starts with Access Scope', category.includes('pipeline-preview-step is-active">Access Scope'));
check('Category tool list includes Scope Planner', category.includes('Access Scope Planner</div>'));
check('Sitemap includes Scope Planner', sitemap.includes('https://scopedlabs.com/tools/access-control/scope-planner/'));
check('Scoped CSS present', style.includes('access-control-scope-planner-foundation-001') && style.includes('.access-scope-ledger-grid'));
check('Fail-Safe page not patched again in this lane', failSafe.includes('data-step="fail-safe-fail-secure"') && !failSafe.includes('access-control-scope-state.js?v=access-control-scope-state-001-foundation'));
check('Reader Type not patched', !reader.includes('access-control-scope-state.js'));

console.log('\nAccess Control Scope Planner foundation audit:');
console.table(rows);

const safe = rows.filter(row => row.Status === 'SAFE').length;
const fail = rows.filter(row => row.Status === 'FAIL').length;

console.log('\nSummary:');
console.log('- SAFE: ' + safe);
console.log('- FAIL: ' + fail);

if (fail) process.exit(1);
