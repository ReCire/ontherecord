# Internationalization (i18n) Architecture

This document describes the i18n-ready data model, resolver, fallback behavior, and the fail-loud parser contract for "On The Record".

## Data Model: Language-Neutral + Per-Language Text

The project uses **Option B**: language-neutral metadata lives once per entry, while per-language text (title, tag, body) lives separately.

### Structure

```
src/entries/
  _meta/{slug}.json        # NEUTRAL: { slug, section, region, status, date,
                           #   sources:[{label,url,archive_url,video?}],
                           #   last_verified }
  en/{slug}.md             # TRANSLATABLE: frontmatter { title, tag } + Markdown body
  # de/ es/ come in later prompts
```

### Why This Model?

- **Sources never duplicate** across languages — `archive_url` is written once in `_meta/`
- **Metadata keys** (section, region, status) are language-agnostic — they map to labels in i18n files
- **Fallback path** is clean: missing translation → render English with a note
- **Endless-scroll ready**: the build emits JSON that a future lazy-loader can consume

## Resolver: Build-Time Data Merging

The resolver (`src/_data/resolvedEntries.js`) runs at build time to produce the full entry list for a given language.

### Process

For each `_meta/{slug}.json`:
1. Look for `entries/{lang}/{slug}.md`
2. If absent, use `entries/en/{slug}.md` (fallback)
3. Set `translated: true` if the language file existed, else `false`
4. Compile the Markdown body → typed-block array via `parseMarkdownToBlocks`
5. Merge: `{ ...meta, title, tag, bodyBlocks, translated, lang }`
6. Sort newest-first by `date`

### Usage in Templates

```njk
{% set entries = resolvedEntries.en %}
{% for entry in entries %}
  <article data-section="{{ entry.section }}">
    <h3>{{ entry.title }}</h3>
    <div class="body">{{ entry.bodyBlocks | renderBlocks | safe }}</div>
  </article>
{% endfor %}
```

## Fallback Rule

**Missing translation → render English with a note.**

Every logical entry resolves to something in every language; pages never have holes. When `translated: false`, the template renders a small `.translation-note` (text from i18n). In Phase 1 (English only), this never fires.

## Markdown → Typed Blocks (Fail-Loud Parser)

Entry bodies are authored as Markdown and compiled **at build time** into a typed-block array via `src/assets/markdown-blocks.js`. This replaces the old regex approach.

### Why Typed Blocks?

- **No Markdown parsing at runtime** — faster, no heavy deps in the browser
- **Shared render path** — server-side (Nunjucks) and future client-side use the same function
- **Escaped HTML** — no raw HTML in the data, XSS-safe by default
- **Fail-loud contract** — any unhandled token type throws during build, never drops content silently

### Parser Contract

The parser uses `markdown-it`'s AST (`.parse`) with:
- `html: false` — never trust raw HTML in source
- `linkify: false` — in an accountability ledger, every link must be deliberate
- `typographer: false` — keep punctuation verbatim

**Unhandled tokens throw.** If the parser encounters a token type it doesn't explicitly handle (e.g., a new markdown-it feature), the build fails with a named error pointing to the offending entry. This is intentional: silent content loss is the worst possible failure mode for this project.

### Supported Block Types

- `p` — paragraphs
- `h4` — headings (minimal support; larger headings throw)
- `ul` / `ol` — lists

### Supported Inline Marks

- `strong` — bold
- `em` — italic
- `s` — strikethrough
- `code` — inline code
- `break` — line breaks
- `href` — links (wraps outside marks)

### Render Function

`renderBlocksToHTML(blocks)` converts the typed-block array to escaped HTML. This is wired as an Eleventy filter (`renderBlocks`) for server-side rendering and can be reused client-side for lazy-loading.

## Search Index

The build emits two JSON files per language:

### `/entries.json`

Full resolved list: `{ slug, section, region, status, date, sources, title, tag, bodyBlocks, translated, lang }`

### `/search-index.json`

Per-entry search data: `{ slug, title, tag, sectionKey, sectionLabel, region, status, year, text }`

Where `text` is `blocksToPlaintext(bodyBlocks)` — the full body text for search indexing.

### Client-Side Search

`filter.js` prefers:
1. Inlined `window.__SEARCH_INDEX__` (instant load)
2. Fallback to `/search-index.json` (fetch)
3. Final fallback to DOM scraping (progressive enhancement)

This guarantees search covers **all entries** regardless of what's rendered/scrolled — the prerequisite for endless-scroll.

## UI Strings

All user-facing strings live in `src/_data/i18n/{lang}.js`:

- Section labels
- Status labels
- Region labels
- Tagline, kicker, disclaimer
- Filter UI (filter toggle, expand/collapse all, clear all)
- Search UI (placeholder, empty state, results count)
- Meta section labels (how to use, suggest entry, sources, archived, last verified)
- Translation note string
- Contact form labels

`src/_data/site.js` now contains only language-neutral config (sections keys, region keys, status keys, deep-dig links, web3forms key, turnstile key).

## Archive Script

`scripts/archive-sources.js` now reads from `entries/_meta/*.json` (the single source of truth for neutral metadata). It writes `archive_url` and `last_verified` back to the JSON file, never to per-language Markdown files.

## What Prompt 2 Will Add

Phase 1 (this PR) is English-only output with the structure in place. Prompt 2 will:

- Add `de/` and `es/` language directories
- Add `src/_data/i18n/de.js` and `src/_data/i18n/es.js`
- Add `src/de.njk` and `src/es.njk` (output at `/de/` and `/es/`)
- Wire the language-hint banner (no auto-redirect, per SEO requirements)
- No logic changes — the resolver already implements the fallback path

## Verification Checklist

- `_meta/*.json` count === `en/*.md` count === original entry count
- Resolver logs zero orphan slugs
- Edge-case entries (Epstein quotes, umlaut slugs, inline-code bodies) round-trip intact
- Built `/` is structurally identical to the pre-refactor site
- The Markdown compiler throws on any unhandled token (test by adding a temporary unsupported construct)
- `/entries.json` and `/search-index.json` exist in `_site/`, valid JSON, full coverage
- Forcing `translated:false` on one entry renders the note
- `npm run archive` reads/writes `_meta/` only
- No console errors; no new heavy deps; Lighthouse not regressed
