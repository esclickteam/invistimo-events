import test from "node:test";
import assert from "node:assert/strict";

import sharp from "sharp";

import {
  jpegPreservingFullInvitation,
  whatsappHeaderFrameEnabled,
} from "../../lib/whatsapp/headerFrame";
import { prepareWhatsappInvitationImageUrl } from "../../lib/whatsapp/prepareInvitationImage";

const sourceUrl =
  "https://res.cloudinary.com/dnbewcz79/image/upload/v1794826500/invistimo/invitations/sample.jpg";

async function portraitWithMarkedEnds() {
  const width = 90;
  const height = 160;
  const raw = Buffer.alloc(width * height * 3, 40);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      if (y < 8) raw[offset] = 220;
      if (y >= height - 8) raw[offset + 2] = 220;
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95, progressive: false, mozjpeg: false })
    .toBuffer();
}

test("the horizontal header crop cannot be turned on", () => {
  assert.equal(whatsappHeaderFrameEnabled(undefined), false);
  assert.equal(whatsappHeaderFrameEnabled("1.91"), false);
  assert.equal(whatsappHeaderFrameEnabled("preserve"), true);
});

test("a tall invitation keeps its full height, width, and both ends", async () => {
  const source = await portraitWithMarkedEnds();
  const copy = await jpegPreservingFullInvitation(source);
  const before = await sharp(source).metadata();
  const after = await sharp(copy).metadata();
  assert.equal(after.width, before.width);
  assert.equal(after.height, before.height);
  assert.equal(after.width, 90);
  assert.equal(after.height, 160);

  const { data, info } = await sharp(copy).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const red = (y: number) => data[(y * info.width + 10) * 3];
  const blue = (y: number) => data[(y * info.width + 10) * 3 + 2];
  assert.ok(red(0) > 150);
  assert.ok(blue(info.height - 1) > 150);
  assert.notEqual(after.width, 1125);
  assert.notEqual(after.height, 589);
});

test("customers still receive the stored file while the copy is off", async () => {
  const previous = process.env.WHATSAPP_HEADER_FRAME;
  process.env.WHATSAPP_HEADER_FRAME = "1.91";
  const file = await sharp({
    create: { width: 1080, height: 1920, channels: 3, background: "#886644" },
  })
    .jpeg({ quality: 80, progressive: false, mozjpeg: false })
    .toBuffer();
  let uploads = 0;
  try {
    const sent = await prepareWhatsappInvitationImageUrl(sourceUrl, {
      fetch: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () =>
          file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      }),
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

test("preserve uploads a same-size copy and does not replace the original id", async () => {
  const previous = process.env.WHATSAPP_HEADER_FRAME;
  process.env.WHATSAPP_HEADER_FRAME = "preserve";
  const file = await portraitWithMarkedEnds();
  let uploaded: Buffer | null = null;
  let publicId = "";
  try {
    const sent = await prepareWhatsappInvitationImageUrl(sourceUrl, {
      fetch: async (_input, init) => {
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
        uploaded = buffer;
        publicId = id;
        return "https://res.cloudinary.com/dnbewcz79/image/upload/invistimo/whatsapp-header-frame/v1_test.jpg";
      },
    });
    assert.match(publicId, /^invistimo\/whatsapp-header-frame\/v1_/);
    assert.equal(publicId.includes("sample"), false);
    const meta = await sharp(uploaded!).metadata();
    assert.equal(meta.width, 90);
    assert.equal(meta.height, 160);
    assert.equal(
      sent,
      "https://res.cloudinary.com/dnbewcz79/image/upload/invistimo/whatsapp-header-frame/v1_test.jpg"
    );
  } finally {
    if (previous == null) delete process.env.WHATSAPP_HEADER_FRAME;
    else process.env.WHATSAPP_HEADER_FRAME = previous;
  }
});
