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
