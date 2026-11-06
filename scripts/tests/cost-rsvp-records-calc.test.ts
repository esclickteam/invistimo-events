import assert from "node:assert/strict";
import { test } from "node:test";
import { computeRecordsQuota } from "../../app/(marketing)/info/guides/cost-rsvp-wedding/calcLogic";
import { PACKAGE_PRICE_EXAMPLES } from "../../app/(marketing)/info/guides/cost-rsvp-wedding/priceExamples";
import { SEATING_ADDON_ILS, addonPrice, packageRate, servicePrice } from "../../lib/pricing/packageQuote";

test("300 with phone + 50 without = 300 billable", () => {
  const r = computeRecordsQuota({
    withPhoneRecords: 300,
    withoutPhoneRecords: 50,
    totalGuests: 450,
  });
  assert.equal(r.totalRecords, 350);
  assert.equal(r.billableRecords, 300);
  assert.equal(r.nonBillableRecords, 50);
  assert.equal(r.totalGuests, 450);
  assert.equal(r.warnings.length, 0);
});

test("total guests does not affect billable quota", () => {
  const r = computeRecordsQuota({
    withPhoneRecords: 100,
    withoutPhoneRecords: 20,
    totalGuests: 9999,
  });
  assert.equal(r.billableRecords, 100);
  assert.equal(r.totalRecords, 120);
});

test("warns when total guests is below total records", () => {
  const r = computeRecordsQuota({
    withPhoneRecords: 10,
    withoutPhoneRecords: 5,
    totalGuests: 3,
  });
  assert.equal(r.billableRecords, 10);
  assert.ok(r.warnings.length >= 1);
});

test("null total guests hides guest result and skips warning", () => {
  const r = computeRecordsQuota({
    withPhoneRecords: 10,
    withoutPhoneRecords: 5,
    totalGuests: null,
  });
  assert.equal(r.totalGuests, null);
  assert.equal(r.warnings.length, 0);
});

test("empty and invalid inputs stay non-negative", () => {
  const r = computeRecordsQuota({
    withPhoneRecords: Number.NaN as unknown as number,
    withoutPhoneRecords: -3,
    totalGuests: null,
  });
  assert.equal(r.totalRecords, 0);
  assert.equal(r.billableRecords, 0);
});

test("the guide price table uses the public calculator, without add-ons", () => {
  const messages = PACKAGE_PRICE_EXAMPLES.rows[0];
  assert.equal(messages[0], "הודעות");
  assert.equal(messages[1], `${servicePrice("messages", 200).toLocaleString("he-IL")} ₪`);
  assert.equal(messages[2], `${servicePrice("messages", 350).toLocaleString("he-IL")} ₪`);
  assert.equal(messages[3], `${servicePrice("messages", 500).toLocaleString("he-IL")} ₪`);
  assert.equal(PACKAGE_PRICE_EXAMPLES.rows[1][1], `${servicePrice("voice", 200).toLocaleString("he-IL")} ₪`);
  assert.equal(PACKAGE_PRICE_EXAMPLES.rows[3][3], `${servicePrice("personal", 500).toLocaleString("he-IL")} ₪`);
  assert.match(PACKAGE_PRICE_EXAMPLES.caption, /כל המחירים כוללים מע״מ/);
  assert.equal(servicePrice("messages", 200), 220);
  assert.equal(servicePrice("messages", 350), 364);
  assert.equal(servicePrice("messages", 500), 490);
  assert.equal(servicePrice("voice", 200), 320);
  assert.equal(servicePrice("hybrid", 350), 665);
  assert.equal(servicePrice("personal", 500), 1100);
  assert.equal(packageRate("voice", 200), 1.6);
  assert.equal(packageRate("hybrid", 200), 1.9);
  assert.equal(packageRate("personal", 200), 2.2);
  assert.equal(SEATING_ADDON_ILS, 100);
  assert.equal(addonPrice("messages", "seating"), 100);
  assert.equal(addonPrice("voice", "seating"), 100);
});
