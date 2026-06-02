#!/usr/bin/env node
/**
 * archive-sources.js — Link-rot defense for On The Record.
 *
 * For every source in every entry, ensures a permanent Wayback Machine
 * snapshot exists and writes its URL back into the entry frontmatter as
 * `archive_url`. Also stamps the entry with `last_verified` (today).
 *
 * This is a LOCAL maintenance script, not a build step. Run it before you
 * commit new/changed entries:
 *
 *     npm run archive            # archive any source missing an archive_url
 *     npm run archive -- --force # re-snapshot every source (slow)
 *
 * It is idempotent: sources that already carry an archive_url are skipped
 * unless --force is passed. Commit the resulting frontmatter changes; the
 * Eleventy build simply renders url + archive_url ("source · archived").
 *
 * Why not run this on Vercel? The deploy filesystem is ephemeral (writes
 * don't persist to the repo) and Save Page Now is slow + rate-limited.
 * Archiving belongs in version control, captured once at authoring time.
 *
 * Wayback APIs used:
 *   - Availability: https://archive.org/wayback/available?url=<URL>
 *   - Save Page Now: https://web.archive.org/save/<URL>
 *   Docs: https://archive.org/help/wayback_api.php
 */

"use strict";

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const yaml = require("js-yaml");

const ENTRIES_DIR = path.join(__dirname, "..", "src", "entries");
const UA = "OnTheRecord-archiver/1.0 (+https://ontherecord.me)";
const FORCE = process.argv.includes("--force");

// Politeness / reliability knobs.
const SPN_TIMEOUT_MS = 45000; // Save Page Now can be slow.
const SPN_DELAY_MS = 3000; // Pause between Save Page Now calls.
const AVAIL_TIMEOUT_MS = 15000;

// Keep YAML dates as strings (don't let js-yaml turn them into Date objects,
// which would rewrite every `date:` field into an ISO timestamp on save).
const yamlEngine = {
  parse: (s) => yaml.load(s, { schema: yaml.JSON_SCHEMA }),
  stringify: (o) => yaml.dump(o, { schema: yaml.JSON_SCHEMA, lineWidth: -1 }),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Return an existing Wayback snapshot URL for `url`, or null. */
async function getExistingSnapshot(url) {
  const api = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetchWithTimeout(api, { headers: { "User-Agent": UA } }, AVAIL_TIMEOUT_MS);
    if (!res.ok) return null;
    const json = await res.json();
    const snap = json && json.archived_snapshots && json.archived_snapshots.closest;
    if (snap && snap.available && snap.url) {
      return snap.url.replace(/^http:\/\//, "https://");
    }
  } catch (_) {
    /* network hiccup — treat as "no snapshot" */
  }
  return null;
}

/** Trigger a fresh Wayback capture for `url`. Returns snapshot URL or null. */
async function savePageNow(url) {
  const saveUrl = `https://web.archive.org/save/${url}`;
  try {
    const res = await fetchWithTimeout(
      saveUrl,
      { method: "GET", headers: { "User-Agent": UA }, redirect: "follow" },
      SPN_TIMEOUT_MS
    );
    const loc = res.headers.get("content-location");
    if (loc && loc.startsWith("/web/")) return `https://web.archive.org${loc}`;
    if (res.url && res.url.includes("/web/")) return res.url;
  } catch (_) {
    /* timeout or rate limit — caller will warn */
  }
  return null;
}

/** Ensure a snapshot exists for `url`: prefer existing, else Save Page Now. */
async function ensureSnapshot(url) {
  if (!FORCE) {
    const existing = await getExistingSnapshot(url);
    if (existing) return { archiveUrl: existing, fresh: false };
  }
  const saved = await savePageNow(url);
  if (saved) return { archiveUrl: saved, fresh: true };
  return null;
}

async function processEntry(file) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw, { engines: { yaml: yamlEngine } });
  const data = parsed.data;
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    return { changed: false, archived: 0, failed: 0 };
  }

  let changed = false;
  let archived = 0;
  let failed = 0;

  for (const src of data.sources) {
    if (!src || !src.url) continue;
    if (src.archive_url && !FORCE) continue;

    process.stdout.write(`   · ${src.url}\n`);
    const result = await ensureSnapshot(src.url);
    if (result) {
      src.archive_url = result.archiveUrl;
      changed = true;
      archived++;
      if (result.fresh) await sleep(SPN_DELAY_MS); // be polite after a capture
    } else {
      failed++;
      process.stdout.write(`     ! could not archive (left as-is)\n`);
    }
  }

  if (changed) {
    data.last_verified = today();
    const out = matter.stringify(parsed.content, data, { engines: { yaml: yamlEngine } });
    fs.writeFileSync(file, out, "utf8");
  }

  return { changed, archived, failed };
}

async function main() {
  if (typeof fetch !== "function") {
    console.error("This script needs Node 18+ (global fetch). Please upgrade Node.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(ENTRIES_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("INSTRUCTIONS"))
    .map((f) => path.join(ENTRIES_DIR, f));

  console.log(`Archiving sources for ${files.length} entries${FORCE ? " (--force)" : ""}…\n`);

  let totalArchived = 0;
  let totalFailed = 0;
  let touched = 0;

  for (const file of files) {
    const name = path.basename(file);
    const { changed, archived, failed } = await processEntry(file);
    if (archived || failed) console.log(` ${name}: +${archived} archived${failed ? `, ${failed} failed` : ""}`);
    if (changed) touched++;
    totalArchived += archived;
    totalFailed += failed;
  }

  console.log(`\nDone. ${totalArchived} sources archived across ${touched} entries.`);
  if (totalFailed) {
    console.log(`${totalFailed} sources could not be archived this run — re-run later to retry.`);
  }
  console.log("Review the frontmatter changes and commit them.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
