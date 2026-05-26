(function () {
  "use strict";

  const VERSION = "physical-security-guidance-registry-001-foundation";

  const registry = {
    "area-planner": {
      slug: "area-planner",
      role: "pipeline-entry",
      protected: false,
      proofStatus: "not-required",
      guidanceCandidate: false
    },
    "scene-illumination": {
      slug: "scene-illumination",
      role: "pipeline-step",
      protected: false,
      proofStatus: "pending",
      guidanceCandidate: true
    },
    "mounting-height": {
      slug: "mounting-height",
      role: "pipeline-step",
      protected: false,
      proofStatus: "pending",
      guidanceCandidate: true
    },
    "field-of-view": {
      slug: "field-of-view",
      role: "pipeline-step",
      protected: false,
      proofStatus: "proven",
      guidanceCandidate: true,
      globalName: "ScopedLabsFieldOfViewGuidance",
      nextTool: "camera-coverage-area",
      factoryGenerated: true
    },
    "camera-coverage-area": {
      slug: "camera-coverage-area",
      role: "pipeline-step",
      protected: false,
      proofStatus: "pending",
      guidanceCandidate: true
    },
    "camera-spacing": {
      slug: "camera-spacing",
      role: "pipeline-step",
      protected: false,
      proofStatus: "proven",
      guidanceCandidate: true,
      globalName: "ScopedLabsCameraSpacingGuidance",
      nextTool: "blind-spot-check"
    },
    "blind-spot-check": {
      slug: "blind-spot-check",
      role: "pipeline-step",
      protected: false,
      proofStatus: "proven",
      guidanceCandidate: true,
      globalName: "ScopedLabsBlindSpotGuidance",
      nextTool: "pixel-density",
      preservesExistingVisibleAssistant: true
    },
    "pixel-density": {
      slug: "pixel-density",
      role: "pipeline-step",
      protected: false,
      proofStatus: "proven",
      guidanceCandidate: true,
      globalName: "ScopedLabsPixelDensityGuidance",
      nextTool: "lens-selection"
    },
    "lens-selection": {
      slug: "lens-selection",
      role: "protected",
      protected: true,
      proofStatus: "protected",
      guidanceCandidate: false
    },
    "face-recognition-range": {
      slug: "face-recognition-range",
      role: "optional-validation",
      protected: false,
      proofStatus: "proven",
      guidanceCandidate: true,
      globalName: "ScopedLabsFaceRecognitionGuidance",
      nextTool: "license-plate-range"
    },
    "license-plate-range": {
      slug: "license-plate-range",
      role: "optional-validation",
      protected: false,
      proofStatus: "proven",
      guidanceCandidate: true,
      globalName: "ScopedLabsLicensePlateGuidance",
      nextTool: ""
    }
  };

  function listAll() {
    return Object.keys(registry).map((key) => registry[key]);
  }

  function getEntry(slug) {
    return registry[slug] || null;
  }

  function listProven() {
    return listAll().filter((entry) => entry.proofStatus === "proven");
  }

  function listPending() {
    return listAll().filter((entry) => entry.proofStatus === "pending");
  }

  window.ScopedLabsPhysicalSecurityGuidanceRegistry = Object.freeze({
    version: VERSION,
    getEntry,
    listAll,
    listProven,
    listPending
  });
})();