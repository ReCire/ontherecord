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
    const languages = ["en"];
    const site = require("./src/_data/site");
    const i18n = {
      en: require("./src/_data/locales/en"),
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
        text: blocksToPlaintext(entry.bodyBlocks),
      }));
      const searchIndexPath = path.join(__dirname, "_site", lang === "en" ? "" : lang, "search-index.json");
      fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2));
    }
  });

  // Add search index as global data for templates
  eleventyConfig.addGlobalData("searchIndex", function () {
    const resolvedEntriesData = require("./src/_data/resolvedEntries");
    const site = require("./src/_data/site");
    const i18n = {
      en: require("./src/_data/locales/en"),
    };

    const entries = resolvedEntriesData.en;
    const i18nData = i18n.en;

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
      text: blocksToPlaintext(entry.bodyBlocks),
    }));

    // Stringify to JSON and escape to prevent </script> injection
    const json = JSON.stringify(indexArray);
    return json
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
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
