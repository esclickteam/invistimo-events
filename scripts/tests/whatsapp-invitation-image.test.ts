import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { normalizeInvitationImage } from "../../lib/whatsapp/invitationImage";
import { toWhatsappInvitationImageUrl } from "../../lib/whatsapp/invitationImageUrl";
import { prepareWhatsappInvitationImageUrl } from "../../lib/whatsapp/prepareInvitationImage";

const ARTIFACTS = "/opt/cursor/artifacts";

function hasMarker(buffer: Buffer, marker: number) {
  for (let i = 0; i < buffer.length - 1; i += 1) {
    if (buffer[i] === 0xff && buffer[i + 1] === marker) return true;
  }
  return false;
}

async function rgba(options: {
  width: number;
  height: number;
  paint: (x: number, y: number) => [number, number, number, number];
}) {
  const raw = Buffer.alloc(options.width * options.height * 4);
  for (let y = 0; y < options.height; y += 1) {
    for (let x = 0; x < options.width; x += 1) {
      const [r, g, b, a] = options.paint(x, y);
      const offset = (y * options.width + x) * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }
  return sharp(raw, {
    raw: { width: options.width, height: options.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function bottomBlackRatio(buffer: Buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const start = Math.floor(info.height * 0.8);
  let black = 0;
  let total = 0;
  for (let y = start; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      total += 1;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      if (r < 20 && g < 20 && b < 20) black += 1;
    }
  }
  return black / total;
}

test("transparent canvas below the card is removed and exported as baseline JPEG", async () => {
  const before = await rgba({
    width: 400,
    height: 800,
    paint: (x, y) => {
      if (y >= 360) return [0, 0, 0, 0];
      if (y > 80 && y < 280 && x > 40 && x < 360) return [120, 72, 40, 255];
      return [246, 239, 230, 255];
    },
  });

  const normalized = await normalizeInvitationImage(before);
  const meta = await sharp(normalized.buffer).metadata();

  assert.equal(normalized.trimmedTransparent, true);
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.space, "srgb");
  assert.equal(meta.isProgressive, false);
  assert.equal(hasMarker(normalized.buffer, 0xc2), false);
  assert.equal(
    hasMarker(normalized.buffer, 0xc0) || hasMarker(normalized.buffer, 0xc1),
    true
  );
  assert.ok(meta.width && meta.width % 8 === 0);
  assert.ok(meta.height && meta.height % 8 === 0);
  assert.ok((meta.height || 0) < 450, `height ${meta.height} still includes the empty canvas`);
  assert.ok((meta.width || 0) <= 408);
  assert.ok((await bottomBlackRatio(normalized.buffer)) < 0.02);

  const phoneFlatten = await sharp(before)
    .flatten({ background: "#000000" })
    .jpeg()
    .toBuffer();
  assert.ok((await bottomBlackRatio(phoneFlatten)) > 0.9);

  mkdirSync(ARTIFACTS, { recursive: true });
  await sharp(before).png().toFile(join(ARTIFACTS, "whatsapp-invite-before.png"));
  await sharp(phoneFlatten)
    .jpeg()
    .toFile(join(ARTIFACTS, "whatsapp-invite-phone-flatten-before.jpg"));
  await sharp(normalized.buffer)
    .jpeg()
    .toFile(join(ARTIFACTS, "whatsapp-invite-after.jpg"));
});

test("opaque black band under a colorful card is cropped, a black invitation is not", async () => {
  const padded = await rgba({
    width: 320,
    height: 640,
    paint: (x, y) => {
      if (y >= 300) return [0, 0, 0, 255];
      if (y > 40 && y < 220 && x > 30 && x < 290) return [90, 40, 50, 255];
      return [250, 244, 236, 255];
    },
  });
  const cropped = await normalizeInvitationImage(padded);
  const croppedMeta = await sharp(cropped.buffer).metadata();
  assert.equal(cropped.trimmedBlack, true);
  assert.ok((croppedMeta.height || 0) < 360);
  assert.ok((await bottomBlackRatio(cropped.buffer)) < 0.05);

  const blackInvite = await rgba({
    width: 320,
    height: 480,
    paint: (x, y) => {
      const frame =
        x > 24 && x < 296 && y > 24 && y < 456 && (x < 48 || x > 272 || y < 48 || y > 432);
      if (frame) return [196, 154, 74, 255];
      return [8, 8, 8, 255];
    },
  });
  const kept = await normalizeInvitationImage(blackInvite);
  const keptMeta = await sharp(kept.buffer).metadata();
  assert.equal(kept.trimmedBlack, false);
  assert.equal(keptMeta.width, 320);
  assert.equal(keptMeta.height, 480);
});

test("square artwork keeps its ratio and is not padded onto a tall plate", async () => {
  const square = await rgba({
    width: 300,
    height: 300,
    paint: (x, y) => {
      if (x > 40 && x < 260 && y > 40 && y < 260) return [40, 70, 90, 255];
      return [255, 250, 245, 255];
    },
  });
  const normalized = await normalizeInvitationImage(square);
  const meta = await sharp(normalized.buffer).metadata();
  const ratio = (meta.width || 1) / (meta.height || 1);
  assert.ok(Math.abs(ratio - 1) < 0.04);
  assert.equal(normalized.trimmedBlack, false);
  assert.equal(normalized.trimmedTransparent, false);
});

test("WhatsApp delivery URL is a baseline JPEG and leaves non-Cloudinary links untouched", () => {
  const source =
    "https://res.cloudinary.com/dnbewcz79/image/upload/v1788978595/invistimo/invitations/yivdrixav9gwqusgbvae.png";
  const delivered = toWhatsappInvitationImageUrl(source);

  assert.match(delivered, /\/upload\/c_limit,w_1600,h_2400\/b_rgb:FFFFFF,cs_srgb,f_jpg,fl_progressive:none,q_92\//);
  assert.match(delivered, /\.jpg$/);
  assert.doesNotMatch(delivered, /f_png|e_trim|c_pad|c_lpad|c_fill/);
  assert.equal(
    toWhatsappInvitationImageUrl(delivered),
    delivered
  );
  assert.equal(
    toWhatsappInvitationImageUrl("https://cdn.example.com/invite.png"),
    "https://cdn.example.com/invite.png"
  );
});

test("upload and send paths no longer emit a padded palette PNG", () => {
  const upload = readFileSync(
    join(process.cwd(), "app/api/invitations/upload-preview/route.ts"),
    "utf8"
  );
  const update = readFileSync(
    join(process.cwd(), "app/api/invitations/[id]/route.ts"),
    "utf8"
  );
  const send = readFileSync(
    join(process.cwd(), "lib/whatsapp/sendRsvpTemplateMedia.ts"),
    "utf8"
  );

  for (const source of [upload, update]) {
    assert.match(source, /normalizeInvitationImage/);
    assert.doesNotMatch(source, /crop:\s*"lpad"/);
    assert.doesNotMatch(source, /format:\s*"png"/);
  }
  assert.match(send, /prepareWhatsappInvitationImageUrl/);
  assert.doesNotMatch(send, /toWhatsappInvitationImageUrl\(/);

  const editor = readFileSync(
    join(process.cwd(), "app/dashboard/create-invite/EditorCanvas.tsx"),
    "utf8"
  );
  const compress = readFileSync(
    join(process.cwd(), "lib/compressInviteImage.ts"),
    "utf8"
  );
  assert.match(editor, /invitationDesignBounds/);
  assert.match(editor, /mimeType: "image\/png"/);
  assert.doesNotMatch(editor, /mimeType: "image\/jpeg"/);
  assert.match(compress, /opaquePixelBounds/);
  assert.doesNotMatch(compress, /canvas\.width\s*=\s*1080/);
  assert.doesNotMatch(compress, /lpad/);
});

test("transparent stage under the card is cropped, opaque white paper is kept", async () => {
  const width = 191;
  const height = 712;
  const cardHeight = 272;
  const transparent = await rgba({
    width,
    height,
    paint: (x, y) => {
      if (y >= cardHeight) return [0, 0, 0, 0];
      if (y > cardHeight - 6) return [92, 48, 32, 255];
      if (x < 8 || x > width - 9) return [120, 84, 48, 255];
      return [214, 186, 142, 255];
    },
  });
  const fromAlpha = await normalizeInvitationImage(transparent);
  const alphaMeta = await sharp(fromAlpha.buffer).metadata();
  const ratio = (alphaMeta.height || 1) / (alphaMeta.width || 1);
  assert.equal(fromAlpha.trimmedTransparent, true);
  assert.equal(fromAlpha.uncertainCanvas, false);
  assert.ok((alphaMeta.height || 0) <= cardHeight + 8);
  assert.ok(ratio > 1.3 && ratio < 1.55, `ratio ${ratio}`);

  const opaquePaper = await rgba({
    width,
    height,
    paint: (x, y) => {
      if (y >= cardHeight) return [255, 255, 255, 255];
      if (y > cardHeight - 6) return [92, 48, 32, 255];
      return [214, 186, 142, 255];
    },
  });
  const kept = await normalizeInvitationImage(opaquePaper);
  const keptMeta = await sharp(kept.buffer).metadata();
  assert.equal(kept.trimmedLight, false);
  assert.equal(kept.uncertainCanvas, true);
  assert.ok(kept.warning);
  assert.ok((keptMeta.height || 0) > 700);

  const whiteInvitation = await rgba({
    width: 400,
    height: 640,
    paint: (x, y) => {
      const ink = x > 80 && x < 320 && y > 180 && y < 460 && ((x + y) % 11 < 2);
      if (ink) return [30, 30, 30, 255];
      return [255, 255, 255, 255];
    },
  });
  const paper = await normalizeInvitationImage(whiteInvitation);
  const paperMeta = await sharp(paper.buffer).metadata();
  assert.equal(paper.trimmedLight, false);
  assert.equal(paper.trimmedTransparent, false);
  assert.equal(paper.uncertainCanvas, true);
  assert.ok((paperMeta.width || 0) >= 392);
  assert.ok((paperMeta.height || 0) >= 632);

  mkdirSync(ARTIFACTS, { recursive: true });
  await sharp(transparent).png().toFile(join(ARTIFACTS, "editor-stage-before.png"));
  await sharp(fromAlpha.buffer).jpeg().toFile(join(ARTIFACTS, "editor-stage-after.jpg"));
  await sharp(whiteInvitation).png().toFile(join(ARTIFACTS, "white-invitation-kept.png"));
});

test("a modest paper margin stays and is not flagged", async () => {
  const margined = await rgba({
    width: 400,
    height: 560,
    paint: (x, y) => {
      const margin = x < 32 || y < 32 || x >= 368 || y >= 528;
      if (margin) return [255, 255, 255, 255];
      return [70, 90, 80, 255];
    },
  });
  const kept = await normalizeInvitationImage(margined);
  const keptMeta = await sharp(kept.buffer).metadata();
  assert.equal(kept.trimmedLight, false);
  assert.equal(kept.uncertainCanvas, false);
  assert.equal(kept.warning, null);
  assert.ok((keptMeta.width || 0) >= 392);
  assert.ok((keptMeta.height || 0) >= 552);
});

test("send-time preparation crops an existing Cloudinary file and then reuses it", async () => {
  const source =
    "https://res.cloudinary.com/dnbewcz79/image/upload/c_limit,w_1600,h_2400/b_rgb:FFFFFF,f_jpg/v1788978595/invistimo/invitations/example.png";
  const original =
    "https://res.cloudinary.com/dnbewcz79/image/upload/v1788978595/invistimo/invitations/example.png";
  const tall = await rgba({
    width: 191,
    height: 712,
    paint: (_x, y) => (y < 272 ? [180, 120, 70, 255] : [0, 0, 0, 0]),
  });

  const fetched: string[] = [];
  const uploaded: Buffer[] = [];
  let cached = false;

  const first = await prepareWhatsappInvitationImageUrl(source, {
    fetch: async (url, init) => {
      fetched.push(`${init?.method || "GET"} ${url}`);
      if ((init?.method || "GET") === "HEAD") {
        return { ok: false, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0) };
      }
      assert.equal(url, original);
      return {
        ok: true,
        headers: { get: () => "image/png" },
        arrayBuffer: async () =>
          tall.buffer.slice(tall.byteOffset, tall.byteOffset + tall.byteLength),
      };
    },
    upload: async (buffer) => {
      uploaded.push(buffer);
      cached = true;
      return "https://res.cloudinary.com/dnbewcz79/image/upload/invistimo/whatsapp-delivery/v3_test.jpg";
    },
  });

  assert.equal(
    first,
    "https://res.cloudinary.com/dnbewcz79/image/upload/invistimo/whatsapp-delivery/v3_test.jpg"
  );
  assert.equal(uploaded.length, 1);
  const uploadedMeta = await sharp(uploaded[0]).metadata();
  assert.ok((uploadedMeta.height || 0) < 320);
  assert.equal(uploadedMeta.isProgressive, false);

  const second = await prepareWhatsappInvitationImageUrl(source, {
    fetch: async (url, init) => {
      fetched.push(`${init?.method || "GET"} ${url}`);
      if ((init?.method || "GET") === "HEAD" && cached) {
        return {
          ok: true,
          headers: { get: () => "image/jpeg" },
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    },
    upload: async () => {
      throw new Error("cached image must not be uploaded again");
    },
  });

  assert.match(second, /\/invistimo\/whatsapp-delivery\/v4_[a-f0-9]{24}\.jpg$/);
  assert.ok(fetched.filter((line) => line.startsWith("GET ")).length === 1);
  assert.equal(
    await prepareWhatsappInvitationImageUrl("https://cdn.example.com/invite.png"),
    "https://cdn.example.com/invite.png"
  );
});
