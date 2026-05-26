(function () {
  "use strict";

  const VERSION = "physical-security-category-guidance-002-memory-aware-master";
  const CATEGORY = "physical-security";

  const fallbackOrder = [
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

  function clone(value) {
    if (value == null) return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function normalizeStatus(status) {
    const value = String(status || "").toLowerCase();

    if (value.includes("risk") || value.includes("fail") || value.includes("blocked")) return "risk";
    if (value.includes("watch") || value.includes("warning") || value.includes("caution")) return "watch";
    if (value.includes("healthy") || value.includes("safe") || value.includes("ok")) return "healthy";

    return "unknown";
  }

  function statusRank(status) {
    const normalized = normalizeStatus(status);

    if (normalized === "risk") return 4;
    if (normalized === "watch") return 3;
    if (normalized === "unknown") return 2;
    if (normalized === "healthy") return 1;

    return 0;
  }

  function labelFromSlug(slug) {
    return String(slug || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getKnowledge() {
    return window.ScopedLabsPhysicalSecurityCategoryKnowledge || null;
  }

  function getSourcePolicy() {
    return window.ScopedLabsPhysicalSecuritySourcePolicy || null;
  }

  function getRegistry() {
    return window.ScopedLabsPhysicalSecurityGuidanceRegistry || null;
  }

  function getGuidanceMemory() {
    return window.ScopedLabsPhysicalSecurityGuidanceMemory || null;
  }

  function getPipelineOrder() {
    const knowledge = getKnowledge();

    if (knowledge && Array.isArray(knowledge.pipelineOrder)) {
      return clone(knowledge.pipelineOrder);
    }

    return clone(fallbackOrder);
  }

  function orderIndex(slug) {
    const order = getPipelineOrder();
    const index = order.indexOf(slug);
    return index >= 0 ? index : 999;
  }

  function sortByPipelineOrder(items) {
    return clone(items || []).sort((a, b) => {
      return orderIndex(a.slug) - orderIndex(b.slug);
    });
  }

  function registryEntries() {
    const registry = getRegistry();

    if (registry && typeof registry.listAll === "function") {
      return registry.listAll();
    }

    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.listTools === "function") {
      return knowledge.listTools().map((tool) => ({
        slug: tool.slug || "",
        label: tool.label || "",
        role: tool.role || "",
        protected: !!tool.protected,
        guidanceCandidate: tool.adapterStatus === "proven",
        proofStatus: tool.adapterStatus === "proven" ? "proven" : tool.adapterStatus || "",
        globalName: tool.globalName || ""
      }));
    }

    return [];
  }

  function primaryRecommendationFor(guidance) {
    if (!guidance || typeof guidance !== "object") return {};
    return guidance.primaryRecommendation || guidance.recommendation || {};
  }

  function memoryBackedGuidanceFor(slug) {
    const memory = getGuidanceMemory();

    if (!memory || typeof memory.getToolGuidance !== "function") {
      return null;
    }

    const record = memory.getToolGuidance(slug);

    if (!record || !record.guidance) {
      return null;
    }

    return record;
  }

  function toolKnowledgeFor(slug) {
    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.getTool === "function") {
      return knowledge.getTool(slug);
    }

    return null;
  }

  function toolWebPolicyFor(slug) {
    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.getToolWebPolicy === "function") {
      return knowledge.getToolWebPolicy(slug);
    }

    return null;
  }

  function collectToolGuidance() {
    const entries = registryEntries()
      .filter((entry) => entry && entry.globalName && entry.proofStatus === "proven")
      .map((entry) => {
        const api = window[entry.globalName];
        const knowledge = toolKnowledgeFor(entry.slug);
        const webPolicy = toolWebPolicyFor(entry.slug);

        let guidance = null;
        let guidanceSource = "none";
        let memoryRecord = null;
        let error = "";

        if (api && typeof api.getLastGuidance === "function") {
          try {
            guidance = api.getLastGuidance();
            if (guidance) {
              guidanceSource = "live";
            }
          } catch (err) {
            error = err && err.message ? err.message : String(err || "Guidance read failed");
          }
        }

        if (!guidance) {
          memoryRecord = memoryBackedGuidanceFor(entry.slug);
          if (memoryRecord && memoryRecord.guidance) {
            guidance = memoryRecord.guidance;
            guidanceSource = "memory";
          }
        }

        const primary = primaryRecommendationFor(guidance);

        return {
          slug: entry.slug,
          label: entry.label || (knowledge && knowledge.label) || labelFromSlug(entry.slug),
          role: entry.role || (knowledge && knowledge.role) || "",
          globalName: entry.globalName,
          generated: !!guidance,
          guidanceSource,
          memoryRecord: memoryRecord ? clone(memoryRecord) : null,
          status: guidance ? normalizeStatus(guidance.status) : "unknown",
          mode: guidance && guidance.mode ? guidance.mode : "unknown",
          action: primary.action || "",
          reason: primary.reason || "",
          expectedResult: primary.expectedResult || "",
          nextStep: primary.nextStep || "",
          reportSummary: guidance && guidance.reportSummary ? guidance.reportSummary : "",
          sourceIntegrity: guidance && guidance.sourceIntegrity ? clone(guidance.sourceIntegrity) : null,
          toolKnowledge: clone(knowledge),
          webPolicy: clone(webPolicy),
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
      return "No generated Physical Security tool guidance is available yet. Run one or more tool calculations before creating a category-level summary.";
    }

    if (summary.status === "risk") {
      const label = summary.priorityTool ? summary.priorityTool.label : "a Physical Security tool";
      return label + " is currently the highest-priority risk item in the Physical Security guidance stack.";
    }

    if (summary.status === "watch") {
      const label = summary.priorityTool ? summary.priorityTool.label : "a Physical Security tool";
      return label + " is currently the first watch item that should be confirmed before the design is treated as clean.";
    }

    return "Generated Physical Security guidance is currently healthy across the available tool results.";
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

  function knowledgeStatus() {
    const knowledge = getKnowledge();
    const sourcePolicy = getSourcePolicy();

    return {
      knowledgeLoaded: !!knowledge,
      knowledgeVersion: knowledge && knowledge.version ? knowledge.version : "",
      sourcePolicyLoaded: !!sourcePolicy,
      sourcePolicyVersion: sourcePolicy && sourcePolicy.version ? sourcePolicy.version : "",
      runtimeFetchAllowed: false,
      externalSourceRule: knowledge && knowledge.externalSourceRules && knowledge.externalSourceRules.coreRule
        ? knowledge.externalSourceRules.coreRule
        : "External sources may inform guidance language, but cannot override ScopedLabs math, pipeline carry-over, audits, or protected tool behavior."
    };
  }

  function sourceTopicCoverage(items) {
    const topics = {};
    (items || []).forEach((item) => {
      const webPolicy = item.webPolicy || {};
      (webPolicy.webTopics || []).forEach((topic) => {
        if (!topics[topic]) {
          topics[topic] = [];
        }
        topics[topic].push(item.slug);
      });
    });

    return topics;
  }

  function createCategoryGuidance(items, options) {
    const toolItems = sortByPipelineOrder(items || []);
    const summary = summarizeGuidanceItems(toolItems);
    const action = categoryAction(summary);
    const reason = categoryReason(summary);
    const nextStep = categoryNextStep(summary);
    const knowledge = knowledgeStatus();

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
        confidence: summary.generatedCount ? "Generated from normalized tool guidance adapters" : "No generated guidance yet",
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
      sourceTopics: sourceTopicCoverage(toolItems),
      knowledge,
      tools: toolItems
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
      knowledge: clone(categoryGuidance.knowledge || {}),
      sourceTopics: clone(categoryGuidance.sourceTopics || {}),
      reportSummary: categoryGuidance.reportSummary || "",
      guidance: clone(categoryGuidance)
    };
  }

  function explainCurrentGuidance() {
    return explainCategoryGuidance(createCategoryGuidance(collectToolGuidance()));
  }

  function classifyExternalSource(candidate) {
    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.classifyExternalSource === "function") {
      return knowledge.classifyExternalSource(candidate || {});
    }

    const sourcePolicy = getSourcePolicy();

    if (sourcePolicy && typeof sourcePolicy.classifySourceCandidate === "function") {
      return sourcePolicy.classifySourceCandidate(candidate || {});
    }

    return {
      allowed: false,
      reason: "Physical Security source policy is not loaded.",
      mayUseAtRuntime: false
    };
  }


  function shouldShowVisibleCategoryGuidance(currentSlug, input) {
    const explanation = input && input.guidance ? input : explainCategoryGuidance(createCategoryGuidance(collectToolGuidance()));
    const counts = explanation.counts || {};
    const priorityTool = explanation.priorityTool || null;
    const sourceTopics = explanation.sourceTopics || {};
    const generated = Number(counts.generated || 0);
    const risk = Number(counts.risk || 0);
    const watch = Number(counts.watch || 0);
    const prioritySlug = priorityTool && priorityTool.slug ? priorityTool.slug : "";

    const reasons = [];

    if (generated >= 2) {
      reasons.push("multiple-tools-generated");
    }

    if (risk > 0) {
      reasons.push("risk-present");
    }

    if (watch > 1) {
      reasons.push("multiple-watch-items");
    }

    if (prioritySlug && currentSlug && prioritySlug !== currentSlug) {
      reasons.push("priority-tool-is-not-current-tool");
    }

    if (generated > 0 && currentSlug && sourceTopics && Object.keys(sourceTopics).length > 1) {
      reasons.push("cross-topic-context");
    }

    return {
      show: reasons.length > 0,
      reasons,
      currentSlug: currentSlug || "",
      generated,
      risk,
      watch,
      prioritySlug
    };
  }

  window.ScopedLabsPhysicalSecurityCategoryGuidance = Object.freeze({
    version: VERSION,
    category: CATEGORY,
    collectToolGuidance,
    summarizeGuidanceItems,
    createCategoryGuidance,
    explainCategoryGuidance,
    explainCurrentGuidance,
    shouldShowVisibleCategoryGuidance,
    classifyExternalSource
  });
})();