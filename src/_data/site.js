module.exports = {
  url: "https://ontherecord.me",
  ogImage: "/assets/og-image.png", // 1200×630px image — add to src/assets/
  ogImageEn: "/assets/og-image-en.png", // default OG for English list page
  ogImageDe: "/assets/og-image-de.png", // default OG for German list page

  // Web3Forms access key. Get a free key at https://web3forms.com (just enter
  // your email, no account). Paste it here to activate the contact form.
  // Leave empty ("") and the form shows a disabled placeholder instead.
  web3formsKey: "9ea19de6-7d26-46ed-8286-64a9df07aa1b",

  // Cloudflare Turnstile site key (optional, free). Leave "" to use honeypot only.
  turnstileSiteKey: "",

  // Canonical sections. The `key` is what you put in an entry's frontmatter
  // (section: corruption). Order here = display order on the page.
  // Labels are now in i18n/{lang}.js.
  sections: [
    // --- PART I: EXISTENTIAL & PHYSICAL HARM ---
    { key: "climate", num: "01" },
    { key: "environment", num: "02" },

    // --- PART II: ECONOMIC STRATIFICATION & LABOR ---
    { key: "underclass", num: "03" },
    { key: "slavery", num: "04" },
    { key: "labor", num: "05" },

    // --- PART III: THE FINANCIAL & LEGAL SYSTEMS OF IMPUNITY ---
    { key: "money", num: "06" },
    { key: "corruption", num: "07" },
    { key: "pardons", num: "08" },
    { key: "deutschland", num: "09" },

    // --- PART IV: GEOPOLITICAL POWER & INFLUENCE ---
    { key: "empire", num: "10" },
    { key: "global", num: "11" },

    // --- PART V: TECHNOCRACY & CONTROL ---
    { key: "machine", num: "12" },
    { key: "surveillance", num: "13" },
    { key: "minds", num: "14" },

    // --- PART VI: COGNITIVE OVERLAYS & THE PIVOT ---
    { key: "spectacle", num: "15" },
    { key: "wins", num: "16" },
    { key: "abuse", num: "17" },

    // --- PART VII: THE GRAVEST ADJUDICATED CRIMES ---
    { key: "atrocity", num: "18" },
  ],

  // Regions for the region filter. Labels are now in i18n/{lang}.js.
  regions: [
    { key: "global" },
    { key: "us" },
    { key: "de" },
    { key: "eu" },
    { key: "africa" },
    { key: "mena" },
    { key: "au" },
  ],

  // Status reflects how settled a claim is — the page's core credibility signal.
  // Labels are now in i18n/{lang}.js.
  statuses: [
    { key: "ruling" },
    { key: "settlement" },
    { key: "warrant" },
    { key: "report" },
    { key: "alleged" },
    { key: "ongoing" },
    { key: "context" },
    { key: "law" },
    { key: "win" },
    { key: "finding" },
  ],

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
