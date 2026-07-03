/* COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703
   Compute Summary accepted page-owned proof promoted to module-owned JS.
   Source: tools/compute/summary/index.html
   Export config intentionally remains inline before report metadata/export assets.
*/
(function () {
  "use strict";
  window.ScopedLabsComputeSummaryModule = window.ScopedLabsComputeSummaryModule || {
    version: "scopedlabs-compute-summary-001",
    promoted: "COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703"
  };
})();

/* COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703 :: extracted block 1
   Original attrs: inline-summary-script
*/
(function () {
      "use strict";

      var State = window.ScopedLabsComputePlanState;

      var TOOL_LABELS = {
        "cpu-sizing": "CPU Sizing",
        "ram-sizing": "RAM Sizing",
        "gpu-vram": "GPU VRAM",
        "storage-iops": "Storage IOPS",
        "storage-throughput": "Storage Throughput",
        "vm-density": "VM Density",
        "power-thermal": "Power & Thermal",
        "nic-bonding": "NIC Bonding",
        "raid-rebuild-time": "RAID Rebuild",
        "backup-window": "Backup Window"
      };

      var TOOL_HREFS = {
        "cpu-sizing": "../cpu-sizing/",
        "ram-sizing": "../ram-sizing/",
        "gpu-vram": "../gpu-vram/",
        "storage-iops": "../storage-iops/",
        "storage-throughput": "../storage-throughput/",
        "vm-density": "../vm-density/",
        "power-thermal": "../power-thermal/",
        "nic-bonding": "../nic-bonding/",
        "raid-rebuild-time": "../raid-rebuild-time/",
        "backup-window": "../backup-window/"
      };

      var BASE_TOOLS = ["cpu-sizing", "ram-sizing"];
      var BRANCH_TOOLS = [
        { key: "storageHeavy", tools: ["storage-iops", "storage-throughput"] },
        { key: "vmDensity", tools: ["vm-density"] },
        { key: "gpu", tools: ["gpu-vram"] },
        { key: "powerThermal", tools: ["power-thermal"] },
        { key: "nicBonding", tools: ["nic-bonding"] },
        { key: "raid", tools: ["raid-rebuild-time"] },
        { key: "backup", tools: ["backup-window"] }
      ];

      function byId(id) {
        return document.getElementById(id);
      }

      function setText(id, value) {
        var node = byId(id);
        if (node) node.textContent = value;
      }

      function setHtml(id, value) {
        var node = byId(id);
        if (node) node.innerHTML = value;
      }

      function escapeHtml(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function titleCase(value) {
        return String(value || "")
          .replace(/[-_]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/\b\w/g, function (m) { return m.toUpperCase(); }) || "N/A";
      }

      function hasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj || {}, key);
      }

      function resultOf(record) {
        return record && record.result && typeof record.result === "object" ? record.result : record || {};
      }

      function statusOf(record) {
        var result = resultOf(record);
        return String(result.status || result.summaryStatus || record.status || "PENDING").toUpperCase();
      }

      function statusClass(status) {
        var value = String(status || "PENDING").toUpperCase();
        if (value === "GOOD" || value === "HEALTHY" || value === "PASS") return "healthy";
        if (value === "RISK" || value === "FAIL") return "risk";
        if (value === "WATCH" || value === "PENDING") return value.toLowerCase();
        return "watch";
      }

      function statusChipHtml(status) {
        var value = String(status || "PENDING").toUpperCase();
        return '<span class="summary-status-chip ' + statusClass(value) + '">' + escapeHtml(value) + '</span>';
      }

      function selectedTools(workload) {
        var tools = BASE_TOOLS.slice();
        var branches = workload && workload.branches && typeof workload.branches === "object" ? workload.branches : {};

        BRANCH_TOOLS.forEach(function (branch) {
          if (branches[branch.key]) {
            branch.tools.forEach(function (tool) {
              if (tools.indexOf(tool) === -1) tools.push(tool);
            });
          }
        });

        return tools;
      }

      function completedToolsFor(results, workload) {
        var completed = [];
        var selected = selectedTools(workload);

        selected.forEach(function (tool) {
          if (hasOwn(results, tool)) completed.push(tool);
        });

        Object.keys(results || {}).forEach(function (tool) {
          if (completed.indexOf(tool) === -1) completed.push(tool);
        });

        return completed;
      }

      function evidenceFor(record) {
        var result = resultOf(record);
        var parts = [];

        [
          ["Demand", result.demand],
          ["Required", result.required],
          ["Usable", result.usable],
          ["Installed", result.installed],
          ["Capacity", result.capacity],
          ["Reserve", result.reserve],
          ["Headroom", result.headroom]
        ].forEach(function (item) {
          if (item[1] != null && item[1] !== "") parts.push(item[0] + ": " + item[1]);
        });

        if (Array.isArray(result.references) && result.references.length) parts.push("References: " + result.references.length);
        if (Array.isArray(result.actions) && result.actions.length) parts.push("Actions: " + result.actions.length);
        if (Array.isArray(result.decisionSchedule) && result.decisionSchedule.length) parts.push("Schedule: " + result.decisionSchedule.length);

        return parts.length ? parts.join(" | ") : "Saved result record";
      }

      function noteFor(tool, record) {
        var result = resultOf(record);
        return result.guidance ||
          result.interpretation ||
          result.summary ||
          result.recommendation ||
          result.statusReason ||
          "Saved result available for Summary rollup.";
      }

      function countsFor(results, selected) {
        var counts = {
          healthy: 0,
          watch: 0,
          risk: 0,
          pending: 0
        };

        selected.forEach(function (tool) {
          if (!hasOwn(results, tool)) {
            counts.pending += 1;
            return;
          }

          var status = statusOf(results[tool]);
          if (status === "GOOD" || status === "HEALTHY" || status === "PASS") counts.healthy += 1;
          else if (status === "RISK" || status === "FAIL") counts.risk += 1;
          else if (status === "WATCH") counts.watch += 1;
          else counts.pending += 1;
        });

        return counts;
      }

      function overallStatus(counts) {
        if (counts.risk > 0) return "RISK";
        if (counts.watch > 0 || counts.pending > 0) return "WATCH";
        return "HEALTHY";
      }

      function firstMissing(selected, results) {
        return selected.find(function (tool) { return !hasOwn(results, tool); }) || null;
      }

      function firstWatchRisk(selected, results) {
        return selected.find(function (tool) {
          if (!hasOwn(results, tool)) return false;
          var status = statusOf(results[tool]);
          return status === "WATCH" || status === "RISK" || status === "FAIL";
        }) || null;
      }

      function renderNoState() {
        setText("computeSummaryWorkloadName", "Currently viewing: No active workload selected");
        setText("computeSummaryWorkloadMeta", "No Compute workload context detected.");
        setHtml("computeSummaryOverallStatus", statusChipHtml("PENDING"));
        setText("computeSummaryGeneratedStatus", "Not Generated");
        setText("computeSummaryGeneratedCount", "0 / 0");
        setText("computeSummaryHealthyCount", "0");
        setText("computeSummaryWatchCount", "0");
        setText("computeSummaryRiskCount", "0");
        setText("computeSummaryAssistantHeadline", "Planning draft - Compute guidance incomplete");
        setText("computeSummaryAssistantMessage", "Open the Workload Planner and save CPU/RAM results to begin generating saved guidance for this Summary.");
        setText("computeSummaryExpectedResult", "Expected result: 0 generated tool guidance result(s) | 0 risk | 0 watch | 0 workload(s) | 0 tool note(s)");
        setText("computeSummaryNextActionTitle", "Compute Workload Planner");
        setText("computeSummaryNextActionCopy", "Start guided Compute planning.");
        setText("computeSummaryNextStepCopy", "Begin at the Workload Planner before treating this Summary as report-ready.");
        setText("computeSummaryWorkloadRollup", "No active workload loaded yet.");
        setText("computeSummaryGuidanceStack", "0 generated | 0 healthy | 0 watch | 0 risk");
        setText("computeSummaryReportPosture", "Planning draft");
        setText("computeSummaryReportStatus", "Pending");
        setText("computeSummaryReportGenerated", "0 of 0");
        setText("computeSummaryReportCounts", "0 / 0 / 0 / 0");
        setText("computeSummaryReportPriority", "No priority item yet.");
        setText("computeSummaryReportNextStep", "Open the Workload Planner and run the first Compute tool.");
        setText("computeSummaryPostureCopy", "Waiting for saved Compute evidence.");
        setHtml("computeSummaryResultsBody", '<tr><td colspan="3">Open the Workload Planner and run a guided Compute flow first.</td></tr>');
        setHtml("computeSummaryGapList", '<table class="result-table compute-summary-table"><tbody><tr><td>Shared Compute plan-state helper is unavailable or no active workload is selected.</td></tr></tbody></table>');
        setHtml("computeSummaryReportCoreSections", '<table class="result-table compute-summary-table compute-summary-watch-risk-table"><tbody><tr><td>No active workload loaded yet.</td></tr></tbody></table>');
        setHtml("computeSummaryReportBranchSections", '<table class="result-table compute-summary-table compute-summary-watch-risk-table"><tbody><tr><td>No optional Compute branches selected or saved yet.</td></tr></tbody></table>');
      }

      function renderSummary() {
        if (!State || typeof State.load !== "function" || typeof State.activeWorkload !== "function") {
          renderNoState();
          return;
        }

        var plan = State.load();
        var workload = State.activeWorkload(plan);
        var workloadId = workload && workload.id ? workload.id : "unscoped";
        var results = plan && plan.results && plan.results[workloadId] && typeof plan.results[workloadId] === "object"
          ? plan.results[workloadId]
          : {};
        var selected = workload ? selectedTools(workload) : BASE_TOOLS.slice();
        var completed = completedToolsFor(results, workload);
        var missing = selected.filter(function (tool) { return !hasOwn(results, tool); });
        var counts = countsFor(results, selected);
        var status = overallStatus(counts);
        var missingTool = firstMissing(selected, results);
        var priorityTool = firstWatchRisk(selected, results) || missingTool;
        var generatedText = completed.length + " / " + selected.length;

        if (!workload) {
          renderNoState();
          return;
        }

        setText("computeSummaryWorkloadName", "Currently viewing: " + (workload.name || "Compute Workload"));
        setText("computeSummaryWorkloadMeta", [
          titleCase(workload.environment || "environment pending"),
          titleCase(workload.workloadType || "workload pending"),
          "path " + titleCase(workload.planningPath || "guided"),
          "target " + (workload.targetUtilization || "N/A") + "%",
          "growth " + (workload.growthMargin || "N/A") + "%"
        ].join(" | "));
        setHtml("computeSummaryOverallStatus", statusChipHtml(status));

        setText("computeSummaryGeneratedStatus", completed.length ? "Generated" : "Not Generated");
        setText("computeSummaryGeneratedCount", generatedText);
        setText("computeSummaryHealthyCount", String(counts.healthy));
        setText("computeSummaryWatchCount", String(counts.watch));
        setText("computeSummaryRiskCount", String(counts.risk));

        if (status === "RISK") {
          setText("computeSummaryAssistantHeadline", "Planning draft - risk items need review");
          setText("computeSummaryAssistantMessage", "Review the Risk items in the Compute rollup before finalizing this Summary.");
        } else if (missing.length) {
          setText("computeSummaryAssistantHeadline", "Planning draft - selected branch guidance incomplete");
          setText("computeSummaryAssistantMessage", "Open " + (TOOL_LABELS[missingTool] || titleCase(missingTool)) + " to continue generating saved guidance for this Summary.");
        } else {
          setText("computeSummaryAssistantHeadline", "Compute guidance ready for report review");
          setText("computeSummaryAssistantMessage", "Selected Compute evidence is complete for this workload path. Review report details before export.");
        }

        setText("computeSummaryExpectedResult", "Expected result: " + completed.length + " generated tool guidance result(s) | " + counts.risk + " risk | " + counts.watch + " watch | 1 workload scope(s) | 0 tool note(s)");
        setText("computeSummaryNextActionTitle", priorityTool ? (TOOL_LABELS[priorityTool] || titleCase(priorityTool)) : "Review Summary");
        setText("computeSummaryNextActionCopy", priorityTool ? "Open or review this Compute step." : "Review final report posture.");
        setText("computeSummaryNextStepCopy", missing.length ? "Begin at the first missing selected Compute tool and proceed through the selected branch path before treating this Summary as report-ready." : "Review Watch/Risk detail and final report sections before export.");

        setText("computeSummaryPostureTitle", status === "HEALTHY" ? "Report posture ready" : "Planning draft - Compute guidance incomplete");
        setText("computeSummaryPostureCopy", status === "HEALTHY" ? "Selected Compute evidence is ready for report review." : "Saved evidence exists, but missing or Watch/Risk items remain.");
        setText("computeSummaryWorkloadRollup", "1 workload | " + completed.length + " completed | " + missing.length + " missing");
        setText("computeSummaryGuidanceStack", completed.length + " generated | " + counts.healthy + " healthy | " + counts.watch + " watch | " + counts.risk + " risk");
        setText("computeSummaryReportPosture", status === "HEALTHY" ? "Report review ready" : "Planning draft - review required");
        setText("computeSummaryActionBandTitle", missing.length ? "Start selected branch" : "Review report");
        setText("computeSummaryActionBandCopy", priorityTool ? (TOOL_LABELS[priorityTool] || titleCase(priorityTool)) + " - Open this step to continue saved guidance for this Summary. - Summary remains a planning draft until selected Compute guidance is complete." : "Summary selected evidence is complete. Review final report export details.");

        setText("computeSummaryRollupIntro", "Core CPU/RAM sizing stays on the normal Compute design path. Optional branches remain separate validations, but still attach to this category summary.");

        if (!completed.length) {
          setHtml("computeSummaryResultsBody", '<tr><td colspan="3">No saved Compute tool results were found for this workload yet.</td></tr>');
        } else {
          setHtml("computeSummaryResultsBody", completed.map(function (tool) {
            var record = results[tool] || {};
            return [
              "<tr>",
              '<td><a href="' + escapeHtml(TOOL_HREFS[tool] || "../workload-planner/") + '">' + escapeHtml(TOOL_LABELS[tool] || titleCase(tool)) + "</a></td>",
              "<td>" + statusChipHtml(statusOf(record)) + "</td>",
              '<td><span class="compute-summary-detail-primary">' + escapeHtml(noteFor(tool, record)) + '</span><span class="compute-summary-detail-secondary">' + escapeHtml(evidenceFor(record)) + "</span></td>",
              "</tr>"
            ].join("");
          }).join(""));
        }

        if (!missing.length) {
          setHtml("computeSummaryGapList", '<table class="result-table compute-summary-table"><tbody><tr><td>No selected branch gaps found for this workload.</td></tr></tbody></table>');
        } else {
          setHtml("computeSummaryGapList", [
            '<table class="result-table compute-summary-table"><thead><tr><th>Optional / selected branch</th><th>Status</th><th>Next action</th></tr></thead><tbody>',
            missing.map(function (tool) {
              return '<tr><td>' + escapeHtml(TOOL_LABELS[tool] || titleCase(tool)) + '</td><td>' + statusChipHtml("PENDING") + '</td><td><a href="' + escapeHtml(TOOL_HREFS[tool] || "../workload-planner/") + '">Open tool</a> and save a result for Summary.</td></tr>';
            }).join(""),
            "</tbody></table>"
          ].join(""));
        }

        setText("computeSummaryReportStatus", status);
        setText("computeSummaryReportGenerated", completed.length + " of " + selected.length);
        setText("computeSummaryReportCounts", counts.healthy + " / " + counts.watch + " / " + counts.risk + " / " + counts.pending);
        setText("computeSummaryReportPriority", priorityTool ? (TOOL_LABELS[priorityTool] || titleCase(priorityTool)) : "No priority item yet.");
        setText("computeSummaryReportNextStep", missing.length ? "Review missing selected branches before finalizing the report." : "Review Watch/Risk detail before finalizing the report.");

        var watchRiskRows = selected.filter(function (tool) {
          if (!hasOwn(results, tool)) return false;
          var state = statusOf(results[tool]);
          return state === "WATCH" || state === "RISK" || state === "FAIL";
        }).map(function (tool) {
          var record = results[tool];
          var state = statusOf(record);
          var toolLabel = TOOL_LABELS[tool] || titleCase(tool);
          var scopeLabel = workload && workload.name ? "Workload: " + workload.name : "Compute workload";
          var requiredAction = state === "WATCH"
            ? "Validate " + toolLabel + " assumptions before finalizing the report."
            : "Review " + toolLabel + " before finalizing the report.";

          return [
            "<tr>",
            "<td>" + escapeHtml(scopeLabel) + "</td>",
            '<td><a href="' + escapeHtml(TOOL_HREFS[tool] || "../workload-planner/") + '">' + escapeHtml(toolLabel) + "</a></td>",
            "<td>" + statusChipHtml(state) + "</td>",
            "<td>" + escapeHtml(requiredAction) + "</td>",
            '<td><span class="compute-summary-detail-primary">' + escapeHtml(noteFor(tool, record)) + '</span><span class="compute-summary-detail-secondary">' + escapeHtml(evidenceFor(record)) + "</span></td>",
            "</tr>"
          ].join("");
        }).join("");

        setHtml("computeSummaryWatchRiskDetail", watchRiskRows
          ? '<table class="result-table compute-summary-table compute-summary-watch-risk-table"><thead><tr><th>Scope / Workload</th><th>Tool</th><th>Status</th><th>Required Action</th><th>Detail / Next Step</th></tr></thead><tbody>' + watchRiskRows + '</tbody></table>'
          : '<table class="result-table compute-summary-table compute-summary-watch-risk-table"><tbody><tr><td colspan="5">No Watch/Risk details available yet.</td></tr></tbody></table>'
        );

        // compute-summary-deduped-workload-report-sections-0628
        function getSavedWorkloadsForReport() {
          var stateApi = window.ScopedLabsComputePlanState || {};
          var roots = [];
          var found = [];

          function pushRoot(value) {
            if (value && typeof value === "object") {
              roots.push(value);
            }
          }

          [
            "getWorkloads",
            "getSavedWorkloads",
            "getState",
            "readState",
            "getPlanState",
            "readPlanState",
            "getPlan",
            "readPlan",
            "getLedger",
            "getWorkloadLedger"
          ].forEach(function (method) {
            try {
              if (typeof stateApi[method] === "function") {
                pushRoot(stateApi[method]());
              }
            } catch (error) {}
          });

          pushRoot(stateApi.state);
          pushRoot(stateApi.plan);
          pushRoot(stateApi.ledger);
          pushRoot(stateApi.workloads);

          try {
            for (var i = 0; i < window.localStorage.length; i += 1) {
              var key = window.localStorage.key(i) || "";
              if (!/compute|workload|planner|plan/i.test(key)) continue;

              var raw = window.localStorage.getItem(key);
              if (!raw || (raw.charAt(0) !== "{" && raw.charAt(0) !== "[")) continue;

              try {
                pushRoot(JSON.parse(raw));
              } catch (error) {}
            }
          } catch (error) {}

          function hasPlannerShape(item) {
            if (!item || typeof item !== "object" || Array.isArray(item)) return false;

            return !!(
              item.branches ||
              item.environment ||
              item.path ||
              item.workloadType ||
              item.pattern ||
              item.criticality ||
              item.targetUtilization ||
              item.growthMargin ||
              item.results ||
              item.toolResults ||
              item.outputs
            );
          }

          function normalizeWorkload(item) {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;

            var name = item.name || item.workloadName || item.title || item.label || "";
            var id = item.id || item.workloadId || item.key || "";

            if (!name && !id) return null;
            if (!hasPlannerShape(item)) return null;

            var genericName = String(name || "").trim().toLowerCase() === "compute workload";
            if (genericName && !id && !item.branches && !item.results && !item.toolResults && !item.outputs) {
              return null;
            }

            var copy = {};
            Object.keys(item).forEach(function (key) {
              copy[key] = item[key];
            });

            copy.id = copy.id || copy.workloadId || copy.key || "";
            copy.workloadId = copy.workloadId || copy.id || "";
            copy.name = copy.name || copy.workloadName || copy.title || copy.label || "Compute workload";

            return copy;
          }

          function collect(value, depth) {
            if (!value || depth > 6) return;

            if (Array.isArray(value)) {
              value.forEach(function (item) {
                collect(item, depth + 1);
              });
              return;
            }

            if (typeof value !== "object") return;

            var normalized = normalizeWorkload(value);
            if (normalized) {
              found.push(normalized);
            }

            Object.keys(value).forEach(function (key) {
              var child = value[key];

              if (!child || typeof child !== "object") return;

              if (
                Array.isArray(child) ||
                /workload|planner|plan|saved|ledger|items|records|list|entries/i.test(key)
              ) {
                collect(child, depth + 1);
              }
            });
          }

          roots.forEach(function (root) {
            collect(root, 0);
          });

          var unique = [];

          function sameWorkload(a, b) {
            var aId = String(a.id || a.workloadId || "").trim().toLowerCase();
            var bId = String(b.id || b.workloadId || "").trim().toLowerCase();
            var aName = String(a.name || a.workloadName || "").trim().toLowerCase();
            var bName = String(b.name || b.workloadName || "").trim().toLowerCase();

            return !!(
              (aId && bId && aId === bId) ||
              (aName && bName && aName === bName)
            );
          }

          function scoreWorkload(item) {
            var score = 0;
            if (item.id || item.workloadId) score += 5;
            if (item.branches) score += 5;
            if (item.results || item.toolResults || item.outputs) score += 5;
            if (item.environment) score += 2;
            if (item.path) score += 2;
            if (item.pattern || item.workloadType) score += 1;
            return score;
          }

          found.forEach(function (item) {
            var existingIndex = unique.findIndex(function (candidate) {
              return sameWorkload(candidate, item);
            });

            if (existingIndex === -1) {
              unique.push(item);
              return;
            }

            if (scoreWorkload(item) >= scoreWorkload(unique[existingIndex])) {
              unique[existingIndex] = Object.assign({}, unique[existingIndex], item);
            } else {
              unique[existingIndex] = Object.assign({}, item, unique[existingIndex]);
            }
          });

          // compute-summary-filter-default-workload-report-section-0628
          function isDefaultDraftWorkload(item) {
            if (!item || typeof item !== "object") return false;

            var name = String(item.name || item.workloadName || item.title || item.label || "").trim().toLowerCase();
            var path = String(item.path || "").trim().toLowerCase();
            var environment = String(item.environment || "").trim().toLowerCase();

            return (
              name === "compute workload" ||
              name === "default compute workload" ||
              (
                !name &&
                (path === "" || path === "general") &&
                (environment === "" || environment === "general")
              )
            );
          }

          var realSavedWorkloads = unique.filter(function (item) {
            return !isDefaultDraftWorkload(item);
          });

          if (realSavedWorkloads.length) {
            unique = realSavedWorkloads;
          }

          if (!unique.length && workload && !isDefaultDraftWorkload(workload)) {
            unique = [workload];
          }

          return unique;
        }

        function resultsForWorkload(savedWorkload) {
          var stateApi = window.ScopedLabsComputePlanState || {};
          var workloadId = savedWorkload && (savedWorkload.id || savedWorkload.workloadId);
          var workloadName = savedWorkload && (savedWorkload.name || savedWorkload.workloadName);
          var scopedResults = null;

          [
            "getResultsForWorkload",
            "getToolResultsForWorkload",
            "readResultsForWorkload",
            "readToolResultsForWorkload"
          ].forEach(function (method) {
            if (scopedResults) return;

            try {
              if (typeof stateApi[method] === "function") {
                scopedResults = stateApi[method](workloadId);
              }
            } catch (error) {}
          });

          if (!scopedResults && savedWorkload && savedWorkload.results && typeof savedWorkload.results === "object") {
            scopedResults = savedWorkload.results;
          }

          if (!scopedResults && savedWorkload && savedWorkload.toolResults && typeof savedWorkload.toolResults === "object") {
            scopedResults = savedWorkload.toolResults;
          }

          if (!scopedResults && savedWorkload && savedWorkload.outputs && typeof savedWorkload.outputs === "object") {
            scopedResults = savedWorkload.outputs;
          }

          if (scopedResults && typeof scopedResults === "object") {
            return scopedResults;
          }

          if (
            workloadId &&
            workload &&
            String(workload.id || workload.workloadId || "") === String(workloadId)
          ) {
            return results || {};
          }

          if (
            workloadName &&
            workload &&
            String(workload.name || workload.workloadName || "") === String(workloadName)
          ) {
            return results || {};
          }

          return {};
        }

        function selectedToolsForWorkload(savedWorkload, savedResults) {
          var branches = savedWorkload && savedWorkload.branches && typeof savedWorkload.branches === "object"
            ? savedWorkload.branches
            : {};

          var toolList = BASE_TOOLS.slice();

          BRANCH_TOOLS.forEach(function (branch) {
            if (!branch || !branch.key || !branches[branch.key]) return;

            (branch.tools || []).forEach(function (tool) {
              if (!TOOL_LABELS[tool]) return;
              if (toolList.indexOf(tool) === -1) toolList.push(tool);
            });
          });

          Object.keys(savedResults || {}).forEach(function (tool) {
            if (!TOOL_LABELS[tool]) return;
            if (toolList.indexOf(tool) === -1) toolList.push(tool);
          });

          return toolList.filter(function (tool, index) {
            return !!tool && TOOL_LABELS[tool] && toolList.indexOf(tool) === index;
          });
        }

        function workloadKicker(savedWorkload) {
          var parts = [];

          if (savedWorkload && savedWorkload.environment) parts.push(savedWorkload.environment);
          if (savedWorkload && savedWorkload.path) parts.push("path " + savedWorkload.path);
          if (savedWorkload && savedWorkload.workloadType) parts.push(savedWorkload.workloadType);
          if (savedWorkload && savedWorkload.pattern) parts.push(savedWorkload.pattern);

          return parts.length ? parts.join(" | ") : "Saved Compute workload";
        }

        
        // compute-summary-report-sections-skip-watch-risk-0703
        function shouldShowInWorkloadReportSection(tool, savedResults) {
          if (!hasOwn(savedResults, tool)) return true;

          var state = statusOf(savedResults[tool]);
          return state !== "RISK" && state !== "WATCH" && state !== "FAIL";
        }

function reportRowsForWorkload(savedWorkload, tools, savedResults) {
          return tools.filter(function (tool) {
            return shouldShowInWorkloadReportSection(tool, savedResults);
          }).map(function (tool) {
            var hasResult = hasOwn(savedResults, tool);
            var record = hasResult ? savedResults[tool] : null;
            var state = hasResult ? statusOf(record) : "PENDING";
            var toolLabel = TOOL_LABELS[tool] || titleCase(tool);
            var scopeLabel = savedWorkload && savedWorkload.name ? "Workload: " + savedWorkload.name : "Compute workload";
            var detail = hasResult
              ? noteFor(tool, record)
              : "No saved result for this selected Compute section yet.";
            var evidence = hasResult ? evidenceFor(record) : "Open tool and save a result for Summary.";

            return [
              "<tr>",
              "<td>" + escapeHtml(scopeLabel) + "</td>",
              '<td><a href="' + escapeHtml(TOOL_HREFS[tool] || "../workload-planner/") + '">' + escapeHtml(toolLabel) + "</a></td>",
              "<td>" + statusChipHtml(state) + "</td>",
              '<td><span class="compute-summary-detail-primary">' + escapeHtml(detail) + '</span><span class="compute-summary-detail-secondary">' + escapeHtml(evidence) + "</span></td>",
              "</tr>"
            ].join("");
          }).join("");
        }

        function reportTableForWorkload(savedWorkload, tools, savedResults, emptyText) {
          var title = savedWorkload && savedWorkload.name ? savedWorkload.name : "Compute workload";
          // compute-summary-report-sections-hide-empty-watch-risk-only-0703
          var rows = tools.length ? reportRowsForWorkload(savedWorkload, tools, savedResults) : "";
          if (tools.length && !rows) {
            return "";
          }
          var emptyMessage = emptyText;

          return [
            '<h5 class="compute-summary-report-workload-title">',
            escapeHtml(title),
            '<span class="compute-summary-report-workload-kicker">',
            escapeHtml(workloadKicker(savedWorkload)),
            "</span></h5>",
            rows
              ? '<table class="result-table compute-summary-table compute-summary-watch-risk-table"><thead><tr><th>Scope / Workload</th><th>Tool</th><th>Status</th><th>Detail / Next Step</th></tr></thead><tbody>' + rows + '</tbody></table>'
              : '<table class="result-table compute-summary-table compute-summary-watch-risk-table"><tbody><tr><td colspan="4">' + escapeHtml(emptyMessage) + '</td></tr></tbody></table>'
          ].join("");
        }

        function reportSectionForAllWorkloads(kind) {
          var savedWorkloads = getSavedWorkloadsForReport();

          if (!savedWorkloads.length) {
            return '<table class="result-table compute-summary-table compute-summary-watch-risk-table"><tbody><tr><td colspan="4">No saved Compute workloads found yet.</td></tr></tbody></table>';
          }

          var rendered = savedWorkloads.map(function (savedWorkload) {
            var savedResults = resultsForWorkload(savedWorkload);
            var toolList = selectedToolsForWorkload(savedWorkload, savedResults);
            var tools = kind === "core"
              ? toolList.filter(function (tool) { return BASE_TOOLS.indexOf(tool) !== -1; })
              : toolList.filter(function (tool) { return BASE_TOOLS.indexOf(tool) === -1; });

            if (kind === "branch" && !tools.length) {
              return "";
            }

            return reportTableForWorkload(
              savedWorkload,
              tools,
              savedResults,
              kind === "core"
                ? "No core Compute pipeline sections available yet."
                : "No optional Compute branches selected or saved for this workload."
            );
          }).filter(Boolean).join("");

          return rendered || '<table class="result-table compute-summary-table compute-summary-watch-risk-table"><tbody><tr><td colspan="4">No optional Compute branches selected or saved yet.</td></tr></tbody></table>';
        }

        setHtml("computeSummaryReportCoreSections", reportSectionForAllWorkloads("core"));
        setHtml("computeSummaryReportBranchSections", reportSectionForAllWorkloads("branch"));

        var assistantItems = [
          "Summary is reading the shared Compute workload-plan contract.",
          "Active workload context is available.",
          completed.length ? "Saved tool evidence is available for rollup." : "No saved tool evidence is available yet.",
          missing.length ? "Selected branch gaps remain before final report closeout." : "Selected branch evidence is complete for the current workload path."
        ];
        setHtml("computeSummaryAssistantList", assistantItems.map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        }).join(""));

        var ledger = byId("computeSummaryLedger");
        if (ledger) {
          ledger.textContent = JSON.stringify({
            contract: "scopedlabs.compute.summary.rollup.v1",
            sourceContract: State.contract || "scopedlabs.compute.workload-plan.v1",
            activeWorkloadId: workloadId,
            status: status,
            selectedTools: selected,
            completedTools: completed,
            missingTools: missing,
            counts: counts,
            updatedAt: new Date().toISOString()
          }, null, 2);
        }
      }

      window.ScopedLabsComputeSummaryRollup = {
        version: "scopedlabs-compute-summary-rollup-002-physical-security-target",
        render: renderSummary
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderSummary, { once: true });
      } else {
        renderSummary();
      }

      if (State && typeof State.onPlanChange === "function") {
        State.onPlanChange(renderSummary);
      }
    })();


/* COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703 :: extracted block 2
   Original attrs: data-compute-summary-tool-notes-persistence="compute-summary-tool-notes-persistence-0629"
*/
(function () {
      var STORAGE_KEY = "scopedlabs.compute.summary.toolNotes.v1";

      function escapeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function readNotes() {
        try {
          var raw = window.localStorage.getItem(STORAGE_KEY);
          if (!raw) return "";
          if (raw.charAt(0) === "{") {
            var parsed = JSON.parse(raw);
            return String(parsed.notes || "");
          }
          return String(raw || "");
        } catch (error) {
          return "";
        }
      }

      function writeNotes(value) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            category: "compute",
            source: "compute-summary",
            notes: String(value || ""),
            updatedAt: new Date().toISOString()
          }));
        } catch (error) {}
      }

      function renderNotes(value) {
        var status = document.getElementById("computeSummaryToolNotesStatus");
        // compute-summary-remove-duplicate-tool-notes-preview-0629
        var text = String(value || "").trim();

        if (status) {
          status.textContent = text ? "Saved locally for this Compute Summary." : "No summary tool notes saved yet.";
        }
      }

      function initToolNotesPersistence() {
        var textarea = document.getElementById("computeSummaryToolNotes");
        if (!textarea) return;

        var saved = readNotes();
        textarea.value = saved;
        renderNotes(saved);

        textarea.addEventListener("input", function () {
          writeNotes(textarea.value);
          renderNotes(textarea.value);
        });

        textarea.addEventListener("blur", function () {
          writeNotes(textarea.value);
          renderNotes(textarea.value);
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initToolNotesPersistence);
      } else {
        initToolNotesPersistence();
      }
    })();


/* COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703 :: extracted block 3
   Original attrs: data-compute-summary-user-tool-notes-rollup-script="compute-summary-user-tool-notes-rollup-script-0629"
*/
(function () {
      var TOOL_LABELS = {
        "cpu-sizing": "CPU Sizing",
        "ram-sizing": "RAM Sizing",
        "gpu-vram": "GPU VRAM",
        "storage-iops": "Storage IOPS",
        "storage-throughput": "Storage Throughput",
        "vm-density": "VM Density",
        "power-thermal": "Power & Thermal",
        "backup-window": "Backup Window",
        "nic-bonding": "NIC Bonding",
        "raid-rebuild-time": "RAID Rebuild Time"
      };

      function escapeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function escapeAttr(value) {
        return escapeHtml(value);
      }

      function toolFromKey(key) {
        var lowered = String(key || "").toLowerCase();
        var slugs = Object.keys(TOOL_LABELS);

        for (var i = 0; i < slugs.length; i += 1) {
          if (lowered.indexOf(slugs[i]) !== -1) {
            return {
              slug: slugs[i],
              label: TOOL_LABELS[slugs[i]],
              href: "/tools/compute/" + slugs[i] + "/"
            };
          }
        }

        return null;
      }

      function extractNote(raw) {
        var value = String(raw || "").trim();
        if (!value) return "";

        if (value.charAt(0) === "{" || value.charAt(0) === "[") {
          try {
            var parsed = JSON.parse(value);

            if (Array.isArray(parsed)) return "";

            if (parsed && typeof parsed === "object") {
              var candidate = parsed.notes || parsed.note || parsed.value || parsed.text || "";
              return typeof candidate === "string" ? candidate.trim() : "";
            }

            return "";
          } catch (error) {
            return "";
          }
        }

        if (/^SL-[A-Z-]+-\d{8,}/.test(value)) return "";
        if (/generatedAt|categorySlug|toolSlug|standalone|reportTitle|savedAt/.test(value)) return "";

        return value;
      }

      function readActiveWorkloadName() {
        try {
          var api = window.ScopedLabsComputePlanState || {};
          var roots = [];

          [
            "getActiveWorkload",
            "readActiveWorkload",
            "getCurrentWorkload",
            "getState",
            "readState",
            "getPlanState",
            "readPlanState",
            "getPlan",
            "readPlan"
          ].forEach(function (method) {
            try {
              if (typeof api[method] === "function") roots.push(api[method]());
            } catch (error) {}
          });

          roots.push(api.state, api.plan, api.activeWorkload);

          for (var i = 0; i < roots.length; i += 1) {
            var item = roots[i];
            if (!item || typeof item !== "object") continue;

            if (item.name || item.workloadName || item.title || item.label) {
              return String(item.name || item.workloadName || item.title || item.label);
            }

            if (item.activeWorkload && typeof item.activeWorkload === "object") {
              var active = item.activeWorkload;
              if (active.name || active.workloadName || active.title || active.label) {
                return String(active.name || active.workloadName || active.title || active.label);
              }
            }
          }
        } catch (error) {}

        return "Current Compute workload";
      }

      function readUserToolNotes() {
        var rows = [];
        var seen = {};
        var activeWorkload = readActiveWorkloadName();

        try {
          for (var i = 0; i < window.localStorage.length; i += 1) {
            var key = window.localStorage.key(i) || "";
            var lowered = key.toLowerCase();

            if (lowered === "scopedlabs.compute.summary.toolnotes.v1") continue;

            var tool = toolFromKey(key);
            if (!tool) continue;

            if (!/(note|notes|user-tool|user_tool|usertool)/i.test(key)) continue;

            var note = extractNote(window.localStorage.getItem(key));
            if (!note) continue;

            var dedupeKey = tool.slug + "::" + note;
            if (seen[dedupeKey]) continue;
            seen[dedupeKey] = true;

            rows.push({
              workload: activeWorkload,
              tool: tool.label,
              note: note,
              key: key,
              href: tool.href
            });
          }
        } catch (error) {}

        return rows;
      }

      function renderUserToolNotesRollup() {
        var mount = document.getElementById("computeSummaryUserToolNotesRollup");
        var copy = document.getElementById("computeSummaryToolNotesCopy");
        if (!mount) return;

        var rows = readUserToolNotes();

        if (!rows.length) {
          mount.innerHTML = "<div class='compute-summary-tool-notes-empty'>No saved per-tool Compute notes were found in this browser yet.</div>";
          if (copy) {
            copy.textContent = "No tool-specific notes have been saved yet. Notes entered on individual Compute tools should stay separated by workload and source tool, then appear here when available.";
          }
          return;
        }

        if (copy) {
          copy.textContent = rows.length + " saved per-tool Compute note" + (rows.length === 1 ? "" : "s") + " found for this browser.";
        }

        mount.innerHTML =
          "<div class='result-table-wrap'>" +
            "<table class='result-table compute-summary-table compute-summary-user-tool-notes-table'>" +
              "<thead><tr><th>Workload</th><th>Tool</th><th>Tool-Specific Notes</th><th data-export-ignore='true' data-no-export='true'>Actions</th></tr></thead>" +
              "<tbody>" +
                rows.map(function (row) {
                  return "<tr>" +
                    "<td>" + escapeHtml(row.workload) + "</td>" +
                    "<td>" + escapeHtml(row.tool) + "</td>" +
                    "<td>" + escapeHtml(row.note) + "</td>" +
                    "<td class='compute-summary-user-tool-notes-actions' data-export-ignore='true' data-no-export='true'>" +
                      "<a class='btn' href='" + escapeAttr(row.href) + "'>Open Tool</a>" +
                      "<button class='btn' type='button' data-compute-summary-delete-user-tool-note data-note-key='" + escapeAttr(row.key) + "' data-tool-label='" + escapeAttr(row.tool) + "'>Delete Note</button>" +
                    "</td>" +
                  "</tr>";
                }).join("") +
              "</tbody>" +
            "</table>" +
          "</div>";
      }

      function bindUserToolNoteActions() {
        if (document.documentElement.dataset.computeSummaryUserToolNotesActionsBound === "true") return;
        document.documentElement.dataset.computeSummaryUserToolNotesActionsBound = "true";

        document.addEventListener("click", function (event) {
          var target = event.target && event.target.closest
            ? event.target.closest("[data-compute-summary-delete-user-tool-note]")
            : null;

          if (!target) return;

          event.preventDefault();

          var key = target.getAttribute("data-note-key") || "";
          var tool = target.getAttribute("data-tool-label") || "this tool";

          if (!key) return;

          var confirmed = window.confirm("Delete this " + tool + " note from this browser and the Compute Summary?");
          if (!confirmed) return;

          try {
            window.localStorage.removeItem(key);
            if (window.ScopedLabsUserToolNotes && Object.prototype.hasOwnProperty.call(window.ScopedLabsUserToolNotes, key)) {
              delete window.ScopedLabsUserToolNotes[key];
            }
          } catch (error) {}

          renderUserToolNotesRollup();
        });
      }

      function initUserToolNotesRollup() {
        bindUserToolNoteActions();
        renderUserToolNotesRollup();
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initUserToolNotesRollup);
      } else {
        initUserToolNotesRollup();
      }

      window.addEventListener("storage", renderUserToolNotesRollup);
      setTimeout(renderUserToolNotesRollup, 250);
      setTimeout(renderUserToolNotesRollup, 900);
    })();


/* COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703 :: extracted block 4
   Original attrs: data-compute-summary-tool-notes-export-sync="compute-summary-tool-notes-export-sync-0629"
*/
(function () {
      function escapeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function syncComputeToolNotesExportMirror() {
        var mirror = document.getElementById("computeSummaryToolNotesExportMirror");
        if (!mirror) return;

        var rows = [];
        document.querySelectorAll("#computeSummaryUserToolNotesRollup .compute-summary-user-tool-notes-table tbody tr").forEach(function (row) {
          var cells = row.querySelectorAll("td");
          if (cells.length < 3) return;

          rows.push({
            workload: cells[0].textContent.trim(),
            tool: cells[1].textContent.trim(),
            note: cells[2].textContent.trim()
          });
        });

        // compute-summary-tool-notes-export-read-saved-summary-notes-0629
        function readSavedSummaryNotes() {
          var textarea = document.getElementById("computeSummaryToolNotes");
          var value = textarea ? String(textarea.value || "").trim() : "";

          if (value) return value;

          try {
            var raw = window.localStorage.getItem("scopedlabs.compute.summary.toolNotes.v1");
            if (!raw) return "";

            if (raw.charAt(0) === "{") {
              var parsed = JSON.parse(raw);
              return String(parsed.notes || "").trim();
            }

            return String(raw || "").trim();
          } catch (error) {
            return "";
          }
        }

        var summaryNotes = readSavedSummaryNotes();

        var parts = [];

        if (rows.length) {
          parts.push(
            "<h3>Workload Tool Notes</h3>" +
            "<div class='result-table-wrap'>" +
              "<table class='result-table compute-summary-table compute-summary-user-tool-notes-table'>" +
                "<thead><tr><th>Workload</th><th>Tool</th><th>Tool-Specific Notes</th></tr></thead>" +
                "<tbody>" +
                  rows.map(function (row) {
                    return "<tr>" +
                      "<td>" + escapeHtml(row.workload) + "</td>" +
                      "<td>" + escapeHtml(row.tool) + "</td>" +
                      "<td>" + escapeHtml(row.note) + "</td>" +
                    "</tr>";
                  }).join("") +
                "</tbody>" +
              "</table>" +
            "</div>"
          );
        }

        // compute-summary-summary-notes-export-table-0629
        if (summaryNotes) {
          parts.push(
            "<h3>Summary Tool Notes</h3>" +
            "<div class='result-table-wrap'>" +
              "<table class='result-table compute-summary-table compute-summary-summary-tool-notes-table'>" +
                "<thead><tr><th>Summary Area</th><th>Summary Notes</th></tr></thead>" +
                "<tbody><tr>" +
                  "<td>Compute Summary</td>" +
                  "<td>" + escapeHtml(summaryNotes).replace(/\\n/g, "<br>") + "</td>" +
                "</tr></tbody>" +
              "</table>" +
            "</div>"
          );
        }

        mirror.innerHTML = parts.length
          ? parts.join("")
          : "<p>No Compute tool notes have been prepared for export yet.</p>";
      }

      function initComputeToolNotesExportSync() {
        syncComputeToolNotesExportMirror();

        var summaryTextarea = document.getElementById("computeSummaryToolNotes");
        if (summaryTextarea) {
          summaryTextarea.addEventListener("input", syncComputeToolNotesExportMirror);
          summaryTextarea.addEventListener("blur", syncComputeToolNotesExportMirror);
        }

        document.addEventListener("click", function (event) {
          if (
            event.target &&
            event.target.closest &&
            (
              event.target.closest("#exportReport") ||
              event.target.closest("#saveSnapshot")
            )
          ) {
            syncComputeToolNotesExportMirror();
          }
        }, true);

        document.addEventListener("click", function (event) {
          if (
            event.target &&
            event.target.closest &&
            event.target.closest("[data-compute-summary-delete-user-tool-note]")
          ) {
            setTimeout(syncComputeToolNotesExportMirror, 0);
          }
        });

        window.addEventListener("storage", syncComputeToolNotesExportMirror);
        setTimeout(syncComputeToolNotesExportMirror, 250);
        setTimeout(syncComputeToolNotesExportMirror, 900);
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initComputeToolNotesExportSync);
      } else {
        initComputeToolNotesExportSync();
      }
    })();


/* COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703 :: extracted block 5
   Original attrs: data-compute-summary-export-table-widths="compute-summary-export-table-widths-0629"
*/
(function () {
      function headerText(table) {
        return Array.from(table.querySelectorAll("thead th"))
          .map(function (th) { return (th.textContent || "").trim().toLowerCase(); });
      }

      function setColgroup(table, widths) {
        if (!table || !widths || !widths.length) return;

        var existing = table.querySelector("colgroup[data-compute-summary-export-widths]");
        if (existing) existing.remove();

        var colgroup = document.createElement("colgroup");
        colgroup.setAttribute("data-compute-summary-export-widths", "0629");

        widths.forEach(function (width) {
          var col = document.createElement("col");
          col.setAttribute("style", "width:" + width + ";");
          colgroup.appendChild(col);
        });

        table.insertBefore(colgroup, table.firstChild);
        table.style.tableLayout = "fixed";
        table.style.width = "100%";

        Array.from(table.querySelectorAll("th,td")).forEach(function (cell) {
          cell.style.whiteSpace = "normal";
          cell.style.overflowWrap = "break-word";
          cell.style.wordBreak = "normal";
          cell.style.verticalAlign = "top";
        });
      }

      function widthsFor(headers) {
        var joined = headers.join(" | ");

        if (joined.includes("tool-specific notes")) {
          return ["24%", "16%", "60%"];
        }

        if (joined.includes("summary notes")) {
          return ["28%", "72%"];
        }

        if (joined.includes("required action") && joined.includes("detail / next step")) {
          return ["18%", "12%", "9%", "21%", "40%"];
        }

        if (joined.includes("detail / next step") && joined.includes("status")) {
          return ["24%", "14%", "10%", "52%"];
        }

        if (joined.includes("workload detail")) {
          return ["30%", "13%", "57%"];
        }

        if (joined.includes("next action")) {
          return ["30%", "13%", "57%"];
        }

        if (headers.length === 2) {
          return ["30%", "70%"];
        }

        return null;
      }

      function applyComputeSummaryExportTableWidths() {
        document
          .querySelectorAll("[data-export-section] table")
          .forEach(function (table) {
            var headers = headerText(table);
            var widths = widthsFor(headers);

            if (widths) {
              setColgroup(table, widths);
            }
          });
      }

      function bindComputeSummaryExportTableWidths() {
        applyComputeSummaryExportTableWidths();

        document.addEventListener("click", function (event) {
          if (
            event.target &&
            event.target.closest &&
            (
              event.target.closest("#exportReport") ||
              event.target.closest("#saveSnapshot")
            )
          ) {
            applyComputeSummaryExportTableWidths();
          }
        }, true);

        setTimeout(applyComputeSummaryExportTableWidths, 250);
        setTimeout(applyComputeSummaryExportTableWidths, 900);
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindComputeSummaryExportTableWidths);
      } else {
        bindComputeSummaryExportTableWidths();
      }
    })();



/* compute-summary-clear-summary-tool-notes-0703 */
(function () {
  var STORAGE_KEY = "scopedlabs.compute.summary.toolNotes.v1";

  function bindClearSummaryToolNotes() {
    var button = document.getElementById("clearComputeSummaryToolNotes");
    var textarea = document.getElementById("computeSummaryToolNotes");
    var status = document.getElementById("computeSummaryToolNotesStatus");

    if (!button || !textarea || button.dataset.computeSummaryClearBound === "true") {
      return;
    }

    button.dataset.computeSummaryClearBound = "true";

    button.addEventListener("click", function () {
      var hasValue = String(textarea.value || "").trim();

      if (hasValue && !window.confirm("Clear Summary Tool Notes for this browser?")) {
        return;
      }

      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {}

      textarea.value = "";

      window.ScopedLabsUserToolNotes = window.ScopedLabsUserToolNotes || {};
      window.ScopedLabsUserToolNotes[STORAGE_KEY] = "";

      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));

      if (status) {
        status.textContent = "Summary Tool Notes cleared for this browser.";
      }

      setTimeout(function () {
        document.dispatchEvent(new CustomEvent("scopedlabs:compute-summary-tool-notes-cleared", {
          detail: { key: STORAGE_KEY }
        }));
      }, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindClearSummaryToolNotes);
  } else {
    bindClearSummaryToolNotes();
  }
})();
