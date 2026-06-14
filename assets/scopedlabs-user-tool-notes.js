(function () {
  "use strict";

  const mounts = document.querySelectorAll("[data-scopedlabs-user-tool-notes]");
  if (!mounts.length) return;

  function getPageValue(name, fallback) {
    return document.body?.dataset?.[name] || fallback || "";
  }

  function keyFor(mount) {
    const category = mount.getAttribute("data-category-slug") || getPageValue("category", "site");
    const tool = mount.getAttribute("data-tool-slug") || getPageValue("step", location.pathname.replace(/\/$/, "").split("/").pop() || "tool");
    return "scopedlabs:user-tool-notes:" + category + ":" + tool;
  }

  function render(mount) {
    if (mount.dataset.scopedlabsUserToolNotesReady === "true") return;
    mount.dataset.scopedlabsUserToolNotesReady = "true";

    const key = keyFor(mount);
    const saved = localStorage.getItem(key) || "";

    const label = document.createElement("label");
    label.className = "field full";

    const span = document.createElement("span");
    span.className = "label";
    span.textContent = "Notes";

    const textarea = document.createElement("textarea");
    textarea.id = mount.getAttribute("data-textarea-id") || "userToolNotes";
    textarea.setAttribute("data-scopedlabs-user-tool-notes-input", "true");
    textarea.setAttribute("data-report-user-tool-notes", "true");
    textarea.placeholder = mount.getAttribute("data-placeholder") || "Optional notes, assumptions, client context, or design caveats for this tool.";
    textarea.value = saved;

    textarea.addEventListener("input", function () {
      localStorage.setItem(key, textarea.value || "");
      window.ScopedLabsUserToolNotes = window.ScopedLabsUserToolNotes || {};
      window.ScopedLabsUserToolNotes[key] = textarea.value || "";
    });

    window.ScopedLabsUserToolNotes = window.ScopedLabsUserToolNotes || {};
    window.ScopedLabsUserToolNotes[key] = saved;

    label.appendChild(span);
    label.appendChild(textarea);
    mount.appendChild(label);
  }

  mounts.forEach(render);
})();