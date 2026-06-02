# On The Record

A documented ledger of corporate & political harm, with primary sources.
Built with [Eleventy](https://www.11ty.dev/) — a static site generator. No database,
no server. You add Markdown files; the build turns them into one page with filters.

---

## One-time setup

1. Install [Node.js](https://nodejs.org/) (LTS is fine).
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

## Deploy to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com), import the repo.
3. Vercel will auto-detect the settings from `vercel.json`:
   - **Build command:** `npx @11ty/eleventy`
   - **Output directory:** `_site`
4. Every push to `main` auto-deploys.

Alternatively, deploy manually with the Vercel CLI:
```
npx vercel --prod
```

The site also works with Cloudflare Pages, Netlify, or any static host —
set build command `npm run build` and output dir `_site`.

---

## Adding an entry — this is the whole job

Create a new file in `src/entries/`, e.g. `my-new-case.md`. Copy this template:

```markdown
---
title: Company X — What They Did
section: corruption
region: us
status: settlement
date: 2024-06-01
tag: "Settlement · 2024"
sources:
  - label: "Reuters — headline of the source"
    url: https://example.com/article
  - label: "Documentary title (official)"
    url: https://www.youtube.com/watch?v=XXXX
    video: true
---
The body text goes here, in plain prose. You can use **bold**, *italics*,
and normal Markdown. Keep it tight — a few sentences. Paraphrase sources;
don't paste long quotes.
```

Save it, run `npm run build` (or keep `npm run serve` running), and it appears
in the right section, sorted by date, with working filters. **No renumbering,
no editing other files.**

### Frontmatter fields

| Field      | Required | What it does                                                        |
|------------|----------|---------------------------------------------------------------------|
| `title`    | yes      | The entry headline.                                                 |
| `section`  | yes      | Which section it lands in. Must match a `key` in `src/_data/site.js`.|
| `region`   | yes      | Region filter. Must match a region `key` in `site.js`.              |
| `status`   | yes      | Credibility tag + filter. Must match a status `key` in `site.js`.   |
| `date`     | yes      | ISO date (`YYYY-MM-DD`). Drives sorting (newest first) + date filter.|
| `tag`      | no       | Small red label above the title, e.g. `"Settlement · 2008"`.        |
| `sources`  | no       | List of `{ label, url }`. Add `video: true` for a ▶ VIDEO link.     |
| `archive_url` | auto  | Wayback snapshot per source — written by `npm run archive` (see below).|
| `last_verified` | auto | Date sources were last archived — written by `npm run archive`.    |

Valid values for `section`, `region`, and `status` all live in
**`src/_data/site.js`** — that's the one place to look. Want a new section,
region, or status? Add it there once and it becomes available everywhere
(filter chip + section heading).

---

## Archiving sources (link-rot defense)

News URLs die, government pages move, articles get pulled. For an accountability
site a dead link reads like the evidence vanished. The fix: capture a permanent
[Wayback Machine](https://web.archive.org) snapshot of every source and store it
in the entry frontmatter.

After adding or editing entries, run:
```
npm run archive
```
For each source it checks for an existing Wayback snapshot, creates one via
*Save Page Now* if none exists, and writes `archive_url` back into the
frontmatter plus a `last_verified` date. The site then renders each source as
`source · archived`.

It's **idempotent** — already-archived sources are skipped. To re-snapshot
everything (e.g. yearly refresh):
```
npm run archive -- --force
```
Some publishers block the Wayback crawler; those sources are left as-is and
reported so you can re-run later. **Commit the frontmatter changes** the script
makes — the archive URLs belong in version control.

> Run this **locally**, not on Vercel. The deploy filesystem is ephemeral, so
> writes wouldn't persist, and Save Page Now is too slow for a build step.

---

## The suggestion form (optional)

The "Suggest an Entry" section uses [Web3Forms](https://web3forms.com) — free,
no account, submissions go to your email.

1. Go to web3forms.com, enter your email, copy the **access key**.
2. Paste it into `src/_data/site.js` → `web3formsKey: "your-key-here"`.
3. Rebuild. The form activates automatically.

**Spam protection:** a hidden honeypot field is built in (bots fill it, real
people can't see it, submissions with it set are dropped). For stronger
protection you can add a free [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
site key to `turnstileSiteKey` in `site.js`.

If you leave `web3formsKey` empty, the form shows a short placeholder instead —
nothing breaks.

---

## Fonts (privacy)

The design uses JetBrains Mono and Newsreader. To avoid leaking visitor IPs to
Google Fonts, the site loads them **self-hosted**. Download the two `.woff2`
files and place them in `src/assets/fonts/`:

- `jetbrains-mono.woff2`
- `newsreader.woff2`

(Grab them from the [google-webfonts-helper](https://gwfh.mranftl.com/fonts) or
the fonts' official repos.) Until you add them, the site falls back to system
mono/serif and still works.

---

## Structure

```
src/
├── index.njk            # page template: header, filter bar, section loop, form, footer
├── _data/site.js        # ← sections, regions, statuses, form keys (edit config here)
├── _includes/
│   └── base.njk         # HTML shell + font-faces
├── entries/             # ← YOUR CONTENT: one .md file per entry
│   ├── entries.json     # applies the entry layout to all files here (don't delete)
│   └── *.md
└── assets/
    ├── style.css        # all styling
    ├── filter.js        # client-side filtering + form submit
    └── fonts/           # self-hosted woff2 (you add these)
```

---

## Disclaimer

This project documents wrongdoing and links to evidence. It distinguishes
between **alleged** (in court), **ruling/settlement/warrant** (adjudicated or
formally charged), and **context/debate**. Keep that discipline when adding
entries — it's what makes the page credible and hard to dismiss. Paraphrase
sources, link primary documents, and never overstate what a court has actually
decided.
