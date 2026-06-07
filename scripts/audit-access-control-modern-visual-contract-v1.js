const fs = require('fs');
const path = require('path');

const root = process.cwd();
const rows = [];
let failed = false;

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function check(name, ok, detail = '') {
  rows.push({ Status: ok ? 'SAFE' : 'FAIL', Check: name, Detail: detail });
  if (!ok) failed = true;
}

function moduleParses(text) {
  try {
    new Function(text);
    return true;
  } catch (error) {
    return false;
  }
}

const version = 'access-control-planning-visuals-015-cad-icon-contract';
const visualModule = read('assets/access-control-planning-visuals.js');

check('Planning visual module exists', exists('assets/access-control-planning-visuals.js'));
check('Planning visual module parses', moduleParses(visualModule));
check('Planning visual module is on engineering visual version', visualModule.includes(version));
check('Planning visual module exposes door cable renderer', visualModule.includes('renderDoorCable') && visualModule.includes('data-access-control-modern-visual="door-cable-length"'));
check('Planning visual module exposes door count renderer', visualModule.includes('renderDoorCount') && visualModule.includes('data-access-control-modern-visual="door-count-planner"'));
check('Planning visual module keeps export-safe data URI helper', visualModule.includes('getDataUri') && visualModule.includes('data:image/svg+xml;charset=utf-8'));
check('Planning visual module uses engineering pressure rails', visualModule.includes('function pressureRail') && visualModule.includes('takeoff pressure') && visualModule.includes('complexity pressure'));

const tools = [
  {
    name: 'Door Cable Length',
    html: 'tools/access-control/door-cable-length/index.html',
    script: 'tools/access-control/door-cable-length/script.js',
    slug: 'door-cable-length',
    card: 'doorCablePlanningVisualCard',
    mount: 'doorCablePlanningVisual',
    renderer: 'renderDoorCable',
    getter: 'getDoorCablePlanningVisualImage',
    reportActions: 'doorCableReportActions'
  },
  {
    name: 'Door Count Planner',
    html: 'tools/access-control/door-count-planner/index.html',
    script: 'tools/access-control/door-count-planner/script.js',
    slug: 'door-count-planner',
    card: 'doorCountPlanningVisualCard',
    mount: 'doorCountPlanningVisual',
    renderer: 'renderDoorCount',
    getter: 'getDoorCountPlanningVisualImage',
    reportActions: 'doorCountReportActions'
  }
];

tools.forEach((tool) => {
  const html = read(tool.html);
  const script = read(tool.script);

  check(tool.name + ' page exists', Boolean(html));
  check(tool.name + ' script exists', Boolean(script));
  check(tool.name + ' loads shared planning visual module', html.includes('/assets/access-control-planning-visuals.js?v=' + version));
  check(tool.name + ' has modern visual card', html.includes('id="' + tool.card + '"') && html.includes('data-access-control-modern-visual-card="' + tool.slug + '"'));
  check(tool.name + ' has modern visual mount', html.includes('id="' + tool.mount + '"') && html.includes('data-access-control-modern-visual="' + tool.slug + '"'));
  check(tool.name + ' renders visual through shared module', script.includes('ScopedLabsAccessControlPlanningVisuals') && script.includes(tool.renderer));
  check(tool.name + ' exports modern visual image', script.includes(tool.getter) && script.includes('getDataUri'));
  check(tool.name + ' keeps hidden result ledger', html.includes('access-control-hidden-results-card') && html.includes('data-result-ledger'));
  check(tool.name + ' keeps report metadata dropdown', html.includes('id="reportMetadataMount"') && html.includes('data-report-metadata') && html.includes('data-collapsed="true"'));
  check(tool.name + ' moves export/snapshot actions into dropdown', html.includes('id="' + tool.reportActions + '"') && html.includes('data-report-actions') && script.includes('appendChild(els.reportActions)'));
  check(tool.name + ' has no user-facing legacy chart canvas', !html.includes('id="chart"') && !html.includes('<canvas'));
  if (tool.name === 'Door Count Planner') {
    check('Door Count Planner script passes raw weighted zone contribution', script.includes('zoneBase:'));
    check('Door Count Planner script passes raw weighted high-security contribution', script.includes('highsecAdd:'));
  }
});

console.log('\nAccess Control modern visual contract audit:');
console.table(rows);

const safe = rows.filter((row) => row.Status === 'SAFE').length;
const fail = rows.filter((row) => row.Status === 'FAIL').length;

console.log('\nSummary:');
console.log('- SAFE: ' + safe);
console.log('- FAIL: ' + fail);

if (failed) process.exit(1);
