(function () {
  "use strict";

  var HELP_INDEX_URL = "/assets/help/index.json";
  var VERSION_PLACEHOLDER = "help-025";
  var helpIndexCache = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "topic";
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

  async function getHelpIndex() {
    if (helpIndexCache) return helpIndexCache;
    helpIndexCache = await fetchJson(HELP_INDEX_URL + "?v=" + encodeURIComponent(VERSION_PLACEHOLDER));
    return helpIndexCache;
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
      ".sl-help-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}" +
      ".sl-help-link{appearance:none;border:1px solid rgba(120,255,120,.24);background:rgba(120,255,120,.08);color:rgba(235,255,238,.92);border-radius:999px;padding:7px 10px;font:inherit;font-weight:800;font-size:.88rem;cursor:pointer;}" +
      ".sl-help-link:hover{background:rgba(120,255,120,.14);border-color:rgba(120,255,120,.36);}" +
      ".sl-help-link-note{display:block;width:100%;margin-top:-2px;color:rgba(255,255,255,.58);font-size:.88rem;}" +
      ".sl-help-related{margin-top:14px;border:1px solid rgba(120,255,120,.18);border-radius:16px;background:rgba(0,0,0,.22);padding:14px;}" +
      ".sl-help-related-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px;}" +
      ".sl-help-related-title{margin:0;font-size:1rem;}" +
      ".sl-help-related-close{appearance:none;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:rgba(255,255,255,.78);border-radius:999px;padding:5px 9px;cursor:pointer;}" +
      ".sl-help-related-body{color:rgba(255,255,255,.70);line-height:1.55;}" +
      ".sl-help-related-body p{margin:8px 0;}" +
      "@media(max-width:760px){.sl-help-head{flex-direction:column}.sl-help-toggle{width:100%;}.sl-help-related-head{flex-direction:column;}}";

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

  function linksHtml(links) {
    if (!Array.isArray(links) || !links.length) return "";

    return "<div class=\"sl-help-links\" aria-label=\"Related Knowledge Base references\">" +
      links.map(function (link) {
        var label = escapeHtml(link.label || "Related guide");
        var kbKey = escapeHtml(link.kbKey || link.ref || "");
        var anchor = escapeHtml(link.anchor || "");
        var note = link.note ? "<span class=\"sl-help-link-note\">" + escapeHtml(link.note) + "</span>" : "";

        if (!kbKey) return "";

        return "<button type=\"button\" class=\"sl-help-link\" data-sl-help-ref=\"" + kbKey + "\" data-sl-help-anchor=\"" + anchor + "\">" + label + "</button>" + note;
      }).join("") +
    "</div>";
  }

  function glossaryItemHtml(item) {
    var id = "kb-" + slugify(item.id || item.label || "input");

    return "<details class=\"sl-help-subitem\" id=\"" + escapeHtml(id) + "\">" +
      "<summary>" + escapeHtml(item.label || "Input") + "</summary>" +
      "<div class=\"sl-help-body\">" +
        "<p>" + escapeHtml(item.description || "") + "</p>" +
        (item.examples && item.examples.length ? "<div class=\"sl-help-meta\"><strong>Examples:</strong>" + bulletHtml(item.examples) + "</div>" : "") +
        (item.whyItMatters ? "<p class=\"sl-help-meta\"><strong>Why it matters:</strong> " + escapeHtml(item.whyItMatters) + "</p>" : "") +
        (item.commonMistake ? "<p class=\"sl-help-meta\"><strong>Common mistake:</strong> " + escapeHtml(item.commonMistake) + "</p>" : "") +
        linksHtml(item.links) +
      "</div>" +
    "</details>";
  }

  function sectionHtml(section) {
    var id = "kb-" + slugify(section.id || section.title || "section");
    var bodyHtml = paragraphHtml(section.body);
    var bulletList = bulletHtml(section.bullets);
    var sectionLinks = linksHtml(section.links);

    if (section.type === "glossary") {
      var items = Array.isArray(section.items) ? section.items : [];
      return "<details class=\"sl-help-item\" id=\"" + escapeHtml(id) + "\">" +
        "<summary>" + escapeHtml(section.title || "Input descriptions") + "</summary>" +
        "<div class=\"sl-help-body\">" +
          bodyHtml +
          "<div class=\"sl-help-sublist\">" + items.map(glossaryItemHtml).join("") + "</div>" +
          sectionLinks +
        "</div>" +
      "</details>";
    }

    return "<details class=\"sl-help-item\" id=\"" + escapeHtml(id) + "\">" +
      "<summary>" + escapeHtml(section.title || "Help topic") + "</summary>" +
      "<div class=\"sl-help-body\">" + bodyHtml + bulletList + sectionLinks + "</div>" +
    "</details>";
  }

  function findHelpFragment(help, anchor) {
    if (!anchor) return null;

    var wanted = slugify(anchor);
    var sections = Array.isArray(help.sections) ? help.sections : [];

    for (var i = 0; i < sections.length; i += 1) {
      var section = sections[i];
      var sectionId = slugify(section.id || section.title || "");

      if (sectionId === wanted) {
        return {
          title: section.title || help.title || "Related guide",
          body: section.body || [],
          bullets: section.bullets || []
        };
      }

      var items = Array.isArray(section.items) ? section.items : [];
      for (var j = 0; j < items.length; j += 1) {
        var item = items[j];
        var itemId = slugify(item.id || item.label || "");

        if (itemId === wanted) {
          return {
            title: item.label || section.title || help.title || "Related guide",
            body: [item.description || ""].filter(Boolean),
            bullets: item.examples || [],
            whyItMatters: item.whyItMatters || "",
            commonMistake: item.commonMistake || ""
          };
        }
      }
    }

    return null;
  }

  function relatedBodyHtml(help, anchor) {
    var fragment = findHelpFragment(help, anchor);
    var sections = Array.isArray(help.sections) ? help.sections : [];

    function fullGuideHtml() {
      if (!sections.length) return "";

      return "<div class=\"sl-help-sublist\" style=\"margin-top:12px;\">" +
        sections.map(function (section) {
          return sectionHtml(section);
        }).join("") +
      "</div>";
    }

    if (!fragment) {
      return "<p>" + escapeHtml(help.summary || "Open the related guide for more context on this concept.") + "</p>" +
        fullGuideHtml();
    }

    return paragraphHtml(fragment.body) +
      bulletHtml(fragment.bullets) +
      (fragment.whyItMatters ? "<p><strong>Why it matters:</strong> " + escapeHtml(fragment.whyItMatters) + "</p>" : "") +
      (fragment.commonMistake ? "<p><strong>Common mistake:</strong> " + escapeHtml(fragment.commonMistake) + "</p>" : "") +
      "<details class=\"sl-help-subitem\" style=\"margin-top:12px;\" open>" +
        "<summary>Open full related guide</summary>" +
        "<div class=\"sl-help-body\">" +
          "<p>" + escapeHtml(help.summary || "Related Knowledge Base guide.") + "</p>" +
          fullGuideHtml() +
        "</div>" +
      "</details>";
  }

  function renderRelatedPanel(card, title, bodyHtml) {
    var existing = card.querySelector("[data-sl-help-related]");
    if (!existing) {
      existing = document.createElement("div");
      existing.className = "sl-help-related";
      existing.setAttribute("data-sl-help-related", "");
      var content = card.querySelector("[data-sl-help-content]");
      if (content) content.appendChild(existing);
      else card.appendChild(existing);
    }

    existing.innerHTML =
      "<div class=\"sl-help-related-head\">" +
        "<h3 class=\"sl-help-related-title\">" + escapeHtml(title || "Related Knowledge Base") + "</h3>" +
        "<button type=\"button\" class=\"sl-help-related-close\" data-sl-help-related-close>Close</button>" +
      "</div>" +
      "<div class=\"sl-help-related-body\">" + bodyHtml + "</div>";

    existing.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function openHelpReference(card, kbKey, anchor) {
    try {
      if (!kbKey) return;

      renderRelatedPanel(card, "Loading related guide…", "<p>Loading Knowledge Base reference.</p>");

      var index = await getHelpIndex();
      var helpFile = index.toolHelp && index.toolHelp[kbKey];

      if (!helpFile) {
        renderRelatedPanel(card, "Related guide unavailable", "<p>No Knowledge Base entry is registered for " + escapeHtml(kbKey) + ".</p>");
        return;
      }

      var help = await fetchJson("/assets/help/" + helpFile + "?v=" + encodeURIComponent(index.version || VERSION_PLACEHOLDER));
      renderRelatedPanel(card, help.title || "Related Knowledge Base", relatedBodyHtml(help, anchor));
    } catch (error) {
      renderRelatedPanel(card, "Related guide unavailable", "<p>" + escapeHtml(error.message || "Unable to load related Knowledge Base content.") + "</p>");
    }
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

    card.addEventListener("click", function (event) {
      var closeBtn = event.target.closest("[data-sl-help-related-close]");
      if (closeBtn && card.contains(closeBtn)) {
        var related = card.querySelector("[data-sl-help-related]");
        if (related) related.remove();
        return;
      }

      var refBtn = event.target.closest("[data-sl-help-ref]");
      if (!refBtn || !card.contains(refBtn)) return;

      event.preventDefault();

      var isHidden = content.hasAttribute("hidden");
      if (isHidden) {
        content.removeAttribute("hidden");
        toggle.textContent = "Close guide";
      }

      openHelpReference(
        card,
        refBtn.getAttribute("data-sl-help-ref"),
        refBtn.getAttribute("data-sl-help-anchor")
      );
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
      var index = await getHelpIndex();
      var helpFile = index.toolHelp && index.toolHelp[toolPath.key];
      if (!helpFile) return;

      var help = await fetchJson("/assets/help/" + helpFile + "?v=" + encodeURIComponent(index.version || VERSION_PLACEHOLDER));

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
