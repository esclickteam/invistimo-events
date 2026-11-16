import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  experimentalTemplateDraft,
  linkDisplayRequestBody,
  LinkDisplayNotApproved,
  redactLinkDisplayRequest,
  sendLinkDisplayExperiment,
} from "../../lib/whatsapp/linkDisplayExperiment";
import { WHATSAPP_HEADER_PROBE_IMAGE_URL } from "../../lib/whatsapp/headerProbe";

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

test("nothing is sent until the confirm string is passed", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response("{}", { status: 200 });
  };
  await assert.rejects(
    () => sendLinkDisplayExperiment("no", { fetch: fetchImpl, apiKey: "test-key" }),
    LinkDisplayNotApproved
  );
  assert.equal(calls, 0);
});

test("an approved send posts the same link body and no media id", async () => {
  const seen: unknown[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    seen.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.TEST" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const sent = await sendLinkDisplayExperiment("SEND_ONE_APPROVED", {
    fetch: fetchImpl,
    apiKey: "test-key",
  });
  assert.equal(sent.messageId, "wamid.TEST");
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0], linkDisplayRequestBody());
});

test("customer sends still choose the header from the media flag", () => {
  const source = readFileSync("lib/whatsapp/sendRsvpTemplateMedia.ts", "utf8");
  assert.match(source, /resolveWhatsappHeaderMediaMode/);
  assert.doesNotMatch(source, /linkDisplayRequestBody|sendLinkDisplayExperiment/);
});

test("the fallback template is a different name and is not submitted by the send", () => {
  const draft = experimentalTemplateDraft();
  assert.equal(draft.name, "rsvp_invitation_display_trial");
  assert.notEqual(draft.name, "rsvp_invitation_media");
  const source = readFileSync("lib/whatsapp/linkDisplayExperiment.ts", "utf8");
  assert.doesNotMatch(source, /waba-v2\.360dialog\.io\/v1\/configs\/templates|\/configs\/templates/);
});
