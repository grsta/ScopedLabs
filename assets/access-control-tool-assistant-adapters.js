/* ScopedLabs Access Control Tool Assistant Adapters
   Version: access-control-assistant-adapters-019-elevator-reader
   Purpose: category-specific local assistant model adapters. Dormant unless a tool explicitly calls one.
*/
(function () {
  "use strict";

  const API_VERSION = "access-control-assistant-adapters-019-elevator-reader";

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
    const accessModelType = safeText(data.accessModelType || "Role-Based / Standard");
    const turnoverPressure = safeText(data.turnoverPressure || "Normal");
    const exceptionGroups = safeText(data.exceptionGroups || "0");
    const restrictedZones = safeText(data.restrictedZones || "Low");
    const scheduleChangePressure = safeText(data.scheduleChangePressure || "Normal");
    const adminGovernance = safeText(data.adminGovernance || "Standard");
    const recommendedActions = Array.isArray(data.recommendedActions) && data.recommendedActions.length
      ? data.recommendedActions.map((item) => safeText(item)).filter(Boolean)
      : [
          threshold,
          insight,
          "Carry this access-level status into final Access Control documentation."
        ];

    return {
      category: "access-control",
      tool: "access-level-sizing",
      kicker: "Local Design Assistant",
      title: "Access Level Assistant",
      status,
      summary: safeText(data.assistantSummary || "Use this result to decide whether the access-level model is maintainable before closing the Access Control flow."),
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
            "Admin maintenance load: " + adminLoadIndex
          ]
        },
        {
          title: "V2 Pressure Sources",
          body: "These context inputs explain why a raw access-level count can become easier or harder to administer.",
          items: [
            "Access Model: " + accessModelType,
            "Turnover: " + turnoverPressure,
            "Exception Groups: " + exceptionGroups,
            "Restricted Zones: " + restrictedZones,
            "Schedule Change Pressure: " + scheduleChangePressure,
            "Governance: " + adminGovernance
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
          title: "Reduce Complexity",
          body: status === "RISK" ? "Simplify the access model before growth turns permission management into operational risk." : status === "WATCH" ? "Keep the structure, but document naming, grouping, schedule, and exception rules before expansion." : "The access-level model is usable for the final Access Control handoff.",
          items: recommendedActions
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: [
        "Role and area counts represent the active access model.",
        "Schedules, door groups, turnover, exception groups, restricted zones, and governance quality affect administration overhead.",
        "This result evaluates maintainability, not controller hardware capacity."
      ],
      actions: recommendedActions
    };
  }



  function buildCredentialFormatModel(data) {
    const status = safeText(data.status || "PENDING");
    const formatLabel = safeText(data.formatLabel || "Credential format");
    const utilization = safeText(data.utilizationLabel || "pending");
    const fit = safeText(data.fit || "Assessment pending");
    const interpretation = safeText(data.interpretation || "Run the calculator to generate credential-format guidance.");
    const actions = Array.isArray(data.recommendedActions) ? data.recommendedActions.map(safeText).filter(Boolean) : [
      "Confirm reader and controller compatibility before final credential programming.",
      "Document bit length, facility-code range, and card-number range in the project handoff.",
      "Include this supplemental result in the Access Control summary when used."
    ];

    return {
      category: "access-control",
      tool: "credential-format",
      kicker: "Local Design Assistant",
      title: "Credential Format Assistant",
      status,
      summary: safeText(data.summary || fit),
      sections: [
        {
          title: "Format Headroom",
          body: interpretation,
          items: [
            "Format type: " + formatLabel,
            "Estimated badge population: " + safeText(data.population || "—"),
            "Capacity used: " + utilization,
            "Assessment: " + fit
          ]
        },
        {
          title: "Summary Role",
          body: "Credential Format Helper is a supplemental Access Control tool. It is not part of the real pipeline, but its result should be available to the category summary and future Gold reporting.",
          items: [
            "Contribution type: supplemental",
            "Summary group: Supplemental Planning Tools",
            "Pipeline state: not used"
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: [
        "Decimal capacity is estimated from facility-code digit capacity multiplied by card-number digit capacity.",
        "Binary capacity is estimated using bit length minus a basic parity allowance.",
        "Final credential programming must be verified against the access-control platform, reader compatibility, card vendor, and site operating policy."
      ],
      actions
    };
  }



  function buildDoorCableLengthModel(data) {
    const status = safeText(data.status || "PENDING");
    const difficulty = safeText(data.difficulty || "Routing review");
    const totalCable = safeText(data.totalAllDoorsLabel || "pending");
    const perDoor = safeText(data.perDoorTotalLabel || "pending");
    const density = safeText(data.cableDensityLabel || "pending");
    const insight = safeText(data.insight || "Run the calculator to generate door cable routing guidance.");
    const actions = Array.isArray(data.recommendedActions) ? data.recommendedActions.map(safeText).filter(Boolean) : [
      "Confirm actual field routing before procurement or installation.",
      "Document service slack, pathway assumptions, and total cable quantity in the project handoff.",
      "Include this supplemental result in the Access Control summary when used."
    ];

    return {
      category: "access-control",
      tool: "door-cable-length",
      kicker: "Local Design Assistant",
      title: "Door Cable Assistant",
      status,
      summary: safeText(data.summary || difficulty),
      sections: [
        {
          title: "Routing Load",
          body: insight,
          items: [
            "Total cable: " + totalCable,
            "Per-door cable: " + perDoor,
            "Cable density: " + density,
            "Difficulty: " + difficulty
          ]
        },
        {
          title: "Summary Role",
          body: "Door Cable Length is a supplemental Access Control tool. It is not part of the real pipeline, but its result should be available to the category summary and future Gold reporting.",
          items: [
            "Contribution type: supplemental",
            "Summary group: Supplemental Planning Tools",
            "Pipeline state: not used"
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: [
        "Cable estimates are based on straight-line distance, routing factor, service slack, door count, and run strategy.",
        "Actual routing, pathway fill, service loops, installer methods, and field conditions can change final quantities.",
        "Final cable quantities should be verified before procurement and installation."
      ],
      actions
    };
  }



  function buildDoorCountPlannerModel(data) {
    const status = safeText(data.status || "PENDING");
    const doors = safeText(data.doors ?? "pending");
    const readers = safeText(data.readers ?? "pending");
    const complexity = safeText(data.complexityIndex ?? "pending");
    const insight = safeText(data.insight || "Run the calculator to generate door-count planning guidance.");
    const actions = Array.isArray(data.recommendedActions) ? data.recommendedActions.map(safeText).filter(Boolean) : [
      "Confirm actual door schedule before procurement or installation.",
      "Document controlled-door count, reader assumptions, and segmentation boundaries in the project handoff.",
      "Include this supplemental result in the Access Control summary when used."
    ];

    return {
      category: "access-control",
      tool: "door-count-planner",
      kicker: "Local Design Assistant",
      title: "Door Count Assistant",
      status,
      summary: safeText(data.summary || "Door count planning review is ready."),
      sections: [
        {
          title: "Door Scope",
          body: insight,
          items: [
            "Controlled doors: " + doors,
            "Estimated readers: " + readers,
            "Complexity index: " + complexity,
            "Status: " + status
          ]
        },
        {
          title: "Summary Role",
          body: "Door Count Planner is a supplemental Access Control tool. It is not part of the real pipeline, but its result should be available to the category summary and future Gold reporting.",
          items: [
            "Contribution type: supplemental",
            "Summary group: Supplemental Planning Tools",
            "Pipeline state: not used"
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: [
        "Door count estimates are based on perimeter, interior segmentation, high-security areas, compliance level, and reader-side assumptions.",
        "Final counts should be verified against the actual door schedule, access-control policy, and hardware design.",
        "Reader count can change if both sides of openings require controlled access."
      ],
      actions
    };
  }



  function buildAntiPassbackZonesModel(data) {
    const status = safeText(data.status || "PENDING");
    const zones = safeText(data.recommendedZones ?? "pending");
    const paired = safeText(data.pairedEntrances ?? "pending");
    const complexity = safeText(data.complexityIndex ?? "pending");
    const risk = safeText(data.operationalRisk || status);
    const mode = safeText(data.recommendedType || data.mode || "pending");
    const guidance = safeText(data.modeRecommendation || data.guidance || "Review anti-passback enforcement scope before enabling hard deny behavior.");
    const interpretation = safeText(data.interpretation || "Run the calculator to generate anti-passback guidance.");

    return {
      category: "access-control",
      tool: "anti-passback-zones",
      kicker: "Local Design Assistant",
      title: "Anti-Passback Assistant",
      status,
      summary: "Use this specialty-branch result to decide whether APB enforcement is operationally manageable before final access-control documentation.",
      hideStandardLists: true,
      hideHeaderPills: true,
      sections: [
        {
          title: "Zone Enforcement Basis",
          body: guidance,
          items: [
            "Recommended zones: " + zones,
            "Paired IN/OUT entrances: " + paired,
            "Complexity index: " + complexity,
            "Operational risk: " + risk,
            "Recommended enforcement mode: " + mode
          ]
        },
        {
          title: "Operational Review",
          body: interpretation,
          items: [
            "Confirm reader placement supports reliable direction-of-travel records.",
            "Document exceptions for missed reads, emergency egress, visitor flow, and guard overrides.",
            "Use hard APB only where operations can tolerate lockout handling."
          ]
        },
        {
          title: "Summary Role",
          body: "Anti-Passback Zones is a specialty Access Control branch. It is not part of the core pipeline, but its result should be available to the category summary when used.",
          items: [
            "Contribution type: specialty-branch",
            "Summary group: Specialty / What-if Branches",
            "Pipeline state: optional specialty branch"
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: [
        "APB zone estimates are based on perimeter doors, interior controlled areas, floor count, zone strategy, and APB type.",
        "Final APB behavior must be validated in the selected access-control platform.",
        "Emergency paths, override procedure, visitor handling, and missed reads can change whether hard APB is practical."
      ],
      actions: [
        guidance,
        "Confirm bidirectional reader coverage and exception handling before enabling APB denial.",
        "Include the specialty-branch result in the Access Control summary when APB is part of the design narrative."
      ]
    };
  }


  function buildElevatorReaderCountModel(data) {
    const status = safeText(data.status || data.systemStatus || "PENDING");
    const total = safeText(data.totalReaders ?? "pending");
    const cars = safeText(data.carReaders ?? "pending");
    const lobby = safeText(data.lobbyReaders ?? "pending");
    const dcs = safeText(data.dcsAdd ?? "pending");
    const complexity = safeText(data.complexityIndex ?? "pending");
    const placement = safeText(data.placementLabel || data.placement || "pending");
    const dest = safeText(data.destLabel || data.destinationControl || "pending");
    const guidance = safeText(data.guidance || "Coordinate elevator reader placement with the elevator contractor and access-control platform before procurement.");
    const insight = safeText(data.insight || data.interpretation || "Run the calculator to generate elevator reader guidance.");

    return {
      category: "access-control",
      tool: "elevator-reader-count",
      kicker: "Local Design Assistant",
      title: "Elevator Reader Assistant",
      status,
      summary: "Use this specialty-branch result to estimate elevator reader magnitude, DCS impact, and integration complexity before final elevator coordination.",
      hideStandardLists: true,
      hideHeaderPills: true,
      sections: [
        {
          title: "Reader Count Basis",
          body: guidance,
          items: [
            "Estimated total readers: " + total,
            "In-car readers: " + cars,
            "Lobby / bank readers: " + lobby,
            "DCS adders: " + dcs,
            "Complexity index: " + complexity,
            "Placement strategy: " + placement,
            "Destination control: " + dest
          ]
        },
        {
          title: "Coordination Review",
          body: insight,
          items: [
            "Confirm whether access decisions happen in the car, at the lobby/kiosk, or both.",
            "Coordinate fire service, emergency override, visitor flow, and destination-control behavior with the elevator contractor.",
            "Use the result as planning magnitude, not a controller-specific elevator interface schedule."
          ]
        },
        {
          title: "Summary Role",
          body: "Elevator Reader Count is a specialty Access Control branch. It is not part of the core pipeline, but its result should be available to the category summary when used.",
          items: [
            "Contribution type: specialty-branch",
            "Summary group: Specialty / What-if Branches",
            "Pipeline state: optional specialty branch"
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: [
        "Reader count is estimated from cars, banks, secured floors, DCS presence, and reader placement strategy.",
        "Final elevator access design must be validated with the elevator contractor and selected access-control platform.",
        "Emergency override, fire service, and owner operating policy can change the practical reader strategy."
      ],
      actions: [
        guidance,
        "Confirm DCS/kiosk behavior and reader placement before procurement.",
        "Include the specialty-branch result in the Access Control summary when elevator access is part of the design narrative."
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
    }),
    "access-level-sizing": Object.freeze({
      slug: "access-level-sizing",
      title: "Access Level Assistant",
      buildModel: buildAccessLevelSizingModel
    }),
    "credential-format": Object.freeze({
      slug: "credential-format",
      title: "Credential Format Assistant",
      buildModel: buildCredentialFormatModel
    }),
    "door-cable-length": Object.freeze({
      slug: "door-cable-length",
      title: "Door Cable Assistant",
      buildModel: buildDoorCableLengthModel
    }),
    "door-count-planner": Object.freeze({
      slug: "door-count-planner",
      title: "Door Count Assistant",
      buildModel: buildDoorCountPlannerModel
    }),
    "anti-passback-zones": Object.freeze({
      slug: "anti-passback-zones",
      title: "Anti-Passback Assistant",
      buildModel: buildAntiPassbackZonesModel
    }),
    "elevator-reader-count": Object.freeze({
      slug: "elevator-reader-count",
      title: "Elevator Reader Assistant",
      buildModel: buildElevatorReaderCountModel
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
