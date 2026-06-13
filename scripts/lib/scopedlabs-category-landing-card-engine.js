const fs = require("fs");

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hrefOf(anchorBlock) {
  const match = String(anchorBlock || "").match(/href\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function classOf(anchorBlock) {
  const match = String(anchorBlock || "").match(/class\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function classAttrOf(anchorBlock) {
  const className = classOf(anchorBlock);
  return className ? ' class="' + className + '"' : ' class="tool-row tool-row--center"';
}

function pillClassOf(anchorBlock) {
  const match = String(anchorBlock || "").match(/<span\b[^>]*class\s*=\s*["']([^"']+)["'][^>]*>[^<]*<\/span>/i);
  return match ? match[1] : "pill pill--pro";
}

function hasLockIcon(anchorBlock) {
  return String(anchorBlock || "").includes("lock-icon");
}

function extractAnchors(html) {
  const anchors = [];
  const regex = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let match;

  while ((match = regex.exec(String(html || "")))) {
    anchors.push({
      start: match.index,
      end: match.index + match[0].length,
      block: match[0],
      href: hrefOf(match[0]),
      className: classOf(match[0]),
      text: cleanText(match[0]),
    });
  }

  return anchors;
}

function findAnchorByHref(html, href) {
  return extractAnchors(html).find((anchor) => anchor.href === href) || null;
}

function findAnchorByText(html, text) {
  return extractAnchors(html).find((anchor) => anchor.text.includes(text)) || null;
}

function removeAnchorsByHref(html, href) {
  let next = String(html || "");
  const anchors = extractAnchors(next).filter((anchor) => anchor.href === href);

  for (const anchor of anchors.reverse()) {
    next = next.slice(0, anchor.start).replace(/\s*$/, "\n") + next.slice(anchor.end).replace(/^\s*/, "");
  }

  return next;
}

function removeMarkedBlock(html, startName, endName) {
  const pattern = new RegExp("\\n?\\s*<!--\\s*" + startName + "\\s*-->[\\s\\S]*?<!--\\s*" + endName + "\\s*-->\\s*\\n?", "g");
  return String(html || "").replace(pattern, "\n");
}

function findEnclosingBlockByText(html, text, tagName) {
  const source = String(html || "");
  const textIndex = source.indexOf(text);
  if (textIndex === -1) return null;

  const openRegex = new RegExp("<" + tagName + "\\b[^>]*>", "gi");
  const closeRegex = new RegExp("</" + tagName + ">", "gi");
  const candidates = [];
  let openMatch;

  while ((openMatch = openRegex.exec(source))) {
    const start = openMatch.index;
    if (start > textIndex) break;

    closeRegex.lastIndex = textIndex;
    const closeMatch = closeRegex.exec(source);
    if (!closeMatch) continue;

    const end = closeMatch.index + closeMatch[0].length;

    if (start <= textIndex && end >= textIndex) candidates.push({ start, end, length: end - start });
  }

  candidates.sort((a, b) => a.length - b.length);
  return candidates[0] || null;
}

function removeSectionByText(html, text) {
  let next = String(html || "");

  while (next.includes(text)) {
    const section = findEnclosingBlockByText(next, text, "section") ||
      findEnclosingBlockByText(next, text, "div");

    if (!section) break;

    next = next.slice(0, section.start).replace(/\s*$/, "\n\n") + next.slice(section.end).replace(/^\s*/, "");
  }

  return next;
}

function removeOneOffLandingBlocks(html) {
  let next = String(html || "");

  const blocks = [
    ["scopedlabs-access-control-category-card-repair-0612-start", "scopedlabs-access-control-category-card-repair-0612-end"],
    ["scopedlabs-access-control-summary-card-0613-start", "scopedlabs-access-control-summary-card-0613-end"],
    ["scopedlabs-access-control-summary-card-pattern-0613-start", "scopedlabs-access-control-summary-card-pattern-0613-end"],
    ["scopedlabs-access-control-summary-link-0612-start", "scopedlabs-access-control-summary-link-0612-end"],
    ["scopedlabs-access-control-summary-link-0612-fix-start", "scopedlabs-access-control-summary-link-0612-fix-end"],
  ];

  for (const [start, end] of blocks) next = removeMarkedBlock(next, start, end);

  next = next.replace(/<style\b[^>]*id=["']access-control-category-finalize-card-style-0613["'][\s\S]*?<\/style>\s*/gi, "");
  next = next.replace(/<style\b[^>]*id=["']access-control-category-summary-card-style-0613["'][\s\S]*?<\/style>\s*/gi, "");

  next = removeSectionByText(next, "Finalize the Access Control design");
  next = removeSectionByText(next, "Category Summary");

  return next;
}

function buildStandardRowCard(templateAnchorBlock, card) {
  const classAttr = classAttrOf(templateAnchorBlock);
  const aria = escapeHtml(card.title);
  const href = escapeHtml(card.href);
  const lock = card.useLockIcon === true || (card.useLockIcon !== false && hasLockIcon(templateAnchorBlock))
    ? '<span class="lock-icon"></span>'
    : '';
  const dataTool = card.dataTool ? '\n  data-tool="' + escapeHtml(card.dataTool) + '"' : '';

  let pill = "";
  if (card.tier) {
    const pillClass = escapeHtml(card.pillClass || pillClassOf(templateAnchorBlock));
    pill =
      '\n    <div class="tool-row-pill">\n' +
      '      <span class="' + pillClass + '">' + escapeHtml(card.tier) + '</span>\n' +
      '    </div>';
  }

  return '<a' + classAttr + '\n  href="' + href + '"' + dataTool + '\n  aria-label="' + aria + '">\n' +
    '  <div class="tool-row-center">\n' +
    '    <div class="tool-row-title">' + lock + escapeHtml(card.title) + '</div>\n' +
    '    <div class="tool-row-sub">' + escapeHtml(card.description) + '</div>' +
    pill + '\n' +
    '  </div>\n' +
    '</a>';
}

function insertAfterAnchor(html, anchor, block) {
  return String(html || "").slice(0, anchor.end).replace(/\s*$/, "\n") + "\n" + block + "\n" + String(html || "").slice(anchor.end).replace(/^\s*/, "");
}

function insertBeforeFooter(html, block) {
  const source = String(html || "");
  const footerTag = source.search(/<footer\b/i);
  const copyright = source.indexOf("© ScopedLabs");
  const mainClose = source.lastIndexOf("</main>");

  let insertAt = -1;

  if (footerTag !== -1) insertAt = footerTag;
  else if (copyright !== -1) {
    const beforeSection = source.lastIndexOf("<section", copyright);
    const beforeDiv = source.lastIndexOf("<div", copyright);
    insertAt = Math.max(beforeSection, beforeDiv);
    if (insertAt === -1) insertAt = copyright;
  } else if (mainClose !== -1) {
    insertAt = mainClose;
  }

  if (insertAt === -1) throw new Error("Could not find footer/main insertion point.");

  return source.slice(0, insertAt).replace(/\s*$/, "\n\n") + block + "\n" + source.slice(insertAt).replace(/^\s*/, "");
}

function applyCategoryLandingCards(html, config) {
  let next = removeOneOffLandingBlocks(html);

  const templateAnchor = findAnchorByHref(next, config.templateHref) || findAnchorByText(next, config.templateTitle || "");
  if (!templateAnchor) throw new Error("Could not find landing card template: " + config.templateHref);

  for (const card of config.toolCards || []) next = removeAnchorsByHref(next, card.href);

  let insertAfter = findAnchorByHref(next, config.insertAfterHref) || templateAnchor;

  for (const card of config.toolCards || []) {
    const cardHtml = buildStandardRowCard(templateAnchor.block, card);
    next = insertAfterAnchor(next, insertAfter, cardHtml);
    insertAfter = findAnchorByHref(next, card.href);
  }

  for (const card of config.summaryCards || []) {
    next = removeAnchorsByHref(next, card.href);

    const cardHtml = buildStandardRowCard(templateAnchor.block, card);
    const sectionHtml = '\n<!-- ' + card.markerStart + ' -->\n' +
      '<section class="card" ' + card.sectionAttribute + '>\n' +
      '  <h2>' + escapeHtml(card.sectionTitle) + '</h2>\n' +
      '  <p>' + escapeHtml(card.sectionDescription) + '</p>\n' +
      '  ' + cardHtml + '\n' +
      '</section>\n' +
      '<!-- ' + card.markerEnd + ' -->\n';

    next = insertBeforeFooter(next, sectionHtml);
  }

  return next;
}

module.exports = {
  cleanText,
  hrefOf,
  classOf,
  extractAnchors,
  findAnchorByHref,
  findAnchorByText,
  removeOneOffLandingBlocks,
  buildStandardRowCard,
  applyCategoryLandingCards,
};
