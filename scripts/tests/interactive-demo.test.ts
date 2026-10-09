import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bridgeDemoRequest } from "../../lib/demo/interactive/bridge";
import { shouldBlockProductionApi } from "../../lib/demo/interactive/guard";
import {
  packDemoSession,
  unpackDemoSession,
} from "../../lib/demo/interactive/sessionPack";
import {
  addGuest,
  assignGuestToTable,
  createSession,
  dropSession,
  expireSession,
  getSession,
  hydrateSession,
  resetSession,
  saveLead,
  simulateIvrDigit,
  simulateMessageRound,
  syncCheckIn,
} from "../../lib/demo/interactive/store";
import { DEMO_TOUR_STEPS } from "../../lib/demo/interactive/tour";

test("demo sessions stay isolated from each other", () => {
  const a = createSession();
  const b = createSession();
  try {
    const added = addGuest(a.id, { name: "אורח של א", phone: "0500000001" });
    assert.ok(added);
    const freshA = getSession(a.id);
    const freshB = getSession(b.id);
    assert.equal(freshA?.guests.some((guest) => guest.name === "אורח של א"), true);
    assert.equal(freshB?.guests.some((guest) => guest.name === "אורח של א"), false);
    assert.notEqual(a.id, b.id);
  } finally {
    dropSession(a.id);
    dropSession(b.id);
  }
});

test("guest edits, IVR digits, seating and check-in update the same demo event", () => {
  const session = createSession();
  try {
    const before = session.guests.find((guest) => guest._id === "g-noa");
    assert.equal(before?.rsvp, "pending");

    const digit = simulateIvrDigit(session.id, "g-noa", "1");
    assert.equal(digit?.guests.find((guest) => guest._id === "g-noa")?.rsvp, "yes");
    assert.equal(simulateIvrDigit(session.id, "g-shira", "2")?.guests.find((g) => g._id === "g-shira")?.rsvp, "no");
    assert.equal(simulateIvrDigit(session.id, "g-itai", "3")?.guests.find((g) => g._id === "g-itai")?.rsvp, "maybe");

    const seated = assignGuestToTable(session.id, "g-noa", "table-4");
    assert.equal(seated?.guests.find((guest) => guest._id === "g-noa")?.tableName, "שולחן 4");
    const table = seated?.tables.find((item) => item.id === "table-4");
    assert.ok((table?.seatedGuests.length || 0) > 0);

    const checked = syncCheckIn(session.id, [{ token: "dmo_noa", checkedInGuestCount: 1 }]);
    assert.equal(checked?.guests.find((guest) => guest._id === "g-noa")?.actualArrivedCount, 1);
  } finally {
    dropSession(session.id);
  }
});

test("message rounds are simulated and reset restores the seed", () => {
  const session = createSession();
  try {
    const sent = simulateMessageRound(session.id, {
      channel: "whatsapp",
      type: "rsvp",
      round: 1,
    });
    assert.ok(sent);
    assert.equal(sent.session.messages[0]?.simulated, true);
    assert.match(sent.session.activity[0]?.label || "", /לא נשלחה הודעה אמיתית/);
    assert.equal((sent.session.invitation as any).rsvpRoundSent.round1.channel, "whatsapp");

    addGuest(session.id, { name: "זמני", phone: "0520000000" });
    const reset = resetSession(session.id);
    assert.equal(reset?.guests.some((guest) => guest.name === "זמני"), false);
    assert.equal(reset?.messages.length, 0);
    assert.equal(reset?.guests.length, session.guests.length);
  } finally {
    dropSession(session.id);
  }
});

test("expired demo session is rejected", () => {
  const session = createSession();
  expireSession(session.id);
  assert.equal(getSession(session.id), null);
});

test("lead details stay on the demo inquiry list", () => {
  const session = createSession();
  try {
    const lead = saveLead(session.id, {
      name: "דנה",
      phone: "0501234567",
      email: "dana@example.com",
    });
    assert.equal(lead?.sessionId, session.id);
    assert.equal(getSession(session.id)?.lead?.name, "דנה");
    assert.equal(getSession(session.id)?.guests.some((guest) => guest.name === "דנה"), false);
  } finally {
    dropSession(session.id);
  }
});

test("demo bridge blocks real sends and serves customer data from the session", () => {
  const session = createSession();
  try {
    const me = bridgeDemoRequest(session, "GET", "/api/me", null);
    assert.equal(me.json.success, true);
    assert.equal((me.json.user as any).role, "user");
    assert.equal((me.json.user as any).callsType, "ivr");
    assert.notEqual((me.json.user as any).role, "admin");

    const guests = bridgeDemoRequest(session, "GET", "/api/guests?invitation=demo-invitation", null);
    assert.equal((guests.json.guests as any[]).length, session.guests.length);

    const send = bridgeDemoRequest(session, "POST", "/api/whatsapp/send-template", {
      type: "rsvp",
      round: 1,
      guestIds: ["g-noa"],
      templateName: "rsvp_invitation_media",
    });
    assert.equal(send.json.success, true);
    assert.equal(send.json.simulated, true);

    const sms = bridgeDemoRequest(session, "POST", "/api/sms/send", {
      templateKey: "rsvp",
      round: 1,
      guestIds: ["g-shira"],
    });
    assert.equal(sms.json.simulated, true);

    const stripe = bridgeDemoRequest(session, "POST", "/api/stripe/checkout", { amount: 100 });
    assert.equal(stripe.status, 403);
    assert.equal(stripe.json.code, "DEMO_ISOLATED");

    const admin = bridgeDemoRequest(session, "GET", "/api/admin/manage-user", null);
    assert.equal((admin.json as any).isManaging, false);
  } finally {
    dropSession(session.id);
  }
});

test("production API calls from the demo surface are blocked", () => {
  assert.equal(
    shouldBlockProductionApi({
      pathname: "/api/guests",
      surface: "demo",
    }),
    true
  );
  assert.equal(
    shouldBlockProductionApi({
      pathname: "/api/demo/interactive",
      surface: "demo",
      referer: "https://www.invistimo.com/try/dashboard",
    }),
    false
  );
  assert.equal(
    shouldBlockProductionApi({
      pathname: "/api/guests",
      referer: "https://www.invistimo.com/try/dashboard",
    }),
    true
  );
  assert.equal(
    shouldBlockProductionApi({
      pathname: "/api/guests",
      referer: "https://www.invistimo.com/dashboard",
    }),
    false
  );
  assert.equal(
    shouldBlockProductionApi({
      pathname: "/api/me",
      surface: "demo",
      referer: "https://www.invistimo.com/try/dashboard",
    }),
    false
  );
});

test("guided tour covers the customer journey on real controls", () => {
  assert.equal(DEMO_TOUR_STEPS.length, 10);
  const ids = DEMO_TOUR_STEPS.map((step) => step.id);
  assert.deepEqual(ids, [
    "dashboard",
    "add-guest",
    "guest-link",
    "messages",
    "ivr",
    "calls",
    "seating",
    "check-in",
    "reports",
    "more",
  ]);
  for (const step of DEMO_TOUR_STEPS) {
    assert.ok(step.selector);
    assert.ok(step.route.startsWith("/try/dashboard"));
    assert.equal(step.route.includes("/admin"), false);
    assert.ok(step.learn.length > 0);
    assert.ok(step.body.length < 220);
  }
  const actionSteps = DEMO_TOUR_STEPS.filter((step) => step.advance === "action");
  assert.ok(actionSteps.length >= 4);
});

test("demo engine does not import production models", () => {
  const files = [
    "lib/demo/interactive/store.ts",
    "lib/demo/interactive/bridge.ts",
    "lib/demo/interactive/seed.ts",
    "app/api/demo/interactive/bridge/route.ts",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("mongoose"), false, file);
    assert.equal(source.includes("models/"), false, file);
  }
});

test("tour targets exist on the customer screens", () => {
  const sources = {
    "[data-tour='add-guest']": readFileSync("app/components/GuestsControls.tsx", "utf8"),
    "[data-tour='guest-link']": readFileSync("app/dashboard/page.tsx", "utf8"),
    "[data-tour='call-task']": readFileSync("app/dashboard/page.tsx", "utf8"),
    "[data-tour='message-send']": readFileSync("app/dashboard/messages/new/shared/SendButton.tsx", "utf8"),
    "[data-tour='ivr-keypad']": readFileSync("app/try/dashboard/recorded-calls/page.tsx", "utf8"),
    "[data-tour='seating-guest']": readFileSync("app/dashboard/seating/SeatingSidebar.tsx", "utf8"),
    "[data-tour='checkin-search']": readFileSync("app/dashboard/check-in/CheckInHostClient.tsx", "utf8"),
    "[data-tour='customer-nav']": readFileSync("app/dashboard/components/DashboardSidebar.tsx", "utf8"),
    "#rsvp-stats": readFileSync("app/dashboard/page.tsx", "utf8"),
  };
  for (const [selector, source] of Object.entries(sources)) {
    const needle = selector.includes("data-tour")
      ? selector.replace("[data-tour='", 'data-tour="').replace("']", '"').replace("[data-tour=\"", 'data-tour="')
      : 'id="rsvp-stats"';
    const token = selector.startsWith("#")
      ? "rsvp-stats"
      : selector.slice(selector.indexOf("'") + 1, selector.lastIndexOf("'"));
    const plain = selector.startsWith("#")
      ? 'id="rsvp-stats"'
      : `data-tour="${token}"`;
    assert.equal(
      source.includes(plain) ||
        source.includes(`dataTour="${token}"`) ||
        source.includes(`"${token}"`),
      true,
      plain
    );
  }
});

test("a packed demo session survives a cleared server memory", () => {
  const session = createSession();
  addGuest(session.id, { name: "בדיקת עוגייה", phone: "0501111111" });
  const packed = packDemoSession(getSession(session.id)!);
  dropSession(session.id);
  assert.equal(getSession(session.id), null);
  const restored = unpackDemoSession(packed);
  assert.ok(restored);
  hydrateSession(restored!);
  const again = getSession(session.id);
  assert.equal(again?.guests.some((guest) => guest.name === "בדיקת עוגייה"), true);
  assert.equal(again?.guests.some((guest) => guest.name === "לקוח אמיתי"), false);
  dropSession(session.id);
});
