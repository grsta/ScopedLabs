// /assets/access-control-category-nav.js
(() => {
  "use strict";

  const body = document.body;
  const mount = document.getElementById("pipeline");

  if (!body || !mount) return;
  if (document.getElementById("sl-design-pipeline")) return;
  if (body.dataset.category !== "access-control") return;

  const isCategoryNav =
    mount.hasAttribute("data-access-control-category-nav") ||
    body.dataset.navMode === "category";

  if (!isCategoryNav) return;

  const heading =
    document.querySelector("main h1") ||
    document.querySelector("h1");

  const currentLabel =
    mount.getAttribute("data-nav-label") ||
    (heading && heading.textContent ? heading.textContent.trim() : "Current Tool");

  function makeStep(label, href, state) {
    const a = document.createElement("a");
    a.href = href;
    a.className = "sl-pipeline-step";

    if (state === "complete") a.classList.add("is-complete");
    if (state === "current") {
      a.classList.add("is-current");
      a.setAttribute("aria-current", "page");
    }

    const dot = document.createElement("span");
    dot.className = "sl-pipeline-dot";
    dot.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = "sl-pipeline-label";
    text.textContent = label;

    a.appendChild(dot);
    a.appendChild(text);

    return a;
  }

  function makeSeparator() {
    const sep = document.createElement("span");
    sep.className = "sl-pipeline-sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "\u2192";
    return sep;
  }

  const wrap = document.createElement("section");
  wrap.id = "sl-design-pipeline";
  wrap.className = "sl-pipeline card";
  wrap.setAttribute("aria-label", "Access Control tool path");
  wrap.setAttribute("data-access-control-category-nav-rendered", "true");

  const title = document.createElement("div");
  title.className = "sl-pipeline-title";
  title.textContent = "TOOL PATH";
  wrap.appendChild(title);

  const row = document.createElement("nav");
  row.className = "sl-pipeline-row";
  row.setAttribute("aria-label", "Access Control tool path");

  const steps = [
    makeStep("Tools", "/tools/", "complete"),
    makeStep("Access Control", "/tools/access-control/", "complete"),
    makeStep(currentLabel, window.location.pathname || "#", "current"),
    makeStep("Summary", "/tools/access-control/summary/", "")
  ];

  steps.forEach((step, index) => {
    row.appendChild(step);
    if (index < steps.length - 1) row.appendChild(makeSeparator());
  });

  wrap.appendChild(row);
  mount.innerHTML = "";
  mount.appendChild(wrap);
})();
