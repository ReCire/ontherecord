module.exports = function (eleventyConfig) {
  // Copy static assets (CSS, fonts, client JS) straight through to the build.
  eleventyConfig.addPassthroughCopy("src/assets");

  // A collection of every entry, sorted newest-first by date.
  eleventyConfig.addCollection("entries", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/entries/*.md")
      .sort((a, b) => {
        const da = new Date(a.data.date || 0);
        const db = new Date(b.data.date || 0);
        return db - da; // descending
      });
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
