/* ScopedLabs Physical Security Tool Assistant Adapters
   Version: physical-security-tool-assistant-adapters-001-dormant-foundation
   Purpose: tool-specific local assistant configuration map.
   Notes:
   - No auto-mount.
   - No runtime fetch.
   - Tools explicitly request their adapter by slug.
*/
(function () {
  "use strict";

  const API_VERSION = "physical-security-tool-assistant-adapters-001-dormant-foundation";

  const adapters = Object.freeze({
    "scene-illumination": {
      slug: "scene-illumination",
      title: "Scene Illumination Assistant",
      iconKey: "light",
      visibleDefault: false
    },
    "mounting-height": {
      slug: "mounting-height",
      title: "Mounting Height Assistant",
      iconKey: "camera",
      visibleDefault: false
    },
    "field-of-view": {
      slug: "field-of-view",
      title: "Field of View Assistant",
      iconKey: "coverageArea",
      visibleDefault: false
    },
    "camera-coverage-area": {
      slug: "camera-coverage-area",
      title: "Camera Coverage Area Assistant",
      iconKey: "coverageArea",
      visibleDefault: false
    },
    "camera-spacing": {
      slug: "camera-spacing",
      title: "Camera Spacing Assistant",
      iconKey: "camera",
      visibleDefault: false
    },
    "blind-spot-check": {
      slug: "blind-spot-check",
      title: "Blind Spot Assistant",
      iconKey: "blindSpot",
      visibleDefault: false
    },
    "pixel-density": {
      slug: "pixel-density",
      title: "Pixel Density Assistant",
      iconKey: "person",
      visibleDefault: false
    },
    "face-recognition-range": {
      slug: "face-recognition-range",
      title: "Face Recognition Assistant",
      iconKey: "person",
      visibleDefault: false
    },
    "license-plate-range": {
      slug: "license-plate-range",
      title: "License Plate Capture Assistant",
      iconKey: "licensePlate",
      visibleDefault: false
    }
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

  window.ScopedLabsPhysicalSecurityToolAssistantAdapters = Object.freeze({
    version: API_VERSION,
    getAdapter,
    listAdapters,
    hasAdapter
  });
})();
