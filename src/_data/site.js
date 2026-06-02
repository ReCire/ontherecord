module.exports = {
  title: "On The Record",
  url: "https://ontherecord.me",
  ogImage: "/assets/og-image.png", // 1200×630px image — add to src/assets/
  tagline:
    "The people ask only for what is necessary. The powerful aspire to everything. Below: what was done, who did it, and where it is written down.",

  // Web3Forms access key. Get a free key at https://web3forms.com (just enter
  // your email, no account). Paste it here to activate the contact form.
  // Leave empty ("") and the form shows a disabled placeholder instead.
  web3formsKey: "9ea19de6-7d26-46ed-8286-64a9df07aa1b",

  // Cloudflare Turnstile site key (optional, free). Leave "" to use honeypot only.
  turnstileSiteKey: "",

  // Canonical sections. The `key` is what you put in an entry's frontmatter
  // (section: corruption). Order here = display order on the page.
  sections: [
    // --- PART I: EXISTENTIAL & PHYSICAL HARM ---
    { key: "climate", num: "01", label: "Climate Deception" },
    { key: "environment", num: "02", label: "Environmental Harm" },

    // --- PART II: ECONOMIC STRATIFICATION & LABOR ---
    { key: "underclass", num: "03", label: "Permanent Underclass" },
    { key: "slavery", num: "04", label: "Forced Labor" },
    { key: "labor", num: "05", label: "Union Busting" },

    // --- PART III: THE FINANCIAL & LEGAL SYSTEMS OF IMPUNITY ---
    { key: "money", num: "06", label: "Money Trails" },
    { key: "corruption", num: "07", label: "Corruption & Bribery" },
    { key: "pardons", num: "08", label: "Pardons & Impunity" },
    { key: "deutschland", num: "09", label: "Deutschland" },

    // --- PART IV: GEOPOLITICAL POWER & INFLUENCE ---
    { key: "empire", num: "10", label: "Empire & Oil" },
    { key: "global", num: "11", label: "The Global Picture" },

    // --- PART V: TECHNOCRACY & CONTROL ---
    { key: "machine", num: "12", label: "AI & The Human Cost" },
    { key: "surveillance", num: "13", label: "Surveillance & Control" },
    { key: "minds", num: "14", label: "Minds & Mental Health" },

    // --- PART VI: COGNITIVE OVERLAYS & THE PIVOT ---
    { key: "spectacle", num: "15", label: "Sport & Spectacle" },
    { key: "wins", num: "16", label: "Accountability & Wins" },
    { key: "abuse", num: "17", label: "Abuse & Impunity" },

    // --- PART VII: THE GRAVEST ADJUDICATED CRIMES ---
    { key: "atrocity", num: "18", label: "Genocide & Atrocity" },
  ],

  // Regions for the region filter.
  regions: [
    { key: "global", label: "Global" },
    { key: "us", label: "US" },
    { key: "de", label: "DE" },
    { key: "eu", label: "EU" },
    { key: "africa", label: "Africa" },
    { key: "mena", label: "MENA" },
    { key: "au", label: "Australia" },
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
    { key: "law", label: "Law / policy" },
    { key: "win", label: "Accountability win" },
    { key: "finding", label: "Official finding" },
  ],

  // Pullquotes displayed between sections. Key = the section they appear AFTER.
  pullquotes: {
    climate: "War is peace. Freedom is slavery. Ignorance is strength. — They told you. In writing.",
    underclass: "The people ask only for what is necessary. The powerful aspire to everything.",
    money: "Corrupt. Useless. Puppets. Robbing us of minds, of souls.",
    corruption: "Abuses are the work and the domain of the powerful. They are the scourges of the people.",
    global: "They want to invade and dominate everything. It's time to build the guillotines.",
    machine: "You fucks were bullied in school. This is how you pay us back now?",
    surveillance: "Get out the guillotine. — No j/k. Violence is no solution. Speak openly. Be vulnerable.",
    wins: "The arc of the moral universe is long, but it bends toward justice. — Sometimes it bends because people make it bend.",
  },

  // One-line italic intro shown under each section heading. Keyed by section key.
  sectionIntros: {
    surveillance: "From harvesting teenagers' phones to robot dogs at the stadium gate — the machinery of watching, and who builds it.",
    machine: "The platforms and models built on other people's work — and the human costs socialized while the gains concentrate. (This ledger was assembled with help from an AI built by Anthropic, one of the companies named below. Read that tension however you like.)",
    corruption: "Documented settlements and guilty pleas. Not allegations — admissions and convictions, with the paperwork attached.",
    slavery: "Lawsuits and government findings on coerced labor inside the supply chains of household-name brands.",
    climate: "They knew. Internal documents, surfaced through lawsuits and congressional subpoenas, prove it.",
    environment: "Products sold as safe. Damage paid for in verdicts, settlements, and lives.",
    labor: "Findings by administrative law judges and the National Labor Relations Board. Not opinion — adjudicated fact.",
    money: "The shadow financial system that keeps wealth out of public view — exposed by the largest journalism investigations in history.",
    pardons: "When accountability is erased by decree. Documented from government records and federal reporting.",
    deutschland: "Der größte Steuerraub der Nachkriegsgeschichte, Selbstbereicherung in der Pandemie und die Drehtür zwischen Politik und Konzernen — belegt durch Gerichtsurteile und Recherchen.",
    underclass: "In the richest square miles on earth, the gap isn't a glitch — it's the design.",
    global: "War, courts, conflict minerals, and the long shadow of empire. Here especially, the line between what a court has ruled and what remains alleged is drawn carefully.",
    minds: "What the feed does to attention, mood, and the young — and the research the platforms studied, then buried.",
    wins: "Proof it doesn't have to be this way: laws, verdicts, and people who used power for the public instead of against it.",
    empire: "Coups, oil, and arms — the machinery of domination, much of it now in the perpetrators' own declassified words.",
    spectacle: "Sport, celebrity, and the institutions that sell spectacle — and the corruption the spectacle was built to hide. FIFA bribes, Davos hypocrisy, and the cultural appropriation machine.",
    abuse: "When institutions protect abusers instead of victims, it is a choice. The cases below show who made it, who paid for it, and who finally broke the silence.",
    atrocity: "The gravest crimes, held to the strictest standard of proof: what courts ruled, what bodies formally found, and what remains contested — never blurred.",
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
