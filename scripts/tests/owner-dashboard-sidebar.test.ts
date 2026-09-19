import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("owner sidebar lists real couple actions and not admin pages", () => {
  const sidebar = read("app/dashboard/components/DashboardSidebar.tsx");
  const page = read("app/dashboard/page.tsx");
  const header = read("app/dashboard/DashboardHeader.tsx");
  const layout = read("app/dashboard/layout.tsx");

  for (const label of [
    "דשבורד",
    "פרטי האירוע",
    "ההזמנה",
    "צפייה בהזמנה",
    "רשימת מוזמנים",
    "ייבוא מוזמנים מאקסל",
    "אישורי הגעה",
    "שליחת הודעות",
    "סבבי אישורי הגעה",
    "סידורי הושבה",
    "כניסה לאירוע",
  ]) {
    assert.match(sidebar, new RegExp(label));
  }

  for (const label of [
    "אתר חתונה",
    "הודעות מהאורחים",
    "קישור למתנות באשראי",
    "ניהול אירוע",
    "ניהול הסעות",
    "ניהול Wedding Challenges",
  ]) {
    assert.match(sidebar, new RegExp(label));
  }

  assert.match(sidebar, /שירותים נוספים/);
  assert.match(sidebar, /hidden: !canCheckIn/);
  assert.match(sidebar, /hidden: !canCallRounds/);
  assert.match(sidebar, /\?action=import/);
  assert.match(sidebar, /\?action=calls/);
  assert.doesNotMatch(sidebar, /צוות והרשאות/);
  assert.doesNotMatch(sidebar, /label: "דוחות"/);
  assert.doesNotMatch(sidebar, /\/dashboard\/reports/);
  assert.doesNotMatch(sidebar, /\/dashboard\/team/);
  assert.doesNotMatch(sidebar, /\/admin\//);

  assert.match(page, /searchParams.get\("action"\)/);
  assert.match(page, /setShowImportModal\(true\)/);
  assert.match(page, /setOpenRsvpSchedule\(true\)/);
  assert.doesNotMatch(page, /function GoldenActionButtons/);
  assert.doesNotMatch(page, /<GoldenActionButtons/);
  assert.doesNotMatch(page, /label="שליחת הודעות"/);
  assert.doesNotMatch(page, /label=\{invitation \? "הזמנה"/);

  assert.doesNotMatch(header, /שליחת הודעות/);
  assert.doesNotMatch(header, /\/dashboard\/edit-invite/);
  assert.doesNotMatch(header, /\/dashboard\/messages/);
  assert.doesNotMatch(header, /router\.push\("\/dashboard\/seating"\)/);
  assert.match(layout, /<DashboardSidebar/);
  assert.match(layout, /invitationShareId=\{invitation\?\.shareId\}/);
});

test("dashboard stats stay on one wide desktop row and hide the check-in banner", () => {
  const page = read("app/dashboard/page.tsx");

  assert.doesNotMatch(page, /Invistimo Check-in/);
  assert.doesNotMatch(page, /הפעלה לכל אירוע בנפרד/);
  assert.doesNotMatch(page, /userCanManageCheckIn/);
  assert.doesNotMatch(page, /checkInToggleBusy/);
  assert.match(page, /id="rsvp-stats"/);
  assert.match(page, /2xl:grid-cols-7/);
  assert.match(page, /lg:grid-cols-4/);
  assert.match(page, /md:grid-cols-3/);
  assert.match(page, /grid-cols-2/);
  assert.match(page, /title="פתחו קישור"/);
  assert.match(page, /title="לא פתחו קישור"/);
  assert.match(page, /function GoldenStatCard/);
  assert.doesNotMatch(page, /<GoldenStatusBarsCard/);
  assert.doesNotMatch(page, /<GoldenDonutCard/);
  assert.match(page, /max-w-\[340px\]/);
  assert.match(page, /max-h-\[170px\]/);
});
