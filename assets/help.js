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

    if (toolsIndex === -1 || parts.length < toolsIndex + 3) {
      return null;
    }

    return {
      category: parts[toolsIndex + 1],
      tool: parts[toolsIndex + 2],
      key: parts[toolsIndex + 1] + "/" + parts[toolsIndex + 2]
    };
  }

  async function fetchJson(url) {
    var response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Help file not found: " + url);
    }

    return response.json();
  }

  function injectHelpStyles() {
    if (document.getElementById("scopedlabs-help-styles")) return;

    var style = document.createElement("style");
    style.id = "scopedlabs-help-styles";
    style.textContent =
      ".sl-help-card{" +
        "margin:18px 0;" +
        "border:1px solid rgba(120,255,120,.18);" +
        "background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.012)),rgba(0,0,0,.18);" +
        "box-shadow:0 16px 40px rgba(0,0,0,.22);" +
      "}" +
      ".sl-help-head{" +
        "display:flex;" +
        "align-items:flex-start;" +
        "justify-content:space-between;" +
        "gap:16px;" +
        "margin-bottom:12px;" +
      "}" +
      ".sl-help-title{" +
        "margin:0;" +
        "font-size:1.24rem;" +
        "line-height:1.2;" +
      "}" +
      ".sl-help-summary{" +
        "margin:8px 0 0;" +
        "color:rgba(255,255,255,.70);" +
        "line-height:1.55;" +
        "max-width:78ch;" +
      "}" +
      ".sl-help-toggle{" +
        "white-space:nowrap;" +
      "}" +
      ".sl-help-list{" +
        "display:grid;" +
        "gap:10px;" +
        "margin-top:14px;" +
      "}" +
      ".sl-help-item{" +
        "border:1px solid rgba(255,255,255,.10);" +
        "border-radius:14px;" +
        "background:rgba(0,0,0,.18);" +
        "overflow:hidden;" +
      "}" +
      ".sl-help-item summary{" +
        "cursor:pointer;" +
        "list-style:none;" +
        "padding:13px 14px;" +
        "font-weight:800;" +
        "color:rgba(245,255,248,.95);" +
      "}" +
      ".sl-help-item summary::-webkit-details-marker{display:none;}" +
      ".sl-help-item summary::after{" +
        "content:'+';" +
        "float:right;" +
        "color:rgba(120,255,120,.85);" +
      "}" +
      ".sl-help-item[open] summary::after{content:'−';}" +
      ".sl-help-body{" +
        "padding:0 14px 14px;" +
        "color:rgba(255,255,255,.72);" +
        "line-height:1.55;" +
      "}" +
      ".sl-help-body p{" +
        "margin:10px 0;" +
      "}" +
      ".sl-help-body ul{" +
        "margin:10px 0 0 18px;" +
        "padding:0;" +
      "}" +
      ".sl-help-body li{" +
        "margin:6px 0;" +
      "}" +
      "@media(max-width:760px){" +
        ".sl-help-head{flex-direction:column;}" +
        ".sl-help-toggle{width:100%;}" +
      "}";

    document.head.appendChild(style);
  }

  function sectionHtml(section, index) {
    var body = Array.isArray(section.body) ? section.body : [];
    var bullets = Array.isArray(section.bullets) ? section.bullets : [];

    var bodyHtml = body.map(function (item) {
      return "<p>" + escapeHtml(item) + "</p>";
    }).join("");

    var bulletHtml = bullets.length
      ? "<ul>" + bullets.map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        }).join("") + "</ul>"
      : "";

    return "<details class=\"sl-help-item\"" + (index === 0 ? " open" : "") + ">" +
      "<summary>" + escapeHtml(section.title || "Help topic") + "</summary>" +
      "<div class=\"sl-help-body\">" + bodyHtml + bulletHtml + "</div>" +
    "</details>";
  }

  function createHelpCard(help) {
    var card = document.createElement("section");
    card.id = "scopedlabs-help";
    card.className = "card sl-help-card";

    var sections = Array.isArray(help.sections) ? help.sections : [];

    card.innerHTML =
      "<div class=\"pill-row\">" +
        "<span class=\"pill\">" + escapeHtml(help.eyebrow || "Knowledge Base") + "</span>" +
      "</div>" +
      "<div class=\"sl-help-head\">" +
        "<div>" +
          "<h2 class=\"sl-help-title\">" + escapeHtml(help.title || "Tool Guide") + "</h2>" +
          "<p class=\"sl-help-summary\">" + escapeHtml(help.summary || "") + "</p>" +
        "</div>" +
        "<button class=\"btn btn-ghost sl-help-toggle\" type=\"button\" data-sl-help-toggle>Expand guide</button>" +
      "</div>" +
      "<div class=\"sl-help-list\">" +
        sections.map(sectionHtml).join("") +
      "</div>";

    var toggle = card.querySelector("[data-sl-help-toggle]");
    var details = Array.prototype.slice.call(card.querySelectorAll("details"));

    toggle.addEventListener("click", function () {
      var shouldOpen = details.some(function (item) { return !item.open; });
      details.forEach(function (item) { item.open = shouldOpen; });
      toggle.textContent = shouldOpen ? "Collapse guide" : "Expand guide";
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
    if (footer) {
      main.insertBefore(card, footer);
    } else {
      main.appendChild(card);
    }
  }

  async function initHelp() {
    var toolPath = getToolPath();
    if (!toolPath) return;

    try {
      var index = await fetchJson(HELP_INDEX_URL + "?v=help-001");
      var helpFile = index.toolHelp && index.toolHelp[toolPath.key];

      if (!helpFile) return;

      var help = await fetchJson("/assets/help/" + helpFile + "?v=" + encodeURIComponent(index.version || "help-001"));

      injectHelpStyles();
      mountHelpCard(createHelpCard(help));
    } catch (error) {
      console.warn("[ScopedLabs Help]", error.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHelp);
  } else {
    initHelp();
  }
})();
