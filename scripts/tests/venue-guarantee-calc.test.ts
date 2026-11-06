import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BUILTIN_GROUPS,
  DEFAULT_COUNTS,
  CUSTOM_DEFAULT_BAND,
  computeArrival,
  decodeArrivalQuery,
  distributeByDefaultMix,
  encodeArrivalQuery,
  groupsForCalculation,
  illustrateChairs,
  mapKnownGroupName,
  type ArrivalInputs,
  type GroupInput,
} from "../../app/(marketing)/info/guides/wedding-venue-guest-guarantee/calcLogic";
import { summarizeArrivalRows, weekdayAndSeason } from "../../lib/planning/arrivalSnapshot";

function group(partial: Partial<GroupInput> & Pick<GroupInput, "count">): GroupInput {
  return {
    id: partial.id || "closeFamily",
    label: partial.label || "משפחה קרובה",
    count: partial.count,
    lowPct: partial.lowPct ?? 90,
    midPct: partial.midPct ?? 96,
    highPct: partial.highPct ?? 99,
  };
}

function input(overrides: Partial<ArrivalInputs> = {}): ArrivalInputs {
  return {
    groups: [group({ count: 0 })],
    weekday: "",
    season: "",
    distance: "",
    confirmed: 0,
    declined: 0,
    pending: 0,
    undecided: 0,
    showUpPct: 96,
    pendingBand: { low: 20, mid: 45, high: 70 },
    undecidedBand: { low: 32, mid: 52, high: 72 },
    venueMin: null,
    capacity: null,
    reserveMeals: 0,
    mealPrice: null,
    extraMealPrice: null,
    ...overrides,
  };
}

function chairPeople(result: ReturnType<typeof computeArrival>) {
  const chairs = result.chairs;
  return chairs.confirmed + chairs.high + chairs.undecided + chairs.low;
}

test("zero guests stays a planning range without a contract", () => {
  const result = computeArrival(input());
  assert.equal(result.totalInvited, 0);
  assert.equal(result.rangeMid, 0);
  assert.equal(result.rangeLow, 0);
  assert.equal(result.rangeHigh, 0);
  assert.equal(result.recommendedPortions, 0);
  assert.equal(result.contractMissing, true);
  assert.equal(result.unusedMeals, null);
  assert.equal(result.chairs.commitment, 0);
  assert.equal(illustrateChairs(result.chairs, 10).tables.length, 1);
});

test("10, 100 and close-family bands stay inside the invited count", () => {
  const ten = computeArrival(input({ groups: [group({ count: 10 })] }));
  assert.equal(ten.rangeLow, 9);
  assert.equal(ten.rangeMid, 10);
  assert.equal(ten.rangeHigh, 10);
  assert.equal(ten.confirmedReceived, 0);
  assert.equal(chairPeople(ten), ten.rangeMid);

  const hundred = computeArrival(
    input({
      groups: [group({ id: "acquaintances", label: "חברים ומכרים", count: 100, lowPct: 40, midPct: 58, highPct: 74 })],
    })
  );
  assert.equal(hundred.rangeMid, 58);
  assert.equal(hundred.rangeLow, 40);
  assert.equal(hundred.rangeHigh, 74);
  assert.equal(hundred.chairs.low, 58);
  assert.equal(hundred.chairs.high, 0);
});

test("230, 500 and 1000 invited guests produce a bounded forecast", () => {
  for (const count of [230, 500, 1000]) {
    const result = computeArrival(input({ groups: [group({ count })] }));
    assert.equal(result.totalInvited, count);
    assert.ok(result.rangeLow <= result.rangeMid);
    assert.ok(result.rangeMid <= result.rangeHigh);
    assert.ok(result.rangeHigh <= count);
    assert.equal(chairPeople(result), result.rangeMid);
    assert.ok(Number.isFinite(result.recommendedPortions));
  }
  const thousand = computeArrival(input({ groups: [group({ count: 1000 })] }));
  assert.equal(thousand.rangeMid, 960);
});

test("confirmed guests are not forecast again by their group rate", () => {
  const result = computeArrival(
    input({
      groups: [group({ id: "acquaintances", count: 100, lowPct: 40, midPct: 58, highPct: 74 })],
      confirmed: 100,
    })
  );
  assert.equal(result.confirmedReceived, 100);
  assert.equal(result.remainder, 0);
  assert.equal(result.rangeMid, 96);
  assert.equal(result.rangeLow, 92);
  assert.equal(result.rangeHigh, 100);
  assert.notEqual(result.rangeMid, 58);
  assert.equal(result.chairs.confirmed, 96);
  assert.equal(result.isRange, true);
});

test("a full decline contributes no arrivals", () => {
  const result = computeArrival(
    input({
      groups: [group({ count: 100 })],
      declined: 100,
    })
  );
  assert.equal(result.declinedReceived, 100);
  assert.equal(result.rangeMid, 0);
  assert.equal(result.rangeHigh, 0);
  assert.equal(chairPeople(result), 0);
});

test("pending guests use the pending band, not the group band", () => {
  const result = computeArrival(
    input({
      groups: [group({ count: 100 })],
      pending: 100,
    })
  );
  assert.equal(result.pendingReceived, 100);
  assert.equal(result.remainder, 0);
  assert.equal(result.rangeMid, 45);
  assert.notEqual(result.rangeMid, 96);
});

test("overlapping RSVP counts are partitioned once", () => {
  const result = computeArrival(
    input({
      groups: [group({ count: 100 })],
      confirmed: 80,
      declined: 50,
      undecided: 30,
      pending: 40,
    })
  );
  assert.equal(result.confirmedReceived, 80);
  assert.equal(result.declinedReceived, 20);
  assert.equal(result.undecidedReceived, 0);
  assert.equal(result.pendingReceived, 0);
  assert.equal(result.confirmedReceived + result.declinedReceived + result.undecidedReceived + result.pendingReceived, 100);
  assert.equal(result.rangeMid, 77);
  assert.ok(result.warnings.some((warning) => warning.includes("פעם אחת")));
});

test("rsvp counts without groups do not invent extra guests", () => {
  const result = computeArrival(
    input({
      groups: [group({ count: 0 })],
      confirmed: 30,
      declined: 10,
      pending: 20,
    })
  );
  assert.equal(result.totalInvited, 60);
  assert.equal(result.remainder, 0);
  assert.equal(result.rangeMid, Math.round(30 * 0.96) + Math.round(20 * 0.45));
});

test("missing contract stays missing and reserves are meals, not guests", () => {
  const result = computeArrival(
    input({
      groups: [group({ count: 10 })],
      reserveMeals: 12,
    })
  );
  assert.equal(result.contractMissing, true);
  assert.equal(result.venueMin, null);
  assert.equal(result.rangeMid, 10);
  assert.equal(result.recommendedPortions, 22);
  assert.equal(result.chairs.commitment, 0);
  assert.equal(result.unusedCost, null);
  assert.ok(result.assumptions.some((line) => line.includes("טווח תכנון")));
});

test("unused meals and extra meals are priced separately", () => {
  const unused = computeArrival(
    input({
      groups: [group({ count: 100 })],
      venueMin: 120,
      mealPrice: 300,
    })
  );
  assert.equal(unused.rangeMid, 96);
  assert.equal(unused.unusedMeals, 24);
  assert.equal(unused.unusedCost, 7200);
  assert.equal(unused.chairs.commitment, 24);

  const extra = computeArrival(
    input({
      groups: [group({ count: 100 })],
      venueMin: 90,
      reserveMeals: 10,
      extraMealPrice: 200,
    })
  );
  assert.equal(extra.unusedMeals, null);
  assert.equal(extra.extraMeals, 16);
  assert.equal(extra.extraCost, 3200);

  const both = computeArrival(
    input({
      groups: [group({ count: 100 })],
      venueMin: 100,
      reserveMeals: 10,
      mealPrice: 300,
      extraMealPrice: 180,
    })
  );
  assert.equal(both.unusedMeals, 4);
  assert.equal(both.unusedCost, 1200);
  assert.equal(both.extraMeals, 6);
  assert.equal(both.extraCost, 1080);
});

test("day and distance move the forecast and leave received confirmations", () => {
  const base = computeArrival(
    input({
      groups: [group({ id: "acquaintances", count: 100, lowPct: 40, midPct: 58, highPct: 74 })],
      confirmed: 40,
    })
  );
  const thursday = computeArrival(
    input({
      groups: [group({ id: "acquaintances", count: 100, lowPct: 40, midPct: 58, highPct: 74 })],
      weekday: "thu",
    })
  );
  const far = computeArrival(
    input({
      groups: [group({ id: "acquaintances", count: 100, lowPct: 40, midPct: 58, highPct: 74 })],
      confirmed: 40,
      distance: "destination",
    })
  );
  assert.equal(thursday.rangeMid, 62);
  assert.equal(base.confirmedReceived, 40);
  assert.equal(far.confirmedReceived, 40);
  assert.ok(far.rangeMid < base.rangeMid);
});

test("capacity above the plan is reported and does not rewrite the estimate", () => {
  const result = computeArrival(
    input({
      groups: [group({ count: 10 })],
      reserveMeals: 5,
      capacity: 12,
    })
  );
  assert.equal(result.rangeMid, 10);
  assert.equal(result.recommendedPortions, 15);
  assert.equal(result.overCapacity, true);
});

test("seat count changes the drawing only", () => {
  const result = computeArrival(input({ groups: [group({ count: 25 })] }));
  const wide = illustrateChairs({ confirmed: 25, high: 0, undecided: 0, low: 0, commitment: 0 }, 10);
  const tighter = illustrateChairs({ confirmed: 25, high: 0, undecided: 0, low: 0, commitment: 0 }, 8);
  assert.equal(wide.tables.length, 3);
  assert.equal(wide.tables[2].filter((seat) => seat === "confirmed").length, 5);
  assert.equal(wide.tables[2].filter((seat) => seat === "empty").length, 5);
  assert.equal(tighter.tables.length, 4);
  assert.equal(wide.drawnPeople, 25);
  assert.equal(result.rangeMid, 24);
  assert.notEqual(wide.tables.length, tighter.tables.length);
});

test("share link restores numbers and assumptions without guest names", () => {
  const payload = {
    ...input({
      groups: [
        ...BUILTIN_GROUPS.map((item) =>
          group({
            id: item.id,
            label: item.label,
            count: DEFAULT_COUNTS[item.id],
            lowPct: item.low,
            midPct: item.mid,
            highPct: item.high,
          })
        ),
        group({ id: "custom-1", label: "שכנים", count: 12, lowPct: 30, midPct: 50, highPct: 70 }),
      ],
      weekday: "thu",
      season: "summer",
      distance: "far",
      confirmed: 20,
      declined: 4,
      pending: 8,
      undecided: 3,
      venueMin: 140,
      capacity: 220,
      reserveMeals: 6,
      mealPrice: 310,
      extraMealPrice: 290,
    }),
    seatsPerTable: 12,
  };
  const restored = decodeArrivalQuery(encodeArrivalQuery(payload));
  assert.ok(restored);
  assert.equal(restored?.groups.find((item) => item.id === "custom-1")?.label, "שכנים");
  assert.equal(restored?.confirmed, 20);
  assert.equal(restored?.venueMin, 140);
  assert.equal(restored?.seatsPerTable, 12);
  assert.equal(restored?.weekday, "thu");
  assert.equal(encodeArrivalQuery(payload).includes("שם"), false);
  const again = computeArrival(restored!);
  assert.equal(again.rangeMid, computeArrival(payload).rangeMid);
});

test("known group names map, and private names stay unassigned", () => {
  assert.equal(mapKnownGroupName("חברים של ההורים"), "parentsFriends");
  assert.equal(mapKnownGroupName("משפחת כהן"), null);
  const summary = summarizeArrivalRows(
    [
      { rsvp: "yes", guestsCount: 5, arrivedCount: 3, groupId: "a" },
      { rsvp: "no", guestsCount: 2, groupId: "b" },
      { rsvp: "maybe", guestsCount: 4, groupId: "c" },
      { rsvp: "pending", guestsCount: 6, groupId: "d" },
    ],
    new Map([
      ["a", "משפחה קרובה"],
      ["b", "משפחת כהן"],
      ["c", "חברים קרובים"],
      ["d", ""],
    ]),
    null
  );
  assert.equal(summary.confirmed, 3);
  assert.equal(summary.declined, 2);
  assert.equal(summary.undecided, 4);
  assert.equal(summary.pending, 6);
  assert.equal(summary.invited, 17);
  assert.equal(summary.groups.closeFamily, 5);
  assert.equal(summary.groups.closeFriends, 4);
  assert.equal(summary.unassigned, 8);
  assert.equal(JSON.stringify(summary).includes("כהן"), false);
});

test("a general total replaces the groups instead of adding to them", () => {
  const groups = BUILTIN_GROUPS.map((item) =>
    group({
      id: item.id,
      label: item.label,
      count: DEFAULT_COUNTS[item.id],
      lowPct: item.low,
      midPct: item.mid,
      highPct: item.high,
    })
  );
  const grouped = groupsForCalculation("groups", 500, groups);
  assert.equal(grouped.reduce((sum, item) => sum + item.count, 0), 200);
  const totalOnly = groupsForCalculation("total", 500, groups, CUSTOM_DEFAULT_BAND);
  assert.equal(totalOnly.length, 1);
  assert.equal(totalOnly[0].count, 500);
  const result = computeArrival(input({ groups: totalOnly }));
  assert.equal(result.totalInvited, 500);
  assert.equal(result.rangeMid, 300);
  assert.equal(result.confirmedReceived, 0);
  assert.equal(result.contractMissing, true);
});

test("share link restores total mode without counting saved groups again", () => {
  const groups = BUILTIN_GROUPS.map((item) =>
    group({
      id: item.id,
      label: item.label,
      count: DEFAULT_COUNTS[item.id],
      lowPct: item.low,
      midPct: item.mid,
      highPct: item.high,
    })
  );
  const payload = {
    ...input({ groups }),
    seatsPerTable: 10,
    guestMode: "total" as const,
    totalGuests: 80,
    overallBand: CUSTOM_DEFAULT_BAND,
  };
  const restored = decodeArrivalQuery(encodeArrivalQuery(payload));
  assert.equal(restored?.guestMode, "total");
  assert.equal(restored?.totalGuests, 80);
  assert.equal(restored?.groups.reduce((sum, item) => sum + item.count, 0), 200);
  const active = groupsForCalculation(
    restored!.guestMode || "groups",
    restored!.totalGuests || 0,
    restored!.groups,
    restored!.overallBand
  );
  assert.equal(computeArrival({ ...restored!, groups: active }).totalInvited, 80);
  const mix = distributeByDefaultMix(200);
  assert.equal(Object.values(mix).reduce((sum, count) => sum + count, 0), 200);
  assert.equal(mix.closeFamily, DEFAULT_COUNTS.closeFamily);
});

test("event date becomes a season without leaving the calendar", () => {
  assert.equal(weekdayAndSeason(new Date("2026-01-15T12:00:00Z")).season, "winter");
  assert.equal(weekdayAndSeason(new Date("2026-07-15T12:00:00Z")).season, "summer");
  assert.equal(weekdayAndSeason(null).weekday, null);
});
