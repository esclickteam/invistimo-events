#!/usr/bin/env node
/**
 * CI guard: Venue-touching PRs must not change protected regular-core paths
 * without an explicit allowlist entry.
 *
 * Usage:
 *   node scripts/ci/venue-pr-protected-core-guard.mjs
 *   BASE_REF=origin/main node scripts/ci/venue-pr-protected-core-guard.mjs
 *
 * Exit 1 if protected core changed without allowlist.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_REF || "origin/main";

const PROTECTED_GLOBS = [
  /^lib\/getUserIdFromRequest\.ts$/,
  /^app\/api\/me\//,
  /^app\/api\/events(\/|$)/,
  /^app\/api\/invitations(\/|$)/,
  /^app\/api\/guests(\/|$)/,
  /^app\/api\/seating(\/|$)/,
  /^models\/Event\.ts$/,
  /^models\/Invitation\.ts$/,
  /^models\/InvitationGuest\.ts$/,
  /^models\/User\.ts$/,
  /^app\/dashboard(\/|$)/,
  /^app\/invite(\/|$)/,
  /^app\/components\/EventDashboard(\/|$)/,
  /^middleware\.ts$/,
  /^lib\/auth(\/|$)/,
];

const VENUE_SIGNAL =
  /(^app\/venues\/|^app\/api\/venues\/|^lib\/venues\/|^models\/Venue|^docs\/venues|^scripts\/(staging|ci|tests)\/.*venue)/i;

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: root }).trim();
}

function changedFiles() {
  try {
    sh(`git rev-parse --verify ${baseRef}`);
  } catch {
    console.log(`Base ref ${baseRef} missing — skipping guard`);
    return [];
  }
  const out = sh(`git diff --name-only ${baseRef}...HEAD`);
  return out ? out.split("\n").filter(Boolean) : [];
}

function isProtected(file) {
  return PROTECTED_GLOBS.some((re) => re.test(file));
}

function isVenueSignal(file) {
  return VENUE_SIGNAL.test(file);
}

function readAllowlist() {
  const p = path.join(root, "scripts/ci/venue-protected-core-allowlist.txt");
  if (!fs.existsSync(p)) return new Set();
  return new Set(
    fs
      .readFileSync(p, "utf8")
      .split("\n")
      .map((l) => l.replace(/#.*$/, "").trim())
      .filter(Boolean)
  );
}

const files = changedFiles();
const venueTouched = files.some(isVenueSignal);
const allow = readAllowlist();

const protectedHits = files.filter(isProtected);
const unapproved = protectedHits.filter((f) => !allow.has(f));

console.log(
  JSON.stringify(
    {
      baseRef,
      changed: files.length,
      venueTouched,
      protectedHits,
      unapprovedProtectedCore: unapproved,
      allowlistSize: allow.size,
    },
    null,
    2
  )
);

if (!venueTouched) {
  console.log("No Venue signal in diff — guard OK");
  process.exit(0);
}

if (unapproved.length) {
  console.error("\nVENUE SAFETY CONTRACT VIOLATION");
  console.error("Protected core files changed without allowlist:");
  for (const f of unapproved) console.error(" -", f);
  console.error(
    "\nSee docs/venues-safety-contract.md. Add path to scripts/ci/venue-protected-core-allowlist.txt only with explicit human approval."
  );
  process.exit(1);
}

console.log("Venue PR protected-core guard PASS");
process.exit(0);
