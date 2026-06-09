(function () {
  "use strict";

  const VERSION = "access-control-planning-visuals-048-fail-safe-state-icons";

  function clamp(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureStyles() {
    if (document.getElementById("access-control-planning-visuals-styles")) return;

    const style = document.createElement("style");
    style.id = "access-control-planning-visuals-styles";
    style.textContent = [
      ".access-control-planning-visual-shell{margin-top:14px;}",
      ".access-control-planning-visual-shell svg{display:block;width:100%;height:auto;border:1px solid rgba(120,255,120,.14);border-radius:16px;background:rgba(5,12,10,.24);box-shadow:inset 0 0 0 1px rgba(255,255,255,.02);}",
      ".access-control-planning-visual-shell .sl-vis-note{margin:10px 0 0;color:rgba(203,213,225,.72);font-size:.86rem;line-height:1.45;}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function statusTone(status) {
    const clean = String(status || "").toUpperCase();
    if (clean.includes("RISK") || clean === "HIGH") return "risk";
    if (clean.includes("WATCH") || clean === "MODERATE") return "watch";
    return "safe";
  }

  function statusLabel(status) {
    const clean = String(status || "PENDING").toUpperCase();
    if (clean === "HEALTHY" || clean === "LOW") return "SAFE";
    if (clean === "MODERATE") return "WATCH";
    if (clean === "HIGH") return "RISK";
    return clean;
  }

  function toneFill(tone) {
    if (tone === "risk") return "rgba(255,105,105,.14)";
    if (tone === "watch") return "rgba(255,204,102,.14)";
    return "rgba(120,255,120,.10)";
  }

  function toneStroke(tone) {
    if (tone === "risk") return "rgba(255,105,105,.46)";
    if (tone === "watch") return "rgba(255,204,102,.46)";
    return "rgba(120,255,120,.34)";
  }

  function toneText(tone) {
    if (tone === "risk") return "rgba(255,170,170,.96)";
    if (tone === "watch") return "rgba(255,220,130,.96)";
    return "rgba(125,255,152,.96)";
  }


  function cadControlledDoorOpeningIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const tone = options.tone || "safe";

    const toneLine = toneStroke(tone);
    const toneFillValue = toneFill(tone);
    const readerLine = tone === "risk" ? "rgba(255,170,170,.76)" : tone === "watch" ? "rgba(255,220,130,.78)" : "rgba(92,255,245,.76)";
    const readerFillValue = tone === "risk" ? "rgba(255,105,105,.10)" : tone === "watch" ? "rgba(255,204,102,.11)" : "rgba(92,255,245,.08)";
    const doorLine = "rgba(203,213,225,.66)";
    const doorLineStrong = "rgba(238,255,244,.78)";
    const mutedLine = "rgba(148,213,210,.44)";

    function sx(value) {
      return Math.round((x + value * scale) * 10) / 10;
    }

    function sy(value) {
      return Math.round((y + value * scale) * 10) / 10;
    }

    function sw(value) {
      return Math.round(value * scale * 10) / 10;
    }

    return [
      '<g class="sl-cad-controlled-door-icon" data-cad-icon="controlled-door-opening" data-cad-detail="door-reader-opening" aria-label="CAD controlled door and reader opening">',

      '<rect x="' + sx(42) + '" y="' + sy(6) + '" width="' + sw(88) + '" height="' + sw(138) + '" fill="rgba(0,0,0,.06)" stroke="' + doorLine + '" stroke-width="' + sw(1.35) + '" />',
      '<rect x="' + sx(48) + '" y="' + sy(12) + '" width="' + sw(76) + '" height="' + sw(126) + '" fill="rgba(0,0,0,.04)" stroke="' + doorLine + '" stroke-width="' + sw(1.1) + '" />',

      '<path d="M' + sx(50) + ' ' + sy(16) + ' H' + sx(116) + ' V' + sy(138) + ' H' + sx(50) + '" fill="none" stroke="' + doorLineStrong + '" stroke-width="' + sw(1.25) + '" stroke-linecap="round" stroke-linejoin="round" />',
      '<path d="M' + sx(50) + ' ' + sy(62) + ' V' + sy(92) + '" fill="none" stroke="' + toneLine + '" stroke-width="' + sw(1.25) + '" stroke-linecap="round" />',

      '<rect x="' + sx(117) + '" y="' + sy(30) + '" width="' + sw(5) + '" height="' + sw(17) + '" fill="rgba(0,0,0,.08)" stroke="' + doorLine + '" stroke-width="' + sw(.9) + '" />',
      '<rect x="' + sx(117) + '" y="' + sy(108) + '" width="' + sw(5) + '" height="' + sw(17) + '" fill="' + toneFillValue + '" stroke="' + toneLine + '" stroke-width="' + sw(.9) + '" />',

      '<circle cx="' + sx(66) + '" cy="' + sy(78) + '" r="' + sw(3.8) + '" fill="rgba(0,0,0,.14)" stroke="' + doorLineStrong + '" stroke-width="' + sw(1) + '" />',
      '<path d="M' + sx(66) + ' ' + sy(78) + ' H' + sx(84) + '" fill="none" stroke="' + doorLineStrong + '" stroke-width="' + sw(1.45) + '" stroke-linecap="round" />',

      '<path d="M' + sx(50) + ' ' + sy(138) + ' A' + sw(66) + ' ' + sw(66) + ' 0 0 1 ' + sx(116) + ' ' + sy(76) + '" fill="none" stroke="' + doorLine + '" stroke-width="' + sw(1.05) + '" stroke-dasharray="' + sw(5.8) + ' ' + sw(5.8) + '" stroke-linecap="round" />',

      '<rect x="' + sx(16) + '" y="' + sy(58) + '" width="' + sw(14) + '" height="' + sw(32) + '" rx="' + sw(2.6) + '" fill="' + readerFillValue + '" stroke="' + readerLine + '" stroke-width="' + sw(1.15) + '" />',
      '<path d="M' + sx(20) + ' ' + sy(65) + ' H' + sx(26) + '" stroke="' + readerLine + '" stroke-width="' + sw(1.05) + '" stroke-linecap="round" />',
      '<path d="M' + sx(22) + ' ' + sy(74) + ' q' + sw(3) + ' ' + sw(4) + ' 0 ' + sw(8) + ' M' + sx(18) + ' ' + sy(72) + ' q' + sw(7) + ' ' + sw(7) + ' 0 ' + sw(14) + ' M' + sx(14) + ' ' + sy(70) + ' q' + sw(11) + ' ' + sw(10) + ' 0 ' + sw(20) + '" fill="none" stroke="' + readerLine + '" stroke-width="' + sw(.95) + '" stroke-linecap="round" />',

      '<path d="M' + sx(34) + ' ' + sy(54) + ' V' + sy(94) + '" fill="none" stroke="' + mutedLine + '" stroke-width="' + sw(1) + '" stroke-linecap="round" />',
      '<path d="M' + sx(48) + ' ' + sy(144) + ' H' + sx(126) + '" fill="none" stroke="' + mutedLine + '" stroke-width="' + sw(1) + '" stroke-linecap="round" />',

      '</g>'
    ].join("");
  }

  function cadDoorReaderOpeningIcon(options = {}) {
    return cadControlledDoorOpeningIcon(options);
  }

  function cadAccessReaderIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const tone = options.tone || "safe";
    const label = options.label == null ? "" : String(options.label);
    const line = toneStroke(tone);
    const fill = toneFill(tone);
    const glow = tone === "risk" ? "rgba(255,170,170,.80)" : tone === "watch" ? "rgba(255,220,130,.82)" : "rgba(92,255,245,.84)";

    function sx(value) {
      return Math.round((x + value * scale) * 10) / 10;
    }

    function sy(value) {
      return Math.round((y + value * scale) * 10) / 10;
    }

    function sw(value) {
      return Math.round(value * scale * 10) / 10;
    }

    return [
      '<g class="sl-cad-access-reader-icon" data-cad-icon="access-reader" aria-label="CAD access reader">',
      '<rect x="' + sx(0) + '" y="' + sy(0) + '" width="' + sw(74) + '" height="' + sw(126) + '" rx="' + sw(13) + '" fill="rgba(0,0,0,.24)" stroke="rgba(226,232,240,.62)" stroke-width="' + sw(1.4) + '" />',
      '<rect x="' + sx(8) + '" y="' + sy(8) + '" width="' + sw(58) + '" height="' + sw(110) + '" rx="' + sw(9) + '" fill="' + fill + '" stroke="' + line + '" stroke-width="' + sw(1) + '" />',
      '<rect x="' + sx(29) + '" y="' + sy(19) + '" width="' + sw(16) + '" height="' + sw(4) + '" rx="' + sw(2) + '" fill="' + glow + '" />',
      '<circle cx="' + sx(37) + '" cy="' + sy(74) + '" r="' + sw(3.3) + '" fill="' + glow + '" />',
      '<path d="M' + sx(25) + ' ' + sy(64) + ' q' + sw(-10) + ' ' + sw(10) + ' 0 ' + sw(20) + ' M' + sx(49) + ' ' + sy(64) + ' q' + sw(10) + ' ' + sw(10) + ' 0 ' + sw(20) + ' M' + sx(19) + ' ' + sy(58) + ' q' + sw(-16) + ' ' + sw(16) + ' 0 ' + sw(32) + ' M' + sx(55) + ' ' + sy(58) + ' q' + sw(16) + ' ' + sw(16) + ' 0 ' + sw(32) + '" fill="none" stroke="' + glow + '" stroke-width="' + sw(1.05) + '" stroke-linecap="round" />',
      label ? '<text x="' + sx(37) + '" y="' + sy(112) + '" font-size="' + sw(11) + '" fill="rgba(238,255,244,.88)" font-weight="900" text-anchor="middle">' + escapeHtml(label) + '</text>' : '',
      '</g>'
    ].join("");
  }

  function cadApbZoneMarker(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const tone = options.tone || "safe";
    const label = options.label == null ? "Z1" : String(options.label);

    const line = toneStroke(tone);
    const fill = toneFill(tone);
    const inner = "rgba(226,232,240,.64)";
    const text = "rgba(238,255,244,.92)";

    function sx(value) {
      return Math.round((x + value * scale) * 10) / 10;
    }

    function sy(value) {
      return Math.round((y + value * scale) * 10) / 10;
    }

    function sw(value) {
      return Math.round(value * scale * 10) / 10;
    }

    return [
      '<g class="sl-cad-apb-zone-icon" data-cad-icon="apb-zone" aria-label="' + escapeHtml(label) + ' anti-passback zone marker">',
      '<path d="M' + sx(48) + ' ' + sy(8) + ' V' + sy(18) + ' M' + sx(48) + ' ' + sy(78) + ' V' + sy(88) + ' M' + sx(8) + ' ' + sy(48) + ' H' + sx(18) + ' M' + sx(78) + ' ' + sy(48) + ' H' + sx(88) + '" stroke="' + line + '" stroke-width="' + sw(2) + '" stroke-linecap="round" />',
      '<path d="M' + sx(48) + ' ' + sy(14) + ' L' + sx(78) + ' ' + sy(31) + ' L' + sx(78) + ' ' + sy(65) + ' L' + sx(48) + ' ' + sy(82) + ' L' + sx(18) + ' ' + sy(65) + ' L' + sx(18) + ' ' + sy(31) + ' Z" fill="' + fill + '" stroke="' + line + '" stroke-width="' + sw(2.4) + '" stroke-linejoin="round" />',
      '<path d="M' + sx(48) + ' ' + sy(25) + ' L' + sx(68) + ' ' + sy(36.5) + ' L' + sx(68) + ' ' + sy(59.5) + ' L' + sx(48) + ' ' + sy(71) + ' L' + sx(28) + ' ' + sy(59.5) + ' L' + sx(28) + ' ' + sy(36.5) + ' Z" fill="none" stroke="' + inner + '" stroke-width="' + sw(1.4) + '" stroke-linejoin="round" />',
      '<text x="' + sx(48) + '" y="' + sy(55) + '" text-anchor="middle" fill="' + text + '" font-size="' + sw(23) + '" font-weight="800" font-family="Inter,Arial,sans-serif" letter-spacing="' + sw(1) + '">' + escapeHtml(label) + '</text>',
      '</g>'
    ].join("");
  }

  function cadElevatorBankIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const tone = options.tone || "safe";
    const cars = Math.max(1, Math.min(3, Math.round(Number(options.cars || 3))));
    const label = options.label == null ? "" : String(options.label);
    const signal = tone === "risk" ? "rgba(255,170,170,.78)" : tone === "watch" ? "rgba(255,220,130,.80)" : "rgba(92,255,245,.78)";

    function sx(value) {
      return Math.round((x + value * scale) * 10) / 10;
    }

    function sy(value) {
      return Math.round((y + value * scale) * 10) / 10;
    }

    function sw(value) {
      return Math.round(value * scale * 10) / 10;
    }

    function cab(index) {
      const cx = 18 + index * 64;
      return [
        '<rect x="' + sx(cx) + '" y="' + sy(50) + '" width="' + sw(48) + '" height="' + sw(88) + '" fill="rgba(0,0,0,.10)" stroke="rgba(226,232,240,.62)" stroke-width="' + sw(1.1) + '" />',
        '<path d="M' + sx(cx + 24) + ' ' + sy(52) + ' V' + sy(138) + '" stroke="rgba(226,232,240,.50)" stroke-width="' + sw(1) + '" />',
        '<rect x="' + sx(cx + 10) + '" y="' + sy(32) + '" width="' + sw(28) + '" height="' + sw(15) + '" fill="rgba(0,0,0,.20)" stroke="rgba(226,232,240,.45)" stroke-width="' + sw(.9) + '" />',
        '<path d="M' + sx(cx + 17) + ' ' + sy(42) + ' l' + sw(4) + ' ' + sw(-7) + ' l' + sw(4) + ' ' + sw(7) + ' M' + sx(cx + 31) + ' ' + sy(35) + ' l' + sw(4) + ' ' + sw(7) + ' l' + sw(4) + ' ' + sw(-7) + '" fill="none" stroke="' + signal + '" stroke-width="' + sw(1) + '" stroke-linecap="round" stroke-linejoin="round" />'
      ].join("");
    }

    const width = 36 + cars * 64;

    return [
      '<g class="sl-cad-elevator-bank-icon" data-cad-icon="elevator-bank" aria-label="CAD elevator bank">',
      '<path d="M' + sx(0) + ' ' + sy(140) + ' H' + sx(width + 20) + '" stroke="rgba(226,232,240,.58)" stroke-width="' + sw(1.3) + '" />',
      '<rect x="' + sx(8) + '" y="' + sy(18) + '" width="' + sw(width) + '" height="' + sw(122) + '" fill="rgba(0,0,0,.055)" stroke="rgba(226,232,240,.54)" stroke-width="' + sw(1.1) + '" />',
      Array.from({ length: cars }, (_, index) => cab(index)).join(""),
      '<rect x="' + sx(width + 22) + '" y="' + sy(76) + '" width="' + sw(14) + '" height="' + sw(36) + '" fill="rgba(0,0,0,.16)" stroke="rgba(226,232,240,.42)" stroke-width="' + sw(.9) + '" />',
      '<circle cx="' + sx(width + 29) + '" cy="' + sy(88) + '" r="' + sw(4) + '" fill="rgba(0,0,0,.20)" stroke="' + signal + '" stroke-width="' + sw(.9) + '" />',
      '<circle cx="' + sx(width + 29) + '" cy="' + sy(101) + '" r="' + sw(4) + '" fill="rgba(0,0,0,.20)" stroke="' + signal + '" stroke-width="' + sw(.9) + '" />',
      '<path d="M' + sx(width + 26.5) + ' ' + sy(89) + ' l' + sw(2.5) + ' ' + sw(-3) + ' l' + sw(2.5) + ' ' + sw(3) + ' M' + sx(width + 26.5) + ' ' + sy(100) + ' l' + sw(2.5) + ' ' + sw(3) + ' l' + sw(2.5) + ' ' + sw(-3) + '" fill="none" stroke="' + signal + '" stroke-width="' + sw(.75) + '" stroke-linecap="round" stroke-linejoin="round" />',
      label ? '<text x="' + sx(width / 2 + 8) + '" y="' + sy(15) + '" font-size="' + sw(12) + '" fill="rgba(238,255,244,.88)" font-weight="900" text-anchor="middle">' + escapeHtml(label) + '</text>' : '',
      '</g>'
    ].join("");
  }



  function cadAccessPanelCapacityIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const width = Math.max(128, Number(options.width || 220));
    const height = Math.max(112, Number(options.height || 148));
    const tone = options.tone || "safe";
    const exportMode = !!options.exportMode;
    const panelLabel = options.panelLabel == null ? "PANEL 1" : String(options.panelLabel);
    const maxSlots = Math.max(1, Math.min(12, Math.round(Number(options.maxSlots || 8))));
    const usedSlots = Math.max(0, Math.min(maxSlots, Math.round(Number(options.usedSlots || 0))));
    const watchSlot = Math.max(0, Math.min(maxSlots, Math.round(Number(options.watchSlot || 0))));
    const slotLabels = Array.isArray(options.slotLabels) ? options.slotLabels : [];

    const line = exportMode ? "#668273" : "rgba(203,213,225,.66)";
    const strong = exportMode ? "#101715" : "rgba(238,255,244,.84)";
    const muted = exportMode ? "#54615d" : "rgba(203,213,225,.70)";
    const softLine = exportMode ? "#b8cabe" : "rgba(203,213,225,.26)";
    const shellFill = exportMode ? "#f8fbf8" : "rgba(0,0,0,.10)";
    const bayFill = exportMode ? "#ffffff" : "rgba(0,0,0,.12)";
    const safeLine = exportMode ? "#1f9d57" : "rgba(125,255,152,.82)";
    const safeFill = exportMode ? "#e7f8ee" : "rgba(120,255,120,.10)";
    const watchLine = exportMode ? "#b7791f" : "rgba(255,204,102,.92)";
    const watchFill = exportMode ? "#fff4d8" : "rgba(255,204,102,.13)";
    const riskLine = exportMode ? "#b42318" : "rgba(255,105,105,.88)";
    const riskFill = exportMode ? "#ffe2df" : "rgba(255,105,105,.13)";
    const toneLine = tone === "risk" ? riskLine : tone === "watch" ? watchLine : safeLine;
    const toneFillValue = tone === "risk" ? riskFill : tone === "watch" ? watchFill : safeFill;

    const pad = Math.max(10, width * 0.055);
    const headerY = y + pad + 16;
    const bodyY = y + pad + 38;
    const bodyH = Math.max(48, height - pad * 2 - 54);
    const bayW = Math.max(58, Math.min(90, width * 0.33));
    const bayX = x + pad;
    const slotsX = bayX + bayW + Math.max(12, width * 0.055);
    const slotsW = Math.max(40, x + width - pad - slotsX);
    const gap = maxSlots <= 4 ? 8 : maxSlots <= 8 ? 5 : 3;
    const slotW = Math.max(4.8, (slotsW - gap * (maxSlots - 1)) / maxSlots);
    const slotH = Math.max(28, bodyH * 0.56);
    const slotY = bodyY + 20;
    const textSize = maxSlots <= 4 ? 8.2 : maxSlots <= 8 ? 6.4 : 5.5;
    const parts = [];

    function esc(value) {
      return escapeHtml(value == null ? "" : String(value));
    }

    function fmt(value) {
      return Math.round(Number(value) * 10) / 10;
    }

    function slotLabel(index, used, watch) {
      const explicit = slotLabels[index];
      if (explicit != null && String(explicit).trim()) return String(explicit).trim();
      if (used) return maxSlots <= 4 ? "EXP" : "EX";
      if (watch) return "ADD";
      return "-";
    }

    for (let i = 0; i < maxSlots; i += 1) {
      const sx = slotsX + i * (slotW + gap);
      const used = i < usedSlots;
      const watch = watchSlot > 0 && i === watchSlot - 1;
      const stroke = watch ? watchLine : used ? safeLine : softLine;
      const fill = watch ? watchFill : used ? safeFill : (exportMode ? "#ffffff" : "rgba(0,0,0,.08)");
      const label = slotLabel(i, used, watch);

      parts.push('<rect x="' + fmt(sx) + '" y="' + fmt(slotY) + '" width="' + fmt(slotW) + '" height="' + fmt(slotH) + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.05"/>');
      parts.push('<text x="' + fmt(sx + slotW / 2) + '" y="' + fmt(slotY + slotH / 2 + 3) + '" fill="' + (watch ? watchLine : used ? safeLine : muted) + '" font-size="' + textSize + '" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="middle">' + esc(label).slice(0, 4) + '</text>');
      parts.push('<text x="' + fmt(sx + slotW / 2) + '" y="' + fmt(slotY + slotH + 13) + '" fill="' + muted + '" font-size="7.5" font-weight="800" font-family="Inter,Arial,sans-serif" text-anchor="middle">' + (i + 1) + '</text>');
    }

    const terminals = [];
    const terminalCount = 8;

    for (let i = 0; i < terminalCount; i += 1) {
      const cx = bayX + 12 + i * Math.max(6, (bayW - 24) / (terminalCount - 1));
      terminals.push('<circle cx="' + fmt(cx) + '" cy="' + fmt(bodyY + bodyH - 13) + '" r="2.1" fill="' + (i < Math.min(usedSlots + 2, terminalCount) ? safeLine : muted) + '"/>');
    }

    return [
      '<g class="sl-cad-panel-capacity-icon" data-cad-icon="access-panel-capacity" data-cad-detail="dynamic-expansion-slots" aria-label="CAD access panel capacity with ' + maxSlots + ' expansion slots">',
      '<rect x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(width) + '" height="' + fmt(height) + '" rx="12" fill="' + shellFill + '" stroke="' + line + '" stroke-width="1.25"/>',
      '<path d="M' + fmt(x + pad) + ' ' + fmt(y + pad) + ' H' + fmt(x + width - pad) + ' M' + fmt(x + pad) + ' ' + fmt(y + height - pad) + ' H' + fmt(x + width - pad) + '" stroke="' + softLine + '" stroke-width=".8" stroke-linecap="round"/>',
      '<text x="' + fmt(x + pad) + '" y="' + fmt(headerY) + '" fill="' + strong + '" font-size="12" font-weight="900" font-family="Inter,Arial,sans-serif">' + esc(panelLabel) + '</text>',
      '<text x="' + fmt(x + pad) + '" y="' + fmt(headerY + 16) + '" fill="' + muted + '" font-size="8.8" font-weight="800" font-family="Inter,Arial,sans-serif">CTRL BAY + MAX ' + maxSlots + ' SLOTS</text>',
      '<rect x="' + fmt(bayX) + '" y="' + fmt(bodyY + 20) + '" width="' + fmt(bayW) + '" height="' + fmt(slotH) + '" rx="7" fill="' + bayFill + '" stroke="' + line + '" stroke-width="1"/>',
      '<rect x="' + fmt(bayX + 9) + '" y="' + fmt(bodyY + 31) + '" width="' + fmt(Math.max(20, bayW * .34)) + '" height="' + fmt(Math.max(13, slotH * .32)) + '" rx="3" fill="' + toneFillValue + '" stroke="' + toneLine + '" stroke-width="1"/>',
      '<path d="M' + fmt(bayX + bayW * .50) + ' ' + fmt(bodyY + 34) + ' H' + fmt(bayX + bayW - 12) + ' M' + fmt(bayX + bayW * .50) + ' ' + fmt(bodyY + 48) + ' H' + fmt(bayX + bayW - 18) + '" stroke="' + softLine + '" stroke-width=".9" stroke-linecap="round"/>',
      terminals.join(""),
      '<path d="M' + fmt(bayX + bayW) + ' ' + fmt(slotY + slotH / 2) + ' H' + fmt(slotsX - 6) + '" stroke="' + toneLine + '" stroke-width="1.15" stroke-linecap="round"/>',
      parts.join(""),
      '<text x="' + fmt(slotsX) + '" y="' + fmt(y + height - pad - 2) + '" fill="' + muted + '" font-size="8.2" font-weight="800" font-family="Inter,Arial,sans-serif">' + usedSlots + ' / ' + maxSlots + ' USED</text>',
      '<text x="' + fmt(x + width - pad) + '" y="' + fmt(y + height - pad - 2) + '" fill="' + toneLine + '" font-size="8.2" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="end">' + esc(String(tone).toUpperCase()) + '</text>',
      '<path d="M' + fmt(x) + ' ' + fmt(y + 14) + ' V' + fmt(y) + ' H' + fmt(x + 14) + ' M' + fmt(x + width - 14) + ' ' + fmt(y) + ' H' + fmt(x + width) + ' V' + fmt(y + 14) + ' M' + fmt(x + width) + ' ' + fmt(y + height - 14) + ' V' + fmt(y + height) + ' H' + fmt(x + width - 14) + ' M' + fmt(x + 14) + ' ' + fmt(y + height) + ' H' + fmt(x) + ' V' + fmt(y + height - 14) + '" stroke="' + toneLine + '" stroke-width="1" stroke-linecap="round"/>',
      '</g>'
    ].join("");
  }

  function metricChip(label, value, x, y, w) {
    return [
      '<g class="sl-metric-chip">',
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="42" rx="8" fill="rgba(0,0,0,.18)" stroke="rgba(120,255,120,.13)" />',
      '<text x="' + (x + 10) + '" y="' + (y + 15) + '" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".8">' + escapeHtml(label).toUpperCase() + '</text>',
      '<text x="' + (x + 10) + '" y="' + (y + 31) + '" font-size="13" fill="rgba(238,255,244,.94)" font-weight="800">' + escapeHtml(value) + '</text>',
      '</g>'
    ].join("");
  }

  function statusBadge(label, tone, x, y) {
    return [
      '<rect x="' + x + '" y="' + y + '" width="78" height="28" rx="8" fill="' + toneFill(tone) + '" stroke="' + toneStroke(tone) + '" />',
      '<text x="' + (x + 39) + '" y="' + (y + 18) + '" text-anchor="middle" font-size="11" fill="' + toneText(tone) + '" font-weight="900" letter-spacing=".6">' + escapeHtml(label) + '</text>'
    ].join("");
  }

  function dimLine(x1, y1, x2, y2, label) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return [
      '<g stroke="rgba(203,213,225,.34)" stroke-width="1.1" fill="none" stroke-linecap="round">',
      '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke-dasharray="5 6" />',
      '<path d="M' + x1 + ' ' + (y1 - 7) + ' L' + x1 + ' ' + (y1 + 7) + '" />',
      '<path d="M' + x2 + ' ' + (y2 - 7) + ' L' + x2 + ' ' + (y2 + 7) + '" />',
      '</g>',
      '<rect x="' + (midX - 82) + '" y="' + (midY - 22) + '" width="164" height="18" rx="6" fill="rgba(0,0,0,.24)" stroke="rgba(203,213,225,.08)" />',
      '<text x="' + midX + '" y="' + (midY - 9) + '" font-size="10" fill="rgba(203,213,225,.72)" text-anchor="middle">' + escapeHtml(label) + '</text>'
    ].join("");
  }

  function pressureRail(label, value, x, y, w, tone) {
    const ratio = clamp(value, 0, 1);
    const fillW = Math.round(w * ratio);
    return [
      '<g>',
      '<text x="' + x + '" y="' + (y - 8) + '" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".6">' + escapeHtml(label).toUpperCase() + '</text>',
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="12" rx="6" fill="rgba(0,0,0,.24)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="' + x + '" y="' + y + '" width="' + fillW + '" height="12" rx="6" fill="' + toneFill(tone) + '" stroke="' + toneStroke(tone) + '" />',
      '<path d="M' + (x + Math.round(w * .45)) + ' ' + (y - 3) + ' V' + (y + 15) + ' M' + (x + Math.round(w * .72)) + ' ' + (y - 3) + ' V' + (y + 15) + '" stroke="rgba(203,213,225,.18)" stroke-width="1" />',
      '<text x="' + x + '" y="' + (y + 28) + '" font-size="9" fill="rgba(203,213,225,.52)">SAFE</text>',
      '<text x="' + (x + Math.round(w * .48)) + '" y="' + (y + 28) + '" font-size="9" fill="rgba(203,213,225,.52)" text-anchor="middle">WATCH</text>',
      '<text x="' + (x + w) + '" y="' + (y + 28) + '" font-size="9" fill="rgba(203,213,225,.52)" text-anchor="end">RISK</text>',
      '</g>'
    ].join("");
  }

  function renderInto(target, html) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el) return false;
    ensureStyles();
    el.innerHTML = html;
    return true;
  }

  function show(options = {}, html) {
    const card = typeof options.card === "string" ? document.getElementById(options.card) : options.card;
    const wrap = typeof options.wrap === "string" ? document.getElementById(options.wrap) : options.wrap;
    const target = typeof options.target === "string" ? document.getElementById(options.target) : options.target;

    if (!target) return false;

    renderInto(target, html);

    if (card) card.hidden = false;
    if (wrap) wrap.hidden = false;

    return true;
  }

  function hide(options = {}) {
    const card = typeof options.card === "string" ? document.getElementById(options.card) : options.card;
    const wrap = typeof options.wrap === "string" ? document.getElementById(options.wrap) : options.wrap;
    const target = typeof options.target === "string" ? document.getElementById(options.target) : options.target;

    if (target) target.innerHTML = "";
    if (wrap) wrap.hidden = true;
    if (card) card.hidden = true;

    return true;
  }

  function svgToDataUri(svg) {
    if (!svg) return "";
    const text = typeof svg === "string" ? svg : svg.outerHTML;
    if (!text) return "";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
  }

  function getDataUri(target) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el) return "";
    const svg = el.querySelector("svg");
    return svg ? svgToDataUri(svg) : "";
  }






  function accessVisualPalette(exportMode) {
    return exportMode
      ? {
          shellFill: "#ffffff",
          shellStroke: "#b8cabe",
          gridStroke: "#dce8df",
          title: "#132018",
          label: "#1f7a3d",
          text: "#132018",
          muted: "#4b5563",
          whiteLine: "#2f3b35",
          faintLine: "#9aa8a0",
          tealLine: "#1f7a7a",
          tealFill: "#e7f7f5",
          safeLine: "#1f7a3d",
          safeFill: "#eaf7ef",
          watchLine: "#946200",
          watchFill: "#fff7df",
          riskLine: "#a3362b",
          riskFill: "#fff0ee",
          nodeFill: "#f8fbf8"
        }
      : {
          shellFill: "rgba(0,0,0,.10)",
          shellStroke: "rgba(120,255,120,.12)",
          gridStroke: "rgba(120,255,120,.045)",
          title: "rgba(246,255,248,.96)",
          label: "rgba(180,255,200,.68)",
          text: "rgba(238,255,244,.94)",
          muted: "rgba(203,213,225,.68)",
          whiteLine: "rgba(238,246,255,.78)",
          faintLine: "rgba(203,213,225,.34)",
          tealLine: "rgba(88,241,241,.86)",
          tealFill: "rgba(88,241,241,.08)",
          safeLine: "rgba(125,255,152,.82)",
          safeFill: "rgba(120,255,120,.10)",
          watchLine: "rgba(250,204,21,.92)",
          watchFill: "rgba(250,204,21,.12)",
          riskLine: "rgba(255,105,105,.88)",
          riskFill: "rgba(255,105,105,.13)",
          nodeFill: "rgba(0,0,0,.14)"
        };
  }

  function accessToneColors(tone, palette) {
    if (tone === "risk") return { line: palette.riskLine, fill: palette.riskFill };
    if (tone === "watch") return { line: palette.watchLine, fill: palette.watchFill };
    if (tone === "teal") return { line: palette.tealLine, fill: palette.tealFill };
    return { line: palette.safeLine, fill: palette.safeFill };
  }

  function cadAccessLockBodyIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const exportMode = !!options.exportMode;
    const palette = options.palette || accessVisualPalette(exportMode);
    const mode = String(options.mode || "fail-secure").toLowerCase();
    const state = String(options.state || "locked").toLowerCase();
    const showLegend = options.showLegend !== false;
    const activeTone = state === "released" ? "watch" : state === "unlocked" ? "teal" : "safe";
    const active = accessToneColors(activeTone, palette);

    function sx(value) { return Math.round((x + value * scale) * 10) / 10; }
    function sy(value) { return Math.round((y + value * scale) * 10) / 10; }
    function sw(value) { return Math.round(value * scale * 10) / 10; }

    const line = palette.whiteLine;
    const faint = palette.faintLine;
    const teal = palette.tealLine;
    const amber = palette.watchLine;
    const body = [
      '<g class="sl-cad-access-lock-body-icon" data-cad-icon="access-lock-body" data-lock-state="' + escapeHtml(state) + '" data-lock-mode="' + escapeHtml(mode) + '">',
      '<rect x="' + sx(20) + '" y="' + sy(18) + '" width="' + sw(10) + '" height="' + sw(144) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<path d="M' + sx(30) + ' ' + sy(56) + ' H' + sx(44) + ' M' + sx(30) + ' ' + sy(92) + ' H' + sx(44) + ' M' + sx(30) + ' ' + sy(128) + ' H' + sx(44) + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '" stroke-linecap="round"/>',
      '<rect x="' + sx(44) + '" y="' + sy(34) + '" width="' + sw(92) + '" height="' + sw(112) + '" rx="' + sw(6) + '" fill="' + palette.nodeFill + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<rect x="' + sx(54) + '" y="' + sy(44) + '" width="' + sw(72) + '" height="' + sw(92) + '" rx="' + sw(4) + '" fill="none" stroke="' + faint + '" stroke-width="' + sw(1.2) + '"/>',
      '<circle cx="' + sx(90) + '" cy="' + sy(90) + '" r="' + sw(18) + '" fill="' + active.fill + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<circle cx="' + sx(90) + '" cy="' + sy(90) + '" r="' + sw(5) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<path d="M' + sx(90) + ' ' + sy(95) + ' V' + sy(state === "locked" ? 116 : 108) + '" stroke="' + (state === "locked" ? line : active.line) + '" stroke-width="' + sw(1.5) + '" stroke-linecap="round"/>',
      '<circle cx="' + sx(58) + '" cy="' + sy(48) + '" r="' + sw(3) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.1) + '"/>',
      '<circle cx="' + sx(122) + '" cy="' + sy(48) + '" r="' + sw(3) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.1) + '"/>',
      '<circle cx="' + sx(58) + '" cy="' + sy(132) + '" r="' + sw(3) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.1) + '"/>',
      '<circle cx="' + sx(122) + '" cy="' + sy(132) + '" r="' + sw(3) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.1) + '"/>'
    ];

    if (showLegend) {
      const rows = [
        { key: "fail-safe", label: "FAIL-SAFE", tone: mode === "fail-safe" ? teal : faint, y: 42 },
        { key: "fail-secure", label: "FAIL-SECURE", tone: mode === "fail-secure" ? teal : faint, y: 72 },
        { key: "unlocked", label: "UNLOCKED", tone: state === "unlocked" ? teal : faint, y: 102 },
        { key: "locked", label: "LOCKED", tone: state === "locked" ? line : faint, y: 132 },
        { key: "released", label: "RELEASED", tone: state === "released" ? amber : faint, y: 162 }
      ];
      rows.forEach((row) => {
        const isOpen = row.key === "unlocked" || row.key === "released";
        const rx = 174;
        body.push('<rect x="' + sx(rx) + '" y="' + sy(row.y - 8) + '" width="' + sw(20) + '" height="' + sw(16) + '" rx="' + sw(2) + '" fill="none" stroke="' + row.tone + '" stroke-width="' + sw(1.5) + '"/>');
        body.push(isOpen
          ? '<path d="M' + sx(rx + 7) + ' ' + sy(row.y - 8) + ' V' + sy(row.y - 14) + ' a' + sw(5) + ' ' + sw(5) + ' 0 0 1 ' + sw(10) + ' ' + sw(-2) + '" fill="none" stroke="' + row.tone + '" stroke-width="' + sw(1.5) + '" stroke-linecap="round"/>'
          : '<path d="M' + sx(rx + 5) + ' ' + sy(row.y - 8) + ' V' + sy(row.y - 14) + ' a' + sw(5) + ' ' + sw(5) + ' 0 0 1 ' + sw(10) + ' 0 V' + sy(row.y - 8) + '" fill="none" stroke="' + row.tone + '" stroke-width="' + sw(1.5) + '" stroke-linecap="round"/>');
        body.push('<path d="M' + sx(rx + 10) + ' ' + sy(row.y - 1) + ' V' + sy(row.y + 3) + '" stroke="' + row.tone + '" stroke-width="' + sw(1.5) + '" stroke-linecap="round"/>');
        body.push('<text x="' + sx(204) + '" y="' + sy(row.y + 4) + '" fill="' + row.tone + '" font-family="Inter,Arial,sans-serif" font-size="' + sw(10) + '" font-weight="800" letter-spacing="' + sw(.6) + '">' + row.label + '</text>');
      });
    }

    body.push('</g>');
    return body.join('');
  }

  function cadAccessPowerSourceIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const exportMode = !!options.exportMode;
    const palette = options.palette || accessVisualPalette(exportMode);
    const powerState = String(options.powerState || "normal").toLowerCase();
    const battery = options.battery !== false;
    const normal = powerState === "normal" ? palette.tealLine : palette.faintLine;
    const loss = powerState === "loss" ? palette.watchLine : palette.faintLine;
    const line = palette.whiteLine;
    function sx(value) { return Math.round((x + value * scale) * 10) / 10; }
    function sy(value) { return Math.round((y + value * scale) * 10) / 10; }
    function sw(value) { return Math.round(value * scale * 10) / 10; }
    return [
      '<g class="sl-cad-access-power-source-icon" data-cad-icon="access-power-source" data-power-state="' + escapeHtml(powerState) + '">',
      '<rect x="' + sx(44) + '" y="' + sy(28) + '" width="' + sw(96) + '" height="' + sw(122) + '" rx="' + sw(6) + '" fill="' + palette.nodeFill + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<path d="M' + sx(54) + ' ' + sy(46) + ' H' + sx(130) + ' M' + sx(54) + ' ' + sy(58) + ' H' + sx(130) + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '" stroke-linecap="round"/>',
      [62,74,86,98,110,122].map((tx) => '<path d="M' + sx(tx) + ' ' + sy(48) + ' V' + sy(72) + '" stroke="' + palette.faintLine + '" stroke-width="' + sw(1.1) + '"/>').join(''),
      '<path d="M' + sx(94) + ' ' + sy(82) + ' L' + sx(80) + ' ' + sy(108) + ' H' + sx(96) + ' L' + sx(86) + ' ' + sy(134) + '" fill="none" stroke="' + (powerState === "normal" ? palette.tealLine : palette.watchLine) + '" stroke-width="' + sw(1.55) + '" stroke-linejoin="round"/>',
      '<rect x="' + sx(56) + '" y="' + sy(118) + '" width="' + sw(28) + '" height="' + sw(18) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.2) + '"/>',
      '<rect x="' + sx(100) + '" y="' + sy(118) + '" width="' + sw(28) + '" height="' + sw(18) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.2) + '"/>',
      '<text x="' + sx(54) + '" y="' + sy(110) + '" fill="' + palette.text + '" font-size="' + sw(11) + '" font-weight="800" font-family="Inter,Arial,sans-serif">AC</text>',
      '<text x="' + sx(100) + '" y="' + sy(110) + '" fill="' + palette.text + '" font-size="' + sw(11) + '" font-weight="800" font-family="Inter,Arial,sans-serif">DC</text>',
      '<path d="M' + sx(196) + ' ' + sy(50) + ' L' + sx(184) + ' ' + sy(72) + ' H' + sx(198) + ' L' + sx(188) + ' ' + sy(94) + '" fill="none" stroke="' + normal + '" stroke-width="' + sw(1.5) + '"/>',
      '<text x="' + sx(170) + '" y="' + sy(112) + '" fill="' + normal + '" font-size="' + sw(10) + '" font-weight="800" font-family="Inter,Arial,sans-serif">NORMAL</text>',
      '<path d="M' + sx(246) + ' ' + sy(50) + ' L' + sx(234) + ' ' + sy(72) + ' H' + sx(248) + ' L' + sx(238) + ' ' + sy(94) + ' M' + sx(232) + ' ' + sy(56) + ' L' + sx(252) + ' ' + sy(88) + '" fill="none" stroke="' + loss + '" stroke-width="' + sw(1.5) + '"/>',
      '<text x="' + sx(224) + '" y="' + sy(112) + '" fill="' + loss + '" font-size="' + sw(10) + '" font-weight="800" font-family="Inter,Arial,sans-serif">POWER</text>',
      '<text x="' + sx(228) + '" y="' + sy(126) + '" fill="' + loss + '" font-size="' + sw(10) + '" font-weight="800" font-family="Inter,Arial,sans-serif">LOSS</text>',
      battery ? '<rect x="' + sx(204) + '" y="' + sy(134) + '" width="' + sw(48) + '" height="' + sw(26) + '" fill="none" stroke="' + (powerState === "loss" ? palette.watchLine : line) + '" stroke-width="' + sw(1.4) + '"/>' : '',
      '</g>'
    ].join('');
  }

  function cadAccessFireAlarmReleaseIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const exportMode = !!options.exportMode;
    const palette = options.palette || accessVisualPalette(exportMode);
    const releaseState = String(options.releaseState || "idle").toLowerCase();
    const active = releaseState === "release" ? palette.watchLine : palette.tealLine;
    const line = palette.whiteLine;
    function sx(value) { return Math.round((x + value * scale) * 10) / 10; }
    function sy(value) { return Math.round((y + value * scale) * 10) / 10; }
    function sw(value) { return Math.round(value * scale * 10) / 10; }
    return [
      '<g class="sl-cad-access-fire-release-icon" data-cad-icon="access-fire-alarm-release" data-release-state="' + escapeHtml(releaseState) + '">',
      '<rect x="' + sx(44) + '" y="' + sy(28) + '" width="' + sw(88) + '" height="' + sw(122) + '" rx="' + sw(6) + '" fill="' + palette.nodeFill + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<rect x="' + sx(56) + '" y="' + sy(44) + '" width="' + sw(64) + '" height="' + sw(24) + '" rx="' + sw(3) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.4) + '"/>',
      '<text x="' + sx(72) + '" y="' + sy(61) + '" fill="' + palette.text + '" font-family="Inter,Arial,sans-serif" font-size="' + sw(11) + '" font-weight="800">FIRE</text>',
      '<rect x="' + sx(56) + '" y="' + sy(76) + '" width="' + sw(64) + '" height="' + sw(48) + '" rx="' + sw(3) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.4) + '"/>',
      '<path d="M' + sx(68) + ' ' + sy(96) + ' V' + sy(116) + ' M' + sx(108) + ' ' + sy(96) + ' V' + sy(116) + ' M' + sx(72) + ' ' + sy(112) + ' L' + sx(82) + ' ' + sy(122) + ' L' + sx(92) + ' ' + sy(112) + ' M' + sx(84) + ' ' + sy(112) + ' L' + sx(94) + ' ' + sy(122) + ' L' + sx(104) + ' ' + sy(112) + '" stroke="' + line + '" stroke-width="' + sw(1.4) + '" fill="none"/>',
      '<text x="' + sx(72) + '" y="' + sy(95) + '" fill="' + palette.text + '" font-family="Inter,Arial,sans-serif" font-size="' + sw(11) + '" font-weight="800">PULL</text>',
      '<path d="M' + sx(132) + ' ' + sy(95) + ' H' + sx(182) + '" stroke="' + active + '" stroke-width="' + sw(1.5) + '"/>',
      '<rect x="' + sx(182) + '" y="' + sy(74) + '" width="' + sw(42) + '" height="' + sw(42) + '" fill="none" stroke="' + active + '" stroke-width="' + sw(1.5) + '" stroke-dasharray="' + sw(5) + ' ' + sw(4) + '"/>',
      '<path d="M' + sx(196) + ' ' + sy(94) + ' H' + sx(208) + ' M' + sx(214) + ' ' + sy(88) + ' V' + sy(106) + ' M' + sx(208) + ' ' + sy(94) + ' L' + sx(220) + ' ' + sy(86) + ' M' + sx(224) + ' ' + sy(84) + ' V' + sy(104) + '" stroke="' + active + '" stroke-width="' + sw(1.5) + '" fill="none"/>',
      '<text x="' + sx(182) + '" y="' + sy(66) + '" fill="' + active + '" font-family="Inter,Arial,sans-serif" font-size="' + sw(11) + '" font-weight="800">RELEASE</text>',
      '</g>'
    ].join('');
  }

  function cadAccessEgressPathIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const exportMode = !!options.exportMode;
    const palette = options.palette || accessVisualPalette(exportMode);
    const egressState = String(options.egressState || "available").toLowerCase();
    const tone = egressState === "restricted" ? palette.riskLine : egressState === "released" ? palette.watchLine : palette.tealLine;
    const line = palette.whiteLine;
    function sx(value) { return Math.round((x + value * scale) * 10) / 10; }
    function sy(value) { return Math.round((y + value * scale) * 10) / 10; }
    function sw(value) { return Math.round(value * scale * 10) / 10; }
    return [
      '<g class="sl-cad-access-egress-path-icon" data-cad-icon="access-egress-path" data-egress-state="' + escapeHtml(egressState) + '">',
      '<path d="M' + sx(34) + ' ' + sy(146) + ' H' + sx(286) + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<rect x="' + sx(74) + '" y="' + sy(28) + '" width="' + sw(96) + '" height="' + sw(118) + '" fill="none" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<path d="M' + sx(84) + ' ' + sy(38) + ' H' + sx(160) + ' V' + sy(136) + ' H' + sx(84) + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '" fill="none"/>',
      '<path d="M' + sx(88) + ' ' + sy(134) + ' L' + sx(134) + ' ' + sy(110) + ' L' + sx(134) + ' ' + sy(54) + ' L' + sx(88) + ' ' + sy(38) + ' Z" fill="' + palette.nodeFill + '" stroke="' + line + '" stroke-width="' + sw(1.5) + '"/>',
      '<path d="M' + sx(108) + ' ' + sy(86) + ' H' + sx(124) + ' M' + sx(108) + ' ' + sy(86) + ' L' + sx(100) + ' ' + sy(80) + ' V' + sy(92) + ' Z" stroke="' + line + '" stroke-width="' + sw(1.5) + '" fill="none"/>',
      '<path d="M' + sx(88) + ' ' + sy(134) + ' A' + sw(52) + ' ' + sw(52) + ' 0 0 1 ' + sx(146) + ' ' + sy(124) + ' M' + sx(142) + ' ' + sy(118) + ' L' + sx(146) + ' ' + sy(124) + ' L' + sx(150) + ' ' + sy(118) + '" stroke="' + tone + '" stroke-width="' + sw(1.5) + '" fill="none" stroke-dasharray="' + sw(5) + ' ' + sw(5) + '"/>',
      '<path d="M' + sx(174) + ' ' + sy(86) + ' H' + sx(268) + ' M' + sx(254) + ' ' + sy(74) + ' L' + sx(272) + ' ' + sy(86) + ' L' + sx(254) + ' ' + sy(98) + '" stroke="' + tone + '" stroke-width="' + sw(1.7) + '" fill="none"/>',
      '</g>'
    ].join('');
  }

  function cadAccessStateTransitionFlow(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const scale = Number(options.scale || 1);
    const exportMode = !!options.exportMode;
    const palette = options.palette || accessVisualPalette(exportMode);
    const flowType = String(options.flowType || "mixed").toLowerCase();
    const emergency = flowType === "emergency" || flowType === "mixed";
    function sx(value) { return Math.round((x + value * scale) * 10) / 10; }
    function sy(value) { return Math.round((y + value * scale) * 10) / 10; }
    function sw(value) { return Math.round(value * scale * 10) / 10; }
    const line = palette.whiteLine;
    const teal = palette.tealLine;
    const amber = emergency ? palette.watchLine : palette.faintLine;
    return [
      '<g class="sl-cad-access-state-transition-flow" data-cad-icon="access-state-transition-flow" data-flow-type="' + escapeHtml(flowType) + '">',
      '<rect x="' + sx(26) + '" y="' + sy(28) + '" width="' + sw(54) + '" height="' + sw(54) + '" rx="' + sw(6) + '" fill="' + palette.nodeFill + '" stroke="' + line + '" stroke-width="' + sw(1.4) + '"/>',
      '<path d="M' + sx(54) + ' ' + sy(38) + ' L' + sx(44) + ' ' + sy(58) + ' H' + sx(56) + ' L' + sx(48) + ' ' + sy(74) + '" stroke="' + teal + '" stroke-width="' + sw(1.5) + '" fill="none"/>',
      '<path d="M' + sx(92) + ' ' + sy(55) + ' H' + sx(178) + ' M' + sx(166) + ' ' + sy(45) + ' L' + sx(182) + ' ' + sy(55) + ' L' + sx(166) + ' ' + sy(65) + '" stroke="' + teal + '" stroke-width="' + sw(1.5) + '" fill="none"/>',
      '<rect x="' + sx(194) + '" y="' + sy(28) + '" width="' + sw(54) + '" height="' + sw(54) + '" rx="' + sw(6) + '" fill="' + palette.nodeFill + '" stroke="' + line + '" stroke-width="' + sw(1.4) + '"/>',
      '<path d="M' + sx(222) + ' ' + sy(38) + ' L' + sx(212) + ' ' + sy(58) + ' H' + sx(224) + ' L' + sx(216) + ' ' + sy(74) + ' M' + sx(210) + ' ' + sy(44) + ' L' + sx(228) + ' ' + sy(68) + '" stroke="' + amber + '" stroke-width="' + sw(1.5) + '" fill="none"/>',
      '<path d="M' + sx(260) + ' ' + sy(55) + ' H' + sx(346) + ' M' + sx(334) + ' ' + sy(45) + ' L' + sx(350) + ' ' + sy(55) + ' L' + sx(334) + ' ' + sy(65) + '" stroke="' + teal + '" stroke-width="' + sw(1.5) + '" fill="none"/>',
      '<rect x="' + sx(362) + '" y="' + sy(28) + '" width="' + sw(54) + '" height="' + sw(54) + '" rx="' + sw(6) + '" fill="' + palette.nodeFill + '" stroke="' + line + '" stroke-width="' + sw(1.4) + '"/>',
      '<rect x="' + sx(378) + '" y="' + sy(42) + '" width="' + sw(22) + '" height="' + sw(26) + '" rx="' + sw(3) + '" fill="none" stroke="' + amber + '" stroke-width="' + sw(1.5) + '"/>',
      '<path d="M' + sx(384) + ' ' + sy(52) + ' H' + sx(394) + ' M' + sx(389) + ' ' + sy(52) + ' V' + sy(62) + '" stroke="' + amber + '" stroke-width="' + sw(1.5) + '"/>',
      '<path d="M' + sx(32) + ' ' + sy(118) + ' H' + sx(160) + ' M' + sx(148) + ' ' + sy(108) + ' L' + sx(164) + ' ' + sy(118) + ' L' + sx(148) + ' ' + sy(128) + '" stroke="' + teal + '" stroke-width="' + sw(1.5) + '" fill="none"/>',
      '<path d="M' + sx(186) + ' ' + sy(118) + ' H' + sx(346) + ' M' + sx(334) + ' ' + sy(108) + ' L' + sx(350) + ' ' + sy(118) + ' L' + sx(334) + ' ' + sy(128) + '" stroke="' + amber + '" stroke-width="' + sw(1.5) + '" fill="none" stroke-dasharray="' + sw(8) + ' ' + sw(6) + '"/>',
      '<text x="' + sx(234) + '" y="' + sy(144) + '" fill="' + palette.text + '" font-family="Inter,Arial,sans-serif" font-size="' + sw(10) + '" font-weight="800" letter-spacing="' + sw(.6) + '">NORMAL / EMERGENCY FLOW</text>',
      '</g>'
    ].join('');
  }

  function buildFailSafeStateDiagramSvg(metrics = {}) {
    const exportMode = !!metrics.exportMode;
    const palette = accessVisualPalette(exportMode);
    const status = statusLabel(metrics.status || "WATCH");
    const statusToneValue = statusTone(status);
    const recommendation = String(metrics.recommendation || "CONDITIONAL").toUpperCase();
    const mode = recommendation.includes("FAIL-SAFE") ? "fail-safe" : recommendation.includes("FAIL-SECURE") ? "fail-secure" : "conditional";
    const powerLossLabel = String(metrics.powerLossLabel || "Power loss behavior not documented");
    const fireLabel = String(metrics.fireLabel || "Fire release behavior not documented");
    const releaseEventLabel = String(metrics.releaseEventLabel || "Release event not documented");
    const standbyPowerLabel = String(metrics.standbyPowerLabel || "Standby power not documented");
    const risk = String(metrics.risk || "Decision risk pending");
    const confidence = String(metrics.confidence || "Pending");
    const score = String(metrics.score ?? "Pending");
    const lockState = recommendation.includes("FAIL-SAFE") ? "unlocked" : recommendation.includes("FAIL-SECURE") ? "locked" : "released";
    const egressState = statusToneValue === "risk" ? "restricted" : lockState === "locked" ? "available" : "released";
    const powerState = powerLossLabel.toLowerCase().includes("loss") || powerLossLabel.toLowerCase().includes("outage") ? "loss" : "normal";
    const releaseState = fireLabel.toLowerCase().includes("yes") || releaseEventLabel.toLowerCase().includes("release") || releaseEventLabel.toLowerCase().includes("fire") ? "release" : "idle";
    const tone = accessToneColors(statusToneValue, palette);

    function badge(label, toneName, x, y, w) {
      const c = accessToneColors(toneName, palette);
      return [
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" rx="9" fill="' + c.fill + '" stroke="' + c.line + '" stroke-width="1.2" />',
        '<text x="' + (x + w / 2) + '" y="' + (y + 20) + '" font-size="10.5" fill="' + c.line + '" font-weight="950" text-anchor="middle" font-family="Inter,Arial,sans-serif">' + escapeHtml(label) + '</text>'
      ].join('');
    }

    function nodeFrame(title, x, y, w, h, toneName) {
      const c = accessToneColors(toneName, palette);
      return [
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="14" fill="' + (exportMode ? '#ffffff' : 'rgba(0,0,0,.13)') + '" stroke="' + c.line + '" stroke-width="' + (exportMode ? '1.35' : '1.05') + '" />',
        '<text x="' + (x + 14) + '" y="' + (y + 23) + '" font-size="10" fill="' + c.line + '" font-weight="950" font-family="Inter,Arial,sans-serif" letter-spacing=".8">' + escapeHtml(title) + '</text>'
      ].join('');
    }

    function arrow(x1, y1, x2, y2, color) {
      return '<path d="M' + x1 + ' ' + y1 + ' H' + x2 + ' M' + (x2 - 12) + ' ' + (y2 - 10) + ' L' + x2 + ' ' + y2 + ' L' + (x2 - 12) + ' ' + (y2 + 10) + '" stroke="' + color + '" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />';
    }

    return [
      '<div class="access-control-planning-visual-shell access-fail-safe-state-visual-shell" data-access-control-modern-visual="fail-safe-state-diagram"' + (exportMode ? ' data-export-palette="print-safe"' : '') + '>',
      '<svg viewBox="0 0 760 460" role="img" aria-label="Fail-Safe vs Fail-Secure state diagram" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridFailSafeStateV1" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="' + palette.gridStroke + '" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="392" rx="16" fill="' + palette.shellFill + '" stroke="' + palette.shellStroke + '" stroke-width="1.15" />',
      '<rect x="36" y="36" width="688" height="368" rx="12" fill="url(#accGridFailSafeStateV1)" stroke="' + palette.gridStroke + '" stroke-width="1" />',
      '<text x="52" y="62" font-size="11" fill="' + palette.label + '" letter-spacing="1.4" font-family="Inter,Arial,sans-serif">FAIL-SAFE VS FAIL-SECURE</text>',
      '<text x="52" y="85" font-size="19" fill="' + palette.title + '" font-weight="650" font-family="Inter,Arial,sans-serif">Power loss, release path, lock state, and egress outcome</text>',
      badge(status, statusToneValue, 604, 52, 98),
      nodeFrame('POWER SOURCE', 52, 116, 174, 146, powerState === 'loss' ? 'watch' : 'teal'),
      nodeFrame('LOCK BEHAVIOR', 292, 116, 178, 146, statusToneValue),
      nodeFrame('EGRESS OUTCOME', 536, 116, 172, 146, egressState === 'restricted' ? 'risk' : 'teal'),
      cadAccessPowerSourceIcon({ x: 50, y: 128, scale: .56, powerState, battery: !standbyPowerLabel.toLowerCase().includes('none'), exportMode, palette }),
      cadAccessLockBodyIcon({ x: 282, y: 126, scale: .58, mode, state: lockState, showLegend: false, exportMode, palette }),
      cadAccessEgressPathIcon({ x: 526, y: 132, scale: .55, egressState, exportMode, palette }),
      arrow(226, 190, 286, 190, palette.tealLine),
      arrow(470, 190, 530, 190, palette.tealLine),
      nodeFrame('FIRE / RELEASE INPUT', 52, 284, 222, 76, releaseState === 'release' ? 'watch' : 'teal'),
      cadAccessFireAlarmReleaseIcon({ x: 64, y: 288, scale: .42, releaseState, exportMode, palette }),
      '<text x="' + 162 + '" y="' + 321 + '" fill="' + palette.text + '" font-size="9.2" font-weight="850" font-family="Inter,Arial,sans-serif">' + escapeHtml(releaseEventLabel) + '</text>',
      cadAccessStateTransitionFlow({ x: 310, y: 272, scale: .66, flowType: releaseState === 'release' ? 'emergency' : 'normal', exportMode, palette }),
      '<rect x="52" y="374" width="656" height="28" rx="8" fill="' + (exportMode ? '#f8fbf8' : 'rgba(0,0,0,.12)') + '" stroke="' + palette.faintLine + '" stroke-width="1" />',
      '<text x="66" y="392" fill="' + palette.muted + '" font-size="8.5" font-weight="850" font-family="Inter,Arial,sans-serif">RECOMMENDATION</text>',
      '<text x="176" y="392" fill="' + tone.line + '" font-size="10" font-weight="950" font-family="Inter,Arial,sans-serif">' + escapeHtml(recommendation) + '</text>',
      '<text x="328" y="392" fill="' + palette.muted + '" font-size="8.5" font-weight="850" font-family="Inter,Arial,sans-serif">CONFIDENCE</text>',
      '<text x="420" y="392" fill="' + palette.text + '" font-size="10" font-weight="900" font-family="Inter,Arial,sans-serif">' + escapeHtml(confidence) + ' / SCORE ' + escapeHtml(score) + '</text>',
      '<text x="566" y="392" fill="' + palette.muted + '" font-size="8.5" font-weight="850" font-family="Inter,Arial,sans-serif">RISK</text>',
      '<text x="606" y="392" fill="' + palette.text + '" font-size="9.2" font-weight="850" font-family="Inter,Arial,sans-serif">' + escapeHtml(risk).slice(0, 24) + '</text>',
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> This state diagram compares normal power, power loss, fire/release input, lock behavior, and egress outcome. It documents planning behavior only; final release requirements still need project and AHJ/code review.</p>',
      '</div>'
    ].join('');
  }

  function renderFailSafeState(options = {}) {
    return show(options, buildFailSafeStateDiagramSvg(options.metrics || {}));
  }

  function buildScopePlannerBranchMapSvg(metrics = {}) {
    const exportMode = !!metrics.exportMode;
    const totalScopes = Math.max(0, Math.round(Number(metrics.totalScopes || 0)));
    const coreCount = Math.max(0, Math.round(Number(metrics.coreCount || 0)));
    const elevatorCount = Math.max(0, Math.round(Number(metrics.elevatorCount || 0)));
    const antiPassbackCount = Math.max(0, Math.round(Number(metrics.antiPassbackCount || 0)));
    const specialCount = Math.max(0, Math.round(Number(metrics.specialCount || 0)));
    const authorityCount = Math.max(0, Math.round(Number(metrics.authorityCount || 0)));
    const completedChecks = Math.max(0, Math.round(Number(metrics.completedChecks || 0)));
    const plannedReaders = Math.max(0, Math.round(Number(metrics.plannedReaders || 0)));
    const plannedLocks = Math.max(0, Math.round(Number(metrics.plannedLocks || 0)));
    const activeBranch = String(metrics.activeBranch || "core");
    const activeLabel = metrics.activeLabel || "Active Scope";
    const statusToneValue = authorityCount > 0 ? "watch" : totalScopes > 0 ? "safe" : "watch";
    const statusText = authorityCount > 0 ? "WATCH" : totalScopes > 0 ? "SAFE" : "PLANNING";

    const palette = exportMode
      ? {
          shellFill: "#ffffff",
          shellStroke: "#b8cabe",
          gridStroke: "#dce8df",
          title: "#132018",
          label: "#1f7a3d",
          text: "#132018",
          muted: "#4b5563",
          line: "#8ba596",
          timeline: "#9ab0a4",
          timelineFill: "#f2faf5",
          safeLine: "#1f7a3d",
          safeFill: "#eaf7ef",
          watchLine: "#946200",
          watchFill: "#fff7df",
          riskLine: "#a3362b",
          riskFill: "#fff0ee",
          nodeMutedLine: "#9aa8a0",
          nodeMutedFill: "#f6f8f6"
        }
      : {
          shellFill: "rgba(0,0,0,.10)",
          shellStroke: "rgba(120,255,120,.12)",
          gridStroke: "rgba(120,255,120,.045)",
          title: "rgba(246,255,248,.96)",
          label: "rgba(180,255,200,.68)",
          text: "rgba(238,255,244,.94)",
          muted: "rgba(203,213,225,.68)",
          line: "rgba(203,213,225,.24)",
          timeline: "rgba(203,213,225,.24)",
          timelineFill: "rgba(120,255,120,.12)",
          safeLine: "rgba(125,255,152,.82)",
          safeFill: "rgba(120,255,120,.10)",
          watchLine: "rgba(255,204,102,.76)",
          watchFill: "rgba(255,204,102,.10)",
          riskLine: "rgba(255,105,105,.88)",
          riskFill: "rgba(255,105,105,.13)",
          nodeMutedLine: "rgba(203,213,225,.30)",
          nodeMutedFill: "rgba(0,0,0,.14)"
        };

    function branchTone(key, count) {
      if (activeBranch === key) return "safe";
      if (count > 0) return "watch";
      return "muted";
    }

    function toneLine(key, count) {
      const tone = branchTone(key, count);
      if (tone === "safe") return palette.safeLine;
      if (tone === "watch") return palette.watchLine;
      return palette.nodeMutedLine;
    }

    function toneFillFor(key, count) {
      const tone = branchTone(key, count);
      if (tone === "safe") return palette.safeFill;
      if (tone === "watch") return palette.watchFill;
      return palette.nodeMutedFill;
    }

    function node(key, label, sublabel, count, x, y, w) {
      const line = toneLine(key, count);
      const fill = toneFillFor(key, count);
      const selected = activeBranch === key ? "ACTIVE" : count > 0 ? count + " saved" : "not used";

      return [
        '<g data-scope-branch-node="' + escapeHtml(key) + '">',
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="58" rx="11" fill="' + fill + '" stroke="' + line + '" stroke-width="' + (exportMode ? '1.45' : '1.15') + '" />',
        '<text x="' + (x + 12) + '" y="' + (y + 21) + '" font-size="10.5" fill="' + palette.text + '" font-weight="900">' + escapeHtml(label) + '</text>',
        '<text x="' + (x + 12) + '" y="' + (y + 38) + '" font-size="8.4" fill="' + palette.muted + '" font-weight="800">' + escapeHtml(sublabel) + '</text>',
        '<text x="' + (x + w - 12) + '" y="' + (y + 38) + '" font-size="8.4" fill="' + line + '" font-weight="900" text-anchor="end">' + escapeHtml(selected) + '</text>',
        '</g>'
      ].join("");
    }

    function link(x1, y1, x2, y2, key, count) {
      return '<path d="M' + x1 + ' ' + y1 + ' C' + ((x1 + x2) / 2) + ' ' + y1 + ', ' + ((x1 + x2) / 2) + ' ' + y2 + ', ' + x2 + ' ' + y2 + '" fill="none" stroke="' + toneLine(key, count) + '" stroke-width="' + (exportMode ? '1.6' : '1.25') + '" stroke-dasharray="6 7" stroke-linecap="round" />';
    }

    function scopeMetricChip(label, value, x, y, w) {
      return [
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="48" rx="8" fill="' + (exportMode ? '#f8fbf8' : 'rgba(0,0,0,.13)') + '" stroke="' + (exportMode ? '#9fb4a7' : 'rgba(125,255,152,.26)') + '" stroke-width="' + (exportMode ? '1.15' : '1') + '" />',
        '<text x="' + (x + 10) + '" y="' + (y + 18) + '" font-size="8" fill="' + palette.muted + '" font-weight="900" letter-spacing=".6">' + escapeHtml(label).toUpperCase() + '</text>',
        '<text x="' + (x + 10) + '" y="' + (y + 37) + '" font-size="15" fill="' + palette.safeLine + '" font-weight="950">' + escapeHtml(value) + '</text>'
      ].join("");
    }

    function scopeStatusBadge(label, tone, x, y) {
      const line = tone === "risk" ? palette.riskLine : tone === "watch" ? palette.watchLine : palette.safeLine;
      const fill = tone === "risk" ? palette.riskFill : tone === "watch" ? palette.watchFill : palette.safeFill;

      return [
        '<rect x="' + x + '" y="' + y + '" width="90" height="30" rx="9" fill="' + fill + '" stroke="' + line + '" stroke-width="1.2" />',
        '<text x="' + (x + 45) + '" y="' + (y + 20) + '" font-size="10.5" fill="' + line + '" font-weight="950" text-anchor="middle">' + escapeHtml(label) + '</text>'
      ].join("");
    }

    return [
      '<div class="access-control-planning-visual-shell access-scope-branch-map-shell" data-access-control-modern-visual="scope-planner-branch-map"' + (exportMode ? ' data-export-palette="print-safe"' : '') + '>',
      '<svg viewBox="0 0 760 388" role="img" aria-label="Access Scope Planner branch map visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridScopeBranchV2" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="' + palette.gridStroke + '" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="340" rx="16" fill="' + palette.shellFill + '" stroke="' + palette.shellStroke + '" stroke-width="' + (exportMode ? '1.25' : '1') + '" />',
      '<rect x="36" y="36" width="688" height="316" rx="12" fill="url(#accGridScopeBranchV2)" stroke="' + palette.line + '" stroke-width="1" />',
      '<text x="52" y="62" font-size="11" fill="' + palette.label + '" letter-spacing="1.4">ACCESS SCOPE PLANNER</text>',
      '<text x="52" y="84" font-size="19" fill="' + palette.title + '" font-weight="650">Scope ledger, core pipeline, and specialty branch map</text>',
      scopeStatusBadge(statusText, statusToneValue, 616, 51),

      '<rect x="278" y="112" width="204" height="72" rx="14" fill="' + palette.safeFill + '" stroke="' + palette.safeLine + '" stroke-width="1.35" />',
      '<text x="380" y="139" font-size="12" fill="' + palette.text + '" font-weight="950" text-anchor="middle">SCOPE LEDGER</text>',
      '<text x="380" y="158" font-size="9.4" fill="' + palette.muted + '" font-weight="800" text-anchor="middle">' + escapeHtml(activeLabel) + '</text>',
      '<text x="380" y="176" font-size="9.4" fill="' + palette.safeLine + '" font-weight="900" text-anchor="middle">' + totalScopes + ' scopes / ' + completedChecks + ' checks</text>',

      link(278, 148, 168, 148, "core", coreCount),
      link(482, 148, 592, 148, "elevator", elevatorCount),
      link(278, 176, 168, 246, "antiPassback", antiPassbackCount),
      link(482, 176, 592, 246, "special", specialCount),

      node("core", "Core Door Pipeline", "Fail-state / readers / locks / panels", coreCount, 52, 119, 192),
      node("elevator", "Elevator Readers", "Banks / DCS / floor access", elevatorCount, 516, 119, 192),
      node("antiPassback", "Anti-Passback", "Zones / paired entry-exit reads", antiPassbackCount, 52, 220, 192),
      node("special", "Special Locking", "Egress / release / AHJ review", specialCount, 516, 220, 192),

      '<path d="M172 206 H588" stroke="' + palette.timeline + '" stroke-width="1.25" stroke-dasharray="6 7" />',
      '<circle cx="266" cy="206" r="5" fill="' + palette.timelineFill + '" stroke="' + palette.safeLine + '" />',
      '<circle cx="380" cy="206" r="5" fill="' + palette.timelineFill + '" stroke="' + palette.safeLine + '" />',
      '<circle cx="494" cy="206" r="5" fill="' + palette.timelineFill + '" stroke="' + palette.safeLine + '" />',
      '<text x="266" y="224" font-size="9" fill="' + palette.muted + '" text-anchor="middle">define</text>',
      '<text x="380" y="224" font-size="9" fill="' + palette.muted + '" text-anchor="middle">branch</text>',
      '<text x="494" y="224" font-size="9" fill="' + palette.muted + '" text-anchor="middle">continue</text>',

      scopeMetricChip("scopes", String(totalScopes), 74, 304, 96),
      scopeMetricChip("readers", String(plannedReaders), 190, 304, 96),
      scopeMetricChip("locks", String(plannedLocks), 306, 304, 96),
      scopeMetricChip("specialty", String(elevatorCount + antiPassbackCount + specialCount), 422, 304, 108),
      scopeMetricChip("review", String(authorityCount), 550, 304, 96),

      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Scope Planner is the Access Control entry lane. Use this map to confirm whether each saved scope continues through the core pipeline or branches into elevator, anti-passback, or special-locking validation.</p>',
      '</div>'
    ].join("");
  }

  function cadCredentialFormatBitCardIcon(options = {}) {
    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const width = Math.max(520, Number(options.width || 650));
    const height = Math.max(230, Number(options.height || 250));
    const tone = options.tone || "safe";
    const formatLabel = options.formatLabel == null ? "Credential Format" : String(options.formatLabel);
    const bits = Math.max(8, Math.min(64, Math.round(Number(options.bits || 26))));
    const usableBits = Math.max(1, Math.min(bits - 2, Math.round(Number(options.usableBits || bits - 2))));
    const fcDigits = Math.max(0, Math.round(Number(options.fcDigits || 0)));
    const cardDigits = Math.max(1, Math.round(Number(options.cardDigits || 1)));
    const population = options.population == null ? "-" : String(options.population);
    const utilization = clamp(Number(options.utilization || 0) / 100, 0, 1);
    const capacityLabel = options.capacityLabel == null ? "-" : String(options.capacityLabel);

    const line = "rgba(203,213,225,.54)";
    const softLine = "rgba(203,213,225,.24)";
    const text = "rgba(238,255,244,.94)";
    const muted = "rgba(203,213,225,.72)";
    const shellFill = "rgba(0,0,0,.12)";
    const frameLine = "rgba(120,255,120,.18)";
    const safeLine = "rgba(125,255,152,.82)";
    const safeFill = "rgba(120,255,120,.10)";
    const watchLine = "rgba(255,204,102,.92)";
    const watchFill = "rgba(255,204,102,.13)";
    const riskLine = "rgba(255,105,105,.88)";
    const riskFill = "rgba(255,105,105,.13)";
    const toneLine = tone === "risk" ? riskLine : tone === "watch" ? watchLine : safeLine;
    const toneFillValue = tone === "risk" ? riskFill : tone === "watch" ? watchFill : safeFill;

    function fmt(value) {
      return Math.round(Number(value) * 10) / 10;
    }

    function esc(value) {
      return escapeHtml(value == null ? "" : String(value));
    }

    function estimateFacilityBits() {
      if (bits === 26) return 8;
      if (fcDigits <= 0) return Math.max(1, Math.round(usableBits * .25));
      const byDigits = Math.ceil(Math.log2(Math.pow(10, fcDigits)));
      return Math.max(1, Math.min(usableBits - 1, byDigits));
    }

    const parityBits = bits >= 10 ? 2 : 0;
    const dataStart = parityBits ? 1 : 0;
    const dataEnd = parityBits ? bits - 2 : bits - 1;
    const availableDataBits = Math.max(1, dataEnd - dataStart + 1);
    const facilityBits = Math.max(1, Math.min(availableDataBits - 1, estimateFacilityBits()));
    const cardBits = Math.max(1, availableDataBits - facilityBits);
    const facilityStart = dataStart;
    const facilityEnd = facilityStart + facilityBits - 1;
    const cardStart = facilityEnd + 1;
    const cardEnd = dataEnd;

    const pad = 16;
    const titleY = y + 26;
    const bitLabelY = y + 72;
    const rowX = x + pad;
    const rowY = y + 92;
    const rowW = width - pad * 2;
    const gap = bits <= 26 ? 3 : bits <= 37 ? 2 : 1.2;
    const cellW = Math.max(5.2, (rowW - gap * (bits - 1)) / bits);
    const cellH = 31;
    const numberSize = bits <= 32 ? 7.2 : bits <= 44 ? 6.1 : 0;
    const cells = [];
    const numbers = [];

    function bitKind(index) {
      if (parityBits && (index === 0 || index === bits - 1)) return "parity";
      if (index >= facilityStart && index <= facilityEnd) return "facility";
      return "card";
    }

    for (let i = 0; i < bits; i += 1) {
      const bx = rowX + i * (cellW + gap);
      const kind = bitKind(i);
      const fill = kind === "parity" ? watchFill : kind === "facility" ? toneFillValue : "rgba(238,246,255,.025)";
      const stroke = kind === "parity" ? watchLine : kind === "facility" ? toneLine : "rgba(238,246,255,.30)";

      cells.push('<rect x="' + fmt(bx) + '" y="' + fmt(rowY) + '" width="' + fmt(cellW) + '" height="' + cellH + '" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".95"/>');

      if (numberSize) {
        numbers.push('<text x="' + fmt(bx + cellW / 2) + '" y="' + fmt(rowY - 7) + '" fill="' + muted + '" font-size="' + numberSize + '" font-weight="800" font-family="Inter,Arial,sans-serif" text-anchor="middle">' + (i + 1) + '</text>');
      }
    }

    function centerFor(start, end) {
      const sx = rowX + start * (cellW + gap);
      const ex = rowX + end * (cellW + gap) + cellW;
      return (sx + ex) / 2;
    }

    function bracket(start, end, label, stroke, textFill) {
      const sx = rowX + start * (cellW + gap);
      const ex = rowX + end * (cellW + gap) + cellW;
      const by = rowY + cellH + 18;

      return [
        '<path d="M' + fmt(sx) + ' ' + fmt(by - 9) + ' V' + fmt(by) + ' H' + fmt(ex) + ' V' + fmt(by - 9) + '" fill="none" stroke="' + stroke + '" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>',
        '<text x="' + fmt((sx + ex) / 2) + '" y="' + fmt(by + 16) + '" fill="' + textFill + '" font-size="8.2" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="middle">' + esc(label) + '</text>'
      ].join("");
    }

    function metric(xx, yy, ww, label, value, stroke, fill) {
      return [
        '<rect x="' + fmt(xx) + '" y="' + fmt(yy) + '" width="' + fmt(ww) + '" height="38" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1"/>',
        '<text x="' + fmt(xx + 10) + '" y="' + fmt(yy + 16) + '" fill="' + muted + '" font-size="7.8" font-weight="800" font-family="Inter,Arial,sans-serif">' + esc(label) + '</text>',
        '<text x="' + fmt(xx + 10) + '" y="' + fmt(yy + 30) + '" fill="' + stroke + '" font-size="10.4" font-weight="900" font-family="Inter,Arial,sans-serif">' + esc(value) + '</text>'
      ].join("");
    }

    const fcLabel = "FACILITY CODE / BITS " + (facilityStart + 1) + "-" + (facilityEnd + 1) + " / " + facilityBits + " BITS";
    const cardLabel = "CARD NUMBER / BITS " + (cardStart + 1) + "-" + (cardEnd + 1) + " / " + cardBits + " BITS";
    const leftParity = bits === 26 ? "Even / bits 2-13" : "Verify map";
    const rightParity = bits === 26 ? "Odd / bits 14-25" : "Verify map";
    const metricY = y + height - 62;
    const capacityW = Math.max(3, Math.round((width - pad * 2) * utilization));

    return [
      '<g class="sl-cad-credential-format-bit-card" data-cad-icon="credential-format-bit-card" data-cad-detail="dynamic-bit-layout" aria-label="Dynamic credential format bit card">',
      '<rect x="' + fmt(x) + '" y="' + fmt(y) + '" width="' + fmt(width) + '" height="' + fmt(height) + '" rx="14" fill="' + shellFill + '" stroke="' + frameLine + '" stroke-width="1.15"/>',
      '<rect x="' + fmt(x + 10) + '" y="' + fmt(y + 10) + '" width="' + fmt(width - 20) + '" height="' + fmt(height - 20) + '" rx="10" fill="none" stroke="' + frameLine + '" stroke-width=".8"/>',
      '<text x="' + fmt(x + pad) + '" y="' + fmt(titleY) + '" fill="' + text + '" font-size="14" font-weight="900" font-family="Inter,Arial,sans-serif">' + esc(formatLabel.toUpperCase()) + ' / ' + bits + '-BIT FORMAT</text>',
      '<text x="' + fmt(x + pad) + '" y="' + fmt(titleY + 18) + '" fill="' + muted + '" font-size="8.8" font-weight="800" font-family="Inter,Arial,sans-serif">Dynamic bit layout / facility code / card number / parity structure</text>',
      '<path d="M' + fmt(x + pad) + ' ' + fmt(y + 57) + ' H' + fmt(x + width - pad) + '" stroke="' + softLine + '" stroke-width=".9" stroke-linecap="round"/>',
      '<text x="' + fmt(x + pad) + '" y="' + fmt(bitLabelY) + '" fill="' + toneLine + '" font-size="9.5" font-weight="900" font-family="Inter,Arial,sans-serif" letter-spacing=".8">BIT LAYOUT</text>',
      numbers.join(""),
      cells.join(""),
      parityBits ? '<text x="' + fmt(centerFor(0, 0)) + '" y="' + fmt(rowY + 20) + '" fill="' + watchLine + '" font-size="8" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="middle">P</text>' : '',
      '<text x="' + fmt(centerFor(facilityStart, facilityEnd)) + '" y="' + fmt(rowY + 20) + '" fill="' + toneLine + '" font-size="8.5" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="middle">FC</text>',
      '<text x="' + fmt(centerFor(cardStart, cardEnd)) + '" y="' + fmt(rowY + 20) + '" fill="' + text + '" font-size="8.5" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="middle">CARD #</text>',
      parityBits ? '<text x="' + fmt(centerFor(bits - 1, bits - 1)) + '" y="' + fmt(rowY + 20) + '" fill="' + watchLine + '" font-size="8" font-weight="900" font-family="Inter,Arial,sans-serif" text-anchor="middle">P</text>' : '',
      bracket(facilityStart, facilityEnd, fcLabel, toneLine, toneLine),
      bracket(cardStart, cardEnd, cardLabel, line, toneLine),
      parityBits ? metric(x + pad, metricY, 136, "BIT 1", leftParity, watchLine, watchFill) : '',
      parityBits ? metric(x + pad + 148, metricY, 136, "BIT " + bits, rightParity, watchLine, watchFill) : '',
      metric(x + width - pad - 256, metricY, 74, "TOTAL", bits, toneLine, toneFillValue),
      metric(x + width - pad - 170, metricY, 74, "FACILITY", facilityBits, toneLine, toneFillValue),
      metric(x + width - pad - 84, metricY, 84, "CARD #", cardBits, toneLine, toneFillValue),
      '<rect x="' + fmt(x + pad) + '" y="' + fmt(y + height - 12) + '" width="' + fmt(width - pad * 2) + '" height="5" rx="3" fill="rgba(0,0,0,.20)" stroke="' + softLine + '" stroke-width=".6"/>',
      '<rect x="' + fmt(x + pad) + '" y="' + fmt(y + height - 12) + '" width="' + fmt(capacityW) + '" height="5" rx="3" fill="' + toneLine + '" opacity=".72"/>',
      '<text x="' + fmt(x + pad) + '" y="' + fmt(y + height - 18) + '" fill="' + muted + '" font-size="7.5" font-weight="800" font-family="Inter,Arial,sans-serif">POP ' + esc(population) + ' / CAP ' + esc(capacityLabel) + '</text>',
      '</g>'
    ].join("");
  }

  function buildCredentialFormatSvg(metrics = {}) {
    const tone = statusTone(metrics.status || "PENDING");
    const statusText = statusLabel(metrics.status || "PENDING");
    const fmt = String(metrics.fmt || "decimal").toLowerCase();
    const capacityLabel = fmt === "binary" ? (metrics.totalBinaryLabel || "-") : (metrics.totalDecimalLabel || "-");
    const formatLabel = metrics.formatLabel || (fmt === "binary" ? "Binary" : "Decimal");

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="credential-format-helper">',
      '<svg viewBox="0 0 760 370" role="img" aria-label="Credential format bit-card visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridCredentialBitCardV1" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="322" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="298" rx="12" fill="url(#accGridCredentialBitCardV1)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">CREDENTIAL FORMAT HELPER</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Dynamic bit layout, parity fields, and numbering capacity</text>',
      statusBadge(statusText, tone, 616, 51),
      cadCredentialFormatBitCardIcon({ x: 58, y: 102, width: 644, height: 218, tone, formatLabel, bits: metrics.bits, usableBits: metrics.usableBits, fcDigits: metrics.fcDigits, cardDigits: metrics.cardDigits, utilization: metrics.utilization, population: metrics.population, capacityLabel }),
      '<text x="58" y="336" font-size="10" fill="rgba(203,213,225,.62)">Visual ranges are planning anatomy. Verify manufacturer-specific bit maps before programming a live credential format.</text>',
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> The bit-card visual adapts to the selected bit length and estimated facility/card-number allocation while preserving the existing calculator capacity math.</p>',
      '</div>'
    ].join("");
  }

  function buildDoorCableSvg(metrics = {}) {
    const tone = statusTone(metrics.status || metrics.difficulty);
    const pressure = clamp(Number(metrics.cableDensity || 0) / 3.2, 0.06, 1);
    const statusText = statusLabel(metrics.status || metrics.difficulty);
    const cableTone = pressure > .72 ? "risk" : pressure > .45 ? "watch" : "safe";
    const pathStroke = cableTone === "risk" ? "rgba(255,150,150,.80)" : cableTone === "watch" ? "rgba(255,214,120,.82)" : "rgba(125,255,152,.82)";
    const cableCount = Math.max(1, Math.min(5, Math.round(Number(metrics.cables || 1))));
    const cableOffsets = Array.from({ length: cableCount }, (_, index) => (index - (cableCount - 1) / 2) * 5);
    const routedLabel = metrics.routedLabel || "?";

    function cablePath(offset) {
      const o = Number(offset || 0);
      return '<path d="M150 ' + (163 + o) + ' H268 V118 H496 V163 H610" fill="none" stroke="' + pathStroke + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />';
    }

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-cable-length">',
      '<svg viewBox="0 0 760 326" role="img" aria-label="Door cable routing planning visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs>',
      '<pattern id="accGridCableV3" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern>',
      '<marker id="accArrowCableV3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="rgba(203,213,225,.48)"/></marker>',
      '</defs>',
      '<rect x="24" y="24" width="712" height="278" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="254" rx="12" fill="url(#accGridCableV3)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">ROUTING TAKEOFF</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Door cable path, slack, and takeoff pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      '<g opacity=".96">',
      '<rect x="66" y="137" width="84" height="52" rx="7" fill="rgba(120,255,120,.065)" stroke="rgba(120,255,120,.30)" />',
      '<path d="M78 151 H138 M78 162 H126 M78 173 H136" stroke="rgba(203,213,225,.32)" stroke-width="1" />',
      '<text x="108" y="209" font-size="10" fill="rgba(203,213,225,.64)" text-anchor="middle">PANEL / SOURCE</text>',
      '<rect x="610" y="137" width="84" height="52" rx="7" fill="rgba(120,255,120,.055)" stroke="rgba(120,255,120,.30)" />',
      '<path d="M638 145 V181 M638 145 H676 V181 H638" stroke="rgba(203,213,225,.35)" stroke-width="1.2" fill="none" />',
      '<circle cx="668" cy="163" r="2" fill="rgba(125,255,152,.78)" />',
      '<text x="652" y="209" font-size="10" fill="rgba(203,213,225,.64)" text-anchor="middle">CONTROLLED DOOR</text>',
      '</g>',
      '<path d="M150 163 H610" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="5 7" marker-end="url(#accArrowCableV3)" />',
      cableOffsets.map(cablePath).join(""),
      '<circle cx="268" cy="118" r="5" fill="rgba(0,0,0,.22)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="496" cy="118" r="5" fill="rgba(0,0,0,.22)" stroke="rgba(125,255,152,.72)" />',
      '<path d="M614 165 C642 136, 672 137, 675 164" fill="none" stroke="rgba(203,213,225,.42)" stroke-width="1.3" stroke-dasharray="4 5" />',
      '<text x="640" y="129" font-size="10" fill="rgba(203,213,225,.60)">service slack</text>',
      dimLine(150, 230, 610, 230, "straight-line distance: " + (metrics.distanceLabel || "?")),
      '<path d="M382 118 L430 93" stroke="rgba(203,213,225,.30)" stroke-width="1" />',
      '<text x="436" y="94" font-size="11" fill="rgba(238,255,244,.82)" font-weight="800">routing factor</text>',
      '<text x="436" y="109" font-size="10" fill="rgba(203,213,225,.62)">' + escapeHtml(metrics.routingLabel || "?") + ' / routed ' + escapeHtml(routedLabel) + '</text>',
      pressureRail("takeoff pressure", pressure, 52, 254, 220, cableTone),
      metricChip("total cable", metrics.totalAllDoorsLabel || "?", 296, 244, 126),
      metricChip("per door", metrics.perDoorTotalLabel || "?", 436, 244, 116),
      metricChip("slack", metrics.slackLabel || "?", 566, 244, 110),
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> This is a planning-scale routing overlay. Use it to compare straight-line distance, routing factor, service slack, and total cable takeoff pressure before field routing is finalized.</p>',
      '</div>'
    ].join("");
  }

  function buildDoorCountSvg(metrics = {}) {
    const tone = statusTone(metrics.status);
    const statusText = statusLabel(metrics.status);
    const perimeter = Math.max(0, Number(metrics.perimeterDoors || 0));

    function contributionValue(raw, fallback) {
      const direct = Number(raw);
      if (Number.isFinite(direct)) return Math.max(0, direct);
      const backfill = Number(fallback);
      if (Number.isFinite(backfill)) return Math.max(0, backfill);
      return 0;
    }

    function contributionLabel(value) {
      const num = Number(value);
      if (!Number.isFinite(num)) return "?";
      return Math.abs(num - Math.round(num)) < 0.05 ? String(Math.round(num)) : num.toFixed(1);
    }

    function wrapLabel(text, maxLen, maxLines) {
      const source = String(text || "?").trim();
      if (!source) return ["?"];
      const words = source.split(/\s+/);
      const lines = [];
      let line = "";
      words.forEach((word) => {
        const candidate = line ? line + " " + word : word;
        if (candidate.length <= maxLen || !line) {
          line = candidate;
          return;
        }
        lines.push(line);
        line = word;
      });
      if (line) lines.push(line);
      if (lines.length <= maxLines) return lines;
      const trimmed = lines.slice(0, maxLines);
      const last = trimmed[maxLines - 1];
      trimmed[maxLines - 1] = last.length > maxLen - 1 ? last.slice(0, maxLen - 1) + "?" : last + "?";
      return trimmed;
    }

    function doorTicks(value, x, y, toneName) {
      const count = Math.max(1, Math.min(8, Math.round(Number(value || 0))));
      const stroke = toneStroke(toneName || "safe");
      const fill = toneFill(toneName || "safe");
      const ticks = [];
      for (let i = 0; i < count; i += 1) {
        const dx = x + i * 20;
        ticks.push('<rect x="' + dx + '" y="' + y + '" width="12" height="28" rx="2" fill="' + fill + '" stroke="' + stroke + '" />');
        ticks.push('<circle cx="' + (dx + 9) + '" cy="' + (y + 15) + '" r="1.5" fill="rgba(238,255,244,.72)" />');
      }
      if (Number(value || 0) > 8) {
        ticks.push('<text x="' + (x + 164) + '" y="' + (y + 18) + '" font-size="11" fill="rgba(203,213,225,.66)">+' + escapeHtml(Math.round(Number(value || 0) - 8)) + '</text>');
      }
      return ticks.join("");
    }

    function groupRow(label, displayValue, numericValue, x, y, toneName) {
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="202" height="64" rx="10" fill="rgba(0,0,0,.14)" stroke="rgba(120,255,120,.10)" />',
        '<text x="' + (x + 12) + '" y="' + (y + 18) + '" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".7">' + escapeHtml(label).toUpperCase() + '</text>',
        '<text x="' + (x + 184) + '" y="' + (y + 19) + '" font-size="15" fill="rgba(238,255,244,.94)" font-weight="900" text-anchor="end">' + escapeHtml(displayValue) + '</text>',
        doorTicks(numericValue, x + 14, y + 28, toneName),
        '</g>'
      ].join("");
    }

    function controlModeBlock(label, x, y, w, h) {
      const lines = wrapLabel(label, 22, 2);
      const tspans = lines.map((line, index) => {
        const dy = index === 0 ? 0 : 12;
        return '<tspan x="' + (x + 12) + '" dy="' + dy + '">' + escapeHtml(line) + '</tspan>';
      }).join('');
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="rgba(0,0,0,.14)" stroke="rgba(120,255,120,.10)" />',
        '<text x="' + (x + 12) + '" y="' + (y + 15) + '" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".8">CONTROL MODE</text>',
        '<text x="' + (x + 12) + '" y="' + (y + 30) + '" font-size="10.5" fill="rgba(238,255,244,.90)" font-weight="800">' + tspans + '</text>',
        '</g>'
      ].join('');
    }

    const zones = contributionValue(metrics.zoneBase, metrics.zoneBaseLabel);
    const high = contributionValue(metrics.highsecAdd, metrics.highsecAddLabel);
    const doors = Math.max(1, Number(metrics.doors || Math.round(perimeter + zones + high) || 1));
    const readers = Math.max(0, Number(metrics.readers || 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const pressure = clamp(complexity / 140, 0.04, 1);
    const pressureTone = pressure > .72 ? "risk" : pressure > .45 ? "watch" : "safe";

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="door-count-planner">',
      '<svg viewBox="0 0 760 388" role="img" aria-label="Door count planning pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridDoorCountV4" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="340" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="316" rx="12" fill="url(#accGridDoorCountV4)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">DOOR SCHEDULE LOAD</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Controlled doors, readers, and segmentation pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      groupRow("Perimeter", contributionLabel(perimeter), perimeter, 52, 112, "safe"),
      groupRow("Interior zones", contributionLabel(zones), zones, 279, 112, "safe"),
      groupRow("High-security", contributionLabel(high), high, 506, 112, high > 0 ? "watch" : "safe"),
      '<path d="M112 206 H648" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M112 206 C214 184, 300 228, 382 206 S548 186, 648 206" fill="none" stroke="rgba(125,255,152,.38)" stroke-width="1.4" />',
      '<circle cx="112" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="382" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="648" cy="206" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<text x="112" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">scope</text>',
      '<text x="382" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">controller grouping</text>',
      '<text x="648" y="224" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">reader count</text>',
      pressureRail("complexity pressure", pressure, 52, 258, 220, pressureTone),
      metricChip("total doors", String(metrics.doors ?? doors ?? "?"), 296, 248, 110),
      metricChip("readers", String(metrics.readers ?? readers ?? "?"), 420, 248, 100),
      metricChip("complexity", String(metrics.complexityIndex ?? complexity ?? "?"), 534, 248, 116),
      controlModeBlock(metrics.bothSidesLabel || "?", 534, 292, 182, 52),
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Interior and high-security values are weighted planning contributions. The final controlled-door total is rounded after the weighted values are added, so rounded component labels may not equal the final total.</p>',
      '</div>'
    ].join("");
  }







  function buildSpecialLockingSvg(metrics = {}) {
    const tone = statusTone(metrics.status || metrics.authorityLevel);
    const statusText = statusLabel(metrics.status || metrics.authorityLevel);
    const openings = Math.max(0, Number(metrics.openingCount || 0));
    const riskScore = Math.max(0, Number(metrics.riskScore || 0));
    const pressure = clamp(riskScore / 100, 0.04, 1);
    const pressureTone = riskScore >= 75 ? "risk" : riskScore >= 45 ? "watch" : "safe";
    const openingTones = Array.isArray(metrics.openingTones) ? metrics.openingTones.filter(Boolean) : [];
    const exceptionCount = Math.max(0, Number(metrics.exceptionCount || 0));

    function highestOpeningTone(items) {
      if (items.includes("risk")) return "risk";
      if (items.includes("watch")) return "watch";
      return pressureTone;
    }

    function openingTone(index) {
      return openingTones[index] || pressureTone;
    }

    const hiddenOpeningTone = highestOpeningTone(openingTones.slice(4));

    const lockingType = metrics.lockingTypeLabel || metrics.lockingType || "?";
    const egressImpact = metrics.egressImpactLabel || metrics.egressImpact || "?";
    const releaseLogic = metrics.releaseLogicLabel || metrics.releaseLogic || "?";
    const authorityReview = metrics.authorityReviewLabel || metrics.authorityReview || "?";
    const overridePlan = metrics.overridePlanLabel || metrics.overridePlan || "?";

    function authorityBlock(label, value, x, y, w, toneName) {
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="42" rx="9" fill="' + toneFill(toneName || "safe") + '" stroke="' + toneStroke(toneName || "safe") + '" />',
        '<text x="' + (x + 12) + '" y="' + (y + 15) + '" font-size="8.5" fill="rgba(203,213,225,.66)" letter-spacing=".7">' + escapeHtml(label).toUpperCase() + '</text>',
        '<text x="' + (x + 12) + '" y="' + (y + 31) + '" font-size="10.5" fill="rgba(238,255,244,.92)" font-weight="750">' + escapeHtml(value) + '</text>',
        '</g>'
      ].join("");
    }

    function miniMetric(label, value, x, y, w, toneName) {
      return [
        '<g>',
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="30" rx="8" fill="' + (toneName ? toneFill(toneName) : "rgba(0,0,0,.16)") + '" stroke="' + (toneName ? toneStroke(toneName) : "rgba(120,255,120,.12)") + '" />',
        '<text x="' + (x + 10) + '" y="' + (y + 12) + '" font-size="8.5" fill="rgba(203,213,225,.62)" letter-spacing=".65">' + escapeHtml(label).toUpperCase() + '</text>',
        '<text x="' + (x + 10) + '" y="' + (y + 24) + '" font-size="10.5" fill="rgba(238,255,244,.92)" font-weight="800">' + escapeHtml(value) + '</text>',
        '</g>'
      ].join("");
    }

    const releaseTone = String(metrics.releaseLogic || "").includes("needed") ? "watch" : "safe";
    const reviewTone = String(metrics.authorityReview || "").includes("required") ? "risk" : String(metrics.authorityReview || "").includes("likely") ? "watch" : "safe";
    const overrideTone = String(metrics.overridePlan || "").includes("missing") ? "risk" : String(metrics.overridePlan || "").includes("partial") ? "watch" : "safe";
    const egressTone = String(metrics.egressImpact || "").includes("yes") ? "watch" : String(metrics.egressImpact || "").includes("unknown") ? "watch" : "safe";
    const releaseCheckToneList = [egressTone, releaseTone, reviewTone, overrideTone];
    const releaseChecksClear = releaseCheckToneList.every((item) => item === "safe");
    const statusSource = tone === "watch" && releaseChecksClear
      ? "SOURCE: LOCKING SCOPE"
      : tone === "watch"
        ? "SOURCE: REVIEW PRESSURE"
        : tone === "risk"
          ? "SOURCE: AUTHORITY REVIEW"
          : "SOURCE: RELEASE CHECKS CLEAR";
    const statusSourceFill = tone === "risk"
      ? "rgba(255,170,170,.82)"
      : tone === "watch"
        ? "rgba(255,220,130,.84)"
        : "rgba(125,255,152,.72)";
    const pathTone = releaseCheckToneList.includes("risk")
      ? "risk"
      : releaseCheckToneList.includes("watch")
        ? "watch"
        : pressureTone;
    const openingNodeTone = highestOpeningTone(openingTones);
    const egressNodeTone = egressTone;
    const releaseNodeTone = releaseTone;

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="special-locking-scope">',
      '<svg viewBox="0 0 760 470" role="img" aria-label="Special locking authority review pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridSpecialLockingV21" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.040)" stroke-width="1"/></pattern></defs>',

      '<rect x="24" y="24" width="712" height="424" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="400" rx="12" fill="url(#accGridSpecialLockingV21)" stroke="rgba(120,255,120,.07)" />',

      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">SPECIAL LOCKING / HIGH-SECURITY SCOPE</text>',
      '<text x="52" y="84" font-size="18" fill="rgba(246,255,248,.96)" font-weight="650">Authority review and release coordination</text>',
      statusBadge(statusText, tone, 616, 51),
      '<text x="659" y="96" font-size="8" fill="' + statusSourceFill + '" text-anchor="middle" letter-spacing=".7">' + escapeHtml(statusSource) + '</text>',

      '<rect x="52" y="108" width="300" height="252" rx="12" fill="rgba(0,0,0,.13)" stroke="rgba(120,255,120,.10)" />',
      '<text x="70" y="132" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">FLAGGED OPENINGS</text>',
      Math.round(openings) > 0 ? cadControlledDoorOpeningIcon({ x: 76, y: 164, scale: 0.36, tone: openingTone(0) }) : '',
      Math.round(openings) > 1 ? cadControlledDoorOpeningIcon({ x: 122, y: 164, scale: 0.36, tone: openingTone(1) }) : '',
      Math.round(openings) > 2 ? cadControlledDoorOpeningIcon({ x: 168, y: 164, scale: 0.36, tone: openingTone(2) }) : '',
      Math.round(openings) > 3 ? cadControlledDoorOpeningIcon({ x: 214, y: 164, scale: 0.36, tone: openingTone(3) }) : '',
      Math.round(openings) > 4 ? '<text x="272" y="180" font-size="9" fill="' + toneStroke(hiddenOpeningTone) + '" font-weight="800">+' + escapeHtml(String(Math.round(openings) - 4)) + ' more</text>' : '',
      '<text x="198" y="132" font-size="8" fill="rgba(203,213,225,.58)" letter-spacing=".65">CONTROLLED OPENINGS</text>',
      '<text x="198" y="148" font-size="10.5" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(String(openings)) + ' flagged</text>',

      '<path d="M92 276 H308" stroke="rgba(203,213,225,.22)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M92 276 C154 256, 246 296, 308 276" fill="none" stroke="' + toneStroke(pathTone) + '" stroke-width="1.3" opacity=".72" />',
      '<circle cx="92" cy="276" r="4.8" fill="' + toneFill(openingNodeTone) + '" stroke="' + toneStroke(openingNodeTone) + '" />',
      '<circle cx="200" cy="276" r="4.8" fill="' + toneFill(egressNodeTone) + '" stroke="' + toneStroke(egressNodeTone) + '" />',
      '<circle cx="308" cy="276" r="4.8" fill="' + toneFill(releaseNodeTone) + '" stroke="' + toneStroke(releaseNodeTone) + '" />',
      '<text x="92" y="294" font-size="9.5" fill="rgba(203,213,225,.56)" text-anchor="middle">opening</text>',
      '<text x="200" y="294" font-size="9.5" fill="rgba(203,213,225,.56)" text-anchor="middle">egress</text>',
      '<text x="308" y="294" font-size="9.5" fill="rgba(203,213,225,.56)" text-anchor="middle">release</text>',
      pressureRail("authority pressure", pressure, 76, 322, 232, pressureTone),

      '<rect x="380" y="108" width="322" height="252" rx="12" fill="rgba(0,0,0,.13)" stroke="rgba(120,255,120,.10)" />',
      '<text x="398" y="132" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">AUTHORITY / RELEASE CHECKS</text>',
      authorityBlock("egress", egressImpact, 398, 146, 286, egressTone),
      authorityBlock("release", releaseLogic, 398, 202, 286, releaseTone),
      authorityBlock("review", authorityReview, 398, 254, 286, reviewTone),
      authorityBlock("override", overridePlan, 398, 306, 286, overrideTone),

      '<rect x="52" y="382" width="650" height="34" rx="10" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.10)" />',
      '<text x="68" y="403" font-size="8.5" fill="rgba(203,213,225,.62)" letter-spacing=".7">LOCKING</text>',
      '<text x="132" y="403" font-size="10.5" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(lockingType) + '</text>',
      miniMetric("openings", String(metrics.openingCount ?? "?"), 402, 384, 92),
      miniMetric("risk score", String(metrics.riskScore ?? "?"), 506, 384, 104, pressureTone),
      miniMetric("exceptions", String(exceptionCount), 622, 384, 80, exceptionCount ? "watch" : "safe"),

      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Special locking is a specialty planning branch. Use the visual to flag openings that need authority review, release coordination, egress validation, and documented override procedures before final design. Overall status can remain Watch when locking or high-security scope creates planning pressure even when individual release checks are clear.</p>',
      '</div>'
    ].join("");
  }

  function renderSpecialLocking(options = {}) {
    return show(options, buildSpecialLockingSvg(options.metrics || {}));
  }
  function buildElevatorReaderSvg(metrics = {}) {
    const tone = statusTone(metrics.status || metrics.systemStatus);
    const statusText = statusLabel(metrics.status || metrics.systemStatus);
    const cars = Math.max(0, Number(metrics.carReaders || 0));
    const dcs = Math.max(0, Number(metrics.dcsCredentialPoints ?? metrics.dcsAdd ?? 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const pressure = clamp(complexity / 100, 0.04, 1);
    const pressureTone = complexity > 90 ? "risk" : complexity > 55 ? "watch" : "safe";
    const dcsTone = dcs > 0 ? "watch" : "safe";
    const statusLineStroke = toneStroke(tone);
    const statusLineFill = toneFill(tone);
    const dcsModeRawLabel = String(metrics.dcsModeLabel || metrics.destLabel || metrics.destinationControl || (dcs > 0 ? "DCS enabled" : "No DCS"));
    const compactDcsModeLabel = dcsModeRawLabel
      .replace(/No DCS\s*\/\s*traditional elevator call buttons/i, "No DCS / call buttons")
      .replace(/No DCS\s*\/\s*traditional call buttons/i, "No DCS / call buttons")
      .replace(/No DCS\s*\/\s*traditional buttons/i, "No DCS / buttons")
      .replace(/Shared lobby dispatch for this bank/i, "Shared lobby DCS")
      .replace(/Per-bank dispatch terminals/i, "Per-bank DCS")
      .replace(/Separate-location dispatch terminals/i, "Separate-location DCS")
      .replace(/Mixed \/ custom DCS credential points/i, "Mixed/custom DCS");
    const placement = metrics.placementLabel || metrics.placement || "?";
    const dest = metrics.destLabel || metrics.destinationControl || "?";
    const topologyKey = String(metrics.topology || metrics.topologyLabel || metrics.elevatorTopology || metrics.elevatorTopologyLabel || metrics.scopeTopology || metrics.scopeType || "").toLowerCase();
    const isMixedElevatorTopology = Boolean(metrics.isMixedTopology) || topologyKey.includes("mixed") || topologyKey.includes("custom");
    const isSeparateElevatorTopology = topologyKey.includes("separate") || topologyKey.includes("individual") || topologyKey.includes("location");
    const isSingleElevatorTopology = topologyKey.includes("single");
    const rawBankGroups = Math.max(0, Math.round(Number(metrics.bankGroups ?? metrics.mixedBankGroups ?? (isSeparateElevatorTopology ? 0 : metrics.banks ?? 1))));
    const rawSeparateLocations = Math.max(0, Math.round(Number(metrics.separateLocations ?? metrics.mixedSeparateLocations ?? (isSeparateElevatorTopology ? metrics.banks ?? 1 : 0))));
    const bankCount = Math.max(1, Math.min(6, Math.round(Number(metrics.banks || rawBankGroups + rawSeparateLocations || 1))));
    const bankVisibleCount = Math.max(1, Math.min(3, bankCount));
    const hiddenElevatorGroups = Math.max(0, bankCount - bankVisibleCount);
    const elevatorGroupLabel = isMixedElevatorTopology
      ? "BANKS + SINGLES"
      : (isSeparateElevatorTopology ? (bankCount === 1 ? "ELEVATOR / LOCATION" : "ELEVATOR LOCATIONS") : (isSingleElevatorTopology ? "ELEVATOR / LOCATION" : (bankCount === 1 ? "ELEVATOR BANK GROUP" : "ELEVATOR BANK GROUPS")));
    const lineGroupLabel = isMixedElevatorTopology ? "banks + singles" : (isSeparateElevatorTopology ? "locations" : (isSingleElevatorTopology ? "location" : "bank groups"));
    const elevatorOverflowUnit = isMixedElevatorTopology
      ? (hiddenElevatorGroups === 1 ? "bank/single group" : "bank/single groups")
      : (isSeparateElevatorTopology ? (hiddenElevatorGroups === 1 ? "elevator location" : "elevator locations") : (isSingleElevatorTopology ? (hiddenElevatorGroups === 1 ? "elevator" : "elevators") : (hiddenElevatorGroups === 1 ? "bank group" : "bank groups")));
    const elevatorOverflowLabel = hiddenElevatorGroups > 0 ? "+" + hiddenElevatorGroups + " more" : "";
    const carCount = Math.max(1, Math.min(8, Math.round(Number(metrics.cars || cars || 1))));
    const carOverflowLabel = cars > carCount ? "+" + Math.round(cars - carCount) : "";

    function carNode(index) {
      const x = 72 + (index % 4) * 48;
      const y = 124 + Math.floor(index / 4) * 48;
      return cadAccessReaderIcon({ x, y, scale: 0.28, tone: pressureTone, label: String(index + 1) });
    }

    function bankNode(index) {
      const x = 370 + index * 86;
      return cadElevatorBankIcon({ x, y: 124, scale: 0.36, tone: pressureTone, cars: 1, label: "B" + (index + 1) });
    }

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="elevator-reader-count">',
      '<svg viewBox="0 0 760 388" role="img" aria-label="Elevator reader count pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridElevatorV8" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="340" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="316" rx="12" fill="url(#accGridElevatorV8)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">ELEVATOR READER COUNT</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Reader load, DCS readers, and integration pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      '<text x="72" y="114" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">CAR / CAB READERS</text>',
      Array.from({ length: carCount }, (_, index) => carNode(index)).join(''),
      carOverflowLabel ? '<rect x="246" y="188" width="64" height="19" rx="7" fill="' + statusLineFill + '" stroke="' + statusLineStroke + '" opacity=".86" />' : '',
      carOverflowLabel ? '<text x="278" y="201" text-anchor="middle" font-size="11" fill="' + statusLineStroke + '" font-weight="850">' + escapeHtml(carOverflowLabel) + '</text>' : '',
      '<path d="M300 166 H350" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="5 6" />',
      '<text x="378" y="114" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">' + escapeHtml(elevatorGroupLabel) + '</text>',
      Array.from({ length: bankVisibleCount }, (_, index) => bankNode(index)).join(''),
      elevatorOverflowLabel ? '<rect x="458" y="184" width="108" height="19" rx="7" fill="' + statusLineFill + '" stroke="' + statusLineStroke + '" opacity=".86" />' : '',
      elevatorOverflowLabel ? '<text x="512" y="197" text-anchor="middle" font-size="11" fill="' + statusLineStroke + '" font-weight="850">' + escapeHtml(elevatorOverflowLabel) + '</text>' : '',
      '<rect x="632" y="118" width="74" height="46" rx="8" fill="' + toneFill(dcsTone) + '" stroke="' + toneStroke(dcsTone) + '" />',
      '<text x="669" y="137" text-anchor="middle" font-size="9" fill="rgba(203,213,225,.66)" letter-spacing=".8">DCS READERS</text>',
      '<text x="669" y="156" text-anchor="middle" font-size="14" fill="rgba(238,255,244,.94)" font-weight="900">' + escapeHtml(dcs) + '</text>',
      '<path d="M112 226 H648" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M112 226 C214 202, 300 246, 382 226 S548 204, 648 226" fill="none" stroke="' + statusLineStroke + '" stroke-width="1.4" opacity=".76" />',
      '<circle cx="112" cy="226" r="5" fill="' + statusLineFill + '" stroke="' + statusLineStroke + '" />',
      '<circle cx="382" cy="226" r="5" fill="' + statusLineFill + '" stroke="' + statusLineStroke + '" />',
      '<circle cx="648" cy="226" r="5" fill="' + statusLineFill + '" stroke="' + statusLineStroke + '" />',
      '<text x="112" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">cars</text>',
      '<text x="382" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">' + escapeHtml(lineGroupLabel) + '</text>',
      '<text x="648" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">integration</text>',
      pressureRail("integration pressure", pressure, 52, 282, 220, pressureTone),
      metricChip("total readers", String(metrics.totalReaders ?? "?"), 296, 272, 126),
      metricChip("in car", String(metrics.carReaders ?? "?"), 436, 272, 92),
      metricChip("lobby", String(metrics.lobbyReaders ?? "?"), 542, 272, 86),
      '<rect x="52" y="320" width="286" height="28" rx="8" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.10)" />',
      '<text x="62" y="337" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".7">PLACEMENT</text>',
      '<text x="132" y="337" font-size="10" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(placement) + '</text>',
      '<rect x="356" y="320" width="272" height="28" rx="8" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.10)" />',
      '<text x="366" y="337" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".7">DCS MODE</text>',
      '<text x="498" y="337" font-size="10" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(compactDcsModeLabel) + '</text>',
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Elevator bank groups and single elevator locations are scope markers, not lobby reader counts. Use the visual to compare car readers, actual lobby readers, DCS reader points, and integration pressure before final elevator coordination.</p>',
      '</div>'
    ].join("");
  }

  function renderElevatorReader(options = {}) {
    return show(options, buildElevatorReaderSvg(options.metrics || {}));
  }
  function buildAntiPassbackSvg(metrics = {}) {
    const tone = statusTone(metrics.status || metrics.operationalRisk);
    const statusText = statusLabel(metrics.status || metrics.operationalRisk);
    const zones = Math.max(0, Number(metrics.recommendedZones || 0));
    const paired = Math.max(0, Number(metrics.pairedEntrances || 0));
    const complexity = Math.max(0, Number(metrics.complexityIndex || 0));
    const exposure = Math.max(0, Number(metrics.enforcementExposure || 0));
    const pressure = clamp(complexity / 18, 0.04, 1);
    const exposureRatio = clamp(exposure / 18, 0.04, 1);
    const pressureTone = complexity >= 12 ? "risk" : complexity >= 9 ? "watch" : "safe";
    const strategy = metrics.strategyLabel || "?";
    const mode = metrics.typeLabel || metrics.recommendedType || "?";

    function zoneNode(index) {
      const cols = 5;
      const x = 58 + (index % cols) * 54;
      const y = 118 + Math.floor(index / cols) * 56;
      return cadApbZoneMarker({
        x,
        y,
        scale: 0.34,
        tone,
        label: "Z" + (index + 1)
      });
    }

    function pairedGate(index) {
      const x = 394 + index * 52;
      const y = 132;
      return [
        '<g aria-label="Paired entry and exit readers">',
        cadAccessReaderIcon({ x, y, scale: 0.18, tone, label: "" }),
        cadAccessReaderIcon({ x: x + 22, y, scale: 0.18, tone, label: "" }),
        '<path d="M' + (x + 15) + ' 156 H' + (x + 28) + '" stroke="rgba(203,213,225,.30)" stroke-width="1.1" stroke-dasharray="3 4" />',
        '<text x="' + (x + 7) + '" y="168" font-size="8.5" fill="rgba(203,213,225,.70)" text-anchor="middle" letter-spacing=".6">IN</text>',
        '<text x="' + (x + 30) + '" y="168" font-size="8.5" fill="rgba(203,213,225,.70)" text-anchor="middle" letter-spacing=".6">OUT</text>',
        '</g>'
      ].join('');
    }

    const zoneCount = Math.max(2, Math.min(10, Math.round(zones || 2)));
    const pairCount = Math.max(1, Math.min(5, Math.round(paired || 1)));

    return [
      '<div class="access-control-planning-visual-shell" data-access-control-modern-visual="anti-passback-zones">',
      '<svg viewBox="0 0 760 388" role="img" aria-label="Anti-passback zoning pressure visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="accGridApbV6" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.045)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="340" rx="16" fill="rgba(0,0,0,.10)" stroke="rgba(120,255,120,.12)" />',
      '<rect x="36" y="36" width="688" height="316" rx="12" fill="url(#accGridApbV6)" stroke="rgba(120,255,120,.07)" />',
      '<text x="52" y="62" font-size="11" fill="rgba(180,255,200,.68)" letter-spacing="1.4">ANTI-PASSBACK ZONES</text>',
      '<text x="52" y="84" font-size="19" fill="rgba(246,255,248,.96)" font-weight="650">Zone structure, paired transitions, and enforcement pressure</text>',
      statusBadge(statusText, tone, 616, 51),
      '<text x="72" y="114" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">LOGICAL ZONES</text>',
      Array.from({ length: zoneCount }, (_, index) => zoneNode(index)).join(''),
      zones > zoneCount ? '<text x="342" y="176" font-size="11" fill="rgba(203,213,225,.66)">+' + escapeHtml(Math.round(zones - zoneCount)) + '</text>' : '',
      '<path d="M338 164 H382" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="5 6" />',
      '<text x="392" y="114" font-size="10" fill="rgba(203,213,225,.62)" letter-spacing=".8">ENTRY / EXIT READERS</text>',
      Array.from({ length: pairCount }, (_, index) => pairedGate(index)).join(''),
      paired > pairCount ? '<text x="656" y="166" font-size="11" fill="rgba(203,213,225,.66)">+' + escapeHtml(Math.round(paired - pairCount)) + '</text>' : '',
      '<path d="M112 226 H648" stroke="rgba(203,213,225,.24)" stroke-width="1.2" stroke-dasharray="6 7" />',
      '<path d="M112 226 C210 202, 308 246, 382 226 S540 204, 648 226" fill="none" stroke="rgba(125,255,152,.38)" stroke-width="1.4" />',
      '<circle cx="112" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="382" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<circle cx="648" cy="226" r="5" fill="rgba(125,255,152,.20)" stroke="rgba(125,255,152,.72)" />',
      '<text x="112" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">zones</text>',
      '<text x="382" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">transitions</text>',
      '<text x="648" y="244" font-size="10" fill="rgba(203,213,225,.58)" text-anchor="middle">policy friction</text>',
      pressureRail("complexity pressure", pressure, 52, 282, 220, pressureTone),
      pressureRail("enforcement exposure", exposureRatio, 296, 282, 190, pressureTone),
      metricChip("zones", String(metrics.recommendedZones ?? "?"), 506, 272, 82),
      metricChip("paired", String(metrics.pairedEntrances ?? "?"), 600, 272, 82),
      '<rect x="506" y="320" width="176" height="28" rx="8" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.10)" />',
      '<text x="516" y="337" font-size="9" fill="rgba(203,213,225,.62)" letter-spacing=".7">MODE</text>',
      '<text x="564" y="337" font-size="10" fill="rgba(238,255,244,.90)" font-weight="800">' + escapeHtml(mode) + '</text>',
      '<text x="52" y="337" font-size="10" fill="rgba(203,213,225,.62)">Strategy: ' + escapeHtml(strategy) + '</text>',
      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Anti-passback is a specialty planning branch. Use the visual to compare zone count, paired transitions, complexity pressure, and operational exposure before enforcing APB rules in the platform.</p>',
      '</div>'
    ].join("");
  }

  function renderAntiPassback(options = {}) {
    return show(options, buildAntiPassbackSvg(options.metrics || {}));
  }
  function renderCredentialFormat(options = {}) {
    return show(options, buildCredentialFormatSvg(options.metrics || {}));
  }

  function renderDoorCable(options = {}) {
    return show(options, buildDoorCableSvg(options.metrics || {}));
  }

  function renderDoorCount(options = {}) {
    return show(options, buildDoorCountSvg(options.metrics || {}));
  }

  window.ScopedLabsAccessControlPlanningVisuals = Object.freeze({
    cadControlledDoorOpeningIcon,
    cadDoorReaderOpeningIcon,
    cadAccessReaderIcon,
    cadApbZoneMarker,
    cadElevatorBankIcon,
    cadAccessPanelCapacityIcon,
    cadAccessLockBodyIcon,
    cadAccessPowerSourceIcon,
    cadAccessFireAlarmReleaseIcon,
    cadAccessEgressPathIcon,
    cadAccessStateTransitionFlow,
    VERSION,
    renderFailSafeState,
    buildFailSafeStateDiagramSvg,
    renderCredentialFormat,
    buildCredentialFormatSvg,
    cadCredentialFormatBitCardIcon,
    buildScopePlannerBranchMapSvg,
    renderDoorCable,
    renderDoorCount,
    renderAntiPassback,
    buildAntiPassbackSvg,
    renderElevatorReader,
    buildElevatorReaderSvg,
    renderSpecialLocking,
    buildSpecialLockingSvg,
    hide,
    getDataUri,
    svgToDataUri
  });
})();
