(function () {

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
    const bitrate = Math.max(0, n("bitrate"));
    const mode = modeEl.value;
    const motionPct = clamp(n("motionPct"), 0, 100);
    const retentionDays = Math.max(0, Math.floor(n("retention")));
    const overheadPct = clamp(n("overhead"), 0, 60);

    if (cams <= 0) {
      $("statusText").textContent = "Enter a camera count above 0.";
      return;
    }

    if (bitrate <= 0) {
      $("statusText").textContent = "Enter a bitrate above 0 Mbps.";
      return;
    }

    const duty = (mode === "motion") ? (motionPct / 100) : 1;
    const overheadMult = 1 + (overheadPct / 100);

    const perCamDayGiB = bitrate * MbitPerSec_to_GiBperDay * duty * overheadMult;
    const totalDayGiB = perCamDayGiB * cams;
    const totalRetentionGiB = totalDayGiB * retentionDays;

    $("perCamDay").textContent = fmtGiB(perCamDayGiB) + " / day";
    $("totalDay").textContent = fmtGiB(totalDayGiB) + " / day";
    $("totalRetention").textContent =
      fmtGiB(totalRetentionGiB) + ` (${retentionDays} days)`;

    $("statusText").textContent = "✅ Calculation complete.";

    /* -------------------------------
       PIPELINE: STORAGE → RETENTION
    --------------------------------*/

    const nextBtn = $("to-retention");

    const params = new URLSearchParams({
      source: "storage",
      cams: cams,
      bitrate: bitrate,
      days: retentionDays,
      storage_per_day: totalDayGiB.toFixed(2),
      total_storage: totalRetentionGiB.toFixed(2),
      unit: "gib"
    });

    nextBtn.href =
      "/tools/video-storage/retention-planner/?" + params.toString();

    $("next-step-row").style.display = "flex";
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

    $("next-step-row").style.display = "none";
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

})();
