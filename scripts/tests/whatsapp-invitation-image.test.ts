import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import sharp from "sharp";

import {
  bytesForInvitationStorage,
  describeWhatsAppHeaderFile,
  isReadyWhatsAppHeader,
  WHATSAPP_HEADER_MAX_BYTES,
} from "../../lib/whatsapp/invitationImage";
import {
  InvitationImagePrepareError,
  prepareWhatsappInvitationImageUrl,
} from "../../lib/whatsapp/prepareInvitationImage";
import { sendRsvpTemplateMedia } from "../../lib/whatsapp/sendRsvpTemplateMedia";
import { clearWhatsAppHeaderMediaCache } from "../../lib/whatsapp/uploadHeaderMedia";

function isBaselineJpeg(buffer: Buffer) {
  assert.equal(buffer[0], 0xff);
  assert.equal(buffer[1], 0xd8);
  const sof2 = buffer.includes(Buffer.from([0xff, 0xc2]));
  assert.equal(sof2, false);
}

async function png(width: number, height: number, channels: 3 | 4, pixel: (x: number, y: number) => number[]) {
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = pixel(x, y);
      const offset = (y * width + x) * channels;
      for (let c = 0; c < channels; c += 1) data[offset + c] = color[c] ?? 0;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

const sourceUrl =
  "https://res.cloudinary.com/dnbewcz79/image/upload/v1/invistimo/invitations/sample.png";

function fetchOf(bytes: Buffer, headOk = true) {
  return async (input: string, init?: { method?: string }) => {
    if (init?.method === "HEAD") {
      return {
        ok: headOk,
        status: headOk ? 200 : 404,
        headers: { get: () => (headOk ? "image/jpeg" : "text/plain") },
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }
    assert.equal(input, sourceUrl);
    return {
      ok: true,
      status: 200,
      headers: { get: () => "image/png" },
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  };
}

test("a small JPEG and PNG are stored and sent unchanged", async () => {
  const jpeg = await sharp({
    create: { width: 640, height: 360, channels: 3, background: "#336699" },
  })
    .jpeg({ quality: 90, progressive: false, mozjpeg: false })
    .toBuffer();
  const stored = await bytesForInvitationStorage(jpeg);
  assert.equal(stored.converted, false);
  assert.equal(stored.buffer.equals(jpeg), true);
  assert.equal(stored.width, 640);
  assert.equal(stored.height, 360);

  const transparent = await png(80, 120, 4, (x, y) =>
    y < 40 ? [20, 40, 80, 255] : [0, 0, 0, 0]
  );
  const storedPng = await bytesForInvitationStorage(transparent);
  assert.equal(storedPng.converted, false);
  assert.equal(storedPng.mime, "image/png");
  assert.equal(storedPng.buffer.equals(transparent), true);

  let uploads = 0;
  const sent = await prepareWhatsappInvitationImageUrl(sourceUrl, {
    fetch: fetchOf(transparent),
    upload: async () => {
      uploads += 1;
      return "https://res.cloudinary.com/dnbewcz79/image/upload/unused.jpg";
    },
  });
  assert.equal(sent, sourceUrl);
  assert.equal(uploads, 0);
});

test("a white or cream plate is not cropped, including an old 1080 canvas", async () => {
  const plate = await png(1080, 1920, 3, (x, y) => {
    const card = x >= 180 && x < 900 && y >= 240 && y < 900;
    return card ? [40, 70, 110] : [255, 255, 255];
  });
  const stored = await bytesForInvitationStorage(plate);
  assert.equal(stored.converted, false);
  assert.equal(stored.width, 1080);
  assert.equal(stored.height, 1920);

  const cream = await png(200, 300, 3, () => [236, 228, 210]);
  const kept = await bytesForInvitationStorage(cream);
  assert.equal(kept.width, 200);
  assert.equal(kept.height, 300);
  assert.equal(kept.buffer.equals(cream), true);

  const sent = await prepareWhatsappInvitationImageUrl(sourceUrl, {
    fetch: fetchOf(plate),
    upload: async () => {
      throw new Error("must not re-encode a valid PNG");
    },
  });
  assert.equal(sent, sourceUrl);
});

test("conversion only shrinks inside the limits and does not add a plate", async () => {
  const wide = await png(5000, 20, 3, (x) => [x % 255, 10, 20]);
  const stored = await bytesForInvitationStorage(wide);
  assert.equal(stored.converted, true);
  assert.ok(stored.width <= 4096);
  assert.equal(stored.height, 16);
  isBaselineJpeg(stored.buffer);

  assert.equal(isReadyWhatsAppHeader("jpeg", WHATSAPP_HEADER_MAX_BYTES + 1, 100, 100), false);
  assert.equal(isReadyWhatsAppHeader("png", 1000, 100, 100), true);
  assert.equal(isReadyWhatsAppHeader("other", 1000, 100, 100), false);
});

test("a failed prepare throws and does not return a c_limit URL", async () => {
  await assert.rejects(
    () =>
      prepareWhatsappInvitationImageUrl(sourceUrl, {
        fetch: async () => ({
          ok: false,
          status: 404,
          headers: { get: () => "text/plain" },
          arrayBuffer: async () => new ArrayBuffer(0),
        }),
      }),
    InvitationImagePrepareError
  );

  const wide = await png(4200, 10, 3, () => [1, 2, 3]);
  await assert.rejects(
    () =>
      prepareWhatsappInvitationImageUrl(sourceUrl, {
        fetch: fetchOf(wide, false),
        upload: async () =>
          "https://res.cloudinary.com/dnbewcz79/image/upload/invistimo/whatsapp-delivery/v6_test.jpg",
      }),
    (error: unknown) => {
      assert.ok(error instanceof InvitationImagePrepareError);
      assert.doesNotMatch(error.message, /c_limit/);
      return true;
    }
  );
});

test("360dialog receives the original bytes by media id for every image template", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  clearWhatsAppHeaderMediaCache();
  const file = await png(64, 64, 3, () => [20, 40, 80]);
  const stored =
    "https://res.cloudinary.com/dnbewcz79/image/upload/c_limit,w_1600,h_2400/b_rgb:FFFFFF,f_jpg/v1/invistimo/invitations/sample.png";
  const original =
    "https://res.cloudinary.com/dnbewcz79/image/upload/v1/invistimo/invitations/sample.png";
  const posts: any[] = [];
  const uploaded: Buffer[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: any, init: any) => {
    const method = String(init?.method || "GET").toUpperCase();
    const target = String(_url);
    if (method === "POST" && target.includes("/media")) {
      const form = init.body as FormData;
      assert.equal(form.get("messaging_product"), "whatsapp");
      const media = form.get("file");
      assert.ok(media instanceof File);
      assert.equal(media.type, "image/png");
      assert.equal(media.name, "header.png");
      uploaded.push(Buffer.from(await media.arrayBuffer()));
      return new Response(JSON.stringify({ id: "uploaded-media" }), { status: 200 });
    }
    if (method !== "POST") {
      return new Response(file, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(file.length),
          "cache-control": "public, immutable, max-age=2592000",
          etag: "\"abc\"",
        },
      });
    }
    posts.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.original" }] }), {
      status: 200,
    });
  }) as typeof fetch;

  try {
    const shared = {
      to: "0526850711",
      headerImageUrl: stored,
      eventTitle: "אירוע",
      eventDate: "11.11.2026",
      eventLocation: "אולם",
    };
    await sendRsvpTemplateMedia({
      ...shared,
      templateName: "rsvp_invitation_media",
      rsvpLink: "https://www.invistimo.com/invite/abc?token=t",
    });
    await sendRsvpTemplateMedia({
      ...shared,
      templateName: "rsvp_reminder_invistimo",
      urlSuffix: "abc?token=t",
    });
    await sendRsvpTemplateMedia({
      ...shared,
      templateName: "save_the_date_image_he",
    });
    await sendRsvpTemplateMedia({
      ...shared,
      templateName: "event_invitation",
    });
    await sendRsvpTemplateMedia({
      ...shared,
      messageType: "invitation_only",
      templateName: "rsvp_invitation_media",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(posts.length, 5);
  assert.equal(uploaded.length, 1, "one media upload is reused for the same file");
  assert.equal(uploaded[0].equals(file), true);
  assert.deepEqual(
    posts.map((post) => post.template.name),
    [
      "rsvp_invitation_media",
      "rsvp_reminder_invistimo",
      "save_the_date_image_he",
      "event_invitation",
      "event_invitation",
    ]
  );
  for (const post of posts) {
    const header = post.template.components.find((item: any) => item.type === "header");
    assert.equal(header.parameters[0].image.id, "uploaded-media");
    assert.equal(header.parameters[0].image.link, undefined);
    assert.equal(post.template.components.some((item: any) => item.type === "header"), true);
    const texts = post.template.components
      .find((item: any) => item.type === "body")
      .parameters.map((item: any) => item.text);
    const button = post.template.components.find((item: any) => item.type === "button");
    if (post.template.name === "rsvp_invitation_media") {
      assert.deepEqual(texts, ["אירוע", "11.11.2026", "אולם"]);
      assert.equal(button.parameters[0].text, "abc?token=t");
    } else if (post.template.name === "rsvp_reminder_invistimo") {
      assert.deepEqual(texts, ["אירוע"]);
      assert.equal(button.parameters[0].text, "abc?token=t");
    } else if (post.template.name === "save_the_date_image_he") {
      assert.deepEqual(texts, ["אירוע", "11.11.2026"]);
      assert.equal(button, undefined);
    } else {
      assert.equal(post.template.name, "event_invitation");
      assert.deepEqual(texts, ["אירוע", "11.11.2026", "אולם"]);
      assert.equal(button, undefined);
    }
  }
  assert.equal(original.includes("c_limit"), false);
});

test("a file that cannot be verified is not posted to 360dialog", async () => {
  process.env.WHATSAPP_API_KEY = "test-key";
  const originalFetch = globalThis.fetch;
  let posts = 0;
  globalThis.fetch = (async (_url: any, init: any) => {
    if (String(init?.method || "GET").toUpperCase() === "POST") posts += 1;
    return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
  }) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        sendRsvpTemplateMedia({
          to: "0526850711",
          templateName: "event_invitation",
          headerImageUrl:
            "https://res.cloudinary.com/dnbewcz79/image/upload/v1/invistimo/invitations/missing.png",
          eventTitle: "אירוע",
          eventDate: "11.11.2026",
          eventLocation: "אולם",
        }),
      InvitationImagePrepareError
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(posts, 0);
});

test("header structure reports palette PNG and progressive JPEG without rewriting them", async () => {
  const palette = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#112233" },
  })
    .png({ palette: true })
    .toBuffer();
  const paletteInfo = describeWhatsAppHeaderFile(palette);
  assert.equal(paletteInfo.kind, "png");
  assert.equal(paletteInfo.pngColorType, 3);

  const progressive = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#abcdef" },
  })
    .jpeg({ progressive: true, quality: 80 })
    .toBuffer();
  assert.equal(describeWhatsAppHeaderFile(progressive).progressive, true);

  const baseline = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#abcdef" },
  })
    .jpeg({ progressive: false, mozjpeg: false })
    .toBuffer();
  const baselineInfo = describeWhatsAppHeaderFile(baseline);
  assert.equal(baselineInfo.progressive, false);
  assert.equal(baselineInfo.hasJfifThumbnail, false);
});

test("every image send path uses the verified prepare step and stores no plate", () => {
  const upload = readFileSync("app/api/invitations/upload-preview/route.ts", "utf8");
  const save = readFileSync("app/api/invitations/[id]/route.ts", "utf8");
  const media = readFileSync("app/api/messages/pre-rsvp/media/route.ts", "utf8");
  const pre = readFileSync("app/api/messages/pre-rsvp/whatsapp/route.ts", "utf8");
  const send = readFileSync("lib/whatsapp/sendRsvpTemplateMedia.ts", "utf8");
  const prepare = readFileSync("lib/whatsapp/prepareInvitationImage.ts", "utf8");
  const image = readFileSync("lib/whatsapp/invitationImage.ts", "utf8");
  const compress = readFileSync("lib/compressInviteImage.ts", "utf8");
  const manual = readFileSync("app/api/admin/users/[id]/manual-sms/route.ts", "utf8");
  const employee = readFileSync(
    "app/api/employee/call-tasks/[taskId]/send-rsvp-invite/route.ts",
    "utf8"
  );
  const sendTemplate = readFileSync("app/api/whatsapp/send-template/route.ts", "utf8");
  const worker = readFileSync("workers/sendScheduledSms.ts", "utf8");
  const cron = readFileSync("app/api/cron/whatsapp/route.ts", "utf8");
  const scheduled = readFileSync("app/api/cron/send-scheduled-sms/route.ts", "utf8");

  for (const source of [upload, save, media, pre, image, compress, prepare, send]) {
    assert.doesNotMatch(source, /crop:\s*["']lpad["']|crop:\s*["']pad["']/);
  }
  for (const source of [upload, save, media, pre]) {
    assert.match(source, /bytesForInvitationStorage/);
  }
  assert.match(image, /fit:\s*"inside"/);
  assert.match(image, /withoutEnlargement:\s*true/);
  assert.doesNotMatch(image, /\.extend\(/);
  assert.match(send, /loadVerifiedWhatsappHeader/);
  assert.match(send, /uploadWhatsAppHeaderMedia/);
  assert.doesNotMatch(send, /link: headerImageUrl/);
  assert.doesNotMatch(send, /toWhatsappInvitationImageUrl\(/);
  assert.doesNotMatch(prepare, /toWhatsappInvitationImageUrl\(/);
  assert.match(prepare, /InvitationImagePrepareError/);
  assert.match(compress, /image\/png/);
  assert.doesNotMatch(compress, /fillStyle/);

  for (const source of [manual, employee, cron]) {
    assert.match(source, /sendRsvpTemplateMedia/);
  }
  assert.match(pre, /save_the_date|invitation_only/);
  assert.match(sendTemplate, /headerImageUrl/);
  assert.match(cron, /sendScheduledWhatsapp/);
  assert.match(scheduled, /sendScheduledWhatsapp/);
  assert.match(worker, /status:\s*"failed"|status: "failed"/);
  assert.match(worker, /idempotencyKey/);
});
