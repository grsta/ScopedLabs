/* ScopedLabs Access Control Tool Assistant Adapters
   Version: access-control-assistant-adapters-005-reader-dedupe
   Purpose: category-specific local assistant model adapters. Dormant unless a tool explicitly calls one.
*/
(function () {
  "use strict";

  const API_VERSION = "access-control-assistant-adapters-005-reader-dedupe";

  function safeText(value) {
    return String(value ?? "");
  }

  function isConditional(data) {
    return safeText(data.recommendation).toUpperCase() === "CONDITIONAL";
  }

  function buildFailSafeFailSecureModel(data) {
    const status = safeText(data.status || (isConditional(data) ? "WATCH" : "HEALTHY"));
    const recommendation = safeText(data.recommendation || "Recommendation pending");
    const confidence = safeText(data.confidence || "unknown").toLowerCase();
    const risk = safeText(data.risk || "Review egress, security, and power-loss behavior before hardware selection.");
    const guidance = safeText(data.guidance || data.actionableGuidance || "Confirm code, egress, and operational requirements before moving to the next access-control step.");

    const actions = isConditional(data)
      ? [
          "Do not finalize lock type from this result alone; send the door through code and operational review.",
          "Confirm egress path, fire alarm release behavior, and authority requirements before reader or power design.",
          "Carry the resolved door behavior into Reader Type Selector only after the decision is confirmed."
        ]
      : [
          guidance,
          "Verify that selected hardware preserves safe egress and matches the actual door use case.",
          "Carry this fail-state decision into Reader Type Selector and Lock Power Budget."
        ];

    return {
      category: "access-control",
      tool: "fail-safe-fail-secure",
      kicker: "Local Design Assistant",
      title: "Fail-Safe / Fail-Secure Assistant",
      status,
      summary: recommendation + " is the current planning direction with " + confidence + " confidence. The key risk to manage is: " + risk,
      assumptionsTitle: "Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: [
        "Door behavior is being reviewed before reader strategy, lock power, panel sizing, or access-level structure.",
        "Life-safety, egress, fire alarm, AHJ, and adopted code requirements override this planning output.",
        "Fail-secure behavior still requires compliant egress hardware and safe exit under the real door use case.",
        "Power reliability and threat level are planning inputs, not final hardware specifications."
      ],
      actions
    };
  }

    function buildReaderTypeSelectorModel(data) {
    const status = safeText(data.status || "WATCH");
    const recommendation = safeText(data.recommendation || "Reader recommendation pending");
    const iface = safeText(data.interfaceChoice || "Interface not documented");
    const security = safeText(data.security || "Security basis not documented");
    const environment = safeText(data.environment || "Environment not documented");
    const throughput = safeText(data.throughput || "Throughput not documented");
    const guidance = safeText(data.guidance || "Confirm reader interface, credential behavior, environmental rating, and user throughput before continuing.");

    const interfaceWatch = iface.toLowerCase().includes("wiegand");
    const summary = recommendation + " is the current reader direction. Interface basis: " + iface + ".";

    return {
      category: "access-control",
      tool: "reader-type-selector",
      kicker: "Local Design Assistant",
      title: "Reader Type Assistant",
      status,
      summary,
      hideStandardLists: true,
      sections: [
        {
          title: "Decision Basis",
          body: "This explains why the current reader direction was selected from the inputs.",
          items: [
            "Reader direction: " + recommendation,
            "Interface basis: " + iface,
            "Security basis: " + security,
            "Environment basis: " + environment,
            "Throughput basis: " + throughput
          ]
        },
        {
          title: "Fix Path",
          body: interfaceWatch
            ? "This is the correction path. The reader body style can stay, but the signaling path should be reviewed because Wiegand is weaker for new supervised designs."
            : "This is the verification path. The selected interface is stronger for new designs, but compatibility and addressing still need confirmation.",
          items: interfaceWatch
            ? [
                "Confirm whether the access panel and reader line can support OSDP.",
                "If OSDP is available, prefer it for new supervised/encrypted deployments.",
                "If Wiegand must remain, document it as a legacy/compatibility constraint before Lock Power Budget.",
                "Do not let reader choice finalize panel assumptions until interface support is confirmed."
              ]
            : [
                "Confirm OSDP reader addressing and supported cable topology.",
                "Verify selected credentials match the site's lifecycle and security policy.",
                "Carry reader power/interface assumptions into Lock Power Budget.",
                "Keep platform-specific compatibility checks open until product selection."
              ]
        },
        {
          title: "Carry Forward",
          body: "This is what should move downstream. Lock Power Budget should receive the selected reader type, panel interface, and any legacy-interface warning.",
          items: [
            "Carry reader type into Lock Power Budget.",
            "Carry panel interface into Lock Power Budget.",
            "Carry environment rating into hardware notes.",
            "Carry any legacy interface warning into Summary."
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Next Actions",
      assumptions: [
        "Reader type is being selected after the door fail-state decision has been documented.",
        "Credential strategy, panel interface, environmental rating, and user flow must align with the access-control platform.",
        "Reader choice should be carried into Lock Power Budget before panel capacity is finalized."
      ],
      actions: Array.isArray(data.requiredActions) && data.requiredActions.length
        ? data.requiredActions
        : [
            guidance,
            "Confirm OSDP/Wiegand support before committing to reader hardware.",
            "Carry this reader strategy into Lock Power Budget."
          ]
    };
  }

  const adapters = Object.freeze({
    "fail-safe-fail-secure": Object.freeze({
      slug: "fail-safe-fail-secure",
      title: "Fail-Safe / Fail-Secure Assistant",
      buildModel: buildFailSafeFailSecureModel
    }),
    "reader-type-selector": Object.freeze({
      slug: "reader-type-selector",
      title: "Reader Type Assistant",
      buildModel: buildReaderTypeSelectorModel
    })
  });

  function getAdapter(slug) {
    return adapters[slug] || null;
  }

  function listAdapters() {
    return Object.keys(adapters).map((key) => adapters[key]);
  }

  function hasAdapter(slug) {
    return !!adapters[slug];
  }

  window.ScopedLabsAccessControlToolAssistantAdapters = Object.freeze({
    version: API_VERSION,
    getAdapter,
    listAdapters,
    hasAdapter
  });
})();
