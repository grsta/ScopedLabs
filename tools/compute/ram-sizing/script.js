(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "ram-sizing";
  const LANE = "v1";
  const PREVIOUS_STEP = "cpu-sizing";

  const FLOW_KEYS = {
    "cpu-sizing": "scopedlabs:pipeline:compute:cpu-sizing",
    "ram-sizing": "scopedlabs:pipeline:compute:ram-sizing",
    "storage-iops": "scopedlabs:pipeline:compute:storage-iops",
    "storage-throughput": "scopedlabs:pipeline:compute:storage-throughput",
    "vm-density": "scopedlabs:pipeline:compute:vm-density",
    "gpu-vram": "scopedlabs:pipeline:compute:gpu-vram",
    "power-thermal": "scopedlabs:pipeline:compute:power-thermal",
    "raid-rebuild-time": "scopedlabs:pipeline:compute:raid-rebuild-time",
    "backup-window": "scopedlabs:pipeline:compute:backup-window"
  };

  const $ = (id) => document.getElementById(id);

  let hasResult = false;
  let cpuContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    workload: $("workload"),
    concurrency: $("concurrency"),
    perProc: $("perProc"),
    osGb: $("osGb"),
    headroom: $("headroom"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function workloadFactor(workload) {
    if (workload === "db") return 1.3;
    if (workload === "virtualization") return 1.25;
    if (workload === "analytics") return 1.4;
    if (workload === "web") return 1.1;
    return 1.0;
  }

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      cpuContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      cpuContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      cpuContext = null;
      return;
    }

    const data = parsed.data || {};
    cpuContext = data;

    const lines = [];
    if (typeof data.cores === "number") lines.push(`Recommended Cores: <strong>${data.cores}</strong>`);
    if (typeof data.eff === "number") lines.push(`Effective Load: <strong>${Number(data.eff).toFixed(2)} core-eq</strong>`);
    if (typeof data.workload === "string") lines.push(`Workload: <strong>${data.workload}</strong>`);
    if (typeof data.status === "string") lines.push(`CPU Status: <strong>${data.status}</strong>`);

    if (!lines.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${lines.join(" | ")}
      <br><br>
      This step checks whether memory becomes the next scaling wall after the CPU envelope already defined upstream.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["storage-iops"]);
      sessionStorage.removeItem(FLOW_KEYS["storage-throughput"]);
      sessionStorage.removeItem(FLOW_KEYS["vm-density"]);
      sessionStorage.removeItem(FLOW_KEYS["gpu-vram"]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE
    });

    hasResult = false;
    hideContinue();
    invalidateRamExportState();
    refreshFlowNote();
  }


  function ramProofNumber(value, digits) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.0";
    return n.toFixed(typeof digits === "number" ? digits : 1);
  }

  function ramProofPercent(value, digits) {
    return ramProofNumber(value, typeof digits === "number" ? digits : 0) + "%";
  }

  function ramProofClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function ramProofStatusLabel(status) {
    if (status === "RISK") return "Risk";
    if (status === "WATCH") return "Watch";
    return "Good";
  }

  function ramProofStatusColor(status) {
    if (status === "RISK") return "#ef4444";
    if (status === "WATCH") return "#f59e0b";
    return "#22c55e";
  }

  function ramProofMarkerHtml(marker, tone) {
    const color = tone === "blue" ? "#38d9ff" : tone === "purple" ? "#a78bfa" : "#f59e0b";
    return '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:2.1rem;padding:.18rem .45rem;border-radius:.45rem;border:1px solid ' + color + ';color:' + color + ';background:rgba(255,255,255,.035);font-weight:800;font-size:.78rem;letter-spacing:.02em;">' + marker + '</span>';
  }

  function ramProofEscape(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildRamCapacityEnvelopeSvg(model) {
    const width = 760;
    const height = 430;
    const left = 82;
    const right = 690;
    const top = 72;
    const bottom = 342;
    const usableWidth = right - left;
    const recommended = Math.max(1, Number(model.recommended) || 1);
    const subtotalMemory = Math.max(0, Number(model.subtotalMemory) || 0);
    const totalRequired = Math.max(0, Number(model.totalRequired) || 0);
    const memoryHeadroom = Math.max(0, Number(model.memoryHeadroom) || 0);
    const reserveRatio = Math.max(0, Number(model.reserveRatio) || 0);
    const status = model.status || "HEALTHY";
    const statusColor = ramProofStatusColor(status);

    const xFor = function(value) {
      return left + ramProofClamp(value / recommended, 0, 1.12) * usableWidth;
    };

    const demandX = xFor(subtotalMemory);
    const requiredX = xFor(totalRequired);
    const installedX = xFor(recommended);
    const reserveWidth = Math.max(0, requiredX - demandX);
    const headroomWidth = Math.max(0, installedX - requiredX);

    const pressurePct = ramProofClamp((totalRequired / recommended) * 100, 0, 140);
    const pressureX = left + ramProofClamp(pressurePct / 112, 0, 1) * usableWidth;

    return '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="RAM Capacity Envelope" style="width:100%;height:auto;display:block;">' +
      '<defs>' +
        '<linearGradient id="ramBg" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#101923"/><stop offset="100%" stop-color="#05070b"/></linearGradient>' +
        '<filter id="ramGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>' +
      '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="18" fill="url(#ramBg)"/>' +
      '<g opacity=".18" stroke="#9fb3c8" stroke-width="1">' +
        '<path d="M82 92H690M82 132H690M82 172H690M82 212H690M82 252H690M82 292H690M82 332H690"/>' +
        '<path d="M142 72V350M202 72V350M262 72V350M322 72V350M382 72V350M442 72V350M502 72V350M562 72V350M622 72V350"/>' +
      '</g>' +
      '<text x="82" y="42" fill="#e6edf3" font-size="22" font-weight="800">RAM Capacity Envelope</text>' +
      '<text x="82" y="62" fill="#8ea0b4" font-size="12">How close this memory plan is to the installed RAM edge after workload, reserve, and CPU context.</text>' +
      '<g>' +
        '<rect x="' + left + '" y="' + top + '" width="' + (usableWidth * .65) + '" height="52" rx="12" fill="rgba(34,197,94,.18)" stroke="rgba(34,197,94,.35)"/>' +
        '<rect x="' + (left + usableWidth * .65) + '" y="' + top + '" width="' + (usableWidth * .20) + '" height="52" rx="12" fill="rgba(245,158,11,.18)" stroke="rgba(245,158,11,.35)"/>' +
        '<rect x="' + (left + usableWidth * .85) + '" y="' + top + '" width="' + (usableWidth * .15) + '" height="52" rx="12" fill="rgba(239,68,68,.18)" stroke="rgba(239,68,68,.35)"/>' +
        '<text x="' + (left + 16) + '" y="' + (top + 31) + '" fill="#86efac" font-size="12" font-weight="800">GOOD</text>' +
        '<text x="' + (left + usableWidth * .65 + 16) + '" y="' + (top + 31) + '" fill="#fbbf24" font-size="12" font-weight="800">WATCH</text>' +
        '<text x="' + (left + usableWidth * .85 + 16) + '" y="' + (top + 31) + '" fill="#f87171" font-size="12" font-weight="800">RISK</text>' +
      '</g>' +
      '<g transform="translate(0,154)">' +
        '<rect x="' + left + '" y="0" width="' + usableWidth + '" height="64" rx="13" fill="rgba(255,255,255,.045)" stroke="rgba(148,163,184,.42)"/>' +
        '<rect x="' + left + '" y="0" width="' + Math.max(0, demandX - left) + '" height="64" rx="13" fill="rgba(56,217,255,.20)" stroke="rgba(56,217,255,.38)"/>' +
        '<rect x="' + demandX + '" y="0" width="' + reserveWidth + '" height="64" fill="rgba(167,139,250,.22)" stroke="rgba(167,139,250,.38)"/>' +
        '<rect x="' + requiredX + '" y="0" width="' + headroomWidth + '" height="64" fill="rgba(245,158,11,.16)" stroke="rgba(245,158,11,.30)"/>' +
        '<path d="M' + demandX + ' -12V80" stroke="#38d9ff" stroke-width="2" stroke-dasharray="5 5"/>' +
        '<path d="M' + requiredX + ' -12V80" stroke="#a78bfa" stroke-width="2" stroke-dasharray="5 5"/>' +
        '<path d="M' + installedX + ' -12V80" stroke="#e6edf3" stroke-width="2"/>' +
        '<text x="' + left + '" y="-22" fill="#8ea0b4" font-size="12">Installed capacity model</text>' +
        '<text x="' + left + '" y="96" fill="#38d9ff" font-size="12">*1 Demand basis: ' + ramProofNumber(subtotalMemory, 1) + ' GB</text>' +
        '<text x="' + Math.max(left + 230, demandX - 36) + '" y="96" fill="#a78bfa" font-size="12">*2 Required: ' + ramProofNumber(totalRequired, 1) + ' GB</text>' +
        '<text x="' + Math.max(left + 430, installedX - 82) + '" y="96" fill="#e6edf3" font-size="12">Installed tier: ' + ramProofNumber(recommended, 0) + ' GB</text>' +
      '</g>' +
      '<g transform="translate(82,292)">' +
        '<text x="0" y="0" fill="#e6edf3" font-size="13" font-weight="800">STATUS</text>' +
        '<text x="0" y="26" fill="' + statusColor + '" font-size="26" font-weight="900" filter="url(#ramGlow)">' + ramProofStatusLabel(status).toUpperCase() + '</text>' +
        '<text x="210" y="0" fill="#e6edf3" font-size="13" font-weight="800">USABLE HEADROOM</text>' +
        '<text x="210" y="26" fill="#fbbf24" font-size="24" font-weight="900">' + ramProofNumber(memoryHeadroom, 1) + ' GB</text>' +
        '<text x="430" y="0" fill="#e6edf3" font-size="13" font-weight="800">RESERVE RATIO</text>' +
        '<text x="430" y="26" fill="#c4b5fd" font-size="24" font-weight="900">' + ramProofPercent(reserveRatio, 1) + '</text>' +
      '</g>' +
      '<path d="M' + pressureX + ' 70V350" stroke="' + statusColor + '" stroke-width="2" opacity=".75"/>' +
      '<text x="' + Math.max(left, Math.min(pressureX - 72, right - 170)) + '" y="374" fill="' + statusColor + '" font-size="12" font-weight="800">Capacity pressure ' + ramProofPercent(pressurePct, 0) + '</text>' +
      '<text x="82" y="404" fill="#66788e" font-size="11">*3 Downstream validation should compare this RAM envelope against Storage IOPS, VM density, and observed memory telemetry.</text>' +
    '</svg>';
  }

  function buildRamRecommendationReferences(model) {
    return [
      {
        marker: "*1",
        tone: "blue",
        reference: "Demand basis",
        reason: "Concurrent processes or VMs multiplied by average RAM footprint, then adjusted by workload type."
      },
      {
        marker: "*2",
        tone: "purple",
        reference: "Reserve pressure",
        reason: "OS/base overhead and cache/headroom reserve determine how much of the installed RAM tier remains usable."
      },
      {
        marker: "*3",
        tone: "amber",
        reference: "Downstream validation",
        reason: "CPU coupling and the next Storage IOPS step should confirm memory is not masking another bottleneck."
      }
    ];
  }

  function buildRamDecisionSchedule(model) {
    const status = model.status || "HEALTHY";
    const recommended = ramProofNumber(model.recommended, 0) + " GB";
    const required = ramProofNumber(model.totalRequired, 1) + " GB";
    const headroom = ramProofNumber(model.memoryHeadroom, 1) + " GB";
    const reserve = ramProofPercent(model.reserveRatio, 1);
    const action = status === "RISK"
      ? "Increase installed RAM tier, reduce density, or lower per-process footprint before continuing."
      : status === "WATCH"
        ? "Validate burst behavior, cache use, and growth margin before locking the hardware tier."
        : "Proceed to Storage IOPS validation while preserving the documented reserve assumptions.";

    return [
      {
        item: "Recommended installed RAM tier",
        value: recommended,
        decision: "Installed tier is rounded above the calculated requirement of " + required + "."
      },
      {
        item: "Usable headroom",
        value: headroom,
        decision: "Remaining installed capacity after workload, base overhead, and reserve are applied."
      },
      {
        item: "Reserve ratio",
        value: reserve,
        decision: "Reserve should remain large enough to absorb cache behavior, workload spikes, and growth."
      },
      {
        item: "Next validation",
        value: ramProofStatusLabel(status),
        decision: action
      }
    ];
  }

  function renderRamProofSections(model) {
    if (!els.results) return;

    const old = document.getElementById("ram-proof-sections");
    if (old && old.parentNode) old.parentNode.removeChild(old);

    const recommendationReferences = buildRamRecommendationReferences(model);
    const decisionSchedule = buildRamDecisionSchedule(model);
    const wrap = document.createElement("div");
    wrap.id = "ram-proof-sections";
    wrap.setAttribute("data-ram-proof-section", "true");
    wrap.style.gridColumn = "1 / -1";
    wrap.style.marginTop = "14px";

    const referenceRows = recommendationReferences.map(function(row) {
      return '<tr>' +
        '<td style="padding:.55rem .6rem;border-top:1px solid rgba(148,163,184,.18);vertical-align:top;">' + ramProofMarkerHtml(row.marker, row.tone) + '</td>' +
        '<td style="padding:.55rem .6rem;border-top:1px solid rgba(148,163,184,.18);vertical-align:top;color:#e6edf3;font-weight:750;">' + ramProofEscape(row.reference) + '</td>' +
        '<td style="padding:.55rem .6rem;border-top:1px solid rgba(148,163,184,.18);vertical-align:top;color:#9fb0c4;">' + ramProofEscape(row.reason) + '</td>' +
      '</tr>';
    }).join("");

    const decisionRows = decisionSchedule.map(function(row) {
      return '<tr>' +
        '<td style="padding:.55rem .6rem;border-top:1px solid rgba(148,163,184,.18);vertical-align:top;color:#e6edf3;font-weight:750;">' + ramProofEscape(row.item) + '</td>' +
        '<td style="padding:.55rem .6rem;border-top:1px solid rgba(148,163,184,.18);vertical-align:top;color:#fbbf24;font-weight:800;">' + ramProofEscape(row.value) + '</td>' +
        '<td style="padding:.55rem .6rem;border-top:1px solid rgba(148,163,184,.18);vertical-align:top;color:#9fb0c4;">' + ramProofEscape(row.decision) + '</td>' +
      '</tr>';
    }).join("");

    wrap.innerHTML =
      '<section class="card" style="background:rgba(0,0,0,.18);border-color:rgba(56,217,255,.18);margin-top:14px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">' +
          '<div>' +
            '<div class="pill" style="width:fit-content;border-color:rgba(56,217,255,.35);color:#38d9ff;background:rgba(56,217,255,.08);">RAM Planning Proof</div>' +
            '<h3 class="h3" style="margin:10px 0 4px;">RAM Capacity Envelope</h3>' +
            '<p class="muted" style="margin:0;">Capacity edge view for workload demand, reserve pressure, installed RAM tier, and downstream validation.</p>' +
          '</div>' +
          '<div style="font-weight:900;color:' + ramProofStatusColor(model.status) + ';letter-spacing:.04em;">' + ramProofStatusLabel(model.status).toUpperCase() + '</div>' +
        '</div>' +
        buildRamCapacityEnvelopeSvg(model) +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px;">' +
          '<div class="card" style="background:rgba(255,255,255,.035);"><div class="muted">Calculated requirement</div><strong>' + ramProofNumber(model.totalRequired, 1) + ' GB</strong></div>' +
          '<div class="card" style="background:rgba(255,255,255,.035);"><div class="muted">Recommended installed RAM tier</div><strong>' + ramProofNumber(model.recommended, 0) + ' GB</strong></div>' +
          '<div class="card" style="background:rgba(255,255,255,.035);"><div class="muted">Usable headroom</div><strong>' + ramProofNumber(model.memoryHeadroom, 1) + ' GB</strong></div>' +
        '</div>' +
      '</section>' +
      '<section class="card" style="background:rgba(0,0,0,.18);border-color:rgba(167,139,250,.18);margin-top:14px;">' +
        '<h3 class="h3" style="margin-top:0;">Recommendation References</h3>' +
        '<p class="muted">Plain-language proof markers for the RAM recommendation.</p>' +
        '<table style="width:100%;border-collapse:collapse;font-size:.92rem;">' +
          '<thead><tr>' +
            '<th style="text-align:left;padding:.45rem .6rem;color:#8ea0b4;">Marker</th>' +
            '<th style="text-align:left;padding:.45rem .6rem;color:#8ea0b4;">Reference</th>' +
            '<th style="text-align:left;padding:.45rem .6rem;color:#8ea0b4;">Reason</th>' +
          '</tr></thead>' +
          '<tbody>' + referenceRows + '</tbody>' +
        '</table>' +
      '</section>' +
      '<section class="card" style="background:rgba(0,0,0,.18);border-color:rgba(245,158,11,.18);margin-top:14px;">' +
        '<h3 class="h3" style="margin-top:0;">RAM Capacity Decision Schedule</h3>' +
        '<p class="muted">Decision-ready summary of the installed RAM tier, usable headroom, reserve ratio, and next validation step.</p>' +
        '<table style="width:100%;border-collapse:collapse;font-size:.92rem;">' +
          '<thead><tr>' +
            '<th style="text-align:left;padding:.45rem .6rem;color:#8ea0b4;">Item</th>' +
            '<th style="text-align:left;padding:.45rem .6rem;color:#8ea0b4;">Value</th>' +
            '<th style="text-align:left;padding:.45rem .6rem;color:#8ea0b4;">Decision</th>' +
          '</tr></thead>' +
          '<tbody>' + decisionRows + '</tbody>' +
        '</table>' +
      '</section>';

    els.results.appendChild(wrap);
  }

  function refreshRamExportState() {
    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.refresh === "function") {
      window.ScopedLabsExport.refresh();
    }
  }

  function invalidateRamExportState() {
    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.invalidate === "function") {
      window.ScopedLabsExport.invalidate();
    }
  }

  function calc() {
    const workload = els.workload.value;
    const concurrency = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.concurrency.value, 0));
    const perProc = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.perProc.value, 0));
    const osGb = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.osGb.value, 0));
    const headroomPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.headroom.value, 0));

    const processMemory = concurrency * perProc;
    const adjustedWorkloadMemory = processMemory * workloadFactor(workload);
    const subtotalMemory = adjustedWorkloadMemory + osGb;
    const reservedMemory = subtotalMemory * (headroomPct / 100);
    const totalRequired = subtotalMemory + reservedMemory;
    const recommended = Math.ceil(totalRequired / 8) * 8;
    const memoryHeadroom = Math.max(0, recommended - totalRequired);
    const reserveRatio = recommended > 0 ? (memoryHeadroom / recommended) * 100 : 0;

    const capacityPressure = Math.min(
      160,
      (totalRequired / Math.max(recommended, 1)) * 100
    );

    const densityPressure = Math.min(
      160,
      (concurrency * perProc / Math.max(recommended, 1)) * 100 * workloadFactor(workload)
    );

    const reserveStress = Math.min(
      160,
      ((reservedMemory / Math.max(totalRequired, 1)) * 100) * 2.2
    );

    const compositeScore = Math.round(
      (capacityPressure * 0.45) +
      (densityPressure * 0.35) +
      (reserveStress * 0.20)
    );

    const metrics = [
      {
        label: "Capacity Pressure",
        value: capacityPressure,
        displayValue: `${Math.round(capacityPressure)}%`
      },
      {
        label: "Density Pressure",
        value: densityPressure,
        displayValue: `${Math.round(densityPressure)}%`
      },
      {
        label: "Reserve Stress",
        value: reserveStress,
        displayValue: `${Math.round(reserveStress)}%`
      }
    ];

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The design is crowding usable memory too tightly. Cache reserve, growth allowance, or virtualization flexibility will shrink first, which increases the chance of swap behavior, instability during burst activity, or forced early platform expansion.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The design is workable, but memory margin is tightening. The system should run, although future growth, transient spikes, or denser workloads will erode available reserve more quickly than the raw capacity number suggests.";
    } else {
      interpretation =
        "The memory plan stays inside a sound operating envelope. Base overhead, workload demand, and reserve headroom remain balanced enough that RAM is unlikely to become the first design limiter under normal expansion.";
    }

    let dominantConstraint = "Balanced memory plan";
    if (analyzer.dominant.label === "Capacity Pressure") {
      dominantConstraint = "Installed memory ceiling";
    } else if (analyzer.dominant.label === "Density Pressure") {
      dominantConstraint = "Per-process / VM density";
    } else if (analyzer.dominant.label === "Reserve Stress") {
      dominantConstraint = "Cache and operating reserve";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "The design still has usable operating room. The next limitation is more likely to show up in storage latency, IOPS behavior, or workload imbalance before RAM becomes the first hard scaling wall.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate workload spikes and future density before locking hardware. This is where cache erosion, virtualization growth, or memory-heavy bursts can force an early jump to the next DIMM or platform tier.";
    } else {
      guidance =
        `Rework the memory plan before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so the design will lose flexibility there first. Reduce workload density, lower per-process footprint, or step up installed RAM and reserve margin.`;
    }

    let cpuCoupling = "CPU and RAM appear reasonably aligned";
    if (cpuContext && typeof cpuContext.cores === "number" && cpuContext.cores < 8 && totalRequired > 64) {
      cpuCoupling = "CPU tier may constrain scaling before the memory plan is fully utilized";
    } else if (cpuContext && typeof cpuContext.cores === "number" && cpuContext.cores >= 16 && totalRequired < 48) {
      cpuCoupling = "Memory footprint is comparatively light against the current CPU recommendation";
    }

    const summaryRows = [
      { label: "Process Memory", value: `${processMemory.toFixed(1)} GB` },
      { label: "Adjusted Workload Memory", value: `${adjustedWorkloadMemory.toFixed(1)} GB` },
      { label: "OS / Base Overhead", value: `${osGb.toFixed(1)} GB` },
      { label: "Reserve / Cache Allocation", value: `${reservedMemory.toFixed(1)} GB` },
      { label: "Total Required", value: `${totalRequired.toFixed(1)} GB` },
      { label: "Recommended Installed RAM", value: `${recommended} GB` }
    ];

    const derivedRows = [
      { label: "Usable Installed Headroom", value: `${memoryHeadroom.toFixed(1)} GB` },
      { label: "Reserve Ratio", value: `${reserveRatio.toFixed(1)}%` },
      { label: "CPU Coupling", value: cpuCoupling }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows,
      derivedRows,
      status: analyzer.status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: {
        labels: metrics.map((m) => m.label),
        values: metrics.map((m) => m.value),
        displayValues: metrics.map((m) => m.displayValue),
        referenceValue: 65,
        healthyMax: 65,
        watchMax: 85,
        axisTitle: "Memory Stress Magnitude",
        referenceLabel: "Healthy Margin Floor",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          120,
          Math.ceil(Math.max(...metrics.map((m) => m.value), 85) * 1.08)
        )
      }
    });

    const ramProofModel = {
      workload,
      concurrency,
      perProc,
      osGb,
      headroomPct,
      processMemory,
      adjustedWorkloadMemory,
      subtotalMemory,
      reservedMemory,
      totalRequired,
      recommended,
      memoryHeadroom,
      reserveRatio,
      status: analyzer.status,
      dominantConstraint,
      cpuCoupling
    };

    const recommendationReferences = buildRamRecommendationReferences(ramProofModel);
    const ramDecisionSchedule = buildRamDecisionSchedule(ramProofModel);
    ramProofModel.recommendationReferences = recommendationReferences;
    ramProofModel.ramDecisionSchedule = ramDecisionSchedule;
    renderRamProofSections(ramProofModel);
    refreshRamExportState();

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        ram: recommended,
        totalRequired,
        reserveRatio,
        dominantConstraint,
        workload,
        status: analyzer.status,
        recommendationReferences,
        ramDecisionSchedule
      }
    });

    hasResult = true;
    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.workload.value = "general";
    els.concurrency.value = 10;
    els.perProc.value = 2;
    els.osGb.value = 8;
    els.headroom.value = 25;
    invalidate();
  });

  ["workload", "concurrency", "perProc", "osGb", "headroom"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/storage-iops/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    refreshFlowNote();
    hideContinue();
  });
})();