document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  if (!body) return;

  const category = body.dataset.category;
  const currentStep = body.dataset.step;

  if (!category || !currentStep) return;

  const allPipelines = window.SCOPEDLABS_PIPELINES || {};
  const pipeline = allPipelines[category];

  if (!pipeline || !Array.isArray(pipeline.steps) || !pipeline.steps.length) return;

  const titleEl = document.querySelector("main h1, .page h1, .tool-page h1");
  if (!titleEl) return;

  const steps = pipeline.steps;
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  if (currentIndex === -1) return;

  const wrapper = document.createElement("div");
  wrapper.className = "pipeline-bar";
  wrapper.setAttribute("data-pipeline", category);

  const title = document.createElement("div");
  title.className = "pipeline-title";
  title.textContent = pipeline.title || "Design Pipeline";
  wrapper.appendChild(title);

  const stepsRow = document.createElement("div");
  stepsRow.className = "pipeline-steps";

  steps.forEach((step, index) => {
    const stepEl =
      step.href
        ? document.createElement("a")
        : document.createElement("div");

    stepEl.className = "pipe-step";
    stepEl.dataset.step = step.key;

    if (step.href) {
      stepEl.href = step.href;
    }

    if (index < currentIndex) {
      stepEl.classList.add("complete");
    } else if (index === currentIndex) {
      stepEl.classList.add("active");
      if (stepEl.tagName === "A") {
        stepEl.removeAttribute("href");
      }
    }

    const dot = document.createElement("span");
    dot.className = "pipe-dot";

    const label = document.createElement("span");
    label.className = "pipe-label";
    label.textContent = step.label;

    stepEl.appendChild(dot);
    stepEl.appendChild(label);
    stepsRow.appendChild(stepEl);

    if (index < steps.length - 1) {
      const arrow = document.createElement("div");
      arrow.className = "pipe-arrow";
      arrow.textContent = "→";
      stepsRow.appendChild(arrow);
    }
  });

  wrapper.appendChild(stepsRow);

  titleEl.insertAdjacentElement("afterend", wrapper);
});