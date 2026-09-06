import test from "node:test";
import assert from "node:assert/strict";
import { assignWeddingChallengeMission } from "../../lib/weddingChallenges/assignment";
import { WEDDING_CHALLENGE_MISSIONS, missionsByCategory } from "../../lib/weddingChallenges/missionBank";
import { defaultWeddingChallengeSettings } from "../../lib/weddingChallenges/settings";
import { buildWeddingChallengesSms, smsMentionsGiveaway } from "../../lib/weddingChallenges/sms";
import { pickWeightedWinner } from "../../lib/weddingChallenges/giveaway";
import type { AssignmentGuest, TableAssignmentSnapshot, WeddingChallengeSettings } from "../../lib/weddingChallenges/types";

function guest(overrides: Partial<AssignmentGuest> = {}): AssignmentGuest {
  return {
    guestId: "g1",
    tableId: "t1",
    isAdult: true,
    completedMissionIds: [],
    skippedMissionIds: [],
    lastMissionCategory: null,
    recentCategories: [],
    completedCount: 0,
    lastCompletedAt: null,
    ...overrides,
  };
}

function table(overrides: Partial<TableAssignmentSnapshot> = {}): TableAssignmentSnapshot {
  return {
    tableId: "t1",
    tableSize: 10,
    activeGuestCount: 4,
    eventTableCount: 12,
    activeMissionIds: [],
    recentMissionIds: [],
    recentCategories: [],
    ...overrides,
  };
}

function settings(overrides: Partial<WeddingChallengeSettings> = {}): WeddingChallengeSettings {
  return defaultWeddingChallengeSettings(overrides);
}

function assign(params: {
  guest?: Partial<AssignmentGuest>;
  table?: Partial<TableAssignmentSnapshot>;
  settings?: Partial<WeddingChallengeSettings>;
  random?: () => number;
}) {
  return assignWeddingChallengeMission({
    guest: guest(params.guest),
    table: table(params.table),
    settings: settings(params.settings),
    random: params.random || (() => 0.01),
  });
}

test("mission bank has every approved category and no couple/photo/intro tasks", () => {
  assert.equal(missionsByCategory("dancefloor").length, 36);
  assert.equal(missionsByCategory("shots").length, 22);
  assert.equal(missionsByCategory("table").length, 24);
  assert.equal(missionsByCategory("chaos").length, 29);
  assert.equal(missionsByCategory("cheeky").length, 20);
  assert.equal(missionsByCategory("boss").length, 10);
  assert.equal(WEDDING_CHALLENGE_MISSIONS.length, 141);

  const blob = WEDDING_CHALLENGE_MISSIONS.map((m) => m.text).join("\n");
  assert.doesNotMatch(blob, /הזוג|הכלה|החתן|צלם סלפי|הכירו את/);
  assert.ok(WEDDING_CHALLENGE_MISSIONS.every((m) => m.category !== "shots" || m.requiresAlcohol));
});

test("hard-caps each guest at 5 missions", () => {
  const result = assign({
    guest: {
      completedCount: 5,
      completedMissionIds: ["dancefloor-01", "dancefloor-02", "dancefloor-03", "dancefloor-04", "dancefloor-05"],
    },
  });
  assert.equal(result.reason, "max_reached");
  assert.equal(result.mission, null);
});

test("never assigns the same mission twice to the same guest", () => {
  const completed = WEDDING_CHALLENGE_MISSIONS.filter((m) => m.category === "dancefloor").map((m) => m.id);
  const result = assign({
    guest: { completedMissionIds: completed },
    settings: {
      enabledCategories: {
        dancefloor: true,
        shots: false,
        table: false,
        chaos: false,
        cheeky: false,
        boss: false,
      },
    },
  });
  assert.equal(result.mission, null);
});

test("same table cannot get the same active mission twice", () => {
  const first = assign({});
  assert.ok(first.mission);
  const second = assign({
    guest: { guestId: "g2" },
    table: { activeMissionIds: [first.mission!.id] },
  });
  assert.ok(second.mission);
  assert.notEqual(second.mission!.id, first.mission!.id);
});

test("four active guests at the same table get four different missions", () => {
  const used: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    const result = assign({
      guest: { guestId: `g${i}` },
      table: { activeMissionIds: used, activeGuestCount: 4 },
      random: () => (i + 1) * 0.17,
    });
    assert.ok(result.mission, `guest ${i} should receive a mission`);
    assert.equal(used.includes(result.mission!.id), false);
    used.push(result.mission!.id);
  }
  assert.equal(new Set(used).size, 4);
});

test("alcohol missions are blocked when disabled or guest is not adult", () => {
  const disabled = assign({
    settings: {
      allowAlcoholMissions: false,
      enabledCategories: {
        dancefloor: false,
        shots: true,
        table: false,
        chaos: false,
        cheeky: false,
        boss: false,
      },
    },
  });
  assert.equal(disabled.mission, null);

  const minor = assign({
    guest: { isAdult: false },
    settings: {
      allowAlcoholMissions: true,
      enabledCategories: {
        dancefloor: false,
        shots: true,
        table: false,
        chaos: false,
        cheeky: false,
        boss: false,
      },
    },
  });
  assert.equal(minor.mission, null);
});

test("boss missions stay rare for early guests", () => {
  const result = assign({
    guest: { completedCount: 0 },
    settings: {
      enabledCategories: {
        dancefloor: false,
        shots: false,
        table: false,
        chaos: false,
        cheeky: false,
        boss: true,
      },
    },
  });
  assert.equal(result.mission, null);
});

test("table-based missions that need more people than the table are skipped first", () => {
  const result = assign({
    table: { tableSize: 2, activeGuestCount: 1, eventTableCount: 2 },
    settings: {
      enabledCategories: {
        dancefloor: false,
        shots: false,
        table: true,
        chaos: false,
        cheeky: false,
        boss: false,
      },
    },
  });
  if (result.mission) {
    assert.ok(result.mission.minPeople <= 3 || result.relaxationLevel > 0);
  }
});

test("opening SMS never mentions the giveaway", () => {
  const full = buildWeddingChallengesSms({
    coupleNames: "נועה ויונתן",
    personalLink: "https://www.invistimo.com/live/abc",
    template: "full",
  });
  const short = buildWeddingChallengesSms({
    coupleNames: "נועה ויונתן",
    personalLink: "https://www.invistimo.com/live/abc",
    template: "short",
  });
  assert.match(full, /כרטיס האישי/);
  assert.match(short, /לחצו וגרדו/);
  assert.equal(smsMentionsGiveaway(full), false);
  assert.equal(smsMentionsGiveaway(short), false);
});

test("guest live pages hide public marketing chrome", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const shell = fs.readFileSync("app/PublicPageShell.tsx", "utf8");
  assert.match(shell, /isLiveRoute/);
  assert.match(shell, /path\.startsWith\("\/live\/"\)/);
});

test("admin users page exposes Wedding Challenges as a 99 ILS premium add-on", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
  assert.match(page, /Wedding Challenges Premium/);
  assert.match(page, /includeWeddingChallenges/);
  assert.match(page, /Giveaway Add-on/);
});

test("giveaway winner is weighted by entries", () => {
  let pickedA = 0;
  for (let i = 0; i < 200; i += 1) {
    const winner = pickWeightedWinner(
      [
        { guestId: "a", guestName: "A", entries: 9 },
        { guestId: "b", guestName: "B", entries: 1 },
      ],
      () => i / 200
    );
    if (winner?.guestId === "a") pickedA += 1;
  }
  assert.ok(pickedA > 150);
});
