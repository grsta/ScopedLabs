function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTerminalAnchor(terminal) {
  return '<a href="' + escapeHtml(terminal.href) + '" data-guided-flow-terminal="summary" aria-label="Open Access Control Summary">' +
    escapeHtml(terminal.label) +
    '</a>';
}

function indexOfInsensitive(source, needle, startAt) {
  return String(source || "").toLowerCase().indexOf(String(needle || "").toLowerCase(), startAt || 0);
}

function applyGuidedFlowTerminal(html, config) {
  const flow = config && config.guidedFlow;
  if (!flow || !flow.terminal) {
    throw new Error("Missing guidedFlow config.");
  }

  const source = String(html || "");
  const label = flow.terminal.label || "Summary / Report";
  const href = flow.terminal.href || "/tools/access-control/summary/";
  const terminalAnchor = buildTerminalAnchor({ label, href });

  if (source.includes('data-guided-flow-terminal="summary"') && source.includes(label)) {
    return source;
  }

  const flowIndex = indexOfInsensitive(source, flow.anchorLabel || "GUIDED DESIGN FLOW", 0);
  if (flowIndex === -1) {
    throw new Error("Could not find Guided Design Flow label.");
  }

  const insertAfterLabel = flow.insertAfterLabel || "Access Levels";
  const terminalIndex = indexOfInsensitive(source, insertAfterLabel, flowIndex);

  if (terminalIndex === -1) {
    throw new Error("Could not find Guided Design Flow terminal label: " + insertAfterLabel);
  }

  const localWindow = source.slice(flowIndex, Math.min(source.length, terminalIndex + 1200));
  if (localWindow.includes(label) || localWindow.includes('data-guided-flow-terminal="summary"')) {
    return source;
  }

  const insertAt = terminalIndex + insertAfterLabel.length;
  return source.slice(0, insertAt) + " → " + terminalAnchor + source.slice(insertAt);
}

module.exports = {
  buildTerminalAnchor,
  applyGuidedFlowTerminal,
};
