import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  forwardSignatureVector,
  incomingText,
  normalizeIncomingWebhook,
  planWebhookEffects,
  signBizuplyForward,
  verifyBizuplyForward,
} from "../../lib/whatsapp/bizuplyForward";

const cloud = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "1042912532080617",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "1325815400610124" },
            messages: [
              { id: "wamid.TEXT", from: "972501112233", type: "text", text: { body: "שלום" } },
              { id: "wamid.BUTTON", from: "972501112233", type: "button", button: { text: "מגיע", payload: "event:evt-9" } },
              {
                id: "wamid.REPLY",
                from: "972501112233",
                type: "interactive",
                interactive: { type: "button_reply", button_reply: { id: "event:evt-9", title: "מגיע" } },
              },
            ],
            statuses: [
              { id: "wamid.OUT", status: "sent", recipient_id: "972501112233" },
              { id: "wamid.OUT", status: "delivered", recipient_id: "972501112233" },
              { id: "wamid.OUT", status: "read", recipient_id: "972501112233" },
              {
                id: "wamid.OUT",
                status: "failed",
                recipient_id: "972501112233",
                errors: [{ code: 131026, title: "undeliverable" }],
              },
            ],
          },
        },
      ],
    },
  ],
};

test("the shared signature vector matches and a Meta signature is rejected", () => {
  const vector = forwardSignatureVector();
  assert.equal(
    signBizuplyForward(vector.secret, vector.timestamp, vector.rawBody),
    vector.signature
  );
  assert.equal(
    verifyBizuplyForward({ ...vector, nowSec: 1760000000 }).ok,
    true
  );
  assert.equal(
    verifyBizuplyForward({
      ...vector,
      signature: "sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nowSec: 1760000000,
    }).ok,
    false
  );
});

test("a Cloud payload is unchanged, and text, buttons, and statuses are not applied twice", () => {
  assert.equal(normalizeIncomingWebhook(cloud), cloud);
  assert.equal(incomingText(cloud.entry[0].changes[0].value.messages[1]), "מגיע");
  const once = planWebhookEffects(cloud);
  const twice = planWebhookEffects(cloud, once);
  assert.deepEqual(once.inbound.map((row) => row.type), ["text", "button", "interactive"]);
  assert.equal(once.statuses.at(-1)?.status, "failed");
  assert.equal(twice.inbound.length, 0);
  assert.equal(twice.statuses.length, 0);
  assert.equal(twice.duplicates.length > 0, true);
  assert.deepEqual(once.rsvpWrites, []);
  assert.deepEqual(twice.rsvpWrites, []);
});

test("the live webhook verifies a forward and still accepts an unsigned 360dialog body", () => {
  const route = readFileSync("app/api/webhooks/whatsapp/route.ts", "utf8");
  assert.match(route, /readForwardHeaders/);
  assert.match(route, /INVALID_FORWARD_SIGNATURE/);
  assert.match(route, /normalizeIncomingWebhook/);
  assert.doesNotMatch(route, /InvitationGuest|rsvpStatus|guest\.rsvp/);
  const legacy = normalizeIncomingWebhook({
    messages: [{ id: "wamid.LEGACY", type: "text", text: { body: "legacy" } }],
    statuses: [{ id: "wamid.OUT.9", status: "delivered" }],
  });
  assert.equal(legacy.entry[0].changes[0].value.messages[0].id, "wamid.LEGACY");
  assert.equal(legacy.entry[0].changes[0].value.statuses[0].status, "delivered");
});
