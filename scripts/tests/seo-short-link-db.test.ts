import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

test("a saved short link still redirects, and an unknown code is a real 404", async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri("seo_short_links");
  process.env.APP_ENV = "test";

  try {
    const { NextRequest } = await import("next/server");
    const dbConnect = (await import("../../lib/db")).default;
    const ShortLink = (await import("../../models/ShortLink")).default;
    const { GET } = await import("../../app/[code]/route");

    await dbConnect();
    await ShortLink.create({
      code: "ab12x",
      targetUrl: "https://www.invistimo.com/e/share-keep",
    });

    const found = await GET(new NextRequest("http://localhost/ab12x"), {
      params: Promise.resolve({ code: "ab12x" }),
    });
    assert.equal(found.status, 302);
    assert.equal(found.headers.get("location"), "https://www.invistimo.com/e/share-keep");

    await assert.rejects(
      () =>
        GET(new NextRequest("http://localhost/nope1"), {
          params: Promise.resolve({ code: "nope1" }),
        }),
      (error: unknown) => {
        const digest = String((error as { digest?: string; message?: string })?.digest || (error as { message?: string })?.message || "");
        return digest.includes("404");
      }
    );
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
