import test from "node:test";
import assert from "node:assert/strict";
import { assignWeddingChallengeMission } from "../../lib/weddingChallenges/assignment";
import { WEDDING_CHALLENGE_MISSIONS, missionsByCategory } from "../../lib/weddingChallenges/missionBank";
import { defaultWeddingChallengeSettings, giveawayEntriesOpen, normalizeWeddingChallengeSettings, openingSmsAlreadySent } from "../../lib/weddingChallenges/settings";
import { buildWeddingChallengesSms, smsMentionsGiveaway } from "../../lib/weddingChallenges/sms";
import { pickWeightedWinner } from "../../lib/weddingChallenges/giveaway";
import { wallTimeInZoneToUtc, utcToWallTimeInput } from "../../lib/weddingChallenges/timezone";
import type { AssignmentGuest, MissionDefinition, TableAssignmentSnapshot, WeddingChallengeSettings } from "../../lib/weddingChallenges/types";

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
    tableAware: true,
    tableSize: 10,
    activeGuestCount: 4,
    eventTableCount: 12,
    activeMissionIds: [],
    recentMissionIds: [],
    recentCategories: [],
    ...overrides,
  };
}

type SettingsOverrides = Partial<Omit<WeddingChallengeSettings, "giveaway" | "sms" | "enabledCategories">> & {
  giveaway?: Partial<WeddingChallengeSettings["giveaway"]>;
  sms?: Partial<WeddingChallengeSettings["sms"]>;
  enabledCategories?: Partial<WeddingChallengeSettings["enabledCategories"]>;
};

function settings(overrides: SettingsOverrides = {}): WeddingChallengeSettings {
  const base = defaultWeddingChallengeSettings();
  return normalizeWeddingChallengeSettings({
    ...base,
    ...overrides,
    giveaway: { ...base.giveaway, ...(overrides.giveaway || {}) },
    sms: { ...base.sms, ...(overrides.sms || {}) },
    enabledCategories: { ...base.enabledCategories, ...(overrides.enabledCategories || {}) },
  });
}

function customMission(overrides: Partial<MissionDefinition> = {}): MissionDefinition {
  return {
    id: "custom-test1",
    category: "chaos",
    text: "משימה אישית לבדיקה",
    difficulty: "medium",
    requiresAlcohol: false,
    minPeople: 2,
    maxPeople: null,
    tableBased: false,
    cooldownWeight: 1,
    boss: false,
    minTables: 0,
    active: true,
    source: "custom",
    weight: 50,
    maxAssignments: null,
    assignedCount: 0,
    allowedGuestIds: null,
    allowedTableIds: null,
    ...overrides,
  };
}

function assign(params: {
  guest?: Partial<AssignmentGuest>;
  table?: Partial<TableAssignmentSnapshot>;
  settings?: SettingsOverrides;
  missions?: MissionDefinition[];
  random?: () => number;
}) {
  return assignWeddingChallengeMission({
    guest: guest(params.guest),
    table: table(params.table),
    settings: settings(params.settings),
    missions: params.missions,
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

test("customer-facing Wedding Challenges card is a 299 ILS checkout product with 800-guest cap", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const pricing = fs.readFileSync("app/pricing/page.tsx", "utf8");
  const card = fs.readFileSync("components/wedding-challenges/PurchaseCard.tsx", "utf8");
  const checkout = fs.readFileSync("app/api/wedding-challenges/checkout/route.ts", "utf8");
  const guests = fs.readFileSync("app/api/wedding-challenges/guests/route.ts", "utf8");
  const entitlement = fs.readFileSync("models/WeddingChallengeEntitlement.ts", "utf8");
  const adminSales = fs.readFileSync("app/api/admin/wedding-challenges/sales/route.ts", "utf8");
  const adminPage = fs.readFileSync("app/admin/users/page.tsx", "utf8");
  const employeeSales = fs.readFileSync("app/employee/sales/new/page.tsx", "utf8");
  assert.match(pricing, /WeddingChallengesPurchaseCard/);
  assert.match(card, /WEDDING_CHALLENGES_PRICE_ILS/);
  assert.match(card, /₪ לאירוע/);
  assert.match(card, /WEDDING_CHALLENGES_MAX_GUESTS/);
  assert.match(card, /רשומות אורחים/);
  assert.match(card, /רכישה ב־/);
  assert.match(card, /רכישת Wedding Challenges/);
  assert.match(card, /תצוגה מקדימה/);
  assert.match(card, /הוספת הגרלה/);
  assert.match(card, /עלות הפרס נגבית בנפרד/);
  assert.match(card, /\/api\/wedding-challenges\/checkout/);
  assert.match(checkout, /WEDDING_CHALLENGES_PRICE_ILS \* 100/);
  assert.match(checkout, /wedding-challenges/);
  assert.match(guests, /weddingChallengesGuestLimitPayload/);
  assert.match(guests, /wouldExceedWeddingChallengesGuestLimit/);
  assert.match(entitlement, /eventId/);
  assert.match(entitlement, /STANDALONE_GAME/);
  assert.match(entitlement, /EXISTING_EVENT/);
  assert.match(adminSales, /NAME_PHONE_REQUIRED/);
  assert.doesNotMatch(adminSales, /COUPLE_NAMES_REQUIRED/);
  assert.match(adminPage, /includeWeddingChallenges/);
  assert.match(adminPage, /Giveaway Add-on/);
  assert.match(adminPage, /299 ₪/);
  assert.match(employeeSales, /key: "weddingChallenges"/);
  assert.match(employeeSales, /key: "weddingChallengesGiveaway"/);
});

test("admin users page exposes Wedding Challenges as a 299 ILS product", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
  assert.match(page, /Wedding Challenges/);
  assert.match(page, /includeWeddingChallenges/);
  assert.match(page, /Giveaway Add-on/);
  assert.match(page, /299/);
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

test("guests without a table still get a mission and skip table uniqueness", () => {
  const first = assign({
    guest: { guestId: "solo-1", tableId: null },
    table: {
      tableId: null,
      tableAware: false,
      tableSize: 0,
      activeGuestCount: 0,
      eventTableCount: 0,
      activeMissionIds: [],
    },
  });
  assert.ok(first.mission);

  const second = assign({
    guest: { guestId: "solo-2", tableId: null, completedMissionIds: [] },
    table: {
      tableId: null,
      tableAware: false,
      tableSize: 0,
      activeGuestCount: 0,
      eventTableCount: 0,
      activeMissionIds: [first.mission!.id],
    },
  });
  assert.ok(second.mission);
});

test("no-table assignment still prevents duplicate missions for the same guest", () => {
  const completed = ["dancefloor-01"];
  const result = assign({
    guest: { tableId: null, completedMissionIds: completed },
    table: {
      tableId: null,
      tableAware: false,
      tableSize: 0,
      eventTableCount: 0,
      activeMissionIds: [],
      recentMissionIds: completed,
    },
  });
  assert.ok(!result.mission || result.mission.id !== "dancefloor-01");
});

test("no-table mode uses global recent missions for diversity", () => {
  const recent = ["dancefloor-01", "shots-01", "table-01"];
  const result = assign({
    guest: { tableId: null },
    table: {
      tableId: null,
      tableAware: false,
      tableSize: 0,
      eventTableCount: 0,
      activeMissionIds: [],
      recentMissionIds: recent,
    },
  });
  assert.ok(result.mission);
  assert.equal(recent.includes(result.mission!.id), false);
});

test("standalone guest import parses csv-like paste with optional table and adult flag", () => {
  const { parseGuestListText } = require("../../lib/weddingChallenges/guestImport") as typeof import("../../lib/weddingChallenges/guestImport");
  const parsed = parseGuestListText("דני, 0501234567, 4, כן\nנועה, 0527654321");
  assert.equal(parsed.guests.length, 2);
  assert.equal(parsed.guests[0].name, "דני");
  assert.equal(parsed.guests[0].phone, "0501234567");
  assert.equal(parsed.guests[0].tableNumber, 4);
  assert.equal(parsed.guests[0].isAdult, true);
  assert.equal(parsed.guests[1].tableNumber, null);
});

test("existing-event audience is RSVP yes only; standalone treats uploaded guests as attending", () => {
  const {
    attendingGuestMongoFilter,
    guestIsEligibleForWeddingChallenges,
  } = require("../../lib/weddingChallenges/sourceType") as typeof import("../../lib/weddingChallenges/sourceType");
  assert.deepEqual(attendingGuestMongoFilter("EXISTING_EVENT"), { rsvp: "yes" });
  assert.equal(guestIsEligibleForWeddingChallenges({ sourceType: "EXISTING_EVENT", rsvp: "no" }), false);
  assert.equal(guestIsEligibleForWeddingChallenges({ sourceType: "EXISTING_EVENT", rsvp: "pending" }), false);
  assert.equal(guestIsEligibleForWeddingChallenges({ sourceType: "EXISTING_EVENT", rsvp: "yes" }), true);
  assert.equal(guestIsEligibleForWeddingChallenges({ sourceType: "STANDALONE_GAME", rsvp: "yes" }), true);
  assert.equal(guestIsEligibleForWeddingChallenges({ sourceType: "STANDALONE_GAME", rsvp: "pending" }), true);
  assert.equal(guestIsEligibleForWeddingChallenges({ sourceType: "STANDALONE_GAME", rsvp: "no" }), false);
});

test("dashboard and APIs expose EXISTING_EVENT and STANDALONE_GAME standalone flow", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const page = fs.readFileSync("app/dashboard/wedding-challenges/page.tsx", "utf8");
  const sms = fs.readFileSync("app/api/wedding-challenges/sms/route.ts", "utf8");
  const events = fs.readFileSync("app/api/wedding-challenges/events/route.ts", "utf8");
  const guests = fs.readFileSync("app/api/wedding-challenges/guests/route.ts", "utf8");
  assert.match(page, /STANDALONE_GAME/);
  assert.match(page, /EXISTING_EVENT/);
  assert.match(page, /יצירת אירוע למשחק בלבד/);
  assert.match(page, /CustomMissionsPanel/);
  assert.match(page, /SmsSchedulePanel/);
  assert.match(page, /AUTO_DRAW_AT_TIME/);
  assert.match(page, /MANUAL_DRAW/);
  assert.match(guests, /parseGuestListText/);
  assert.match(guests, /XLSX/);
  assert.match(events, /createStandaloneWeddingChallengesEvent/);
  assert.match(sms, /attendingGuestMongoFilter/);
  assert.match(sms, /action === "schedule"/);
  assert.match(sms, /action === "send_now"/);
  assert.match(sms, /action === "cancel"/);
  assert.match(sms, /ACTION_REQUIRED/);
});

test("Jerusalem wall time converts to UTC without using the browser timezone", () => {
  const utc = wallTimeInZoneToUtc("2026-09-06T20:00", "Asia/Jerusalem");
  assert.ok(utc);
  assert.equal(utc.toISOString(), "2026-09-06T17:00:00.000Z");
  assert.equal(utcToWallTimeInput(utc, "Asia/Jerusalem"), "2026-09-06T20:00");
});

test("opening SMS is blocked after send unless explicitly forced", () => {
  const sent = settings({ sms: { template: "full", timezone: "Asia/Jerusalem", scheduledAt: null, status: "sent", sentAt: "2026-09-06T17:00:00.000Z", sentCount: 12, cancelledAt: null } });
  assert.equal(openingSmsAlreadySent(sent), true);
  assert.equal(openingSmsAlreadySent(sent, true), false);
  const idle = settings();
  assert.equal(openingSmsAlreadySent(idle), false);
});

test("giveaway entries close at cutoff, draw time, or lock", () => {
  const now = new Date("2026-09-06T18:00:00.000Z");
  assert.equal(
    giveawayEntriesOpen(
      settings({
        giveaway: { enabled: true, drawAt: "2026-09-06T19:00:00.000Z", entriesCutoffAt: null },
      }),
      now
    ),
    true
  );
  assert.equal(
    giveawayEntriesOpen(
      settings({
        giveaway: { enabled: true, drawAt: "2026-09-06T19:00:00.000Z", entriesCutoffAt: "2026-09-06T17:30:00.000Z" },
      }),
      now
    ),
    false
  );
  assert.equal(
    giveawayEntriesOpen(
      settings({
        giveaway: { enabled: true, locked: true, drawnAt: "2026-09-06T18:00:00.000Z" },
      }),
      now
    ),
    false
  );
});

test("custom missions use the same engine: targeting, no duplicates, table uniqueness, max assignments, max 5", () => {
  const mission = customMission({
    id: "custom-table7",
    allowedTableIds: ["7"],
    maxAssignments: 1,
    assignedCount: 0,
  });

  const hit = assign({
    guest: { guestId: "g1", tableId: "7" },
    table: { tableId: "7" },
    missions: [mission],
  });
  assert.ok(hit.mission);
  assert.equal(hit.mission!.id, "custom-table7");

  const otherTable = assign({
    guest: { guestId: "g2", tableId: "3" },
    table: { tableId: "3" },
    missions: [mission],
  });
  assert.equal(otherTable.mission, null);

  const duplicateGuest = assign({
    guest: { guestId: "g1", tableId: "7", completedMissionIds: ["custom-table7"] },
    table: { tableId: "7" },
    missions: [mission],
  });
  assert.equal(duplicateGuest.mission, null);

  const tableClash = assign({
    guest: { guestId: "g3", tableId: "7" },
    table: { tableId: "7", activeMissionIds: ["custom-table7"] },
    missions: [mission],
  });
  assert.equal(tableClash.mission, null);

  const maxed = assign({
    guest: { guestId: "g4", tableId: "7" },
    table: { tableId: "7" },
    missions: [customMission({ maxAssignments: 1, assignedCount: 1, allowedTableIds: ["7"] })],
  });
  assert.equal(maxed.mission, null);

  const specificGuest = assign({
    guest: { guestId: "g9", tableId: "7" },
    table: { tableId: "7" },
    missions: [customMission({ id: "custom-g9", allowedGuestIds: ["g9"] })],
  });
  assert.equal(specificGuest.mission!.id, "custom-g9");

  const notTargeted = assign({
    guest: { guestId: "g8", tableId: "7" },
    table: { tableId: "7" },
    missions: [customMission({ id: "custom-g9", allowedGuestIds: ["g9"] })],
  });
  assert.equal(notTargeted.mission, null);

  const alcoholCustom = assign({
    guest: { isAdult: false },
    missions: [customMission({ id: "custom-shots", category: "shots", requiresAlcohol: true })],
    settings: {
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
  assert.equal(alcoholCustom.mission, null);

  const fifth = assign({
    guest: { completedCount: 5, completedMissionIds: ["a", "b", "c", "d", "e"] },
    missions: [mission, ...WEDDING_CHALLENGE_MISSIONS],
  });
  assert.equal(fifth.reason, "max_reached");
});

test("admin missions API, draw lock/reset, and cron jobs are wired", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const missions = fs.readFileSync("app/api/wedding-challenges/missions/route.ts", "utf8");
  const draw = fs.readFileSync("app/api/wedding-challenges/admin/draw/route.ts", "utf8");
  const cron = fs.readFileSync("app/api/cron/send-scheduled-sms/route.ts", "utf8");
  const panel = fs.readFileSync("app/dashboard/wedding-challenges/CustomMissionsPanel.tsx", "utf8");
  const smsPanel = fs.readFileSync("app/dashboard/wedding-challenges/SmsSchedulePanel.tsx", "utf8");
  assert.match(missions, /createCustomMission/);
  assert.match(missions, /DEFAULT_MISSIONS_READONLY/);
  assert.match(draw, /DRAW_LOCKED/);
  assert.match(draw, /reset === true/);
  assert.match(cron, /processWeddingChallengesJobs/);
  assert.match(panel, /הוספת משימה אישית/);
  assert.match(panel, /משימה אישית/);
  assert.match(panel, /Invistimo/);
  assert.match(smsPanel, /שלח עכשיו/);
  assert.match(smsPanel, /תזמון שליחה/);
});

test("live scratch card keeps foil until most of the gold is cleared", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const src = fs.readFileSync("app/live/[token]/LiveScratchExperience.tsx", "utf8");
  assert.match(src, /destination-out/);
  assert.match(src, /setPointerCapture/);
  assert.match(src, /willReadFrequently/);
  assert.match(src, /ResizeObserver/);
  assert.match(src, /UNLOCK_RATIO = 0\.58/);
  assert.match(src, /FOIL_CLEAR_RATIO = 0\.86/);
  assert.match(src, /foilVisible/);
  assert.match(src, /data\.mission\.text/);
  assert.match(src, /גרדו את שכבת הזהב עד הסוף/);
  assert.doesNotMatch(src, /> 0\.18/);
  assert.doesNotMatch(src, /המשימה מחכה מתחת לזהב/);
  assert.doesNotMatch(src, /\{!revealed && \(/);
  assert.doesNotMatch(src, /if \(event\.buttons\)/);
  assert.doesNotMatch(src, />☰</);
});

test("game-only customers get a guest-list dashboard without invite or RSVP", () => {
  const {
    userIsWeddingChallengesOnly,
    userHasInviteOrProductionPackage,
  } = require("../../lib/weddingChallenges/entitlement") as typeof import("../../lib/weddingChallenges/entitlement");

  assert.equal(
    userIsWeddingChallengesOnly({
      includeWeddingChallenges: true,
      weddingChallengesOnly: true,
      hasPaid: true,
    }),
    true
  );
  assert.equal(
    userIsWeddingChallengesOnly({
      includeWeddingChallenges: true,
      hasPaid: false,
    }),
    true
  );
  assert.equal(
    userIsWeddingChallengesOnly({
      includeWeddingChallenges: true,
      hasPaid: true,
      includeDigitalSeating: true,
    }),
    false
  );
  assert.equal(
    userHasInviteOrProductionPackage({
      includeWeddingChallenges: true,
      includeEventManagement: true,
    }),
    true
  );

  const fs = require("node:fs") as typeof import("node:fs");
  const menu = fs.readFileSync("app/dashboard/DashboardMobileMenu.tsx", "utf8");
  const layout = fs.readFileSync("app/dashboard/layout.tsx", "utf8");
  const auth = fs.readFileSync("context/AuthContext.tsx", "utf8");
  const page = fs.readFileSync("app/dashboard/wedding-challenges/page.tsx", "utf8");
  const roster = fs.readFileSync("app/dashboard/wedding-challenges/GuestRoster.tsx", "utf8");
  const setPassword = fs.readFileSync("app/api/auth/set-password/route.ts", "utf8");
  const purchase = fs.readFileSync("lib/weddingChallenges/purchase.ts", "utf8");
  assert.match(menu, /gameOnly/);
  assert.match(menu, /hidden: gameOnly/);
  assert.match(layout, /userIsWeddingChallengesOnly/);
  assert.match(layout, /\/dashboard\/create-invite/);
  assert.match(auth, /\/dashboard\/wedding-challenges/);
  assert.match(page, /רשימת אורחים והמשחק/);
  assert.match(roster, /כמו בדשבורד הרגיל: מוסיפים שם וטלפון/);
  assert.match(setPassword, /weddingChallenges/);
  assert.match(setPassword, /\/dashboard\/wedding-challenges/);
  assert.match(purchase, /weddingChallengesOnly/);
});

test("package guest limit is 800 and does not silently allow overflow", () => {
  const {
    wouldExceedWeddingChallengesGuestLimit,
    weddingChallengesGuestLimitPayload,
  } = require("../../lib/weddingChallenges/guestLimit") as typeof import("../../lib/weddingChallenges/guestLimit");
  const {
    WEDDING_CHALLENGES_MAX_GUESTS,
    WEDDING_CHALLENGES_PRICE_ILS,
    WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
    WEDDING_CHALLENGES_GUEST_LIMIT_MESSAGE,
  } = require("../../lib/weddingChallenges/constants") as typeof import("../../lib/weddingChallenges/constants");

  assert.equal(WEDDING_CHALLENGES_PRICE_ILS, 299);
  assert.equal(WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS, 99);
  assert.equal(WEDDING_CHALLENGES_MAX_GUESTS, 800);
  assert.equal(wouldExceedWeddingChallengesGuestLimit(800, 0), false);
  assert.equal(wouldExceedWeddingChallengesGuestLimit(800, 1), true);
  assert.equal(wouldExceedWeddingChallengesGuestLimit(0, 801), true);
  assert.equal(weddingChallengesGuestLimitPayload().message, WEDDING_CHALLENGES_GUEST_LIMIT_MESSAGE);
});

