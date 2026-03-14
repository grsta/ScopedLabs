(() => {
  const $ = (id) => document.getElementById(id);

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const resultsEl = $("results");
  const nextStepRow = $("next-step-row");
  const toSurvivability = $("to-survivability");

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function toTiBFromTB(tbDecimal) {
    const bytes = tbDecimal * 1e12;
    return bytes / (1024 ** 4);
  }

  function toGiBFromTB(tbDecimal) {
    const bytes = tbDecimal * 1e12;
    return bytes / (1024 ** 3);
  }

  function hideNext() {
    if (nextStepRow) nextStepRow.style.display = "none";
  }

  function showNext() {
    if (nextStepRow) nextStepRow.style.display = "flex";
  }

  function render(rows) {
    resultsEl.innerHTML = rows.map((r) => `
      <div class="result-row">
        <div class="k">${r.k}</div>
        <div class="v ${r.cls || ""}">${r.v}</div>
      </div>
    `).join("");
  }

  function toleranceText(level) {
    switch (level) {
      case "0":
        return { t: "0 drives (no redundancy)", cls: "flag-bad" };
      case "1":
        return { t: "1 per mirror set", cls: "flag-ok" };
      case "5":
        return { t: "1 drive", cls: "flag-ok" };
      case "6":
        return { t: "2 drives", cls: "flag-ok" };
      case "10":
        return { t: "1 per mirror pair (varies)", cls: "flag-ok" };
      default:
        return { t: "Varies", cls: "" };
    }
  }

  function invalidate() {
    hideNext();
  }

  function importFromRetention() {
    const q = new URLSearchParams(window.location.search);

    if (q.get("source") !== "retention") return;

    if (q.get("days")) $("targetDays").value = q.get("days");
    if (q.get("storage_total_gb")) $("requiredStorageGb").value = q.get("storage_total_gb");

    const note = $("flow-note");
    if (note) {
      note.hidden = false;

      const storageGb = num(q.get("storage_total_gb"));
      if (storageGb > 0) {
        note.textContent =
          `Imported from Retention Planner. Required storage: ${(storageGb / 1000).toFixed(2)} TB. Review values and click Calculate.`;
      }
    }
  }

  function calculate() {
    const level = $("raidLevel").value;
    const drives = Math.max(0, Math.floor(num($("driveCount").value)));
    const spares = clamp(Math.floor(num($("hotSpares").value)), 0, Math.max(0, drives - 1));
    const sizeTB = Math.max(0, num($("driveSizeTb").value));
    const overheadPct = clamp(num($("overheadPct").value), 0, 50);
    const targetDays = Math.max(1, Math.floor(num($("targetDays").value)));
    const requiredStorageGb = Math.max(0, num($("requiredStorageGb").value));

    const active = Math.max(0, drives - spares);

    if (active < 2 || sizeTB <= 0) {
      render([
        { k: "Status", v: "Enter a valid drive count (>= 2 active) and drive size.", cls: "flag-warn" }
      ]);
      hideNext();
      return;
    }

    let usableTB = 0;
    let rule = "";

    if (level === "0") {
      usableTB = active * sizeTB;
      rule = "Usable = N × size";
    } else if (level === "1") {
      const pairs = Math.floor(active / 2);
      usableTB = pairs * sizeTB;
      rule = "Usable = floor(N / 2) × size";
    } else if (level === "5") {
      if (active < 3) {
        render([{ k: "Status", v: "RAID 5 requires at least 3 active drives.", cls: "flag-warn" }]);
        hideNext();
        return;
      }
      usableTB = (active - 1) * sizeTB;
      rule = "Usable = (N - 1) × size";
    } else if (level === "6") {
      if (active < 4) {
        render([{ k: "Status", v: "RAID 6 requires at least 4 active drives.", cls: "flag-warn" }]);
        hideNext();
        return;
      }
      usableTB = (active - 2) * sizeTB;
      rule = "Usable = (N - 2) × size";
    } else if (level === "10") {
      if (active < 4) {
        render([{ k: "Status", v: "RAID 10 requires at least 4 active drives.", cls: "flag-warn" }]);
        hideNext();
        return;
      }
      const pairs = Math.floor(active / 2);
      usableTB = pairs * sizeTB;
      rule = "Usable = floor(N / 2) × size (striped mirrors)";
    }

    const rawTB = active * sizeTB;
    const usableAfterOverheadTB = usableTB * (1 - overheadPct / 100);

    const rawTiB = toTiBFromTB(rawTB);
    const usableTiB = toTiBFromTB(usableTB);
    const usableNetTiB = toTiBFromTB(usableAfterOverheadTB);

    const penaltyPct = rawTB > 0 ? (1 - usableTB / rawTB) * 100 : 0;
    const tol = toleranceText(level);

    const netUsableGiB = toGiBFromTB(usableAfterOverheadTB);
    const maxGiBPerDay = targetDays > 0 ? netUsableGiB / targetDays : 0;
    const maxGBPerDayDecimal = (maxGiBPerDay * (1024 ** 3)) / 1e9;

    let fitText = "No imported retention target.";
    let fitCls = "";
    if (requiredStorageGb > 0) {
      const netUsableGBDecimal = usableAfterOverheadTB * 1000;
      if (netUsableGBDecimal >= requiredStorageGb) {
        fitText = `Pass — array can support imported retention target (${requiredStorageGb.toFixed(1)} GB required).`;
        fitCls = "flag-ok";
      } else {
        fitText = `Shortfall — array is below imported retention target by ${(requiredStorageGb - netUsableGBDecimal).toFixed(1)} GB.`;
        fitCls = "flag-warn";
      }
    }

    let riskNote = "Balanced for general workloads.";
    let riskCls = "flag-ok";

    if (level === "0") {
      riskNote = "High risk: any single drive failure means total data loss.";
      riskCls = "flag-bad";
    } else if (level === "5" && active >= 10) {
      riskNote = "Caution: large RAID 5 arrays increase rebuild exposure, especially with bigger disks.";
      riskCls = "flag-warn";
    } else if (level === "6") {
      riskNote = "Stronger rebuild safety than RAID 5 for larger arrays.";
      riskCls = "flag-ok";
    }

    render([
      { k: "Active drives (excluding spares)", v: String(active) },
      { k: "Raw capacity", v: `${rawTB.toFixed(1)} TB • ${rawTiB.toFixed(2)} TiB` },
      { k: "Usable capacity (rule)", v: `${usableTB.toFixed(1)} TB • ${usableTiB.toFixed(2)} TiB` },
      { k: "Usable after overhead", v: `${usableAfterOverheadTB.toFixed(1)} TB • ${usableNetTiB.toFixed(2)} TiB` },
      { k: "Capacity penalty vs raw", v: `${penaltyPct.toFixed(1)}%` },
      { k: "Fault tolerance", v: tol.t, cls: tol.cls },
      { k: "Rule", v: rule },
      { k: `Max daily ingest @ ${targetDays} days retention`, v: `${maxGBPerDayDecimal.toFixed(0)} GB/day` },
      { k: "Max daily ingest (GiB/day)", v: `${maxGiBPerDay.toFixed(0)} GiB/day` },
      { k: "Imported retention fit", v: fitText, cls: fitCls },
      { k: "Risk note", v: riskNote, cls: riskCls }
    ]);

    const params = new URLSearchParams({
      source: "raid",
      raidLevel: String(level),
      driveCount: String(drives),
      driveSizeTb: String(sizeTB),
      hotSpares: String(spares),
      overheadPct: String(overheadPct),
      targetDays: String(targetDays),
      requiredStorageGb: String(requiredStorageGb),
      usableTb: usableAfterOverheadTB.toFixed(2)
    });

    if (toSurvivability) {
      toSurvivability.href =
        "/tools/video-storage/retention-survivability/?" + params.toString();
    }

    showNext();
  }

  function reset() {
    $("raidLevel").value = "5";
    $("driveCount").value = "8";
    $("driveSizeTb").value = "10";
    $("hotSpares").value = "0";
    $("overheadPct").value = "8";
    $("targetDays").value = "30";
    $("requiredStorageGb").value = "0";

    resultsEl.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    hideNext();
  }

  $("calc").addEventListener("click", calculate);
  $("reset").addEventListener("click", reset);

  ["raidLevel", "driveCount", "driveSizeTb", "hotSpares", "overheadPct", "targetDays", "requiredStorageGb"].forEach((id) => {
    const el = $(id);
    if (!el) return;

    const eventName = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, invalidate);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        calculate();
      }
    }
  });

  reset();
  importFromRetention();
})();
