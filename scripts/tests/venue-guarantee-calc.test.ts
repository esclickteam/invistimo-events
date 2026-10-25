import assert from "node:assert/strict";
import { test } from "node:test";
import { computeGuarantee } from "../../app/(marketing)/info/guides/wedding-venue-guest-guarantee/calcLogic";

test("400 invited default planning path", () => {
  const r = computeGuarantee({
    totalInvited: 400,
    almostCertain: 0,
    otherArrivalRatePct: 70,
    confirmed: 0,
    confirmedArrivalRatePct: 90,
    pending: 0,
    venueMinCommitment: 240,
    reserveMeals: 0,
    venueCapacity: 0,
    mealPrice: 0,
  });
  assert.equal(r.initialEstimate, 280);
  assert.equal(r.negotiationExample, 240);
  assert.equal(r.gapVenueVsInitial, -40);
});

test("does not double-apply 70% and 90% on confirmed", () => {
  const r = computeGuarantee({
    totalInvited: 400,
    almostCertain: 0,
    otherArrivalRatePct: 70,
    confirmed: 300,
    confirmedArrivalRatePct: 90,
    pending: 100,
    venueMinCommitment: 240,
    reserveMeals: 10,
    venueCapacity: 0,
    mealPrice: 320,
  });
  assert.equal(r.confirmedExpected, 270);
  // pending mid = 50; mid = 270 + 50
  assert.equal(r.updatedEstimateMid, 320);
  assert.equal(r.updatedEstimateLow, 270);
  assert.equal(r.updatedEstimateHigh, 370);
  // 70% must not be reapplied to the 300 confirmed in updated estimate
  assert.notEqual(r.updatedEstimateMid, Math.round(300 * 0.7 * 0.9));
});

test("partitions overlapping certain/confirmed/pending without double count", () => {
  const r = computeGuarantee({
    totalInvited: 100,
    almostCertain: 60,
    otherArrivalRatePct: 70,
    confirmed: 60,
    confirmedArrivalRatePct: 90,
    pending: 60,
    venueMinCommitment: 80,
    reserveMeals: 0,
    venueCapacity: 90,
    mealPrice: 0,
  });
  assert.equal(r.certain + r.confirmed + r.pending, 100);
  assert.ok(r.warnings.some((w) => w.includes("כפילויות") || w.includes("גדול ממספר")));
  assert.equal(r.overCapacity, true);
});

test("scenarios 100 / 250 / 600", () => {
  for (const n of [100, 250, 600]) {
    const r = computeGuarantee({
      totalInvited: n,
      almostCertain: 0,
      otherArrivalRatePct: 70,
      confirmed: 0,
      confirmedArrivalRatePct: 90,
      pending: 0,
      venueMinCommitment: Math.round(n * 0.6),
      reserveMeals: 5,
      venueCapacity: 0,
      mealPrice: 0,
    });
    assert.equal(r.initialEstimate, Math.round(n * 0.7));
    assert.equal(r.negotiationExample, Math.round(n * 0.6));
    assert.ok(r.withReserve >= r.venueMin);
  }
});

test("meal unused cost only when venue min above estimate", () => {
  const r = computeGuarantee({
    totalInvited: 200,
    almostCertain: 0,
    otherArrivalRatePct: 70,
    confirmed: 0,
    confirmedArrivalRatePct: 90,
    pending: 0,
    venueMinCommitment: 180,
    reserveMeals: 0,
    venueCapacity: 0,
    mealPrice: 300,
  });
  // initial 140, gap 40 → 12000
  assert.equal(r.unusedMealCostVsInitial, 12000);
});
