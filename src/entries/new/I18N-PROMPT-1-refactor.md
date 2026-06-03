# IDE Prompt 1 of 2 — i18n-Ready Refactor (English only, shippable) — FINAL

## Context

"On The Record" is an Eleventy + Nunjucks static site. One rendered `index.html`
from `src/index.njk`; all interactivity in one vanilla-JS IIFE
`src/assets/filter.js` (faceted filters + instant search with FLIP + collapsible
sections + expand-all); styling in `src/assets/style.css` with CSS custom
properties. No framework, no bundler, no runtime deps, no localStorage. Entries
are ~95 Markdown files in `src/entries/` with frontmatter
(`title, section, region, status, date, tag, sources[]` where each source has
`label, url, archive_url, video?`, plus `last_verified`) and a prose body.
Config + taxonomies + pullquotes + UI strings live in `src/_data/site.js`. There
is a local `scripts/archive-sources.js` (Wayback snapshots -> `archive_url`).
`src/index.html` at repo root is a STALE build artifact — never edit it by hand;
the build overwrites it.

## Decisions already made (do not re-litigate)

- **URL layout:** English at root `/`; future languages at `/de/`, `/es/`.
  Existing English URLs MUST NOT change.
- **Fallback:** missing translation -> render the English body with a small
  "translated from English / not yet translated" note. Every logical entry
  resolves to something in every language; pages never have holes.
- **Option B data model:** language-NEUTRAL metadata (section, region, status,
  date, sources) lives once per entry; per-language TEXT (title, tag, body)
  lives separately. Sources never duplicate across languages.
- **Authoring = Markdown; output = data.** Bodies are authored as Markdown and
  compiled AT BUILD TIME into a typed-block array that both the static pages and
  a future lazy-loader/JSON consume. No Markdown parsing at runtime.
- **Endless-scroll is coming** (not in this PR): the build must EMIT per-language
  `entries.json` and `search-index.json` now, even though Phase-1 pages render
  all entries server-side. We turn on a consumer later; we emit the data now.
- **Auto-detect must NOT redirect** (SEO). Phase 1 only lays groundwork; the
  language-hint banner ships in Prompt 2.

## Target structure

```
src/
  entries/
    _meta/{slug}.json        # NEUTRAL: { slug, section, region, status, date,
                             #   sources:[{label,url,archive_url,video?}],
                             #   last_verified }  <- ONE source of truth
    en/{slug}.md             # TRANSLATABLE: frontmatter { title, tag } + Markdown body
    # de/ es/ come in later prompts
  _data/
    site.js                  # language-NEUTRAL: languages[], form key, site url,
                             #   sections[] (keys+order+num), regions[], statuses[]
    i18n/
      en.js                  # EN UI strings: section labels, status labels,
                             #   region labels, tagline, kicker, disclaimer,
                             #   all chrome, pullquotes, the fallback-note string
  _includes/
    layout.njk               # shared shell, takes a `lang` + resolved entries
  en.njk                     # builds "/" from the resolver for lang=en
  assets/
    markdown-blocks.js       # NEW: shared parser + renderer (provided below)
    filter.js                # search wired to the emitted index (DOM fallback)
scripts/
  archive-sources.js         # RETARGET to entries/_meta/*.json only
  build-entries.js           # NEW (or _data global): the resolver
```

## TASK 1 — Split entries into _meta + en, without changing output

For every existing `src/entries/{slug}.md`:

1. Create `src/entries/_meta/{slug}.json` containing ONLY the neutral fields:
   `slug, section, region, status, date, sources, last_verified`. Sources keep
   `label, url, archive_url, video`. `section/region/status` stay as KEYS
   (e.g. `"climate"`), never display labels.
2. Rewrite the Markdown file to `src/entries/en/{slug}.md` containing ONLY
   `title` and `tag` in frontmatter, plus the prose body unchanged.
3. Do this for all entries via a one-time migration script you write and run
   (`scripts/migrate-to-i18n.js`), then delete the script. Verify counts: number
   of `_meta/*.json` === number of `en/*.md` === original entry count. Print any
   slug present in one set but not the other and STOP if mismatched.

EDGE CASES — eyeball these after migration: titles with embedded quotes (the
Epstein 2008 entry), German-topic entries with umlauts (cum-ex, warburg), and
any entry whose body contains backticks or inline code. Confirm frontmatter
round-trips without mangling quotes/dates/umlauts.

## TASK 2 — The resolver (build-time data)

Create an Eleventy data source (a `_data` global, e.g.
`src/_data/resolvedEntries.js`, or `scripts/build-entries.js` wired in
`.eleventy.js`) that, FOR A GIVEN LANGUAGE, produces the full entry list:

For each `_meta/{slug}.json`:
- Look for `entries/{lang}/{slug}.md`; if absent, use `entries/en/{slug}.md`.
- Set `translated: true` if the language file existed, else `false`.
- Compile that file's Markdown body -> typed-block array via the shared
  `parseMarkdownToBlocks` (TASK 3). Pass the slug as the `ctx` arg so build
  errors name the offending entry.
- Merge: `{ ...meta, title, tag, bodyBlocks, translated, lang }`.
- Sort newest-first by `date` (preserve current ordering behavior exactly).

Expose so `en.njk` (and later `de.njk`, `es.njk`) each get their resolved, sorted
list. For Phase 1 only `en` exists, so `translated` is always true — but the
resolver MUST already implement the fallback path and the `translated` flag so
Prompt 2 is a no-op on logic. Unit-confirm fallback by temporarily pointing the
resolver at a fake `de` for one slug and seeing it fall back + flag false.

## TASK 3 — Markdown -> typed blocks (use the provided file, do NOT write your own parser)

Create `src/assets/markdown-blocks.js` with EXACTLY the implementation below.
Do NOT hand-roll a regex parser and do NOT use the simplistic boilerplate
patterns floating around — they silently drop content and auto-linkify bare
URLs. This implementation parses via markdown-it's AST, keeps `linkify:false`
(in an accountability ledger every link must be deliberate), preserves mark
nesting order, handles inline code / line breaks / lists, and — critically —
**FAILS LOUD**: any token type it does not explicitly handle throws during the
build (naming the entry) instead of dropping content. Silent content loss is the
worst possible failure for this project; a build error you must fix is the
correct behavior.

Wire it as a global Eleventy filter (`renderBlocks`) so templates render blocks
to escaped HTML server-side via the SAME function a future client renderer would
use. Use `blocksToPlaintext` for the search index.

```javascript
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
```

Install `markdown-it` only if the project doesn't already depend on it (Eleventy
usually bundles it; prefer reusing the bundled instance if exposed). No other
new dependencies.

## TASK 4 — Templates render from resolved entries via the shared renderer

Refactor `src/index.njk` into `src/_includes/layout.njk` (shared shell: head,
`<html lang="{{ lang }}">`, header, filter bar, sections loop, footer) + a thin
`src/en.njk` that sets `lang="en"`, pulls the EN i18n strings and the resolved
EN entries, and renders. Output path for `en.njk` is `/` (root) — confirm the
built `index.html` is structurally identical to today.

- ALL user-facing strings (section labels, status names, region labels, tagline,
  kicker, disclaimer, "clear all", "expand all"/"collapse all", "Suggest an
  Entry", pullquotes, the translation-note string) come from
  `_data/i18n/en.js`. Nothing user-facing stays hardcoded in the template.
- Preserve EXACTLY, from prior PRs: the `§` (non-numeric) marker on the meta
  "How To Use This" / "Suggest an Entry" sections (no stale numbers); the
  data-driven `sectionIntros`; collapsible sections + carets + expand-all;
  pullquote-inside-`.sec-content` and the "show pullquote only if section has
  >=1 visible entry" rule; the contact form; archive links; verified stamps;
  the mobile flex-wrap rules for the filter/search bar under 600px.
- Render each entry body by passing `bodyBlocks` through the global
  `renderBlocks` filter (escaped HTML). Keep `data-section/region/status/year`
  attrs, `.sources` (with `archived` links), `.verified` stamp — all from `_meta`.
- Add a per-entry `translated` hook: when `false`, render a small
  `.translation-note` (text from i18n). In Phase 1 this never fires; build it
  anyway and unit-confirm it renders when forced.

## TASK 5 — Emit data outputs for the future (don't consume yet)

The build must also write, per language (just `en` now, English at root):
- `/entries.json` — the full resolved list (meta + title + tag + bodyBlocks +
  translated). One file is fine now; structure it so pagination can be added
  later without breaking the shape.
- `/search-index.json` — per-entry `{ slug, title, tag, sectionKey,
  sectionLabel, region, status, year, text }` where `text` is
  `blocksToPlaintext(bodyBlocks)`. This is the FULL index — critical so that when
  lazy-scroll lands, search still covers entries not yet scrolled in.

Phase-1 pages still render all entries server-side; these JSON files are emitted
but not yet consumed by a lazy-loader. Confirm they exist in `_site/` and are
valid JSON with every slug present. Do NOT build the lazy-loader.

## TASK 6 — Point search at the index (forward-compatible)

`filter.js` currently builds its search index from the rendered DOM. Change it to
prefer an inlined `window.__SEARCH_INDEX__` (emitted by the build) OR fetch
`/search-index.json`; fall back to DOM-scrape if neither is present (progressive
enhancement). Behavior, scoring (W weights), FLIP reorder, `<mark>` highlight,
keyboard (`/`, Cmd/Ctrl-K, Esc), empty state, `?q=` sync — ALL unchanged. This
guarantees search covers ALL entries regardless of what's rendered/scrolled,
which is the prerequisite for endless-scroll later.

## TASK 7 — Retarget the archive script

`scripts/archive-sources.js` must now read sources from `entries/_meta/*.json`
(the single source of truth) and write `archive_url` back THERE — never
per-language, never per `en/*.md`. Update its globbing and frontmatter/JSON-write
logic accordingly. Keep it idempotent and `--force`-aware. Update the README:
archiving targets `_meta/`.

## Constraints

- English-only output. The site must look and behave identically to today.
  Diff the rendered `_site/index.html` against the current build and justify any
  delta (acceptable deltas: whitespace from templating; the inlined search index;
  new JSON files).
- No new heavy dependencies. Reuse Eleventy's markdown-it if exposed; otherwise
  add `markdown-it` only.
- `src/index.html` (root, stale) is output — don't hand-edit; let the build write it.
- Preserve EVERY prior feature listed in Task 4. A missing caret, intro,
  pullquote rule, or mobile wrap = regression.
- One shared escaped-render path (`markdown-blocks.js`) for server + future
  client. No raw HTML in JSON, ever. The parser must fail loud, never drop content.

## Acceptance criteria

- `_meta/*.json` count === `en/*.md` count === original entry count; resolver
  logs zero orphan slugs; edge-case entries (Epstein quotes, umlaut slugs,
  inline-code bodies) round-trip intact.
- Built `/` is structurally identical to the current site (sections, order,
  intros, pullquotes, collapsible behavior, entries, sources, archive links,
  verified stamps, mobile wrap).
- The Markdown compiler throws (build fails) on any unhandled token rather than
  dropping content — verify by feeding a temporary entry an unsupported
  construct and confirming a named build error, then remove it.
- `/entries.json` and `/search-index.json` exist in `_site/`, valid JSON, full
  coverage. Search demonstrably indexes ALL entries (test a term appearing only
  in an entry far down the page).
- Forcing `translated:false` on one entry renders the note; with all English it
  never appears.
- `npm run archive` reads/writes `_meta/` only.
- No console errors; no new heavy deps; Lighthouse not regressed; no layout shift.

## Deliverables

1. `scripts/migrate-to-i18n.js` (run once, then deleted) + resulting
   `entries/_meta/*.json` and `entries/en/*.md`.
2. Resolver (`_data/resolvedEntries.js` or `scripts/build-entries.js` + wiring).
3. `src/assets/markdown-blocks.js` (exactly as provided) + global `renderBlocks`
   filter wiring in `.eleventy.js`.
4. `src/_includes/layout.njk` + `src/en.njk`; `_data/i18n/en.js` with ALL UI
   strings extracted; `site.js` reduced to language-neutral config.
5. JSON emit step (`entries.json`, `search-index.json`).
6. `filter.js` search wired to the index with DOM fallback.
7. Retargeted `scripts/archive-sources.js` + README update.
8. `docs/I18N.md` describing the model, resolver, fallback rule, the fail-loud
   parser contract, and exactly what Prompt 2 will add.

Work in small, reviewable commits in task order. Show a diff plan before TASK 1
(migration) and TASK 4 (template restructure) — the two highest-risk steps. End
state: identical English site on a structure ready for `/de/`, `/es/`, and
endless-scroll, with zero broken intermediate states.
