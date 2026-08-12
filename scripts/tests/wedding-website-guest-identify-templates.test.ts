/**
 * Every live template must expose guest phone/name identify RSVP.
 * Run: npx tsx scripts/tests/wedding-website-guest-identify-templates.test.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "components/wedding-website/templates");
const files = fs.readdirSync(ROOT).filter((f) => f.endsWith("Site.tsx"));

if (files.length < 8) {
  throw new Error(`Expected multiple template files, found ${files.length}`);
}

let failed = 0;
for (const file of files) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  const usesSharedBlock = src.includes("RsvpBlock");
  const usesIdentify = src.includes("GuestIdentifyRsvp");
  const ok = usesSharedBlock || usesIdentify;
  console.log(`${ok ? "PASS" : "FAIL"} ${file} shared=${usesSharedBlock} identify=${usesIdentify}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} template(s) missing guest identify RSVP`);
  process.exit(1);
}

console.log("\nAll templates expose guest identify RSVP.");
