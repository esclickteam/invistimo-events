import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SEATING_HEARTBEAT_TTL_MS,
  SEATING_INACTIVITY_MS,
  SEATING_INACTIVITY_WARNING_MS,
  acquireLock,
  applyAuthorizedSave,
  authorizeCollaborativeSave,
  authorizeWrite,
  decideReconnectSave,
  diffSeatingTables,
  emptyLockDocument,
  exclusiveLockApplies,
  mergeLayoutPreservingAssignments,
  planIdleExpiry,
  resolvePersistedTables,
  resolveScreenInstance,
  seatingEditClosedMessage,
  touchActivity,
  touchHeartbeat,
  transferLock,
  type LockDocument,
  type WriteCredentials,
} from "../../lib/seating/editLock";

const PHONE_A = "phone-a";
const PHONE_B = "phone-b";
const TAB_A = "tab-a";
const TAB_B = "tab-b";
const USER = "user-1";

function creds(doc: LockDocument, screenInstanceId = PHONE_A): WriteCredentials {
  const lock = doc.editLock;
  if (!lock) throw new Error("expected a lock");
  return {
    lockId: lock.lockId,
    generation: lock.generation,
    screenInstanceId,
    baseMapVersion: doc.mapVersion,
  };
}

function hold(
  doc: LockDocument,
  screenInstanceId: string,
  now: number,
  lockId = `lock-${screenInstanceId}`
) {
  const result = acquireLock(doc, {
    now,
    userId: USER,
    screenInstanceId,
    lockId,
    recordActivity: true,
  });
  if (!result.ok) throw new Error(result.code);
  return result.doc;
}

const serverTables = [
  {
    id: "t1",
    name: "שולחן 1",
    x: 10,
    y: 20,
    seats: 10,
    capacity: 10,
    seatedGuests: [
      { guestId: "g1", seatIndex: 0 },
      { guestId: "g2", seatIndex: 1 },
    ],
  },
  {
    id: "t2",
    name: "שולחן 2",
    x: 80,
    y: 20,
    seats: 8,
    capacity: 8,
    seatedGuests: [{ guestId: "g3", seatIndex: 0 }],
  },
];

test("two phones cannot edit the same event at once", () => {
  const now = 1_000_000;
  const first = hold(emptyLockDocument(), PHONE_A, now);
  const second = acquireLock(first, {
    now: now + 1000,
    userId: USER,
    screenInstanceId: PHONE_B,
    lockId: "lock-b",
    recordActivity: true,
  });

  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.code, "LOCK_HELD_BY_OTHER");
  assert.equal(second.doc.editLock?.screenInstanceId, PHONE_A);

  const staleSave = applyAuthorizedSave(first, {
    now: now + 1000,
    credentials: {
      lockId: "lock-b",
      generation: 99,
      screenInstanceId: PHONE_B,
      baseMapVersion: first.mapVersion,
    },
    previousTables: serverTables,
    nextTables: serverTables.map((table) => ({ ...table, seatedGuests: [] })),
    requestedScope: "full",
  });
  assert.equal(staleSave.ok, false);
  if (!staleSave.ok) assert.equal(staleSave.doc.mapVersion, first.mapVersion);
});

test("a computer and a phone are different screen instances of the same user", () => {
  const now = 2_000_000;
  const computer = hold(emptyLockDocument(), "computer", now);
  const phone = acquireLock(computer, {
    now: now + 500,
    userId: USER,
    screenInstanceId: PHONE_A,
    lockId: "lock-phone",
    recordActivity: true,
  });
  assert.equal(phone.ok, false);
  if (!phone.ok) assert.equal(phone.code, "LOCK_HELD_BY_OTHER");
});

test("two tabs in the same browser get different screen ids and cannot share a lock", () => {
  const first = resolveScreenInstance({
    storedId: null,
    peerClaimsSameId: false,
    nextId: TAB_A,
  });
  const duplicated = resolveScreenInstance({
    storedId: TAB_A,
    peerClaimsSameId: true,
    nextId: TAB_B,
  });
  assert.equal(first.screenInstanceId, TAB_A);
  assert.equal(duplicated.screenInstanceId, TAB_B);
  assert.equal(duplicated.discardStoredLock, true);

  const now = 3_000_000;
  const tabA = hold(emptyLockDocument(), first.screenInstanceId, now);
  const tabB = acquireLock(tabA, {
    now: now + 10,
    userId: USER,
    screenInstanceId: duplicated.screenInstanceId,
    lockId: "lock-tab-b",
    recordActivity: true,
  });
  assert.equal(tabB.ok, false);
});

test("a tab left open for hours loses the lock after five idle minutes", () => {
  const opened = 0;
  let doc = hold(emptyLockDocument(), TAB_A, opened);
  let now = opened;
  while (now + 60_000 < SEATING_INACTIVITY_MS - 1000) {
    now += 60_000;
    const beat = touchHeartbeat(doc, creds(doc, TAB_A), now);
    assert.equal(beat.ok, true);
    if (!beat.ok) return;
    assert.equal(beat.doc.editLock?.lastUserActivityAt, opened);
    doc = beat.doc;
  }
  const stillOpen = touchHeartbeat(doc, creds(doc, TAB_A), SEATING_INACTIVITY_MS - 1000);
  assert.equal(stillOpen.ok, true);
  if (!stillOpen.ok) return;
  assert.equal(stillOpen.doc.editLock?.lastUserActivityAt, opened);

  const expired = touchHeartbeat(
    stillOpen.doc,
    creds(stillOpen.doc, TAB_A),
    opened + SEATING_INACTIVITY_MS + 1
  );
  assert.equal(expired.ok, false);
  if (!expired.ok) {
    assert.equal(expired.code, "LOCK_EXPIRED");
    assert.equal(expired.doc.editLock, null);
  }

  const lateSave = applyAuthorizedSave(doc, {
    now: opened + SEATING_INACTIVITY_MS + 1,
    credentials: creds(doc, TAB_A),
    previousTables: serverTables,
    nextTables: [{ ...serverTables[0], x: 999, seatedGuests: [] }],
    requestedScope: "full",
  });
  assert.equal(lateSave.ok, false);
  if (!lateSave.ok) assert.equal(lateSave.doc.mapVersion, 0);
});

test("heartbeat and refresh do not reset the inactivity clock", () => {
  const opened = 10_000;
  let doc = hold(emptyLockDocument(), PHONE_A, opened);
  doc = touchHeartbeat(doc, creds(doc), opened + 20_000).doc;
  const again = touchHeartbeat(doc, creds(doc), opened + 40_000);
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.doc.editLock?.lastUserActivityAt, opened);
  assert.equal(again.doc.editLock?.lastHeartbeatAt, opened + 40_000);

  const active = touchActivity(again.doc, creds(again.doc), opened + 50_000);
  assert.equal(active.ok, true);
  if (!active.ok) return;
  assert.equal(active.doc.editLock?.lastUserActivityAt, opened + 50_000);
});

test("a background tab cannot extend the lock past inactivity, and silence releases it within 60–90s", () => {
  const opened = 0;
  const doc = hold(emptyLockDocument(), PHONE_A, opened);
  const hiddenTooLong = authorizeWrite(
    doc,
    creds(doc),
    SEATING_HEARTBEAT_TTL_MS + 1
  );
  assert.equal(hiddenTooLong.ok, false);
  if (!hiddenTooLong.ok) assert.equal(hiddenTooLong.code, "LOCK_EXPIRED");
  assert.ok(SEATING_HEARTBEAT_TTL_MS >= 60_000);
  assert.ok(SEATING_HEARTBEAT_TTL_MS <= 90_000);

  const warning = planIdleExpiry({
    idleMs: SEATING_INACTIVITY_WARNING_MS,
    saveInFlight: false,
    pendingSave: false,
    lockValidOnServer: true,
  });
  assert.equal(warning.showWarning, true);
  assert.equal(warning.shouldClose, false);

  const close = planIdleExpiry({
    idleMs: SEATING_INACTIVITY_MS,
    saveInFlight: true,
    pendingSave: true,
    lockValidOnServer: true,
  });
  assert.equal(close.shouldClose, true);
  assert.equal(close.waitForInFlight, true);
  assert.equal(close.flushPending, false);
});

test("an in-flight save at lock expiry is finished safely and a queued save is not retried when the lock is gone", () => {
  const queued = planIdleExpiry({
    idleMs: SEATING_INACTIVITY_MS,
    saveInFlight: false,
    pendingSave: true,
    lockValidOnServer: true,
  });
  assert.equal(queued.flushPending, true);

  const lost = planIdleExpiry({
    idleMs: SEATING_INACTIVITY_MS,
    saveInFlight: false,
    pendingSave: true,
    lockValidOnServer: false,
  });
  assert.equal(lost.flushPending, false);
  assert.equal(lost.reportUnsaved, true);
  assert.match(seatingEditClosedMessage(), /העריכה נסגרה אוטומטית/);
  assert.match(seatingEditClosedMessage(), /חזרה לעריכת ההושבה|מפת ההושבה המעודכנת/);
});

test("transfer revokes the old screen and rejects its later save", () => {
  const now = 50_000;
  const original = hold(emptyLockDocument(), PHONE_A, now, "lock-a");
  const moved = transferLock(original, {
    now: now + 1000,
    userId: USER,
    screenInstanceId: PHONE_B,
    lockId: "lock-b",
    confirmed: true,
  });
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  assert.equal(moved.transferred, true);
  assert.equal(moved.doc.editLock?.screenInstanceId, PHONE_B);
  assert.notEqual(moved.doc.editLock?.generation, original.editLock?.generation);

  const late = applyAuthorizedSave(moved.doc, {
    now: now + 1200,
    credentials: creds(original),
    previousTables: serverTables,
    nextTables: serverTables.map((table) => ({
      ...table,
      seatedGuests: table.id === "t1" ? [] : table.seatedGuests,
    })),
    requestedScope: "full",
  });
  assert.equal(late.ok, false);
  if (!late.ok) {
    assert.equal(late.code, "LOCK_NOT_HELD");
    assert.equal(late.doc.mapVersion, original.mapVersion);
    assert.equal(late.doc.editLock?.lockId, "lock-b");
  }

  const fresh = applyAuthorizedSave(moved.doc, {
    now: now + 1200,
    credentials: creds(moved.doc, PHONE_B),
    previousTables: serverTables,
    nextTables: serverTables,
    requestedScope: "layout",
  });
  assert.equal(fresh.ok, true);
});

test("transfer during an overlapping save keeps only the write that still holds the generation", () => {
  const now = 80_000;
  const original = hold(emptyLockDocument(), PHONE_A, now, "lock-a");
  const saveFirst = applyAuthorizedSave(original, {
    now: now + 10,
    credentials: creds(original),
    previousTables: serverTables,
    nextTables: serverTables.map((table) =>
      table.id === "t1" ? { ...table, x: 44 } : table
    ),
    requestedScope: "layout",
  });
  assert.equal(saveFirst.ok, true);
  if (!saveFirst.ok) return;

  const transferAfterSave = transferLock(saveFirst.doc, {
    now: now + 20,
    userId: USER,
    screenInstanceId: PHONE_B,
    lockId: "lock-b",
    confirmed: true,
  });
  assert.equal(transferAfterSave.ok, true);
  if (!transferAfterSave.ok) return;

  const lateOldScreen = authorizeWrite(
    transferAfterSave.doc,
    { ...creds(original), baseMapVersion: saveFirst.doc.mapVersion },
    now + 30
  );
  assert.equal(lateOldScreen.ok, false);
});

test("moving or resizing a table does not rewrite guest assignments", () => {
  const next = serverTables.map((table) =>
    table.id === "t1"
      ? {
          ...table,
          x: 400,
          y: 12,
          seats: 6,
          capacity: 6,
          seatedGuests: [],
        }
      : table
  );

  const resolved = resolvePersistedTables({
    previousTables: serverTables,
    nextTables: next,
    requestedScope: "layout",
  });
  assert.equal(resolved.scope, "layout");
  assert.equal(resolved.syncGuestAssignments, false);
  const table = resolved.tables.find((item) => item.id === "t1");
  assert.equal(table.x, 400);
  assert.equal(table.seats, 6);
  assert.equal(table.seatedGuests.length, 2);
  assert.deepEqual(
    table.seatedGuests.map((seat: { guestId: string }) => seat.guestId),
    ["g1", "g2"]
  );

  const direct = mergeLayoutPreservingAssignments(serverTables, [
    { id: "t1", x: 5, seats: 4, seatedGuests: [{ guestId: "other", seatIndex: 0 }] },
  ]);
  assert.equal(direct.length, 2, "omitted tables stay on the server during a layout save");
  assert.equal(direct[0].seatedGuests[0].guestId, "g1");
});

test("an intentional assignment save still updates guests when the version matches", () => {
  const now = 90_000;
  const doc = hold(emptyLockDocument(), PHONE_A, now);
  const next = [
    {
      ...serverTables[0],
      seatedGuests: [{ guestId: "g1", seatIndex: 0 }],
    },
    {
      ...serverTables[1],
      seatedGuests: [
        { guestId: "g3", seatIndex: 0 },
        { guestId: "g2", seatIndex: 1 },
      ],
    },
  ];
  const saved = applyAuthorizedSave(doc, {
    now: now + 10,
    credentials: creds(doc),
    previousTables: serverTables,
    nextTables: next,
    requestedScope: "full",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.syncGuestAssignments, true);
  assert.equal(saved.doc.mapVersion, 1);
  const assignmentChanges = saved.changes.filter((change) => change.kind === "assignment");
  assert.equal(assignmentChanges.length, 1);
  assert.equal(assignmentChanges[0].guestId, "g2");
  assert.equal(assignmentChanges[0].before, "t1");
  assert.equal(assignmentChanges[0].after, "t2");
});

test("a stale map version is rejected even with the current lock", () => {
  const now = 100_000;
  let doc = hold(emptyLockDocument(), PHONE_A, now);
  const first = applyAuthorizedSave(doc, {
    now: now + 5,
    credentials: creds(doc),
    previousTables: serverTables,
    nextTables: serverTables.map((table) =>
      table.id === "t2" ? { ...table, x: 3 } : table
    ),
    requestedScope: "layout",
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  doc = first.doc;

  const stale = applyAuthorizedSave(doc, {
    now: now + 8,
    credentials: { ...creds(doc), baseMapVersion: 0 },
    previousTables: serverTables,
    nextTables: serverTables.map((table) => ({ ...table, seatedGuests: [] })),
    requestedScope: "full",
  });
  assert.equal(stale.ok, false);
  if (!stale.ok) {
    assert.equal(stale.code, "STALE_VERSION");
    assert.equal(stale.doc.mapVersion, 1);
  }
});

test("reconnect does not resend an old payload after the server version moved", () => {
  assert.equal(
    decideReconnectSave({
      versionAtAttempt: 4,
      versionNow: 5,
      lockStillHeld: true,
    }),
    "accept-server"
  );
  assert.equal(
    decideReconnectSave({
      versionAtAttempt: 4,
      versionNow: 4,
      lockStillHeld: false,
    }),
    "block"
  );
  assert.equal(
    decideReconnectSave({
      versionAtAttempt: 4,
      versionNow: 4,
      lockStillHeld: true,
    }),
    "retry-current"
  );
});

test("explicit transfer confirmation is required", () => {
  const now = 110_000;
  const doc = hold(emptyLockDocument(), PHONE_A, now);
  const refused = transferLock(doc, {
    now: now + 1,
    userId: USER,
    screenInstanceId: PHONE_B,
    lockId: "lock-b",
    confirmed: false,
  });
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.equal(refused.code, "TRANSFER_NOT_CONFIRMED");
  assert.equal(refused.doc.editLock?.screenInstanceId, PHONE_A);
});

test("assignment diff records previous and next tables", () => {
  const changes = diffSeatingTables(serverTables, [
    { ...serverTables[0], x: 1, seatedGuests: [] },
    serverTables[1],
  ]);
  assert.ok(changes.some((change) => change.kind === "table-layout" && change.field === "x"));
  assert.ok(
    changes.some(
      (change) =>
        change.kind === "assignment" &&
        change.guestId === "g1" &&
        change.before === "t1" &&
        change.after === null
    )
  );
});

test("exclusive lock applies only to a regular customer outside live mode", () => {
  assert.equal(
    exclusiveLockApplies({ actor: { role: "user" }, eventIsLive: false }),
    true
  );
  assert.equal(
    exclusiveLockApplies({ actor: { role: "client" }, eventIsLive: false }),
    true
  );
  assert.equal(
    exclusiveLockApplies({ actor: { role: "user" }, eventIsLive: true }),
    false
  );
  assert.equal(
    exclusiveLockApplies({ actor: { role: "producer" }, eventIsLive: false }),
    false
  );
  assert.equal(
    exclusiveLockApplies({ actor: { role: "admin" }, eventIsLive: false }),
    false
  );
  assert.equal(
    exclusiveLockApplies({
      actor: { role: "staff", staffType: "usher_staff" },
      eventIsLive: false,
    }),
    false
  );
  assert.equal(
    exclusiveLockApplies({ actor: { role: "venue_owner" }, eventIsLive: false }),
    false
  );
  assert.equal(
    exclusiveLockApplies({
      actor: {
        role: "user",
        impersonated: true,
        impersonatedByAdmin: true,
        impersonationSourceRole: "admin",
      },
      eventIsLive: false,
    }),
    false
  );
  assert.equal(
    exclusiveLockApplies({
      actor: {
        role: "client",
        impersonated: true,
        impersonationSourceRole: "producer",
        impersonationRole: "client",
      },
      eventIsLive: false,
    }),
    false
  );
});

test("producers and live workers can save in parallel, but a stale map cannot restore old assignments", () => {
  const doc = emptyLockDocument();
  doc.mapVersion = 4;
  const current = authorizeCollaborativeSave(doc, 4);
  assert.equal(current.ok, true);

  const stale = authorizeCollaborativeSave(doc, 3);
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.code, "STALE_VERSION");
  assert.equal(stale.doc.mapVersion, 4);

  const missing = authorizeCollaborativeSave(doc, null);
  assert.equal(missing.ok, false);

  const afterMoveA = [
    { ...serverTables[0], seatedGuests: [{ guestId: "g1", seatIndex: 0 }] },
    {
      ...serverTables[1],
      seatedGuests: [
        { guestId: "g2", seatIndex: 0 },
        { guestId: "g3", seatIndex: 1 },
      ],
    },
  ];
  const afterMoveB = afterMoveA.map((table) =>
    table.id === "t1"
      ? { ...table, seatedGuests: [{ guestId: "g1", seatIndex: 0 }, { guestId: "g4", seatIndex: 1 }] }
      : table
  );
  assert.equal(afterMoveB[1].seatedGuests.length, 2);
  assert.equal(afterMoveB[0].seatedGuests.some((seat) => seat.guestId === "g1"), true);
  const oldSnapshot = serverTables;
  const preserved = mergeLayoutPreservingAssignments(afterMoveB, oldSnapshot);
  assert.equal(
    preserved.find((table) => table.id === "t1")?.seatedGuests.some((seat: { guestId: string }) => seat.guestId === "g1"),
    true
  );
  assert.equal(
    preserved.find((table) => table.id === "t2")?.seatedGuests.some((seat: { guestId: string }) => seat.guestId === "g3"),
    true
  );
});

test("every seating write route requires the edit lock", () => {
  const files = [
    "app/api/seating/save/[eventId]/route.ts",
    "app/api/seating/smart-seat-by-groups/[eventId]/route.ts",
    "app/api/seating/clear-smart-seating/[eventId]/route.ts",
    "app/api/seating/update-table/route.ts",
    "app/api/guests/assign-table/route.ts",
    "app/api/guests/remove-from-table/route.ts",
    "app/api/groups/[id]/route.ts",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.match(
      source,
      /guardSeatingEditWrite|commitGuardedSeatingUpdate|commitSeatingSnapshot/,
      file
    );
  }

  const liveMove = readFileSync(
    "app/api/seating/live/move-guest-table/route.ts",
    "utf8"
  );
  assert.match(liveMove, /markMapVersionBump/);

  const guestRoute = readFileSync("app/api/guests/[id]/route.ts", "utf8");
  assert.match(guestRoute, /markMapVersionBump|mapVersion/);

  const templateSync = readFileSync(
    "lib/venues/syncSeatingTemplateToLinkedEvents.ts",
    "utf8"
  );
  assert.match(templateSync, /mapVersion/);

  const page = readFileSync("app/dashboard/seating/SeatingEditOverlays.tsx", "utf8");
  assert.match(page, /העריכה נסגרה אוטומטית כדי להגן על סידורי ההושבה שלך/);
  assert.match(page, /חזרה לעריכת ההושבה/);
  const dashboard = readFileSync("app/dashboard/seating/page.tsx", "utf8");
  assert.match(dashboard, /SeatingEditOverlays/);
  const saveRoute = readFileSync("app/api/seating/save/[eventId]/route.ts", "utf8");
  assert.match(saveRoute, /customerExclusiveLockRequired/);
  const producer = readFileSync(
    "app/events/production/_components/LiveSeating/LiveSeatingTab.tsx",
    "utf8"
  );
  assert.doesNotMatch(producer, /edit-lock/);
  assert.match(producer, /baseMapVersion/);

  const mobile = readFileSync("mobile/app/(app)/seating.tsx", "utf8");
  assert.match(mobile, /העריכה נסגרה אוטומטית כדי להגן על סידורי ההושבה שלך/);
  assert.match(mobile, /חזרה לעריכת ההושבה/);
  assert.match(mobile, /העברת העריכה תסגור את העריכה במסך האחר/);
  assert.match(mobile, /confirmed: true/);
});

