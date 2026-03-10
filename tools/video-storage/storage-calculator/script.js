(function () {
  // Year stamp (works whether app.js does it or not)
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  const $ = (id) => document.getElementById(id);

  function n(id) {
    const v = Number($(id).value);
    return Number.isFinite(v) ? v : 0;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function fmtGiB(gib) {
    if (!Number.isFinite(gib)) return "—";
    if (gib < 1024) return `${gib.toFixed(2)} GiB`;
    return `${(gib / 1024).toFixed(2)} TiB`;
  }

  // Mbps → GiB per day:
  // Mbps = megabits/sec
  // bits/day = Mbps * 1e6 * 86400
  // bytes/day = bits/day / 8
  // GiB/day = bytes/day / (1024^3)
  // Combine constants:
  // GiB/day = Mbps * 1e6 * 86400 / 8 / 1024^3
  const MbitPerSec_to_GiBperDay = (1e6 * 86400) / 8 / (1024 ** 3);

  const modeEl = $("mode");
  const motionField = $("motionField");

  function syncMotion() {
    const isMotion = modeEl.value === "motion";
    motionField.style.display = isMotion ? "" : "none";
  }

  modeEl.addEventListener("change", syncMotion);
  syncMotion();

  function calc() {
    const cams = Math.max(0, Math.floor(n("cams")));
    const bitrate = Math.max(0, n("bitrate")); // Mbps
    const mode = modeEl.value;
    const motionPct = clamp(n("motionPct"), 0, 100);
    const retentionDays = Math.max(0, Math.floor(n("retention")));
    const overheadPct = clamp(n("overhead"), 0, 60);

    if (cams <= 0) {
      $("statusText").textContent = "Enter a camera count above 0.";
      $("perCamDay").textContent = "—";
      $("totalDay").textContent = "—";
      $("totalRetention").textContent = "—";
      return;
    }

    if (bitrate <= 0) {
      $("statusText").textContent = "Enter a bitrate above 0 Mbps.";
      $("perCamDay").textContent = "—";
      $("totalDay").textContent = "—";
      $("totalRetention").textContent = "—";
      return;
    }

    const duty = (mode === "motion") ? (motionPct / 100) : 1;
    const overheadMult = 1 + (overheadPct / 100);

    const perCamDayGiB = bitrate * MbitPerSec_to_GiBperDay * duty * overheadMult;
    const totalDayGiB = perCamDayGiB * cams;
    const totalRetentionGiB = totalDayGiB * retentionDays;

    $("perCamDay").textContent = fmtGiB(perCamDayGiB) + " / day";
    $("totalDay").textContent = fmtGiB(totalDayGiB) + " / day";
    $("totalRetention").textContent = fmtGiB(totalRetentionGiB) + ` (${retentionDays} days)`;

    // Status (serious + explicit)
    let status = "✅ Calculated.";
    if (mode === "motion" && motionPct === 0) status = "⚠ Motion mode selected with 0% activity (result will be 0).";
    if (overheadPct >= 30) status = "✅ Calculated (high overhead reserve — conservative plan).";
    if (retentionDays === 0) status = "⚠ Retention is 0 days (no storage required beyond daily).";

    $("statusText").textContent = status;
  }

  function reset() {
    $("cams").value = "16";
    $("bitrate").value = "4.0";
    $("mode").value = "continuous";
    $("motionPct").value = "25";
    $("retention").value = "30";
    $("overhead").value = "15";

    syncMotion();

    $("perCamDay").textContent = "—";
    $("totalDay").textContent = "—";
    $("totalRetention").textContent = "—";
    $("statusText").textContent = "Enter values and calculate.";
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  // Enter-to-calc (fast field workflow)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        calc();
      }
    }
  });
})();
