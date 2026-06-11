// German UI strings — mirrors locales/en.js key-for-key. A missing key here is
// a build error, not a silent fallback: keep both files in sync.
// Voice-critical strings (tagline, kicker, pullquotes) are deliberately left in
// English with TODO markers — they must be written by a human, not machine-
// translated. Everything else is translated.
module.exports = {
  // Site metadata
  title: "On The Record",
  titleSuffix: "Ein dokumentiertes Verzeichnis",
  ogLocale: "de_DE",
  tagline: "Das Volk verlangt nur das Notwendigste. Die Machthaber beanspruchen alles. Hier: was getan wurde, wer es getan hat und wo es geschrieben steht.",
  kicker: "Ein Verzeichnis · mit Primärquellen",
  disclaimer: "Das Volk spricht offen, bei Tageslicht, mit den Belegen in der Hand.",

  // Section labels (language-specific)
  sections: {
    climate: "Klimatäuschung",
    environment: "Umweltschäden",
    underclass: "Dauerhafte Unterschicht",
    slavery: "Zwangsarbeit",
    labor: "Gewerkschaftsbekämpfung",
    money: "Geldspuren",
    corruption: "Korruption & Bestechung",
    pardons: "Begnadigungen & Straflosigkeit",
    deutschland: "Deutschland",
    empire: "Imperium & Öl",
    global: "Das globale Bild",
    machine: "KI & die menschlichen Kosten",
    surveillance: "Überwachung & Kontrolle",
    minds: "Psyche & mentale Gesundheit",
    spectacle: "Sport & Spektakel",
    wins: "Rechenschaft & Erfolge",
    abuse: "Missbrauch & Straflosigkeit",
    atrocity: "Genozid & Gräueltaten",
  },

  // Region labels
  regions: {
    global: "Global",
    us: "USA",
    de: "DE",
    eu: "EU",
    africa: "Afrika",
    mena: "MENA",
    au: "Australien",
  },

  // Status labels — every key from en.js statuses must be mapped here.
  statuses: {
    ruling: "Gerichtsurteil",
    settlement: "Vergleich / Geständnis",
    warrant: "Haftbefehl / Anklage",
    report: "Untersuchung / Bericht",
    alleged: "Mutmaßlich (vor Gericht)",
    ongoing: "Laufend",
    context: "Kontext / Debatte",
    law: "Gesetz / Politik",
    win: "Rechenschafts-Erfolg",
    finding: "Amtliche Feststellung",
  },

  // Section intros (language-specific)
  sectionIntros: {
    surveillance: "Vom Abschöpfen der Handys Jugendlicher bis zu Roboterhunden am Stadiontor — die Maschinerie des Beobachtens, und wer sie baut.",
    machine: "Plattformen und Modelle, gebaut auf der Arbeit anderer — die menschlichen Kosten werden vergesellschaftet, während sich die Gewinne konzentrieren.",
    corruption: "Dokumentierte Vergleiche und Schuldgeständnisse. Keine Anschuldigungen — Eingeständnisse und Verurteilungen, mit Aktenlage.",
    slavery: "Klagen und behördliche Feststellungen zu Zwangsarbeit in den Lieferketten bekannter Marken.",
    climate: "Sie wussten es. Interne Dokumente, ans Licht gebracht durch Klagen und parlamentarische Untersuchungen, beweisen es.",
    environment: "Produkte, als sicher verkauft. Schäden, bezahlt in Urteilen, Vergleichen und Menschenleben.",
    labor: "Feststellungen von Verwaltungsrichtern und dem National Labor Relations Board. Keine Meinung — gerichtlich festgestellte Tatsachen.",
    money: "Das Schattenfinanzsystem, das Vermögen dem öffentlichen Blick entzieht — aufgedeckt durch die größten Journalismus-Recherchen der Geschichte.",
    pardons: "Wenn Rechenschaft per Dekret gelöscht wird. Dokumentiert aus Regierungsakten und Bundesberichterstattung.",
    deutschland: "Der größte Steuerraub der Nachkriegsgeschichte, Selbstbereicherung in der Pandemie und die Drehtür zwischen Politik und Konzernen — belegt durch Gerichtsurteile und Recherchen.",
    underclass: "Auf den reichsten Quadratmeilen der Erde ist die Kluft kein Fehler im System — sie ist das System.",
    global: "Krieg, Gerichte, Konfliktmineralien und der lange Schatten des Imperiums. Gerade hier wird die Linie zwischen dem, was ein Gericht entschieden hat, und dem, was Vorwurf bleibt, sorgfältig gezogen.",
    minds: "Was der Feed mit Aufmerksamkeit, Stimmung und den Jungen macht — und die Forschung, die die Plattformen erst studierten, dann begruben.",
    wins: "Der Beweis, dass es nicht so sein muss: Gesetze, Urteile und Menschen, die Macht für die Öffentlichkeit nutzten statt gegen sie.",
    empire: "Putsche, Öl und Waffen — die Maschinerie der Beherrschung, vieles davon inzwischen in den eigenen, freigegebenen Worten der Täter.",
    spectacle: "Sport, Prominenz und die Institutionen, die Spektakel verkaufen — und die Korruption, die das Spektakel verdecken sollte. FIFA-Bestechung, Davos-Heuchelei und die Maschine der kulturellen Aneignung.",
    abuse: "Wenn Institutionen Täter statt Opfer schützen, ist das eine Entscheidung. Die Fälle unten zeigen, wer sie traf, wer dafür bezahlte und wer das Schweigen schließlich brach.",
    atrocity: "Die schwersten Verbrechen, gemessen am strengsten Beweismaß: was Gerichte urteilten, was Gremien förmlich feststellten und was umstritten bleibt — nie verwischt.",
  },

  // Pullquotes (language-specific)
  pullquotes: {
    climate: "Krieg ist Frieden. Freiheit ist Sklaverei. Unwissenheit ist Stärke. — Sie haben es dir gesagt und aufgeschrieben.",
    underclass: "Das Volk verlangt nur das Notwendigste. Die Machthaber beanspruchen alles.",
    money: "Korrupte. Nutzlose. Marionetten. Entziehen uns unserer Gedanken, unserer Seelen.",
    corruption: "Missbrauch ist das Werk und die Domäne der Machthaber. Sie sind die Geißeln des Volkes.",
    global: "Sie wollen alles überfallen und dominieren. Es ist an der Zeit die Guillotine zu errichten.",
    machine: "Ihr Opfer wurdet in der Schule gemobbt. So zahlt Ihr es uns nun heim?",
    surveillance: "Errichtet die Guillotine. — Nein, Spaß. Gewalt ist keine Lösung. Sprecht offen. Seid verletzlich.",
    wins: "Sprich das aus, was du fürchtest. Finde die Anderen. Sie warten alle darauf, dass einer den ersten Schritt wagt.",
  },

  // UI chrome
  filterToggle: "Filter",
  expandAll: "Alle ausklappen",
  collapseAll: "Alle einklappen",
  clearAll: "Filter zurücksetzen",
  searchPlaceholder: "Einträge durchsuchen…",
  searchEmpty: "Keine Treffer",
  searchResults: "Treffer",
  searchResult: "Treffer",
  searchFor: "für",
  entriesShown: "Einträge angezeigt",
  entryShown: "Eintrag angezeigt",
  entriesTotal: "Einträge gesamt",
  activeSuffix: "aktiv",
  noMatch: "Keine Einträge passen zu",
  tryFewer: "Weniger Wörter versuchen oder Suche zurücksetzen.",
  sectionEmpty: "Noch keine Einträge in diesem Abschnitt.",

  // View toggle + filter group labels
  viewNarrative: "Narrativ",
  viewRecent: "Neueste",
  viewTimeline: "Chronologie",
  filterTopic: "Thema",
  filterRegion: "Region",
  filterStatus: "Status",

  // Ledger-updated stamp
  ledgerUpdated: "Stand des Verzeichnisses:",

  // About / colophon
  spiritNote: "Das Gegenmittel zur Spaltung ist nicht Einigkeit — es ist das Verständnis dessen, was tatsächlich geschah. Dies ist ein Verzeichnis davon, wer was getan hat und wo es niedergeschrieben steht.",

  // Meta sections
  howToUseThis: "Zur Benutzung",
  suggestEntry: "Eintrag vorschlagen",
  sources: "Quellen",
  archived: "archiviert",
  lastVerified: "Quellen zuletzt geprüft:",
  src: "SRC",
  video: "▶ VIDEO",
  // Share affordances (JS-only): native share sheet on mobile, download links on desktop
  shareLabel: "Teilen",
  cardPortrait: "Karte (hoch)",
  cardWide: "Karte (breit)",
  copyLink: "Link kopieren",
  copied: "kopiert",
  readInLedger: "→ Im vollständigen Verzeichnis lesen",

  // Cookie disclosure (About section fine print)
  cookieNote: "Diese Seite setzt ein einziges lokales Cookie, um die gewählte Ansicht zu merken. Es wird nie übertragen, nie zur Identifizierung genutzt und verrät uns nichts — es gibt keinen Server und keine Analytics.",

  // Translation note
  translationNote: "Noch nicht übersetzt — englisches Original",

  // Contact form
  contactTitle: "Eintrag vorschlagen",
  contactDisabled: "Kontaktformular ist deaktiviert.",
  contactName: "Name",
  contactEmail: "E-Mail",
  contactMessage: "Nachricht",
  contactSubmit: "Absenden",
  contactSuccess: "Nachricht erfolgreich gesendet.",
  contactError: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
};
