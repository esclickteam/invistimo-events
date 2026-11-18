import test from "node:test";
import assert from "node:assert/strict";

import sharp from "sharp";

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

test("production sends image.id for every recipient and ignores the old link flag", async () => {
  const previousMedia = process.env.WHATSAPP_HEADER_MEDIA;
  const previousList = process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS;
  const previousProvider = process.env.WHATSAPP_PROVIDER;
  const previousKey = process.env.WHATSAPP_API_KEY;
  process.env.WHATSAPP_HEADER_MEDIA = "link";
  process.env.WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS = allowlisted;
  delete process.env.WHATSAPP_PROVIDER;
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
  const templates: string[] = [];
  let messagePosts = 0;
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
      return new Response(JSON.stringify({ id: "media-production" }), { status: 200 });
    }
    messagePosts += 1;
    const payload = JSON.parse(init.body);
    templates.push(payload.template.name);
    headers.push(payload.template.components[0].parameters[0].image);
    assert.equal(payload.template.components[1].parameters.length, 3);
    assert.equal(payload.template.components[2].sub_type, "url");
    assert.equal(payload.template.components[2].parameters[0].text, "share?token=t");
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
    assert.equal(resolveWhatsAppProviderId(), "dialog");
    await sendRsvpTemplateMedia({ ...input, to: allowlisted });
    await sendRsvpTemplateMedia({ ...input, to: customer });
  } finally {
    globalThis.fetch = originalFetch;
    clearWhatsAppHeaderMediaCache();
    restore("WHATSAPP_HEADER_MEDIA", previousMedia);
    restore("WHATSAPP_HEADER_MEDIA_ID_RECIPIENTS", previousList);
    restore("WHATSAPP_PROVIDER", previousProvider);
    restore("WHATSAPP_API_KEY", previousKey);
  }

  assert.deepEqual(templates, ["rsvp_invitation_media", "rsvp_invitation_media"]);
  assert.deepEqual(headers, [{ id: "media-production" }, { id: "media-production" }]);
  assert.equal(messagePosts, 2);
  assert.equal(hosts.filter((host) => host === "waba-v2.360dialog.io").length, 3);
  assert.equal(hosts.some((host) => host.includes("bizuply")), false);
});

test("a failed media upload does not post the invitation", async () => {
  const previousKey = process.env.WHATSAPP_API_KEY;
  process.env.WHATSAPP_API_KEY = "dialog-key";
  clearWhatsAppHeaderMediaCache();

  const file = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#112233" },
  })
    .jpeg()
    .toBuffer();
  const originalFetch = globalThis.fetch;
  let messagePosts = 0;
  globalThis.fetch = (async (url: any, init: any) => {
    const method = String(init?.method || "GET").toUpperCase();
    const target = String(url);
    if (method !== "POST") {
      return new Response(file, {
        status: 200,
        headers: { "content-type": "image/jpeg", "content-length": String(file.length) },
      });
    }
    if (target.includes("/media")) {
      return new Response(JSON.stringify({ error: { message: "upload failed" } }), {
        status: 500,
      });
    }
    messagePosts += 1;
    return new Response(JSON.stringify({ messages: [{ id: "wamid.should-not-send" }] }), {
      status: 200,
    });
  }) as typeof fetch;

  try {
    await assert.rejects(() =>
      sendRsvpTemplateMedia({
        to: customer,
        templateName: "rsvp_invitation_media",
        headerImageUrl: headerUrl,
        eventTitle: "אירוע",
        eventDate: "16.11.2026",
        eventLocation: "אולם",
        urlSuffix: "share?token=t",
      })
    );
  } finally {
    globalThis.fetch = originalFetch;
    clearWhatsAppHeaderMediaCache();
    restore("WHATSAPP_API_KEY", previousKey);
  }

  assert.equal(messagePosts, 0);
});
