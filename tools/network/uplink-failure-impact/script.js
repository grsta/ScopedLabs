(() => {
  const DEFAULTS = {
    sites: 1,
    users: 25,
    apps: "mixed",
    failover: "no",
    minutes: 60
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    sites: $("sites"),
    users: $("users"),
    apps: $("apps"),
    failover: $("failover"),
    minutes: $("minutes"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  function safeNum(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function fmt(value, decimals = 1) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(decimals);
  }

  function fmtPct(value, decimals = 1) {
    return Number.isFinite(value) ? `${value.toFixed(decimals)}%` : "—";
  }

  function impactLabel(status) {
    if (status === "RISK") return "Critical restoration priority";
    if (status === "WATCH") return "Elevated restoration priority";
    return "Controlled / lower immediate impact";
  }

  function applyDefaults() {
    els.sites.value = String(DEFAULTS.sites);
    els.users.value = String(DEFAULTS.users);
    els.apps.value = DEFAULTS.apps;
    els.failover.value = DEFAULTS.failover;
    els.minutes.value = String(DEFAULTS.minutes);
  }

  function invalidate() {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function getInputs() {
    const sites = Math.max(1, Math.floor(safeNum(els.sites)));
    const users = Math.max(0, Math.floor(safeNum(els.users)));
    const minutes = Math.max(0, safeNum(els.minutes));
    const apps = String(els.apps?.value || "mixed");
    const failover = String(els.failover?.value || "no");

    if ([sites, users, minutes].some((v) => !Number.isFinite(v))) {
      return { ok: false, message: "Enter valid numeric values." };
    }

    return { ok: true, sites, users, minutes, apps, failover };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { sites, users, apps, failover, minutes } = input;

    const sitePressure = Math.min(sites * 12, 36);
    const userPressure = Math.min(users * 0.8, 32);

    let appPressure = 0;
    if (apps === "basic") appPressure = 10;
    if (apps === "mixed") appPressure = 20;
    if (apps === "critical") appPressure = 32;

    let failoverRelief = 0;
    if (failover === "yes") failoverRelief = 18;
    if (failover === "partial") failoverRelief = 8;
    if (failover === "no") failoverRelief = 0;

    const durationPressure = Math.min((minutes / 60) * 6, 24);

    const preFailoverScore = sitePressure + userPressure + appPressure + durationPressure;
    const finalScore = ScopedLabsAnalyzer.clamp(preFailoverScore - failoverRelief, 0, 100);

    const failoverPenalty = failoverRelief === 0 ? 26 : failover === "partial" ? 18 : 8;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: finalScore,
      metrics: [
        {
          label: "Scale Pressure",
          value: sitePressure + userPressure,
          displayValue: `${fmt(sitePressure + userPressure, 0)} pts`
        },
        {
          label: "Application Criticality",
          value: appPressure,
          displayValue: apps.toUpperCase()
        },
        {
          label: "Failover Weakness",
          value: failoverPenalty,
          displayValue: failover.toUpperCase()
        },
        {
          label: "Duration Pressure",
          value: durationPressure,
          displayValue: `${fmt(minutes, 0)} min`
        }
      ],
      healthyMax: 35,
      watchMax: 70
    });

    const peopleImpact = sites * users;
    const impactClass = impactLabel(statusPack.status);
    const dominantLabel = statusPack.dominant.label;

    let interpretation = `The modeled outage impact score is ${fmt(finalScore, 0)} / 100 for ${sites} affected site${sites === 1 ? "" : "s"} and ${users} affected user${users === 1 ? "" : "s"}, with an expected outage duration of ${fmt(minutes, 0)} minutes.`;

    if (failover === "no") {
      interpretation += " There is no alternate transport path, so this is a full dependency failure rather than a degraded-capacity event.";
    } else if (failover === "partial") {
      interpretation += " Partial failover exists, but it does not fully remove risk because limited backup bandwidth often preserves connectivity while still degrading business-critical workflows.";
    } else {
      interpretation += " Full failover materially reduces impact, but it does not eliminate operational pressure if the applications behind the link are latency- or continuity-sensitive.";
    }

    if (statusPack.status === "RISK") {
      interpretation += " This is firmly in a high-consequence band. Users are likely to feel the outage as a business interruption, not just a technical inconvenience.";
    } else if (statusPack.status === "WATCH") {
      interpretation += " The outage is meaningful enough that restoration priority should be elevated, especially if multiple functions depend on the same path.";
    } else {
      interpretation += " The outage is still operationally relevant, but the modeled conditions suggest it is more contained than broadly disruptive.";
    }

    let dominantConstraint = "";
    if (dominantLabel === "Scale Pressure") {
      dominantConstraint = "Scale pressure is the dominant limiter. The link supports enough users or sites that restoring connectivity quickly matters more than any single application detail.";
    } else if (dominantLabel === "Application Criticality") {
      dominantConstraint = "Application criticality is the dominant limiter. Even a smaller outage becomes a major event when voice, cameras, POS, VPN, or other operationally essential services depend on the path.";
    } else if (dominantLabel === "Failover Weakness") {
      dominantConstraint = "Failover weakness is the dominant limiter. The biggest problem is not just the outage itself, but the lack of an adequate alternate path when the primary uplink is lost.";
    } else {
      dominantConstraint = "Duration pressure is the dominant limiter. The outage becomes progressively more serious because recovery time itself is large enough to amplify business pain.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Treat this as a restoration-first event. Verify physical link state, optics, handoff, power, WAN interface errors, and ISP demarc status immediately. If failover exists, validate routing, NAT, and policy behavior before assuming backup service is actually protecting production workflows.";
    } else if (statusPack.status === "WATCH") {
      guidance = "Escalate troubleshooting early and confirm whether the backup path can actually carry the affected application mix. Mixed SaaS and voice traffic often fail in practice even when partial connectivity remains.";
    } else {
      guidance = "The modeled impact is controlled, but use this as a resilience check. If the same link later supports more users, more sites, or more critical traffic, the restoration priority will rise quickly.";
    }

    return {
      ok: true,
      input,
      sitePressure,
      userPressure,
      appPressure,
      failoverPenalty,
      durationPressure,
      preFailoverScore,
      finalScore,
      peopleImpact,
      impactClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    const { input } = data;

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Impact Score", value: `${fmt(data.finalScore, 0)} / 100` },
        { label: "Impact Class", value: data.impactClass },
        { label: "Sites Affected", value: `${input.sites}` },
        { label: "Users Affected", value: `${input.users}` }
      ],
      derivedRows: [
        { label: "Application Profile", value: input.apps.toUpperCase() },
        { label: "Failover State", value: input.failover.toUpperCase() },
        { label: "Outage Duration", value: `${fmt(input.minutes, 0)} min` },
        { label: "Scale Pressure", value: `${fmt(data.sitePressure + data.userPressure, 0)} pts` },
        { label: "Application Criticality Pressure", value: `${fmt(data.appPressure, 0)} pts` },
        { label: "Failover Weakness Pressure", value: `${fmt(data.failoverPenalty, 0)} pts` },
        { label: "Duration Pressure", value: `${fmt(data.durationPressure, 0)} pts` },
        { label: "People Impact Index", value: `${data.peopleImpact}` }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Scale Pressure",
          "Application Criticality",
          "Failover Weakness",
          "Duration Pressure"
        ],
        values: [
          Number((data.sitePressure + data.userPressure).toFixed(1)),
          Number(data.appPressure.toFixed(1)),
          Number(data.failoverPenalty.toFixed(1)),
          Number(data.durationPressure.toFixed(1))
        ],
        displayValues: [
          `${fmt(data.sitePressure + data.userPressure, 0)} pts`,
          input.apps.toUpperCase(),
          input.failover.toUpperCase(),
          `${fmt(input.minutes, 0)} min`
        ],
        referenceValue: 35,
        healthyMax: 35,
        watchMax: 70,
        axisTitle: "Outage Impact Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          80,
          Math.ceil(
            Math.max(
              data.sitePressure + data.userPressure,
              data.appPressure,
              data.failoverPenalty,
              data.durationPressure,
              70
            ) * 1.15
          )
        )
      }
    });
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    invalidate();
  }

  function bindInvalidation() {
    [els.sites, els.users, els.apps, els.failover, els.minutes].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindInvalidation();

    els.calc?.addEventListener("click", calculate);
    els.reset?.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) {
        e.preventDefault();
        calculate();
      }
    });

    reset();
  });
})();
