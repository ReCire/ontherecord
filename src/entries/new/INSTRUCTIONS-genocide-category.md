# Instructions: Adding a "Genocide & Atrocity" category

This is a guide for **you** to implement — not an entry file. It explains how to
add the new section and what to do with existing entries so nothing breaks or
double-counts.

---

## 1. Add the section to the taxonomy

In `src/_data/site.js`, in the `sections` array, add a new entry. Pick the number
based on where you want it to appear (sections render in array order). Suggested
placement: right after `global` (The Global Picture), since it's thematically
adjacent. If you put it there, you'll renumber the sections that follow.

```js
{ key: "atrocity", num: "13", label: "Genocide & Atrocity" },
```

**Important:** the `num` field is just a display label. If you insert this at
position 13, either (a) bump every later section's `num` by one (13→14, 14→15,
etc.), or (b) append it at the end with the next free number and accept that it
displays out of thematic order. Option (b) is less work and nothing breaks —
the number is cosmetic. Your call.

If you'd rather not renumber, just append at the end:

```js
{ key: "atrocity", num: "17", label: "Genocide & Atrocity" },
```

## 2. (Optional) add a status value

The existing statuses already cover most cases (`ruling`, `warrant`, `report`,
`alleged`, `context`). You may want one more for clarity:

```js
{ key: "finding", label: "Official finding / determination" },
```

Use it for things like a UN commission of inquiry or a government's formal
genocide determination — stronger than `report`, short of a court `ruling`.

## 3. What to do with EXISTING entries

You currently have two relevant entries in the `global` section:

- **`icc-warrants.md`** (ICC warrants for Netanyahu, Gallant, Hamas leaders)
- the **ICJ / South Africa v. Israel** entry (plausible-genocide provisional measures)

**Recommendation: leave both where they are, in `global`.** They are specifically
about *court proceedings*, which is the spine of the `global` section. Moving them
into `atrocity` would strip the legal framing that makes them credible.

**Instead**, the new `atrocity` section should hold entries about *documented
atrocities and determinations* that aren't primarily about a single court case —
e.g. historical genocides with scholarly/UN consensus, refugee-camp humanitarian
crimes, commission-of-inquiry findings. If you want, add a one-line cross-reference
at the end of an `atrocity` entry pointing readers to the ICJ/ICC entries in
`global`, rather than duplicating them.

**Do not** change the `section:` field of the two existing entries unless you
decide to consolidate everything atrocity-related in one place — in which case move
*both* and accept that `global` becomes a non-legal "geopolitics" section. Pick one
model and keep it consistent.

## 4. Sourcing discipline for this section (read before writing entries)

Genocide is the highest-stakes category in the whole project. To keep it credible
and defensible:

- **Distinguish the four tiers explicitly in each entry:**
  1. *Court ruling* — a tribunal has convicted or formally ruled (e.g. ICTR on
     Rwanda, ICTY on Srebrenica).
  2. *Official determination* — a state or UN body has formally declared a genocide
     (use `finding`).
  3. *Provisional / plausibility* — a court found a claim plausible enough for
     interim measures but has NOT ruled on the merits (this is the ICJ Gaza
     situation — say so plainly).
  4. *Alleged / contested* — serious allegations not yet adjudicated.
- **Never collapse a tier upward.** "Plausible" is not "ruled"; "alleged" is not
  "proven." The existing ICJ entry already models this carefully — match its tone.
- **Lead with primary sources**: tribunal judgments, UN commission reports, ICRC.
- **For historical genocides with scholarly consensus** (e.g. the Holocaust, Rwanda,
  Srebrenica, Armenian Genocide), state the consensus and note where states still
  formally dispute recognition — that dispute is itself part of the record.

## 5. Candidate entries to write for this section (not yet created)

These are suggestions, not done — flagged so you (or a future session) can fill them
with proper research and sourcing:

- Rwanda 1994 — ICTR convictions (court-ruling tier)
- Srebrenica 1995 — ICTY/ICJ rulings (court-ruling tier)
- Refugee-camp humanitarian crimes / conditions (report tier — needs current,
  specific sourcing)
- A historical-recognition entry (e.g. genocides states still decline to formally
  recognize) — context/finding tier

Each should follow the same frontmatter format as your other entries and the
four-tier discipline above.
