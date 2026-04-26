(function () {
  "use strict";

  var HELP_INDEX_URL = "/assets/help/index.json";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getToolPath() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    var toolsIndex = parts.indexOf("tools");

    if (toolsIndex === -1 || parts.length < toolsIndex + 3) return null;

    return {
      category: parts[toolsIndex + 1],
      tool: parts[toolsIndex + 2],
      key: parts[toolsIndex + 1] + "/" + parts[toolsIndex + 2]
    };
  }

  async function fetchJson(url) {
    var response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Help file not found: " + url);
    return response.json();
  }

  function injectHelpStyles() {
    if (document.getElementById("scopedlabs-help-styles")) return;

    var style = document.createElement("style");
    style.id = "scopedlabs-help-styles";
    style.textContent =
      ".sl-help-card{margin:18px 0;border:1px solid rgba(120,255,120,.18);background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.012)),rgba(0,0,0,.18);box-shadow:0 16px 40px rgba(0,0,0,.22);}" +
      ".sl-help-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:0;}" +
      ".sl-help-title{margin:0;font-size:1.24rem;line-height:1.2;}" +
      ".sl-help-summary{margin:8px 0 0;color:rgba(255,255,255,.70);line-height:1.55;max-width:78ch;}" +
      ".sl-help-toggle{white-space:nowrap;}" +
      ".sl-help-content{margin-top:14px;}" +
      ".sl-help-content[hidden]{display:none!important;}" +
      ".sl-help-list{display:grid;gap:10px;}" +
      ".sl-help-item,.sl-help-subitem{border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(0,0,0,.18);overflow:hidden;}" +
      ".sl-help-item summary,.sl-help-subitem summary{cursor:pointer;list-style:none;padding:13px 14px;font-weight:800;color:rgba(245,255,248,.95);}" +
      ".sl-help-item summary::-webkit-details-marker,.sl-help-subitem summary::-webkit-details-marker{display:none;}" +
      ".sl-help-item summary::after,.sl-help-subitem summary::after{content:'+';float:right;color:rgba(120,255,120,.85);}" +
      ".sl-help-item[open] summary::after,.sl-help-subitem[open] summary::after{content:'−';}" +
      ".sl-help-body{padding:0 14px 14px;color:rgba(255,255,255,.72);line-height:1.55;}" +
      ".sl-help-body p{margin:10px 0;}" +
      ".sl-help-body ul{margin:10px 0 0 18px;padding:0;}" +
      ".sl-help-body li{margin:6px 0;}" +
      ".sl-help-sublist{display:grid;gap:8px;margin-top:12px;}" +
      ".sl-help-subitem{background:rgba(255,255,255,.025);}" +
      ".sl-help-meta{margin-top:10px;color:rgba(255,255,255,.64);}" +
      ".sl-help-meta strong{color:rgba(245,255,248,.92);}" +
      "@media(max-width:760px){.sl-help-head{flex-direction:column}.sl-help-toggle{width:100%;}}";

    document.head.appendChild(style);
  }

  function paragraphHtml(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      return "<p>" + escapeHtml(item) + "</p>";
    }).join("");
  }

  function bulletHtml(items) {
    return Array.isArray(items) && items.length
      ? "<ul>" + items.map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        }).join("") + "</ul>"
      : "";
  }

  function glossaryItemHtml(item) {
    return "<details class=\"sl-help-subitem\">" +
      "<summary>" + escapeHtml(item.label || "Input") + "</summary>" +
      "<div class=\"sl-help-body\">" +
        "<p>" + escapeHtml(item.description || "") + "</p>" +
        (item.examples && item.examples.length ? "<div class=\"sl-help-meta\"><strong>Examples:</strong>" + bulletHtml(item.examples) + "</div>" : "") +
        (item.whyItMatters ? "<p class=\"sl-help-meta\"><strong>Why it matters:</strong> " + escapeHtml(item.whyItMatters) + "</p>" : "") +
        (item.commonMistake ? "<p class=\"sl-help-meta\"><strong>Common mistake:</strong> " + escapeHtml(item.commonMistake) + "</p>" : "") +
      "</div>" +
    "</details>";
  }

  function sectionHtml(section) {
    var bodyHtml = paragraphHtml(section.body);
    var bulletList = bulletHtml(section.bullets);

    if (section.type === "glossary") {
      var items = Array.isArray(section.items) ? section.items : [];
      return "<details class=\"sl-help-item\">" +
        "<summary>" + escapeHtml(section.title || "Input descriptions") + "</summary>" +
        "<div class=\"sl-help-body\">" +
          bodyHtml +
          "<div class=\"sl-help-sublist\">" + items.map(glossaryItemHtml).join("") + "</div>" +
        "</div>" +
      "</details>";
    }

    return "<details class=\"sl-help-item\">" +
      "<summary>" + escapeHtml(section.title || "Help topic") + "</summary>" +
      "<div class=\"sl-help-body\">" + bodyHtml + bulletList + "</div>" +
    "</details>";
  }

  function createHelpCard(help) {
    var card = document.createElement("section");
    card.id = "scopedlabs-help";
    card.className = "card sl-help-card";

    var sections = Array.isArray(help.sections) ? help.sections : [];
    var openByDefault = help.defaultOpen === true;

    card.innerHTML =
      "<div class=\"pill-row\">" +
        "<span class=\"pill\">" + escapeHtml(help.eyebrow || "Knowledge Base") + "</span>" +
      "</div>" +
      "<div class=\"sl-help-head\">" +
        "<div>" +
          "<h2 class=\"sl-help-title\">" + escapeHtml(help.title || "Tool Guide") + "</h2>" +
          "<p class=\"sl-help-summary\">" + escapeHtml(help.summary || "") + "</p>" +
        "</div>" +
        "<button class=\"btn btn-ghost sl-help-toggle\" type=\"button\" data-sl-help-toggle>" + (openByDefault ? "Close guide" : "Open guide") + "</button>" +
      "</div>" +
      "<div class=\"sl-help-content\" data-sl-help-content" + (openByDefault ? "" : " hidden") + ">" +
        "<div class=\"sl-help-list\">" + sections.map(sectionHtml).join("") + "</div>" +
      "</div>";

    var toggle = card.querySelector("[data-sl-help-toggle]");
    var content = card.querySelector("[data-sl-help-content]");

    toggle.addEventListener("click", function () {
      var isHidden = content.hasAttribute("hidden");
      if (isHidden) {
        content.removeAttribute("hidden");
        toggle.textContent = "Close guide";
      } else {
        content.setAttribute("hidden", "");
        toggle.textContent = "Open guide";
      }
    });

    return card;
  }

  function mountHelpCard(card) {
    if (document.getElementById("scopedlabs-help")) return;

    var main = document.querySelector("main .container") || document.querySelector("main") || document.body;
    var anchor =
      document.querySelector("#flow-note") ||
      document.querySelector(".tool-best-for") ||
      document.querySelector(".page-head") ||
      document.querySelector(".hero");

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(card, anchor.nextSibling);
      return;
    }

    var footer = main.querySelector("footer");
    if (footer) main.insertBefore(card, footer);
    else main.appendChild(card);
  }

  async function initHelp() {
    var toolPath = getToolPath();
    if (!toolPath) return;

    try {
      var index = await fetchJson(HELP_INDEX_URL + "?v=" + VERSION_PLACEHOLDER);
      var helpFile = index.toolHelp && index.toolHelp[toolPath.key];
      if (!helpFile) return;

      var help = await fetchJson("/assets/help/" + helpFile + "?v=" + encodeURIComponent(index.version || VERSION_PLACEHOLDER));

      injectHelpStyles();
      mountHelpCard(createHelpCard(help));
    } catch (error) {
      console.warn("[ScopedLabs Help]", error.message);
    }
  }

  var VERSION_PLACEHOLDER = "help-008";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHelp);
  } else {
    initHelp();
  }
})();
