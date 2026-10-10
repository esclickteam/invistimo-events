import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import { calculateBase, getRate } from "../../lib/adminPackages";
import {
  ADDON_LABELS,
  CALL_PACKAGES,
  EMPTY_ADDONS,
  INVISTIMO_WHATSAPP_PHONE,
  PACKAGES,
  RECORD_MAX,
  SEATING_ADDON_ILS,
  addonPrice,
  applyRecordDraft,
  buildWhatsappMessage,
  buildWhatsappUrl,
  calculateQuote,
  clampRecords,
  commitRecordDraft,
  packageRate,
  servicePrice,
  type SelectedAddons,
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

function withAddons(selected: Partial<SelectedAddons>): SelectedAddons {
  return { ...EMPTY_ADDONS, ...selected };
}

test("hybrid example matches the requested 350-record quote", () => {
  const quote = calculateQuote({
    packageId: "hybrid",
    records: 350,
    addons: withAddons({ seating: true }),
  });

  assert.equal(quote.packageName, "Invistimo Hybrid");
  assert.equal(quote.serviceLabel, "2 סבבי שיחות מוקלטות + סבב אחד אנושי");
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
      "סוג שירות: 2 סבבי שיחות מוקלטות + סבב אחד אנושי",
      "מתנות באשראי דרך ספק חיצוני: לא",
      "הושבה דיגיטלית: כן",
      "מערכת עצמאית לניהול ומעקב אירוע: לא",
      "עיצוב הזמנה בהתאמה אישית: לא",
      "מחיר שירות: 665 ₪",
      "תוספת הושבה: 100 ₪",
      'סה"כ: 765 ₪',
      "",
      "אשמח לקבל פרטים ולהתקדם.",
    ].join("\n")
  );
});

test("original add-ons keep their prices and seating stays 100 on every package", () => {
  assert.equal(SEATING_ADDON_ILS, 100);
  assert.equal(addonPrice("messages", "seating"), 100);
  assert.equal(addonPrice("voice", "seating"), 100);
  assert.equal(addonPrice("personal", "seating"), 100);
  assert.equal(addonPrice("hybrid", "seating"), 100);

  assert.equal(addonPrice("messages", "credit"), 150);
  assert.equal(addonPrice("messages", "system"), 200);
  assert.equal(addonPrice("messages", "design"), 200);

  for (const packageId of ["voice", "personal", "hybrid"] as const) {
    assert.equal(addonPrice(packageId, "credit"), 100);
    assert.equal(addonPrice(packageId, "system"), 150);
    assert.equal(addonPrice(packageId, "design"), 150);
  }

  const quote = calculateQuote({
    packageId: "personal",
    records: 100,
    addons: withAddons({ credit: true, seating: true, system: true, design: true }),
  });

  assert.equal(quote.servicePrice, 220);
  assert.equal(quote.addonTotal, 100 + 100 + 150 + 150);
  assert.equal(quote.total, 720);
  const message = buildWhatsappMessage(quote);
  assert.match(message, /מתנות באשראי דרך ספק חיצוני: כן/);
  assert.match(message, /הושבה דיגיטלית: כן/);
  assert.match(message, /מערכת עצמאית לניהול ומעקב אירוע: כן/);
  assert.match(message, /עיצוב הזמנה בהתאמה אישית: כן/);
  assert.match(message, /תוספת הושבה: 100 ₪/);
  assert.match(message, /מתנות באשראי דרך ספק חיצוני: 100 ₪/);
  assert.match(message, /מערכת עצמאית לניהול ומעקב אירוע: 150 ₪/);
  assert.match(message, /עיצוב הזמנה בהתאמה אישית: 150 ₪/);
  assert.match(message, /סה"כ: 720 ₪/);
});

test("unselected add-ons stay out of the total", () => {
  const without = calculateQuote({
    packageId: "voice",
    records: 150,
    addons: EMPTY_ADDONS,
  });

  assert.equal(without.servicePrice, 240);
  assert.equal(without.seatingPrice, 0);
  assert.equal(without.addonTotal, 0);
  assert.equal(without.total, 240);
  assert.match(buildWhatsappMessage(without), /הושבה דיגיטלית: לא/);
  assert.doesNotMatch(buildWhatsappMessage(without), /תוספת הושבה/);
});

test("zero records cannot be ordered and quantities stay inside 0–1000", () => {
  assert.equal(
    calculateQuote({
      packageId: "personal",
      records: 0,
      addons: withAddons({ seating: true }),
    }).canOrder,
    false
  );
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
  const quote = calculateQuote({ packageId: "messages", records: 27, addons: EMPTY_ADDONS });
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

test("package copy keeps the original included services and a single call line", () => {
  const originalShared = [
    "הזמנה דיגיטלית מלאה",
    "שליחה ב-2 סבבי WhatsApp אוטומטיים לאישור הגעה",
    "תזכורת ב-SMS לקראת האירוע + מספר שולחן",
    "הודעת תודה לאחר האירוע ב-SMS",
  ];

  assert.deepEqual(PACKAGES.messages.features, originalShared);
  assert.equal(PACKAGES.messages.description, "הבסיס המושלם להזמנה דיגיטלית ואישורי הגעה");
  assert.equal(PACKAGES.voice.callLine, "3 סבבי שיחות מוקלטות.");
  assert.equal(PACKAGES.personal.callLine, "3 סבבי שיחות במוקד אנושי.");
  assert.equal(PACKAGES.hybrid.callLine, "2 סבבי שיחות מוקלטות + סבב אחד אנושי.");

  for (const id of ["voice", "personal", "hybrid"] as const) {
    assert.deepEqual(PACKAGES[id].features.slice(0, 4), originalShared);
    assert.equal(PACKAGES[id].features[4], PACKAGES[id].callLine);
    assert.equal(PACKAGES[id].features[5], "תיעוד ועדכון סטטוסים בזמן אמת");
    assert.equal(PACKAGES[id].description, PACKAGES[id].callLine);
    assert.equal(PACKAGES[id].features.length, 6);
  }

  const voice = PACKAGES.voice.features.join("\n");
  const personal = PACKAGES.personal.features.join("\n");
  assert.doesNotMatch(voice, /אנושי|נציג|מוקד|סבב ראשון|סבב שני|סבב שלישי/);
  assert.doesNotMatch(personal, /מוקלט|סבב ראשון|סבב שני|סבב שלישי/);
  assert.doesNotMatch(PACKAGES.messages.features.join("\n"), /מוקלט|אנושי|נציג|מוקד/);
  assert.deepEqual(CALL_PACKAGES, ["voice", "personal", "hybrid"]);
});

test("pricing page restores the original add-ons and drops Wedding Challenges", () => {
  const page = read("app/pricing/page.tsx");

  assert.match(page, /בחרו את החבילה שמתאימה לאירוע שלכם/);
  assert.doesNotMatch(page, /שמתאימה\s*<br/);
  assert.match(page, /כמה רשומות מוזמנים יש לכם\?/);
  assert.match(page, /איך תרצו לנהל את אישורי ההגעה\?/);
  assert.match(page, /תוספות אפשריות/);
  assert.match(page, /אני רוצה את החבילה/);
  assert.match(page, /החבילה שלכם/);
  assert.match(page, /GuestRecordSlider/);
  assert.match(page, /buildWhatsappUrl/);
  assert.match(page, /ADDON_ORDER/);
  assert.match(page, /ADDON_LABELS/);
  assert.deepEqual(Object.values(ADDON_LABELS), [
    "מתנות באשראי דרך ספק חיצוני",
    "הושבה דיגיטלית",
    "מערכת עצמאית לניהול ומעקב אירוע",
    "עיצוב הזמנה בהתאמה אישית",
  ]);
  assert.doesNotMatch(page, /WeddingChallengesPurchaseCard/);
  assert.doesNotMatch(page, /סבב ראשון/);
  assert.doesNotMatch(page, /המשך לתשלום/);
  assert.doesNotMatch(page, /\/register/);
  assert.doesNotMatch(page, /useRouter/);
});
