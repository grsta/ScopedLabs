(function () {
  "use strict";

  const VERSION = "physical-security-category-guidance-001-foundation";
  const CATEGORY = "physical-security";

  const PIPELINE_ORDER = [
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

  const FALLBACK_REGISTRY = [
    { slug: "area-planner", label: "Area Planner", role: "pipeline-entry", guidanceCandidate: false },
    { slug: "scene-illumination", label: "Scene Illumination", globalName: "ScopedLabsSceneIlluminationGuidance", proofStatus: "proven" },
    { slug: "mounting-height", label: "Mounting Height", globalName: "ScopedLabsMountingHeightGuidance", proofStatus: "proven" },
    { slug: "field-of-view", label: "Field of View", globalName: "ScopedLabsFieldOfViewGuidance", proofStatus: "proven" },
    { slug: "camera-coverage-area", label: "Camera Coverage Area", globalName: "ScopedLabsCameraCoverageAreaGuidance", proofStatus: "proven" },
    { slug: "camera-spacing", label: "Camera Spacing", globalName: "ScopedLabsCameraSpacingGuidance", proofStatus: "proven" },
    { slug: "blind-spot-check", label: "Blind Spot Check", globalName: "ScopedLabsBlindSpotGuidance", proofStatus: "proven" },
    { slug: "pixel-density", label: "Pixel Density", globalName: "ScopedLabsPixelDensityGuidance", proofStatus: "proven" },
    { slug: "lens-selection", label: "Lens Selection", role: "protected", protected: true, proofStatus: "protected", guidanceCandidate: false },
    { slug: "face-recognition-range", label: "Face Recognition Range", globalName: "ScopedLabsFaceRecognitionGuidance", proofStatus: "proven" },
    { slug: "license-plate-range", label: "License Plate Capture Range", globalName: "ScopedLabsLicensePlateGuidance", proofStatus: "proven" }
  ];

  function clone(value) {
    if (value == null) return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function orderIndex(slug) {
    const index = PIPELINE_ORDER.indexOf(slug);
    return index >= 0 ? index : 999;
  }

  function sortByPipelineOrder(items) {
    return clone(items || []).sort((a, b) => {
      return orderIndex(a.slug) - orderIndex(b.slug);
    });
  }

  function normalizeStatus(status) {
    const value = String(status || "").toLowerCase();

    if (value.includes("risk") || value.includes("fail") || value.includes("blocked")) return "risk";
    if (value.includes("watch") || value.includes("warning") || value.includes("caution")) return "watch";
    if (value.includes("healthy") || value.includes("safe") || value.includes("ok")) return "healthy";

    return "unknown";
  }

  function statusRank(status) {
    const key = normalizeStatus(status);

    if (key === "risk") return 4;
    if (key === "watch") return 3;
    if (key === "unknown") return 2;
    if (key === "healthy") return 1;

    return 0;
  }

  function labelFromSlug(slug) {
    return String(slug || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getRegistryEntries() {
    const registry = window.ScopedLabsPhysicalSecurityGuidanceRegistry;

    if (registry && typeof registry.listAll === "function") {
      return registry.listAll();
    }

    return clone(FALLBACK_REGISTRY);
  }

  function primaryRecommendationFor(guidance) {
    if (!guidance || typeof guidance !== "object") return {};
    return guidance.primaryRecommendation || guidance.recommendation || {};
  }

  function collectToolGuidance() {
    const entries = getRegistryEntries()
      .filter((entry) => entry && entry.globalName && entry.proofStatus === "proven")
      .map((entry) => {
        const api = window[entry.globalName];
        let guidance = null;
        let error = "";

        if (api && typeof api.getLastGuidance === "function") {
          try {
            guidance = api.getLastGuidance();
          } catch (err) {
            error = err && err.message ? err.message : String(err || "Guidance read failed");
          }
        }

        const primary = primaryRecommendationFor(guidance);

        return {
          slug: entry.slug,
          label: entry.label || labelFromSlug(entry.slug),
          globalName: entry.globalName,
          generated: !!guidance,
          status: guidance ? normalizeStatus(guidance.status) : "unknown",
          mode: guidance && guidance.mode ? guidance.mode : "unknown",
          action: primary.action || "",
          reason: primary.reason || "",
          expectedResult: primary.expectedResult || "",
          nextStep: primary.nextStep || "",
          reportSummary: guidance && guidance.reportSummary ? guidance.reportSummary : "",
          sourceIntegrity: guidance && guidance.sourceIntegrity ? clone(guidance.sourceIntegrity) : null,
          error,
          guidance: clone(guidance)
        };
      });

    return sortByPipelineOrder(entries);
  }

  function summarizeGuidanceItems(items) {
    const tools = sortByPipelineOrder(items || []);
    const generated = tools.filter((item) => item.generated);
    const risks = generated.filter((item) => normalizeStatus(item.status) === "risk");
    const watches = generated.filter((item) => normalizeStatus(item.status) === "watch");
    const healthy = generated.filter((item) => normalizeStatus(item.status) === "healthy");
    const unknown = tools.filter((item) => !item.generated || normalizeStatus(item.status) === "unknown");

    let status = "unknown";
    let priorityTool = null;

    if (risks.length) {
      status = "risk";
      priorityTool = risks[0];
    } else if (watches.length) {
      status = "watch";
      priorityTool = watches[0];
    } else if (generated.length && healthy.length === generated.length) {
      status = "healthy";
      priorityTool = generated[generated.length - 1] || null;
    }

    return {
      status,
      generatedCount: generated.length,
      totalTracked: tools.length,
      healthyCount: healthy.length,
      watchCount: watches.length,
      riskCount: risks.length,
      unknownCount: unknown.length,
      priorityTool: priorityTool ? clone(priorityTool) : null,
      risks: risks.map((item) => clone(item)),
      watches: watches.map((item) => clone(item)),
      healthy: healthy.map((item) => clone(item)),
      unknown: unknown.map((item) => clone(item))
    };
  }

  function categoryAction(summary) {
    if (!summary || summary.status === "unknown") {
      return "Run Physical Security Guidance";
    }

    if (summary.status === "risk") {
      return summary.priorityTool && summary.priorityTool.action
        ? summary.priorityTool.action
        : "Correct Physical Security Risk Items";
    }

    if (summary.status === "watch") {
      return summary.priorityTool && summary.priorityTool.action
        ? summary.priorityTool.action
        : "Validate Physical Security Watch Items";
    }

    return "Continue Physical Security Design Flow";
  }

  function categoryReason(summary) {
    if (!summary || summary.status === "unknown") {
      return "No generated tool guidance is available yet. Run a Physical Security calculation before creating a category-level summary.";
    }

    if (summary.status === "risk") {
      const label = summary.priorityTool ? summary.priorityTool.label : "a Physical Security tool";
      return label + " is currently the highest-priority risk item in the Physical Security guidance stack.";
    }

    if (summary.status === "watch") {
      const label = summary.priorityTool ? summary.priorityTool.label : "a Physical Security tool";
      return label + " is currently the first watch item that should be confirmed before the design is treated as clean.";
    }

    return "Generated Physical Security tool guidance is currently healthy across the available tool results.";
  }

  function categoryNextStep(summary) {
    if (!summary || summary.status === "unknown") {
      return "Run the next relevant Physical Security tool calculation.";
    }

    if (summary.priorityTool && summary.priorityTool.nextStep) {
      return summary.priorityTool.nextStep;
    }

    if (summary.status === "risk") {
      return "Resolve the highest-priority risk item before carrying the design forward.";
    }

    if (summary.status === "watch") {
      return "Confirm watch assumptions before treating the category as ready.";
    }

    return "Continue to the next Physical Security planning step or produce the final category summary.";
  }

  function createCategoryGuidance(items, options) {
    const summary = summarizeGuidanceItems(items || []);
    const action = categoryAction(summary);
    const reason = categoryReason(summary);
    const nextStep = categoryNextStep(summary);
    const expectedResult = [
      summary.generatedCount + " generated tool guidance result" + (summary.generatedCount === 1 ? "" : "s"),
      summary.riskCount + " risk",
      summary.watchCount + " watch",
      summary.healthyCount + " healthy",
      summary.unknownCount + " not generated"
    ].join(" | ");

    return {
      version: VERSION,
      category: CATEGORY,
      status: summary.status,
      mode: options && options.mode ? options.mode : "category-summary",
      primaryRecommendation: {
        action,
        reason,
        expectedResult,
        confidence: summary.generatedCount ? "Generated from tool guidance adapters" : "No generated guidance yet",
        nextStep
      },
      reportSummary: [
        action,
        reason,
        "Expected result: " + expectedResult
      ].join(" "),
      counts: {
        generated: summary.generatedCount,
        tracked: summary.totalTracked,
        healthy: summary.healthyCount,
        watch: summary.watchCount,
        risk: summary.riskCount,
        unknown: summary.unknownCount
      },
      priorityTool: summary.priorityTool,
      risks: summary.risks,
      watches: summary.watches,
      healthy: summary.healthy,
      unknown: summary.unknown,
      tools: sortByPipelineOrder(items || [])
    };
  }

  function explainCategoryGuidance(categoryGuidance) {
    if (!categoryGuidance) {
      return {
        ok: false,
        summary: "No Physical Security category guidance is available yet.",
        nextStep: "Run one or more Physical Security tool calculations first."
      };
    }

    const primary = categoryGuidance.primaryRecommendation || {};

    return {
      ok: true,
      category: categoryGuidance.category || CATEGORY,
      status: categoryGuidance.status || "unknown",
      mode: categoryGuidance.mode || "category-summary",
      action: primary.action || "",
      reason: primary.reason || "",
      expected: primary.expectedResult || "",
      nextStep: primary.nextStep || "",
      counts: clone(categoryGuidance.counts || {}),
      priorityTool: clone(categoryGuidance.priorityTool || null),
      reportSummary: categoryGuidance.reportSummary || "",
      guidance: clone(categoryGuidance)
    };
  }

  function explainCurrentGuidance() {
    return explainCategoryGuidance(createCategoryGuidance(collectToolGuidance()));
  }

  window.ScopedLabsPhysicalSecurityCategoryGuidance = Object.freeze({
    version: VERSION,
    category: CATEGORY,
    collectToolGuidance,
    summarizeGuidanceItems,
    createCategoryGuidance,
    explainCategoryGuidance,
    explainCurrentGuidance
  });
})();