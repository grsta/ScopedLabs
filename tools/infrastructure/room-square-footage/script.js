(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    length: $("length"),
    width: $("width"),
    height: $("height"),
    roomType: $("roomType"),
    reserve: $("reserve"),
    clearance: $("clearance"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    flowNote: $("flow-note")
  };

  let hasResult = false;

  const ROOM_LABELS = {
    closet: "Closet",
    idf: "Small IDF",
    mdf: "MDF / Server Room",
    datacenter: "Data Center"
  };

  const CLEARANCE_LABELS = {
    tight: "Tight",
    standard: "Standard",
    generous: "Generous"
  };

  const CLEARANCE_FACTORS = {
    tight: 0.78,
    standard: 0.68,
    generous: 0.58
  };

  const ROOM_TYPE_MULTIPLIERS = {
    closet: 0.92,
    idf: 1.0,
    mdf: 1.06,
    datacenter: 1.12
  };

  function fmt(value, decimals = 0) {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function round(value, decimals = 1) {
    const p = 10 ** decimals;
    return Math.round(value * p) / p;
  }

  function estimateRackCount(usableSqft, roomType) {
    const sqftPerRack = {
      closet: 32,
      idf: 28,
      mdf: 24,
      datacenter: 20
    }[roomType] || 28;

    return Math.max(1, Math.floor(usableSqft / sqftPerRack));
  }

  function classifyDensity(usableSqft, rackCount) {
    const sqftPerRack = usableSqft / Math.max(rackCount, 1);
    if (sqftPerRack >= 28) return "Low";
    if (sqftPerRack >= 20) return "Medium";
    return "High";
  }

  function ceilingComment(height, roomType) {
    if (height < 8) {
      return "Ceiling height is tight for cable pathways, ladder rack, and comfortable overhead service access.";
    }
    if (height < 9 && (roomType === "mdf" || roomType === "datacenter")) {
      return "Ceiling height is workable, but overhead routing and future expansion may feel constrained.";
    }
    if (height >= 10) {
      return "Ceiling height supports cleaner overhead routing and better long-term serviceability.";
    }
    return "Ceiling height is generally workable for typical rack and pathway planning.";
  }

  function savePipelineContext(data) {
    sessionStorage.setItem("infra_room_sqft", String(data.totalSqft));
    sessionStorage.setItem("infra_room_usable_sqft", String(data.usableSqft));
    sessionStorage.setItem("infra_room_type", data.roomType);
    sessionStorage.setItem("infra_room_density", data.density);
    sessionStorage.setItem("infra_room_volume_cuft", String(data.totalCubicFt));
    sessionStorage.setItem("infra_room_est_racks", String(data.estimatedRacks));
    sessionStorage.setItem("infra_room_clearance_profile", data.clearance);
    sessionStorage.setItem("infra_room_reserve_pct", String(data.reserve));
    sessionStorage.setItem("infra_last_pipeline_tool", "room-square-footage");
  }

  function renderFlowNote() {
    if (!els.flowNote) return;

    const lastTool = sessionStorage.getItem("infra_last_pipeline_tool");
    const roomSqft = sessionStorage.getItem("infra_room_sqft");
    const density = sessionStorage.getItem("infra_room_density");
    const racks = sessionStorage.getItem("infra_room_est_racks");

    if (lastTool && lastTool !== "room-square-footage" && (roomSqft || racks)) {
      els.flowNote.style.display = "";
      els.flowNote.textContent =
        `Existing infrastructure context detected: ` +
        `${roomSqft ? `${roomSqft} sq ft` : "room data"}` +
        `${density ? `, ${density.toLowerCase()} density` : ""}` +
        `${racks ? `, ${racks} estimated rack position${racks === "1" ? "" : "s"}` : ""}. ` +
        `Recalculate here if you want to override it for this lane.`;
    } else {
      els.flowNote.style.display = "none";
      els.flowNote.textContent = "";
    }
  }

  function renderInitialState() {
    if (!els.results) return;
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
    hasResult = false;
  }

  function invalidate() {
    if (!hasResult) return;
    renderInitialState();
  }

  function calculate() {
    const length = parseFloat(els.length?.value);
    const width = parseFloat(els.width?.value);
    const height = parseFloat(els.height?.value);
    const reserve = parseFloat(els.reserve?.value);
    const roomType = els.roomType?.value;
    const clearance = els.clearance?.value;

    if (
      !Number.isFinite(length) || length <= 0 ||
      !Number.isFinite(width) || width <= 0 ||
      !Number.isFinite(height) || height <= 0 ||
      !Number.isFinite(reserve) || reserve < 0
    ) {
      alert("Please enter valid positive values for room dimensions and reserve.");
      return;
    }

    const totalSqft = round(length * width, 1);
    const totalCubicFt = round(totalSqft * height, 1);

    const clearanceFactor = CLEARANCE_FACTORS[clearance] || 0.68;
    const roomMultiplier = ROOM_TYPE_MULTIPLIERS[roomType] || 1.0;

    const usableBeforeReserve = totalSqft * clearanceFactor * roomMultiplier;
    const usableSqft = round(Math.max(usableBeforeReserve / (1 + reserve / 100), 0), 1);

    const estimatedRacks = estimateRackCount(usableSqft, roomType);
    const density = classifyDensity(usableSqft, estimatedRacks);
    const roomLabel = ROOM_LABELS[roomType] || "Room";

    const densityTone = {
      Low: "This layout has breathing room and should be easier to service and grow.",
      Medium: "This layout is workable, but space discipline will matter as hardware and pathway density increase.",
      High: "This layout is space-efficient but will require tighter planning discipline around clearances, airflow, and future growth."
    }[density];

    const rackTone =
      estimatedRacks <= 1
        ? "Expect this to behave like a compact single-rack or closet-class deployment."
        : estimatedRacks <= 3
          ? "This supports a small multi-rack footprint, but aisle discipline and service access will matter."
          : "This has enough area to support a more deliberate rack layout and staged growth planning.";

    const interpretation =
      `${fmt(totalSqft, 1)} sq ft places this space in the ${roomLabel} planning range. ` +
      `After applying ${CLEARANCE_LABELS[clearance].toLowerCase()} clearance assumptions and a ${fmt(reserve)}% planning reserve, ` +
      `usable working area lands around ${fmt(usableSqft, 1)} sq ft. ` +
      `${rackTone} ${densityTone} ${ceilingComment(height, roomType)}`;

    const pipelineContext =
      `Passing forward ${fmt(usableSqft, 1)} usable sq ft, an estimated ${fmt(estimatedRacks)} rack position` +
      `${estimatedRacks === 1 ? "" : "s"}, ${density.toLowerCase()} density guidance, and ${fmt(totalCubicFt, 0)} cubic ft of room volume into Rack RU Planner.`;

    savePipelineContext({
      totalSqft,
      usableSqft,
      roomType,
      density,
      totalCubicFt,
      estimatedRacks,
      clearance,
      reserve
    });

    if (els.results) {
      els.results.innerHTML = `
        <div class="results-grid">
          <div class="result-box">
            <div class="k">Total Room Area</div>
            <div class="v">${fmt(totalSqft, 1)} sq ft</div>
          </div>

          <div class="result-box">
            <div class="k">Usable Working Area</div>
            <div class="v">${fmt(usableSqft, 1)} sq ft</div>
          </div>

          <div class="result-box">
            <div class="k">Room Volume</div>
            <div class="v">${fmt(totalCubicFt, 0)} cu ft</div>
          </div>

          <div class="result-box">
            <div class="k">Estimated Rack Positions</div>
            <div class="v">${fmt(estimatedRacks)}</div>
          </div>

          <div class="result-box">
            <div class="k">Planning Density</div>
            <div class="v">${density}</div>
          </div>

          <div class="result-box">
            <div class="k">Room Classification</div>
            <div class="v">${roomLabel}</div>
          </div>
        </div>

        <div class="interpretation">
          <h3>Interpretation</h3>
          <p>${interpretation}</p>
        </div>

        <div class="pipeline-context">
          <h3>Pipeline Context</h3>
          <p>${pipelineContext}</p>
        </div>
      `;
    }

    if (els.continueWrap) els.continueWrap.style.display = "";
    if (els.continue) els.continue.disabled = false;

    hasResult = true;
    renderFlowNote();
  }

  function resetForm() {
    if (els.length) els.length.value = 16;
    if (els.width) els.width.value = 10;
    if (els.height) els.height.value = 9;
    if (els.roomType) els.roomType.value = "idf";
    if (els.reserve) els.reserve.value = 20;
    if (els.clearance) els.clearance.value = "standard";
    renderInitialState();
  }

  function goNext() {
    window.location.href = "/tools/infrastructure/rack-ru-planner/";
  }

  [
    els.length,
    els.width,
    els.height,
    els.roomType,
    els.reserve,
    els.clearance
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  if (els.calc) els.calc.addEventListener("click", calculate);
  if (els.reset) els.reset.addEventListener("click", resetForm);
  if (els.continue) els.continue.addEventListener("click", goNext);

  renderInitialState();
  renderFlowNote();
})();
