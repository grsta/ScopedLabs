/* ScopedLabs Physical Security Graphics Library
   Version: physical-security-graphics-library-001-dormant-foundation
   Purpose: central registry for Physical Security CAD/icon concepts.
   Notes:
   - No auto-render.
   - No runtime fetch.
   - Tools may request icon metadata or lightweight inline CAD-style SVG when explicitly called.
*/
(function () {
  "use strict";

  const API_VERSION = "physical-security-graphics-library-001-dormant-foundation";

  const icons = Object.freeze({
    camera: {
      key: "camera",
      label: "Camera",
      description: "CAD-style camera symbol for surveillance planning."
    },
    light: {
      key: "light",
      label: "Scene illumination",
      description: "CAD-style lighting symbol for illumination planning."
    },
    person: {
      key: "person",
      label: "Person",
      description: "CAD-style person target symbol for face/detail checks."
    },
    licensePlate: {
      key: "licensePlate",
      label: "License plate",
      description: "CAD-style plate target symbol for license plate capture checks."
    },
    coverageArea: {
      key: "coverageArea",
      label: "Coverage area",
      description: "Projected camera coverage / field-of-view footprint."
    },
    blindSpot: {
      key: "blindSpot",
      label: "Blind spot",
      description: "Obstruction or uncovered area planning symbol."
    }
  });

  function getIcon(key) {
    return icons[key] || null;
  }

  function listIcons() {
    return Object.keys(icons).map((key) => icons[key]);
  }

  function hasIcon(key) {
    return !!icons[key];
  }

  window.ScopedLabsPhysicalSecurityGraphicsLibrary = Object.freeze({
    version: API_VERSION,
    getIcon,
    listIcons,
    hasIcon
  });
})();
