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
    "הזמנה",
    "צפייה בהזמנה",
    "פרטי האירוע",
    "רשימת מוזמנים",
    "שליחת הודעות",
    "סידורי הושבה",
    "לו״ז אישורי הגעה",
    "כניסה לאירוע",
  ]) {
    assert.match(sidebar, new RegExp(label));
  }

  const seatingIdx = sidebar.indexOf('label: "סידורי הושבה"');
  const callsIdx = sidebar.indexOf('label: "לו״ז אישורי הגעה"');
  assert.ok(seatingIdx >= 0 && callsIdx >= 0);
  assert.ok(seatingIdx < callsIdx);

  assert.doesNotMatch(sidebar, /ייבוא מוזמנים מאקסל/);
  assert.doesNotMatch(sidebar, /הוספת מוזמן/);
  assert.doesNotMatch(sidebar, /label: "אישורי הגעה"/);
  assert.doesNotMatch(sidebar, /סבבי אישורי הגעה/);
  assert.doesNotMatch(sidebar, /action=add-guest/);
  assert.doesNotMatch(sidebar, /action=import/);

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
  assert.match(sidebar, /eventLive && userCanAccessCheckIn/);
  assert.doesNotMatch(sidebar, /checkInEnabled && userCanAccessCheckIn/);
  assert.match(sidebar, /hidden: !canCallRounds/);
  assert.doesNotMatch(sidebar, /action=add-guest/);
  assert.match(sidebar, /\?action=calls/);
  assert.doesNotMatch(sidebar, /צוות והרשאות/);
  assert.doesNotMatch(sidebar, /label: "דוחות"/);
  assert.doesNotMatch(sidebar, /\/dashboard\/reports/);
  assert.doesNotMatch(sidebar, /\/dashboard\/team/);
  assert.doesNotMatch(sidebar, /\/admin\//);

  const controls = read("app/components/GuestsControls.tsx");
  assert.match(page, /searchParams.get\("action"\)/);
  assert.match(page, /onAddGuest=\{\(\) => setAddGuestChooserOpen\(true\)\}/);
  assert.match(page, /AddGuestChooserModal/);
  assert.match(controls, /\+ הוספת מוזמן/);
  assert.match(page, /setShowImportModal\(true\)/);
  assert.match(page, /setOpenAddModal\(true\)/);
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
  assert.match(layout, /lg:pr-\[240px\]/);
  assert.match(layout, /lg:pr-\[72px\]/);
  assert.match(sidebar, /fixed top-0 right-0/);
  assert.match(sidebar, /h-\[100vh\]/);
  assert.doesNotMatch(sidebar, /top-16/);
});

test("dashboard uses five RSVP cards then three equal content cards", () => {
  const page = read("app/dashboard/page.tsx");

  assert.doesNotMatch(page, /Invistimo Check-in/);
  assert.doesNotMatch(page, /הפעלה לכל אירוע בנפרד/);
  assert.doesNotMatch(page, /userCanManageCheckIn/);
  assert.doesNotMatch(page, /checkInToggleBusy/);
  assert.match(page, /id="rsvp-stats"/);
  assert.match(page, /lg:grid-cols-5/);
  assert.match(page, /title="סה״כ מוזמנים"/);
  assert.match(page, /title="מגיעים"/);
  assert.match(page, /title="לא מגיעים"/);
  assert.match(page, /title="מתלבטים"/);
  assert.match(page, /title="לא ענו"/);
  assert.doesNotMatch(page, /title="פתחו קישור"/);
  assert.doesNotMatch(page, /title="לא פתחו קישור"/);
  assert.doesNotMatch(page, /2xl:grid-cols-7/);
  assert.match(page, /function GoldenStatCard/);
  assert.match(page, /function GoldenLinkViewsCard/);
  assert.match(page, /צפייה בקישור האישי/);
  assert.match(page, /צפו בקישור/);
  assert.match(page, /לא צפו בקישור/);
  assert.match(page, /lg:grid-cols-3/);
  assert.match(page, /h-\[400px\]/);
  assert.doesNotMatch(page, /min-h-\[380px\]/);
  assert.doesNotMatch(page, /h-full min-h-/);
  assert.match(page, /overflow-y-auto/);
  assert.match(page, /\.sort\(\(a, b\) => b\.timestamp - a\.timestamp\)/);
  assert.doesNotMatch(page, /\.slice\(0, 20\)/);
  assert.doesNotMatch(page, /<GoldenStatusBarsCard/);
  assert.doesNotMatch(page, /<GoldenDonutCard/);
  assert.doesNotMatch(page, /max-h-\[170px\]/);
});
