// ============================================================================
// resolvedEntries.js — Eleventy data source for i18n-ready entry resolution
//
// For a given language, resolves entries by merging:
// - Neutral metadata from entries/_meta/{slug}.json
// - Translatable content from entries/{lang}/{slug}.md (fallback to en)
// - Compiled body blocks via markdown-blocks parser
// ============================================================================

"use strict";

const fs = require("fs");
const path = require("path");
const grayMatter = require("gray-matter");
const { parseMarkdownToBlocks } = require("../assets/markdown-blocks");

const ENTRIES_DIR = path.join(__dirname, "../entries");
const META_DIR = path.join(ENTRIES_DIR, "_meta");

// Helper function that does the actual resolution
function resolveForLang(lang = "en") {
  // Read all _meta JSON files
  const metaFiles = fs.readdirSync(META_DIR).filter(f => f.endsWith(".json"));
  const entries = [];

  for (const file of metaFiles) {
    const slug = file.replace(/\.json$/, "");
    const metaPath = path.join(META_DIR, file);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));

    // Look for language-specific Markdown file
    const langPath = path.join(ENTRIES_DIR, lang, `${slug}.md`);
    const enPath = path.join(ENTRIES_DIR, "en", `${slug}.md`);
    const mdPath = fs.existsSync(langPath) ? langPath : enPath;
    const translated = fs.existsSync(langPath);

    if (!fs.existsSync(mdPath)) {
      console.warn(`[resolvedEntries] No Markdown file found for ${slug} (lang=${lang}, fallback to en)`);
      continue;
    }

    const mdContent = fs.readFileSync(mdPath, "utf8");
    const parsed = grayMatter(mdContent);

    // Compile Markdown body to blocks
    const bodyBlocks = parseMarkdownToBlocks(parsed.content, slug);

    // Merge neutral + translatable.
    // `added` is the date the entry was added to this site (populated by
    // scripts/backfill-added.js). Fall back to the event date string so the
    // field is always present for the template and client sort.
    const addedDate = meta.added || String(meta.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    entries.push({
      ...meta,
      added: addedDate,
      title: parsed.data.title,
      tag: parsed.data.tag || null,
      bodyBlocks,
      translated,
      lang,
    });
  }

  // Sort newest-first by date (preserve current ordering)
  entries.sort((a, b) => {
    const da = new Date(a.date || 0);
    const db = new Date(b.date || 0);
    return db - da;
  });

  return entries;
}

// Eleventy data source: returns the resolved entries object
module.exports = {
  en: resolveForLang("en"),
  de: resolveForLang("de"),
  // For future languages:
  // es: resolveForLang("es"),
};
