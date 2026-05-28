// /assets/pipeline.js
(() => {
  "use strict";

  const pipelines = window.SCOPED_PIPELINES || {};
  const body = document.body;
  if (!body) return;

  const category = body.dataset.category;
  const currentStep = body.dataset.step;
  const laneName = body.dataset.lane || "v1";

  if (!category || !currentStep) return;

  // Support BOTH:
  // 1) new nested structure: SCOPED_PIPELINES.categories[category].lanes[laneName]
  // 2) old flat structure:   SCOPED_PIPELINES[category]
  const nestedSteps =
    pipelines?.categories?.[category]?.lanes?.[laneName];

  const flatSteps =
    pipelines?.[category];

  const steps = Array.isArray(nestedSteps) && nestedSteps.length
    ? nestedSteps
    : (Array.isArray(flatSteps) ? flatSteps : []);

  if (!Array.isArray(steps) || !steps.length) return;

  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  if (currentIndex === -1) return;

  // If already rendered anywhere, stop
  if (document.getElementById("sl-design-pipeline")) return;

  const explicitAnchor = document.getElementById("pipeline");

  const h1 =
    document.querySelector("main .container h1") ||
    document.querySelector("main.container h1") ||
    document.querySelector("main h1");

  if (!explicitAnchor && !h1) return;

  const wrap = document.createElement("section");
  wrap.id = "sl-design-pipeline";
  wrap.className = "sl-pipeline card";
  wrap.setAttribute("aria-label", "Design pipeline");

  const title = document.createElement("div");
  title.className = "sl-pipeline-title";
  title.textContent = "DESIGN PIPELINE";
  wrap.appendChild(title);

  const hasFlowGroups = steps.some((step) => {
    return !!(step && (step.flowGroup || step.group || step.lane));
  });

  const indexedSteps = steps.map((step, index) => ({ ...step, __slIndex: index }));

  function flowGroupFor(step) {
    const raw = String(step.flowGroup || step.group || step.lane || "").toLowerCase();

    if (raw.includes("foundation") || step.id === "area-planner") return "foundation";
    if (raw.includes("optional") || raw.includes("specialty") || raw.includes("branch")) return "optional-specialty-zone";

    return "core";
  }

  function appendStepAnchor(row, step) {
    const index = Number(step.__slIndex || 0);
    const isPast = index < currentIndex;
    const isCurrent = index === currentIndex;

    const a = document.createElement("a");
    a.href = step.href;
    a.className = "sl-pipeline-step";
    if (isPast) a.classList.add("is-complete");
    if (isCurrent) a.classList.add("is-current");
    if (step.optional) a.classList.add("is-optional");
    a.setAttribute("data-step", step.id);
    if (step.optional) a.setAttribute("data-optional-step", "true");
    if (isCurrent) a.setAttribute("aria-current", "step");

    const dot = document.createElement("span");
    dot.className = "sl-pipeline-dot";
    dot.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "sl-pipeline-label";
    label.textContent = step.label;

    a.appendChild(dot);
    a.appendChild(label);
    row.appendChild(a);
  }

  function appendStepRow(parent, groupSteps, ariaLabel) {
    const row = document.createElement("nav");
    row.className = "sl-pipeline-row";
    row.setAttribute("aria-label", ariaLabel || "Pipeline steps");

    groupSteps.forEach((step, index) => {
      appendStepAnchor(row, step);

      if (index < groupSteps.length - 1) {
        const arrow = document.createElement("span");
        arrow.className = "sl-pipeline-sep";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "?";
        row.appendChild(arrow);
      }
    });

    parent.appendChild(row);
  }

  function appendGroupedFlow(parent, label, description, groupSteps, ariaLabel) {
    if (!groupSteps.length) return;

    const group = document.createElement("div");
    group.className = "sl-pipeline-group";
    group.setAttribute("data-pipeline-group", label);

    if (parent.childElementCount > 0) {
      group.style.marginTop = "12px";
      group.style.paddingTop = "12px";
      group.style.borderTop = "1px solid rgba(255,255,255,.08)";
    }

    const groupLabel = document.createElement("div");
    groupLabel.className = "sl-pipeline-group-label";
    groupLabel.textContent = label;
    groupLabel.style.fontSize = ".74rem";
    groupLabel.style.fontWeight = "800";
    groupLabel.style.letterSpacing = ".08em";
    groupLabel.style.textTransform = "uppercase";
    groupLabel.style.color = "rgba(125,255,158,.86)";
    groupLabel.style.marginBottom = "6px";
    group.appendChild(groupLabel);

    if (description) {
      const desc = document.createElement("div");
      desc.className = "sl-pipeline-group-description";
      desc.textContent = description;
      desc.style.fontSize = ".86rem";
      desc.style.color = "rgba(255,255,255,.68)";
      desc.style.margin = "0 0 8px 0";
      group.appendChild(desc);
    }

    appendStepRow(group, groupSteps, ariaLabel);
    parent.appendChild(group);
  }

  if (hasFlowGroups) {
    title.textContent = "DESIGN FLOW";

    const groupsWrap = document.createElement("div");
    groupsWrap.className = "sl-pipeline-groups";

    appendGroupedFlow(
      groupsWrap,
      "Foundation",
      "Create or select the area/zone being planned.",
      indexedSteps.filter((step) => flowGroupFor(step) === "foundation"),
      "Physical Security foundation step"
    );

    appendGroupedFlow(
      groupsWrap,
      "Core area pipeline",
      "Run this path for normal camera coverage areas.",
      indexedSteps.filter((step) => flowGroupFor(step) === "core"),
      "Physical Security core area pipeline steps"
    );

    appendGroupedFlow(
      groupsWrap,
      "Optional specialty zones",
      "Use these only when a specific area needs identity or vehicle capture validation.",
      indexedSteps.filter((step) => flowGroupFor(step) === "optional-specialty-zone"),
      "Physical Security optional specialty zone checks"
    );

    wrap.appendChild(groupsWrap);
  } else {
    const row = document.createElement("nav");
    row.className = "sl-pipeline-row";
    row.setAttribute("aria-label", "Pipeline steps");

    indexedSteps.forEach((step, index) => {
      appendStepAnchor(row, step);

      if (index < indexedSteps.length - 1) {
        const arrow = document.createElement("span");
        arrow.className = "sl-pipeline-sep";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "?";
        row.appendChild(arrow);
      }
    });

    wrap.appendChild(row);
  }

  if (explicitAnchor) {
    // Clear any ghost space / leftover manual content
    explicitAnchor.innerHTML = "";
    explicitAnchor.appendChild(wrap);
  } else {
    h1.insertAdjacentElement("afterend", wrap);
  }
})();