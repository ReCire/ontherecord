#!/usr/bin/env node
/**
 * generate-share-cards.js — Build-time social share-card generator.
 *
 * For every entry, renders TWO PNG share cards that match the site's
 * samizdat aesthetic (paper bg, Newsreader + JetBrains Mono, red accents):
 *
 *   _site/cards/{slug}-portrait.png   1080×1350  (Instagram portrait)
 *   _site/cards/{slug}-og.png         1200×630   (X / Facebook / OG landscape)
 *
 * Each card shows: the tier label (from status), the entry TITLE, a 1–2
 * sentence teaser of the body, the OTR mark, and "ontherecord.me".
 *
 * Pipeline: Satori (HTML/CSS-ish element tree → SVG) → resvg (SVG → PNG).
 * NO headless browser, NO client-side rendering, NO network/font CDN.
 *
 * Fonts are loaded from the SELF-HOSTED woff2 files in src/assets/fonts/.
 * Satori cannot parse woff2 directly (Brotli-compressed), so we decompress
 * them to TTF in memory with wawoff2 — still fully offline, no CDN.
 *
 * Also emits an Apple touch icon (180×180) to src/assets/ (and _site/assets/
 * when present) so iOS home-screen saves look right.
 *
 * Usage:
 *   npm run cards          # generate cards into _site/cards/
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
// Teaser: first 1–2 sentences of the body plaintext, never cut mid-word
// ---------------------------------------------------------------------------
function makeTeaser(text, maxSentences, maxChars) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxChars) {
    // Short enough to use whole — but still cap sentence count.
    const all = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean];
    if (all.length <= maxSentences) return clean;
  }

  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean];
  let out = "";
  for (let i = 0; i < sentences.length && i < maxSentences; i++) {
    const candidate = (out + sentences[i]).replace(/\s+/g, " ").trim();
    if (candidate.length > maxChars) break;
    out = candidate;
  }

  if (out) return out;

  // First sentence alone exceeds budget → cut on a word boundary, add ellipsis.
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
      { type: "img", props: { src: markUri, width: markSize, height: markSize } },
    ]
  );

  const middle = el(
    "div",
    { display: "flex", flexDirection: "column" },
    [
      el(
        "div",
        {
          fontFamily: "Newsreader",
          fontWeight: 500,
          fontSize: titleSize,
          lineHeight: 1.08,
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
// Apple touch icon (180×180): red field, "OTR" in paper-colored mono
// ---------------------------------------------------------------------------
async function buildAppleTouchIcon(satori, fonts) {
  const size = 180;
  const element = el(
    "div",
    {
      display: "flex",
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: RED,
    },
    [
      el(
        "div",
        {
          fontFamily: "JetBrains Mono",
          fontWeight: 700,
          fontSize: 64,
          letterSpacing: 2,
          color: PAPER,
        },
        "OTR"
      ),
    ]
  );
  return renderPng(satori, element, fonts, size, size);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // satori ships ESM + CJS; normalize the default export across both.
  const satoriMod = require("satori");
  const satori = satoriMod.default || satoriMod;

  const resolvedEntries = require("../src/_data/resolvedEntries");
  const locale = require("../src/_data/locales/en");
  const entries = resolvedEntries.en || [];

  const markUri = otrMarkDataUri();
  fs.mkdirSync(CARDS_OUT, { recursive: true });

  const PORTRAIT_TITLE_BUCKETS = [
    [28, 96],
    [45, 80],
    [70, 66],
    [100, 54],
    [Infinity, 46],
  ];
  const OG_TITLE_BUCKETS = [
    [28, 60],
    [45, 50],
    [70, 42],
    [100, 34],
    [Infinity, 30],
  ];

  // -- Pass 1: derive each card's text content + accumulate glyph coverage so
  //    the font subsetter keeps every character we actually render.
  const coverage = new Set();
  // Base printable ASCII + the static label glyphs and common punctuation.
  for (let c = 0x20; c <= 0x7e; c++) coverage.add(String.fromCharCode(c));
  for (const ch of "ontherecord.me OTR source sources\u2014\u2026\u201c\u201d\u2018\u2019") {
    coverage.add(ch);
  }

  const cards = [];
  for (const entry of entries) {
    if (!entry || !entry.slug) continue;

    const tierLabel = (locale.statuses[entry.status] || entry.status || "").toUpperCase();
    const title = entry.title || entry.slug;
    const plain = blocksToPlaintext(entry.bodyBlocks || []);
    const srcN = Array.isArray(entry.sources) ? entry.sources.length : 0;
    const sourceCount = srcN ? `${srcN} source${srcN === 1 ? "" : "s"}` : "";
    const teaserPortrait = makeTeaser(plain, 2, 240);
    const teaserOg = makeTeaser(plain, 2, 150);

    for (const s of [tierLabel, title, teaserPortrait, teaserOg, sourceCount]) {
      for (const ch of s) coverage.add(ch);
    }

    cards.push({ slug: entry.slug, tierLabel, title, teaserPortrait, teaserOg, sourceCount });
  }

  // -- Build static, subsetted font instances for the collected coverage.
  const coverageText = Array.from(coverage).join("");
  const fonts = await buildFonts(coverageText);

  // -- Pass 2: render both card sizes per entry.
  let made = 0;
  for (const card of cards) {
    const portrait = buildCard({
      width: 1080,
      height: 1350,
      pad: 56,
      framePad: 64,
      tierSize: 26,
      markSize: 84,
      titleSize: fitTitleSize(card.title, PORTRAIT_TITLE_BUCKETS),
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
      titleSize: fitTitleSize(card.title, OG_TITLE_BUCKETS),
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

    fs.writeFileSync(path.join(CARDS_OUT, `${card.slug}-portrait.png`), portraitPng);
    fs.writeFileSync(path.join(CARDS_OUT, `${card.slug}-og.png`), ogPng);
    made++;
  }

  // Apple touch icon — write to source assets (committed + passthrough) and,
  // when the build output already exists, straight into _site/assets too.
  const iconPng = await buildAppleTouchIcon(satori, fonts);
  fs.writeFileSync(path.join(ASSETS_DIR, "apple-touch-icon.png"), iconPng);
  const siteAssets = path.join(SITE_DIR, "assets");
  if (fs.existsSync(siteAssets)) {
    fs.writeFileSync(path.join(siteAssets, "apple-touch-icon.png"), iconPng);
  }

  console.log(`Generated ${made * 2} share cards for ${made} entries → _site/cards/`);
  console.log("Wrote apple-touch-icon.png (180×180).");
}

main().catch((err) => {
  console.error("[generate-share-cards] failed:", err);
  process.exit(1);
});
