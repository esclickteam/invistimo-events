import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  classifySharedIdentity,
  isIdentityShell,
  isRealTitle,
  isRealTimeOn,
  planSharedIdentityMirror,
} from "../../lib/eventDetails/sharedEventIdentity";
import {
  pickGuestFacingDate,
  pickGuestFacingTime,
  pickGuestFacingTitle,
  resolveCentralEventDetails,
} from "../../lib/eventDetails/centralEventDetails";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const MALUL_EVENT = {
  _id: "6a849ece321a9794dabe496f",
  title: "הזמנה חדשה",
  eventType: "wedding",
  date: "2026-08-18",
  time: "00:00",
  location: { name: "יסמין", address: "חיפה" },
};

const MALUL_INVITATION = {
  _id: "6a849ece321a9794dabe497a",
  title: "דויד חיים מלול - בר מצווה",
  eventType: "bar-mitzvah",
  eventDate: "2026-10-11T00:00:00.000Z",
  eventTime: "19:30",
  location: { name: "יסמין", address: "חיפה" },
};

describe("shared event identity planner", () => {
  it("treats placeholder titles as shells and does not treat 00:00 alone as fake", () => {
    assert.equal(isRealTitle("הזמנה חדשה"), false);
    assert.equal(isIdentityShell({ title: "הזמנה חדשה", time: "00:00" }), true);
    assert.equal(isIdentityShell({ title: "בר המצווה של דויד", time: "00:00" }), false);
    assert.equal(
      isRealTimeOn({ title: "בר המצווה של דויד" }, "00:00"),
      true
    );
    assert.equal(isRealTimeOn({ title: "הזמנה חדשה" }, "00:00"), false);
  });

  it("invitation save mirrors real guest fields onto a shell Event", () => {
    const plan = planSharedIdentityMirror({
      source: "invitation",
      incoming: {
        title: MALUL_INVITATION.title,
        eventType: MALUL_INVITATION.eventType,
        date: "2026-10-11",
        time: "19:30",
        location: MALUL_INVITATION.location,
      },
      event: MALUL_EVENT,
      invitations: [MALUL_INVITATION],
      sourceInvitationId: String(MALUL_INVITATION._id),
    });

    assert.equal(plan.eventSet.title, "דויד חיים מלול - בר מצווה");
    assert.equal(plan.eventSet.date, "2026-10-11");
    assert.equal(plan.eventSet.time, "19:30");
    assert.equal(plan.eventSet.eventType, "bar-mitzvah");
    assert.equal(plan.invitationUpdates.length, 0);
    assert.equal(plan.conflicts.length, 0);
  });

  it("production edit does not overwrite a real invitation", () => {
    const plan = planSharedIdentityMirror({
      source: "event",
      incoming: {
        title: "שם מההפקה",
        eventType: "wedding",
        date: "2026-12-01",
        time: "20:00",
      },
      event: { title: "שם מההפקה", date: "2026-12-01", time: "20:00" },
      invitations: [MALUL_INVITATION],
    });

    assert.equal(plan.invitationUpdates.length, 0);
    assert.ok(plan.conflicts.some((row) => row.field === "title"));
    assert.ok(plan.conflicts.some((row) => row.field === "date"));
  });

  it("production edit fills a placeholder invitation without picking a primary", () => {
    const first = {
      _id: "inv-a",
      title: "הזמנה חדשה",
      eventDate: "",
      eventTime: "",
    };
    const second = {
      _id: "inv-b",
      title: "הזמנה חדשה",
      eventDate: "",
      eventTime: "",
    };
    const plan = planSharedIdentityMirror({
      source: "event",
      incoming: {
        title: "חתונת נועה",
        date: "2026-11-01",
        time: "19:00",
        eventType: "wedding",
      },
      event: { title: "חתונת נועה", date: "2026-11-01", time: "19:00" },
      invitations: [first, second],
    });

    assert.equal(plan.invitationUpdates.length, 2);
    assert.deepEqual(
      plan.invitationUpdates.map((row) => row.id).sort(),
      ["inv-a", "inv-b"]
    );
    assert.equal(plan.conflicts.length, 0);
  });

  it("productionOnly events have no invitation writes and no invitation is created", () => {
    const plan = planSharedIdentityMirror({
      source: "event",
      incoming: { title: "הפקת חברה", date: "2026-09-01", time: "09:00" },
      event: { title: "הפקת חברה", productionOnly: true },
      invitations: [],
    });
    assert.equal(plan.invitationUpdates.length, 0);
    assert.equal(classifySharedIdentity({ title: "הפקת חברה" }, null), "event-only-production");
  });

  it("classifies the production Malul mismatch as a safe Event-shell case", () => {
    assert.equal(
      classifySharedIdentity(MALUL_EVENT, MALUL_INVITATION),
      "event-shell-invitation-real"
    );
  });

  it("keeps a real midnight time on a named invitation", () => {
    const invitation = {
      title: "מסיבת סילבסטר",
      eventDate: "2026-12-31",
      eventTime: "00:00",
    };
    assert.equal(pickGuestFacingTitle({}, invitation), "מסיבת סילבסטר");
    assert.equal(pickGuestFacingTime({ time: "21:00" }, invitation), "00:00");
    assert.equal(pickGuestFacingDate({ date: "2026-01-01" }, invitation), "2026-12-31");
  });

  it("hides Event 00:00 and creation date when the Event is still a shell", () => {
    const details = resolveCentralEventDetails(MALUL_EVENT, MALUL_INVITATION);
    assert.equal(details.title, "דויד חיים מלול - בר מצווה");
    assert.equal(details.date, "2026-10-11");
    assert.equal(details.time, "19:30");
    assert.equal(pickGuestFacingTime(MALUL_EVENT, { title: "הזמנה חדשה" }), "");
  });
});

it("all shared-field write paths use the central layer and do not pick a primary invitation", () => {
  const files = [
    "app/api/invitations/[id]/route.ts",
    "app/api/invitations/route.ts",
    "app/api/invitations/update-location/route.ts",
    "app/api/events/route.ts",
    "app/api/events/[eventId]/overview/route.ts",
    "app/api/events/my-production/route.ts",
    "app/api/producer/events/[id]/route.ts",
    "app/api/venues/dashboard/events/[eventId]/route.ts",
    "app/api/wedding-challenges/settings/route.ts",
    "lib/venues/venueEventsService.ts",
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(
      source,
      /persistSharedIdentityMirror/,
      `${file} must write shared identity through the central layer`
    );
    assert.doesNotMatch(
      source,
      /pickPrimaryInvitation/,
      `${file} must not pick a primary invitation for identity sync`
    );
  }

  const weddingChallenges = read("app/api/wedding-challenges/settings/route.ts");
  assert.doesNotMatch(
    weddingChallenges,
    /Invitation\.updateOne\(\{\s*eventId/,
    "wedding challenges must not pick one invitation by eventId"
  );

  const persist = read("lib/eventDetails/persistSharedIdentity.ts");
  assert.doesNotMatch(persist, /canvasData|previewImage|guests|tables|rsvp/);
  assert.match(persist, /standaloneGame: \{ \$ne: true \}/);

  const eventPage = read("app/e/[shareId]/page.tsx");
  assert.match(eventPage, /resolveCentralEventDetails/);
  const ivr = read("lib/calls/ivrInboundResolve.ts");
  assert.match(ivr, /invitation\?\.eventDate/);
});

it("planner writes only identity fields and never guests, design, or seating", () => {
  const plan = planSharedIdentityMirror({
    source: "invitation",
    incoming: {
      title: MALUL_INVITATION.title,
      eventType: MALUL_INVITATION.eventType,
      date: "2026-10-11",
      time: "19:30",
      location: MALUL_INVITATION.location,
    },
    event: MALUL_EVENT,
    invitations: [MALUL_INVITATION],
    sourceInvitationId: String(MALUL_INVITATION._id),
  });

  const keys = Object.keys(plan.eventSet);
  for (const key of keys) {
    assert.doesNotMatch(
      key,
      /guest|rsvp|table|canvas|preview|image|design|seating/i
    );
  }
  assert.equal(plan.invitationUpdates.length, 0);
});
