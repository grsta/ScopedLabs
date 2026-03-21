(() => {
  const $ = (id) => document.getElementById(id);

  const DEFAULTS = {
    length: 16,
    width: 10,
    height: 9,
    roomType: "idf",
    reserve: 20,
    clearance: "standard"
  };

  const NEXT_HREF = "/tools/infrastructure/rack-ru-planner/";

  const ROOM_LABELS = {
    closet: "Closet",
    idf: "Small IDF",
    mdf: "MDF / Server Room",
    datacenter: "Data Center"
  };

  const CLEARANCE_LABELS = {
    tight: "Tight / Retrofit",
    standard: "Standard",
    generous: "Generous / Future-Friendly"
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

  function round(value, decimals = 1) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  function whole(value) {
    return Math.round(value);
  }

  function fmtNumber(value, decimals = 0) {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function readInputs() {
    return {
      length: parseFloat($("length").value),
      width: parseFloat($("width").value),
      height: parseFloat($("height").value),
      roomType: $("roomType").value,
      reserve: parseFloat($("reserve").value),
      clearance: $("clearance").value
    };
  }

  function isValid(input) {
    return (
      Number.isFinite(input.length) && input.length > 0 &&
      Number.isFinite(input.width) && input.width > 0 &&
      Number.isFinite(input.height) && input.height > 0 &&
      Number.isFinite(input.reserve) && input.reserve >= 0
    );
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

  function buildInterpretation(data) {
    const roomName = ROOM_LABELS[data.roomType] || "Room";
    const densityTone = {
      Low: "This layout has breathing room and should be easier to service and grow.",
      Medium: "This layout is workable, but space discipline will matter as hardware and pathway density increase.",
      High: "This layout is space-efficient but will require tighter planning discipline around clearances, airflow, and future growth."
    }[data.density];

    const rackTone =
      data.estimatedRacks <= 1
        ? "Expect this to behave like a compact single-rack or closet-class deployment."
        : data.estimatedRacks <= 3
          ? "This supports a small multi-rack footprint, but aisle discipline and service access will matter."
          : "This has enough area to support a more deliberate rack layout and staged growth planning.";

    return `${fmtNumber(data.totalSqft)} sq ft places this space in the ${roomName} planning range. After applying ${CLEARANCE_LABELS[data.clearance].toLowerCase()} clearance assumptions and a ${fmtNumber(data.reserve)}% planning reserve, usable working area lands around ${fmtNumber(data.usableSqft)} sq ft. ${rackTone} ${densityTone} ${ceilingComment(data.height, data.roomType)}`;
  }

  function buildPipelineContext(data) {
    return `Passing forward ${fmtNumber(data.usableSqft)} usable sq ft, an estimated ${fmtNumber(data.estimatedRacks)} rack position${data.estimatedRacks === 1 ? "" : "s"}, ${data.density.toLowerCase()} density guidance, and ${fmtNumber(data.totalCubicFt)} cubic ft of room volume into Rack RU Planner.`;
  }

  function clearResults() {
    $("empty-state").classList.remove("hidden");
    $("results-wrap").classList.add("hidden");
    $("result-grid").innerHTML = "";
    $("interpretation").textContent = "";
    $("pipeline-context").textContent = "";
  }

  function renderCards(cards) {
    const grid = $("result-grid");
    grid.innerHTML = "";

    cards.forEach((card) => {
      const div = document.createElement("div");
      div.className = "result-card";
      div.innerHTML = `
        <span class="result-label">${card.label}</span>
        <span class="result-value">${card.value}</span>
      `;
      grid.appendChild(div);
    });
  }

  function writeContext(data) {
    sessionStorage.setItem("infra_room_sqft", String(round(data.totalSqft, 1)));
    sessionStorage.setItem("infra_room_usable_sqft", String(round(data.usableSqft, 1)));
    sessionStorage.setItem("infra_room_type", data.roomType);
    sessionStorage.setItem("infra_room_density", data.density);
    sessionStorage.setItem("infra_room_volume_cuft", String(round(data.totalCubicFt, 1)));
    sessionStorage.setItem("infra_room_est_racks", String(data.estimatedRacks));
    sessionStorage.setItem("infra_room_clearance_profile", data.clearance);
    sessionStorage.setItem("infra_room_reserve_pct", String(round(data.reserve, 0)));
    sessionStorage.setItem("infra_last_pipeline_tool", "room-square-footage");
  }

  function invalidate() {
    clearResults();
    sessionStorage.removeItem("infra_room_sqft");
    sessionStorage.removeItem("infra_room_usable_sqft");
    sessionStorage.removeItem("infra_room_type");
    sessionStorage.removeItem("infra_room_density");
    sessionStorage.removeItem("infra_room_volume_cuft");
    sessionStorage.removeItem("infra_room_est_racks");
    sessionStorage.removeItem("infra_room_clearance_profile");
    sessionStorage.removeItem("infra_room_reserve_pct");
    sessionStorage.removeItem("infra_last_pipeline_tool");
  }

  function calculate() {
    const input = readInputs();

    if (!isValid(input)) {
      alert("Please enter valid positive values for room dimensions and reserve.");
      return;
    }

    const totalSqft = input.length * input.width;
    const totalCubicFt = totalSqft * input.height;

    const clearanceFactor = CLEARANCE_FACTORS[input.clearance] || 0.68;
    const roomMultiplier = ROOM_TYPE_MULTIPLIERS[input.roomType] || 1.0;

    const usableBeforeReserve = totalSqft * clearanceFactor * roomMultiplier;
    const usableSqft = usableBeforeReserve / (1 + input.reserve / 100);

    const estimatedRacks = estimateRackCount(usableSqft, input.roomType);
    const density = classifyDensity(usableSqft, estimatedRacks);

    const data = {
      ...input,
      totalSqft: round(totalSqft, 1),
      totalCubicFt: round(totalCubicFt, 1),
      usableSqft: round(Math.max(usableSqft, 0), 1),
      estimatedRacks,
      density
    };

    writeContext(data);

    renderCards([
      { label: "Total Room Area", value: `${fmtNumber(data.totalSqft, 1)} sq ft` },
      { label: "Usable Working Area", value: `${fmtNumber(data.usableSqft, 1)} sq ft` },
      { label: "Room Volume", value: `${fmtNumber(data.totalCubicFt, 0)} cu ft` },
      { label: "Estimated Rack Positions", value: fmtNumber(data.estimatedRacks) },
      { label: "Planning Density", value: data.density },
      { label: "Room Type", value: ROOM_LABELS[data.roomType] }
    ]);

    $("interpretation").textContent = buildInterpretation(data);
    $("pipeline-context").textContent = buildPipelineContext(data);

    $("empty-state").classList.add("hidden");
    $("results-wrap").classList.remove("hidden");
    $("continueBtn").setAttribute("href", NEXT_HREF);
  }

  function reset() {
    $("length").value = DEFAULTS.length;
    $("width").value = DEFAULTS.width;
    $("height").value = DEFAULTS.height;
    $("roomType").value = DEFAULTS.roomType;
    $("reserve").value = DEFAULTS.reserve;
    $("clearance").value = DEFAULTS.clearance;
    invalidate();
  }

  function maybeShowFlowNote() {
    const flow = $("flow-note");
    if (!flow) return;

    const upstreamRoomSqft = sessionStorage.getItem("infra_room_sqft");
    const upstreamDensity = sessionStorage.getItem("infra_room_density");
    const upstreamRacks = sessionStorage.getItem("infra_room_est_racks");
    const lastTool = sessionStorage.getItem("infra_last_pipeline_tool");

    if (lastTool && lastTool !== "room-square-footage" && (upstreamRoomSqft || upstreamRacks)) {
      flow.classList.add("is-visible");
      flow.textContent = `Existing infrastructure context detected: ${upstreamRoomSqft ? `${upstreamRoomSqft} sq ft` : "room data"}${upstreamDensity ? `, ${upstreamDensity.toLowerCase()} density` : ""}${upstreamRacks ? `, ${upstreamRacks} estimated rack position${upstreamRacks === "1" ? "" : "s"}` : ""}. Recalculate here if you want to override it for this lane.`;
    }
  }

  function bindInvalidation() {
    ["length", "width", "height", "roomType", "reserve", "clearance"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    $("calc").addEventListener("click", calculate);
    $("reset").addEventListener("click", reset);
    bindInvalidation();
    clearResults();
    maybeShowFlowNote();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

