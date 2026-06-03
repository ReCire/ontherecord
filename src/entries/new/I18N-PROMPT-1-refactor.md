# IDE Prompt 1 of 2 — i18n-Ready Refactor (English only, shippable)

Paste below the line into your IDE agent. This is the **structural** PR. It adds
NO new languages and the live site must look byte-for-byte identical when done.
It exists to make the architecture support languages and a future lazy-load
endless-scroll **without** ever creating a broken intermediate state. Prompt 2
(adding German) comes only after this ships and is verified.

Do not start Prompt 2 work. Do not add German or Spanish content. English only.

---

## Context

"On The Record" is an Eleventy + Nunjucks static site. One rendered `index.html`
from `src/index.njk`; all interactivity in one vanilla-JS IIFE
`src/assets/filter.js` (faceted filters + instant search + collapsible
sections); styling in `src/assets/style.css` with CSS custom properties. No
framework, no bundler, no runtime deps, no localStorage in artifacts (but this
is the real site — a plain cookie is acceptable where noted). Entries are ~95
Markdown files in `src/entries/` with frontmatter
(`title, section, region, status, date, tag, sources[], archive_url,
last_verified`) and a prose body. Config + taxonomies + pullquotes + UI strings
live in `src/_data/site.js`. There is a local `scripts/archive-sources.js`
(Wayback snapshots → `archive_url`). `src/index.html` at repo root is a STALE
build artifact — never edit it by hand; the build overwrites it.

## Decisions already made (do not re-litigate)

- **URL layout:** English at root `/`; future languages at `/de/`, `/es/`.
  Existing English URLs MUST NOT change.
- **Fallback:** missing translation → render the English body with a small
  "translated from English / not yet translated" note. Every logical entry
  resolves to something in every language; pages never have holes.
- **Option B data model:** language-NEUTRAL metadata (section, region, status,
  date, sources) lives once per entry; per-language TEXT (title, tag, body)
  lives separately. Sources never duplicate across languages.
- **Authoring = Markdown; output = data.** Bodies are authored as Markdown and
  compiled AT BUILD TIME into a typed-block data structure that both the static
  pages and a future lazy-loader/JSON consume. No Markdown parsing at runtime.
- **Endless-scroll is coming** (not in this PR): the build must EMIT per-language
  `entries.json` and `search-index.json` now, even though Phase-1 pages render
  all entries server-side. We turn on a consumer later; we emit the data now.
- **Auto-detect must NOT redirect** (SEO). See "Language hint banner" — Phase 1
  only lays groundwork; the banner ships in Prompt 2.

## Target structure

```
src/
  entries/
    _meta/{slug}.json        # NEUTRAL: { slug, section, region, status, date,
                             #   sources:[{label,url,archive_url,video?}],
                             #   last_verified }  ← ONE source of truth
    en/{slug}.md             # TRANSLATABLE: frontmatter { title, tag } + Markdown body
    # de/ es/ come in later prompts
  _data/
    site.js                  # language-NEUTRAL: languages[], form key, site url,
                             #   sections[] (keys+order+num), regions[], statuses[]
    i18n/
      en.js                  # EN UI strings: section labels, status labels,
                             #   region labels, tagline, disclaimer, all chrome,
                             #   pullquotes
  _includes/
    layout.njk               # shared shell, takes a `lang` + resolved entries
  en.njk                     # builds "/" from the resolver for lang=en
  assets/ ...                # unchanged except search wiring
scripts/
  archive-sources.js         # RETARGET to entries/_meta/*.json only
  build-entries.js           # NEW (or Eleventy global-data): the resolver
```

## TASK 1 — Split entries into _meta + en, without changing output

For every existing `src/entries/{slug}.md`:

1. Create `src/entries/_meta/{slug}.json` containing ONLY the neutral fields:
   `slug, section, region, status, date, sources, last_verified`. (Sources keep
   `label, url, archive_url, video`.)
2. Rewrite the Markdown file to `src/entries/en/{slug}.md` containing ONLY
   `title` and `tag` in frontmatter, plus the prose body unchanged.
3. Do this for all ~95 entries via a one-time migration script you write and run
   (`scripts/migrate-to-i18n.js`), then delete the script. Verify counts: number
   of `_meta/*.json` === number of `en/*.md` === original entry count. Print any
   slug present in one but not the other and STOP if mismatched.

`entries.json`-style label note: `_meta` `section/region/status` stay as KEYS
(e.g. `"climate"`), never display labels — labels come from i18n files.

## TASK 2 — The resolver (build-time data)

Create an Eleventy data source (a `_data` global, e.g.
`src/_data/resolvedEntries.js`, or `scripts/build-entries.js` wired in
`.eleventy.js`) that, **for a given language**, produces the full entry list:

For each `_meta/{slug}.json`:
- Look for `entries/{lang}/{slug}.md`; if absent, use `entries/en/{slug}.md`.
- Set `translated: true` if the language file existed, else `false`.
- Compile that file's Markdown body → a typed-block array (see TASK 3).
- Merge: `{ ...meta, title, tag, bodyBlocks, translated, lang }`.
- Sort newest-first by `date` (preserve current ordering behavior).

Expose this so `en.njk` (and later `de.njk`, `es.njk`) each get their resolved,
sorted list. For Phase 1 only `en` exists, so `translated` is always true — but
the resolver must already implement the fallback path and the `translated` flag
so Prompt 2 is a no-op on logic.

## TASK 3 — Markdown → typed blocks (build-time compile)

Write a small, dependency-light compiler (use Eleventy's existing markdown-it if
present; do NOT add a heavy new dep) that turns a Markdown body into a JSON-safe
block array, e.g.:

```json
[
  { "type": "p", "spans": [
      { "text": "DuPont made Teflon using " },
      { "text": "C8", "marks": ["em"] },
      { "text": ", a forever chemical." }
  ]},
  { "type": "p", "spans": [ { "text": "…", "marks": ["strong"] } ] }
]
```

- Support exactly what entries use: paragraphs, `em`, `strong`, inline links
  (`{text, href}`), and the em-dash/quotes as plain text. No headings/lists are
  needed in bodies today — if one appears, support `h4`/`ul`/`li` minimally
  rather than dropping content.
- This block array is what gets rendered to HTML in the static page AND what gets
  written into `entries.json`. One representation, two consumers.
- NEVER emit raw user HTML into JSON; never `innerHTML` these at runtime. The
  static template renders blocks → escaped HTML server-side; the future
  lazy-loader will build DOM nodes from blocks. Escaping is centralized in one
  render function reused by both.

## TASK 4 — Templates render from resolved entries

Refactor `src/index.njk` into `src/_includes/layout.njk` (shared shell: head,
`<html lang="{{ lang }}">`, header, filter bar, sections loop, footer) + a thin
`src/en.njk` that sets `lang="en"`, pulls the EN i18n strings and the resolved
EN entries, and renders. Output path for `en.njk` is `/` (root) — confirm the
built `index.html` is identical in structure to today.

- All UI strings (section labels, status names, region labels, tagline,
  disclaimer, "clear all", "Suggest an Entry", pullquotes, the "translated from
  English" note string) come from `_data/i18n/en.js`. Nothing user-facing stays
  hardcoded in the template.
- The section number fix (`§` not a stale number) and section intros and
  collapsible sections and pullquote-after-section behavior from prior PRs must
  be preserved exactly.
- Render each entry's body by walking `bodyBlocks` through ONE shared macro/
  function that emits escaped HTML. Keep `data-section/region/status/year` attrs,
  `.sources` (with `archived` links), `.verified` stamp — all from `_meta`.
- Add a per-entry `translated` hook: when `false`, render a small
  `.translation-note` (text from i18n). In Phase 1 this never fires; build it
  anyway and unit-confirm it renders when forced.

## TASK 5 — Emit data outputs for the future (don't consume yet)

The build must also write, per language (just `en` now):
- `/{lang excluded for en → /}entries.json` → e.g. `/entries.json` for English:
  the full resolved list (meta + title + tag + bodyBlocks + translated). Paginate
  later; one file is fine now.
- `/search-index.json` (English at root): per-entry `{ slug, title, tag,
  sectionKey, sectionLabel, region, status, year, text }` where `text` is the
  flattened plaintext of bodyBlocks. This is the FULL index — critical so that
  when lazy-scroll lands, search still covers entries not yet scrolled in.

Phase-1 pages still render all entries server-side; these JSON files are emitted
but not yet consumed by a lazy-loader. Confirm they exist in `_site/` and are
valid JSON.

## TASK 6 — Point search at the index (forward-compatible)

`filter.js` currently builds its search index from the rendered DOM. Change it to
prefer a `window.__SEARCH_INDEX__` (inlined by the build) OR fetch
`/search-index.json`; fall back to DOM-scrape if neither is present (progressive
enhancement). Behavior, scoring, FLIP, highlight, keyboard — all unchanged. This
guarantees search covers ALL entries regardless of what's rendered/scrolled,
which is the prerequisite for endless-scroll later. Do not build the lazy-loader.

## TASK 7 — Retarget the archive script

`scripts/archive-sources.js` must now read sources from `entries/_meta/*.json`
(the single source of truth) and write `archive_url` back THERE — never
per-language, never per `en/*.md`. Update its globbing and frontmatter-write
logic accordingly. Keep it idempotent and `--force`-aware. Update the README
note: archiving targets `_meta/`.

## Constraints

- English-only output. The site must look and behave identically to today.
  Diff the rendered `_site/index.html` against the current build and justify any
  delta (only acceptable deltas: whitespace from templating, and the inlined
  search index / new JSON files).
- No new heavy dependencies. Reuse Eleventy's markdown-it. No framework.
- `src/index.html` (root, stale) is output — don't hand-edit; let the build write it.
- Preserve every prior feature: facet filters, instant search + FLIP + highlight,
  collapsible sections + expand-all, section intros, `§` fix, pullquote rules,
  contact form, archive links, verified stamps.
- One shared escaped-render path for bodyBlocks (server + future client). No raw
  HTML in JSON, ever.

## Acceptance criteria

- `_meta/*.json` count === `en/*.md` count === original entry count; resolver
  logs zero orphan slugs.
- Built `/` is structurally identical to the current site (same sections, order,
  intros, pullquotes, entries, sources, archive links, verified stamps).
- `/entries.json` and `/search-index.json` exist in `_site/`, valid JSON, full
  coverage (every slug present).
- Search works exactly as before and demonstrably indexes ALL entries (test a
  term that only appears in an entry far down the page).
- Forcing `translated:false` on one entry renders the translation note; with all
  English it never appears.
- `npm run archive` reads/writes `_meta/` only; no per-language archiving.
- No console errors; no new deps; Lighthouse not regressed; no layout shift.

## Deliverables

1. `scripts/migrate-to-i18n.js` (run once, then deleted) + the resulting
   `entries/_meta/*.json` and `entries/en/*.md`.
2. Resolver (`_data/resolvedEntries.js` or `scripts/build-entries.js` + wiring).
3. Markdown→blocks compiler + the shared escaped block-render macro/function.
4. `src/_includes/layout.njk` + `src/en.njk`; `_data/i18n/en.js` with all UI
   strings extracted; `site.js` reduced to language-neutral config.
5. JSON emit step (`entries.json`, `search-index.json`).
6. `filter.js` search wired to the index with DOM fallback.
7. Retargeted `scripts/archive-sources.js` + README update.
8. A short `docs/I18N.md` describing the model, the resolver, the fallback rule,
   and exactly what Prompt 2 will add (so the next step is mechanical).

Work in small, reviewable commits in task order. Show a diff plan before TASK 4
(the template restructure) and TASK 1 (the migration), since those touch the
most. End state: identical English site on a structure ready for `/de/` and
`/es/` and endless-scroll, with zero broken intermediate states.
