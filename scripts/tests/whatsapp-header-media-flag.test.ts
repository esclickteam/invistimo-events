import test from "node:test";
import assert from "node:assert/strict";

import sharp from "sharp";

import { resolveWhatsappHeaderMediaMode } from "../../lib/whatsapp/headerMediaMode";
import { resolveWhatsAppProviderId } from "../../lib/whatsapp/provider";
import { sendRsvpTemplateMedia } from "../../lib/whatsapp/sendRsvpTemplateMedia";
import { clearWhatsAppHeaderMediaCache } from "../../lib/whatsapp/uploadHeaderMedia";

const headerUrl =
  "https://res.cloudinary.com/dnbewcz79/image/upload/v1/invistimo/invitations/flag.png";
const allowlisted = "0500000000";
const customer = "0520000000";

function restore(name: string, previous: string | undefined) {
  if (previous == null) delete process.env[name];
  else process.env[name] = previous;
}

test("header media defaults to a link on 360dialog for every recipient", () => {
  const previousMedia = process.env.WHATSAPP_HEADER_MEDIA;
  const previousList = process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS;
  const previousProvider = process.env.WHATSAPP_PROVIDER;
  delete process.env.WHATSAPP_HEADER_MEDIA;
  delete process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS;
  delete process.env.WHATSAPP_PROVIDER;
  try {
    assert.equal(resolveWhatsAppProviderId(), "dialog");
    assert.equal(resolveWhatsappHeaderMediaMode(allowlisted), "link");
    assert.equal(resolveWhatsappHeaderMediaMode(customer), "link");
  } finally {
    restore("WHATSAPP_HEADER_MEDIA", previousMedia);
    restore("WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS", previousList);
    restore("WHATSAPP_PROVIDER", previousProvider);
  }
});

test("link mode is the rollback even when a test recipient is listed", () => {
  const previousMedia = process.env.WHATSAPP_HEADER_MEDIA;
  const previousList = process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS;
  process.env.WHATSAPP_HEADER_MEDIA = "link";
  process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS = allowlisted;
  try {
    assert.equal(resolveWhatsappHeaderMediaMode(allowlisted), "link");
    assert.equal(resolveWhatsappHeaderMediaMode(`+972${allowlisted.slice(1)}`), "link");
  } finally {
    restore("WHATSAPP_HEADER_MEDIA", previousMedia);
    restore("WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS", previousList);
  }
});

test("test mode uploads a media id only for the allowlisted recipient", async () => {
  const previousMedia = process.env.WHATSAPP_HEADER_MEDIA;
  const previousList = process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS;
  const previousKey = process.env.WHATSAPP_API_KEY;
  process.env.WHATSAPP_HEADER_MEDIA = "test";
  process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS = `+972${allowlisted.slice(1)}`;
  process.env.WHATSAPP_API_KEY = "dialog-key";
  clearWhatsAppHeaderMediaCache();

  const file = await sharp({
    create: { width: 24, height: 16, channels: 3, background: "#224466" },
  })
    .png()
    .toBuffer();
  const originalFetch = globalThis.fetch;
  const headers: Array<Record<string, string>> = [];
  const hosts: string[] = [];
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
    if (target.includes("/media")) {
      return new Response(JSON.stringify({ id: "media-test" }), { status: 200 });
    }
    const payload = JSON.parse(init.body);
    headers.push(payload.template.components[0].parameters[0].image);
    return new Response(JSON.stringify({ messages: [{ id: "wamid.flag" }] }), {
      status: 200,
    });
  }) as typeof fetch;

  const input = {
    templateName: "rsvp_invitation_media",
    headerImageUrl: headerUrl,
    eventTitle: "אירוע",
    eventDate: "16.11.2026",
    eventLocation: "אולם",
    urlSuffix: "share?token=t",
  };

  try {
    await sendRsvpTemplateMedia({ ...input, to: allowlisted });
    await sendRsvpTemplateMedia({ ...input, to: customer });
  } finally {
    globalThis.fetch = originalFetch;
    clearWhatsAppHeaderMediaCache();
    restore("WHATSAPP_HEADER_MEDIA", previousMedia);
    restore("WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS", previousList);
    restore("WHATSAPP_API_KEY", previousKey);
  }

  assert.deepEqual(headers, [{ id: "media-test" }, { link: headerUrl }]);
  assert.deepEqual(hosts, [
    "waba-v2.360dialog.io",
    "waba-v2.360dialog.io",
    "waba-v2.360dialog.io",
  ]);
  assert.equal(hosts.some((host) => host.includes("bizuply")), false);
});
