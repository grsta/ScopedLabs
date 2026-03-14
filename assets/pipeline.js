// /assets/pipeline.js
(() => {
  "use strict";

  const pipelines = window.SCOPED_PIPELINES || {};
  const body = document.body;
  if (!body) return;

  const category = body.dataset.category;
  const currentStep = body.dataset.step;

  if (!category || !currentStep) return;

  const steps = pipelines[category];
  if (!Array.isArray(steps) || !steps.length) return;

  const currentIndex = steps.findIndex(step => step.id === currentStep);
  if (currentIndex === -1) return;

  const h1 =
  document.querySelector("main .container h1") ||
  document.querySelector("main.container h1") ||
  document.querySelector("main h1");
  if (!h1) return;

  if (document.getElementById("sl-design-pipeline")) return;

  const wrap = document.createElement("section");
  wrap.id = "sl-design-pipeline";
  wrap.className = "sl-pipeline card";
  wrap.setAttribute("aria-label", "Design pipeline");

  const title = document.createElement("div");
  title.className = "sl-pipeline-title";
  title.textContent = "DESIGN PIPELINE";
  wrap.appendChild(title);

  const row = document.createElement("nav");
  row.className = "sl-pipeline-row";
  row.setAttribute("aria-label", "Pipeline steps");

  steps.forEach((step, index) => {
    const isPast = index < currentIndex;
    const isCurrent = index === currentIndex;

    const a = document.createElement("a");
    a.href = step.href;
    a.className = "sl-pipeline-step";
    if (isPast) a.classList.add("is-complete");
    if (isCurrent) a.classList.add("is-current");
    a.setAttribute("data-step", step.id);
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

    if (index < steps.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "sl-pipeline-sep";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      row.appendChild(arrow);
    }
  });

  wrap.appendChild(row);

  h1.insertAdjacentElement("afterend", wrap);
})();