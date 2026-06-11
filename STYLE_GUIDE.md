# On The Record — Visual Style Guide

The single source of visual truth, derived from the main ledger (`/`). Every
surface — list pages, per-entry pages, and the generated share cards — must
follow these tokens so the project reads as one coherent samizdat object.

**The one rule that catches most mistakes:** _headings and UI chrome are
**JetBrains Mono, UPPERCASE**; running prose is **Newsreader** serif._ If a
title is set in serif, or body copy is set in mono, it's wrong.

---

## Color tokens (`:root` in `style.css`)

| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ece8df` | Background (warm paper) |
| `--ink` | `#14110d` | Primary text, headlines |
| `--red` | `#a81e0e` | Accent: kickers, tags, tiers, links, marks |
| `--faint` | `#6b6356` | Secondary/meta text, dotted underlines |
| `--line` | `#c4bdae` | Hairline rules, borders |

Share cards use the same five values (`PAPER`, `INK`, `RED`, `FAINT`, `LINE` in
`generate-share-cards.js`). Never introduce a sixth color.

---

## Typefaces

- **JetBrains Mono** (self-hosted woff2, weights 400/700/800) — all headings,
  labels, eyebrows, nav, meta, source list, buttons. Always `text-transform:
  uppercase` for headings/labels.
- **Newsreader** (self-hosted woff2, weights 400/500) — body prose, the
  standfirst/tagline, pullquotes, and the card teaser. Sentence case.

No third-party font CDN, ever (see README → Fonts).

---

## Type scale (the ledger, authoritative)

| Element | Family / weight | Size | Transform | Notes |
|---------|-----------------|------|-----------|-------|
| Masthead `h1` (site name) | Mono 800 | `clamp(38px, 9vw, 74px)` | UPPER | `letter-spacing:-0.02em; line-height:0.92` |
| Kicker | Mono 700 | 11px | UPPER | red, `letter-spacing:0.42em` |
| Standfirst / tagline | Newsreader 400 | 21px | none | `max-width:600px` |
| Section `h2` | Mono 800 | `clamp(22px, 5vw, 30px)` | UPPER | |
| Section number | Mono 800 | 13px | — | red |
| **Entry title `h3`** | **Mono 700** | **16px** | **UPPER** | `letter-spacing:0.01em; line-height:1.3` |
| Entry tag | Mono | 11px | UPPER | red, block, `letter-spacing:0.1em` |
| Body copy | Newsreader 400 | 18px (base) | none | `line-height:1.55` |
| Sources | Mono | 12px | — | links underlined red |
| Meta / ledger-updated | Mono | 10–11px | UPPER | `--faint` |
| Eyebrow (search/tier) | Mono 700 | 10px | UPPER | red, `letter-spacing:0.18em` |

**Mobile vs desktop:** sizes are fluid via `clamp()` where they need to scale
(masthead, section headings); everything else is fixed px and identical across
breakpoints. Do **not** introduce new per-breakpoint font sizes — reuse the
`clamp()` ramps above or a fixed px from this table.

---

## Per-entry pages (`/entry/{slug}/`, `/de/eintrag/{slug}/`)

A per-entry page is "one ledger entry pulled out", so it reuses ledger tokens:

- Masthead site name (`.entry-page-head .home-link`): **Mono 800 UPPER**,
  `clamp(26px, 6vw, 40px)` — the masthead voice, scaled down for a sub-page.
- Kicker: identical to the ledger `.kicker`.
- Entry title: rendered as `<h1>` but styled by `.entry.single h1`, which shares
  the exact `.entry h3` rule (**Mono 700, 16px, UPPER**). Same size as the
  ledger — do not enlarge.
- Tier eyebrow (`.entry-tier`): Mono 700, 10px, UPPER, red.
- Body, sources, share row: reuse `.entry .body`, `.sources`, `.entry-share`.

Never set the title or site name in Newsreader, and never scale the entry title
above its 16px ledger size.

---

## Share cards (`generate-share-cards.js`)

Cards mirror the ledger's type language at poster scale:

- **Tier label** (top-left): Mono 700, UPPER, red — like the kicker/eyebrow.
- **Title**: **Mono 700, UPPER**, `INK`. Auto-fit by length (see
  `*_TITLE_BUCKETS`); mono is wide, so sizes run smaller than a serif scale.
- **Teaser**: Newsreader 400, `INK` — the only serif on the card (it's body
  copy). Dynamic line-budget fill, shrinks as the title grows.
- **Footer**: `ontherecord.me` (brand, never translated) + `N sources`
  (localized), Mono, `FAINT`.
- Frame: 1px `LINE` border on `PAPER`.

Two sizes, two languages: `cards/{en,de}/{slug}-{portrait(1080×1350),og(1200×630)}.png`.

---

## Affordance patterns

- **Links in prose / sources:** `--ink` text with a 1px solid `--red` bottom
  border; hover inverts to red background / paper text (sources) or red text.
- **Quiet utility links** (downloads, copy-link, lang toggle): `--faint` with a
  1px **dotted** `--faint` bottom border; hover → red.
- **Middot separators** between inline items: `·` (`\00b7`), `--faint`.
- **Buttons** (share, view toggle, filter): transparent, Mono, inherit casing;
  min 44px tap target for the share button.

---

## Checklist before shipping a visual change

- Headings/labels are Mono UPPERCASE; prose is Newsreader. No swaps.
- Only the five color tokens are used.
- Entry-page title matches the ledger entry title size (16px), not a hero size.
- Card title is Mono UPPER; teaser is Newsreader.
- No `fonts.googleapis.com` / `gstatic.com`.
- Mobile + desktop sizes come from the `clamp()` ramps / fixed px above.

---

<!-- Append these two subsections to STYLE_GUIDE.md, under a new "## Gotchas / hard-won rules" heading near the end (before the final checklist), or wherever fits. -->

## Gotchas / hard-won rules

### Affordance class names must avoid `share` / `social` / `download`

Ad-blockers (uBlock Origin, Brave Shields, Ghostery) hide elements by matching
class-name patterns — anything containing `share`, `social`, `download`,
`sponsor`, etc. gets stripped from the DOM, even when it's our own first-party,
no-tracking markup. This already bit us once: the per-entry share row
(`.entry-share`, `.share-native`, `.share-download`, `.share-link`) rendered
locally but vanished on the deployed site for anyone running a blocker.

**Rule:** never name an interactive/affordance class with `share`, `social`,
`download`, or similar tracker-adjacent words. The sharing controls are named
neutrally instead:

| Purpose | Class (use this) | Never |
|---------|------------------|-------|
| Share-controls wrapper | `.entry-actions` | `.entry-share` |
| Native share button | `.act-send` | `.share-native` |
| Card download links | `.act-card` | `.share-download` |
| Copy-link affordance | `.act-copy` | `.share-link` |

If you add a new affordance, keep the `.act-*` / neutral-noun convention. This is
a maintenance trap, not a one-time fix: a future class named `.social-buttons`
would silently reintroduce the bug for blocked users only — invisible in local
testing.

### `.js-only` depends on a `.js` class that must be set before any deferred script

Progressive-enhancement elements (the share/copy row, etc.) carry `.js-only` and
are hidden by default; CSS reveals them only when `html.js` is present. That
`.js` class must be set **independently of which page script loads**, because
different pages load different bundles (`filter.js` on list pages, `entry.js` on
entry pages, possibly neither on a future page). Relying on a specific script to
set it is fragile — that's how the entry-page share row went missing until
`entry.js` was patched to also set `.js`.

**Rule:** the `.js` class is set by a single inline snippet at the very top of
`<head>` in `layout.njk`, before any other script:

```html
<script>document.documentElement.className += ' js';</script>
```

Individual scripts (`filter.js`, `entry.js`, future ones) must **not** be
responsible for setting `.js`. If you see a script adding `.js`, that's a smell —
remove it and trust the head snippet. This runs synchronously before paint, so
there's no flash of hidden affordances.
