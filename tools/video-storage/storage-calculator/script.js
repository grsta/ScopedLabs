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
  const MbitPerSec_to_GiBperHour = (1e6 * 3600) / 8 / (1024 ** 3);

  const presetMap = {
    perimeter: 3,
    hallway: 5,
    warehouse: 8,
    parking: 15,
    retail: 20,
    entrance: 30
  };

  const modeEl = $("mode");
  const activityPresetEl = $("activityPreset");
  const activityPctEl = $("activityPct");

  function codecMultiplier(codec) {
    switch (codec) {
      case "h264":
        return 1.0;
      case "h265":
        return 0.82;
      case "smart-h265":
        return 0.68;
      default:
        return 1.0;
    }
  }

  function syncActivityPreset() {
    const preset = activityPresetEl.value;
    if (preset === "custom") {
      activityPctEl.removeAttribute("readonly");
      return;
    }

    if (Object.prototype.hasOwnProperty.call(presetMap, preset)) {
      activityPctEl.value = String(presetMap[preset]);
      activityPctEl.setAttribute("readonly", "readonly");
    }
  }

  function modeLabel(mode, activityPct) {
    if (mode === "continuous") return "Continuous recording";
    if (mode === "motion") return `Motion recording (${activityPct}%)`;
    if (mode === "event") return `Event / AI recording (${activityPct}%)`;
    return "Recording mode";
  }

  function calculateScenarioGiBPerDay(bitrateMbps, codec, duty, overheadPct) {
    const effectiveBitrate = bitrateMbps * codecMultiplier(codec);
    const overheadMult = 1 + (overheadPct / 100);
    return effectiveBitrate * MbitPerSec_to_GiBperDay * duty * overheadMult;
  }

  function calc() {
    const cams = Math.max(0, Math.floor(n("cams")));
    const bitrate = Math.max(0, n("bitrate"));
    const retentionDays = Math.max(0, Math.floor(n("retention")));
    const overheadPct = clamp(n("overhead"), 0, 60);
    const codec = $("codec").value;
    const mode = modeEl.value;
    const activityPct = clamp(n("activityPct"), 0, 100);

    if (cams <= 0) {
      $("statusText").textContent = "Enter a camera count above 0.";
      resetOutputs();
      return;
    }

    if (bitrate <= 0) {
      $("statusText").textContent = "Enter a bitrate above 0 Mbps.";
      resetOutputs();
      return;
    }

    const currentDuty =
      mode === "continuous"
        ? 1
        : activityPct / 100;

    const perCamDayGiB = calculateScenarioGiBPerDay(bitrate, codec, currentDuty, overheadPct);
    const totalDayGiB = perCamDayGiB * cams;
    const totalRetentionGiB = totalDayGiB * retentionDays;

    const effectiveBitrate = bitrate * codecMultiplier(codec);
    const perCamHourGiB = effectiveBitrate * MbitPerSec_to_GiBperHour * currentDuty * (1 + overheadPct / 100);

    const continuousDay = calculateScenarioGiBPerDay(bitrate, codec, 1, overheadPct) * cams;
    const motionDay = calculateScenarioGiBPerDay(bitrate, codec, 0.15, overheadPct) * cams;
    const eventDay = calculateScenarioGiBPerDay(bitrate, codec, 0.08, overheadPct) * cams;

    const continuousRetention = continuousDay * retentionDays;
    const motionRetention = motionDay * retentionDays;
    const eventRetention = eventDay * retentionDays;

    $("storageResult").textContent = `${fmtGiB(totalRetentionGiB)} (${retentionDays} days)`;
    $("perCamDay").textContent = `${fmtGiB(perCamDayGiB)} / day`;
    $("totalDay").textContent = `${fmtGiB(totalDayGiB)} / day`;

    $("compareContinuous").textContent = `${fmtGiB(continuousRetention)} (${retentionDays} days)`;
    $("compareMotion").textContent = `${fmtGiB(motionRetention)} (${retentionDays} days @ 15%)`;
    $("compareEvent").textContent = `${fmtGiB(eventRetention)} (${retentionDays} days @ 8%)`;

    $("perCamHour").textContent = `${fmtGiB(perCamHourGiB)} / hour`;
    $("perCamDaySummary").textContent = `${fmtGiB(perCamDayGiB)} / day`;
    $("totalPerDay").textContent = `${fmtGiB(totalDayGiB)} / day`;

    let status = `✅ Calculated using ${modeLabel(mode, activityPct)}.`;

    if (mode !== "continuous" && activityPct === 0) {
      status = "⚠ Activity percentage is 0%, so motion/event storage will also be 0.";
    } else if (retentionDays === 0) {
      status = "⚠ Retention is 0 days, so only daily storage is shown.";
    } else if (overheadPct >= 30) {
      status = "✅ Calculated with a high overhead reserve for conservative planning.";
    }

    $("statusText").textContent = status;
  }

  function resetOutputs() {
    $("storageResult").textContent = "—";
    $("perCamDay").textContent = "—";
    $("totalDay").textContent = "—";
    $("compareContinuous").textContent = "—";
    $("compareMotion").textContent = "—";
    $("compareEvent").textContent = "—";
    $("perCamHour").textContent = "—";
    $("perCamDaySummary").textContent = "—";
    $("totalPerDay").textContent = "—";
  }

  function reset() {
    $("cams").value = "16";
    $("bitrate").value = "4.0";
    $("retention").value = "30";
    $("codec").value = "h265";
    $("mode").value = "continuous";
    $("activityPreset").value = "parking";
    $("activityPct").value = "15";
    $("overhead").value = "15";

    syncActivityPreset();
    resetOutputs();
    $("statusText").textContent = "Enter values and calculate.";
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);
  activityPresetEl.addEventListener("change", syncActivityPreset);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        calc();
      }
    }
  });

  syncActivityPreset();
})();