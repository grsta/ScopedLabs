(function () {
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    if (!el) return 0;
    const v = Number(el.value);
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
  const nextStepRow = $("next-step-row");
  const toRetention = $("to-retention");

  function syncMotion() {
    const isMotion = modeEl.value === "motion";
    motionField.style.display = isMotion ? "" : "none";
  }

  function hideNextStep() {
    if (nextStepRow) nextStepRow.style.display = "none";
  }

  function showNextStep() {
    if (nextStepRow) nextStepRow.style.display = "flex";
  }

  function invalidate() {
    hideNextStep();
    $("statusText").textContent = "Values changed. Recalculate to continue.";
  }

  function importFromBitrate() {
    if (!window.SL_FLOW) return;

    const source = SL_FLOW.get("source");
    const bitrate = SL_FLOW.get("bitrate");

    if (source === "bitrate" && bitrate) {
      $("bitrate").value = bitrate;

      const note = $("flow-note");
      if (note) {
        note.hidden = false;
        note.textContent = "Imported from Bitrate Estimator. Review values and click Calculate.";
      }
    }
  }

  function calc() {
    const cams = Math.max(0, Math.floor(n("cams")));
    const bitrate = Math.max(0, n("bitrate"));
    const mode = modeEl.value;
    const motionPct = clamp(n("motionPct"), 0, 100);
    const retentionDays = Math.max(0, Math.floor(n("retention")));
    const overheadPct = clamp(n("overhead"), 0, 60);

    if (cams <= 0) {
      $("statusText").textContent = "Enter a camera count above 0.";
      $("perCamDay").textContent = "—";
      $("totalDay").textContent = "—";
      $("totalRetention").textContent = "—";
      hideNextStep();
      return;
    }

    if (bitrate <= 0) {
      $("statusText").textContent = "Enter a bitrate above 0 Mbps.";
      $("perCamDay").textContent = "—";
      $("totalDay").textContent = "—";
      $("totalRetention").textContent = "—";
      hideNextStep();
      return;
    }

    const duty = mode === "motion" ? (motionPct / 100) : 1;
    const overheadMult = 1 + (overheadPct / 100);

    const perCamDayGiB = bitrate * MbitPerSec_to_GiBperDay * duty * overheadMult;
    const totalDayGiB = perCamDayGiB * cams;
    const totalRetentionGiB = totalDayGiB * retentionDays;

    $("perCamDay").textContent = `${fmtGiB(perCamDayGiB)} / day`;
    $("totalDay").textContent = `${fmtGiB(totalDayGiB)} / day`;
    $("totalRetention").textContent = `${fmtGiB(totalRetentionGiB)} (${retentionDays} days)`;

    let status = "✅ Calculated.";
    if (mode === "motion" && motionPct === 0) {
      status = "⚠ Motion mode selected with 0% activity (result will be 0).";
    } else if (overheadPct >= 30) {
      status = "✅ Calculated (high overhead reserve — conservative plan).";
    } else if (retentionDays === 0) {
      status = "⚠ Retention is 0 days (no storage required beyond daily).";
    }

    $("statusText").textContent = status;

    const params = new URLSearchParams({
      source: "storage",
      cams: String(cams),
      bitrate: String(bitrate),
      mode: String(mode),
      motionPct: String(motionPct),
      days: String(retentionDays),
      storage_per_day: totalDayGiB.toFixed(2),
      total_storage: totalRetentionGiB.toFixed(2),
      unit: "gib"
    });

    if (toRetention) {
      toRetention.href = "/tools/video-storage/retention-planner/?" + params.toString();
    }

    showNextStep();
  }

  function reset() {
    $("cams").value = "1";
    $("bitrate").value = "4";
    $("mode").value = "continuous";
    $("motionPct").value = "25";
    $("retention").value = "30";
    $("overhead").value = "15";

    syncMotion();

    $("perCamDay").textContent = "—";
    $("totalDay").textContent = "—";
    $("totalRetention").textContent = "—";
    $("statusText").textContent = "Enter values and calculate.";
    hideNextStep();
  }

  modeEl.addEventListener("change", () => {
    syncMotion();
    invalidate();
  });

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  ["cams", "bitrate", "motionPct", "retention", "overhead"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", invalidate);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        calc();
      }
    }
  });

  reset();
  importFromBitrate();
})();