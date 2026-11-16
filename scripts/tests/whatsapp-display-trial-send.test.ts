import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { WHATSAPP_HEADER_PROBE_IMAGE_URL } from "../../lib/whatsapp/headerProbe";
import {
  displayTrialSendAllowed,
  displayTrialSendBody,
  sendDisplayTrialOnce,
} from "../../lib/whatsapp/displayTrialSend";
import type { LinkDisplayLockStore } from "../../lib/whatsapp/linkDisplayExperiment";

function memoryStore(): LinkDisplayLockStore & { claims: number } {
  let claimed = false;
  return {
    claims: 0,
    async claim() {
      this.claims += 1;
      if (claimed) return "already";
      claimed = true;
      return "claimed";
    },
    async complete() {},
    async fail() {},
  };
}

test("the trial send is locked to the new template, the JPEG link, and the QA button", () => {
  const body = displayTrialSendBody();
  assert.equal(displayTrialSendAllowed(body), true);
  assert.equal(body.template.name, "rsvp_invitation_display_trial");
  assert.notEqual(body.template.name, "rsvp_invitation_media");
  assert.equal(body.to, "972526850711");
  assert.equal(body.template.components[0].parameters[0].image.link, WHATSAPP_HEADER_PROBE_IMAGE_URL);
  assert.equal(body.template.components[0].parameters[0].image.id, undefined);
  assert.equal(body.template.components[1].parameters.length, 3);
  assert.equal(body.template.components[2].parameters[0].text, "header-probe?token=display");
  const customer = readFileSync("lib/whatsapp/sendRsvpTemplateMedia.ts", "utf8");
  assert.doesNotMatch(customer, /rsvp_invitation_display_trial|sendDisplayTrialOnce/);
  const route = readFileSync("app/api/cron/whatsapp-display-trial-send/route.ts", "utf8");
  assert.doesNotMatch(route, /x-vercel-cron/);
});

test("a second claim does not post another message", async () => {
  const store = memoryStore();
  const seen: string[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    seen.push(String(init?.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.TRIAL" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const sent = await sendDisplayTrialOnce({ fetch: fetchImpl, apiKey: "test-key", store });
  assert.equal(sent.messageId, "wamid.TRIAL");
  await assert.rejects(
    () => sendDisplayTrialOnce({ fetch: fetchImpl, apiKey: "test-key", store }),
    /refused/
  );
  assert.equal(seen.length, 1);
  const posted = JSON.parse(seen[0]);
  assert.equal(posted.template.name, "rsvp_invitation_display_trial");
  assert.equal(posted.template.components[0].parameters[0].image.id, undefined);
});
