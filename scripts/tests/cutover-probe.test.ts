import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CUTOVER_PROBE_ID,
  CUTOVER_PROBE_IMAGE_URL,
  CUTOVER_PROBE_PHONE_DIGITS,
  CUTOVER_PROBE_TEMPLATE_NAME,
  acceptProbeEvent,
  buildCutoverProbeRequest,
  classifyCutoverProbeInbound,
  classifyCutoverProbeStatus,
  cutoverProbeImageIsSafe,
  emptyCutoverProbeRegistry,
  registerCutoverProbeWamid,
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

test("a plain reply from the probe phone is isolated only during the two-hour window", () => {
  const closed = emptyCutoverProbeRegistry();
  const ordinary = classifyCutoverProbeInbound(
    { id: "wamid.OTHER", from: "0526850711", type: "text", text: { body: "שלום" } },
    closed
  );
  assert.equal(ordinary, null);

  const open = registerCutoverProbeWamid(closed, "wamid.PROBE");
  const duringProbe = classifyCutoverProbeInbound(
    { id: "wamid.DURING", from: "+972526850711", type: "text", text: { body: "הגעתי" } },
    open
  );
  assert.equal(duringProbe?.isolated, true);
  assert.deepEqual(duringProbe?.writes, NO_WRITES);

  const someoneElse = classifyCutoverProbeInbound(
    { id: "wamid.GUEST", from: "972501111111", type: "text", text: { body: "מגיע" } },
    open
  );
  assert.equal(someoneElse, null);

  const expired = registerCutoverProbeWamid(closed, "wamid.PROBE", { isolatePhone: false });
  const laterReply = classifyCutoverProbeInbound(
    { id: "wamid.LATER", from: "972526850711", type: "text", text: { body: "מגיע לאירוע" } },
    expired
  );
  assert.equal(laterReply, null);
  const laterContext = classifyCutoverProbeInbound(
    {
      id: "wamid.LATER_CONTEXT",
      from: "972526850711",
      type: "text",
      text: { body: "מגיע לאירוע" },
      context: { id: "wamid.PROBE" },
    },
    expired
  );
  assert.equal(laterContext?.isolated, true);
  assert.deepEqual(laterContext?.writes, NO_WRITES);
});

test("delivery statuses for the probe wamid stay isolated and are not applied twice", () => {
  const registry = registerCutoverProbeWamid(emptyCutoverProbeRegistry(), "wamid.PROBE");
  const seen = new Set<string>();
  const delivered = classifyCutoverProbeStatus(
    { id: "wamid.PROBE", status: "delivered", recipient_id: "972526850711" },
    registry
  );
  assert.ok(delivered);
  assert.deepEqual(delivered.writes, NO_WRITES);
  const first = acceptProbeEvent(seen, delivered);
  const second = acceptProbeEvent(seen, delivered);
  assert.equal(first.stored, true);
  assert.equal(second.duplicate, true);
  assert.equal(second.stored, false);

  const unrelated = classifyCutoverProbeStatus(
    { id: "wamid.REAL", status: "delivered", recipient_id: "972526850711" },
    registry
  );
  assert.equal(unrelated, null);
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
  const store = readFileSync("lib/whatsapp/cutoverProbeStore.ts", "utf8");
  assert.doesNotMatch(store, /CustomerFile|CustomerLeadMessage|InvitationGuest|rsvpStatus/);
  assert.doesNotMatch(store, /from ["']@\/models\/(?!CutoverProbeEvent)/);
});
