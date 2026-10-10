import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import { calculateBase, getRate } from "../../lib/adminPackages";
import {
  CALL_PACKAGES,
  INVISTIMO_WHATSAPP_PHONE,
  PACKAGES,
  RECORD_MAX,
  SEATING_ADDON_ILS,
  SEATING_FEATURES,
  applyRecordDraft,
  buildWhatsappMessage,
  buildWhatsappUrl,
  calculateQuote,
  clampRecords,
  commitRecordDraft,
  packageRate,
  servicePrice,
} from "../../lib/pricing/packageQuote";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const SAMPLE_RECORDS = [1, 27, 150, 350, 999, 1000];

test("messages pricing stays on the existing plan1 rate table for any whole quantity", () => {
  for (let records = 0; records <= RECORD_MAX; records += 1) {
    assert.equal(packageRate("messages", records), getRate("plan1", records));
    assert.equal(servicePrice("messages", records), calculateBase("plan1", records));
  }
});

test("call packages use the flat per-record prices", () => {
  assert.equal(packageRate("voice", 350), 1.6);
  assert.equal(packageRate("personal", 350), 2.2);
  assert.equal(packageRate("hybrid", 350), 1.9);

  for (const records of SAMPLE_RECORDS) {
    assert.equal(servicePrice("voice", records), Math.round((records * 16) / 10));
    assert.equal(servicePrice("personal", records), Math.round((records * 22) / 10));
    assert.equal(servicePrice("hybrid", records), Math.round((records * 19) / 10));
  }
});

test("hybrid example matches the requested 350-record quote", () => {
  const quote = calculateQuote({
    packageId: "hybrid",
    records: 350,
    seating: true,
  });

  assert.equal(quote.packageName, "Invistimo Hybrid");
  assert.equal(quote.serviceLabel, "2 סבבי שיחות מוקלטות + סבב שיחות אנושיות");
  assert.equal(quote.summaryService, "שיחות משולבות");
  assert.equal(quote.servicePrice, 665);
  assert.equal(quote.seatingPrice, 100);
  assert.equal(quote.total, 765);
  assert.equal(quote.canOrder, true);
  assert.equal(
    buildWhatsappMessage(quote),
    [
      "שלום, אני מעוניין/ת להזמין חבילה באינויסטימו.",
      "",
      "חבילה: Invistimo Hybrid",
      "כמות רשומות: 350",
      "סוג שירות: 2 סבבי שיחות מוקלטות + סבב שיחות אנושיות",
      "הושבה דיגיטלית: כן",
      "מחיר שירות: 665 ₪",
      "תוספת הושבה: 100 ₪",
      'סה"כ: 765 ₪',
      "",
      "אשמח לקבל פרטים ולהתקדם.",
    ].join("\n")
  );
});

test("seating is a one-time 100 shekel add-on and can be removed", () => {
  const withSeating = calculateQuote({
    packageId: "voice",
    records: 150,
    seating: true,
  });
  const withoutSeating = calculateQuote({
    packageId: "voice",
    records: 150,
    seating: false,
  });

  assert.equal(SEATING_ADDON_ILS, 100);
  assert.equal(withSeating.servicePrice, 240);
  assert.equal(withSeating.total, 340);
  assert.equal(withoutSeating.seatingPrice, 0);
  assert.equal(withoutSeating.total, 240);
  assert.match(buildWhatsappMessage(withoutSeating), /הושבה דיגיטלית: לא/);
  assert.doesNotMatch(buildWhatsappMessage(withoutSeating), /תוספת הושבה/);
});

test("zero records cannot be ordered and quantities stay inside 0–1000", () => {
  assert.equal(calculateQuote({ packageId: "personal", records: 0, seating: true }).canOrder, false);
  assert.equal(clampRecords(-4), 0);
  assert.equal(clampRecords(1001), 1000);
  assert.equal(clampRecords(27.9), 27);
  assert.equal(clampRecords(Number.NaN), 0);
  assert.equal(servicePrice("hybrid", 5000), servicePrice("hybrid", 1000));
});

test("manual entry does not reset an in-progress draft", () => {
  assert.deepEqual(applyRecordDraft(""), { text: "", records: null });
  assert.deepEqual(applyRecordDraft("3"), { text: "3", records: 3 });
  assert.deepEqual(applyRecordDraft("35"), { text: "35", records: 35 });
  assert.deepEqual(applyRecordDraft("350"), { text: "350", records: 350 });
  assert.deepEqual(applyRecordDraft("027"), { text: "027", records: 27 });
  assert.deepEqual(applyRecordDraft("1001"), { text: "1000", records: 1000 });
  assert.deepEqual(applyRecordDraft("abc999"), { text: "999", records: 999 });
  assert.equal(commitRecordDraft(""), 0);
  assert.equal(commitRecordDraft("027"), 27);
  assert.equal(commitRecordDraft("1000"), 1000);
});

test("whatsapp link uses the business number and url encoding", () => {
  const quote = calculateQuote({ packageId: "messages", records: 27, seating: false });
  const url = buildWhatsappUrl(quote);
  const expectedText = encodeURIComponent(buildWhatsappMessage(quote));

  assert.equal(url, `https://wa.me/${INVISTIMO_WHATSAPP_PHONE}?text=${expectedText}`);
  assert.equal(INVISTIMO_WHATSAPP_PHONE, "972555039072");
  assert.equal(decodeURIComponent(url.split("text=")[1]), buildWhatsappMessage(quote));
  assert.match(buildWhatsappMessage(quote), /Invistimo Messages/);
  assert.match(buildWhatsappMessage(quote), /כמות רשומות: 27/);
  assert.match(buildWhatsappMessage(quote), /הודעות בלבד/);
  assert.equal(quote.servicePrice, calculateBase("plan1", 27));
});

test("package copy stays on the right kind of service", () => {
  const blob = (id: keyof typeof PACKAGES) =>
    [
      PACKAGES[id].description,
      PACKAGES[id].serviceLabel,
      ...PACKAGES[id].rounds.flatMap((round) => [round.title, round.detail]),
      ...PACKAGES[id].features,
    ].join("\n");

  const voice = blob("voice");
  const personal = blob("personal");
  const hybrid = blob("hybrid");
  const messages = blob("messages");

  assert.doesNotMatch(voice, /אנושי|נציג|מוקד/);
  assert.match(voice, /סבב ראשון: שיחות מוקלטות/);
  assert.match(voice, /סבב שני: שיחות מוקלטות/);
  assert.match(voice, /סבב שלישי: שיחות מוקלטות/);

  assert.doesNotMatch(personal, /מוקלט/);
  assert.match(personal, /סבב ראשון: שיחה אנושית/);
  assert.match(personal, /סבב שלישי: שיחה אנושית/);
  assert.match(personal, /נציגים אנושיים/);

  assert.match(hybrid, /סבב ראשון: שיחות מוקלטות/);
  assert.match(hybrid, /סבב שני: שיחות מוקלטות/);
  assert.match(hybrid, /סבב שלישי: שיחות אנושיות/);
  assert.doesNotMatch(hybrid, /סבב שלישי: שיחות מוקלטות/);
  assert.doesNotMatch(hybrid, /שלושה סבבי שיחות קוליות/);

  assert.match(messages, /2 סבבי הודעות/);
  assert.match(messages, /דשבורד/);
  assert.match(messages, /קישור אישי/);
  assert.doesNotMatch(messages, /מוקלט|אנושי|נציג|מוקד/);

  for (const id of ["messages", "voice", "personal", "hybrid"] as const) {
    assert.match(blob(id), /ניהול רשימת מוזמנים/);
    assert.match(blob(id), /תזכורת ב-SMS/);
  }

  assert.deepEqual(CALL_PACKAGES, ["voice", "personal", "hybrid"]);
});

test("digital seating copy is the real system and not a venue crew", () => {
  const seating = SEATING_FEATURES.join("\n");
  assert.match(seating, /ניהול שולחנות/);
  assert.match(seating, /שיוך אורחים/);
  assert.match(seating, /מקומות הפנויים/);
  assert.match(seating, /תרשים אולם/);
  assert.doesNotMatch(seating, /דייל|צוות|באולם ביום/);
});

test("pricing page sends guests to WhatsApp and keeps the existing heading words apart", () => {
  const page = read("app/pricing/page.tsx");

  assert.match(page, /בחרו את החבילה שמתאימה לאירוע שלכם/);
  assert.doesNotMatch(page, /שמתאימה\s*<br/);
  assert.match(page, /כמה רשומות מוזמנים יש לכם\?/);
  assert.match(page, /איך תרצו לנהל את אישורי ההגעה\?/);
  assert.match(page, /רוצים גם לנהל את סידורי ההושבה\?/);
  assert.match(page, /הוספת מערכת הושבה דיגיטלית/);
  assert.match(page, /אני רוצה את החבילה/);
  assert.match(page, /החבילה שלכם/);
  assert.match(page, /GuestRecordSlider/);
  assert.match(page, /buildWhatsappUrl/);
  assert.match(page, /WeddingChallengesPurchaseCard/);
  assert.doesNotMatch(page, /המשך לתשלום/);
  assert.doesNotMatch(page, /\/register/);
  assert.doesNotMatch(page, /useRouter/);
});
