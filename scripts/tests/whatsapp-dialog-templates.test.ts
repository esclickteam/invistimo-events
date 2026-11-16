import test from "node:test";
import assert from "node:assert/strict";

import {
  invistimoExpectedHeader,
  readLiveDialogTemplateHeaders,
  summarizeDialogTemplateHeaders,
} from "../../lib/whatsapp/dialogTemplateHeaders";

const payload = {
  waba_templates: [
    {
      name: "rsvp_invitation_media",
      language: "he",
      status: "approved",
      category: "MARKETING",
      components: [
        {
          type: "HEADER",
          format: "IMAGE",
          example: { header_handle: ["https://cdn.example.com/sample.jpg?token=secret"] },
        },
        { type: "BODY", text: "{{1}} {{2}} {{3}}" },
        {
          type: "BUTTONS",
          buttons: [{ type: "URL", url: "https://www.invistimo.com/invite/{{1}}" }],
        },
      ],
    },
    { name: "unrelated_template", language: "en", status: "approved", components: [] },
  ],
};

test("the live template summary keeps header format and drops secrets", () => {
  const rows = summarizeDialogTemplateHeaders(payload);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].headerFormat, "IMAGE");
  assert.equal(rows[0].exampleHost, "cdn.example.com");
  assert.equal(rows[0].bodyVariables, 3);
  assert.deepEqual(rows[0].buttonTypes, ["URL"]);
  assert.equal(rows[0].buttonUrlHost, "www.invistimo.com");
  assert.equal(JSON.stringify(rows).includes("secret"), false);
  assert.equal(invistimoExpectedHeader("rsvp_invitation_media").headerFormat, "IMAGE");
});

test("reading templates sends the key only as a header and does not return it", async () => {
  let seen = "";
  const result = await readLiveDialogTemplateHeaders(
    (async (_url, init) => {
      seen = String((init as any)?.headers?.["D360-API-KEY"] || "");
      return new Response(JSON.stringify(payload), { status: 200 });
    }) as typeof fetch,
    "live-key"
  );
  assert.equal(seen, "live-key");
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes("live-key"), false);
  assert.equal(result.templates[0].headerFormat, "IMAGE");
});
