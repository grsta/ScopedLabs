(() => {
  "use strict";

  // ---- helpers ----
  const $ = (id) => document.getElementById(id);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const fmtMbps = (n) => {
    if (!Number.isFinite(n)) return "—";
    // keep it clean: 1 decimal if needed, else integer
    const rounded = Math.round(n * 10) / 10;
    return `${rounded} Mbps`;
  };

  const fmtRatio = (n) => {
    if (!Number.isFinite(n)) return "—";
    const rounded = Math.round(n * 100) / 100;
    return `${rounded}×`;
  };

  const setStatusChip = (chipEl, text, level) => {
    chipEl.textContent = text;

    // No assumption about your CSS classes — keep it safe:
    // We apply lightweight inline styling so it "just works" everywhere.
    const base = {
      display: "inline-block",
      padding: ".45rem .7rem",
      borderRadius: "999px",
      border: "1px solid rgba(120,255,120,.25)",
      background: "rgba(0,0,0,.25)",
      color: "rgba(230,255,230,.9)",
      fontWeight: "600",
      letterSpacing: ".02em",
    };

    Object.assign(chipEl.style, base);

    if (level === "green") {
      chipEl.style.border = "1px solid rgba(80,255,120,.35)";
      chipEl.style.color = "rgba(210,255,225,.95)";
    } else if (level === "yellow") {
      chipEl.style.border = "1px solid rgba(255,220,80,.35)";
      chipEl.style.color = "rgba(255,245,210,.95)";
    } else if (level === "red") {
      chipEl.style.border = "1px solid rgba(255,90,90,.35)";
      chipEl.style.color = "rgba(255,220,220,.95)";
    } else {
      chipEl.style.border = "1px solid rgba(160,160,160,.25)";
      chipEl.style.color = "rgba(235,235,235,.9)";
    }
  };

  // ---- calc logic ----
  const classify = (ratio) => {
    // ratio = peak_throughput / uplink
    // Keep thresholds intuitive:
    //  <=0.70  = GREEN (healthy headroom)
    //  <=1.00  = YELLOW (near limit at peak)
    //  > 1.00  = RED (over capacity at peak)
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return {
        label: "—",
        chip: "Enter values and calculate.",
        desc: "Enter realistic peak assumptions (motion spikes, multi-view) and calculate.",
        level: "neutral",
      };
    }

    if (ratio <= 0.70) {
      return {
        label: "GREEN",
        chip: "Healthy — headroom exists at peak assumptions.",
        desc: "You have usable headroom at peak. Still watch for multi-site aggregation and export bursts.",
        level: "green",
      };
    }

    if (ratio <= 1.00) {
      return {
        label: "YELLOW",
        chip: "Caution — near limit at peak. Expect congestion under load.",
        desc: "Close to the edge at peak. Motion spikes, exports, or multiple viewers may trigger buffering.",
        level: "yellow",
      };
    }

    return {
      label: "RED",
      chip: "High risk — over capacity at peak assumptions.",
      desc: "Over uplink capacity at peak. Dropped frames, buffering, and degraded live view are likely.",
      level: "red",
    };
  };

  const calculate = () => {
    const cams = toNum($("cams")?.value);
    const peakBitrate = toNum($("peakBitrate")?.value);
    const uplink = toNum($("uplink")?.value);

    const outTotal = $("outTotal");
    const outRatio = $("outRatio");
    const outStatus = $("outStatus");
    const outDesc = $("outDesc");
    const statusChip = $("statusChip");

    const totalPeak = cams * peakBitrate; // Mbps
    const ratio = uplink > 0 ? totalPeak / uplink : Infinity;

    if (outTotal) outTotal.textContent = fmtMbps(totalPeak);
    if (outRatio) outRatio.textContent = fmtRatio(ratio);

    const cls = classify(ratio);
    if (outStatus) outStatus.textContent = cls.label;
    if (outDesc) outDesc.textContent = cls.desc;
    if (statusChip) setStatusChip(statusChip, cls.chip, cls.level);
  };

  const reset = () => {
    $("cams").value = 16;
    $("peakBitrate").value = 8;
    $("uplink").value = 1000;

    $("outTotal").textContent = "—";
    $("outRatio").textContent = "—";
    $("outStatus").textContent = "—";
    $("outDesc").textContent =
      "Tip: Oversubscription often hides until motion spikes or multiple users pull live video.";

    const chip = $("statusChip");
    if (chip) setStatusChip(chip, "Enter values and calculate.", "neutral");
  };

  // ---- wire up ----
  const boot = () => {
    const calcBtn = $("calc");
    const resetBtn = $("reset");

    if (calcBtn) calcBtn.addEventListener("click", calculate);
    if (resetBtn) resetBtn.addEventListener("click", reset);

    // Optional: Enter key triggers calculate
    ["cams", "peakBitrate", "uplink"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") calculate();
      });
    });

    // Initialize chip styling once
    const chip = $("statusChip");
    if (chip) setStatusChip(chip, "Enter values and calculate.", "neutral");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
