(function () {
  "use strict";

  const VERSION = "scopedlabs-cad-icons-001-registry-foundation";

  const TONES = Object.freeze({
    good: {
      id: "good",
      label: "Good",
      line: "rgba(125,255,152,.96)",
      fill: "rgba(125,255,152,.10)",
      text: "rgba(246,255,248,.96)"
    },
    watch: {
      id: "watch",
      label: "Watch",
      line: "rgba(250,204,21,.96)",
      fill: "rgba(250,204,21,.10)",
      text: "rgba(255,247,204,.96)"
    },
    risk: {
      id: "risk",
      label: "Risk",
      line: "rgba(248,113,113,.96)",
      fill: "rgba(248,113,113,.10)",
      text: "rgba(255,228,228,.96)"
    },
    review: {
      id: "review",
      label: "Review",
      line: "rgba(255,220,120,.96)",
      fill: "rgba(255,220,120,.10)",
      text: "rgba(255,247,220,.96)"
    },
    neutral: {
      id: "neutral",
      label: "Neutral",
      line: "rgba(203,213,225,.72)",
      fill: "rgba(148,163,184,.10)",
      text: "rgba(226,232,240,.92)"
    }
  });

  const registry = new Map();

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function number(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function toneColors(tone) {
    return TONES[String(tone || "neutral").toLowerCase()] || TONES.neutral;
  }

  function normalizeIconRecord(record) {
    if (!record || typeof record !== "object") throw new Error("Icon record must be an object.");
    if (!record.id || typeof record.id !== "string") throw new Error("Icon record requires a stable string id.");
    if (!record.label || typeof record.label !== "string") throw new Error("Icon record requires a label.");
    if (typeof record.render !== "function") throw new Error("Icon record requires a render(options) function.");

    return Object.freeze({
      id: record.id,
      label: record.label,
      category: record.category || "Global",
      description: record.description || "",
      tags: Array.isArray(record.tags) ? record.tags.slice() : [],
      viewBox: record.viewBox || "0 0 120 120",
      tones: Array.isArray(record.tones) ? record.tones.slice() : Object.keys(TONES),
      version: record.version || VERSION,
      render: record.render
    });
  }

  function registerIcon(record) {
    const normalized = normalizeIconRecord(record);

    if (registry.has(normalized.id)) {
      throw new Error("Duplicate CAD icon id: " + normalized.id);
    }

    registry.set(normalized.id, normalized);
    return normalized;
  }

  function hasIcon(id) {
    return registry.has(String(id || ""));
  }

  function getIcon(id) {
    return registry.get(String(id || "")) || null;
  }

  function listIcons(filter) {
    const options = filter && typeof filter === "object" ? filter : {};

    return Array.from(registry.values())
      .filter((icon) => {
        if (options.category && icon.category !== options.category) return false;
        if (options.tag && !icon.tags.includes(options.tag)) return false;
        return true;
      })
      .map((icon) => ({
        id: icon.id,
        label: icon.label,
        category: icon.category,
        description: icon.description,
        tags: icon.tags.slice(),
        viewBox: icon.viewBox,
        tones: icon.tones.slice(),
        version: icon.version
      }));
  }

  function categories() {
    return Array.from(new Set(Array.from(registry.values()).map((icon) => icon.category))).sort();
  }

  function tones() {
    return Object.keys(TONES);
  }

  function renderIcon(id, options) {
    const icon = getIcon(id);
    if (!icon) return "";

    return icon.render(options || {});
  }

  function proofMarkerIcon(options) {
    const x = number(options.x, 0);
    const y = number(options.y, 0);
    const id = options.markerId || options.id || "*";
    const tone = toneColors(options.tone || "watch");
    const anchor = options.anchor || "middle";

    return [
      '<text x="' + x + '" y="' + y + '"',
      ' fill="' + tone.line + '"',
      ' font-size="' + number(options.size, 10.2) + '"',
      ' font-weight="780"',
      ' text-anchor="' + escapeHtml(anchor) + '"',
      ' font-family="Inter,Arial,sans-serif"',
      ' data-sl-cad-icon="global.proof-marker"',
      ' data-sl-icon-source="scopedlabs-cad-icons"',
      ' data-sl-proof-marker="' + escapeHtml(id) + '">',
      escapeHtml(id),
      '</text>'
    ].join("");
  }

  function warningMarkerIcon(options) {
    const x = number(options.x, 0);
    const y = number(options.y, 0);
    const scale = number(options.scale, 1);
    const tone = toneColors(options.tone || "watch");
    const label = options.label || "!";

    function sx(value) { return Math.round((x + value * scale) * 10) / 10; }
    function sy(value) { return Math.round((y + value * scale) * 10) / 10; }
    function sw(value) { return Math.round(value * scale * 10) / 10; }

    return [
      '<g data-sl-cad-icon="global.warning-marker" data-sl-icon-source="scopedlabs-cad-icons" aria-label="CAD warning marker">',
      '<path d="M' + sx(60) + ' ' + sy(8) + ' L' + sx(112) + ' ' + sy(102) + ' H' + sx(8) + ' Z"',
      ' fill="' + tone.fill + '" stroke="' + tone.line + '" stroke-width="' + sw(2) + '" stroke-linejoin="round"/>',
      '<text x="' + sx(60) + '" y="' + sy(78) + '" text-anchor="middle"',
      ' fill="' + tone.text + '" font-family="Inter,Arial,sans-serif"',
      ' font-size="' + sw(44) + '" font-weight="900">' + escapeHtml(label) + '</text>',
      '</g>'
    ].join("");
  }

  registerIcon({
    id: "global.proof-marker",
    label: "Proof Marker",
    category: "Global",
    description: "Sequenced reference marker used to connect SVG evidence to assistant recommendation notes.",
    tags: ["reference", "proof", "marker", "assistant", "export"],
    viewBox: "0 0 32 20",
    tones: Object.keys(TONES),
    render: proofMarkerIcon
  });

  registerIcon({
    id: "global.warning-marker",
    label: "Warning Marker",
    category: "Global",
    description: "CAD-style warning marker for watch, risk, review, and advisory states.",
    tags: ["warning", "risk", "watch", "review", "alert"],
    viewBox: "0 0 120 120",
    tones: Object.keys(TONES),
    render: warningMarkerIcon
  });

  window.ScopedLabsCadIcons = Object.freeze({
    VERSION,
    TONES,
    registerIcon,
    renderIcon,
    hasIcon,
    getIcon,
    listIcons,
    categories,
    tones,
    toneColors,
    proofMarkerIcon,
    warningMarkerIcon
  });
})();