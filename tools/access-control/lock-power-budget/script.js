(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart = null;
  let hasResult = false;

  const els = {
    lockType: $("lockType"),
    voltage: $("voltage"),
    amps: $("amps"),
    locks: $("locks"),
    simul: $("simul"),
    headroom: $("headroom"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    nextWrap: $("continue-wrap"),
    nextBtn: $("continue"),
    flowNote: $("flow-note")
  };

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  function showContinue() {
    els.nextWrap.style.display = "block";
    els.nextBtn.disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    els.nextWrap.style.display = "none";
    els.nextBtn.disabled = true;
    hasResult = false;
  }

  function invalidate() {
    if (!hasResult) return;
    sessionStorage.removeItem(FLOW_KEY);
    destroyChart();
    hideContinue();
  }

  function render(rows) {
    els.results.innerHTML = rows.map(r => `
      <div class="result-row">
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      </div>
    `).join("");
  }

  function loadFlowContext() {
    const raw = sessionStorage.getItem(FLOW_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.category !== "access-control") return;

    els.flowNote.style.display = "block";
    els.flowNote.innerHTML = `
      <strong>Upstream decisions:</strong><br>
      ${parsed.data.recommendation || ""}
    `;
  }

  function getStatus(util) {
    if (util > 85) return "RISK";
    if (util > 65) return "WATCH";
    return "HEALTHY";
  }

  function getInsight(status, simul, locks) {
    if (status === "RISK") {
      return "Power system is near or exceeding safe limits. Simultaneous unlock events could cause voltage drop, lock chatter, or system instability.";
    }
    if (status === "WATCH") {
      return "System is within range but has limited margin. Large unlock events or future expansion may stress the supply.";
    }
    return "Power system is well within limits with sufficient margin for unlock events and expansion.";
  }

  function renderChart(data) {
    destroyChart();

    const canvas = document.createElement("canvas");
    els.results.appendChild(canvas);

    const values = [
      data.peak,
      data.required,
      data.capacity,
      data.util
    ];

    const labels = [
      "Peak Load",
      "Required",
      "Capacity",
      "Utilization"
    ];

    const dominant = values.indexOf(Math.max(...values));

    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: values,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
          borderWidth: 2,
          borderRadius: 8,
          backgroundColor: (ctx) => {
            const v = ctx.raw;
            const i = ctx.dataIndex;

            if (i === dominant) {
              if (v > 85) return "rgba(255,90,90,1)";
              if (v > 65) return "rgba(255,200,80,1)";
              return "rgba(120,255,170,1)";
            }

            if (v > 85) return "rgba(255,90,90,0.25)";
            if (v > 65) return "rgba(255,200,80,0.18)";
            return "rgba(120,255,170,0.12)";
          }
        }]
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#cfe" }
          },
          y: {
            ticks: { color: "#cfe" }
          }
        }
      }
    });
  }

  function calc() {
    const amps = parseFloat(els.amps.value);
    const locks = parseInt(els.locks.value);
    const simul = parseInt(els.simul.value);
    const headroom = parseFloat(els.headroom.value);
    const voltage = parseInt(els.voltage.value);

    const peak = Math.min(locks, simul) * amps;
    const required = peak * (1 + headroom / 100);
    const watts = required * voltage;

    const capacity = required; // assumed supply size
    const util = (peak / capacity) * 100;

    const status = getStatus(util);
    const insight = getInsight(status, simul, locks);

    render([
      { label: "Peak Load", value: peak.toFixed(2) + " A" },
      { label: "Required Supply", value: required.toFixed(2) + " A" },
      { label: "Power", value: watts.toFixed(1) + " W" },
      { label: "Utilization", value: util.toFixed(0) + "%" },
      { label: "System Status", value: status },
      { label: "Engineering Insight", value: insight }
    ]);

    renderChart({
      peak,
      required,
      capacity,
      util
    });

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "lock-power-budget",
      data: { required, watts }
    }));

    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.results.innerHTML = `<div class="muted">Run calculation.</div>`;
    invalidate();
  });

  Object.values(els).forEach(el => {
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT")) {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/panel-capacity/";
  });

  loadFlowContext();
})();
