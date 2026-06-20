(function () {
  "use strict";

  var VERSION = "scopedlabs-compute-tool-ledger-publisher-001";
  var State = window.ScopedLabsComputePlanState;

  var TOOL_LABELS = {
    "cpu-sizing": "CPU Sizing",
    "ram-sizing": "RAM Sizing",
    "storage-iops": "Storage IOPS",
    "storage-throughput": "Storage Throughput",
    "vm-density": "VM Density",
    "gpu-vram": "GPU VRAM",
    "power-thermal": "Power & Thermal",
    "raid-rebuild-time": "RAID Rebuild Time",
    "backup-window": "Backup Window",
    "nic-bonding": "NIC Bonding"
  };

  var lastHash = "";

  function text(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function slugFromPath() {
    var match = String(location.pathname || "").match(/\/tools\/compute\/([^\/]+)\//);
    return match ? match[1] : "";
  }

  function toolLabel(slug) {
    return TOOL_LABELS[slug] || text(slug).replace(/[-_]+/g, " ").replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function statusFromText(source) {
    var value = text(source).toUpperCase();
    if (/\bRISK\b/.test(value)) return "RISK";
    if (/\bWATCH\b/.test(value)) return "WATCH";
    if (/\bGOOD\b/.test(value) || /\bHEALTHY\b/.test(value) || /\bPASS\b/.test(value)) return "GOOD";
    if (/\bREVIEW\b/.test(value)) return "AUTHORITY REVIEW";
    if (/\bCOMPLETE\b/.test(value)) return "COMPLETE";
    return "PENDING";
  }

  function findResultsMount() {
    return document.getElementById("results") ||
      document.querySelector("[data-results]") ||
      document.querySelector("[data-output]") ||
      document.querySelector(".results") ||
      document.querySelector(".output-card") ||
      document.querySelector("main");
  }

  function visibleResultText() {
    var mount = findResultsMount();
    if (!mount) return "";
    if (mount.hidden || mount.getAttribute("aria-hidden") === "true") return "";
    return text(mount.innerText || mount.textContent || "");
  }

  function summaryFromText(value) {
    var clean = text(value);
    if (!clean) return "";
    return clean.length > 220 ? clean.slice(0, 217) + "..." : clean;
  }

  function existingDirectToolResult(slug) {
    State = window.ScopedLabsComputePlanState || State;
    if (!State || typeof State.load !== "function" || typeof State.activeWorkload !== "function") return null;

    var plan = State.load();
    var active = State.activeWorkload(plan);
    if (!active || !plan.results || !plan.results[active.id]) return null;

    var item = plan.results[active.id][slug];
    if (!item || !item.result) return null;

    return item.result.source === "shared-compute-tool-ledger-publisher" ? null : item;
  }

  function publish(reason) {
    State = window.ScopedLabsComputePlanState || State;
    if (!State || typeof State.recordToolResult !== "function") return false;

    var slug = slugFromPath();
    if (!slug || slug === "workload-planner" || slug === "summary") return false;
    if (existingDirectToolResult(slug)) return false;

    var outputText = visibleResultText();
    if (!outputText || outputText.length < 12) return false;

    var pendingOnly = /run|calculate|estimate|enter|input/i.test(outputText) &&
      !/\b(GOOD|WATCH|RISK|PASS|COMPLETE|REVIEW|recommended|required|cores|gb|iops|throughput|watt|thermal|raid|backup)\b/i.test(outputText);

    if (pendingOnly) return false;

    var status = statusFromText(outputText);
    var hash = slug + "|" + status + "|" + outputText.slice(0, 420);
    if (hash === lastHash) return false;

    lastHash = hash;

    try {
      State.recordToolResult(slug, {
        label: toolLabel(slug),
        title: toolLabel(slug),
        status: status,
        summaryStatus: status,
        keySavedResult: summaryFromText(outputText),
        summary: summaryFromText(outputText),
        source: "shared-compute-tool-ledger-publisher",
        reason: reason || "result-detected",
        capturedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.warn("ScopedLabs Compute ledger publish failed", error);
      return false;
    }
  }

  function bind() {
    State = window.ScopedLabsComputePlanState || State;
    if (!State) return;

    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("button, a, input[type=button], input[type=submit]") : null;
      if (!target) return;

      var label = text(target.innerText || target.value || target.getAttribute("aria-label") || "");
      if (!/(calculate|run|estimate|size|check|analy[sz]e|continue)/i.test(label)) return;

      setTimeout(function () { publish("action-click"); }, 250);
      setTimeout(function () { publish("action-click-late"); }, 900);
    }, true);

    var mount = findResultsMount();
    if (mount && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        setTimeout(function () { publish("result-mutation"); }, 120);
      });
      observer.observe(mount, { childList: true, subtree: true, characterData: true, attributes: true });
    }

    setTimeout(function () { publish("initial-visible-result"); }, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  window.ScopedLabsComputeToolLedgerPublisher = Object.freeze({
    version: VERSION,
    publish: publish,
    bind: bind
  });
})();
