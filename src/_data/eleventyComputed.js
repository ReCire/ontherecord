module.exports = {
  // Expose the active language's UI strings as a bare `i18n` for templates.
  // Falls back to English. Reads the per-page `lang` (set in en.njk/de.njk).
  i18n: (data) => (data.locales && (data.locales[data.lang] || data.locales.en)) || {},
};
