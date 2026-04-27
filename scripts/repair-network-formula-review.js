const fs = require("fs");
const path = require("path");

const root = process.cwd();
const changes = [];

function patchFile(rel, patcher) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("Missing:", rel);
    return;
  }

  const before = fs.readFileSync(file, "utf8");
  const after = patcher(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changes.push(rel);
  }
}

function stripTrailingTodoStubs(text) {
  const marker = "\nfunction renderFlowNote()";
  const idx = text.lastIndexOf(marker);

  if (idx !== -1 && text.slice(idx).includes("TODO: implement")) {
    return text.slice(0, idx).trimEnd() + "\n";
  }

  return text;
}

/* ---------------------------------------------------------
   1) Clean Bandwidth leftover installer stubs
--------------------------------------------------------- */
patchFile("tools/network/bandwidth/script.js", (text) => {
  text = text.replace(
    'const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";',
    'const PREVIOUS_STEP = "poe-budget";'
  );

  return stripTrailingTodoStubs(text);
});

/* ---------------------------------------------------------
   2) Clean Latency leftover installer stubs + improve status
--------------------------------------------------------- */
patchFile("tools/network/latency/script.js", (text) => {
  text = text.replace(
    'const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";',
    'const PREVIOUS_STEP = "oversubscription";'
  );

  text = stripTrailingTodoStubs(text);

  text = text.replace(
`    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: dominant.value,
      metrics: input.contributors.map((item) => ({
        label: item.label,
        value: item.value,
        displayValue: fmtMs(item.value)
      })),
      healthyMax: perStageHealthyMax,
      watchMax: perStageWatchMax
    });`,
`    const stageStatusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: dominant.value,
      metrics: input.contributors.map((item) => ({
        label: item.label,
        value: item.value,
        displayValue: fmtMs(item.value)
      })),
      healthyMax: perStageHealthyMax,
      watchMax: perStageWatchMax
    });

    const budgetStatus =
      budgetUsePct > 100 ? "RISK" :
      budgetUsePct > 85 ? "WATCH" :
      "HEALTHY";

    const statusRank = {
      HEALTHY: 0,
      WATCH: 1,
      RISK: 2
    };

    const statusPack = {
      ...stageStatusPack,
      status:
        statusRank[budgetStatus] > statusRank[stageStatusPack.status]
          ? budgetStatus
          : stageStatusPack.status
    };`
  );

  text = text.replace(
`    let interpretation = \`Total modeled latency is \${fmtMs(totalMs)} against a target budget of \${fmtMs(targetMs)}. \${dominant.label} is the single largest contributor at \${fmtMs(dominant.value)}, which means that stage will shape how responsive the workflow feels before smaller contributors do.\`;`,
`    let interpretation = \`Total modeled latency is \${fmtMs(totalMs)} against a target budget of \${fmtMs(targetMs)}. \${dominant.label} is the single largest contributor at \${fmtMs(dominant.value)}, which means that stage will shape how responsive the workflow feels before smaller contributors do.\`;

    if (budgetUsePct > 100) {
      interpretation += \` The total path is over target by \${fmtMs(overTargetMs)}, so the overall latency budget is exhausted even if no single stage appears extreme by itself.\`;
    } else if (budgetUsePct > 85) {
      interpretation += \` The total path is using \${fmtPct(budgetUsePct)} of the latency budget, so remaining margin is thin even before real-world jitter or client variation is added.\`;
    }`
  );

  return text;
});

/* ---------------------------------------------------------
   3) Fix Uplink Failure Impact status to use blended score
--------------------------------------------------------- */
patchFile("tools/network/uplink-failure-impact/script.js", (text) => {
  return text.replace(
    "compositeScore: Math.max(scalePressure, appPressure, failoverPenalty, durationPressure),",
    "compositeScore: finalScore,"
  );
});

console.log("Network formula cleanup complete.");
console.table(changes.map((file) => ({ file })));

if (!changes.length) {
  console.log("No files changed. The patches may already be applied.");
}
