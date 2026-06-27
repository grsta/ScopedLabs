(function () {
  "use strict";

  const WIDTHS = {
    recommendationReferences: ["12%", "23%", "65%"],
    recommendedActions: ["34%", "66%"],
    decisionSchedule: ["16%", "22%", "18%", "44%"]
  };

  function statusTone(value) {
    const normalized = String(value || "").trim().toUpperCase();

    if (normalized === "GOOD" || normalized === "HEALTHY") return "#16a34a";
    if (normalized === "WATCH") return "#d97706";
    if (normalized === "RISK") return "#dc2626";

    return "";
  }

  function plainCell(value) {
    return {
      text: String(value || ""),
      style: "font-weight:400;color:#334155;"
    };
  }

  function valueCell(value) {
    const text = String(value || "");
    const tone = statusTone(text);

    return {
      text,
      style: tone
        ? "font-weight:700;color:" + tone + ";"
        : "font-weight:700;color:#0f172a;"
    };
  }

  function noteCell(value) {
    return {
      text: String(value || ""),
      style: "font-weight:700;color:#0f172a;"
    };
  }

  function widthsFor(kind) {
    const key = String(kind || "").trim();
    return Array.isArray(WIDTHS[key]) ? WIDTHS[key].slice() : [];
  }

  window.ScopedLabsComputeExportProofTables = {
    version: "scopedlabs-compute-export-proof-tables-002",
    widths: WIDTHS,
    widthsFor,
    statusTone,
    plainCell,
    valueCell,
    noteCell
  };
})();
