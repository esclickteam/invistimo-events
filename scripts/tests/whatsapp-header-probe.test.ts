import test from "node:test";
import assert from "node:assert/strict";

import sharp from "sharp";

import {
  HeaderProbeError,
  publicProbeList,
  runWhatsappHeaderProbe,
  WHATSAPP_HEADER_PROBE_IMAGE_URL,
  WHATSAPP_HEADER_PROBE_RECIPIENT,
  WHATSAPP_HEADER_PROBE_TEMPLATE,
  whatsappHeaderProbeArmed,
  type WhatsappHeaderProbeRecord,
  type WhatsappHeaderProbeStore,
} from "../../lib/whatsapp/headerProbe";

function memoryStore(initial: WhatsappHeaderProbeRecord[] = []): WhatsappHeaderProbeStore & {
  rows: WhatsappHeaderProbeRecord[];
} {
  const rows = [...initial];
  return {
    rows,
    async list() {
      return rows.map((row) => ({ ...row }));
    },
    async reserve(mode) {
      if (rows.some((row) => row.mode === mode)) return "duplicate";
      rows.push({
        mode,
        state: "reserved",
        messageId: "",
        httpStatus: 0,
        provider: "dialog",
        errorCode: "",
        errorMessage: "",
        at: null,
      });
      return "ok";
    },
    async complete(mode, result) {
      const row = rows.find((item) => item.mode === mode);
      if (!row) throw new Error("missing reservation");
      Object.assign(row, result, { state: "sent", provider: "dialog" });
    },
    async release(mode) {
      const index = rows.findIndex((item) => item.mode === mode && item.state === "reserved");
      if (index >= 0) rows.splice(index, 1);
    },
  };
}

function jpegResponse() {
  return sharp({
    create: { width: 12, height: 8, channels: 3, background: "#335577" },
  })
    .jpeg({ quality: 80, progressive: false, mozjpeg: false })
    .toBuffer()
    .then(
      (bytes) =>
        new Response(bytes, {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": String(bytes.length) },
        })
    );
}

test("the probe stays disarmed and does not call 360dialog", async () => {
  assert.equal(whatsappHeaderProbeArmed(undefined), false);
  assert.equal(whatsappHeaderProbeArmed("off"), false);
  assert.equal(whatsappHeaderProbeArmed("armed"), false);
  let called = 0;
  const store = memoryStore();
  await assert.rejects(
    () =>
      runWhatsappHeaderProbe("link", {
        store,
        armed: false,
        production: true,
        fetch: (async () => {
          called += 1;
          return new Response("no");
        }) as typeof fetch,
      }),
    (error: any) => error instanceof HeaderProbeError && error.code === "PROBE_DISARMED"
  );
  assert.equal(called, 0);
  assert.equal(store.rows.length, 0);
});

test("link and id both stay on 360dialog for the locked test number only", async () => {
  const file = await sharp({
    create: { width: 12, height: 8, channels: 3, background: "#335577" },
  })
    .jpeg({ quality: 80, progressive: false, mozjpeg: false })
    .toBuffer();
  const calls: Array<{ host: string; path: string; body: any; key: string }> = [];
  const fetchImpl = (async (url: any, init: any) => {
    const target = new URL(String(url));
    const method = String(init?.method || "GET").toUpperCase();
    if (method === "GET") return jpegResponse();
    let body: any = null;
    if (typeof init?.body === "string") body = JSON.parse(init.body);
    else if (init?.body instanceof FormData) {
      const media = init.body.get("file");
      body = {
        messaging_product: init.body.get("messaging_product"),
        bytes: Buffer.from(await (media as File).arrayBuffer()).equals(file),
        type: (media as File).type,
      };
    }
    calls.push({
      host: target.host,
      path: target.pathname,
      body,
      key: String(init?.headers?.["D360-API-KEY"] || ""),
    });
    if (target.pathname.endsWith("/media")) {
      return new Response(JSON.stringify({ id: "media-probe" }), { status: 200 });
    }
    const payload = JSON.parse(init.body);
    const image = payload.template.components[0].parameters[0].image;
    return new Response(
      JSON.stringify({
        messages: [{ id: image.id ? "wamid.id" : "wamid.link" }],
        contacts: [{ input: "972526850711", wa_id: "972526850711" }],
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  const previousKey = process.env.WHATSAPP_API_KEY;
  process.env.WHATSAPP_API_KEY = "production-key";
  const store = memoryStore();
  try {
    const link = await runWhatsappHeaderProbe("link", {
      store,
      armed: true,
      production: true,
      fetch: fetchImpl,
    });
    const id = await runWhatsappHeaderProbe("id", {
      store,
      armed: true,
      production: true,
      fetch: fetchImpl,
    });
    assert.equal(link.provider, "dialog");
    assert.equal(id.provider, "dialog");
    assert.equal(link.messageId, "wamid.link");
    assert.equal(id.messageId, "wamid.id");
  } finally {
    if (previousKey == null) delete process.env.WHATSAPP_API_KEY;
    else process.env.WHATSAPP_API_KEY = previousKey;
  }

  assert.deepEqual(
    calls.map((call) => call.host),
    ["waba-v2.360dialog.io", "waba-v2.360dialog.io", "waba-v2.360dialog.io"]
  );
  assert.equal(calls.some((call) => call.host.includes("bizuply")), false);
  const messagePosts = calls.filter((call) => call.path.endsWith("/messages"));
  assert.equal(messagePosts.length, 2);
  for (const post of messagePosts) {
    assert.equal(post.body.to, WHATSAPP_HEADER_PROBE_RECIPIENT);
    assert.equal(post.body.template.name, WHATSAPP_HEADER_PROBE_TEMPLATE);
    assert.equal(post.body.messaging_product, "whatsapp");
    assert.equal(post.key, "production-key");
  }
  assert.equal(
    messagePosts[0].body.template.components[0].parameters[0].image.link,
    WHATSAPP_HEADER_PROBE_IMAGE_URL
  );
  assert.equal(messagePosts[0].body.template.components[0].parameters[0].image.id, undefined);
  assert.equal(messagePosts[1].body.template.components[0].parameters[0].image.id, "media-probe");
  assert.equal(messagePosts[1].body.template.components[0].parameters[0].image.link, undefined);
  const upload = calls.find((call) => call.path.endsWith("/media"));
  assert.equal(upload?.body.bytes, true);
  assert.equal(upload?.body.type, "image/jpeg");
  assert.deepEqual(
    publicProbeList(store.rows).map((row) => row.mode),
    ["link", "id"]
  );
  assert.equal(JSON.stringify(store.rows).includes("972526850711"), false);

  await assert.rejects(
    () =>
      runWhatsappHeaderProbe("link", {
        store,
        armed: true,
        production: true,
        fetch: fetchImpl,
      }),
    (error: any) => error.code === "PROBE_ALREADY_SENT"
  );
});

test("a non-production environment cannot send the probe", async () => {
  let called = 0;
  await assert.rejects(
    () =>
      runWhatsappHeaderProbe("id", {
        store: memoryStore(),
        armed: true,
        production: false,
        fetch: (async () => {
          called += 1;
          return new Response("no");
        }) as typeof fetch,
      }),
    (error: any) => error.code === "PROBE_NOT_PRODUCTION"
  );
  assert.equal(called, 0);
});
