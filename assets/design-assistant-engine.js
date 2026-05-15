(() => {
  "use strict";

  const STYLE_ID = "scopedlabs-design-assistant-engine-002";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, '&#039;');
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".sl-design-assistant.lens-design-assistant.full-output{margin-top:18px!important;padding:18px!important;border-radius:20px!important;border:1px solid rgba(125,255,158,.22)!important;background:radial-gradient(circle at 10% 4%,rgba(82,255,138,.10),transparent 30%),radial-gradient(circle at 92% 8%,rgba(255,96,88,.10),transparent 30%),linear-gradient(180deg,rgba(4,14,10,.98),rgba(1,6,4,.98))!important;box-shadow:0 26px 80px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.055)!important;overflow:hidden;}",
      ".sl-design-assistant .lens-design-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid rgba(148,163,184,.12);}",
      ".sl-design-assistant .lens-design-kicker{color:#7dff98;font-size:.66rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase;margin-bottom:7px;}",
      ".sl-design-assistant .lens-design-title{margin:0;color:#fff;font-size:1.06rem;font-weight:950;line-height:1.16;}",
      ".sl-design-assistant .lens-design-copy{margin:7px 0 0;color:rgba(226,232,240,.70);font-size:.82rem;line-height:1.48;max-width:760px;}",
      ".sl-design-assistant .lens-design-status{border:1px solid rgba(255,96,88,.34);border-radius:999px;background:rgba(255,96,88,.10);color:#ff8f88;padding:8px 11px;font-size:.68rem;font-weight:950;letter-spacing:.11em;text-transform:uppercase;white-space:nowrap;}",
      ".sl-design-assistant .lens-design-status.healthy{border-color:rgba(125,255,152,.34);background:rgba(125,255,152,.08);color:#7dff98;}",
      ".sl-design-assistant .lens-design-status.watch{border-color:rgba(255,211,79,.34);background:rgba(255,211,79,.08);color:#ffd34f;}",
      ".sl-design-assistant .lens-design-status.risk{border-color:rgba(255,96,88,.34);background:rgba(255,96,88,.10);color:#ff8f88;}",
      ".sl-design-assistant .sl-scenario-pill-row{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 12px;padding-bottom:12px;border-bottom:1px solid rgba(148,163,184,.10);}",
      ".sl-design-assistant .sl-scenario-pill{border:1px solid rgba(148,163,184,.18);background:rgba(255,255,255,.035);color:rgba(226,232,240,.86);border-radius:999px;padding:10px 14px;font-size:.78rem;font-weight:900;line-height:1;cursor:pointer;}",
      ".sl-design-assistant .sl-scenario-pill.active,.sl-design-assistant .sl-scenario-pill:hover{border-color:rgba(125,255,152,.45);background:rgba(125,255,152,.14);color:#7dff98;}",
      ".sl-design-assistant .lens-design-layout,.sl-design-assistant .lens-design-split{display:grid!important;gap:14px!important;margin-top:14px!important;}",
      ".sl-design-assistant .lens-design-layout{grid-template-columns:1fr!important;}",
      ".sl-design-assistant .lens-design-split{grid-template-columns:1.1fr .9fr!important;}",
      ".sl-design-assistant .lens-fov-card,.sl-design-assistant .lens-advice-card{border:1px solid rgba(148,163,184,.13);border-radius:14px;background:rgba(255,255,255,.025);padding:12px;min-width:0;}",
      ".sl-design-assistant .lens-fov-stage{height:460px!important;border-radius:16px!important;border:1px solid rgba(148,163,184,.12);background:radial-gradient(circle at 10% 42%,rgba(125,255,152,.08),transparent 34%),radial-gradient(circle at 92% 50%,rgba(255,96,88,.08),transparent 34%),rgba(255,255,255,.022)!important;overflow:hidden;}",
      ".sl-design-assistant .lens-fov-stage svg,.sl-design-assistant .sl-chart-stage svg{display:block;width:100%;height:100%;}",
      ".sl-design-assistant .lens-target-strip,.sl-design-assistant .lens-mini-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;margin-top:14px!important;}",
      ".sl-design-assistant .lens-mini-card{border:1px solid rgba(148,163,184,.13);border-radius:10px;background:rgba(255,255,255,.025);padding:9px;min-width:0;}",
      ".sl-design-assistant .lens-mini-label{color:rgba(203,213,225,.64);font-size:.56rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;}",
      ".sl-design-assistant .lens-mini-value{display:block;margin-top:6px;color:#fff;font-size:.88rem;font-weight:950;line-height:1.15;}",
      ".sl-design-assistant .sl-mini-note{margin-top:6px;color:rgba(226,232,240,.62);font-size:.68rem;line-height:1.35;}",
      ".sl-design-assistant .sl-control-grid{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:10px!important;margin-top:12px!important;}",
      ".sl-design-assistant .sl-driver-row{margin-top:10px;}",
      ".sl-design-assistant .sl-driver-head{display:grid;grid-template-columns:1fr auto;gap:10px;color:rgba(226,232,240,.82);font-size:.78rem;}",
      ".sl-design-assistant .sl-driver-head span{color:#fff;font-weight:900;}",
      ".sl-design-assistant .sl-driver-track{height:8px;margin-top:7px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden;}",
      ".sl-design-assistant .sl-driver-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,rgba(125,255,152,.9),rgba(255,211,79,.86),rgba(255,96,88,.86));}",
      ".sl-design-assistant .sl-check-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px;}",
      ".sl-design-assistant .sl-check-grid strong{color:#fff;font-size:.94rem;font-weight:950;}",
      ".sl-design-assistant .sl-check-grid p,.sl-design-assistant .sl-control-row p{margin:7px 0 0;color:rgba(226,232,240,.72);font-size:.75rem;line-height:1.4;}",
      ".sl-design-assistant .sl-section{margin-top:14px;}",
      ".sl-design-assistant .sl-inner-head{padding-bottom:0;border-bottom:0;}",
      ".sl-design-assistant .sl-banner{margin-top:12px;border:1px solid rgba(255,211,79,.26);border-radius:12px;background:rgba(255,211,79,.07);color:rgba(255,246,196,.92);padding:10px 12px;font-weight:800;line-height:1.45;}",
      ".sl-design-assistant .sl-chart-stage{height:250px;margin-top:12px;border-radius:14px;border:1px solid rgba(148,163,184,.13);background:rgba(0,0,0,.18);overflow:hidden;}",
      ".sl-design-assistant .sl-control-list{display:grid;gap:10px;margin-top:12px;}",
      ".sl-design-assistant .sl-control-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border:1px solid rgba(125,255,152,.14);border-radius:12px;background:rgba(125,255,152,.035);padding:10px;}",
      ".sl-design-assistant .sl-control-row strong{color:#fff;font-weight:950;}",
      "@media (max-width:1100px){.sl-design-assistant .sl-control-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}",
      "@media (max-width:900px){.sl-design-assistant .lens-design-split,.sl-design-assistant .lens-target-strip,.sl-design-assistant .lens-mini-grid,.sl-design-assistant .sl-check-grid,.sl-design-assistant .sl-control-grid{grid-template-columns:1fr!important;}.sl-design-assistant .lens-design-head{display:grid;}.sl-design-assistant .lens-fov-stage{height:330px!important;}.sl-design-assistant .sl-control-row{grid-template-columns:1fr;}.sl-design-assistant .sl-control-row .btn{justify-self:start;}}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function statusClass(status) {
    const value = String(status || "WATCH").toUpperCase();
    if (value === "HEALTHY") return "healthy";
    if (value === "RISK") return "risk";
    return "watch";
  }

  function miniCard(item) {
    return "" +
      "<div class=\"lens-mini-card\">" +
        "<div class=\"lens-mini-label\">" + escapeHtml(item.label) + "</div>" +
        "<span class=\"lens-mini-value\">" + escapeHtml(item.value) + "</span>" +
        (item.note ? "<div class=\"sl-mini-note\">" + escapeHtml(item.note) + "</div>" : "") +
      "</div>";
  }

  function head(kicker, title, copy, pill) {
    return "" +
      "<div class=\"lens-design-head sl-inner-head\">" +
        "<div>" +
          "<div class=\"lens-design-kicker\">" + escapeHtml(kicker || "") + "</div>" +
          "<h4 class=\"lens-design-title\">" + escapeHtml(title || "") + "</h4>" +
          (copy ? "<p class=\"lens-design-copy\">" + escapeHtml(copy) + "</p>" : "") +
        "</div>" +
        (pill ? "<div class=\"lens-design-status " + statusClass(pill.status || "HEALTHY") + "\">" + escapeHtml(pill.label || pill.status || "") + "</div>" : "") +
      "</div>";
  }

  function driverBars(bars) {
    return (bars || []).map((bar) => {
      const value = Math.max(0, Math.min(100, Number(bar.value) || 0));
      return "" +
        "<div class=\"sl-driver-row\">" +
          "<div class=\"sl-driver-head\"><strong>" + escapeHtml(bar.label) + "</strong><span>" + escapeHtml(bar.display || String(Math.round(value))) + "</span></div>" +
          "<div class=\"sl-driver-track\"><div class=\"sl-driver-fill\" style=\"width:" + value.toFixed(0) + "%\"></div></div>" +
        "</div>";
    }).join("");
  }

    function recommendationCard(model) {
    const rec = model.recommendation;
    if (!rec) return "";

    const action = rec.action || rec.actionLabel || "Review recommendation";
    const reason = rec.reason || "The assistant selected this as the most appropriate next step for the current design state.";
    const expected = rec.expectedResult || "Review the corrected result before carrying it forward.";
    const next = rec.nextStep || "Validate the selected result in the next pipeline step.";
    const confidence = rec.confidence || "Primary recommendation";
    const canApply = rec.scenarioId !== null && rec.scenarioId !== undefined && rec.canApply !== false;

    return "" +
      '<div class="lens-advice-card sl-section sl-primary-recommendation">' +
        head(rec.kicker || "Recommended correction", action, rec.summary || "The assistant selects one primary path first so the user does not have to guess between equal options.", { label: rec.pill || "Recommended", status: rec.status || "HEALTHY" }) +
        '<div class="lens-target-strip">' +
          miniCard({ label: "Reason", value: reason, note: "Why this is the primary path." }) +
          miniCard({ label: "Expected result", value: expected, note: "What should change after applying it." }) +
          miniCard({ label: "Confidence", value: confidence, note: "How the assistant classified this correction." }) +
          miniCard({ label: "Next step", value: next, note: "Where this result should be validated." }) +
        '</div>' +
        (rec.detail ? '<div class="sl-banner">' + escapeHtml(rec.detail) + '</div>' : "") +
        (canApply ? '<div class="btn-row" style="margin-top:12px;"><button class="btn btn-primary" type="button" data-sl-apply-recommendation="' + escapeHtml(rec.scenarioId) + '">' + escapeHtml(rec.buttonLabel || action) + '</button></div>' : "") +
      '</div>';
  }



  function render(model) {
    injectStyles();

    const mount = model.mount;
    if (!mount) return;

    mount.hidden = false;
    mount.classList.add("sl-design-assistant", "lens-design-assistant", "full-output");

    const status = String(model.status || "WATCH").toUpperCase();
    const currentScenarioId = model.currentScenarioId || "current";
    const scenarios = model.scenarios || [];

    const pills = [{ id: "current", label: model.currentLabel || "Custom Design" }].concat(
      scenarios.filter((scenario) => scenario && scenario.canApply !== false).map((scenario) => ({
        id: scenario.id,
        label: scenario.pillLabel || scenario.label
      }))
    );

    mount.innerHTML = "" +
      "<div class=\"lens-design-head\">" +
        "<div>" +
          "<div class=\"lens-design-kicker\">" + escapeHtml(model.kicker || "Design Assistant") + "</div>" +
          "<h3 class=\"lens-design-title\">" + escapeHtml(model.title || "Design assistant") + "</h3>" +
          "<p class=\"lens-design-copy\">" + escapeHtml(model.copy || "") + "</p>" +
        "</div>" +
        "<div class=\"lens-design-status " + statusClass(status) + "\">" + escapeHtml(status) + "</div>" +
      "</div>" +
      "<div class=\"sl-scenario-pill-row\">" +
        pills.map((pill) => "<button class=\"sl-scenario-pill" + (pill.id === currentScenarioId ? " active" : "") + "\" type=\"button\" data-sl-scenario-pill=\"" + escapeHtml(pill.id) + "\">" + escapeHtml(pill.label) + "</button>").join("") +
      "</div>" +
      (model.modeNoticeHtml || "") +
      recommendationCard(model) +
      "<div class=\"lens-advice-card sl-section\">" +
        head(model.custom?.kicker, model.custom?.title, model.custom?.copy, { label: model.custom?.pill || "Custom What-If", status: "HEALTHY" }) +
        "<div class=\"sl-control-grid\">" +
          (model.custom?.inputs || []).map((input) => "<label class=\"field\"><span class=\"label\">" + escapeHtml(input.label) + "</span><input data-sl-custom-input=\"" + escapeHtml(input.key) + "\" type=\"" + escapeHtml(input.type || "number") + "\" min=\"" + escapeHtml(input.min ?? "") + "\" max=\"" + escapeHtml(input.max ?? "") + "\" step=\"" + escapeHtml(input.step ?? "any") + "\" value=\"" + escapeHtml(input.value ?? "") + "\"></label>").join("") +
        "</div>" +
        "<div class=\"btn-row\" style=\"margin-top:12px;\"><button class=\"btn btn-primary\" type=\"button\" data-sl-apply-custom>" + escapeHtml(model.custom?.buttonLabel || "Apply Custom Check") + "</button></div>" +
      "</div>" +
      "<div class=\"lens-design-split\">" +
        "<div class=\"lens-advice-card\">" +
          "<div class=\"lens-design-kicker\">" + escapeHtml(model.selectedResult?.kicker || "Selected Scenario Result") + "</div>" +
          "<h4 class=\"lens-design-title\">" + escapeHtml(model.selectedResult?.title || "") + "</h4>" +
          "<p class=\"lens-design-copy\">" + escapeHtml(model.selectedResult?.copy || "") + "</p>" +
          "<div class=\"lens-target-strip\">" + (model.selectedResult?.metrics || []).map(miniCard).join("") + "</div>" +
        "</div>" +
        "<div class=\"lens-advice-card\">" +
          "<div class=\"lens-design-kicker\">" + escapeHtml(model.driver?.kicker || "Dominant Driver") + "</div>" +
          "<h4 class=\"lens-design-title\">" + escapeHtml(model.driver?.title || "") + "</h4>" +
          "<p class=\"lens-design-copy\">" + escapeHtml(model.driver?.copy || "") + "</p>" +
          driverBars(model.driver?.bars) +
        "</div>" +
      "</div>" +
      "<div class=\"lens-design-layout\">" +
        "<div class=\"lens-fov-card\">" +
          "<div class=\"lens-design-kicker\">" + escapeHtml(model.visual?.kicker || "Visualization") + "</div>" +
          "<h4 class=\"lens-design-title\">" + escapeHtml(model.visual?.title || "") + "</h4>" +
          "<p class=\"lens-design-copy\">" + escapeHtml(model.visual?.copy || "") + "</p>" +
          "<div class=\"lens-fov-stage\">" + (model.visual?.html || "") + "</div>" +
          "<div class=\"lens-target-strip\">" + (model.visual?.metrics || []).map(miniCard).join("") + "</div>" +
        "</div>" +
      "</div>" +
      "<div class=\"sl-check-grid\">" +
        (model.checks || []).map((check) => "<div class=\"lens-advice-card\"><div class=\"lens-design-kicker\">" + escapeHtml(check.kicker || "") + "</div><strong>" + escapeHtml(check.title || "") + "</strong><p>" + escapeHtml(check.copy || "") + "</p></div>").join("") +
      "</div>" +
      "<div class=\"lens-advice-card sl-section\">" +
        head(model.targets?.kicker, model.targets?.title, model.targets?.copy, { label: model.targets?.pill || "Design Targets", status: "HEALTHY" }) +
        "<div class=\"lens-target-strip\">" + (model.targets?.metrics || []).map(miniCard).join("") + "</div>" +
        (model.targets?.banner ? "<div class=\"sl-banner\">" + escapeHtml(model.targets.banner) + "</div>" : "") +
      "</div>" +
      "<div class=\"lens-advice-card sl-section\">" +
        head(model.comparison?.kicker, model.comparison?.title, model.comparison?.copy, { label: model.comparison?.pill || "Scenario Analytics", status: "HEALTHY" }) +
        "<div class=\"lens-target-strip\">" + (model.comparison?.metrics || []).map(miniCard).join("") + "</div>" +
        "<div class=\"sl-chart-stage\">" + (model.comparison?.chartHtml || "") + "</div>" +
        (model.comparison?.banner ? "<div class=\"sl-banner\">" + escapeHtml(model.comparison.banner) + "</div>" : "") +
      "</div>" +
      "<div class=\"lens-advice-card sl-section\">" +
        head(model.controls?.kicker, model.controls?.title, model.controls?.copy, { label: model.controls?.pill || "Correction Path", status: "HEALTHY" }) +
        "<div class=\"sl-control-list\">" +
          scenarios.map((scenario) => {
            const disabled = scenario.canApply === false;
            return "<div class=\"sl-control-row\"><div><strong>" + escapeHtml(scenario.label || "") + "</strong><p>" + escapeHtml(scenario.intent || "") + "</p><p><strong>Expected result:</strong> " + escapeHtml(scenario.summary || "") + "</p></div><button class=\"btn" + (disabled ? "" : " btn-primary") + "\" type=\"button\" data-sl-apply-scenario=\"" + escapeHtml(scenario.id || "") + "\"" + (disabled ? " disabled" : "") + ">" + escapeHtml(disabled ? "Unavailable" : (scenario.actionLabel || "Apply Branch")) + "</button></div>";
          }).join("") +
        "</div>" +
      "</div>" +
      "<div class=\"lens-advice-card sl-section\">" +
        head(model.carryForward?.kicker, model.carryForward?.title, model.carryForward?.copy, { label: model.carryForward?.pill || "Live Shadow Path", status: "HEALTHY" }) +
        "<div class=\"lens-target-strip\">" + (model.carryForward?.metrics || []).map(miniCard).join("") + "</div>" +
      "</div>";

    mount.querySelectorAll("[data-sl-scenario-pill]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.slScenarioPill;
        if (id === "current") {
          model.onSelectCurrent?.();
          return;
        }
        const scenario = scenarios.find((item) => item.id === id);
        if (scenario) model.onApplyScenario?.(scenario);
      });
    });

    mount.querySelectorAll("[data-sl-apply-scenario]").forEach((button) => {
      button.addEventListener("click", () => {
        const scenario = scenarios.find((item) => item.id === button.dataset.slApplyScenario);
        if (scenario) model.onApplyScenario?.(scenario);
      });
    });

    const recommendationButton = mount.querySelector("[data-sl-apply-recommendation]");
    if (recommendationButton) {
      recommendationButton.addEventListener("click", () => {
        const id = recommendationButton.dataset.slApplyRecommendation;
        if (id === "current") {
          model.onSelectCurrent?.();
          return;
        }

        const scenario = scenarios.find((item) => item.id === id);
        if (scenario) model.onApplyScenario?.(scenario);
      });
    }

    const customButton = mount.querySelector("[data-sl-apply-custom]");
    if (customButton) {
      customButton.addEventListener("click", () => {
        const values = {};
        mount.querySelectorAll("[data-sl-custom-input]").forEach((input) => {
          values[input.dataset.slCustomInput] = input.type === "number" ? Number(input.value) : input.value;
        });
        model.onApplyCustom?.(values);
      });
    }
  }

  window.ScopedLabsDesignAssistant = { render };
})();
