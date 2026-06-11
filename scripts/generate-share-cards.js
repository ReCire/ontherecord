#!/usr/bin/env node
/**
 * generate-share-cards.js — Build-time social share-card generator.
 *
 * For every entry, in EVERY language, renders TWO PNG share cards that match
 * the site's samizdat aesthetic (paper bg, Newsreader + JetBrains Mono, red):
 *
 *   _site/cards/{lang}/{slug}-portrait.png   1080×1350  (Instagram portrait)
 *   _site/cards/{lang}/{slug}-og.png         1200×630   (X / Facebook / OG)
 *
 * Each card shows: the tier label (from THAT locale's statuses map — URTEIL,
 * not RULING, on German cards), the entry TITLE, a line-budget teaser of the
 * body, the OTR mark, and "ontherecord.me" (brand, never translated).
 *
 * Teaser = a DYNAMIC line-budget fill from the start of the body plaintext:
 * long titles wrap to more lines and shrink the teaser budget so nothing ever
 * clips or collides with the footer. Bracketed tier glosses ([alleged],
 * ["quoted"]) are stripped — they're citation apparatus, noise at card size.
 *
 * Pipeline: Satori (HTML/CSS-ish element tree → SVG) → resvg (SVG → PNG).
 * NO headless browser, NO client-side rendering, NO network/font CDN.
 *
 * Fonts are loaded from the SELF-HOSTED woff2 files in src/assets/fonts/.
 * Satori cannot parse woff2 directly (Brotli-compressed), so we decompress
 * them to TTF in memory with wawoff2 — still fully offline, no CDN.
 *
 * The apple-touch-icon is a hand-designed STATIC asset owned by the human
 * (src/assets/apple-touch-icon.png, passthrough-copied). This script does NOT
 * generate or touch it.
 *
 * Usage:
 *   npm run cards          # generate cards into _site/cards/{lang}/
 *   (also runs automatically as part of `npm run build`)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");
const wawoff2 = require("wawoff2");
const subsetFont = require("subset-font");
const { blocksToPlaintext } = require("../src/assets/markdown-blocks");

// ---------------------------------------------------------------------------
// Paths & palette
// ---------------------------------------------------------------------------
const ROOT = path.join(__dirname, "..");
const FONTS_DIR = path.join(ROOT, "src", "assets", "fonts");
const ASSETS_DIR = path.join(ROOT, "src", "assets");
const SITE_DIR = path.join(ROOT, "_site");
const CARDS_OUT = path.join(SITE_DIR, "cards");

const PAPER = "#ece8df";
const INK = "#14110d";
const RED = "#a81e0e";
const FAINT = "#6b6356";
const LINE = "#c4bdae";

// ---------------------------------------------------------------------------
// Font loading — self-hosted woff2 → static TTF instances for Satori.
//
// The woff2 files are VARIABLE fonts; Satori's bundled opentype parser chokes
// on their `fvar` table. So we decompress (wawoff2) then pin the weight axis to
// a single value via harfbuzz (subset-font), which emits a static instance with
// no `fvar`/`gvar`. We also subset to just the glyphs actually rendered, keeping
// the work small. Everything stays offline — no CDN, no network.
// ---------------------------------------------------------------------------
// Read every variation axis (tag + default) from a font's `fvar` table, so we
// can pin ALL of them and emit a fully static instance (e.g. Newsreader carries
// an `opsz` axis beyond `wght`; leaving any axis unpinned keeps `fvar` alive and
// Satori's parser then crashes).
function readFvarAxes(buf) {
  const numTables = buf.readUInt16BE(4);
  let off = 12;
  let fvarOff = -1;
  for (let i = 0; i < numTables; i++) {
    if (buf.toString("ascii", off, off + 4) === "fvar") {
      fvarOff = buf.readUInt32BE(off + 8);
      break;
    }
    off += 16;
  }
  if (fvarOff < 0) return [];
  const axesArrayOffset = buf.readUInt16BE(fvarOff + 4);
  const axisCount = buf.readUInt16BE(fvarOff + 8);
  const axisSize = buf.readUInt16BE(fvarOff + 10);
  const axes = [];
  let a = fvarOff + axesArrayOffset;
  for (let i = 0; i < axisCount; i++) {
    const tag = buf.toString("ascii", a, a + 4);
    const def = buf.readInt32BE(a + 8) / 65536; // Fixed 16.16
    axes.push({ tag, default: def });
    a += axisSize;
  }
  return axes;
}

async function buildFonts(coverageText) {
  const read = (name) => fs.readFileSync(path.join(FONTS_DIR, name));
  const monoVar = Buffer.from(await wawoff2.decompress(read("jetbrains-mono.woff2")));
  const serifVar = Buffer.from(await wawoff2.decompress(read("newsreader.woff2")));

  const instance = (buf, weight) => {
    const variationAxes = {};
    for (const ax of readFvarAxes(buf)) {
      const v = ax.tag === "wght" ? weight : ax.default;
      variationAxes[ax.tag] = { min: v, max: v, default: v };
    }
    return subsetFont(buf, coverageText, { targetFormat: "truetype", variationAxes });
  };

  const [mono400, mono700, serif400, serif500] = await Promise.all([
    instance(monoVar, 400),
    instance(monoVar, 700),
    instance(serifVar, 400),
    instance(serifVar, 500),
  ]);

  return [
    { name: "JetBrains Mono", data: mono400, weight: 400, style: "normal" },
    { name: "JetBrains Mono", data: mono700, weight: 700, style: "normal" },
    { name: "Newsreader", data: serif400, weight: 400, style: "normal" },
    { name: "Newsreader", data: serif500, weight: 500, style: "normal" },
  ];
}

// ---------------------------------------------------------------------------
// OTR mark — embed the existing favicon as a data URI
// ---------------------------------------------------------------------------
function otrMarkDataUri() {
  const buf = fs.readFileSync(path.join(ASSETS_DIR, "favicon.png"));
  return "data:image/png;base64," + buf.toString("base64");
}

// ---------------------------------------------------------------------------
// Teaser: dynamic line-budget fill from the START of the body plaintext.
//
// No summarization — the first sentences ARE the hook. We estimate how many
// characters fit per line at the teaser font size, multiply by a line budget,
// and truncate on a word boundary with a single ellipsis. The budget is
// DYNAMIC: a long title wraps to more lines (titles auto-fit but still wrap),
// so each extra title line spends part of the teaser budget — nothing clips or
// collides with the footer. Bracketed tier glosses ([alleged], ["quoted"]) are
// stripped: they're citation apparatus, visual noise at card size.
// ---------------------------------------------------------------------------
const EM_FACTOR = 0.52; // avg Newsreader glyph advance ≈ 0.52em (conservative)

function stripGloss(s) {
  return String(s || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1") // drop space orphaned before punctuation
    .replace(/\s+/g, " ")
    .trim();
}

const MONO_EM = 0.6;  // JetBrains Mono is monospaced — fixed advance ≈ 0.6em

function lineBudgetTeaser(text, opts) {
  const {
    innerWidth,
    titleText,
    titleSize,
    teaserSize,
    baseLines,
    perTitleLine,
    minLines,
    titleEm = MONO_EM,   // card titles are now mono uppercase (wider than serif)
    teaserEm = EM_FACTOR, // teaser stays Newsreader serif
  } = opts;
  const clean = stripGloss(text);
  if (!clean) return "";

  const titleCpl = Math.max(8, Math.floor(innerWidth / (titleSize * titleEm)));
  const titleLines = Math.max(1, Math.ceil((titleText || "").length / titleCpl));

  let lines = baseLines - Math.round((titleLines - 1) * perTitleLine);
  if (lines < minLines) lines = minLines;

  const teaserCpl = Math.max(10, Math.floor(innerWidth / (teaserSize * teaserEm)));
  const maxChars = teaserCpl * lines;

  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars + 1);
  let lastSpace = slice.lastIndexOf(" ");
  if (lastSpace <= 0) lastSpace = maxChars;
  return clean.slice(0, lastSpace).replace(/[\s,.;:]+$/, "") + "\u2026";
}

// ---------------------------------------------------------------------------
// Title auto-fit — pick a font size by length so long titles never clip
// ---------------------------------------------------------------------------
function fitTitleSize(title, buckets) {
  const len = (title || "").length;
  for (const [maxLen, size] of buckets) {
    if (len <= maxLen) return size;
  }
  return buckets[buckets.length - 1][1];
}

// ---------------------------------------------------------------------------
// Element tree helpers (Satori takes React-element-like objects, no JSX)
// ---------------------------------------------------------------------------
function el(type, style, children) {
  return { type, props: { style, children } };
}
function text(value) {
  return value == null ? "" : String(value);
}

// Build one card's element tree for the given size profile.
function buildCard(opts) {
  const {
    width,
    height,
    pad,
    framePad,
    tierSize,
    markSize,
    titleSize,
    titleGap,
    teaserSize,
    footerSize,
    tierLabel,
    title,
    teaser,
    sourceCount,
    markUri,
    markInset,
  } = opts;

  const topRow = el(
    "div",
    { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    [
      el(
        "div",
        {
          fontFamily: "JetBrains Mono",
          fontWeight: 700,
          fontSize: tierSize,
          letterSpacing: Math.round(tierSize * 0.22),
          textTransform: "uppercase",
          color: RED,
          maxWidth: width - framePad * 2 - markSize - 40,
          lineHeight: 1.2,
        },
        text(tierLabel)
      ),
      // Inset the mark from the frame edge — the favicon glyph sits flush to its
      // own right/top edge, so a margin gives it even breathing room in the corner.
      {
        type: "img",
        props: {
          src: markUri,
          width: markSize,
          height: markSize,
          style: { marginRight: markInset || 0, marginTop: Math.round((markInset || 0) / 2) },
        },
      },
    ]
  );

  const middle = el(
    "div",
    { display: "flex", flexDirection: "column" },
    [
      el(
        "div",
        {
          fontFamily: "JetBrains Mono",
          fontWeight: 700,
          fontSize: titleSize,
          letterSpacing: -1,
          textTransform: "uppercase",
          lineHeight: 1.14,
          color: INK,
          marginBottom: titleGap,
        },
        text(title)
      ),
      el(
        "div",
        {
          fontFamily: "Newsreader",
          fontWeight: 400,
          fontSize: teaserSize,
          lineHeight: 1.42,
          color: INK,
        },
        text(teaser)
      ),
    ]
  );

  const footer = el(
    "div",
    { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
    [
      el(
        "div",
        {
          fontFamily: "JetBrains Mono",
          fontWeight: 700,
          fontSize: footerSize,
          letterSpacing: 1,
          color: FAINT,
        },
        "ontherecord.me"
      ),
      el(
        "div",
        {
          fontFamily: "JetBrains Mono",
          fontWeight: 400,
          fontSize: Math.round(footerSize * 0.9),
          letterSpacing: 1,
          color: FAINT,
        },
        text(sourceCount)
      ),
    ]
  );

  const frame = el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      flexGrow: 1,
      border: `1px solid ${LINE}`,
      padding: framePad,
    },
    [topRow, middle, footer]
  );

  return el(
    "div",
    {
      display: "flex",
      width,
      height,
      padding: pad,
      backgroundColor: PAPER,
      fontFamily: "Newsreader",
    },
    [frame]
  );
}

// ---------------------------------------------------------------------------
// Render an element tree to a PNG buffer via Satori → resvg
// ---------------------------------------------------------------------------
async function renderPng(satori, element, fonts, width, height) {
  const svg = await satori(element, { width, height, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // satori ships ESM + CJS; normalize the default export across both.
  const satoriMod = require("satori");
  const satori = satoriMod.default || satoriMod;

  const resolvedEntries = require("../src/_data/resolvedEntries");
  const locales = {
    en: require("../src/_data/locales/en"),
    de: require("../src/_data/locales/de"),
  };
  const LANGS = ["en", "de"];

  const markUri = otrMarkDataUri();
  fs.mkdirSync(CARDS_OUT, { recursive: true });

  // Mono uppercase is much wider than serif, so these run smaller than a
  // serif scale would. Tuned against the inner widths below (portrait 840,
  // og 1024) so a typical title wraps to 2–3 lines without overflowing.
  const PORTRAIT_TITLE_BUCKETS = [
    [22, 64],
    [40, 54],
    [60, 46],
    [85, 40],
    [Infinity, 34],
  ];
  const OG_TITLE_BUCKETS = [
    [28, 46],
    [45, 40],
    [70, 34],
    [100, 30],
    [Infinity, 26],
  ];

  // Inner content widths (frame minus outer pad minus frame pad, both sides).
  const PORTRAIT_INNER = 1080 - 56 * 2 - 64 * 2; // 840
  const OG_INNER = 1200 - 40 * 2 - 48 * 2;       // 1024

  // Localized "N sources" footnote (brand "ontherecord.me" stays untranslated).
  const sourceCountText = (lang, n) => {
    if (!n) return "";
    if (lang === "de") return `${n} Quelle${n === 1 ? "" : "n"}`;
    return `${n} source${n === 1 ? "" : "s"}`;
  };

  // -- Pass 1: derive every card's text content (per language) + accumulate
  //    glyph coverage so the font subsetter keeps every character we render
  //    across BOTH languages (German umlauts/ß included automatically).
  const coverage = new Set();
  for (let c = 0x20; c <= 0x7e; c++) coverage.add(String.fromCharCode(c));
  // Static extras: brand, punctuation, and German umlauts in BOTH cases — card
  // titles are uppercased at render (textTransform), so "Löhne" needs "Ö" even
  // though the source text only carries the lowercase form.
  for (const ch of "ontherecord.me OTR\u2014\u2026\u201c\u201d\u2018\u2019\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df\u1e9e") {
    coverage.add(ch);
  }

  const cardsByLang = {};
  for (const lang of LANGS) {
    const locale = locales[lang];
    const entries = resolvedEntries[lang] || [];
    const cards = [];
    for (const entry of entries) {
      if (!entry || !entry.slug) continue;

      const tierLabel = (locale.statuses[entry.status] || entry.status || "").toUpperCase();
      const title = entry.title || entry.slug;
      const plain = blocksToPlaintext(entry.bodyBlocks || []);
      const srcN = Array.isArray(entry.sources) ? entry.sources.length : 0;
      const sourceCount = sourceCountText(lang, srcN);

      const titleSizePortrait = fitTitleSize(title, PORTRAIT_TITLE_BUCKETS);
      const titleSizeOg = fitTitleSize(title, OG_TITLE_BUCKETS);

      const teaserPortrait = lineBudgetTeaser(plain, {
        innerWidth: PORTRAIT_INNER,
        titleText: title,
        titleSize: titleSizePortrait,
        teaserSize: 34,
        baseLines: 6,
        perTitleLine: 1.3,
        minLines: 2,
      });
      const teaserOg = lineBudgetTeaser(plain, {
        innerWidth: OG_INNER,
        titleText: title,
        titleSize: titleSizeOg,
        teaserSize: 24,
        baseLines: 3,
        perTitleLine: 1.0,
        minLines: 1,
      });

      for (const s of [tierLabel, title, teaserPortrait, teaserOg, sourceCount]) {
        for (const ch of s) coverage.add(ch);
      }

      cards.push({
        slug: entry.slug,
        tierLabel,
        title,
        teaserPortrait,
        teaserOg,
        sourceCount,
        titleSizePortrait,
        titleSizeOg,
      });
    }
    cardsByLang[lang] = cards;
  }

  // -- Build static, subsetted font instances for the collected coverage.
  const coverageText = Array.from(coverage).join("");
  const fonts = await buildFonts(coverageText);

  // -- Pass 2: render both card sizes per entry, per language. Sequential
  //    (await each) to keep peak memory flat across ~400 PNGs.
  let made = 0;
  for (const lang of LANGS) {
    const outDir = path.join(CARDS_OUT, lang);
    fs.mkdirSync(outDir, { recursive: true });

    for (const card of cardsByLang[lang]) {
      const portrait = buildCard({
        width: 1080,
        height: 1350,
        pad: 56,
        framePad: 64,
        tierSize: 26,
        markSize: 84,
        markInset: 32,
        titleSize: card.titleSizePortrait,
        titleGap: 36,
        teaserSize: 34,
        footerSize: 22,
        tierLabel: card.tierLabel,
        title: card.title,
        teaser: card.teaserPortrait,
        sourceCount: card.sourceCount,
        markUri,
      });

      const og = buildCard({
        width: 1200,
        height: 630,
        pad: 40,
        framePad: 48,
        tierSize: 22,
        markSize: 64,
        markInset: 24,
        titleSize: card.titleSizeOg,
        titleGap: 22,
        teaserSize: 24,
        footerSize: 18,
        tierLabel: card.tierLabel,
        title: card.title,
        teaser: card.teaserOg,
        sourceCount: card.sourceCount,
        markUri,
      });

      const portraitPng = await renderPng(satori, portrait, fonts, 1080, 1350);
      const ogPng = await renderPng(satori, og, fonts, 1200, 630);

      fs.writeFileSync(path.join(outDir, `${card.slug}-portrait.png`), portraitPng);
      fs.writeFileSync(path.join(outDir, `${card.slug}-og.png`), ogPng);
      made++;
    }
  }

  console.log(`Generated ${made * 2} share cards (${made} entries × langs) → _site/cards/{en,de}/`);
}

main().catch((err) => {
  console.error("[generate-share-cards] failed:", err);
  process.exit(1);
});
