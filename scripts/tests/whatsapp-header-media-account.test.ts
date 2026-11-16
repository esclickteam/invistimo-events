import test from "node:test";
import assert from "node:assert/strict";

import sharp from "sharp";

import { InvitationImagePrepareError } from "../../lib/whatsapp/prepareInvitationImage";
import { classifyWhatsappSendError, recordWhatsappSendSuccess } from "../../lib/whatsapp/roundDeliveryTracking";
import { sendRsvpTemplateMedia } from "../../lib/whatsapp/sendRsvpTemplateMedia";
import {
  clearWhatsAppHeaderMediaCache,
  uploadWhatsAppHeaderMedia,
} from "../../lib/whatsapp/uploadHeaderMedia";

const headerUrl = "https://res.cloudinary.com/dnbewcz79/image/upload/v1/invistimo/invitations/account.png";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("media ids are reused only for the same WhatsApp channel and only before they expire", async () => {
  clearWhatsAppHeaderMediaCache();
  const bytes = Buffer.from("same-header-bytes");
  const uploads: string[] = [];
  let clock = 1_000;
  const fetchImpl = (async (_url: string, init: any) => {
    uploads.push(String(init?.headers?.["D360-API-KEY"] || ""));
    return jsonResponse({ id: `media-${uploads.length}` });
  }) as typeof fetch;

  const first = await uploadWhatsAppHeaderMedia(
    { bytes, mime: "image/jpeg" },
    { fetch: fetchImpl, apiKey: "channel-a", now: () => clock, ttlMs: 5_000 }
  );
  const again = await uploadWhatsAppHeaderMedia(
    { bytes, mime: "image/jpeg" },
    { fetch: fetchImpl, apiKey: "channel-a", now: () => clock, ttlMs: 5_000 }
  );
  const otherChannel = await uploadWhatsAppHeaderMedia(
    { bytes, mime: "image/jpeg" },
    { fetch: fetchImpl, apiKey: "channel-b", now: () => clock, ttlMs: 5_000 }
  );
  clock = 6_000;
  const expired = await uploadWhatsAppHeaderMedia(
    { bytes, mime: "image/jpeg" },
    { fetch: fetchImpl, apiKey: "channel-a", now: () => clock, ttlMs: 5_000 }
  );

  assert.equal(first, "media-1");
  assert.equal(again, "media-1");
  assert.equal(otherChannel, "media-2");
  assert.equal(expired, "media-3");
  assert.deepEqual(uploads, ["channel-a", "channel-b", "channel-a"]);
});

test("a failed upload is not cached and is not reported as a sent message", async () => {
  const previousMedia = process.env.WHATSAPP_HEADER_MEDIA;
  process.env.WHATSAPP_HEADER_MEDIA = "id";
  clearWhatsAppHeaderMediaCache();
  process.env.WHATSAPP_API_KEY = "channel-a";
  const file = await sharp({
    create: { width: 24, height: 24, channels: 3, background: "#224466" },
  })
    .png()
    .toBuffer();
  let mediaPosts = 0;
  let messagePosts = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => {
    const method = String(init?.method || "GET").toUpperCase();
    const target = String(url);
    if (method === "POST" && target.includes("/media")) {
      mediaPosts += 1;
      if (mediaPosts === 1) return jsonResponse({ error: { message: "upload down" } }, 500);
      return jsonResponse({ id: "media-ok" });
    }
    if (method !== "POST") {
      return new Response(file, {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(file.length) },
      });
    }
    messagePosts += 1;
    return jsonResponse({ messages: [{ id: "wamid.accepted" }] });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        sendRsvpTemplateMedia({
          to: "0526850711",
          templateName: "save_the_date_image_he",
          headerImageUrl: headerUrl,
          eventTitle: "אירוע",
          eventDate: "11.11.2026",
        }),
      (error: any) => {
        assert.match(error.message, /WhatsApp header media upload failed \(500\)/);
        assert.notEqual(error.success, true);
        return true;
      }
    );
    const sent = await sendRsvpTemplateMedia({
      to: "0526850711",
      templateName: "save_the_date_image_he",
      headerImageUrl: headerUrl,
      eventTitle: "אירוע",
      eventDate: "11.11.2026",
    });
    assert.equal(sent.success, true);
    assert.equal(sent.messageId, "wamid.accepted");
  } finally {
    globalThis.fetch = originalFetch;
    clearWhatsAppHeaderMediaCache();
    if (previousMedia == null) delete process.env.WHATSAPP_HEADER_MEDIA;
    else process.env.WHATSAPP_HEADER_MEDIA = previousMedia;
  }

  assert.equal(mediaPosts, 2);
  assert.equal(messagePosts, 1);
});

test("a message response without an id is not success, and an expired media id is uploaded again", async () => {
  clearWhatsAppHeaderMediaCache();
  const previousMedia = process.env.WHATSAPP_HEADER_MEDIA;
  process.env.WHATSAPP_HEADER_MEDIA = "id";
  process.env.WHATSAPP_API_KEY = "channel-a";
  const file = await sharp({
    create: { width: 32, height: 16, channels: 3, background: "#886644" },
  })
    .jpeg({ quality: 80, progressive: false, mozjpeg: false })
    .toBuffer();
  const mediaIds: string[] = [];
  const headerIds: string[] = [];
  let messagePosts = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => {
    const method = String(init?.method || "GET").toUpperCase();
    const target = String(url);
    if (method === "POST" && target.includes("/media")) {
      const id = `media-${mediaIds.length + 1}`;
      mediaIds.push(id);
      const form = init.body as FormData;
      const media = form.get("file");
      assert.ok(media instanceof File);
      assert.equal(media.type, "image/jpeg");
      assert.equal(media.name, "header.jpg");
      return jsonResponse({ id });
    }
    if (method !== "POST") {
      return new Response(file, {
        status: 200,
        headers: { "content-type": "image/jpeg", "content-length": String(file.length) },
      });
    }
    messagePosts += 1;
    const payload = JSON.parse(init.body);
    headerIds.push(payload.template.components[0].parameters[0].image.id);
    if (messagePosts === 1) return jsonResponse({ messages: [] });
    if (messagePosts === 2) {
      return jsonResponse(
        {
          error: {
            code: 100,
            message: "(#100) Invalid parameter",
            error_data: { details: "Uploaded media does not exist or has expired." },
          },
        },
        400
      );
    }
    return jsonResponse({ messages: [{ id: "wamid.fresh" }] });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        sendRsvpTemplateMedia({
          to: "0526850711",
          templateName: "event_invitation",
          headerImageUrl: headerUrl,
          eventTitle: "אירוע",
          eventDate: "11.11.2026",
          eventLocation: "אולם",
        }),
      (error: any) => {
        assert.equal(error.message, "WhatsApp template send was not accepted");
        assert.notEqual(error.success, true);
        return true;
      }
    );
    const sent = await sendRsvpTemplateMedia({
      to: "0526850711",
      templateName: "rsvp_invitation_media",
      headerImageUrl: headerUrl,
      eventTitle: "אירוע",
      eventDate: "11.11.2026 19:30",
      eventLocation: "אולם",
      rsvpLink: "https://www.invistimo.com/invite/share1?token=tok",
    });
    assert.equal(sent.success, true);
    assert.equal(sent.messageId, "wamid.fresh");
    assert.equal(sent.buttonUrlParam, "share1?token=tok");
  } finally {
    globalThis.fetch = originalFetch;
    clearWhatsAppHeaderMediaCache();
    if (previousMedia == null) delete process.env.WHATSAPP_HEADER_MEDIA;
    else process.env.WHATSAPP_HEADER_MEDIA = previousMedia;
  }

  assert.deepEqual(mediaIds, ["media-1", "media-2"]);
  assert.deepEqual(headerIds, ["media-1", "media-1", "media-2"]);
  assert.equal(messagePosts, 3);
});

test("upload and acceptance failures are recorded as failures, never as sent", async () => {
  const upload = classifyWhatsappSendError(new Error("WhatsApp header media upload failed (401)"));
  assert.equal(upload.status, "FAILED");
  assert.equal(upload.reasonCode, "MEDIA_ERROR");

  const unread = classifyWhatsappSendError(
    new InvitationImagePrepareError("header image source could not be read")
  );
  assert.equal(unread.status, "NOT_SENT");
  assert.equal(unread.reasonCode, "MEDIA_ERROR");

  const unaccepted = classifyWhatsappSendError(new Error("WhatsApp template send was not accepted"));
  assert.equal(unaccepted.status, "FAILED");
  assert.notEqual(unaccepted.status, "SENT");

  await recordWhatsappSendSuccess({ queueId: "not-a-real-id", wamid: "  " });
});
