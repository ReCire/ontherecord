module.exports = {
  title: "On The Record",
  url: "https://ontherecord.me",
  ogImage: "/assets/og-image.png", // 1200×630px image — add to src/assets/
  tagline:
    "The people ask only for what is necessary. The powerful aspire to everything. Below: what was done, who did it, and where it is written down.",

  // Web3Forms access key. Get a free key at https://web3forms.com (just enter
  // your email, no account). Paste it here to activate the contact form.
  // Leave empty ("") and the form shows a disabled placeholder instead.
  web3formsKey: "",

  // Cloudflare Turnstile site key (optional, free). Leave "" to use honeypot only.
  turnstileSiteKey: "",

  // Canonical sections. The `key` is what you put in an entry's frontmatter
  // (section: corruption). Order here = display order on the page.
  sections: [
    { key: "corruption", num: "01", label: "Corruption & Bribery" },
    { key: "slavery", num: "02", label: "Forced Labor" },
    { key: "climate", num: "03", label: "Climate Deception" },
    { key: "environment", num: "04", label: "Environmental Harm" },
    { key: "labor", num: "05", label: "Union Busting" },
    { key: "money", num: "06", label: "Money Trails" },
    { key: "pardons", num: "07", label: "Pardons & Impunity" },
    { key: "deutschland", num: "08", label: "Deutschland" },
    { key: "machine", num: "09", label: "AI & The Human Cost" },
    { key: "surveillance", num: "10", label: "Surveillance & Control" },
    { key: "underclass", num: "11", label: "Permanent Underclass" },
    { key: "global", num: "12", label: "The Global Picture" },
  ],

  // Regions for the region filter.
  regions: [
    { key: "global", label: "Global" },
    { key: "us", label: "US" },
    { key: "de", label: "DE" },
    { key: "eu", label: "EU" },
    { key: "africa", label: "Africa" },
    { key: "mena", label: "MENA" },
  ],

  // Status reflects how settled a claim is — the page's core credibility signal.
  statuses: [
    { key: "ruling", label: "Court ruling" },
    { key: "settlement", label: "Settlement / plea" },
    { key: "warrant", label: "Warrant / charge" },
    { key: "report", label: "Investigation / report" },
    { key: "alleged", label: "Alleged (in court)" },
    { key: "ongoing", label: "Ongoing" },
    { key: "context", label: "Context / debate" },
  ],

  // Pullquotes displayed between sections. Key = the section they appear AFTER.
  pullquotes: {
    corruption: "Abuses are the work and the domain of the powerful. They are the scourges of the people.",
    environment: "War is peace. Freedom is slavery. Ignorance is strength. — They told you. In writing.",
    money: "Corrupt. Useless. Puppets. Robbing us of minds, of souls.",
    machine: "You fucks were bullied in school. This is how you pay us back now?",
    surveillance: "Get out the guillotine. — No j/k. Violence is no solution. Speak openly. Be vulnerable.",
    underclass: "The people ask only for what is necessary. The powerful aspire to everything.",
    global: "They want to invade and dominate everything. It's time to build the guillotines.",
  },

  // "How To Use This" deeper-digging links
  deepDig: [
    { label: "DB", name: "Violation Tracker — searchable corporate penalty database", url: "https://violationtracker.goodjobsfirst.org/" },
    { label: "DB", name: "Business & Human Rights Resource Centre", url: "https://www.business-humanrights.org/" },
    { label: "DB", name: "International Consortium of Investigative Journalists", url: "https://www.icij.org/" },
    { label: "DB", name: "Climate Files — fossil fuel document archive", url: "https://www.climatefiles.com/" },
    { label: "DB", name: "National Labor Relations Board — case search", url: "https://www.nlrb.gov/" },
    { label: "DB", name: "Lobbypedia (LobbyControl) — deutsche Lobby-Datenbank", url: "https://lobbypedia.de/" },
    { label: "DB", name: "CORRECTIV — gemeinnütziges Recherchezentrum", url: "https://correctiv.org/" },
    { label: "DB", name: "Finanzwende — Finanzmarkt-Watchdog", url: "https://www.finanzwende.de/" },
    { label: "DB", name: "Global Witness — resource & conflict investigations", url: "https://globalwitness.org/" },
    { label: "DB", name: "International Court of Justice — official rulings", url: "https://www.icj-cij.org/" },
    { label: "DB", name: "International Criminal Court — cases & warrants", url: "https://www.icc-cpi.int/" },
  ],
};
