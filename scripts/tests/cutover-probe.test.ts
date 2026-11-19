import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CUTOVER_PROBE_ID,
  CUTOVER_PROBE_IMAGE_URL,
  CUTOVER_PROBE_PHONE_DIGITS,
  CUTOVER_PROBE_TEMPLATE_NAME,
  CUTOVER_PROBE_PHONE_WINDOW_MS,
  acceptProbeEvent,
  buildCutoverProbeRequest,
  classifyCutoverProbeInbound,
  classifyCutoverProbeStatus,
  cutoverProbeImageIsSafe,
  emptyCutoverProbeRegistry,
  registerCutoverProbeWamid,
  registryFromRegistrations,
} from "../../lib/whatsapp/cutoverProbe";

const NO_WRITES = {
  customerFile: false,
  customerLeadMessage: false,
  guest: false,
  event: false,
  rsvpStatus: false,
};

test("the probe request keeps the approved template and an isolated button", () => {
  const request = buildCutoverProbeRequest();
  const template = request.body.template;
  assert.equal(template.name, CUTOVER_PROBE_TEMPLATE_NAME);
  assert.equal(template.name, "rsvp_invitation_media");
  assert.equal(template.language.code, "he");
  assert.equal(request.body.to, CUTOVER_PROBE_PHONE_DIGITS);
  assert.equal(template.components[2].parameters[0].text, CUTOVER_PROBE_ID);
  assert.equal(template.components[0].parameters[0].image.link, CUTOVER_PROBE_IMAGE_URL);
  assert.equal(request.body.biz_opaque_callback_data, CUTOVER_PROBE_ID);
  assert.equal(cutoverProbeImageIsSafe(), true);
  assert.equal(JSON.stringify(request).includes("Authorization"), false);
  assert.equal(JSON.stringify(request).includes("access_token"), false);
});

test("a reply to the registered probe does not write existing records", () => {
  const registry = registerCutoverProbeWamid(emptyCutoverProbeRegistry(), "wamid.PROBE");
  const reply = classifyCutoverProbeInbound(
    {
      id: "wamid.REPLY",
      from: "972526850711",
      type: "text",
      text: { body: "קיבלתי" },
      context: { id: "wamid.PROBE" },
    },
    registry
  );
  assert.equal(reply?.isolated, true);
  assert.deepEqual(reply?.writes, NO_WRITES);
  assert.equal(reply?.wamid, "wamid.REPLY");
  assert.equal(reply?.contextWamid, "wamid.PROBE");
});

test("a normal business message from the probe phone stays on the existing path", () => {
  const now = Date.parse("2026-11-19T08:00:00.000Z");
  const registry = registryFromRegistrations(
    [{ wamid: "wamid.PROBE", createdAt: now - 60_000 }],
    now
  );
  assert.equal(registry.open, true);
  const business = classifyCutoverProbeInbound(
    { id: "wamid.BUSINESS", from: "+972526850711", type: "text", text: { body: "הגעתי לאירוע" } },
    registry
  );
  assert.equal(business, null);
  const beforeAnySend = classifyCutoverProbeInbound(
    { id: "wamid.EARLY", from: "0526850711", type: "text", text: { body: "שלום" } },
    emptyCutoverProbeRegistry()
  );
  assert.equal(beforeAnySend, null);
  const expired = registryFromRegistrations(
    [{ wamid: "wamid.PROBE", createdAt: now - CUTOVER_PROBE_PHONE_WINDOW_MS - 1 }],
    now
  );
  assert.equal(expired.open, false);
  const lateReply = classifyCutoverProbeInbound(
    {
      id: "wamid.LATE",
      from: "972526850711",
      type: "text",
      text: { body: "מגיע" },
      context: { id: "wamid.PROBE" },
    },
    expired
  );
  assert.equal(lateReply, null);
});

test("a status webhook registers the probe wamid before any earlier save exists", () => {
  const early = classifyCutoverProbeStatus(
    {
      id: "wamid.PROBE",
      status: "sent",
      recipient_id: "972526850711",
      biz_opaque_callback_data: CUTOVER_PROBE_ID,
    },
    emptyCutoverProbeRegistry()
  );
  assert.equal(early?.isolated, true);
  assert.equal(early?.ensureRegistration, true);
  assert.deepEqual(early?.writes, NO_WRITES);

  const seen = new Set<string>();
  const first = acceptProbeEvent(seen, early!);
  const second = acceptProbeEvent(seen, early!);
  assert.equal(first.stored, true);
  assert.equal(second.duplicate, true);
  assert.equal(second.stored, false);

  const ordinaryStatus = classifyCutoverProbeStatus(
    { id: "wamid.REAL", status: "delivered", recipient_id: "972526850711" },
    emptyCutoverProbeRegistry()
  );
  assert.equal(ordinaryStatus, null);
  const registered = registerCutoverProbeWamid(emptyCutoverProbeRegistry(), "wamid.PROBE");
  const followUp = classifyCutoverProbeStatus(
    { id: "wamid.PROBE", status: "delivered", recipient_id: "972526850711" },
    registered
  );
  assert.equal(followUp?.isolated, true);
  assert.equal(followUp?.ensureRegistration, false);
});

test("the live webhook records a probe before it can update leads, guests, or RSVP", () => {
  const route = readFileSync("app/api/webhooks/whatsapp/route.ts", "utf8");
  const inboundAt = route.indexOf("classifyCutoverProbeInbound");
  const saveAt = route.indexOf("saveIncomingWhatsappMessage");
  const statusAt = route.indexOf("classifyCutoverProbeStatus");
  const queueAt = route.indexOf("updateWhatsappQueueStatus");
  assert.ok(inboundAt > 0 && inboundAt < saveAt);
  assert.ok(statusAt > 0 && statusAt < queueAt);
  assert.match(route, /recordCutoverProbe\(probeInbound\)/);
  assert.match(route, /recordCutoverProbe\(probeStatus\)/);
  assert.match(route, /emptyCutoverProbeRegistry/);
  const store = readFileSync("lib/whatsapp/cutoverProbeStore.ts", "utf8");
  const registrationAt = store.indexOf("registerCutoverProbeSend(decision.wamid)");
  const eventAt = store.lastIndexOf("updateOne");
  assert.ok(registrationAt > 0 && registrationAt < eventAt);
  assert.match(store, /upsert: true/);
  assert.doesNotMatch(store, /CustomerFile|CustomerLeadMessage|InvitationGuest|rsvpStatus/);
  assert.doesNotMatch(store, /from ["']@\/models\/(?!CutoverProbeEvent)/);
});
