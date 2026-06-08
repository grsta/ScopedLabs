const fs = require('fs');
const path = require('path');

const root = process.cwd();
const rows = [];
let failed = false;

function file(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const abs = file(rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function exists(rel) {
  return fs.existsSync(file(rel));
}

function check(name, ok, detail = '') {
  rows.push({ Status: ok ? 'SAFE' : 'FAIL', Check: name, Detail: detail });
  if (!ok) failed = true;
}

function parses(rel) {
  const text = read(rel);
  if (!text) return false;
  try {
    new Function(text);
    return true;
  } catch (error) {
    return false;
  }
}

const version = 'access-control-planning-visuals-043-credential-format-visual';

const moduleRel = 'assets/access-control-planning-visuals.js';
const doorCountHtmlRel = 'tools/access-control/door-count-planner/index.html';
const doorCountScriptRel = 'tools/access-control/door-count-planner/script.js';
const doorCableHtmlRel = 'tools/access-control/door-cable-length/index.html';
const doorCableScriptRel = 'tools/access-control/door-cable-length/script.js';

const moduleText = read(moduleRel);
const doorCountHtml = read(doorCountHtmlRel);
const doorCountScript = read(doorCountScriptRel);
const doorCableHtml = read(doorCableHtmlRel);
const doorCableScript = read(doorCableScriptRel);

check('Shared Access Control planning visual module exists', exists(moduleRel));
check('Shared Access Control planning visual module parses', parses(moduleRel));
check('Door Count script parses', parses(doorCountScriptRel));
check('Door Cable script parses', parses(doorCableScriptRel));

check('Shared module is on module version 043', moduleText.includes(version));
check('Door Count page loads shared module version 043', doorCountHtml.includes('/assets/access-control-planning-visuals.js?v=' + version));
check('Door Cable page loads shared module version 043', doorCableHtml.includes('/assets/access-control-planning-visuals.js?v=' + version));

check('Door Count uses shared renderer only', doorCountScript.includes('ScopedLabsAccessControlPlanningVisuals') && doorCountScript.includes('renderDoorCount'));
check('Door Cable uses shared renderer only', doorCableScript.includes('ScopedLabsAccessControlPlanningVisuals') && doorCableScript.includes('renderDoorCable'));

check('Door Count passes raw weighted zone contribution', doorCountScript.includes('zoneBase:'));
check('Door Count passes raw weighted high-security contribution', doorCountScript.includes('highsecAdd:'));
check('Shared module has contribution label helper', moduleText.includes('function contributionLabel'));
check('Shared module has weighted contribution note', moduleText.includes('weighted planning contributions'));
check('Shared module uses taller Door Count SVG frame', moduleText.includes('viewBox="0 0 760 388"'));
check('Shared module wraps Control Mode inside visual block', moduleText.includes('function controlModeBlock') && moduleText.includes('wrapLabel'));

check('Door Count has modern visual card', doorCountHtml.includes('data-access-control-modern-visual-card="door-count-planner"'));
check('Door Cable has modern visual card', doorCableHtml.includes('data-access-control-modern-visual-card="door-cable-length"'));

check('Door Count keeps report metadata dropdown', doorCountHtml.includes('id="reportMetadataMount"') && doorCountHtml.includes('data-report-metadata') && doorCountHtml.includes('data-collapsed="true"'));
check('Door Cable keeps report metadata dropdown', doorCableHtml.includes('id="reportMetadataMount"') && doorCableHtml.includes('data-report-metadata') && doorCableHtml.includes('data-collapsed="true"'));

check('Door Count export/snapshot actions are dropdown-owned', doorCountHtml.includes('data-report-actions') && doorCountScript.includes('appendChild(els.reportActions)'));
check('Door Cable export/snapshot actions are dropdown-owned', doorCableHtml.includes('data-report-actions') && doorCableScript.includes('appendChild(els.reportActions)'));

check('Door Count has no user-facing legacy canvas chart', !doorCountHtml.includes('<canvas') && !doorCountHtml.includes('id="chart"'));
check('Door Cable has no user-facing legacy canvas chart', !doorCableHtml.includes('<canvas') && !doorCableHtml.includes('id="chart"'));

check('Door Count keeps hidden result ledger', doorCountHtml.includes('access-control-hidden-results-card') && doorCountHtml.includes('data-result-ledger'));
check('Door Cable keeps hidden result ledger', doorCableHtml.includes('access-control-hidden-results-card') && doorCableHtml.includes('data-result-ledger'));

check('Visual fit seatbelt audit exists', exists('scripts/audit-access-control-visual-fit-seatbelts-v1.js'));
check('Visual fit seatbelt audit parses', parses('scripts/audit-access-control-visual-fit-seatbelts-v1.js'));
check('CAD icon contract audit exists', exists('scripts/audit-access-control-cad-icon-contract-v1.js'));
check('CAD icon contract audit parses', parses('scripts/audit-access-control-cad-icon-contract-v1.js'));
console.log('\nAccess Control module seatbelt audit:');
console.table(rows);

const safe = rows.filter((row) => row.Status === 'SAFE').length;
const fail = rows.filter((row) => row.Status === 'FAIL').length;

console.log('\nSummary:');
console.log('- SAFE: ' + safe);
console.log('- FAIL: ' + fail);

if (failed) process.exit(1);
