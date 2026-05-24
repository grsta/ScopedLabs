/*
 * ScopedLabs Physical Security Tool Registry
 * Version: physical-security-tool-registry-001-shell-v1
 *
 * Data-only registry for Tool Shell V1 audits and future shell extraction.
 * This file is not loaded by live pages yet.
 */

(function attachPhysicalSecurityToolRegistry(root) {
  "use strict";

  const VERSION = "physical-security-tool-registry-001-shell-v1";
  const CATEGORY = "physical-security";

  const ROLE = Object.freeze({
    PIPELINE_ENTRY: "pipeline-entry",
    PIPELINE_STEP: "pipeline-step",
    OPTIONAL_VALIDATION: "optional-validation"
  });

  const SHELL_REQUIREMENTS = Object.freeze({
    "pipeline-entry": Object.freeze([
      "h1",
      "startContext",
      "pipeline",
      "kb",
      "activeArea",
      "areaLedger",
      "planningInputs",
      "results",
      "exportCard",
      "continueControl"
    ]),
    "pipeline-step": Object.freeze([
      "h1",
      "pipeline",
      "flowNote",
      "kb",
      "activeArea",
      "planningInputs",
      "results",
      "visualOrAnalyzer",
      "exportCard",
      "backContinue"
    ]),
    "optional-validation": Object.freeze([
      "h1",
      "optionalContext",
      "pipeline",
      "kb",
      "activeArea",
      "planningInputs",
      "results",
      "visualOrAnalyzer",
      "exportCard",
      "backContinue"
    ])
  });

  const TOOLS = Object.freeze({
    "area-planner": Object.freeze({
      slug: "area-planner",
      title: "Area / Zone Planner",
      role: ROLE.PIPELINE_ENTRY,
      path: "/tools/physical-security/area-planner/",
      previous: null,
      next: "scene-illumination",
      nextLabel: "Scene Illumination",
      kbKey: "physical-security/area-planner",
      shellRequirementSet: ROLE.PIPELINE_ENTRY,
      rendererKeys: Object.freeze([]),
      notes: "Pipeline-entry tool. Does not require upstream carry-over wording."
    }),

    "scene-illumination": Object.freeze({
      slug: "scene-illumination",
      title: "Scene Illumination",
      role: ROLE.PIPELINE_STEP,
      path: "/tools/physical-security/scene-illumination/",
      previous: "area-planner",
      next: "mounting-height",
      nextLabel: "Mounting Height",
      kbKey: "physical-security/scene-illumination",
      shellRequirementSet: ROLE.PIPELINE_STEP,
      rendererKeys: Object.freeze([])
    }),

    "mounting-height": Object.freeze({
      slug: "mounting-height",
      title: "Mounting Height",
      role: ROLE.PIPELINE_STEP,
      path: "/tools/physical-security/mounting-height/",
      previous: "scene-illumination",
      next: "field-of-view",
      nextLabel: "Field of View",
      kbKey: "physical-security/mounting-height",
      shellRequirementSet: ROLE.PIPELINE_STEP,
      rendererKeys: Object.freeze([])
    }),

    "field-of-view": Object.freeze({
      slug: "field-of-view",
      title: "Field of View",
      role: ROLE.PIPELINE_STEP,
      path: "/tools/physical-security/field-of-view/",
      previous: "mounting-height",
      next: "camera-coverage-area",
      nextLabel: "Coverage Area",
      kbKey: "physical-security/field-of-view",
      shellRequirementSet: ROLE.PIPELINE_STEP,
      rendererKeys: Object.freeze(["fov-geometry-plan"]),
      reportVisualOwner: "physical-security-graphics"
    }),

    "camera-coverage-area": Object.freeze({
      slug: "camera-coverage-area",
      title: "Camera Coverage Area",
      role: ROLE.PIPELINE_STEP,
      path: "/tools/physical-security/camera-coverage-area/",
      previous: "field-of-view",
      next: "camera-spacing",
      nextLabel: "Camera Spacing",
      kbKey: "physical-security/camera-coverage-area",
      shellRequirementSet: ROLE.PIPELINE_STEP,
      rendererKeys: Object.freeze(["coverage-footprint-plan"]),
      reportVisualOwner: "physical-security-graphics"
    }),

    "camera-spacing": Object.freeze({
      slug: "camera-spacing",
      title: "Camera Spacing",
      role: ROLE.PIPELINE_STEP,
      path: "/tools/physical-security/camera-spacing/",
      previous: "camera-coverage-area",
      next: "blind-spot-check",
      nextLabel: "Blind Spot Check",
      kbKey: "physical-security/camera-spacing",
      shellRequirementSet: ROLE.PIPELINE_STEP,
      rendererKeys: Object.freeze(["camera-layout-iso", "scenario-pressure-line"]),
      reportVisualOwner: "physical-security-graphics"
    }),

    "blind-spot-check": Object.freeze({
      slug: "blind-spot-check",
      title: "Blind Spot Check",
      role: ROLE.PIPELINE_STEP,
      path: "/tools/physical-security/blind-spot-check/",
      previous: "camera-spacing",
      next: "pixel-density",
      nextLabel: "Pixel Density",
      kbKey: "physical-security/blind-spot-check",
      shellRequirementSet: ROLE.PIPELINE_STEP,
      rendererKeys: Object.freeze(["camera-layout-iso"]),
      reportVisualOwner: "physical-security-graphics"
    }),

    "pixel-density": Object.freeze({
      slug: "pixel-density",
      title: "Pixel Density",
      role: ROLE.PIPELINE_STEP,
      path: "/tools/physical-security/pixel-density/",
      previous: "blind-spot-check",
      next: "lens-selection",
      nextLabel: "Lens Selection",
      kbKey: "physical-security/pixel-density",
      shellRequirementSet: ROLE.PIPELINE_STEP,
      rendererKeys: Object.freeze(["pixel-density-detail-plan"]),
      reportVisualOwner: "physical-security-graphics"
    }),

    "lens-selection": Object.freeze({
      slug: "lens-selection",
      title: "Lens Selection",
      role: ROLE.PIPELINE_STEP,
      path: "/tools/physical-security/lens-selection/",
      previous: "pixel-density",
      next: null,
      nextLabel: null,
      kbKey: "physical-security/lens-selection",
      shellRequirementSet: ROLE.PIPELINE_STEP,
      rendererKeys: Object.freeze([]),
      notes: "Lens Selection remains the assistant visual/interaction gold standard and should not be migrated until a factory can reproduce it 1:1."
    }),

    "face-recognition-range": Object.freeze({
      slug: "face-recognition-range",
      title: "Face Recognition Range",
      role: ROLE.OPTIONAL_VALIDATION,
      path: "/tools/physical-security/face-recognition-range/",
      previous: null,
      next: null,
      nextLabel: null,
      kbKey: "physical-security/face-recognition-range",
      shellRequirementSet: ROLE.OPTIONAL_VALIDATION,
      rendererKeys: Object.freeze([]),
      notes: "Optional specialist validation branch, not mandatory mainline pipeline."
    }),

    "license-plate-range": Object.freeze({
      slug: "license-plate-range",
      title: "License Plate Capture Range",
      role: ROLE.OPTIONAL_VALIDATION,
      path: "/tools/physical-security/license-plate-range/",
      previous: null,
      next: null,
      nextLabel: null,
      kbKey: "physical-security/license-plate-range",
      shellRequirementSet: ROLE.OPTIONAL_VALIDATION,
      rendererKeys: Object.freeze([]),
      notes: "Optional specialist validation branch, not mandatory mainline pipeline."
    })
  });

  const PIPELINE_ORDER = Object.freeze([
    "area-planner",
    "scene-illumination",
    "mounting-height",
    "field-of-view",
    "camera-coverage-area",
    "camera-spacing",
    "blind-spot-check",
    "pixel-density",
    "lens-selection"
  ]);

  const OPTIONAL_VALIDATIONS = Object.freeze([
    "face-recognition-range",
    "license-plate-range"
  ]);

  const REGISTRY = Object.freeze({
    version: VERSION,
    category: CATEGORY,
    roles: ROLE,
    shellRequirements: SHELL_REQUIREMENTS,
    tools: TOOLS,
    pipelineOrder: PIPELINE_ORDER,
    optionalValidations: OPTIONAL_VALIDATIONS,

    getTool(slug) {
      return TOOLS[slug] || null;
    },

    listTools() {
      return Object.keys(TOOLS);
    },

    listByRole(role) {
      return Object.keys(TOOLS).filter((slug) => TOOLS[slug].role === role);
    },

    getRequirementsForTool(slug) {
      const tool = TOOLS[slug];
      if (!tool) return Object.freeze([]);
      return SHELL_REQUIREMENTS[tool.shellRequirementSet] || Object.freeze([]);
    }
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = REGISTRY;
  }

  root.ScopedLabsPhysicalSecurityToolRegistry = REGISTRY;
})(typeof window !== "undefined" ? window : globalThis);
