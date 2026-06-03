// ============================================================================
// markdown-blocks.js  —  Markdown ⇄ typed-block compiler + shared HTML renderer
//
// Used at BUILD TIME (Nunjucks/Eleventy) and reusable client-side. One render
// path, escaped, no raw HTML in the data. Replaces the regex approach.
//
// Design rules:
//  - Parse via markdown-it's AST (.parse), never regex.
//  - linkify MUST be false: in an accountability ledger every link is
//    deliberate; auto-linkifying bare domains in body text is a data-integrity
//    bug, not a convenience.
//  - FAIL LOUD: any token type we don't explicitly handle throws during build,
//    so we never silently drop content (inline code, line breaks, lists, etc.).
//    Silent content loss is the worst failure mode for this project.
//  - Nesting order is preserved by tracking an ordered mark stack and emitting
//    marks outer→inner in the order they were opened.
// ============================================================================

"use strict";

const MarkdownIt = require("markdown-it");

// html:false → never trust raw HTML in source. linkify:false → no auto-links.
// typographer:false → keep punctuation verbatim (we control em-dashes/quotes).
const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

// ---- Parse: Markdown string -> block array --------------------------------

function parseMarkdownToBlocks(markdownText, ctx = "(unknown entry)") {
  const tokens = md.parse(markdownText || "", {});
  const blocks = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t.type) {
      case "paragraph_open":
        blocks.push({ type: "p", spans: [] });
        break;
      case "paragraph_close":
        break;
      case "heading_open":
        // Bodies shouldn't normally contain headings, but support h4 minimally
        // rather than dropping content. Anything bigger is a smell — flag it.
        if (t.tag !== "h4") {
          throw new Error(
            `[markdown-blocks] Unexpected heading <${t.tag}> in ${ctx}. ` +
              `Entry bodies should use prose, not headings (h4 max).`
          );
        }
        blocks.push({ type: "h4", spans: [] });
        break;
      case "heading_close":
        break;
      case "bullet_list_open":
      case "ordered_list_open":
        blocks.push({ type: "ul", items: [] });
        break;
      case "bullet_list_close":
      case "ordered_list_close":
        break;
      case "list_item_open":
        // items collect spans; push a placeholder the inline handler fills
        blocks[blocks.length - 1].items.push({ spans: [] });
        break;
      case "list_item_close":
        break;
      case "inline":
        fillSpans(t, blocks, ctx);
        break;
      default:
        throw new Error(
          `[markdown-blocks] Unhandled block token "${t.type}" in ${ctx}. ` +
            `Add explicit handling — do NOT let content drop silently.`
        );
    }
  }
  return blocks;
}

// Fill the current target (paragraph, heading, or last list item) with spans
// from an inline token's children, preserving ordered mark nesting + links.
function fillSpans(inlineToken, blocks, ctx) {
  const container = blocks[blocks.length - 1];
  let target;
  if (container.type === "ul") {
    target = container.items[container.items.length - 1].spans;
  } else {
    target = container.spans;
  }

  const markStack = []; // ordered: outermost first
  let href = null;

  for (const c of inlineToken.children) {
    switch (c.type) {
      case "text":
        if (c.content.length) {
          const span = { text: c.content };
          if (markStack.length) span.marks = markStack.slice();
          if (href) span.href = href;
          target.push(span);
        }
        break;
      case "code_inline": {
        // Inline code is real content (e.g. `npm run archive`, `C8`). Never drop.
        const span = { text: c.content, marks: markStack.concat("code") };
        if (href) span.href = href;
        target.push(span);
        break;
      }
      case "softbreak":
      case "hardbreak":
        target.push({ text: "\n", marks: ["break"] });
        break;
      case "strong_open":
        markStack.push("strong");
        break;
      case "strong_close":
        popMark(markStack, "strong", ctx);
        break;
      case "em_open":
        markStack.push("em");
        break;
      case "em_close":
        popMark(markStack, "em", ctx);
        break;
      case "s_open":
        markStack.push("s");
        break;
      case "s_close":
        popMark(markStack, "s", ctx);
        break;
      case "link_open":
        href = c.attrGet("href");
        break;
      case "link_close":
        href = null;
        break;
      default:
        throw new Error(
          `[markdown-blocks] Unhandled inline token "${c.type}" in ${ctx}. ` +
            `Add explicit handling — silent drops corrupt entries.`
        );
    }
  }
}

function popMark(stack, mark, ctx) {
  const idx = stack.lastIndexOf(mark);
  if (idx === -1) {
    throw new Error(`[markdown-blocks] Unbalanced "${mark}" close in ${ctx}.`);
  }
  stack.splice(idx, 1);
}

// ---- Render: block array -> escaped HTML ----------------------------------
// Pure function. Same output server-side (Eleventy filter) and client-side.

function escapeText(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}

function renderSpan(span) {
  // Line breaks are their own span type.
  if (span.marks && span.marks.includes("break")) return "<br>";

  let html = escapeText(span.text);
  const marks = span.marks || [];

  // Inner marks first (closest to text), so emit in REVERSE open-order.
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i];
    if (m === "strong") html = `<strong>${html}</strong>`;
    else if (m === "em") html = `<em>${html}</em>`;
    else if (m === "s") html = `<s>${html}</s>`;
    else if (m === "code") html = `<code>${html}</code>`;
    else if (m === "break") {
      /* handled above */
    } else throw new Error(`[markdown-blocks] Unknown mark "${m}" at render.`);
  }

  // Link wraps OUTSIDE the marks (a link containing styled text).
  if (span.href) {
    html = `<a href="${escapeAttr(span.href)}" target="_blank" rel="noopener">${html}</a>`;
  }
  return html;
}

function renderBlocksToHTML(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "p") {
        return `<p>${block.spans.map(renderSpan).join("")}</p>`;
      }
      if (block.type === "h4") {
        return `<h4>${block.spans.map(renderSpan).join("")}</h4>`;
      }
      if (block.type === "ul") {
        const items = block.items
          .map((it) => `<li>${it.spans.map(renderSpan).join("")}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      throw new Error(`[markdown-blocks] Unknown block type "${block.type}".`);
    })
    .join("");
}

// ---- Plaintext (for the search index) -------------------------------------
function blocksToPlaintext(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === "ul") {
      for (const it of b.items) out.push(it.spans.map((s) => s.text).join(""));
    } else {
      out.push((b.spans || []).map((s) => s.text).join(""));
    }
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

module.exports = {
  parseMarkdownToBlocks,
  renderBlocksToHTML,
  blocksToPlaintext,
};
