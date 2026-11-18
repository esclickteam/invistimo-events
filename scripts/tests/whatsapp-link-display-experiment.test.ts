import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  experimentalTemplateDraft,
  LINK_DISPLAY_EXPERIMENT_ARMED,
  linkDisplayCronAuthorized,
  linkDisplayRequestBody,
  LinkDisplayNotApproved,
  ONE_HEADER_PROBE_PHRASE,
  oneHeaderProbeSendAllowed,
  redactLinkDisplayRequest,
  resetOneHeaderProbeSendForTests,
  sendLinkDisplayExperiment,
} from "../../lib/whatsapp/linkDisplayExperiment";
import {
  WHATSAPP_HEADER_PROBE_IMAGE_URL,
  WHATSAPP_HEADER_PROBE_RECIPIENT,
} from "../../lib/whatsapp/headerProbe";

const ownerApproval = {
  phrase: ONE_HEADER_PROBE_PHRASE,
  to: WHATSAPP_HEADER_PROBE_RECIPIENT,
} as const;

test("the isolated check forces image.link and ignores the media flag", () => {
  const previous = process.env.WHATSAPP_HEADER_MEDIA;
  process.env.WHATSAPP_HEADER_MEDIA = "id";
  try {
    const body = linkDisplayRequestBody("972500000000");
    const header = body.template.components[0] as {
      parameters: Array<{ image: { link?: string; id?: string } }>;
    };
    const image = header.parameters[0].image;
    assert.equal(body.template.name, "rsvp_invitation_media");
    assert.equal(body.template.language.code, "he");
    assert.equal(body.template.components.length, 3);
    assert.equal(image.link, WHATSAPP_HEADER_PROBE_IMAGE_URL);
    assert.equal(image.id, undefined);
    assert.equal(
      (body.template.components[1] as { parameters: unknown[] }).parameters.length,
      3
    );
    assert.equal(
      (body.template.components[2] as { sub_type: string; index: string }).sub_type,
      "url"
    );
    assert.equal(
      (body.template.components[2] as { index: string }).index,
      "0"
    );
  } finally {
    if (previous == null) delete process.env.WHATSAPP_HEADER_MEDIA;
    else process.env.WHATSAPP_HEADER_MEDIA = previous;
  }
});

test("the preview hides the phone and the button token", () => {
  const shown = JSON.stringify(redactLinkDisplayRequest(linkDisplayRequestBody()));
  assert.match(shown, /\[redacted\]/);
  assert.doesNotMatch(shown, /9725\d{6,}/);
  assert.doesNotMatch(shown, /token=display/);
  assert.match(shown, /image":\{"link":"https:\/\/res\.cloudinary\.com\//);
  assert.doesNotMatch(shown, /"id":/);
});

test("nothing is sent without the owner phrase, and another number is refused", async () => {
  resetOneHeaderProbeSendForTests();
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response("{}", { status: 200 });
  };
  assert.equal(oneHeaderProbeSendAllowed(null), false);
  assert.equal(oneHeaderProbeSendAllowed({ phrase: ONE_HEADER_PROBE_PHRASE, to: "972500000000" }), false);
  await assert.rejects(
    () => sendLinkDisplayExperiment(null, { fetch: fetchImpl, apiKey: "test-key" }),
    LinkDisplayNotApproved
  );
  await assert.rejects(
    () =>
      sendLinkDisplayExperiment(
        { phrase: ONE_HEADER_PROBE_PHRASE, to: "972500000000" },
        { fetch: fetchImpl, apiKey: "test-key" }
      ),
    LinkDisplayNotApproved
  );
  assert.equal(calls, 0);
});

test("an explicit approval posts one link body and then refuses a second send", async () => {
  resetOneHeaderProbeSendForTests();
  const seen: unknown[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    seen.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.TEST" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const sent = await sendLinkDisplayExperiment(ownerApproval, {
    fetch: fetchImpl,
    apiKey: "test-key",
  });
  assert.equal(sent.messageId, "wamid.TEST");
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0], linkDisplayRequestBody());
  const image = (seen[0] as { template: { components: Array<{ parameters: Array<{ image?: { id?: string; link?: string }; text?: string }> }> } }).template.components[0].parameters[0].image;
  assert.equal(image?.id, undefined);
  assert.equal(image?.link, WHATSAPP_HEADER_PROBE_IMAGE_URL);
  await assert.rejects(
    () => sendLinkDisplayExperiment(ownerApproval, { fetch: fetchImpl, apiKey: "test-key" }),
    LinkDisplayNotApproved
  );
  assert.equal(seen.length, 1);
});

test("the cron is closed unless the existing secret matches, and the one send is armed", () => {
  assert.equal(LINK_DISPLAY_EXPERIMENT_ARMED, true);
  assert.equal(linkDisplayCronAuthorized("", "Bearer secret"), false);
  assert.equal(linkDisplayCronAuthorized("secret", "Bearer other"), false);
  assert.equal(linkDisplayCronAuthorized("secret", "Bearer secret"), true);
  const route = readFileSync("app/api/cron/whatsapp-link-display/route.ts", "utf8");
  assert.doesNotMatch(route, /x-vercel-cron/);
  const customer = readFileSync("lib/whatsapp/sendRsvpTemplateMedia.ts", "utf8");
  assert.doesNotMatch(customer, /linkDisplay|ONE_HEADER_PROBE/);
});

test("customer sends attach a media id and do not read the old link flag", () => {
  const source = readFileSync("lib/whatsapp/sendRsvpTemplateMedia.ts", "utf8");
  assert.match(source, /uploadWhatsAppHeaderMedia/);
  assert.match(source, /image:\s*\{\s*id: mediaId/);
  assert.doesNotMatch(source, /resolveWhatsappHeaderMediaMode|image:\s*\{\s*link/);
  assert.doesNotMatch(source, /linkDisplayRequestBody|sendLinkDisplayExperiment/);
});

test("the fallback template is a different name and is not submitted by the send", () => {
  const draft = experimentalTemplateDraft();
  assert.equal(draft.name, "rsvp_invitation_display_trial");
  assert.notEqual(draft.name, "rsvp_invitation_media");
  const source = readFileSync("lib/whatsapp/linkDisplayExperiment.ts", "utf8");
  assert.doesNotMatch(source, /waba-v2\.360dialog\.io\/v1\/configs\/templates|\/configs\/templates/);
});
