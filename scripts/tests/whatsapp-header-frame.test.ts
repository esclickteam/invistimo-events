import test from "node:test";
import assert from "node:assert/strict";

import sharp from "sharp";

import {
  headerDisplayWidthFraction,
  jpegFilledToWhatsappHeader,
  WHATSAPP_HEADER_ASPECT,
  WHATSAPP_HEADER_HEIGHT,
  WHATSAPP_HEADER_WIDTH,
  whatsappHeaderFrameEnabled,
} from "../../lib/whatsapp/headerFrame";
import { prepareWhatsappInvitationImageUrl } from "../../lib/whatsapp/prepareInvitationImage";

const sourceUrl =
  "https://res.cloudinary.com/dnbewcz79/image/upload/v1794826500/invistimo/invitations/sample.jpg";

test("a 1080x1920 export fills about 30 percent of a WhatsApp image header", () => {
  const fraction = headerDisplayWidthFraction(1080, 1920);
  assert.ok(fraction > 0.28 && fraction < 0.31);
  assert.equal(whatsappHeaderFrameEnabled(undefined), false);
  assert.equal(whatsappHeaderFrameEnabled("1.91"), true);
});

test("the header frame keeps the top of a tall invitation and fills the slot", async () => {
  const width = 90;
  const height = 160;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      const top = y < 32;
      raw[offset] = top ? 220 : 20;
      raw[offset + 1] = top ? 30 : 40;
      raw[offset + 2] = top ? 40 : 180;
    }
  }
  const source = await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95, progressive: false, mozjpeg: false })
    .toBuffer();

  const framed = await jpegFilledToWhatsappHeader(source);
  assert.ok(framed);
  const meta = await sharp(framed).metadata();
  assert.equal(meta.width, WHATSAPP_HEADER_WIDTH);
  assert.equal(meta.height, WHATSAPP_HEADER_HEIGHT);
  assert.ok(Math.abs(meta.width / meta.height - WHATSAPP_HEADER_ASPECT) < 0.02);

  const { data, info } = await sharp(framed).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => data[(y * info.width + x) * 3];
  assert.ok(at(0, 0) > 150);
  assert.ok(at(info.width - 1, 0) > 150);
  assert.ok(at(0, info.height - 1) < 80);
});

test("the header frame stays off for customers until it is enabled", async () => {
  const previous = process.env.WHATSAPP_HEADER_FRAME;
  delete process.env.WHATSAPP_HEADER_FRAME;
  const file = await sharp({
    create: { width: 1080, height: 1920, channels: 3, background: "#886644" },
  })
    .jpeg({ quality: 80, progressive: false, mozjpeg: false })
    .toBuffer();
  let uploads = 0;
  try {
    const sent = await prepareWhatsappInvitationImageUrl(sourceUrl, {
      fetch: async () =>
        new Response(file, {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }) as unknown as Awaited<ReturnType<typeof fetch>>,
      upload: async () => {
        uploads += 1;
        return "https://res.cloudinary.com/dnbewcz79/image/upload/unused.jpg";
      },
    });
    assert.equal(sent, sourceUrl);
    assert.equal(uploads, 0);
  } finally {
    if (previous == null) delete process.env.WHATSAPP_HEADER_FRAME;
    else process.env.WHATSAPP_HEADER_FRAME = previous;
  }
});

test("an enabled header frame uploads a new file and leaves the original id", async () => {
  const previous = process.env.WHATSAPP_HEADER_FRAME;
  process.env.WHATSAPP_HEADER_FRAME = "1.91";
  const file = await sharp({
    create: { width: 108, height: 192, channels: 3, background: "#224466" },
  })
    .jpeg({ quality: 80, progressive: false, mozjpeg: false })
    .toBuffer();
  let publicId = "";
  let uploaded: Buffer | null = null;
  try {
    const sent = await prepareWhatsappInvitationImageUrl(sourceUrl, {
      fetch: async (input, init) => {
        if (init?.method === "HEAD") {
          return {
            ok: true,
            status: 200,
            headers: { get: () => "image/jpeg" },
            arrayBuffer: async () => new ArrayBuffer(0),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => "image/jpeg" },
          arrayBuffer: async () =>
            file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
        };
      },
      upload: async (buffer, id) => {
        publicId = id;
        uploaded = buffer;
        return "https://res.cloudinary.com/dnbewcz79/image/upload/invistimo/whatsapp-header-frame/v1_test.jpg";
      },
    });
    assert.equal(
      sent,
      "https://res.cloudinary.com/dnbewcz79/image/upload/invistimo/whatsapp-header-frame/v1_test.jpg"
    );
    assert.match(publicId, /^invistimo\/whatsapp-header-frame\/v1_/);
    assert.equal(publicId.includes("sample"), false);
    const meta = await sharp(uploaded!).metadata();
    assert.equal(meta.width, WHATSAPP_HEADER_WIDTH);
    assert.equal(meta.height, WHATSAPP_HEADER_HEIGHT);
  } finally {
    if (previous == null) delete process.env.WHATSAPP_HEADER_FRAME;
    else process.env.WHATSAPP_HEADER_FRAME = previous;
  }
});
