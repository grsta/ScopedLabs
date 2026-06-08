(() => {
  "use strict";

  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const STEP = "lock-power-budget";
  const TOOL_LABEL = "Lock Power Budget";
  const LANE = "v1";
  const PREVIOUS_STEP = "reader-type-selector";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:lock-power-budget";

  const FLOW_KEYS = {
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

  let chart = null;
  let currentReport = null;
  let lastMetrics = null;

  const els = {
    lockType: $("lockType"),
    voltage: $("voltage"),
    amps: $("amps"),
    locks: $("locks"),
    simul: $("simul"),
    headroom: $("headroom"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    chart: $("chart"),
    chartWrap: $("chartWrap"),
    visualCard: $("lockPowerVisualCard"),
    nextWrap: $("continue-wrap") || $("next-step-row"),
    nextBtn: $("continue"),
    flowNote: $("flow-note"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    reportTitle: $("reportTitle"),
    projectName: $("projectName"),
    clientName: $("clientName"),
    preparedBy: $("preparedBy"),
    customNotes: $("customNotes"),
    exportReport: $("exportReport"),
    saveSnapshot: $("saveSnapshot"),
    exportStatus: $("exportStatus"),
    activeScopeCard: $("activeAccessScopeCard"),
    activeScopeTitle: $("activeAccessScopeTitle"),
    activeScopeDescription: $("activeAccessScopeDescription"),
    activeScopeMeta: $("activeAccessScopeMeta"),
    localAssistantMount: $("accessControlLocalAssistantMount")
  };

  function normalizeSlug(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(isoString) {
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return String(isoString || "");
    }
  }

  function makeReportId(prefix = "SL-REPORT") {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    return `${prefix}-${stamp}`;
  }

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${escapeHtml(label)}</span>
        <span class="result-value">${escapeHtml(value)}</span>
      </div>
    `;
  }

  function render(rows) {
    if (!els.results) return;
    els.results.innerHTML = rows.join("");
  }

  function hasStoredAuth() {
    try {
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (!key.startsWith("sb-")) continue;

        const rawText = localStorage.getItem(key);
        if (!rawText) continue;

        const raw = JSON.parse(rawText);

        if (
          raw?.access_token ||
          raw?.currentSession?.access_token ||
          raw?.session?.access_token ||
          raw?.user?.aud === "authenticated" ||
          (Array.isArray(raw) && raw.some((item) => item?.access_token))
        ) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  function valueContainsCategory(value, category) {
    const target = normalizeSlug(category);

    if (value == null) return false;

    if (typeof value === "string") {
      return normalizeSlug(value).includes(target);
    }

    if (Array.isArray(value)) {
      return value.some((item) => valueContainsCategory(item, target));
    }

    if (typeof value === "object") {
      return Object.entries(value).some(([key, val]) => {
        const k = normalizeSlug(key);

        if (k === target && (val === true || val === "true" || val === 1 || val === "1")) {
          return true;
        }

        if (
          ["category", "category_slug", "categorySlug", "slug", "id", "name"].includes(key) &&
          normalizeSlug(val) === target
        ) {
          return true;
        }

        return valueContainsCategory(val, target);
      });
    }

    return false;
  }

  function getUnlockedCategories() {
    const found = new Set();

    try {
      const direct = localStorage.getItem("sl_unlocked_categories");

      if (direct) {
        try {
          const parsed = JSON.parse(direct);

          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (typeof item === "string") found.add(normalizeSlug(item));
              else if (item?.category) found.add(normalizeSlug(item.category));
              else if (item?.category_slug) found.add(normalizeSlug(item.category_slug));
              else if (item?.slug) found.add(normalizeSlug(item.slug));
            });
          } else if (typeof parsed === "object" && parsed) {
            Object.entries(parsed).forEach(([key, value]) => {
              if (value === true || value === "true" || value === 1 || value === "1") {
                found.add(normalizeSlug(key));
              }

              if (typeof value === "string") {
                found.add(normalizeSlug(value));
              }
            });
          }
        } catch {
          direct
            .split(",")
            .map((x) => normalizeSlug(x))
            .filter(Boolean)
            .forEach((x) => found.add(x));
        }
      }

      Object.keys(localStorage).forEach((key) => {
        const lowerKey = normalizeSlug(key);

        if (
          !lowerKey.includes("unlock") &&
          !lowerKey.includes("entitlement") &&
          !lowerKey.includes("category")
        ) {
          return;
        }

        const raw = localStorage.getItem(key);
        if (!raw) return;

        if (normalizeSlug(raw).includes(CATEGORY)) {
          found.add(CATEGORY);
        }

        try {
          const parsed = JSON.parse(raw);
          if (valueContainsCategory(parsed, CATEGORY)) {
            found.add(CATEGORY);
          }
        } catch {}
      });
    } catch {}

    return Array.from(found).filter(Boolean);
  }

  function hasExportAccess() {
    if (document.body?.dataset?.tier === "pro") return true;
    return hasStoredAuth() && getUnlockedCategories().includes(CATEGORY);
  }

  function unlockCategoryPage() {
    const category = normalizeSlug(document.body?.dataset?.category || CATEGORY);
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }


  // access-control-lock-power-scope-hydration-021
  function accessScopeState() {
    return window.ScopedLabsAccessControlScopeState || null;
  }

  function getActiveAccessScope() {
    const api = accessScopeState();
    if (!api || typeof api.getActiveScope !== "function") return null;
    return api.getActiveScope();
  }

  function renderActiveScopeContext() {
    const api = accessScopeState();

    if (api && typeof api.renderScopeDisplay === "function") {
      return api.renderScopeDisplay({
        card: els.activeScopeCard,
        title: els.activeScopeTitle,
        description: els.activeScopeDescription,
        meta: els.activeScopeMeta,
        toolLabel: "Lock Power Budget"
      });
    }

    return null;
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl || value === undefined || value === null) return false;

    const normalized = String(value).trim();
    if (!normalized) return false;

    const option = Array.from(selectEl.options || []).find((item) => item.value === normalized);
    if (!option) return false;

    selectEl.value = normalized;
    return true;
  }

  function getPositiveInteger(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.max(1, Math.round(n));
  }

  function mapScopeLockType(scope) {
    const lockIntent = String(scope?.lockIntent || "").toLowerCase();

    if (lockIntent === "electric-strike") return "strike";
    if (lockIntent === "maglock") return "mag";
    if (lockIntent === "electrified-lockset") return "mortise";

    return "";
  }

  function getScopeLockCount(scope) {
    return getPositiveInteger(
      scope?.openingCount ||
      scope?.doorCount ||
      scope?.openings ||
      scope?.doors ||
      0
    );
  }

  function applyActiveScopeToInputs() {
    const scope = getActiveAccessScope();
    if (!scope) return false;

    let applied = false;

    const lockType = mapScopeLockType(scope);
    if (lockType) {
      applied = setSelectValue(els.lockType, lockType) || applied;
    }

    const lockCount = getScopeLockCount(scope);
    if (lockCount && els.locks) {
      els.locks.value = String(lockCount);
      applied = true;
    }

    return applied;
  }

  function getActiveScopeExportContext() {
    const api = accessScopeState();
    if (!api || typeof api.buildScopeDisplayContext !== "function") return null;
    return api.buildScopeDisplayContext("Lock Power Budget");
  }

  function showChartWrap() {
    if (els.visualCard) els.visualCard.hidden = false;
    if (els.chartWrap) els.chartWrap.hidden = false;
  }

  function hideChartWrap() {
    if (els.chartWrap) els.chartWrap.hidden = true;
    if (els.visualCard) els.visualCard.hidden = true;
  }

  function destroyChart() {
    if (chart && typeof chart.destroy === "function") {
      chart.destroy();
    }

    chart = null;

    const shell = outputShell();
    if (shell && typeof shell.hideVisual === "function") {
      shell.hideVisual({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart
      });
      return;
    }

    if (els.chart) {
      els.chart.innerHTML = "";
    }

    hideChartWrap();
  }

  function showContinue() {
    if (els.nextWrap) els.nextWrap.style.display = "flex";
    if (els.nextBtn) els.nextBtn.disabled = false;
  }

  function hideContinue() {
    if (els.nextWrap) els.nextWrap.style.display = "none";
    if (els.nextBtn) els.nextBtn.disabled = true;
  }

  function setExportEnabled(enabled) {
    if (els.exportReport) els.exportReport.disabled = !enabled;
    if (els.saveSnapshot) els.saveSnapshot.disabled = !enabled;
    if (window.ScopedLabsExport) {
      if (enabled && typeof window.ScopedLabsExport.refresh === "function") {
        window.ScopedLabsExport.refresh();
      } else if (!enabled && typeof window.ScopedLabsExport.invalidate === "function") {
        window.ScopedLabsExport.invalidate("Inputs changed. Run the calculator again to refresh export.");
      }
    }
  }

  function setExportStatus(message = "") {
    if (els.exportStatus) els.exportStatus.textContent = message;
  }

  function updateExportControls(message) {
    const unlocked = hasExportAccess();
    const ready = !!currentReport;

    setExportEnabled(unlocked && ready);

    if (message !== undefined) {
      setExportStatus(message);
      return;
    }

    if (!unlocked) {
      setExportStatus("Export is available with Access Control category unlock.");
      return;
    }

    if (!ready) {
      setExportStatus("Run calculation to enable export.");
      return;
    }

    setExportStatus("Calculation ready. Open Export Report or Save Snapshot.");
  }

  function getReportMeta() {
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Lock Power Budget Assessment",
      projectName: (els.projectName?.value || "").trim(),
      clientName: (els.clientName?.value || "").trim(),
      preparedBy: (els.preparedBy?.value || "").trim(),
      customNotes: (els.customNotes?.value || "").trim()
    };
  }

  function readSnapshots(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeSnapshots(key, items) {
    localStorage.setItem(key, JSON.stringify(items));
  }

  function saveSnapshotToStorage(key, payload, limit = 25) {
    const existing = readSnapshots(key);

    existing.unshift({
      ...payload,
      savedAt: new Date().toISOString()
    });

    const trimmed = existing.slice(0, limit);
    writeSnapshots(key, trimmed);

    return trimmed.length;
  }


  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function formatAmp(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.00 A";
    return n.toFixed(2) + " A";
  }

  function formatWatt(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.0 W";
    return n.toFixed(1) + " W";
  }

  function buildSupplyRailSvg(metrics, options = {}) {
    const peak = Number(metrics?.peak || 0);
    const required = Number(metrics?.required || 0);
    const watts = Number(metrics?.watts || 0);
    const utilizationPct = Number(metrics?.utilizationPct || 0);
    const reserve = Math.max(0, required - peak);
    const reservePct = peak > 0 ? (reserve / peak) * 100 : 0;
    const status = getStatus(utilizationPct);

    const exportMode = options.exportMode === true;
    const width = 1100;
    const height = 330;
    const railX = 92;
    const railY = 150;
    const railW = 880;
    const railH = 22;
    const maxA = Math.max(required * 1.22, peak * 1.35, 1);
    const peakX = railX + clampNumber(peak / maxA, 0, 1) * railW;
    const requiredX = railX + clampNumber(required / maxA, 0, 1) * railW;
    const reserveW = Math.max(0, requiredX - peakX);

    const bg = exportMode ? "#ffffff" : "rgba(0,0,0,0)";
    const panel = exportMode ? "#f8fbf8" : "rgba(6,18,12,.72)";
    const text = exportMode ? "#101715" : "rgba(238,255,244,.94)";
    const muted = exportMode ? "#52615c" : "rgba(203,213,225,.72)";
    const line = exportMode ? "#bed2c5" : "rgba(125,255,158,.28)";
    const grid = exportMode ? "#dbe7df" : "rgba(125,255,158,.13)";
    const green = exportMode ? "#1f9d57" : "rgba(125,255,158,.88)";
    const greenSoft = exportMode ? "#dff5e8" : "rgba(125,255,158,.18)";
    const amber = exportMode ? "#b7791f" : "rgba(255,204,102,.92)";
    const amberSoft = exportMode ? "#fff3d6" : "rgba(255,204,102,.18)";
    const red = exportMode ? "#b42318" : "rgba(255,105,105,.9)";
    const redSoft = exportMode ? "#ffe2df" : "rgba(255,105,105,.16)";
    const statusColor = status === "RISK" ? red : status === "WATCH" ? amber : green;
    const statusSoft = status === "RISK" ? redSoft : status === "WATCH" ? amberSoft : greenSoft;

    const lockType = String(els.lockType?.options?.[els.lockType.selectedIndex]?.text || els.lockType?.value || "Lock hardware");
    const lockCount = String(els.locks?.value || "0");
    const simultaneous = String(els.simul?.value || "0");
    const ampsEach = String(els.amps?.value || "0");

    const esc = (value) => escapeHtml(value);

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Lock power supply capacity rail">',
      '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="18" fill="' + bg + '"/>',
      '<rect x="24" y="22" width="1052" height="286" rx="18" fill="' + panel + '" stroke="' + line + '"/>',

      '<text x="52" y="60" fill="' + text + '" font-size="18" font-weight="800" font-family="Inter,Arial,sans-serif">Lock Power Supply Rail</text>',
      '<text x="52" y="84" fill="' + muted + '" font-size="13" font-weight="600" font-family="Inter,Arial,sans-serif">Simultaneous lock event converted into peak load, reserve, and required supply capacity.</text>',

      '<rect x="820" y="45" width="188" height="42" rx="12" fill="' + statusSoft + '" stroke="' + statusColor + '"/>',
      '<text x="842" y="71" fill="' + statusColor + '" font-size="15" font-weight="900" font-family="Inter,Arial,sans-serif">' + esc(status) + ' · ' + utilizationPct.toFixed(0) + '% UTILIZATION</text>',

      '<line x1="' + railX + '" y1="112" x2="' + (railX + railW) + '" y2="112" stroke="' + grid + '" stroke-width="1"/>',
      '<line x1="' + railX + '" y1="194" x2="' + (railX + railW) + '" y2="194" stroke="' + grid + '" stroke-width="1"/>',

      '<rect x="' + railX + '" y="' + railY + '" width="' + railW + '" height="' + railH + '" rx="11" fill="' + (exportMode ? "#eef5f0" : "rgba(255,255,255,.05)") + '" stroke="' + line + '"/>',
      '<rect x="' + railX + '" y="' + railY + '" width="' + Math.max(3, peakX - railX).toFixed(1) + '" height="' + railH + '" rx="11" fill="' + greenSoft + '" stroke="' + green + '"/>',
      '<rect x="' + peakX.toFixed(1) + '" y="' + railY + '" width="' + Math.max(3, reserveW).toFixed(1) + '" height="' + railH + '" rx="0" fill="' + amberSoft + '" stroke="' + amber + '"/>',

      '<line x1="' + peakX.toFixed(1) + '" y1="116" x2="' + peakX.toFixed(1) + '" y2="206" stroke="' + green + '" stroke-width="2" stroke-dasharray="5 5"/>',
      '<circle cx="' + peakX.toFixed(1) + '" cy="' + (railY + railH / 2) + '" r="6" fill="' + green + '" stroke="' + (exportMode ? "#ffffff" : "rgba(255,255,255,.92)") + '" stroke-width="2"/>',
      '<text x="' + Math.max(railX, peakX - 70).toFixed(1) + '" y="106" fill="' + green + '" font-size="13" font-weight="800" font-family="Inter,Arial,sans-serif">PEAK LOAD</text>',
      '<text x="' + Math.max(railX, peakX - 66).toFixed(1) + '" y="126" fill="' + text + '" font-size="14" font-weight="800" font-family="Inter,Arial,sans-serif">' + formatAmp(peak) + '</text>',

      '<line x1="' + requiredX.toFixed(1) + '" y1="108" x2="' + requiredX.toFixed(1) + '" y2="218" stroke="' + statusColor + '" stroke-width="3"/>',
      '<circle cx="' + requiredX.toFixed(1) + '" cy="' + (railY + railH / 2) + '" r="7" fill="' + statusColor + '" stroke="' + (exportMode ? "#ffffff" : "rgba(255,255,255,.95)") + '" stroke-width="2"/>',
      '<text x="' + Math.min(railX + railW - 150, requiredX + 12).toFixed(1) + '" y="120" fill="' + statusColor + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">REQUIRED SUPPLY</text>',
      '<text x="' + Math.min(railX + railW - 150, requiredX + 12).toFixed(1) + '" y="140" fill="' + text + '" font-size="14" font-weight="800" font-family="Inter,Arial,sans-serif">' + formatAmp(required) + ' / ' + formatWatt(watts) + '</text>',

      '<path d="M ' + peakX.toFixed(1) + ' 224 L ' + requiredX.toFixed(1) + ' 224" stroke="' + amber + '" stroke-width="2"/>',
      '<path d="M ' + peakX.toFixed(1) + ' 218 L ' + peakX.toFixed(1) + ' 230" stroke="' + amber + '" stroke-width="2"/>',
      '<path d="M ' + requiredX.toFixed(1) + ' 218 L ' + requiredX.toFixed(1) + ' 230" stroke="' + amber + '" stroke-width="2"/>',
      '<text x="' + Math.max(railX, peakX + 12).toFixed(1) + '" y="248" fill="' + amber + '" font-size="13" font-weight="800" font-family="Inter,Arial,sans-serif">HEADROOM RESERVE: ' + formatAmp(reserve) + ' · ' + reservePct.toFixed(0) + '%</text>',

      '<rect x="52" y="260" width="210" height="34" rx="10" fill="' + (exportMode ? "#eef7f1" : "rgba(125,255,158,.08)") + '" stroke="' + line + '"/>',
      '<text x="68" y="282" fill="' + text + '" font-size="13" font-weight="800" font-family="Inter,Arial,sans-serif">' + esc(simultaneous) + ' simultaneous × ' + esc(ampsEach) + ' A</text>',

      '<rect x="278" y="260" width="170" height="34" rx="10" fill="' + (exportMode ? "#f7faf8" : "rgba(255,255,255,.045)") + '" stroke="' + line + '"/>',
      '<text x="294" y="282" fill="' + text + '" font-size="13" font-weight="800" font-family="Inter,Arial,sans-serif">' + esc(lockCount) + ' locks installed</text>',

      '<rect x="464" y="260" width="250" height="34" rx="10" fill="' + (exportMode ? "#f7faf8" : "rgba(255,255,255,.045)") + '" stroke="' + line + '"/>',
      '<text x="480" y="282" fill="' + text + '" font-size="13" font-weight="800" font-family="Inter,Arial,sans-serif">' + esc(lockType) + '</text>',

      '<rect x="730" y="260" width="278" height="34" rx="10" fill="' + statusSoft + '" stroke="' + statusColor + '"/>',
      '<text x="746" y="282" fill="' + statusColor + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">Supply margin: ' + esc(status) + '</text>',
      '</svg>'
    ].join("");
  }

  function getSupplyRailImage(metrics, options = {}) {
    if (!metrics) return "";
    const svg = buildSupplyRailSvg(metrics, { exportMode: options.exportMode === true });
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }


  // access-control-lock-power-cad-power-rail-025
  function lockPowerClamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function lockPowerFormatAmp(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.00 A";
    return n.toFixed(2) + " A";
  }

  function lockPowerFormatWatt(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.0 W";
    return n.toFixed(1) + " W";
  }

  function lockPowerEsc(value) {
    return escapeHtml(value === undefined || value === null ? "" : String(value));
  }

  function terminalPair(x, y, palette) {
    return [
      '<circle cx="' + x + '" cy="' + y + '" r="7" fill="' + palette.panel + '" stroke="' + palette.lineStrong + '" stroke-width="1.5"/>',
      '<circle cx="' + x + '" cy="' + (y + 34) + '" r="7" fill="' + palette.panel + '" stroke="' + palette.lineStrong + '" stroke-width="1.5"/>',
      '<text x="' + (x - 3) + '" y="' + (y + 5) + '" fill="' + palette.text + '" font-size="12" font-weight="900" font-family="Inter,Arial,sans-serif">+</text>',
      '<text x="' + (x - 3) + '" y="' + (y + 39) + '" fill="' + palette.muted + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">−</text>'
    ].join("");
  }

  function accessPowerSupplySymbol(x, y, label, palette) {
    return [
      '<g aria-label="Power supply symbol">',
      '<rect x="' + x + '" y="' + y + '" width="150" height="100" rx="10" fill="' + palette.block + '" stroke="' + palette.lineStrong + '" stroke-width="1.5"/>',
      '<path d="M ' + (x + 16) + ' ' + (y + 22) + ' H ' + (x + 134) + ' M ' + (x + 16) + ' ' + (y + 78) + ' H ' + (x + 134) + '" stroke="' + palette.grid + '" stroke-width="1"/>',
      '<text x="' + (x + 18) + '" y="' + (y + 36) + '" fill="' + palette.text + '" font-size="15" font-weight="900" font-family="Inter,Arial,sans-serif">' + lockPowerEsc(label) + '</text>',
      '<text x="' + (x + 18) + '" y="' + (y + 58) + '" fill="' + palette.muted + '" font-size="11" font-weight="700" font-family="Inter,Arial,sans-serif">ACCESS POWER</text>',
      '<text x="' + (x + 18) + '" y="' + (y + 76) + '" fill="' + palette.muted + '" font-size="11" font-weight="700" font-family="Inter,Arial,sans-serif">LISTED PSU / CTRL</text>',
      terminalPair(x + 132, y + 34, palette),
      '</g>'
    ].join("");
  }

  function dcPowerRail(x1, x2, y, palette) {
    return [
      '<g aria-label="DC power rail">',
      '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + palette.lineStrong + '" stroke-width="2"/>',
      '<line x1="' + x1 + '" y1="' + (y + 34) + '" x2="' + x2 + '" y2="' + (y + 34) + '" stroke="' + palette.lineSoft + '" stroke-width="1.5" stroke-dasharray="6 6"/>',
      '<path d="M ' + (x1 + 34) + ' ' + (y - 11) + ' H ' + (x2 - 32) + '" stroke="' + palette.green + '" stroke-width="1.5" stroke-dasharray="9 7"/>',
      '<path d="M ' + (x2 - 32) + ' ' + (y - 11) + ' l -9 -5 M ' + (x2 - 32) + ' ' + (y - 11) + ' l -9 5" stroke="' + palette.green + '" stroke-width="1.5" stroke-linecap="round"/>',
      '<text x="' + (x1 + 34) + '" y="' + (y - 20) + '" fill="' + palette.green + '" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">DC RAIL</text>',
      '</g>'
    ].join("");
  }

  function currentMarker(x, y, label, value, palette, tone) {
    const color = tone === "required" ? palette.statusColor : palette.green;
    const labelY = tone === "required" ? y - 70 : y - 58;
    const chipW = tone === "required" ? 156 : 120;
    const chipX = tone === "required" ? x + 12 : x - 60;

    return [
      '<g aria-label="' + lockPowerEsc(label) + ' marker">',
      '<line x1="' + x.toFixed(1) + '" y1="' + (y - 42) + '" x2="' + x.toFixed(1) + '" y2="' + (y + 52) + '" stroke="' + color + '" stroke-width="' + (tone === "required" ? "2.5" : "1.8") + '" stroke-dasharray="' + (tone === "required" ? "0" : "5 5") + '"/>',
      '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="' + (tone === "required" ? "7" : "5") + '" fill="' + color + '" stroke="' + palette.card + '" stroke-width="2"/>',
      '<line x1="' + x.toFixed(1) + '" y1="' + (y - 42) + '" x2="' + (tone === "required" ? x + 26 : x - 22).toFixed(1) + '" y2="' + labelY + '" stroke="' + color + '" stroke-width="1"/>',
      '<rect x="' + chipX.toFixed(1) + '" y="' + (labelY - 25) + '" width="' + chipW + '" height="40" rx="9" fill="' + palette.card + '" stroke="' + color + '" stroke-width="1"/>',
      '<text x="' + (chipX + 12).toFixed(1) + '" y="' + (labelY - 8) + '" fill="' + palette.muted + '" font-size="9" font-weight="800" font-family="Inter,Arial,sans-serif">' + lockPowerEsc(label).toUpperCase() + '</text>',
      '<text x="' + (chipX + 12).toFixed(1) + '" y="' + (labelY + 8) + '" fill="' + color + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">' + lockPowerEsc(value) + '</text>',
      '</g>'
    ].join("");
  }

  function headroomBracket(x1, x2, y, label, palette) {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const mid = left + ((right - left) / 2);
    const safeWidth = Math.max(28, right - left);

    return [
      '<g aria-label="Headroom bracket">',
      '<path d="M ' + left.toFixed(1) + ' ' + y + ' H ' + right.toFixed(1) + '" stroke="' + palette.amber + '" stroke-width="2"/>',
      '<path d="M ' + left.toFixed(1) + ' ' + (y - 7) + ' V ' + (y + 7) + ' M ' + right.toFixed(1) + ' ' + (y - 7) + ' V ' + (y + 7) + '" stroke="' + palette.amber + '" stroke-width="2"/>',
      '<rect x="' + (mid - 82).toFixed(1) + '" y="' + (y + 13) + '" width="164" height="28" rx="8" fill="' + palette.amberSoft + '" stroke="' + palette.amber + '" stroke-width="1"/>',
      '<text x="' + (mid - 70).toFixed(1) + '" y="' + (y + 32) + '" fill="' + palette.amberText + '" font-size="10" font-weight="900" font-family="Inter,Arial,sans-serif">' + lockPowerEsc(label) + '</text>',
      '</g>'
    ].join("");
  }

  function electricStrikeLoadSymbol(x, y, index, palette) {
    const offset = index * 13;

    return [
      '<g aria-label="Electric lock load symbol">',
      '<rect x="' + (x + offset) + '" y="' + (y + offset) + '" width="54" height="34" rx="5" fill="' + palette.block + '" stroke="' + palette.lineStrong + '" stroke-width="1"/>',
      '<path d="M ' + (x + 11 + offset) + ' ' + (y + 8 + offset) + ' h 18 v 18 h -18 z" fill="none" stroke="' + palette.green + '" stroke-width="1.4"/>',
      '<path d="M ' + (x + 34 + offset) + ' ' + (y + 9 + offset) + ' v 16 M ' + (x + 39 + offset) + ' ' + (y + 12 + offset) + ' v 10" stroke="' + palette.muted + '" stroke-width="1.2"/>',
      '</g>'
    ].join("");
  }

  function metricChip(x, y, label, value, palette, tone) {
    const color = tone === "status" ? palette.statusColor : tone === "amber" ? palette.amber : palette.green;
    const fill = tone === "status" ? palette.statusSoft : tone === "amber" ? palette.amberSoft : palette.card;

    return [
      '<rect x="' + x + '" y="' + y + '" width="178" height="42" rx="10" fill="' + fill + '" stroke="' + color + '" stroke-width="1"/>',
      '<text x="' + (x + 12) + '" y="' + (y + 17) + '" fill="' + palette.muted + '" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">' + lockPowerEsc(label).toUpperCase() + '</text>',
      '<text x="' + (x + 12) + '" y="' + (y + 33) + '" fill="' + color + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">' + lockPowerEsc(value) + '</text>'
    ].join("");
  }

  // access-control-lock-power-compact-label-policy-026: compact card shows one active scope/load bank; multi-zone rollups belong in Summary.
  function buildCadPowerRailSvg(metrics, options = {}) {
    const peak = Number(metrics?.peak || 0);
    const required = Number(metrics?.required || 0);
    const watts = Number(metrics?.watts || 0);
    const utilizationPct = Number(metrics?.utilizationPct || 0);

    const reserve = Math.max(0, required - peak);
    const reservePct = peak > 0 ? (reserve / peak) * 100 : 0;
    const status = getStatus(utilizationPct);

    const exportMode = options.exportMode === true;

    const width = 1120;
    const height = 392;

    const palette = {
      bg: exportMode ? "#ffffff" : "rgba(0,0,0,0)",
      card: exportMode ? "#ffffff" : "rgba(4,14,10,.78)",
      panel: exportMode ? "#f8fbf8" : "rgba(6,18,12,.72)",
      block: exportMode ? "#f5faf7" : "rgba(9,31,19,.86)",
      text: exportMode ? "#101715" : "rgba(238,255,244,.95)",
      muted: exportMode ? "#54615d" : "rgba(203,213,225,.72)",
      grid: exportMode ? "#dce8e1" : "rgba(125,255,158,.13)",
      lineSoft: exportMode ? "#b8cabe" : "rgba(125,255,158,.24)",
      lineStrong: exportMode ? "#668273" : "rgba(180,255,200,.52)",
      green: exportMode ? "#1f9d57" : "rgba(125,255,158,.88)",
      amber: exportMode ? "#b7791f" : "rgba(255,204,102,.92)",
      amberText: exportMode ? "#8a5a10" : "rgba(255,225,150,.96)",
      amberSoft: exportMode ? "#fff4d8" : "rgba(255,204,102,.13)",
      red: exportMode ? "#b42318" : "rgba(255,105,105,.9)",
      redSoft: exportMode ? "#ffe2df" : "rgba(255,105,105,.14)"
    };

    palette.statusColor = status === "RISK" ? palette.red : status === "WATCH" ? palette.amber : palette.green;
    palette.statusSoft = status === "RISK" ? palette.redSoft : status === "WATCH" ? palette.amberSoft : exportMode ? "#e7f8ee" : "rgba(125,255,158,.12)";

    const railX1 = 260;
    const railX2 = 820;
    const railY = 160;
    const railW = railX2 - railX1;

    const maxA = Math.max(required * 1.18, peak * 1.32, 1);
    const peakX = railX1 + lockPowerClamp(peak / maxA, 0, 1) * railW;
    const requiredX = railX1 + lockPowerClamp(required / maxA, 0, 1) * railW;

    const voltage = String(els.voltage?.value || "12");
    const supplyLabel = voltage ? voltage + "VDC PSU" : "Power Supply";
    const lockCount = String(els.locks?.value || "0");
    const simultaneous = String(els.simul?.value || "0");
    const ampsEach = String(els.amps?.value || "0");
    const lockType = String(els.lockType?.options?.[els.lockType.selectedIndex]?.text || els.lockType?.value || "Lock hardware");

    const repeatedLocks = Math.max(1, Math.min(3, Number(lockCount) || 1));

    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Low voltage access control lock power rail diagram">',
      '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="18" fill="' + palette.bg + '"/>',
      '<rect x="24" y="22" width="1072" height="348" rx="18" fill="' + palette.panel + '" stroke="' + palette.lineSoft + '"/>',

      '<path d="M 54 72 H 1066 M 54 116 H 1066 M 54 266 H 1066 M 54 312 H 1066" stroke="' + palette.grid + '" stroke-width="1"/>',
      '<path d="M 94 48 V 346 M 226 48 V 346 M 952 48 V 346" stroke="' + palette.grid + '" stroke-width="1"/>',

      '<text x="54" y="58" fill="' + palette.text + '" font-size="18" font-weight="900" font-family="Inter,Arial,sans-serif">Lock Power Rail</text>',
      '<text x="54" y="82" fill="' + palette.muted + '" font-size="12" font-weight="700" font-family="Inter,Arial,sans-serif">PSU / controller output → DC rail → active lock load → required reserve.</text>',

      '<rect x="884" y="48" width="166" height="38" rx="10" fill="' + palette.statusSoft + '" stroke="' + palette.statusColor + '"/>',
      '<text x="902" y="72" fill="' + palette.statusColor + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">' + lockPowerEsc(status) + ' · ' + utilizationPct.toFixed(0) + '%</text>',

      accessPowerSupplySymbol(66, 122, supplyLabel, palette),
      dcPowerRail(220, 884, railY, palette),

      '<line x1="216" y1="' + (railY + 17) + '" x2="220" y2="' + (railY + 17) + '" stroke="' + palette.lineStrong + '" stroke-width="1.2"/>',
      '<line x1="884" y1="' + railY + '" x2="918" y2="' + railY + '" stroke="' + palette.lineStrong + '" stroke-width="2"/>',
      '<line x1="884" y1="' + (railY + 34) + '" x2="918" y2="' + (railY + 34) + '" stroke="' + palette.lineSoft + '" stroke-width="1.4" stroke-dasharray="6 6"/>',

      currentMarker(peakX, railY, "Peak load", lockPowerFormatAmp(peak), palette, "peak"),
      currentMarker(requiredX, railY, "Required supply", lockPowerFormatAmp(required) + " / " + lockPowerFormatWatt(watts), palette, "required"),
      headroomBracket(peakX, requiredX, railY + 58, lockPowerFormatAmp(reserve) + " reserve", palette),

      '<g aria-label="Lock load bank">',
      '<rect x="922" y="122" width="144" height="136" rx="12" fill="' + palette.block + '" stroke="' + palette.lineStrong + '" stroke-width="1.4"/>',
      '<text x="994" y="146" fill="' + palette.text + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="middle">' + lockPowerEsc(lockCount) + ' Lock Loads</text>',
      '<text x="994" y="162" fill="' + palette.muted + '" font-size="9" font-weight="800" font-family="Inter,Arial,sans-serif" text-anchor="middle">LOAD BANK</text>',
      electricStrikeLoadSymbol(946, 178, 0, palette),
      repeatedLocks > 1 ? electricStrikeLoadSymbol(946, 178, 1, palette) : "",
      repeatedLocks > 2 ? electricStrikeLoadSymbol(946, 178, 2, palette) : "",
      '<text x="994" y="246" fill="' + palette.green + '" font-size="10" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="middle">' + lockPowerEsc(simultaneous) + ' active ? ' + lockPowerEsc(ampsEach) + ' A</text>',
      '</g>',

      metricChip(66, 292, "Peak Load", lockPowerFormatAmp(peak), palette, "green"),
      metricChip(256, 292, "Required Supply", lockPowerFormatAmp(required), palette, "status"),
      metricChip(446, 292, "Power", lockPowerFormatWatt(watts), palette, "green"),
      metricChip(636, 292, "Headroom Reserve", lockPowerFormatAmp(reserve), palette, "amber"),
      metricChip(826, 292, "Status", status + " · " + utilizationPct.toFixed(0) + "%", palette, "status"),

      '</svg>'
    ].join("");

    return svg;
  }

  function getCadPowerRailImage(metrics, options = {}) {
    if (!metrics) return "";
    const svg = buildCadPowerRailSvg(metrics, { exportMode: options.exportMode === true });
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function getChartImage() {
    return getCadPowerRailImage(lastMetrics, { exportMode: true });
  }



  function getExportChartImage() {
    return getCadPowerRailImage(lastMetrics, { exportMode: true });
  }

  function buildReportHTML(payload) {
    const inputRows = (payload.inputs || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.value)}</td>
      </tr>
    `).join("");

    const outputRows = (payload.outputs || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.value)}</td>
      </tr>
    `).join("");

    const assumptions = (payload.assumptions || []).map((item) => `
      <li>${escapeHtml(item)}</li>
    `).join("");

    const projectDetails = [
      payload.meta?.projectName ? `<div><strong>Project:</strong> ${escapeHtml(payload.meta.projectName)}</div>` : "",
      payload.meta?.clientName ? `<div><strong>Client:</strong> ${escapeHtml(payload.meta.clientName)}</div>` : "",
      payload.meta?.preparedBy ? `<div><strong>Prepared By:</strong> ${escapeHtml(payload.meta.preparedBy)}</div>` : ""
    ].filter(Boolean).join("");

    const notesBlock = payload.meta?.customNotes
      ? `
        <section class="section">
          <h2>Custom Notes</h2>
          <div class="body-copy">${escapeHtml(payload.meta.customNotes).replace(/\n/g, "<br>")}</div>
        </section>
      `
      : "";

    const chartBlock = payload.chartImage
      ? `
        <section class="section">
          <h2>Chart Snapshot</h2>
          <div class="chart-wrap">
            <img src="${payload.chartImage}" alt="Lock Power Budget chart">
          </div>
        </section>
      `
      : "";

    const statusClass = String(payload.status || "").toLowerCase();

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report")} • ScopedLabs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root{
      --ink:#101715;
      --muted:#52615c;
      --line:#d7e2db;
      --soft:#f5f8f6;
      --accent:#1d8f55;
      --accent-soft:#eaf7f0;
      --watch:#a66d00;
      --watch-soft:#fff6df;
      --risk:#b42318;
      --risk-soft:#fff0ee;
    }
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#eef2ef;color:var(--ink);font-family:Inter, Arial, sans-serif}
    body{padding:28px}
    .page{
      max-width:980px;
      margin:0 auto;
      background:#fff;
      border:1px solid var(--line);
      box-shadow:0 18px 50px rgba(0,0,0,.08);
    }
    .toolbar{
      display:flex;
      justify-content:flex-end;
      gap:10px;
      padding:14px 18px;
      border-bottom:1px solid var(--line);
      background:#fbfcfb;
    }
    .toolbar button{
      appearance:none;
      border:1px solid #c9d8cf;
      background:#fff;
      color:var(--ink);
      border-radius:999px;
      padding:10px 14px;
      font-weight:700;
      cursor:pointer;
    }
    .toolbar button:hover{background:#f3f7f5}
    .report{padding:28px 30px 32px}
    .brand-row{
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:10px;
    }
    .brand-row img{
      width:28px;
      height:28px;
      display:block;
    }
    .brand-name{
      font-size:1.15rem;
      font-weight:800;
      letter-spacing:.02em;
    }
    .tagline{
      color:var(--muted);
      font-size:.95rem;
      margin-bottom:18px;
    }
    .report-head{
      display:flex;
      justify-content:space-between;
      gap:18px;
      align-items:flex-start;
      border-top:1px solid var(--line);
      border-bottom:1px solid var(--line);
      padding:18px 0;
      margin-bottom:22px;
    }
    .report-title{
      font-size:1.7rem;
      line-height:1.15;
      margin:0 0 6px;
    }
    .report-meta{
      color:var(--muted);
      font-size:.95rem;
      line-height:1.6;
    }
    .status-pill{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:8px 12px;
      border-radius:999px;
      font-size:.82rem;
      font-weight:800;
      letter-spacing:.06em;
      text-transform:uppercase;
      border:1px solid transparent;
      white-space:nowrap;
    }
    .status-pill.healthy{
      color:var(--accent);
      background:var(--accent-soft);
      border-color:#c9ead7;
    }
    .status-pill.watch{
      color:var(--watch);
      background:var(--watch-soft);
      border-color:#f2dfad;
    }
    .status-pill.risk{
      color:var(--risk);
      background:var(--risk-soft);
      border-color:#f3c6c1;
    }
    .section{margin-top:24px}
    .section h2{
      margin:0 0 10px;
      font-size:1rem;
      letter-spacing:.02em;
      text-transform:uppercase;
    }
    .summary,
    .body-copy{
      border:1px solid var(--line);
      background:#fafcfb;
      border-radius:14px;
      padding:16px 18px;
      line-height:1.65;
    }
    .project-details{
      display:grid;
      gap:6px;
      margin-top:10px;
      color:var(--muted);
      font-size:.95rem;
    }
    .grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:18px;
    }
    table{
      width:100%;
      border-collapse:collapse;
      border:1px solid var(--line);
      border-radius:14px;
      overflow:hidden;
      font-size:.95rem;
    }
    th,td{
      padding:11px 12px;
      border-bottom:1px solid var(--line);
      vertical-align:top;
    }
    th{
      text-align:left;
      background:#f7faf8;
      font-size:.82rem;
      text-transform:uppercase;
      letter-spacing:.06em;
    }
    tr:last-child td{border-bottom:none}
    td:first-child{
      width:42%;
      color:var(--muted);
    }
    td:last-child{
      font-weight:700;
      text-align:left;
    }
    .assumptions{
      margin:0;
      padding-left:18px;
      line-height:1.7;
    }
    .chart-wrap{
      border:1px solid var(--line);
      border-radius:14px;
      background:#fff;
      padding:18px;
      text-align:center;
    }
    .chart-wrap img{
      max-width:100%;
      height:auto;
      display:inline-block;
    }
    .foot{
      margin-top:26px;
      padding-top:16px;
      border-top:1px solid var(--line);
      color:var(--muted);
      font-size:.9rem;
      line-height:1.7;
    }
    @media (max-width:760px){
      body{padding:14px}
      .report{padding:20px}
      .report-head{flex-direction:column}
      .grid{grid-template-columns:1fr}
    }
    @media print{
      body{background:#fff;padding:0}
      .page{max-width:none;border:none;box-shadow:none}
      .toolbar{display:none !important}
      .report{padding:0}
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <button type="button" onclick="window.print()">Print / Save PDF</button>
      <button type="button" onclick="window.close()">Close</button>
    </div>

    <div class="report">
      <div class="brand-row">
        <img src="https://scopedlabs.com/assets/favicon/favicon-32x32.png?v=1" alt="">
        <div class="brand-name">ScopedLabs</div>
      </div>
      <div class="tagline">Engineering · Analysis · Tools</div>

      <div class="report-head">
        <div>
          <h1 class="report-title">${escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report")}</h1>
          <div class="report-meta">
            <div><strong>Category:</strong> ${escapeHtml(payload.category || "")}</div>
            <div><strong>Tool:</strong> ${escapeHtml(payload.tool || "")}</div>
            <div><strong>Generated:</strong> ${escapeHtml(formatDateTime(payload.generatedAt || ""))}</div>
            <div><strong>Report ID:</strong> ${escapeHtml(payload.reportId || "")}</div>
          </div>
        </div>
        <div class="status-pill ${statusClass}">${escapeHtml(payload.status || "")}</div>
      </div>

      <section class="section">
        <h2>Executive Summary</h2>
        <div class="summary">
          ${escapeHtml(payload.summary || "")}
          <div class="project-details">${projectDetails}</div>
        </div>
      </section>

      <section class="section">
        <div class="grid">
          <div>
            <h2>Inputs</h2>
            <table>
              <thead><tr><th>Input</th><th>Value</th></tr></thead>
              <tbody>${inputRows}</tbody>
            </table>
          </div>
          <div>
            <h2>Calculated Outputs</h2>
            <table>
              <thead><tr><th>Output</th><th>Value</th></tr></thead>
              <tbody>${outputRows}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>Engineering Interpretation</h2>
        <div class="body-copy">${escapeHtml(payload.interpretation || "")}</div>
      </section>

      ${chartBlock}
      ${notesBlock}

      <section class="section">
        <h2>Assumptions</h2>
        <div class="body-copy"><ul class="assumptions">${assumptions}</ul></div>
      </section>

      <section class="section">
        <h2>Disclaimer</h2>
        <div class="body-copy">
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, manufacturer documentation, listed hardware requirements, fire/life-safety review, voltage-drop analysis, or site-specific validation.
        </div>
      </section>

      <div class="foot">
        ScopedLabs Pro export preview for internal and client-facing documentation workflows.
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  function openReportWindow(payload) {
    try {
      const html = buildReportHTML(payload);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");

      if (!win) return false;

      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch (err) {
      console.error("Export report open failed:", err);
      return false;
    }
  }

  function loadFlowContext() {
    if (!els.flowNote) return;

    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);

    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    let parsed = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const d = parsed.data || {};
    const lines = [];

    if (d.readerType) lines.push(`Reader Type: <strong>${escapeHtml(d.readerType)}</strong>`);
    if (d.interfaceRec) lines.push(`Interface: <strong>${escapeHtml(d.interfaceRec)}</strong>`);
    if (d.security) lines.push(`Security: <strong>${escapeHtml(d.security)}</strong>`);
    if (d.environment) lines.push(`Environment: <strong>${escapeHtml(d.environment)}</strong>`);
    if (d.credential) lines.push(`Credential: <strong>${escapeHtml(d.credential)}</strong>`);

    if (!lines.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${lines.join(" | ")}
      <br><br>
      Use that reader decision as the basis for estimating whether the chosen lock hardware can be supported cleanly under simultaneous unlock demand.
    `;
  }

  // access-control-lock-power-hidden-ledger-policy-027: #results is a hidden structured ledger; assistant + CAD rail own the visible output.
  function collectVisibleResults() {
    if (!els.results) return [];

    const rows = Array.from(els.results.querySelectorAll(".result-row"));

    return rows.map((rowEl) => {
      const label = rowEl.querySelector(".result-label")?.textContent?.trim() || "";
      const value = rowEl.querySelector(".result-value")?.textContent?.trim() || "";
      return { label, value };
    }).filter((item) => item.label && item.value);
  }

  function getSummaryFromResults(outputs) {
    const supply = outputs.find((x) => x.label === "Required Supply")?.value || "";
    const watts = outputs.find((x) => x.label === "Power")?.value || "";
    const status = outputs.find((x) => x.label === "System Status")?.value || "";

    return `Estimated required supply is ${supply || "N/A"} with ${watts || "N/A"} total power and an overall status of ${status || "unknown"}.`;
  }

  function getInterpretationFromResults(outputs) {
    return outputs.find((x) => x.label === "Engineering Insight")?.value || "";
  }

  function getStatusFromResults(outputs) {
    const status = (outputs.find((x) => x.label === "System Status")?.value || "").toUpperCase();

    if (status === "RISK") return "RISK";
    if (status === "WATCH") return "WATCH";
    return "HEALTHY";
  }

  function getAssumptions() {
    return [
      "Peak unlock demand is based on simultaneous unlock events, not all installed locks unlocking at once unless configured that way.",
      "Required supply includes the configured design headroom percentage.",
      "This export reflects the current on-screen tool results at the time the report was opened or saved.",
      "Final power design should be checked against manufacturer surge current, hold current, power supply listing, wiring distance, voltage drop, and fire/life-safety behavior."
    ];
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();

    if (!outputs.length) return null;

    return {
      reportId: makeReportId("SL-ACC-LOCKPOWER"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: STEP,
      status: getStatusFromResults(outputs),
      summary: getSummaryFromResults(outputs),
      interpretation: getInterpretationFromResults(outputs),
      inputs: [
        { label: "Lock Type", value: els.lockType.options[els.lockType.selectedIndex]?.text || els.lockType.value },
        { label: "Voltage", value: els.voltage.options[els.voltage.selectedIndex]?.text || els.voltage.value },
        { label: "Current per Lock (A)", value: String(els.amps.value) },
        { label: "Number of Locks", value: String(els.locks.value) },
        { label: "Simultaneous Unlocks", value: String(els.simul.value) },
        { label: "Headroom (%)", value: String(els.headroom.value) }
      ],
      outputs,
      assumptions: getAssumptions(),
      chartImage: getExportChartImage(),
      meta: getReportMeta(),
      activeScopeContext: getActiveScopeExportContext()
    };
  }


  // access-control-lock-power-output-shell-module-029: shared visual shell owns CAD output visibility and export image handoff.
  function outputShell() {
    return window.ScopedLabsAccessControlOutputShell || null;
  }

  function attachOutputShellExport() {
    const shell = outputShell();

    if (shell && typeof shell.register === "function") {
      shell.register(STEP, {
        getChartImage: () => getCadPowerRailImage(lastMetrics, { exportMode: true })
      });
    }

    if (shell && typeof shell.attachExportGetter === "function") {
      shell.attachExportGetter(STEP, window.ScopedLabsExportConfig);
      return true;
    }

    if (window.ScopedLabsExportConfig) {
      window.ScopedLabsExportConfig.getChartImage = getExportChartImage;
      return true;
    }

    return false;
  }

  function clearLocalAssistant() {
    if (window.ScopedLabsLocalAssistant && els.localAssistantMount) {
      window.ScopedLabsLocalAssistant.clear(els.localAssistantMount);
      return;
    }

    if (els.localAssistantMount) {
      els.localAssistantMount.innerHTML = "";
      els.localAssistantMount.hidden = true;
    }
  }

  function renderLocalAssistant(core) {
    const assistant = window.ScopedLabsLocalAssistant;
    const adapters = window.ScopedLabsAccessControlToolAssistantAdapters;
    const adapter = adapters && typeof adapters.getAdapter === "function" ? adapters.getAdapter(STEP) : null;

    if (!assistant || !adapter || !els.localAssistantMount || typeof adapter.buildModel !== "function") {
      return false;
    }

    return assistant.mount(els.localAssistantMount, adapter.buildModel(core));
  }

  function applyShellModules() {
    const shell = window.ScopedLabsToolShell;
    if (shell && typeof shell.applyBackContinueShell === "function") {
      shell.applyBackContinueShell({ rowId: "accessControlFlowActions" });
    }
  }

  function clearAnalysis() {
    if (window.ScopedLabsAnalyzer && els.analysis) {
      ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    } else if (els.analysis) {
      els.analysis.innerHTML = "";
      els.analysis.style.display = "none";
    }
  }

  function invalidate(message = "Run calculation.") {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["panel-capacity"]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}

    destroyChart();
    hideContinue();
    clearLocalAssistant();
    clearAnalysis();

    if (els.results) {
      els.results.innerHTML = `<div class="muted">${escapeHtml(message)}</div>`;
    }

    lastMetrics = null;
    currentReport = null;
    updateExportControls();
    loadFlowContext();
  }

  function reset() {
    if (els.lockType) els.lockType.value = "strike";
    if (els.voltage) els.voltage.value = "12";
    if (els.amps) els.amps.value = "0.35";
    if (els.locks) els.locks.value = "8";
    if (els.simul) els.simul.value = "2";
    if (els.headroom) els.headroom.value = "25";

    applyActiveScopeToInputs();
    renderActiveScopeContext();

    invalidate("Run calculation.");
  }

  function getStatus(utilizationPct) {
    if (utilizationPct > 85) return "RISK";
    if (utilizationPct > 65) return "WATCH";
    return "HEALTHY";
  }

  function getGuidance(status, simul, locks, lockType) {
    if (status === "RISK") {
      return `Power supply margin is too tight. High simultaneous ${lockType} events may cause voltage sag, unlock instability, or nuisance behavior under field conditions.`;
    }

    if (status === "WATCH") {
      return `System is serviceable but tight. ${simul} simultaneous unlocks across ${locks} locks leaves limited margin for expansion, cable loss, or supply aging.`;
    }

    return "Power budget is clean. Supply sizing should tolerate normal unlock bursts with reasonable field margin.";
  }

  function getInsight(status, peak, required, watts) {
    if (status === "RISK") {
      return `Peak event load of ${peak.toFixed(2)} A is pushing the supply too hard. Required budget rises to ${required.toFixed(2)} A / ${watts.toFixed(1)} W once headroom is included, which is not where you want a lock circuit to live.`;
    }

    if (status === "WATCH") {
      return "The design is within range, but only with moderate reserve. Unlock bursts, cable losses, and future changes could move this supply from acceptable to problematic.";
    }

    return "The design stays well inside a healthy operating envelope. Peak unlock demand and reserved headroom remain balanced, which is what you want for stable lock behavior.";
  }


  // access-control-lock-power-visual-output-fix-028
  function renderVisualOutput(metrics) {
    if (!metrics || !els.chart || !els.chartWrap) return false;

    const svg = buildCadPowerRailSvg(metrics, { exportMode: false });
    const shell = outputShell();

    if (shell && typeof shell.showVisual === "function") {
      return shell.showVisual({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart,
        html: svg
      });
    }

    if (els.visualCard) els.visualCard.hidden = false;
    els.chartWrap.hidden = false;
    els.chart.innerHTML = svg;

    return true;
  }

  function renderChart(metrics) {
    destroyChart();

    if (!els.chart) return;

    renderVisualOutput(metrics);

    chart = {
      destroy() {
        if (els.chart) els.chart.innerHTML = "";
      }
    };
  }

  function calc() {
    const amps = parseFloat(els.amps.value);
    const locks = parseInt(els.locks.value, 10);
    const simul = parseInt(els.simul.value, 10);
    const headroom = parseFloat(els.headroom.value);
    const voltage = parseInt(els.voltage.value, 10);

    if (
      !Number.isFinite(amps) || amps <= 0 ||
      !Number.isFinite(locks) || locks <= 0 ||
      !Number.isFinite(simul) || simul <= 0 ||
      !Number.isFinite(headroom) || headroom < 0 ||
      !Number.isFinite(voltage) || voltage <= 0
    ) {
      render([row("Error", "Enter valid values for all inputs.")]);
      destroyChart();
      hideContinue();
      lastMetrics = null;
      currentReport = null;
      updateExportControls();
      return;
    }

    const effectiveSimul = Math.min(locks, simul);
    const peak = effectiveSimul * amps;
    const required = peak * (1 + headroom / 100);
    const watts = required * voltage;
    const utilizationPct = required > 0 ? (peak / required) * 100 : 0;

    const status = getStatus(utilizationPct);
    const guidance = getGuidance(status, effectiveSimul, locks, els.lockType.value);
    const insight = getInsight(status, peak, required, watts);

    render([
      row("Peak Load", `${peak.toFixed(2)} A`),
      row("Required Supply", `${required.toFixed(2)} A`),
      row("Power", `${watts.toFixed(1)} W`),
      row("Utilization", `${utilizationPct.toFixed(0)}%`),
      row("System Status", status),
      row("Design Guidance", guidance),
      row("Engineering Insight", insight)
    ]);

    lastMetrics = {
      peak,
      required,
      watts,
      utilizationPct
    };

    renderChart(lastMetrics);

    if (window.ScopedLabsAnalyzer) {
      ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        data: {
          peakLoadA: peak,
          requiredSupplyA: required,
          watts,
          utilizationPct,
          status
        }
      });
    }

    renderVisualOutput(lastMetrics);

    currentReport = buildCurrentReportPayload();
    renderLocalAssistant({
      status,
      lockType: els.lockType.value,
      lockCount: locks,
      simultaneousUnlocks: effectiveSimul,
      peakLoadA: peak,
      requiredSupplyA: required,
      watts,
      utilizationPct,
      guidance,
      insight
    });
    updateExportControls();
    showContinue();
  }

  function bindEvents() {
    if (els.calc) {
      els.calc.addEventListener("click", calc);
    }

    if (els.reset) {
      els.reset.addEventListener("click", reset);
    }

    [
      els.lockType,
      els.voltage,
      els.amps,
      els.locks,
      els.simul,
      els.headroom
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => invalidate("Inputs changed. Press Calculate to refresh results."));
      el.addEventListener("change", () => invalidate("Inputs changed. Press Calculate to refresh results."));
    });

    [
      els.reportTitle,
      els.projectName,
      els.clientName,
      els.preparedBy,
      els.customNotes
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => {
        if (!currentReport) return;
        updateExportControls("Export details updated.");
      });
    });

    if (els.nextBtn) {
      els.nextBtn.addEventListener("click", () => {
        window.location.href = "/tools/access-control/panel-capacity/";
      });
    }
  }

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    reset();
    attachOutputShellExport();
    applyShellModules();

    window.addEventListener("scopedlabs:access-control-scope-updated", () => {
      renderActiveScopeContext();
      if (!currentReport) {
        applyActiveScopeToInputs();
        invalidate("Run calculation.");
      }
    });

    unlockCategoryPage();

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
      attachOutputShellExport();
      applyShellModules();
    }, 400);

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
    }, 1200);
  }

  bindEvents();
  init();
})();