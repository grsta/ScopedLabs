// tools/network/latency/script.js
(() => {
  "use strict";

  // ---- Defaults (keep these in sync with HTML initial values) ----
  const DEFAULTS = {
    camEncMs: 80,
    netMs: 20,
    recProcMs: 120,
    clientMs: 60,
  };

  // ---- Helpers ----
  const $ = (sel) => document.querySelector(sel);

  function clampNonNegative(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, n);
  }

  function readNumber(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const n = Number(el.value);
    const safe = clampNonNegative(n);
    // normalize the field so UI matches what we calculate
    el.value = String(safe);
    return safe;
  }

  // Simple, user-facing thresholds:
  // < 250ms: usually feels snappy
  // 250–499ms: noticeable to many users
  // >= 500ms: "laggy" territory
  function classify(totalMs) {
    if (totalMs < 250) {
      return {
        level: "GREEN",
        text: "Looks good. This should feel responsive for most users.",
      };
    }
    if (totalMs < 500) {
      return {
        level: "YELLOW",
        text: "Noticeable delay for many users. Expect complaints in fast-response workflows.",
      };
    }
    return {
      level: "RED",
      text: "High delay. This will feel laggy. Investigate buffering, codec settings, and processing load.",
    };
  }

  function setStatusPill(level) {
    const pill = $("#statusPill");
    if (!pill) return;

    // text
    pill.textContent = level;

    // class reset
    pill.classList.remove("is-green", "is-yellow", "is-red");

    // attach a class for styling (CSS can map these to colors)
    if (level === "GREEN") pill.classList.add("is-green");
    if (level === "YELLOW") pill.classList.add("is-yellow");
    if (level === "RED") pill.classList.add("is-red");
  }

  function calc() {
    const camEncMs = readNumber("camEncMs");
    const netMs = readNumber("netMs");
    const recProcMs = readNumber("recProcMs");
    const clientMs = readNumber("clientMs");

    const totalMs = camEncMs + netMs + recProcMs + clientMs;

    const totalEl = $("#totalMs");
    if (totalEl) totalEl.textContent = String(Math.round(totalMs));

    const status = classify(totalMs);
    setStatusPill(status.level);

    const statusText = $("#statusText");
    if (statusText) statusText.textContent = status.text;
  }

  function reset() {
    const ids = Object.keys(DEFAULTS);
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.value = String(DEFAULTS[id]);
    }

    const totalEl = $("#totalMs");
    if (totalEl) totalEl.textContent = "—";

    const statusText = $("#statusText");
    if (statusText) statusText.textContent = "Enter values and calculate.";

    // Reset pill display
    const pill = $("#statusPill");
    if (pill) {
      pill.textContent = "—";
      pill.classList.remove("is-green", "is-yellow", "is-red");
    }
  }

  function wire() {
    const btnCalc = $("#calc");
    const btnReset = $("#reset");

    if (btnCalc) btnCalc.addEventListener("click", calc);
    if (btnReset) btnReset.addEventListener("click", reset);

    // Optional: press Enter in any input to calculate
    const inputs = ["camEncMs", "netMs", "recProcMs", "clientMs"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    for (const el of inputs) {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          calc();
        }
      });

      // normalize negatives immediately
      el.addEventListener("blur", () => {
        const n = clampNonNegative(Number(el.value));
        el.value = String(n);
      });
    }
  }

  // ---- Boot ----
  document.addEventListener("DOMContentLoaded", () => {
    wire();
  });
})();
