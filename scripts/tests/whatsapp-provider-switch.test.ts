import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import sharp from "sharp";

import { toBizuplyTemplateBody } from "../../lib/whatsapp/provider/bizuplyProvider";
import { resolveWhatsAppProviderId } from "../../lib/whatsapp/provider";
import { classifyWhatsappSendError } from "../../lib/whatsapp/roundDeliveryTracking";
import { sendRsvpTemplateMedia } from "../../lib/whatsapp/sendRsvpTemplateMedia";
import { clearWhatsAppHeaderMediaCache } from "../../lib/whatsapp/uploadHeaderMedia";

const headerUrl =
  "https://res.cloudinary.com/dnbewcz79/image/upload/v1/invistimo/invitations/provider.png";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("the default provider stays 360dialog until the setting changes", () => {
  const previous = process.env.WHATSAPP_PROVIDER;
  delete process.env.WHATSAPP_PROVIDER;
  try {
    assert.equal(resolveWhatsAppProviderId(), "dialog");
    assert.equal(resolveWhatsAppProviderId("360dialog"), "dialog");
    assert.equal(resolveWhatsAppProviderId("bizuply"), "bizuply");
    assert.throws(() => resolveWhatsAppProviderId("other"), /Unsupported WHATSAPP_PROVIDER/);
  } finally {
    if (previous == null) delete process.env.WHATSAPP_PROVIDER;
    else process.env.WHATSAPP_PROVIDER = previous;
  }
});

test("RSVP sends the unchanged header link on both providers and does not upload media", async () => {
  clearWhatsAppHeaderMediaCache();
  const previousMedia = process.env.WHATSAPP_HEADER_MEDIA;
  process.env.WHATSAPP_HEADER_MEDIA = "id";
  const previousProvider = process.env.WHATSAPP_PROVIDER;
  const previousDialog = process.env.WHATSAPP_API_KEY;
  const previousBizuply = process.env.BIZUPLY_WHATSAPP_API_KEY;
  delete process.env.WHATSAPP_PROVIDER;
  process.env.WHATSAPP_API_KEY = "dialog-key";
  process.env.BIZUPLY_WHATSAPP_API_KEY = "biz_live_test";

  const file = await sharp({
    create: { width: 40, height: 24, channels: 3, background: "#336699" },
  })
    .png()
    .toBuffer();
  const hosts: string[] = [];
  const dialogLinks: string[] = [];
  const bizuplyLinks: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => {
    const method = String(init?.method || "GET").toUpperCase();
    const target = String(url);
    if (method !== "POST") {
      return new Response(file, {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(file.length) },
      });
    }
    hosts.push(new URL(target).host);
    if (target.includes("360dialog.io/media")) {
      assert.equal(init.headers["D360-API-KEY"], "dialog-key");
      const form = init.body as FormData;
      const media = form.get("file");
      assert.ok(media instanceof File);
      assert.equal(media.name, "header.png");
      assert.equal(Buffer.from(await media.arrayBuffer()).equals(file), true);
      return jsonResponse({ id: "dialog-media" });
    }
    if (target.includes("360dialog.io/messages")) {
      const payload = JSON.parse(init.body);
      const image = payload.template.components[0].parameters[0].image;
      assert.equal(image.id, undefined);
      dialogLinks.push(image.link);
      return jsonResponse({ messages: [{ id: "wamid.dialog" }] });
    }
    if (target.includes("api.bizuply.com") && target.endsWith("/media")) {
      assert.equal(init.headers.Authorization, "Bearer biz_live_test");
      return jsonResponse({ id: "bizuply-media", mediaId: "bizuply-media" });
    }
    if (target.includes("api.bizuply.com") && target.endsWith("/messages/template")) {
      const payload = JSON.parse(init.body);
      assert.equal(payload.header.image.id, undefined);
      bizuplyLinks.push(payload.header.image.link);
      assert.equal(payload.buttonUrlParams[0], "abc?token=t");
      return jsonResponse({
        success: true,
        messageId: "bizmsg_1",
        metaMessageId: "wamid.bizuply",
        status: "accepted",
      });
    }
    throw new Error(`unexpected request ${target}`);
  }) as typeof fetch;

  const input = {
    to: "0526850711",
    templateName: "rsvp_invitation_media",
    headerImageUrl: headerUrl,
    eventTitle: "אירוע",
    eventDate: "11.11.2026",
    eventLocation: "אולם",
    urlSuffix: "abc?token=t",
  };

  try {
    const dialog = await sendRsvpTemplateMedia(input);
    process.env.WHATSAPP_PROVIDER = "bizuply";
    process.env.INVISTIMO_BIZUPLY_SENDS = "RELEASED";
    process.env.INVISTIMO_BIZUPLY_SEND_CONFIRM = "RELEASE_INVISTIMO_BIZUPLY_SENDS";
    const bizuply = await sendRsvpTemplateMedia(input);
    assert.equal(dialog.messageId, "wamid.dialog");
    assert.equal(bizuply.messageId, "wamid.bizuply");
  } finally {
    globalThis.fetch = originalFetch;
    clearWhatsAppHeaderMediaCache();
    if (previousProvider == null) delete process.env.WHATSAPP_PROVIDER;
    else process.env.WHATSAPP_PROVIDER = previousProvider;
    delete process.env.INVISTIMO_BIZUPLY_SENDS;
    delete process.env.INVISTIMO_BIZUPLY_SEND_CONFIRM;
    if (previousMedia == null) delete process.env.WHATSAPP_HEADER_MEDIA;
    else process.env.WHATSAPP_HEADER_MEDIA = previousMedia;
    if (previousDialog == null) delete process.env.WHATSAPP_API_KEY;
    else process.env.WHATSAPP_API_KEY = previousDialog;
    if (previousBizuply == null) delete process.env.BIZUPLY_WHATSAPP_API_KEY;
    else process.env.BIZUPLY_WHATSAPP_API_KEY = previousBizuply;
  }

  assert.deepEqual(dialogLinks, [headerUrl]);
  assert.deepEqual(bizuplyLinks, [headerUrl]);
  assert.deepEqual(hosts, ["waba-v2.360dialog.io", "api.bizuply.com"]);
});

test("Bizuply keeps the approved template fields without a Cloudinary link", () => {
  const body = toBizuplyTemplateBody({
    to: "972526850711",
    templateName: "save_the_date_image_he",
    languageCode: "he",
    components: [
      {
        type: "header",
        parameters: [{ type: "image", image: { id: "meta-id" } }],
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: "כותרת" },
          { type: "text", text: "11.11.2026" },
        ],
      },
    ],
  });
  assert.deepEqual(body, {
    to: "972526850711",
    template: "save_the_date_image_he",
    language: "he",
    parameters: ["כותרת", "11.11.2026"],
    header: { image: { id: "meta-id" } },
  });

  const missing = classifyWhatsappSendError(
    new Error("Missing env var: BIZUPLY_WHATSAPP_API_KEY")
  );
  assert.equal(missing.status, "NOT_SENT");
  assert.equal(missing.reasonCode, "WHATSAPP_NOT_CONNECTED");
});

test("shared template senders do not call 360dialog directly", () => {
  const files = [
    "lib/whatsapp/sendRsvpTemplateMedia.ts",
    "lib/whatsapp/uploadHeaderMedia.ts",
    "lib/whatsapp/sendThankYouTemplate.ts",
    "lib/whatsapp/sendTableNumberTemplate.ts",
    "lib/whatsapp/sendRsvpWithGiftTemplate.ts",
  ];
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /waba-v2\.360dialog\.io/);
  }
  assert.match(
    readFileSync("lib/whatsapp/provider/dialogProvider.ts", "utf8"),
    /waba-v2\.360dialog\.io/
  );
});
