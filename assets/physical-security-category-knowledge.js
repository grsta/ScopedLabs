(function () {
  "use strict";

  const VERSION = "physical-security-category-knowledge-003-dori-master-wording";
  const CATEGORY = "physical-security";

  const pipelineOrder = [
    "area-planner",
    "scene-illumination",
    "mounting-height",
    "field-of-view",
    "camera-coverage-area",
    "camera-spacing",
    "blind-spot-check",
    "pixel-density",
    "lens-selection",
    "face-recognition-range",
    "license-plate-range"
  ];

  const toolKnowledge = {
    "area-planner": {
      label: "Area Planner",
      role: "Pipeline entry and area context",
      adapterStatus: "skipped",
      webTopics: ["physical-security-design", "coverage-spacing"],
      owns: ["area dimensions", "zone context", "planning baseline"],
      doesNotOwn: ["camera geometry validation", "pixel density validation", "lens selection"],
      carriesForward: ["area width", "area depth", "zone context"],
      masterGuidance: "Treat Area Planner as context, not as a current guidance adapter target."
    },
    "scene-illumination": {
      label: "Scene Illumination",
      role: "Lighting baseline and maintained illumination assumptions",
      adapterStatus: "proven",
      globalName: "ScopedLabsSceneIlluminationGuidance",
      factoryGenerated: true,
      sourceMode: "lighting-source-fields",
      webTopics: ["lighting-illumination", "physical-security-design"],
      owns: ["target footcandles", "utilization factor", "light loss factor", "lumen requirement", "lighting condition"],
      doesNotOwn: ["camera mounting geometry", "field of view geometry", "pixel density", "lens choice"],
      carriesForward: ["lighting baseline", "target illumination", "scene dimensions", "lighting source integrity"],
      nextTools: ["mounting-height"]
    },
    "mounting-height": {
      label: "Mounting Height",
      role: "Camera height, subject angle, target distance, and vertical framing geometry",
      adapterStatus: "proven",
      globalName: "ScopedLabsMountingHeightGuidance",
      factoryGenerated: true,
      sourceMode: "mounting-source-fields",
      webTopics: ["mounting-geometry", "field-of-view"],
      owns: ["mount height", "target distance", "target height", "subject angle", "vertical FOV", "vertical framing"],
      doesNotOwn: ["horizontal scene width", "effective coverage reserve", "camera spacing count", "pixel density"],
      carriesForward: ["mount height", "target distance", "target height", "VFOV profile", "mounting source integrity"],
      nextTools: ["field-of-view"]
    },
    "field-of-view": {
      label: "Field of View",
      role: "Horizontal lens footprint and target scene-width fit",
      adapterStatus: "proven",
      globalName: "ScopedLabsFieldOfViewGuidance",
      factoryGenerated: true,
      sourceMode: "manual-metadata",
      webTopics: ["field-of-view", "lens-optics"],
      owns: ["horizontal FOV", "target distance", "target scene width", "scene width at distance", "coverage ratio"],
      doesNotOwn: ["usable reserve", "camera spacing", "blind spot intervals", "pixel density", "lens selection final choice"],
      carriesForward: ["scene width", "HFOV", "target distance", "coverage ratio"],
      nextTools: ["camera-coverage-area"]
    },
    "camera-coverage-area": {
      label: "Camera Coverage Area",
      role: "Raw footprint to usable effective coverage after reserve",
      adapterStatus: "proven",
      globalName: "ScopedLabsCameraCoverageAreaGuidance",
      factoryGenerated: true,
      sourceMode: "manual-metadata",
      preservesExistingVisibleAssistant: true,
      webTopics: ["coverage-spacing", "field-of-view"],
      owns: ["raw coverage width", "raw coverage height", "effective width", "effective height", "effective area", "reserve loss"],
      doesNotOwn: ["camera count spacing", "blind spot gap intervals", "pixel density", "lens selection"],
      carriesForward: ["effective width", "effective height", "effective area", "usable coverage reserve"],
      nextTools: ["camera-spacing"]
    },
    "camera-spacing": {
      label: "Camera Spacing",
      role: "Camera count, spacing, overlap, and span coverage",
      adapterStatus: "proven",
      globalName: "ScopedLabsCameraSpacingGuidance",
      sourceMode: "manual-metadata",
      webTopics: ["coverage-spacing", "blind-spots"],
      owns: ["camera count", "center spacing", "overlap target", "coverage span", "spacing baseline"],
      doesNotOwn: ["blind spot interval validation", "pixel density", "lens selection"],
      carriesForward: ["camera count", "actual spacing", "overlap", "coverage span"],
      nextTools: ["blind-spot-check"]
    },
    "blind-spot-check": {
      label: "Blind Spot Check",
      role: "Modeled gap detection and coverage interval validation",
      adapterStatus: "proven",
      globalName: "ScopedLabsBlindSpotGuidance",
      sourceMode: "manual-metadata",
      preservesExistingVisibleAssistant: true,
      webTopics: ["blind-spots", "coverage-spacing"],
      owns: ["modeled gaps", "gap percentage", "coverage intervals", "camera position intervals", "blind spot class"],
      doesNotOwn: ["pixel density", "lens selection", "final identification validation"],
      carriesForward: ["validated coverage layout", "camera positions", "gap status", "coverage class"],
      nextTools: ["pixel-density"]
    },
    "pixel-density": {
      label: "Pixel Density",
      role: "Pixels-per-foot validation for detail level",
      adapterStatus: "proven",
      globalName: "ScopedLabsPixelDensityGuidance",
      sourceMode: "manual-metadata",
      webTopics: ["pixel-density", "physical-security-design"],
      owns: ["PPF", "target detail level", "sensor width", "scene width", "detail margin"],
      doesNotOwn: ["lens choice finalization", "face recognition specialist validation", "license plate specialist validation"],
      carriesForward: ["target PPF", "scene width", "sensor assumptions", "detail margin"],
      nextTools: ["lens-selection"]
    },
    "lens-selection": {
      label: "Lens Selection",
      role: "Protected/gold-standard lens choice and final optics planning",
      adapterStatus: "protected",
      protected: true,
      webTopics: ["lens-optics", "field-of-view"],
      owns: ["lens focal length choice", "sensor-size relationship", "optics handoff", "final lens planning context"],
      doesNotOwn: ["category adapter proofing", "factory-generated rewrites"],
      carriesForward: ["final lens planning recommendation"],
      nextTools: ["face-recognition-range", "license-plate-range"],
      masterGuidance: "Lens Selection is protected. Current adapter/factory work must not touch it."
    },
    "face-recognition-range": {
      label: "Face Recognition Range",
      role: "Specialist face/identification validation branch",
      adapterStatus: "proven",
      globalName: "ScopedLabsFaceRecognitionGuidance",
      sourceMode: "manual-metadata",
      webTopics: ["face-recognition", "pixel-density"],
      owns: ["pixels per face", "recognition distance", "face target threshold", "face detail margin"],
      doesNotOwn: ["general pixel density", "license plate validation", "lens selection finalization"],
      carriesForward: ["face recognition feasibility", "pixels per face margin"],
      nextTools: ["license-plate-range"]
    },
    "license-plate-range": {
      label: "License Plate Capture Range",
      role: "Specialist license plate capture validation branch",
      adapterStatus: "proven",
      globalName: "ScopedLabsLicensePlateGuidance",
      sourceMode: "manual-metadata",
      webTopics: ["license-plate-capture", "pixel-density", "lens-optics"],
      owns: ["pixels per plate", "plate capture distance", "plate target threshold", "capture margin"],
      doesNotOwn: ["general pixel density", "face recognition validation", "lens selection finalization"],
      carriesForward: ["plate capture feasibility", "plate target margin"],
      nextTools: []
    }
  };

  const handoffs = [
    { from: "scene-illumination", to: "mounting-height", rule: "Lighting baseline should be stable before mounting geometry is trusted." },
    { from: "mounting-height", to: "field-of-view", rule: "Mounting geometry should be workable before horizontal FOV is trusted." },
    { from: "field-of-view", to: "camera-coverage-area", rule: "FOV scene width becomes the raw footprint before reserve is applied." },
    { from: "camera-coverage-area", to: "camera-spacing", rule: "Camera Spacing should use effective width, not raw lens footprint." },
    { from: "camera-spacing", to: "blind-spot-check", rule: "Spacing must be validated as modeled intervals before detail planning." },
    { from: "blind-spot-check", to: "pixel-density", rule: "Pixel Density should be trusted only after major coverage gaps are resolved." },
    { from: "pixel-density", to: "lens-selection", rule: "Lens Selection should preserve the pixel density and scene-width target." },
    { from: "lens-selection", to: "face-recognition-range", rule: "Face Recognition checks whether selected geometry supports face detail." },
    { from: "lens-selection", to: "license-plate-range", rule: "License Plate Capture checks whether selected geometry supports plate detail." }
  ];

  const externalSourceRules = {
    runtimeFetchAllowed: false,
    sourcePolicyGlobal: "ScopedLabsPhysicalSecuritySourcePolicy",
    summaryCacheTarget: "data/physical-security/source-summaries.json",
    coreRule: "External sources may inform guidance language, but cannot override ScopedLabs math, pipeline carry-over, audits, or protected tool behavior."
  };

  const masterAssistantProfile = {
    label: "Physical Security Master Assistant",
    ownedCategory: CATEGORY,
    role: "Category review board for Physical Security summary reports",
    mission: "Collect local Physical Security tool assistant outcomes, area/zone context, report metadata, and tool notes; then guide the user through Risk, Watch, and missing-core corrections before final handoff.",
    visibility: "Summary page only",
    inputSources: [
      "Validated local tool assistant guidance",
      "Guidance memory records",
      "Area Planner area/zone ledger",
      "Summary report metadata",
      "Area-scoped tool notes",
      "Report/export readiness state",
      "Curated Physical Security source summaries when available"
    ],
    outputResponsibilities: [
      "Prioritize Risk before Watch",
      "Identify missing core pipeline steps",
      "Explain why each issue matters",
      "Route the user back to the source tool or source area/zone",
      "Flag optional Face Recognition and License Plate zones as specialty branches",
      "Prepare structured handoff context for the future Site Assistant"
    ],
    nonAuthorityGuardrails: [
      "Does not change tool formulas",
      "Does not change thresholds produced by tools",
      "Does not change pipeline carry-over values",
      "Does not rewrite protected/gold tool behavior",
      "Does not auto-fetch web content in the browser runtime",
      "Does not insert uncited web-derived claims into client reports",
      "Risk/Watch corrections must be made by returning to the source tool or source area/zone"
    ],
    priorityOrder: [
      "risk-correction",
      "watch-validation",
      "missing-core-step",
      "specialty-branch-review",
      "report-metadata-check",
      "cross-category-handoff"
    ]
  };

  const reportReadinessRules = {
    risk: {
      label: "Draft - correction required",
      guidance: "A Physical Security Risk means the report may exist, but it should remain draft until the source tool/area outcome is corrected or intentionally accepted after review."
    },
    watch: {
      label: "Needs review - validate assumptions",
      guidance: "A Watch means the report can support review, but the assumption should be checked before final client or site handoff."
    },
    missing: {
      label: "Planning draft - core guidance incomplete",
      guidance: "Missing core guidance means the category summary cannot represent a complete Physical Security design yet."
    },
    healthy: {
      label: "Ready for category-level review",
      guidance: "Healthy guidance means no current Risk or Watch item is blocking the category summary, but normal engineering review still applies."
    }
  };

  const areaZoneModel = {
    coreCoverageAreas: "Normal Physical Security coverage scopes that should move through the core pipeline and roll up to Summary.",
    faceRecognitionZones: "Optional specialty branch zones for face detail validation; they attach to Summary but do not become required core steps.",
    licensePlateZones: "Optional specialty branch zones for plate detail validation; they attach to Summary but do not become required core steps.",
    repeatableScopes: "A project may contain multiple core areas, multiple face zones, and multiple license plate zones.",
    routingRule: "The master assistant should name the affected area/zone whenever the saved context is available."
  };

  const crossCategoryDependencies = [
    {
      key: "network-poe",
      label: "Network / PoE",
      carryForward: ["camera count", "camera locations", "PoE device assumptions", "uplink context", "network closet dependency"],
      guidance: "Carry camera count, camera locations, and specialty zone assumptions into switch port, PoE budget, uplink, and network closet planning."
    },
    {
      key: "power-runtime",
      label: "Power / Runtime",
      carryForward: ["camera load", "PoE switch load", "lighting assumptions", "recording equipment dependency"],
      guidance: "Carry camera, lighting, and PoE switch assumptions into UPS/runtime planning."
    },
    {
      key: "storage-retention",
      label: "Storage / Retention",
      carryForward: ["resolution", "pixel density", "camera count", "face/plate zones", "recording detail assumptions"],
      guidance: "Carry resolution, pixel density, camera count, specialty zones, and retention assumptions into storage planning."
    },
    {
      key: "access-control-doors",
      label: "Access Control",
      carryForward: ["entry zones", "doorway context", "face capture zones", "event correlation needs"],
      guidance: "Coordinate doorway camera placement, face capture zones, and event context with access-control planning."
    }
  ];

  const toolCorrectionProfiles = {
    "area-planner": {
      correctionFocus: "Confirm area/zone type, dimensions, name, and routing intent before trusting downstream guidance.",
      riskMeaning: "Area context is missing or mismatched, so downstream tool results may belong to the wrong scope.",
      watchMeaning: "Area context exists but should be confirmed before final reporting.",
      correctionQuestions: ["Is the active area/zone the intended scope?", "Is the zone type core, face, or license plate?", "Are width/depth and labels client-readable?"],
      reportImpact: "Area/zone labels drive Summary grouping and future Site Assistant handoff."
    },
    "scene-illumination": {
      correctionFocus: "Validate maintained illumination assumptions before relying on camera performance guidance.",
      riskMeaning: "Lighting assumptions may not support the intended camera view or detail target.",
      watchMeaning: "Lighting should be confirmed because it affects image quality and downstream review confidence.",
      correctionQuestions: ["Is target illumination appropriate for the scene?", "Are utilization and light-loss assumptions realistic?", "Is additional lighting needed before camera geometry is trusted?"],
      reportImpact: "Lighting uncertainty affects mounting, FOV, pixel density, and specialty capture confidence."
    },
    "mounting-height": {
      correctionFocus: "Correct camera height, target distance, vertical angle, and target framing assumptions.",
      riskMeaning: "Mount geometry may create an unusable angle or framing condition.",
      watchMeaning: "Mount geometry is plausible but should be verified against site constraints.",
      correctionQuestions: ["Is the mount height physically possible?", "Is the target distance correct?", "Does the view angle fit the intended subject/detail?"],
      reportImpact: "Mounting issues can invalidate FOV, coverage, face, and plate assumptions."
    },
    "field-of-view": {
      correctionFocus: "Validate the horizontal scene width and field-of-view fit before applying coverage reserve.",
      riskMeaning: "The lens/view geometry may not cover the target width at the selected distance.",
      watchMeaning: "The view fit should be confirmed before spacing and lens selection are finalized.",
      correctionQuestions: ["Is target distance correct?", "Is the target scene width correct?", "Does HFOV match the intended lens/profile?"],
      reportImpact: "FOV is the raw footprint foundation for coverage area and lens planning."
    },
    "camera-coverage-area": {
      correctionFocus: "Rework the usable footprint before spacing by checking DORI detection feasibility, reserve, target distance, FOV/lens assumptions, and whether the area should be split.",
      riskMeaning: "The usable coverage footprint may fail DORI/pixel-density feasibility, meaning the area can calculate mathematically but still be impractical as a healthy camera coverage baseline.",
      watchMeaning: "Reserve, effective coverage, and DORI detection feasibility should be checked before spacing.",
      correctionQuestions: ["Does the usable width require more horizontal pixels than a normal detection baseline can provide?", "Is the reserve appropriate?", "Is effective width being used downstream instead of raw width?", "Should this be split into smaller areas or treated as an overview/specialty zone?"],
      reportImpact: "Coverage Area feeds Camera Spacing and can change camera count, pixel-density confidence, and final report readiness."
    },
    "camera-spacing": {
      correctionFocus: "Review camera count, actual spacing, overlap target, and protected span coverage.",
      riskMeaning: "Camera layout may leave insufficient coverage continuity or an inefficient/camera-heavy design.",
      watchMeaning: "Spacing should be validated before blind spot and pixel density conclusions are trusted.",
      correctionQuestions: ["Is effective width from Coverage Area being used?", "Is overlap target intentional?", "Is camera count reasonable for the span?"],
      reportImpact: "Spacing affects blind spot validation, PoE port count, storage assumptions, and budget coordination."
    },
    "blind-spot-check": {
      correctionFocus: "Validate modeled gaps, intervals, camera positions, and coverage continuity.",
      riskMeaning: "The spacing/layout may leave modeled blind spots that should be corrected before detail planning.",
      watchMeaning: "Continuity should be verified before treating the layout as clean.",
      correctionQuestions: ["Are modeled gaps acceptable?", "Do intervals match the intended area?", "Should the area be split into additional zones?"],
      reportImpact: "Blind spot findings can require area split, spacing changes, or camera count changes."
    },
    "pixel-density": {
      correctionFocus: "Validate pixels-per-foot/detail target against scene width and resolution assumptions.",
      riskMeaning: "Detail capture may not meet the selected target at the current scene width/resolution.",
      watchMeaning: "Detail assumptions should be confirmed before Lens Selection or specialty validation.",
      correctionQuestions: ["Is the selected detail target correct?", "Is horizontal resolution correct?", "Is scene width tied to the intended camera view?"],
      reportImpact: "Pixel density affects identification/detail claims and storage handoff assumptions."
    },
    "lens-selection": {
      correctionFocus: "Review final optics/lens planning context while preserving protected Lens Selection behavior.",
      riskMeaning: "Final lens planning may not support the intended FOV/detail outcome.",
      watchMeaning: "Lens assumptions should be confirmed before final report handoff.",
      correctionQuestions: ["Does the selected lens support required FOV?", "Does sensor/lens context match the Pixel Density assumption?", "Are specialty zones intentionally separate?"],
      reportImpact: "Lens Selection is the final core optics checkpoint before Summary."
    },
    "face-recognition-range": {
      correctionFocus: "Validate optional face detail zone assumptions separately from the core pipeline.",
      riskMeaning: "The face zone may not support the intended face detail threshold.",
      watchMeaning: "Face capture assumptions should be confirmed if this specialty zone is included in the report.",
      correctionQuestions: ["Is this truly a face-recognition zone?", "Is distance correct?", "Is pixels-per-face target intentional?"],
      reportImpact: "Face zones can affect camera placement, storage, privacy/compliance review, and access-control coordination."
    },
    "license-plate-range": {
      correctionFocus: "Validate optional plate capture zone assumptions separately from the core pipeline.",
      riskMeaning: "The plate zone may not support the intended plate detail threshold.",
      watchMeaning: "Plate capture assumptions should be confirmed if this specialty zone is included in the report.",
      correctionQuestions: ["Is this truly a license plate zone?", "Is capture distance correct?", "Is pixels-per-plate target intentional?", "Are angle/lighting/site constraints noted?"],
      reportImpact: "Plate zones can affect lens choice, lighting, storage, and network/storage handoff."
    }
  };

  const siteAssistantHandoffModel = {
    payloadRole: "Physical Security category summary feed",
    shouldInclude: ["category status", "risk/watch counts", "priority correction", "area/zone scopes", "tool notes", "cross-category dependencies", "report readiness"],
    shouldNotInclude: ["new calculations", "modified tool thresholds", "uncurated web claims", "vendor recommendations"]
  };


  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function getSourcePolicy() {
    return window.ScopedLabsPhysicalSecuritySourcePolicy || null;
  }


  function getMasterAssistantProfile() {
    return clone(masterAssistantProfile);
  }

  function getReportReadinessRules() {
    return clone(reportReadinessRules);
  }

  function getAreaZoneModel() {
    return clone(areaZoneModel);
  }

  function getCrossCategoryDependencies() {
    return clone(crossCategoryDependencies);
  }

  function getSiteAssistantHandoffModel() {
    return clone(siteAssistantHandoffModel);
  }

  function getToolCorrectionProfile(slug) {
    const base = toolKnowledge[slug] || null;
    const correction = toolCorrectionProfiles[slug] || null;

    if (!base && !correction) return null;

    return Object.assign({ slug }, clone(base || {}), clone(correction || {}));
  }

  function listToolCorrectionProfiles() {
    return pipelineOrder
      .filter((slug) => toolKnowledge[slug] || toolCorrectionProfiles[slug])
      .map((slug) => getToolCorrectionProfile(slug));
  }

  function explainCorrection(slug, status) {
    const profile = getToolCorrectionProfile(slug);
    const normalized = String(status || "").toLowerCase();

    if (!profile) {
      return {
        slug,
        label: slug || "Unknown tool",
        status: normalized || "unknown",
        correctionFocus: "Review the source Physical Security tool.",
        meaning: "No owned-category correction profile is available for this tool.",
        correctionQuestions: [],
        reportImpact: "Review before final category handoff."
      };
    }

    return {
      slug,
      label: profile.label || slug,
      status: normalized || "unknown",
      correctionFocus: profile.correctionFocus || profile.masterGuidance || "Review the source Physical Security tool.",
      meaning: normalized === "risk" ? (profile.riskMeaning || profile.correctionFocus || "Correct this Risk at the source tool.") : normalized === "watch" ? (profile.watchMeaning || profile.correctionFocus || "Validate this Watch at the source tool.") : profile.correctionFocus || "Review this tool result.",
      correctionQuestions: clone(profile.correctionQuestions || []),
      reportImpact: profile.reportImpact || "Review before final category handoff.",
      route: "/tools/physical-security/" + slug + "/"
    };
  }

  function buildOwnedCategoryKnowledgeSnapshot() {
    return {
      version: VERSION,
      category: CATEGORY,
      masterAssistantProfile: clone(masterAssistantProfile),
      pipelineOrder: clone(pipelineOrder),
      tools: listToolCorrectionProfiles(),
      handoffs: listHandoffs(),
      areaZoneModel: clone(areaZoneModel),
      reportReadinessRules: clone(reportReadinessRules),
      crossCategoryDependencies: clone(crossCategoryDependencies),
      siteAssistantHandoffModel: clone(siteAssistantHandoffModel),
      externalSourceRules: clone(externalSourceRules)
    };
  }

  function getTool(slug) {
    return clone(toolKnowledge[slug] || null);
  }

  function listTools() {
    return pipelineOrder.filter((slug) => toolKnowledge[slug]).map((slug) => Object.assign({ slug }, clone(toolKnowledge[slug])));
  }

  function getHandoff(from, to) {
    return clone(handoffs.find((handoff) => handoff.from === from && handoff.to === to) || null);
  }

  function listHandoffs() {
    return clone(handoffs);
  }

  function getToolWebPolicy(slug) {
    const tool = toolKnowledge[slug];
    if (!tool) return null;

    return {
      slug,
      label: tool.label,
      webTopics: clone(tool.webTopics || []),
      externalSourceRules: clone(externalSourceRules)
    };
  }

  function classifyExternalSource(candidate) {
    const policy = getSourcePolicy();

    if (!policy || typeof policy.classifySourceCandidate !== "function") {
      return {
        allowed: false,
        reason: "Physical Security source policy is not loaded.",
        mayUseAtRuntime: false
      };
    }

    return policy.classifySourceCandidate(candidate || {});
  }

  function explainTool(slug) {
    const tool = toolKnowledge[slug];

    if (!tool) {
      return {
        ok: false,
        summary: "Unknown Physical Security tool.",
        nextStep: "Check the Physical Security tool registry."
      };
    }

    return {
      ok: true,
      slug,
      label: tool.label,
      role: tool.role,
      owns: clone(tool.owns || []),
      doesNotOwn: clone(tool.doesNotOwn || []),
      carriesForward: clone(tool.carriesForward || []),
      nextTools: clone(tool.nextTools || []),
      adapterStatus: tool.adapterStatus || "unknown",
      protected: !!tool.protected,
      webTopics: clone(tool.webTopics || []),
      externalSourceRules: clone(externalSourceRules),
      guidance: tool.masterGuidance || ""
    };
  }

  window.ScopedLabsPhysicalSecurityCategoryKnowledge = Object.freeze({
    version: VERSION,
    category: CATEGORY,
    pipelineOrder: clone(pipelineOrder),
    externalSourceRules: clone(externalSourceRules),
    getMasterAssistantProfile,
    getReportReadinessRules,
    getAreaZoneModel,
    getCrossCategoryDependencies,
    getSiteAssistantHandoffModel,
    getToolCorrectionProfile,
    listToolCorrectionProfiles,
    explainCorrection,
    buildOwnedCategoryKnowledgeSnapshot,
    getTool,
    listTools,
    getHandoff,
    listHandoffs,
    getToolWebPolicy,
    classifyExternalSource,
    explainTool
  });
})();