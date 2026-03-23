(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  let chart;

  function invalidate() {
    sessionStorage.removeItem(FLOW_KEY);
    $("continue-wrap").style.display = "none";
    $("analysis").style.display = "none";
    $("chart-wrap").style.display = "none";
    if (chart) chart.destroy();
  }

  function workloadFactor(w) {
    return {
      web: 0.9,
      db: 1.1,
      video: 1.35,
      compute: 1.5
    }[w] || 1;
  }

  function renderChart(values, labels, ref = 65) {

    if (chart) chart.destroy();

    chart = new Chart($("chart"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: values.map(v =>
            v > 65 ? "rgba(255,90,90,1)" :
            v > 35 ? "rgba(255,180,80,1)" :
                     "rgba(120,255,170,1)"
          )
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true }
        }
      }
    });

    $("chart-wrap").style.display = "block";
  }

  function calc() {

    const c = +$("concurrency").value;
    const cpu = +$("cpuPerWorker").value;
    const peak = +$("peak").value;
    const target = +$("targetUtil").value;
    const wf = workloadFactor($("workload").value);

    const demand = c * (cpu / 100);
    const effective = demand * peak * wf;
    const cores = effective / (target / 100);

    const score1 = Math.min(100, effective * 4);
    const score2 = Math.min(100, cores * 2);
    const score3 = Math.min(100, target);

    const values = [score1, score2, score3];
    const labels = ["Load Pressure", "Core Demand", "Utilization"];

    const dominant = labels[values.indexOf(Math.max(...values))];

    const status =
      Math.max(...values) > 65 ? "RISK" :
      Math.max(...values) > 35 ? "WATCH" : "HEALTHY";

    $("results").innerHTML = `
      <div class="result-row"><span>Effective Load</span><span>${effective.toFixed(2)}</span></div>
      <div class="result-row"><span>Required Cores</span><span>${cores.toFixed(2)}</span></div>
      <div class="result-row"><span>Status</span><span>${status}</span></div>
    `;

    renderChart(values, labels);

    $("analysis").style.display = "block";
    $("analysis").innerHTML = `
      <div class="analysis-note">
        <strong>Engineering Interpretation</strong>
        CPU sizing is being driven primarily by ${dominant.toLowerCase()}, indicating that scaling pressure will first appear here.
      </div>
    `;

    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "compute",
      step: "cpu-sizing",
      data: { cores }
    }));

    $("continue-wrap").style.display = "block";
  }

  $("calc").onclick = calc;
  $("reset").onclick = invalidate;

})();