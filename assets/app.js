/* Storage Calculator (FREE) — tool logic only
   - MUST NOT touch layout
   - Uses existing IDs:
     #calc, #reset, #cams, #bitrate, #mode, #motionPct, #retention, #overhead
   - Results: expects existing result element IDs (do not change HTML)
*/

document.addEventListener("DOMContentLoaded", () => {
  // --- helpers (logic only) ---
  const $ = (id) => document.getElementById(id);

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const num = (el, fallback = 0) => {
    if (!el) return fallback;
    const v = parseFloat(String(el.value ?? "").trim());
    return Number.isFinite(v) ? v : fallback;
  };

  const setText = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };

  const fmtGB = (gb) => `${gb.toFixed(2)} GB`;
  const fmtTB = (tb) => `${tb.toFixed(2)} TB`;

  // --- required inputs ---
  const camsEl = $("cams");
  const bitrateEl = $("bitrate");
  const modeEl = $("mode");
  const motionPctEl = $("motionPct");
  const retentionEl = $("retention");
  const overheadEl = $("overhead");

  // --- buttons ---
  const calcBtn = $("calc");
  const resetBtn = $("reset");

  // If buttons are missing, do nothing (no UI manipulation)
  if (!calcBtn || !resetBtn) return;

  // Motion % enable/disable (logic only; no styling)
  const syncMotionEnabled = () => {
    if (!motionPctEl || !modeEl) return;
    const isMotion = String(modeEl.value || "").toLowerCase().includes("motion");
    motionPctEl.disabled = !isMotion;
  };

  if (modeEl) {
    modeEl.addEventListener("change", syncMotionEnabled);
    syncMotionEnabled();
  }

  // --- calculation core ---
  const compute = () => {
    const cams = Math.max(1, Math.round(num(camsEl, 1)));
    const avgMbps = Math.max(0, num(bitrateEl, 0)); // average bitrate only
    const retentionDays = Math.max(0, num(retentionEl, 0));
    const overheadPct = clamp(num(overheadEl, 0), 0, 200);

    const mode = String(modeEl?.value || "continuous").toLowerCase();
    const isMotion = mode.includes("motion");

    let motionActivePct = 100;
    if (isMotion) {
      motionActivePct = clamp(num(motionPctEl, 20), 0, 100);
    }

    // Effective bitrate based on recording mode
    const effectiveMbps = isMotion ? (avgMbps * (motionActivePct / 100)) : avgMbps;

    // Convert Mbps → GB/day
    // 1 Mbps = 1,000,000 bits/sec
    // bytes/sec = bits/sec / 8
    // bytes/day = bytes/sec * 86400
    // GB/day (decimal) = bytes/day / 1e9
    const bytesPerSec = (effectiveMbps * 1_000_000) / 8;
    const gbPerDayPerCam = (bytesPerSec * 86400) / 1_000_000_000;

    const totalGbPerDay = gbPerDayPerCam * cams;
    const baseRetentionGb = totalGbPerDay * retentionDays;

    const totalWithOverheadGb = baseRetentionGb * (1 + overheadPct / 100);

    // Status indicator (simple, deterministic)
    // Adjust thresholds later ONLY if spec says so — this is conservative baseline.
    const totalTb = totalWithOverheadGb / 1000;
    let status = "OK";
    if (totalTb >= 50) status = "Heavy";
    else if (totalTb >= 10) status = "Moderate";

    return {
      cams,
      avgMbps,
      mode: isMotion ? "Motion-based" : "Continuous",
      motionActivePct: isMotion ? motionActivePct : null,
      retentionDays,
      overheadPct,
      gbPerDayPerCam,
      totalGbPerDay,
      baseRetentionGb,
      totalWithOverheadGb,
      status,
    };
  };

  // --- output mapping ---
  // These IDs must already exist in your HTML results block.
  // If some are missing, we safely skip.
  const render = (r) => {
    // Per-camera per day
    setText("perCamPerDay", fmtGB(r.gbPerDayPerCam));
    // Total per day
    setText("totalPerDay", fmtGB(r.totalGbPerDay));
    // Total retention (no overhead)
    setText("retentionTotal", fmtTB(r.baseRetentionGb / 1000));
    // Total with overhead
    setText("retentionWithOverhead", fmtTB(r.totalWithOverheadGb / 1000));
    // Status text
    setText("statusIndicator", r.status);

    // Optional: warning area for peak bitrate misuse (text only; no layout)
    // If your template has an element for it, we populate it.
    const warnEl = $("bitrateWarning");
    if (warnEl) {
      warnEl.textContent =
        "Note: Use average bitrate, not peak. Peak values will overestimate storage and can mislead planning.";
    }
  };

  // --- events ---
  calcBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const r = compute();
    render(r);
  });

  resetBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Reset values (logic-only). Keep defaults modest.
    if (camsEl) camsEl.value = "1";
    if (bitrateEl) bitrateEl.value = "4";
    if (modeEl) modeEl.value = "continuous";
    if (motionPctEl) motionPctEl.value = "20";
    if (retentionEl) retentionEl.value = "30";
    if (overheadEl) overheadEl.value = "15";

    syncMotionEnabled();

    // Clear outputs if present (text only)
    setText("perCamPerDay", "--");
    setText("totalPerDay", "--");
    setText("retentionTotal", "--");
    setText("retentionWithOverhead", "--");
    setText("statusIndicator", "--");

    const warnEl = $("bitrateWarning");
    if (warnEl) warnEl.textContent = "";
  });
});
// ------------------------------
// ScopedLabs Global Help Modal
// Requires: button.hint[data-title][data-help]
// Creates modal if missing.
// ------------------------------
(() => {
  const ensureModal = () => {
    let modal = document.getElementById("helpModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "helpModal";
      modal.className = "modal";
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = `
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
          <button class="modal-close" type="button" aria-label="Close help">×</button>
          <h3 id="helpTitle"></h3>
          <p id="helpBody"></p>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  };

  const openModal = (title, body) => {
    const modal = ensureModal();
    const titleEl = modal.querySelector("#helpTitle");
    const bodyEl = modal.querySelector("#helpBody");
    if (titleEl) titleEl.textContent = title || "";
    if (bodyEl) bodyEl.textContent = body || "";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    const modal = document.getElementById("helpModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  };

  document.addEventListener("click", (e) => {
    const hintBtn = e.target.closest?.("button.hint");
    if (hintBtn) {
      e.preventDefault();
      const title = hintBtn.getAttribute("data-title") || "Help";
      const help = hintBtn.getAttribute("data-help") || "";
      openModal(title, help);
      return;
    }

    // Close: X button
    if (e.target.closest?.("#helpModal .modal-close")) {
      e.preventDefault();
      closeModal();
      return;
    }

    // Close: click backdrop
    if (e.target && e.target.id === "helpModal") {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  document.addEventListener("DOMContentLoaded", () => {
  scopedlabsWireStripeCategory();
});
})();

// =======================================
// ScopedLabs Stripe Category Wiring
// =======================================

function scopedlabsGetCategoryFromURL() {
  const u = new URL(location.href);
  return (u.searchParams.get("category") || "").trim();
}

function scopedlabsWireStripeCategory() {
  if (!document.body.classList.contains("page-upgrade")) return;

  const slug = scopedlabsGetCategoryFromURL();
  const map = window.SCOPEDLABS_STRIPE || {};

  const pill = document.getElementById("sl-category-pill");
  const label = document.getElementById("sl-category-label");
  const header = document.querySelector("h1");
  const checkoutSection = document.getElementById("checkout");

  if (!slug || !map[slug]) {
    if (pill) pill.textContent = "None selected";
    if (label) label.textContent = "a category";
    if (header) header.textContent = "Unlock a category";
    return;
  }

  const item = map[slug];

  // Visuals
  if (pill) pill.textContent = item.label;
  if (label) label.textContent = item.label;
  if (header) header.textContent = `Unlock ${item.label}`;

  // Attach IDs for checkout usage
  if (checkoutSection) {
    checkoutSection.dataset.category = slug;
    checkoutSection.dataset.productId = item.productId || "";
    checkoutSection.dataset.priceId = item.priceId || "";
    checkoutSection.dataset.unlockKey = item.unlockKey || "";
  }
}

