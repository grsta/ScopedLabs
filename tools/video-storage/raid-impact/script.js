(function () {
  const $ = (id) => document.getElementById(id);

  const raid = $("raid");
  const disks = $("disks");
  const diskSize = $("diskSize");
  const spare = $("spare");

  const rawCap = $("rawCap");
  const usableCap = $("usableCap");
  const tolerance = $("tolerance");
  const penalty = $("penalty");
  const statusText = $("statusText");

  const calcBtn = $("calc");
  const resetBtn = $("reset");

  function setStatus(msg) {
    statusText.textContent = msg;
  }

  function fmtTB(tb) {
    if (!Number.isFinite(tb)) return "—";
    return tb.toFixed(2) + " TB";
  }

  function minsFor(level) {
    return { raid0: 2, raid1: 2, raid5: 3, raid6: 4, raid10: 4 }[level] ?? 2;
  }

  function toleranceText(level) {
    if (level === "raid0") return "None (0 drives)";
    if (level === "raid5") return "1 drive";
    if (level === "raid6") return "2 drives";
    if (level === "raid1") return "1 drive per mirror set";
    if (level === "raid10") return "1 drive per mirror set";
    return "—";
  }

  function usableDisks(level, nEffective) {
    switch (level) {
      case "raid0": return nEffective;
      case "raid1": return Math.floor(nEffective / 2);
      case "raid5": return nEffective - 1;
      case "raid6": return nEffective - 2;
      case "raid10": return Math.floor(nEffective / 2);
      default: return nEffective - 1;
    }
  }

  function calc() {
    const n = Math.floor(Number(disks.value));
    const sizeTb = Number(diskSize.value);
    const level = raid.value;
    const hasSpare = spare.value === "yes";

    if (!Number.isFinite(n) || n < 2) {
      setStatus("Disk count must be at least 2.");
      return;
    }
    if (!Number.isFinite(sizeTb) || sizeTb <= 0) {
      setStatus("Disk size must be greater than 0.");
      return;
    }

    let nEffective = n;
    if (hasSpare && n >= 3) nEffective = n - 1;

    const minN = minsFor(level);
    if (nEffective < minN) {
      rawCap.textContent = fmtTB(n * sizeTb);
      usableCap.textContent = "—";
      tolerance.textContent = "—";
      penalty.textContent = "—";
      setStatus(
        `Invalid configuration: ${level.toUpperCase()} requires at least ${minN} disks` +
        (hasSpare ? " after spare." : ".")
      );
      return;
    }

    const rawTb = n * sizeTb;
    const uDisks = usableDisks(level, nEffective);
    const usableTb = uDisks * sizeTb;

    const penaltyTb = rawTb - usableTb;
    const penaltyPct = rawTb > 0 ? (penaltyTb / rawTb) * 100 : 0;

    rawCap.textContent = fmtTB(rawTb);
    usableCap.textContent = fmtTB(usableTb);
    tolerance.textContent = toleranceText(level);
    penalty.textContent = `${fmtTB(penaltyTb)} (${penaltyPct.toFixed(1)}%)`;

    // Status messaging
    if (hasSpare && n >= 3) {
      // This is informational only; it does not change math beyond nEffective.
      setStatus("Calculated. Hot spare enabled: 1 disk reserved for rebuild.");
      return;
    }

    if (level === "raid0") {
      setStatus("High risk: RAID 0 has no fault tolerance. One disk failure = total loss.");
    } else if (level === "raid5" && nEffective >= 10) {
      setStatus("Caution: large RAID 5 arrays increase rebuild exposure. Consider RAID 6 / RAID 10 depending on risk tolerance.");
    } else {
      setStatus("Calculated. Use for planning and comparison based on your inputs.");
    }
  }

  function reset() {
    raid.value = "raid5";
    disks.value = 8;
    diskSize.value = 12;
    spare.value = "no";

    rawCap.textContent = "—";
    usableCap.textContent = "—";
    tolerance.textContent = "—";
    penalty.textContent = "—";
    setStatus("Enter values and calculate.");
  }

  calcBtn.addEventListener("click", calc);
  resetBtn.addEventListener("click", reset);
})();
