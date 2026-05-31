(function () {
  "use strict";

  const VERSION = "physical-security-category-guidance-005-master-draft-queue";
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


  function getKnowledgeSnapshot() {
    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.buildOwnedCategoryKnowledgeSnapshot === "function") {
      return knowledge.buildOwnedCategoryKnowledgeSnapshot();
    }

    return null;
  }

  function correctionProfileFor(slug, status) {
    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.explainCorrection === "function") {
      return knowledge.explainCorrection(slug, status);
    }

    return {
      slug,
      label: labelFromSlug(slug),
      status: normalizeStatus(status),
      correctionFocus: "Review the source Physical Security tool.",
      meaning: "Review this result before final category handoff.",
      correctionQuestions: [],
      reportImpact: "Review before final category handoff.",
      route: slug ? "/tools/physical-security/" + slug + "/" : "/tools/physical-security/summary/"
    };
  }

  function reportReadinessRules() {
    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.getReportReadinessRules === "function") {
      return knowledge.getReportReadinessRules();
    }

    return {};
  }

  function crossCategoryDependencies() {
    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.getCrossCategoryDependencies === "function") {
      return knowledge.getCrossCategoryDependencies();
    }

    return [];
  }

  function areaZoneModel() {
    const knowledge = getKnowledge();

    if (knowledge && typeof knowledge.getAreaZoneModel === "function") {
      return knowledge.getAreaZoneModel();
    }

    return {};
  }

  function summaryContextRows(context) {
    const model = context && context.model ? context.model : {};
    return Array.isArray(model.allRows) ? model.allRows : [];
  }

  function summaryContextCoreRows(context) {
    const model = context && context.model ? context.model : {};
    return Array.isArray(model.coreRows) ? model.coreRows : [];
  }

  function summaryContextScopes(context) {
    const groups = context && context.model && context.model.groups ? context.model.groups : {};
    return {
      total: Number(groups.total || 0),
      core: Array.isArray(groups.core) ? groups.core.length : 0,
      face: Array.isArray(groups.face) ? groups.face.length : 0,
      plate: Array.isArray(groups.plate) ? groups.plate.length : 0,
      activeAreaId: groups.activeAreaId || ""
    };
  }

  function missingCoreFromContext(context) {
    return summaryContextCoreRows(context).filter((row) => !row.generated || normalizeStatus(row.status) === "unknown");
  }

  function reportMetadataFromContext(context) {
    const metadata = context && context.reportMetadata ? context.reportMetadata : {};
    return {
      reportTitle: metadata.reportTitle || "",
      projectName: metadata.projectName || "",
      clientName: metadata.clientName || "",
      preparedBy: metadata.preparedBy || "",
      complete: !!(metadata.reportTitle && metadata.projectName && metadata.clientName && metadata.preparedBy)
    };
  }

  function reportPostureFor(status, missingCount) {
    const rules = reportReadinessRules();
    const normalized = normalizeStatus(status);

    if (normalized === "risk" && rules.risk) return rules.risk.label;
    if (normalized === "watch" && rules.watch) return rules.watch.label;
    if (missingCount && rules.missing) return rules.missing.label;
    if (normalized === "healthy" && rules.healthy) return rules.healthy.label;

    if (normalized === "risk") return "Draft - correction required";
    if (normalized === "watch") return "Needs review - validate assumptions";
    if (normalized === "healthy") return "Ready for category-level review";
    return "Planning draft - guidance incomplete";
  }

  function correctionQueue(categoryGuidance, context) {
    const queue = [];
    const source = categoryGuidance || {};
    const riskWatch = [];

    (source.risks || []).forEach((item) => riskWatch.push(item));
    (source.watches || []).forEach((item) => riskWatch.push(item));

    if (!riskWatch.length) {
      summaryContextRows(context).forEach((row) => {
        if (!row.generated) return;
        const status = normalizeStatus(row.status);
        if (status === "risk" || status === "watch") riskWatch.push(row);
      });
    }

    riskWatch.slice(0, 6).forEach((item) => {
      const status = normalizeStatus(item.status);
      const profile = correctionProfileFor(item.slug, status);
      queue.push({
        type: status === "risk" ? "risk-correction" : "watch-validation",
        status,
        slug: item.slug || "",
        toolLabel: item.label || profile.label || labelFromSlug(item.slug),
        label: status === "risk" ? "Correct Risk at source tool" : "Validate Watch at source tool",
        detail: profile.meaning || item.nextStep || item.detail || item.reason || "Review the source tool guidance.",
        correctionFocus: profile.correctionFocus || "Review the source Physical Security tool.",
        correctionQuestions: clone(profile.correctionQuestions || []),
        reportImpact: profile.reportImpact || "Review before final handoff.",
        route: profile.route || (item.slug ? "/tools/physical-security/" + item.slug + "/" : "/tools/physical-security/summary/")
      });
    });

    const missingCoreRows = missingCoreFromContext(context);
    const generatedCount = Number((source.counts && source.counts.generated) || 0);

    if (!riskWatch.length && !generatedCount && missingCoreRows.length) {
      const row = missingCoreRows[0];
      const profile = correctionProfileFor(row.slug, "unknown");
      const toolLabel = row.label || profile.label || labelFromSlug(row.slug);
      const route = row.slug ? "/tools/physical-security/" + row.slug + "/" : "/tools/physical-security/summary/";

      queue.push({
        type: "start-core-pipeline",
        status: "unknown",
        slug: row.slug || "",
        toolLabel,
        label: "Start core pipeline",
        detail: "Start with " + toolLabel + ". Open " + toolLabel + " to begin generating saved guidance for this Summary.",
        correctionFocus: "Begin at the first missing core Physical Security tool and proceed through the pipeline before treating this Summary as report-ready.",
        correctionQuestions: clone(profile.correctionQuestions || []),
        reportImpact: "Summary remains a planning draft until core Physical Security guidance is generated.",
        route
      });
    } else {
      missingCoreRows.slice(0, 6).forEach((row) => {
        const profile = correctionProfileFor(row.slug, "unknown");
        queue.push({
          type: "missing-core-step",
          status: "watch",
          slug: row.slug || "",
          toolLabel: row.label || profile.label || labelFromSlug(row.slug),
          label: "Complete missing core step",
          detail: (row.label || profile.label || labelFromSlug(row.slug)) + " has not produced saved guidance for this Summary yet.",
          correctionFocus: profile.correctionFocus || "Run or refresh this source tool.",
          correctionQuestions: clone(profile.correctionQuestions || []),
          reportImpact: profile.reportImpact || "Missing core guidance keeps the report in draft/review posture.",
          route: row.slug ? "/tools/physical-security/" + row.slug + "/" : "/tools/physical-security/summary/"
        });
      });
    }

    if (!queue.length) {
      queue.push({
        type: "ready-review",
        status: "healthy",
        slug: "summary",
        toolLabel: "Physical Security Summary",
        label: "Ready for category review",
        detail: "No current Risk or Watch item is blocking the Physical Security category summary.",
        correctionFocus: "Review final report narrative and handoff assumptions.",
        correctionQuestions: ["Are report metadata fields complete?", "Are area/zone names client-readable?", "Are cross-category dependencies ready for the next category?"],
        reportImpact: "Ready for category-level review and future Site Assistant handoff.",
        route: "/tools/physical-security/summary/"
      });
    }

    return queue.slice(0, 8);
  }

  function buildSummaryMasterReview(categoryGuidance, context) {
    const counts = categoryGuidance && categoryGuidance.counts ? categoryGuidance.counts : {};
    const missingCore = missingCoreFromContext(context || {});
    const status = normalizeStatus(categoryGuidance && categoryGuidance.status);
    const generatedCount = Number(counts.generated || 0);
    const readyStatus = !generatedCount ? "unknown" : (status === "unknown" && missingCore.length ? "watch" : status);
    const queue = correctionQueue(categoryGuidance, context || {});
    const metadata = reportMetadataFromContext(context || {});
    const scopes = summaryContextScopes(context || {});
    const deps = crossCategoryDependencies().map((dependency) => ({
      key: dependency.key || "",
      label: dependency.label || "Dependency",
      status: Number(counts.generated || 0) ? "watch" : "unknown",
      detail: dependency.guidance || "Carry this Physical Security dependency into the appropriate category summary."
    }));

    return {
      version: VERSION,
      mode: "summary-master-review",
      category: CATEGORY,
      readiness: {
        status: readyStatus,
        label: reportPostureFor(readyStatus, missingCore.length),
        detail: queue[0] && queue[0].status !== "healthy"
          ? queue[0].detail
          : "Use the built report for category-level review and cross-category handoff."
      },
      reportPosture: reportPostureFor(readyStatus, missingCore.length),
      correctionQueue: queue,
      priorityCorrection: queue[0] || null,
      missingCore,
      areaZoneModel: areaZoneModel(),
      scopeCounts: scopes,
      toolNoteCount: Array.isArray(context && context.toolNotes) ? context.toolNotes.length : 0,
      reportMetadata: metadata,
      crossCategoryHandoff: deps,
      ownedCategoryKnowledge: getKnowledgeSnapshot(),
      sourcePolicy: knowledgeStatus(),
      guardrails: [
        "Guidance only: source tool math remains authoritative.",
        "Current-method/source knowledge may improve language and procedure context only.",
        "Risk/Watch corrections must be made by returning to the source tool or source area/zone."
      ]
    };
  }

  function explainSummaryMasterGuidance(context) {
    const categoryGuidance = createCategoryGuidance(collectToolGuidance(), { mode: "summary-master-review" });
    const explanation = explainCategoryGuidance(categoryGuidance);
    const master = buildSummaryMasterReview(categoryGuidance, context || {});
    const priority = master.priorityCorrection || null;

    explanation.mode = "summary-master-review";
    explanation.status = master.readiness.status || explanation.status;
    explanation.action = master.readiness.label || explanation.action;
    explanation.reason = master.readiness.detail || explanation.reason;
    explanation.expected = [
      String((categoryGuidance.counts && categoryGuidance.counts.generated) || 0) + " generated tool guidance result(s)",
      String((categoryGuidance.counts && categoryGuidance.counts.risk) || 0) + " risk",
      String((categoryGuidance.counts && categoryGuidance.counts.watch) || 0) + " watch",
      String(master.scopeCounts.total || 0) + " area/zone scope(s)",
      String(master.toolNoteCount || 0) + " tool note(s)"
    ].join(" | ");
    explanation.nextStep = priority
      ? (priority.detail || priority.correctionFocus || explanation.nextStep)
      : explanation.nextStep;
    explanation.reportSummary = master.reportPosture + ". " + explanation.reason;
    explanation.summaryMaster = clone(master);

    if (priority) {
      explanation.priorityTool = {
        slug: priority.slug || "summary",
        label: priority.toolLabel || priority.label || "Physical Security Summary",
        action: priority.label || "Review Summary master guidance",
        reason: priority.detail || "",
        nextStep: priority.correctionFocus || priority.detail || "Review the Summary master guidance."
      };
    }

    if (explanation.guidance) {
      explanation.guidance.mode = "summary-master-review";
      explanation.guidance.summaryMaster = clone(master);
    }

    return explanation;
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

    return {
      show: reasons.length > 0,
      reasons,
      currentSlug: currentSlug || "",
      generated,
      risk,
      watch,
      prioritySlug,
      rule: "dedupe-local-assistant-output"
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
    explainSummaryMasterGuidance,
    shouldShowVisibleCategoryGuidance,
    classifyExternalSource
  });
})();