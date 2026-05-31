(function () {
  "use strict";

  const VERSION = "physical-security-source-policy-002-master-knowledge-guardrails";
  const CATEGORY = "physical-security";

  const allowedTopics = {
    "lighting-illumination": {
      label: "Lighting / Illumination",
      keywords: ["illumination", "lighting", "footcandle", "lux", "light loss", "utilization factor", "scene lighting"],
      allowedUse: "Inform illumination assumptions, source-integrity warnings, and explanatory guidance.",
      cannotOverride: ["ScopedLabs illumination math", "pipeline carry-over", "tool calculation outputs"]
    },
    "mounting-geometry": {
      label: "Mounting Geometry",
      keywords: ["mounting height", "camera height", "target distance", "vertical angle", "viewing angle", "mount geometry"],
      allowedUse: "Inform mounting guidance narratives and risk explanation.",
      cannotOverride: ["Mounting Height calculations", "validated field values"]
    },
    "field-of-view": {
      label: "Field of View",
      keywords: ["field of view", "FOV", "HFOV", "VFOV", "horizontal field", "view angle", "scene width"],
      allowedUse: "Inform FOV explanation and planning language.",
      cannotOverride: ["FOV geometry", "camera coverage area math"]
    },
    "coverage-spacing": {
      label: "Coverage / Spacing",
      keywords: ["coverage", "camera spacing", "overlap", "effective coverage", "coverage area", "camera layout"],
      allowedUse: "Inform spacing, overlap, reserve, and design tradeoff explanations.",
      cannotOverride: ["camera count", "spacing result", "effective coverage result"]
    },
    "blind-spots": {
      label: "Blind Spots",
      keywords: ["blind spot", "gap", "coverage gap", "uncovered area", "dead zone"],
      allowedUse: "Inform blind spot risk narrative and correction options.",
      cannotOverride: ["modeled gap result", "coverage interval calculations"]
    },
    "pixel-density": {
      label: "Pixel Density",
      keywords: ["pixel density", "pixels per foot", "PPF", "pixels per meter", "PPM", "detail level", "identification"],
      allowedUse: "Inform detail-level explanation and operational context.",
      cannotOverride: ["ScopedLabs PPF calculation", "target threshold selected by the tool"]
    },
    "lens-optics": {
      label: "Lens / Optics",
      keywords: ["lens", "focal length", "sensor size", "varifocal", "wide angle", "telephoto", "optics"],
      allowedUse: "Inform lens planning context only.",
      cannotOverride: ["Lens Selection protected behavior", "gold-standard lens workflow"]
    },
    "face-recognition": {
      label: "Face Recognition Range",
      keywords: ["face recognition", "facial recognition", "pixels per face", "face capture", "face identification"],
      allowedUse: "Inform specialist face-recognition explanation.",
      cannotOverride: ["Face Recognition Range calculations"]
    },
    "license-plate-capture": {
      label: "License Plate Capture",
      keywords: ["license plate", "number plate", "plate capture", "LPR", "ANPR", "pixels per plate"],
      allowedUse: "Inform specialist plate-capture explanation.",
      cannotOverride: ["License Plate Capture Range calculations"]
    },
    "physical-security-design": {
      label: "Physical Security Design",
      keywords: ["physical security", "surveillance design", "security camera planning", "video surveillance", "CCTV design"],
      allowedUse: "Inform category-level planning narrative.",
      cannotOverride: ["tool math", "pipeline order", "audits", "protected tool behavior"]
    }
  };

  const blockedTopics = [
    {
      id: "shopping-or-vendor-fluff",
      label: "Shopping / Vendor Fluff",
      keywords: ["buy now", "coupon", "discount", "best price", "dealer quote", "cart", "free shipping"],
      reason: "Product shopping and ad content should not drive engineering guidance."
    },
    {
      id: "unrelated-cybersecurity",
      label: "Unrelated Cybersecurity",
      keywords: ["malware", "ransomware", "phishing", "password manager", "endpoint security", "firewall rule"],
      reason: "IT/cybersecurity content is outside this Physical Security planning scope unless explicitly tied to camera design."
    },
    {
      id: "alarm-sales",
      label: "Alarm Sales",
      keywords: ["home alarm package", "monitoring plan", "monthly monitoring", "alarm subscription"],
      reason: "Alarm sales content is outside the current camera-planning guidance lane."
    },
    {
      id: "privacy-law-advice",
      label: "Legal Advice",
      keywords: ["legal advice", "wiretapping law", "surveillance law", "recording consent", "privacy lawsuit"],
      reason: "Legal content may be referenced only as a compliance warning, not as design math or legal advice."
    },
    {
      id: "general-news",
      label: "General News",
      keywords: ["breaking news", "crime report", "press release", "incident report"],
      reason: "News items should not change engineering guidance unless manually converted into curated source summaries."
    }
  ];

  const sourceUseRules = {
    allowed: [
      "Explain why a result matters",
      "Clarify physical-security terminology",
      "Support source-integrity warnings",
      "Add report narrative context",
      "Suggest non-destructive next-step checks"
    ],
    forbidden: [
      "Override ScopedLabs formulas",
      "Override pipeline carry-over",
      "Override audit results",
      "Modify protected Lens Selection behavior",
      "Auto-change thresholds without repo review",
      "Insert uncited web text directly into reports"
    ],
    requiredBeforeUse: [
      "Topic must match at least one allowed Physical Security topic",
      "Blocked topic scan must pass",
      "Source summary must be cached or curated before runtime use",
      "Any user-visible claim from web-derived knowledge must be traceable to an approved source summary"
    ]
  };

  const masterAssistantSourceRules = {
    runtimeFetchAllowed: false,
    approvedKnowledgePath: "Curated or cached source summaries only",
    allowedToInfluence: [
      "guidance wording",
      "procedure/method explanation",
      "non-destructive correction suggestions",
      "report-readiness narrative",
      "source-integrity warnings"
    ],
    forbiddenToInfluence: [
      "calculator formulas",
      "tool thresholds",
      "pipeline carry-over values",
      "protected Lens Selection behavior",
      "audit pass/fail logic",
      "vendor recommendations or shopping decisions"
    ],
    summaryRule: "Current-method or web-derived information can make the master assistant smarter about procedures, but it cannot change ScopedLabs calculations."
  };


  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function keywordHits(text, keywords) {
    const normalized = normalizeText(text);
    return (keywords || []).filter((keyword) => normalized.includes(normalizeText(keyword)));
  }

  function classifyText(text) {
    const normalized = normalizeText(text);
    const matchedTopics = Object.keys(allowedTopics)
      .map((id) => {
        const topic = allowedTopics[id];
        const hits = keywordHits(normalized, topic.keywords);
        return hits.length ? { id, label: topic.label, hits } : null;
      })
      .filter(Boolean);

    const blocked = blockedTopics
      .map((topic) => {
        const hits = keywordHits(normalized, topic.keywords);
        return hits.length ? { id: topic.id, label: topic.label, hits, reason: topic.reason } : null;
      })
      .filter(Boolean);

    return {
      allowed: matchedTopics.length > 0 && blocked.length === 0,
      matchedTopics,
      blocked,
      reason: blocked.length
        ? "Rejected by blocked-topic policy."
        : matchedTopics.length
          ? "Accepted as Physical Security relevant."
          : "Rejected because no Physical Security topic matched."
    };
  }

  function classifySourceCandidate(candidate) {
    const item = candidate || {};
    const text = [
      item.title,
      item.description,
      item.snippet,
      item.summary,
      item.url,
      Array.isArray(item.tags) ? item.tags.join(" ") : item.tags
    ].filter(Boolean).join(" ");

    const classification = classifyText(text);

    return Object.assign({}, classification, {
      title: item.title || "",
      url: item.url || "",
      domain: item.domain || "",
      sourceType: item.sourceType || "unknown",
      mayUseAtRuntime: false,
      runtimeRequirement: "Only curated/cached source summaries may be used by the browser runtime."
    });
  }

  function getAllowedTopics() {
    return clone(allowedTopics);
  }

  function getBlockedTopics() {
    return clone(blockedTopics);
  }

  function getSourceUseRules() {
    return clone(sourceUseRules);
  }

  function getMasterAssistantSourceRules() {
    return clone(masterAssistantSourceRules);
  }

  window.ScopedLabsPhysicalSecuritySourcePolicy = Object.freeze({
    version: VERSION,
    category: CATEGORY,
    getAllowedTopics,
    getBlockedTopics,
    getSourceUseRules,
    getMasterAssistantSourceRules,
    classifyText,
    classifySourceCandidate
  });
})();