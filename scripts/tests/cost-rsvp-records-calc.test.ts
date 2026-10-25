import assert from "node:assert/strict";
import { test } from "node:test";
import { computeRecordsQuota } from "../../app/(marketing)/info/guides/cost-rsvp-wedding/calcLogic";

test("250 with phone + 30 without = 250 billable", () => {
  const r = computeRecordsQuota({
    withPhoneRecords: 250,
    withoutPhoneRecords: 30,
    peopleWithPhone: 320,
    peopleWithoutPhone: 45,
  });
  assert.equal(r.totalRecords, 280);
  assert.equal(r.billableRecords, 250);
  assert.equal(r.nonBillableRecords, 30);
  assert.equal(r.totalPeople, 365);
});

test("people count does not become record count", () => {
  const r = computeRecordsQuota({
    withPhoneRecords: 1,
    withoutPhoneRecords: 0,
    peopleWithPhone: 5,
    peopleWithoutPhone: 0,
  });
  assert.equal(r.billableRecords, 1);
  assert.equal(r.totalPeople, 5);
});

test("empty and invalid inputs stay non-negative", () => {
  const r = computeRecordsQuota({
    withPhoneRecords: Number.NaN as unknown as number,
    withoutPhoneRecords: -3,
    peopleWithPhone: 0,
    peopleWithoutPhone: 0,
  });
  assert.equal(r.totalRecords, 0);
  assert.equal(r.billableRecords, 0);
});
