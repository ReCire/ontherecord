# On The Record

A documented ledger of corporate & political harm, with primary sources.
Built with [Eleventy](https://www.11ty.dev/) — a static site generator. No
database, no server. You author Markdown + JSON; the build compiles it into a
fast static site with client-side filtering and search, ready for translation.

---

## One-time setup

1. Install [Node.js](https://nodejs.org/) 18+ (for global `fetch`; LTS is fine).
2. In this folder, run:
   ```
   npm install
   ```

## Daily workflow

- **Preview locally** (auto-reloads as you edit):
  ```
  npm run serve
  ```
  Open the URL it prints (usually http://localhost:8080).

- **Build for deploy:**
  ```
  npm run build
  ```
  The finished site lands in `_site/`.

- **Sanity-check the client JS before committing** (catches syntax errors that
  only surface in the browser):
  ```
  node --check src/assets/filter.js
  ```
  Make this a habit. A syntax error here silently halts the search/filter
  script — the page loads but interactivity dies. `node --check` catches it in
  one second; the browser console catches it only after you've deployed.

## Deploy to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com), import the repo.
3. Vercel auto-detects settings from `vercel.json`:
   - **Build command:** `npx @11ty/eleventy`
   - **Output directory:** `_site`
4. Every push to `main` auto-deploys.

Manual deploy with the Vercel CLI: `npx vercel --prod`. The site also works on
Cloudflare Pages, Netlify, or any static host (build `npm run build`, output
`_site`).

---

## Architecture (read this before changing anything structural)

The project separates three kinds of data so it can support multiple languages
without duplicating sources or drifting out of sync. This is the **Option B**
i18n model — understand it before refactoring, because several non-obvious
decisions here are load-bearing.

```
src/
├── entries/
│   ├── _meta/{slug}.json     # LANGUAGE-NEUTRAL metadata — the single source of truth
│   │                         #   { slug, section, region, status, date,
│   │                         #     sources:[{label,url,archive_url,video?}], last_verified }
│   └── en/{slug}.md          # TRANSLATABLE text only — frontmatter { title, tag } + Markdown body
│                             #   (de/{slug}.md, es/{slug}.md added during i18n rollout)
├── _data/
│   ├── site.js               # language-NEUTRAL config: section/region/status KEYS + order,
│   │                         #   form keys, site URL. NO display labels here.
│   ├── locales/en.js         # ENGLISH UI strings: section/region/status LABELS, tagline,
│   │                         #   kicker, disclaimer, all chrome, pullquotes, fallback note
│   ├── eleventyComputed.js   # aliases the active language's strings to a bare `i18n`
│   └── resolvedEntries.js    # the RESOLVER (see below)
├── _includes/
│   └── layout.njk            # the ONE live HTML shell (head, body, search-index inline)
├── en.njk                    # builds "/" — sets lang=en, pulls resolved entries
├── assets/
│   ├── style.css             # all styling
│   ├── filter.js             # client-side filters + search (one IIFE)
│   ├── markdown-blocks.js     # Markdown→typed-blocks compiler + shared HTML renderer
│   └── fonts/                # self-hosted woff2 (you add these)
└── scripts/
    └── archive-sources.js    # Wayback snapshots → _meta (run locally, see below)
```

### Why this model
- **Sources live once** in `_meta/{slug}.json` — never duplicated per language,
  so an archive URL or a corrected source is fixed in exactly one place.
- **Metadata is keys, labels are i18n.** `_meta` stores `section: "climate"`;
  the human label "Climate Deception" lives in `locales/en.js`. A new language
  is a new locale file, not re-tagged entries.
- **Bodies are authored in Markdown, compiled to data at build time.** You write
  prose; `markdown-blocks.js` turns it into a typed-block array that both the
  static page and the future lazy-loader/JSON consume. No Markdown parser runs
  in the browser.

### The resolver (`_data/resolvedEntries.js`)
For a given language it walks every `_meta/{slug}.json`, finds the matching
`entries/{lang}/{slug}.md` (falling back to `en/` if absent, flagging
`translated: false`), compiles the body to blocks, merges metadata + text, and
sorts newest-first. Templates render from its output. Adding a language is a
content task, not a logic change — the fallback path already exists.

### The fail-loud Markdown compiler (`assets/markdown-blocks.js`)
Parses via `markdown-it`'s AST (NOT regex) with `linkify:false` (every link must
be deliberate — no auto-linkifying bare domains in an accountability ledger).
**Any Markdown token it doesn't explicitly handle throws a build error naming
the entry.** This is intentional: silent content loss is the worst failure mode
here, so the build fails loudly instead of dropping text. If you use a new
Markdown construct in a body and the build errors, add explicit handling to the
compiler — don't work around it.

---

## Adding an entry

An entry is **two files** sharing one slug:

**1. `src/entries/_meta/{slug}.json`** — the neutral metadata:
```json
{
  "slug": "company-x-case",
  "section": "corruption",
  "region": "us",
  "status": "settlement",
  "date": "2024-06-01",
  "sources": [
    { "label": "Reuters — headline of the source", "url": "https://example.com/article" },
    { "label": "Documentary title (official)", "url": "https://www.youtube.com/watch?v=XXXX", "video": true }
  ]
}
```

**2. `src/entries/en/{slug}.md`** — the translatable text:
```markdown
---
title: Company X — What They Did
tag: "Settlement · 2024"
---
The body text goes here, in plain prose. You can use **bold**, *italics*,
inline `code`, and links. Keep it tight. Paraphrase sources; don't paste long
quotes. State plainly what tier of proof this is (see Editorial standard below).
```

Then run `npm run archive` (to snapshot the new sources), `npm run build`, and it
appears in the right section, sorted by date, with working filters and search.
The `slug` must be identical in both filenames — it's the unique key that pairs
metadata, text, and (at runtime) the DOM element for search.

### Field reference

| Field | File | Required | What it does |
|-------|------|----------|--------------|
| `slug` | `_meta` | yes | Unique ID. Must match the `en/` filename. The pairing key for everything. |
| `section` | `_meta` | yes | Section key. Must exist in `site.js` `sections`. |
| `region` | `_meta` | yes | Region key. Must exist in `site.js` `regions`. |
| `status` | `_meta` | yes | Tier/credibility key. Must exist in `site.js` `statuses`. See Editorial standard. |
| `date` | `_meta` | yes | ISO `YYYY-MM-DD`. Drives sort (newest first) + date filter. |
| `sources` | `_meta` | no | `[{ label, url, video?, archive_url? }]`. `archive_url` is written by the archive script. |
| `last_verified` | `_meta` | auto | Written by `npm run archive`. |
| `title` | `en/*.md` | yes | The entry headline. |
| `tag` | `en/*.md` | no | Small red label above the title, e.g. `"Settlement · 2008"`. |

Valid `section` / `region` / `status` keys live in **`src/_data/site.js`**;
their human labels live in **`src/_data/locales/en.js`**. To add a new section,
region, or status: add the KEY (+ order/num) in `site.js` AND the LABEL in every
`locales/*.js`. Miss the label and it renders blank.

---

## Editorial standard — the tier discipline (the soul of the project)

Every entry declares how settled its claims are, via `status`. Keeping these
honest is what makes the ledger credible and hard to dismiss. Never inflate a
tier upward.

| `status` | Meaning | Use for |
|----------|---------|---------|
| `ruling` | A court convicted or formally ruled | ICTR/ICTY judgments, criminal convictions |
| `finding` | A state or official body formally determined | UN commission findings, recognized genocides |
| `warrant` | Formal charge filed, not yet a conviction | ICC arrest warrants, indictments |
| `settlement` | Plea or settlement (often "no admission of liability") | DOJ pleas, civil settlements |
| `report` | Investigation / journalism / audit | IG reports, investigative findings |
| `alleged` | Serious allegation, in court, not adjudicated | active lawsuits |
| `ongoing` | Live, evolving situation | document releases, in-progress cases |
| `context` | Genuine debate, two defensible sides | structural critiques, contested theories |
| `law` / `win` | Legislation / accountability success | the "Accountability & Wins" section |

Rules of thumb: **"plausible" is not "ruled"; "alleged" is not "proven";
"mentioned in a file" is not "guilty."** Paraphrase sources, link primary
documents, lead with the perpetrator's own admitted record where it exists, and
never overstate what a court actually decided. For the highest-stakes categories
(genocide, abuse, naming individuals) the tier label is the firewall that
protects the whole project — get it exactly right or don't publish the entry.

---

## Collapsible sections

Each content section folds/expands by clicking (or Enter/Space on) its heading.
All start **expanded** — nothing hidden from readers, crawlers, or no-JS users.

- The **"Collapse all / Expand all"** button in the sticky filter bar flips every
  section; its label reflects the dominant state.
- Collapsed state is **session-only** — never written to storage or the URL.
- **Filters and search force matching sections open**, so results are never
  hidden behind a folded heading.
- A section's pullquote hides if the section has zero visible entries.
- With JS disabled the collapse UI doesn't appear and everything renders
  expanded — progressive enhancement throughout.

---

## Search

Instant, client-side full-text search in the filter bar. The index is emitted by
the build as `/search-index.json` and inlined into the page as
`window.__SEARCH_INDEX__`; `filter.js` reads that (falling back to fetching the
JSON, then to DOM-scraping). Each row is paired to its DOM element **by unique
`slug`** — never by section+year (that key is not unique and silently mis-pairs
entries; see Pitfalls).

**Behaviour:**
- Tokenized on whitespace; every token must match somewhere (AND semantics).
- Active query → **flat-results mode**: section headings + pullquotes hide,
  entries sort by relevance, a red section eyebrow labels each card. Clearing
  restores the grouped layout exactly.
- Matches are wrapped in `<mark>` in BOTH title and body (title = strong red,
  body = lighter tint). Highlighting uses DOM text-node replacement across all
  text nodes (never `innerHTML` with raw input), so every match in every result
  is marked.
- Facet chips compose with search (must pass chips AND query).
- Query reflected in URL as `?q=…` via `history.replaceState` (shareable).
- Keyboard: `/` or `Cmd/Ctrl-K` focuses; `Esc` clears and blurs.

**Scoring weights** (tunable via the `W` object atop `src/assets/filter.js`):

| Signal | Points |
|--------|--------|
| Full query phrase in title | +100 |
| Each token in title | +25 |
| Title starts with a token | +10 bonus |
| Each token in tag | +8 |
| Each token in section label | +5 |
| Each token in body | +2 |

Score 0 = hidden. Ties broken by original document order (stable).

**Progressive enhancement:** with JS off the search box is hidden (`.js-only`);
the grouped ledger renders normally.

---

## Archiving sources (link-rot defense)

Dead links read like vanished evidence. `npm run archive` captures a permanent
[Wayback](https://web.archive.org) snapshot of every source and writes
`archive_url` + `last_verified` back into **`entries/_meta/{slug}.json`** (never
per-language — sources are neutral). The site renders each source as
`source · archived`.

```
npm run archive            # snapshot any source missing an archive_url
npm run archive -- --force # re-snapshot everything (yearly refresh)
```

Idempotent (already-archived sources skipped). Some publishers block the Wayback
crawler; those are left as-is and reported — re-run later, or prefer an
archivable primary source (a court PDF over a paywalled write-up). **Commit the
`_meta` changes** the script makes.

> Run this **locally**, not on Vercel — the deploy filesystem is ephemeral so
> writes wouldn't persist, and Save Page Now is too slow for a build step.

---

## The suggestion form (optional)

The "Suggest an Entry" section uses [Web3Forms](https://web3forms.com) (free, no
account, submissions go to your email).

1. Get an access key at web3forms.com (enter your email).
2. Paste it into `src/_data/site.js` → `web3formsKey: "your-key-here"`.
3. Rebuild — the form activates. Leave it empty and a placeholder shows instead.

Spam protection: a hidden honeypot field (bots fill it, humans don't, filled =
dropped). Optionally add a free [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
site key to `turnstileSiteKey` in `site.js`.

---

## Fonts (privacy — do not revert to a font CDN)

The design uses **self-hosted** JetBrains Mono and Newsreader specifically so
visitor IPs never leak to Google Fonts — a deliberate choice for a site about
surveillance. **Do not reintroduce `fonts.googleapis.com` / `gstatic.com`**
links or preconnects in `layout.njk`; an external font CDN contradicts the
project's privacy stance and has been removed before.

Place the woff2 files in `src/assets/fonts/`. The `@font-face` rules in
`layout.njk`'s `<head>` declare the family names and file paths. Two ways to
supply files:
- **Static per-weight** (what you likely have): one `@font-face` per weight/style
  you use — JetBrains Mono 400/700/800, Newsreader 400/600 + italic — each
  pointing at its own woff2. Match filenames to the `src:` URLs.
- **Variable font** (one file per family covering all weights): name them so the
  existing weight-range `@font-face` rules resolve.

JetBrains Mono is Apache-2.0, Newsreader is OFL — both freely self-hostable.
Until the files exist the page falls back to system mono/serif (and the console
shows harmless 404s for the missing woff2).

---

## Pitfalls (hard-won — read before debugging or refactoring)

These all bit during development. Each costs hours if rediscovered cold.

- **`_data/locales/` is namespaced by folder.** A file at
  `_data/locales/en.js` is exposed to templates as `locales.en`, not `i18n`.
  Templates use a bare `i18n.*`, aliased via `_data/eleventyComputed.js` based on
  the page's `lang`. Don't re-nest or rename without updating the alias.
- **Nunjucks auto-escapes — inlined JSON must be emitted raw + escaped.** The
  `window.__SEARCH_INDEX__` JSON contains `&`/`<`/`>` (e.g. "Bayer & Monsanto").
  Output via `| safe` with `&`/`<`/`>` pre-escaped as `\u0026`/`\u003c`/`\u003e`
  (done in the data layer). Plain `{{ searchIndex }}` turns `&` into `&amp;` and
  throws `Unexpected token '&'`.
- **Search pairs index rows to DOM by unique `slug`** (`data-slug` on each entry,
  matched in `buildIndexFromData`). NEVER pair by section+year — it's not unique
  and silently shows the wrong entry / drops highlights.
- **`_site/index.html` (and the repo-root `index.html`) are build artifacts.**
  Never hand-edit them; the build overwrites them. Edit `src/`.
- **One live layout only.** There is a single HTML shell: `layout.njk`. If a
  stale `base.njk` ever reappears, delete it — a dead template that still
  contains correct-looking markup causes false debugging leads.
- **The body block compiler fails loud.** A build error from `markdown-blocks.js`
  naming an entry means that entry uses an unhandled Markdown construct — add
  handling to the compiler; never silence it by dropping content.

---

## Verification checklist (run after any structural change)

A 60-second smoke test that catches the regressions seen during development:

- `node --check src/assets/filter.js` passes (no JS syntax error).
- Count match: number of `entries/_meta/*.json` === number of `entries/en/*.md`.
- View built `_site/index.html` source:
  - the page title, section headings, search placeholder, filter labels all
    render (not blank → confirms `i18n` aliasing works);
  - `window.__SEARCH_INDEX__ =` is valid JSON with literal `&`/`<`/`>` or
    `\u00xx` escapes — never `&amp;`;
  - NO `fonts.googleapis.com` / `gstatic.com` anywhere in `<head>`;
  - the favicon, canonical, OG and Twitter tags are present.
- In the browser: search a distinctive term (e.g. a company name) → only entries
  that actually contain it appear, each with visible title/body highlights, and
  the browser's own Ctrl+F finds the term in every shown result.
- Search → clear → different search: no stale results or leftover highlights.
- Collapse a section, run a search that matches inside it → it auto-opens; clear
  → returns to its prior state.

---

## Known / deferred (expected, not bugs)

- **FLIP reflow `[Violation]` console warnings during search** at the current
  entry count are cosmetic (30–56ms). They scale with DOM size and are slated to
  be addressed alongside the planned lazy-load / endless-scroll work, which
  changes the performance model (a screenful in the DOM instead of everything).
- **woff2 404s** until the font files are added (see Fonts) — system-font
  fallback works meanwhile.
- **i18n:** English-only output ships today; the German/Spanish rollout is the
  next phase. See `docs/I18N.md`. The resolver fallback path already exists, so
  adding a language is content + a locale file, not new logic.

---

## Disclaimer

This project documents wrongdoing and links to evidence, distinguishing what a
court ruled from what a body found from what remains alleged or contested (the
`status` tiers above). Keep that discipline when adding entries — it is what
makes the page credible and hard to dismiss. Paraphrase sources, link primary
documents, and never overstate what has actually been decided.
