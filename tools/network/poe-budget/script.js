(function () {

const $ = (id) => document.getElementById(id);

function calc() {

  const poeBudget = Number($("poeBudgetW").value);
  const margin = Number($("marginPct").value);

  const total =
    $("camsCount").value * $("camsW").value +
    $("apsCount").value * $("apsW").value +
    $("phonesCount").value * $("phonesW").value +
    $("otherCount").value * $("otherW").value;

  const safe = poeBudget * (1 - margin/100);
  const headroom = safe - total;
  const util = (total / poeBudget) * 100;

  let status = "";
  let meaning = "";
  let recommendation = "";

  if (headroom < 0) {
    status = "FAIL — Over budget";
    meaning = "Your switch cannot support the connected PoE load under safe operating conditions.";
    recommendation = "Upgrade switch capacity or reduce device load immediately.";
  }
  else if (util > 80) {
    status = "WARNING — High utilization";
    meaning = "System is operating near capacity. Spikes or IR/heaters may push it over.";
    recommendation = "Increase PoE budget or redistribute devices.";
  }
  else {
    status = "GOOD — Within safe limits";
    meaning = "System has adequate headroom for normal operation.";
    recommendation = "Design is acceptable with current assumptions.";
  }

  $("results").innerHTML = `
    <div class="result-row"><b>Total Load:</b> ${total.toFixed(1)} W</div>
    <div class="result-row"><b>Safe Budget:</b> ${safe.toFixed(1)} W</div>
    <div class="result-row"><b>Headroom:</b> ${headroom.toFixed(1)} W</div>
    <div class="result-row"><b>Utilization:</b> ${util.toFixed(1)}%</div>

    <hr>

    <div class="result-row"><b>Status:</b> ${status}</div>
    <div class="result-row"><b>What this means:</b> ${meaning}</div>
    <div class="result-row"><b>Recommendation:</b> ${recommendation}</div>
  `;

  // 🔗 Save to pipeline
  sessionStorage.setItem("pipeline:network", JSON.stringify({
    poeLoad: total
  }));

}

function next() {
  window.location.href = "/tools/network/bandwidth/";
}

$("calc").addEventListener("click", calc);
$("continue").addEventListener("click", next);

})();
