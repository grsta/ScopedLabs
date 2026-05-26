(function () {
  "use strict";

  const VERSION = "physical-security-category-knowledge-001-web-ready";
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

  function getTool(slug) {
    return clone(toolKnowledge[slug] || null);
  }

  function listTools() {
    return pipelineOrder.filter((slug) => toolKnowledge[slug]).map((slug) => clone(toolKnowledge[slug]));
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
    getTool,
    listTools,
    getHandoff,
    listHandoffs,
    getToolWebPolicy,
    classifyExternalSource,
    explainTool
  });
})();