/* ScopedLabs Access Control Tool Assistant Adapters
   Version: access-control-assistant-adapters-013-access-level-sizing
   Purpose: category-specific local assistant model adapters. Dormant unless a tool explicitly calls one.
*/
(function () {
  "use strict";

  const API_VERSION = "access-control-assistant-adapters-013-access-level-sizing";

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
    const cardFormat = safeText(data.cardFormat || "Card format / facility code not documented");
    const existingCompatibility = safeText(data.existingCredentialCompatibility || "Existing credential compatibility not documented");
    const compatibilityRisk = safeText(data.compatibilityRisk || "Credential compatibility risk not documented");
    const verificationStatus = safeText(data.verificationStatus || status);
    const verificationSteps = Array.isArray(data.verificationSteps)
      ? data.verificationSteps.map((item) => safeText(item)).filter(Boolean)
      : [];
    const guidance = safeText(data.guidance || "Confirm reader protocol, credential technology, facility-code/bit-format, existing-card compatibility, environmental rating, and user throughput before continuing.");

    const interfaceWatch = iface.toLowerCase().includes("wiegand");
    const summary = "Use the sections below to confirm the reader decision, correct interface concerns, and carry the right assumptions into Lock Power Budget.";

    return {
      category: "access-control",
      tool: "reader-type-selector",
      kicker: "Local Design Assistant",
      title: "Reader Type Assistant",
      status,
      summary,
      hideStandardLists: true,
      hideHeaderPills: true,
      sections: [
        ...(verificationStatus.includes("WATCH") || verificationStatus.includes("RISK") ? [{
          title: "Verification Required",
          body: "Do not treat this reader decision as final until these cautionary items are confirmed or documented as accepted constraints.",
          items: verificationSteps.length ? verificationSteps : [guidance]
        }] : []),
        {
          title: "Decision Basis",
          body: "This recommendation balances credential technology, reader protocol, card-format/facility-code status, existing-card compatibility, environment, and throughput. The result is acceptable for planning only if the credential verification trail is documented.",
          items: [
            "Credential format basis: " + cardFormat,
            "Existing credential compatibility: " + existingCompatibility,
            "Compatibility risk: " + compatibilityRisk
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
          title: "Next Step",
          body: "This is the handoff. Lock Power Budget needs the reader type, reader interface, and any legacy-interface warning so it does not guess load or wiring assumptions.",
          items: [
            "Carry reader type into Lock Power Budget.",
            "Carry panel interface into Lock Power Budget.",
            "Carry credential/security assumption into Summary.",
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


  function buildLockPowerBudgetModel(data) {
    const status = safeText(data.status || "WATCH");
    const lockType = safeText(data.lockType || "lock hardware");
    const lockCount = safeText(data.lockCount || "0");
    const simultaneousUnlocks = safeText(data.simultaneousUnlocks || "0");
    const peak = Number(data.peakLoadA || 0);
    const required = Number(data.requiredSupplyA || 0);
    const watts = Number(data.watts || 0);
    const utilization = Number(data.utilizationPct || 0);
    const guidance = safeText(data.guidance || "Verify supply capacity, listed hardware requirements, and field voltage drop before finalizing the lock power design.");
    const insight = safeText(data.insight || "Power budget should be validated against manufacturer current data and real simultaneous unlock behavior.");

    return {
      category: "access-control",
      tool: "lock-power-budget",
      kicker: "Local Design Assistant",
      title: "Lock Power Assistant",
      status,
      summary: "Use this result to verify whether the selected lock strategy has enough electrical margin before panel capacity is finalized.",
      hideStandardLists: true,
      hideHeaderPills: true,
      sections: [
        {
          title: "Power Sizing Basis",
          body: "The calculation converts simultaneous unlock demand into peak current, required supply capacity, and wattage after design headroom.",
          items: [
            "Lock type basis: " + lockType,
            "Installed locks: " + lockCount,
            "Simultaneous unlocks modeled: " + simultaneousUnlocks,
            "Peak load: " + (Number.isFinite(peak) ? peak.toFixed(2) + " A" : "not available"),
            "Required supply: " + (Number.isFinite(required) ? required.toFixed(2) + " A" : "not available"),
            "Power budget: " + (Number.isFinite(watts) ? watts.toFixed(1) + " W" : "not available"),
            "Utilization: " + (Number.isFinite(utilization) ? utilization.toFixed(0) + "%" : "not available")
          ]
        },
        {
          title: "Field Verification",
          body: guidance,
          items: [
            "Verify manufacturer surge and hold-current values before final product selection.",
            "Check voltage drop against actual cable length, conductor size, and lock location.",
            "Confirm fire/life-safety release behavior and listed power supply requirements."
          ]
        },
        {
          title: "Next Step Handoff",
          body: insight,
          items: [
            "Carry required supply and power status into Panel Capacity.",
            "Keep reader power, lock power, and auxiliary devices separated unless a combined supply is intentional.",
            "Document WATCH or RISK results in the final Access Control summary."
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Next Actions",
      assumptions: [
        "Peak load is based on the modeled simultaneous unlock count.",
        "Headroom is planning reserve, not a substitute for listed equipment requirements.",
        "Final design must validate cable loss, fire release, and product-specific current draw."
      ],
      actions: [
        guidance,
        "Confirm voltage-drop and listed supply requirements before panel capacity is finalized.",
        "Carry the power status into Panel Capacity and Summary."
      ]
    };
  }


  function buildPanelCapacityModel(data) {
    const status = safeText(data.status || "WATCH");
    const doors = Number(data.doors || 0);
    const targetDoors = Number(data.targetDoors || 0);
    const panels = Number(data.panels || 0);
    const expansions = Number(data.expansions || 0);
    const panelCapacity = Number(data.panelCapacity || 0);
    const spareDoors = Number(data.spareDoors || 0);
    const readers = Number(data.readers || 0);
    const totalInputs = Number(data.totalInputs || 0);
    const totalOutputs = Number(data.totalOutputs || 0);
    const loadPct = Number(data.loadPct || 0);
    const expansionPct = Number(data.expansionPct || 0);
    const guidance = safeText(data.guidance || "Verify controller capacity, expansion limits, licensing, and future growth before finalizing the panel architecture.");
    const insight = safeText(data.insight || "Panel capacity should leave practical room for growth, maintenance changes, and platform-specific device limits.");

    return {
      category: "access-control",
      tool: "panel-capacity",
      kicker: "Local Design Assistant",
      title: "Panel Capacity Assistant",
      status,
      summary: "Use this result to decide whether the modeled controller and expansion plan has enough capacity before access levels are sized.",
      hideStandardLists: true,
      hideHeaderPills: true,
      sections: [
        {
          title: "Panel Sizing Basis",
          body: "The calculation converts door count and spare target into required panel capacity, expansion modules, and remaining growth margin.",
          items: [
            "Doors modeled: " + (Number.isFinite(doors) ? doors : "not available"),
            "Target doors with spare: " + (Number.isFinite(targetDoors) ? targetDoors : "not available"),
            "Panels required: " + (Number.isFinite(panels) ? panels : "not available"),
            "Expansion modules: " + (Number.isFinite(expansions) ? expansions : "not available"),
            "Panel door capacity: " + (Number.isFinite(panelCapacity) ? panelCapacity : "not available"),
            "Spare door capacity: " + (Number.isFinite(spareDoors) ? spareDoors : "not available")
          ]
        },
        {
          title: "Capacity Pressure",
          body: guidance,
          items: [
            "System load: " + (Number.isFinite(loadPct) ? loadPct.toFixed(0) + "%" : "not available"),
            "Expansion pressure: " + (Number.isFinite(expansionPct) ? expansionPct.toFixed(0) + "%" : "not available"),
            "Total readers: " + (Number.isFinite(readers) ? readers : "not available"),
            "Inputs / outputs: " + (Number.isFinite(totalInputs) ? totalInputs : "not available") + " / " + (Number.isFinite(totalOutputs) ? totalOutputs : "not available")
          ]
        },
        {
          title: "Next Step Handoff",
          body: insight,
          items: [
            "Carry panel count, expansion pressure, and spare capacity into Access Level Sizing.",
            "Confirm platform limits for readers, inputs, outputs, licensing, and door interfaces before hardware is finalized.",
            "Document WATCH or RISK capacity results in the final Access Control summary."
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Next Actions",
      assumptions: [
        "Panel count is based on modeled door capacity and configured spare percentage.",
        "Expansion pressure assumes the selected base panel and expansion module capacities are valid for the target platform.",
        "Final design must validate licensing, controller limits, cabinet space, power, network, and manufacturer-specific constraints."
      ],
      actions: [
        guidance,
        "Confirm platform-specific reader, input, output, and door limits before procurement.",
        "Carry the capacity status into Access Level Sizing and Summary."
      ]
    };
  }



  function buildAccessLevelSizingModel(data) {
    const status = safeText(data.status || "WATCH");
    const riskLabel = safeText(data.riskLabel || "Complexity pending");
    const total = safeText(data.total || "0");
    const combinations = safeText(data.combinations || "0");
    const scalingPressure = safeText(data.scalingPressure || "0");
    const adminLoadIndex = safeText(data.adminLoadIndex || "0");
    const recommendedLimit = safeText(data.recommendedLimit || "0");
    const overshoot = safeText(data.overshoot || "0");
    const threshold = safeText(data.thresholdMessage || "Threshold status pending.");
    const insight = safeText(data.insight || "Review role, area, schedule, and group structure before final rollout.");

    return {
      category: "access-control",
      tool: "access-level-sizing",
      kicker: "Local Design Assistant",
      title: "Access Level Assistant",
      status,
      summary: "Use this result to decide whether the access-level model is maintainable before closing the Access Control flow.",
      hideStandardLists: true,
      hideHeaderPills: true,
      sections: [
        {
          title: "Complexity Basis",
          body: "The model converts roles, areas, schedules, door groups, and complexity profile into access-level pressure.",
          items: [
            "Access levels: " + total,
            "Role-area combinations: " + combinations,
            "Scaling pressure: " + scalingPressure,
            "Admin load index: " + adminLoadIndex
          ]
        },
        {
          title: "Threshold Review",
          body: threshold,
          items: [
            "Complexity result: " + riskLabel,
            "Recommended limit: " + recommendedLimit,
            "Overshoot: " + overshoot,
            insight
          ]
        },
        {
          title: "Closeout Guidance",
          body: status === "RISK" ? "Simplify the access model before growth turns permission management into operational risk." : status === "WATCH" ? "Keep the structure, but document naming, grouping, and schedule rules before expansion." : "The access-level model is usable for the final Access Control handoff.",
          items: [
            "Reduce duplicate roles or overlapping areas if complexity pressure is high.",
            "Consolidate schedules and door groups where possible.",
            "Document the final role/area naming rules before the system is handed off."
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: [
        "Role and area counts represent the active access model.",
        "Schedules and door groups are treated as contributors to administration overhead.",
        "This result evaluates maintainability, not controller hardware capacity."
      ],
      actions: [
        threshold,
        insight,
        "Carry this access-level status into final Access Control documentation."
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
    }),
    "lock-power-budget": Object.freeze({
      slug: "lock-power-budget",
      title: "Lock Power Assistant",
      buildModel: buildLockPowerBudgetModel
    }),
    "panel-capacity": Object.freeze({
      slug: "panel-capacity",
      title: "Panel Capacity Assistant",
      buildModel: buildPanelCapacityModel
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
