// ============================================================================
// backfill-added.js — one-time (re-runnable) script to populate the `added`
// field on every _meta/{slug}.json from its git first-add commit date.
//
// Usage:
//   node scripts/backfill-added.js           # fills only missing `added` fields
//   node scripts/backfill-added.js --force   # overwrites all existing values
//
// Algorithm per file:
//   git log --diff-filter=A --follow --format=%aI -- <path>
//   The LAST line (tail) is the original add commit (oldest). Take YYYY-MM-DD.
//   Fallback if not in git: file mtime (warns). Last resort: today (warns).
//
// Idempotent: skips files that already have `added` unless --force is passed.
// Preserves existing JSON key order; inserts `added` after `date` if present.
// ============================================================================

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const META_DIR = path.join(__dirname, "../src/entries/_meta");
const REPO_ROOT = path.join(__dirname, "..");
const force = process.argv.includes("--force");

const files = fs.readdirSync(META_DIR).filter(f => f.endsWith(".json")).sort();

let updated = 0;
let skipped = 0;
let warned = 0;

for (const file of files) {
  const filePath = path.join(META_DIR, file);
  const meta = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (meta.added && !force) {
    skipped++;
    continue;
  }

  let added = null;

  // 1. Try git first-add date
  try {
    const out = execSync(
      `git log --diff-filter=A --follow --format=%aI -- "${filePath}"`,
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    const lines = out.split("\n").filter(Boolean);
    if (lines.length > 0) {
      // Last line = the original add commit (git log returns newest-first)
      added = lines[lines.length - 1].slice(0, 10); // YYYY-MM-DD
    }
  } catch (_) {
    // git unavailable or errored — fall through to mtime
  }

  // 2. Fallback: file mtime
  if (!added) {
    try {
      const stat = fs.statSync(filePath);
      added = stat.mtime.toISOString().slice(0, 10);
      console.warn(`[backfill] WARN: no git history for ${file} — using mtime: ${added}`);
      warned++;
    } catch (_) {
      added = new Date().toISOString().slice(0, 10);
      console.warn(`[backfill] WARN: no git history or mtime for ${file} — using today: ${added}`);
      warned++;
    }
  }

  // Reconstruct object with `added` inserted after `date` for logical ordering
  const newMeta = {};
  let insertedAdded = false;
  for (const key of Object.keys(meta)) {
    newMeta[key] = meta[key];
    if (key === "date" && !insertedAdded) {
      newMeta.added = added;
      insertedAdded = true;
    }
  }
  if (!insertedAdded) {
    // No `date` key found — append at end
    newMeta.added = added;
  }

  fs.writeFileSync(filePath, JSON.stringify(newMeta, null, 2) + "\n");
  console.log(`[backfill] ${file}: added = ${added}${force && meta.added ? " (was: " + meta.added + ")" : ""}`);
  updated++;
}

console.log(`\n[backfill] Done. Updated: ${updated}, Skipped (already set): ${skipped}, Warnings: ${warned}`);
