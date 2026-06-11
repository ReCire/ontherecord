// ============================================================================
// entryPages.js — flat list of every entry × every language, for the paginated
// per-entry page template (src/entry-pages.njk). One item per page:
//   en → /entry/{slug}/      de → /de/eintrag/{slug}/
//
// Carries the resolved entry plus `lang`, full body `plain` text, and a
// language-correct ~160-char `descr` for <meta description> / OG teaser. The
// bracketed tier glosses ([alleged], ["quoted"]) are citation apparatus — they
// are stripped from the description, just as they are from the card teaser.
// ============================================================================
"use strict";

const resolved = require("./resolvedEntries");
const { blocksToPlaintext } = require("../assets/markdown-blocks");

const LANGS = ["en", "de"];

function stripGloss(s) {
  return String(s || "").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
}

function clip(s, max) {
  const clean = stripGloss(s);
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max + 1);
  let i = slice.lastIndexOf(" ");
  if (i <= 0) i = max;
  return clean.slice(0, i).replace(/[\s,.;:]+$/, "") + "\u2026";
}

module.exports = () => {
  const out = [];
  for (const lang of LANGS) {
    const list = resolved[lang] || [];
    for (const e of list) {
      if (!e || !e.slug) continue;
      const plain = blocksToPlaintext(e.bodyBlocks || []);
      out.push({ ...e, lang, plain, descr: clip(plain, 160) });
    }
  }
  return out;
};
