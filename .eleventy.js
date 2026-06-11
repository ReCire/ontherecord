module.exports = function (eleventyConfig) {
  // Copy static assets (CSS, fonts, client JS) straight through to the build.
  eleventyConfig.addPassthroughCopy("src/assets");

  // Import markdown-blocks renderer
  const { renderBlocksToHTML, blocksToPlaintext } = require("./src/assets/markdown-blocks");

  // Filter: render typed blocks to escaped HTML
  eleventyConfig.addFilter("renderBlocks", renderBlocksToHTML);

  // Filter: convert blocks to plaintext (for search index)
  eleventyConfig.addFilter("blocksToPlaintext", blocksToPlaintext);

  // A collection of every entry, sorted newest-first by date.
  // Now uses resolved entries from the i18n data source.
  eleventyConfig.addCollection("entries", function (collectionApi) {
    return collectionApi
      .getAll()
      .filter(item => item.inputPath.startsWith("./src/entries/"))
      .sort((a, b) => {
        const da = new Date(a.data.date || 0);
        const db = new Date(b.data.date || 0);
        return db - da; // descending
      });
  });

  // Emit entries.json and search-index.json for each language
  eleventyConfig.on("eleventy.after", ({ results }) => {
    const fs = require("fs");
    const path = require("path");
    const resolvedEntriesData = require("./src/_data/resolvedEntries");

    // For each language, emit JSON files
    const languages = ["en", "de"];
    const site = require("./src/_data/site");
    const i18n = {
      en: require("./src/_data/locales/en"),
      de: require("./src/_data/locales/de"),
    };

    for (const lang of languages) {
      const entries = resolvedEntriesData[lang];
      if (!entries) {
        console.warn(`[eleventy.after] No entries found for lang=${lang}`);
        continue;
      }
      const i18nData = i18n[lang];

      // Build section label lookup
      const sectionLabels = {};
      site.sections.forEach(s => {
        sectionLabels[s.key] = i18nData.sections[s.key];
      });

      // entries.json: full resolved list
      const entriesJson = JSON.stringify(entries, null, 2);
      const entriesPath = path.join(__dirname, "_site", lang === "en" ? "" : lang, "entries.json");
      fs.writeFileSync(entriesPath, entriesJson);

      // search-index.json: per-entry search data
      const searchIndex = entries.map(entry => ({
        slug: entry.slug,
        title: entry.title,
        tag: entry.tag,
        sectionKey: entry.section,
        sectionLabel: sectionLabels[entry.section] || entry.section,
        region: entry.region,
        status: entry.status,
        year: new Date(entry.date).getFullYear(),
        date: entry.date ? String(entry.date).slice(0, 10) : "",
        added: entry.added || "",
        text: blocksToPlaintext(entry.bodyBlocks),
      }));
      const searchIndexPath = path.join(__dirname, "_site", lang === "en" ? "" : lang, "search-index.json");
      fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2));
    }
  });

  // Build date: computed once at build time, exposed to templates as "June 2026"
  eleventyConfig.addGlobalData("buildDate", function () {
    return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  });

  // German-formatted build date for /de/ ("Juni 2026")
  eleventyConfig.addGlobalData("buildDateDe", function () {
    return new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  });

  // Cache-busting asset version: a short content hash of the client CSS + JS.
  // Appended to /assets/style.css and /assets/filter.js as ?v=… so a deploy that
  // changes either file yields a brand-new URL no browser or CDN can serve stale.
  // (The unversioned paths were cached long-term by Safari/Arc while the HTML
  // revalidated, leaving new markup styled by old CSS / run by old JS.)
  eleventyConfig.addGlobalData("assetVersion", function () {
    const crypto = require("crypto");
    const fs = require("fs");
    try {
      const hash = crypto.createHash("sha1");
      hash.update(fs.readFileSync("./src/assets/style.css"));
      hash.update(fs.readFileSync("./src/assets/filter.js"));
      hash.update(fs.readFileSync("./src/assets/entry.js"));
      return hash.digest("hex").slice(0, 10);
    } catch (e) {
      return String(Date.now());
    }
  });

  // Search index as global data, one escaped-JSON string per language. The
  // layout inlines searchIndex[lang], so /de/ searches GERMAN titles/bodies —
  // search must match what the user actually sees on that page.
  eleventyConfig.addGlobalData("searchIndex", function () {
    const resolvedEntriesData = require("./src/_data/resolvedEntries");
    const site = require("./src/_data/site");
    const i18n = {
      en: require("./src/_data/locales/en"),
      de: require("./src/_data/locales/de"),
    };

    const out = {};
    for (const lang of Object.keys(i18n)) {
      const entries = resolvedEntriesData[lang];
      if (!entries) continue;
      const i18nData = i18n[lang];

      // Build section label lookup
      const sectionLabels = {};
      site.sections.forEach(s => {
        sectionLabels[s.key] = i18nData.sections[s.key];
      });

      const indexArray = entries.map(entry => ({
        slug: entry.slug,
        title: entry.title,
        tag: entry.tag,
        sectionKey: entry.section,
        sectionLabel: sectionLabels[entry.section] || entry.section,
        region: entry.region,
        status: entry.status,
        year: new Date(entry.date).getFullYear(),
        date: entry.date ? String(entry.date).slice(0, 10) : "",
        added: entry.added || "",
        text: blocksToPlaintext(entry.bodyBlocks),
      }));

      // Stringify to JSON and escape to prevent </script> injection
      const json = JSON.stringify(indexArray);
      out[lang] = json
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
    }
    return out;
  });

  // Format an ISO date as e.g. "Nov 2024" for display.
  eleventyConfig.addFilter("displayDate", function (value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  });

  // Year only, used as a data attribute for filtering.
  eleventyConfig.addFilter("year", function (value) {
    if (!value) return "";
    const d = new Date(value);
    return isNaN(d) ? "" : String(d.getFullYear());
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
