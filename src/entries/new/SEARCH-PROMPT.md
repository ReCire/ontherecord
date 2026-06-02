# IDE Prompt — Dynamic Search for "On The Record"

Paste everything below the line into your IDE agent (Cursor/Copilot/Claude Code).
It is written against your actual repo: Eleventy + Nunjucks, a single rendered
`index.html`, `src/assets/filter.js` (vanilla JS, IIFE, no framework), and the
design tokens in `src/assets/style.css`. No build-tool or dependency changes.

---

## Role & context

You are a principal front-end engineer working on a static Eleventy site called
"On The Record" — a samizdat-styled accountability ledger. The stack is
deliberately minimal: Eleventy renders one long `index.html` from
`src/index.njk`; all interactivity lives in one vanilla-JS IIFE at
`src/assets/filter.js`; styling is plain CSS with custom properties in
`src/assets/style.css`. There is **no** client framework, no bundler, no
`localStorage`, and no runtime dependencies. Keep it that way.

The page currently has ~90 entries grouped into 17 `<section>` blocks. Each
entry is rendered as:

```html
<article class="entry" data-section="..." data-region="..." data-status="..." data-year="...">
  <h3><span class="tag">…</span> Title text</h3>
  <div class="body"> … prose … </div>
  <div class="sources"> … </div>
  <div class="verified">…</div>
</article>
```

There is already a faceted filter system (Topic/Region/Status chips) in
`filter.js` using an `active` object of Sets and an `apply()` function that sets
`entry.style.display`. **Your search must compose with that filter, not replace
it.** An entry is visible only if it passes BOTH the active facet filters AND
the current search query.

## Goal

Add a **dynamic, instant search** that re-queries and re-sorts on every
keystroke. It must feel state-of-the-art and intentional: zero perceptible lag,
smooth reordering, clear feedback, fully keyboard-accessible. No "submit"
button, no page reload, no network calls.

## Design tokens (match these exactly)

- Colors via CSS vars already defined: `--paper #ece8df`, `--ink #14110d`,
  `--red #a81e0e`, `--faint #6b6356`, `--line #c4bdae`.
- Mono font for UI chrome: `'JetBrains Mono', monospace` (uppercase, letter-spacing
  ~0.1em for labels, as elsewhere). Body/serif: `'Newsreader', Georgia, serif`.
- The search box must look like it belongs in the existing sticky `.filters`
  bar — same paper background, 1px `--line` borders, red focus accent, square
  corners (no rounded "Google" pill). Think index-card / typewriter, not SaaS.
- Respect `prefers-reduced-motion`: disable reorder animations and fades when set.

## Functional requirements

1. **Index build (once, on load).** Walk every `.entry` and build an in-memory
   array of records: `{ el, title, body, tag, section, sectionLabel, region,
   status, year, haystack }`. `haystack` is a lowercased concatenation of title
   (weighted — see scoring), tag, section label, body text. Read `sectionLabel`
   from the nearest `[data-section-block]` heading text or a data attribute.
   Build this array ONCE and reuse it; do not re-read the DOM on each keystroke.

2. **Instant query on every input event.** Debounce only lightly (≈80–120ms) so
   it still feels live but doesn't thrash on fast typists. On each query:
   - Tokenize the query on whitespace; each token must match (AND semantics).
   - A token matches if it is a substring of the haystack (case-insensitive).
     Implement a tiny bit of fuzz: also match if the token matches with one
     transposed/!missing char is OPTIONAL — only add subsequence fuzzy matching
     if it stays fast at ~200 entries. Substring is the required baseline.
   - Compute a relevance score per entry (see scoring).

3. **Compose with facet filters.** Final visibility = passes facet filter
   (existing `matches(entry)` logic) AND (query empty OR score > 0). Refactor so
   both the chips and the search call a single shared `render()`/`apply()`.

4. **Re-sort by relevance when a query is present.** When the query is
   non-empty, reorder the visible entries so the highest score is first. When
   the query is empty, restore the original document order (by section, then the
   original within-section order). Do the reordering by reordering DOM nodes
   (see "Reordering & animation").

5. **Section headings during search.** When a query is active, the rigid
   section grouping gets in the way. Switch to a **flat results mode**: hide all
   `.sec-head` section headers and `.pullquote` elements, and lift matching
   entries into a single ordered results list (or visually flatten by hiding
   empty sections and showing a small "section ·" eyebrow on each card so the
   user still knows the category). When the query is cleared, restore the normal
   grouped layout exactly as it was. (This also neatly fixes the existing
   "orphan pullquote" bug — see notes.)

6. **Highlighting.** Wrap matched substrings in the title (and optionally the
   first matching snippet of the body) in `<mark>`. Style `<mark>` on-brand:
   `background: var(--red); color: var(--paper);` (matching the existing
   `::selection` style) — NOT yellow. Never break HTML: highlight by building
   text nodes, escape input, never `innerHTML` raw user text.

7. **Result count + empty state.** Reuse the existing `#result-count` element.
   While searching show e.g. `7 results for "monsanto"`. On zero matches show a
   quiet empty state in the results area: "No entries match. Try fewer or
   different words." with a one-tap "clear search" affordance. Never leave a
   blank page.

8. **Keyboard & a11y.**
   - `/` or `Cmd/Ctrl-K` focuses the search box (don't hijack when the user is
     already typing in an input/textarea).
   - `Esc` clears the query and blurs.
   - `aria-label` on the input; results region gets `aria-live="polite"` so the
     count is announced. Search input is a `<input type="search">` with a
     visible label or mono placeholder ("Search the record…").
   - Arrow-key navigation through results is OPTIONAL; if you add it, manage
     `aria-activedescendant` properly. Don't half-build it.

9. **URL sync (lightweight, optional but preferred).** Reflect the query in the
   URL as `?q=...` using `history.replaceState` (no navigation, no scroll jump),
   and read it on load so a search is shareable/bookmarkable. Keep it dependency-free.

## Scoring (keep it simple and legible)

For each entry, given query tokens, sum:

- Title exact-phrase match (full query is a substring of title): +100
- Each token found in title: +25
- Title starts with a token: +10 bonus
- Each token found in tag: +8
- Each token found in section label: +5
- Each token found in body: +2 (count once per token, not per occurrence)

Entry qualifies only if EVERY token is found somewhere (AND). Score 0 = hidden.
Ties broken by original document order (stable sort). Document the weights in a
comment so they're tunable.

## Reordering & animation (the "state-of-the-art" feel)

- Reorder by moving actual DOM nodes into a results container in score order
  (use a `DocumentFragment` for a single reflow). Do NOT animate via JS layout
  loops.
- Use the **FLIP** technique for smooth reordering: measure each card's box
  before (`First`), reorder, measure after (`Last`), apply an `Invert` transform,
  then transition to `Play`. Cap it: only FLIP-animate cards currently in the
  viewport ±1 screen, snap the rest, so a 90-item resort stays at 60fps.
- Fade/slide newly-appearing cards in with a short (~140ms) ease; fade removed
  ones out before `display:none`. Keep it subtle — this is a serious site, not a
  toy. Honor `prefers-reduced-motion: reduce` by skipping all of the above and
  just snapping.
- Target 60fps. If you can't hit it cleanly with FLIP at this scale, fall back
  to instant reordering with only an opacity fade — correctness and speed beat
  flourish.

## Implementation constraints

- One new IIFE (or extend the existing one) in `src/assets/filter.js`. No new
  files unless you extract a `search.js` and add its `<script defer>` to
  `src/_includes/base.njk` — if you do, match the existing `defer` pattern.
- Markup additions go in `src/index.njk` (the search input inside `.filters`)
  and styles in `src/assets/style.css`. Keep the rendered-once Eleventy model:
  the search input is static HTML; JS only reads/reorders.
- No dependencies, no `localStorage`/`sessionStorage`, no external fonts/CDNs.
- Progressive enhancement: with JS off, the full grouped ledger still renders
  and reads. The search box may be hidden via a `no-js`/`js` class toggle on
  `<html>` if you want it to only appear when JS is available.
- Don't regress the existing facet filters, the collapsible filter panel, the
  contact form, or the `apply()/updateHint()` wiring already in `filter.js`.

## Acceptance criteria

- Typing filters AND re-sorts within one frame of the debounce; no flicker.
- Search + active facet chips compose correctly (try: chip "Surveillance" +
  query "data" → only surveillance entries matching "data", ranked).
- Clearing the query (Esc / empty input / clear affordance) restores the exact
  original grouped order, section headers, and pullquotes.
- `<mark>` highlighting never corrupts markup or links.
- Zero-result state is graceful and reversible.
- Keyboard: `/`, `Cmd/Ctrl-K`, `Esc` all work; nothing is hijacked mid-typing.
- 60fps (or clean snap fallback) on ~90+ entries on a mid laptop.
- No console errors; no new dependencies; Lighthouse a11y not regressed.

## Deliverables

1. Updated `src/index.njk` (search input markup in the filter bar; optional
   `js`/`no-js` html-class bootstrap).
2. Updated `src/assets/filter.js` (or new `src/assets/search.js` + base.njk
   wiring) implementing index, query, scoring, compose-with-filters, reorder +
   FLIP, highlight, count, empty state, keyboard, `?q=` sync.
3. Updated `src/assets/style.css` (search box, `<mark>`, results/eyebrow,
   empty-state, reduced-motion handling) using existing CSS variables.
4. A short note in `README.md` describing the search behaviour and the scoring
   weights (so they're tunable later).

Work in small, reviewable commits. Show me a diff plan before large rewrites.
