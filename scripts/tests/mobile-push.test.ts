import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { resetLoginRateLimitForTests } from "../../lib/auth/loginRateLimit";
import { sanitizeNativePushPayload } from "../../lib/push/nativePush";
import { registerMobilePushDevice } from "../../lib/push/mobilePushDevices";
import { sendNativePushToUser } from "../../lib/push/sendNativePush";
import { POST as registerPost } from "../../app/api/auth/mobile/push/register/route";
import { POST as unregisterPost } from "../../app/api/auth/mobile/push/unregister/route";
import { POST as loginPost } from "../../app/api/login/route";
import { GET as websiteLogoutGet } from "../../app/api/logout/route";
import User from "../../models/User";
import MobilePushDevice from "../../models/MobilePushDevice";

const TOKEN_A = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const TOKEN_B = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

test("native push payloads never include guest or auth secrets", () => {
  const payload = sanitizeNativePushPayload({
    type: "rsvp",
    title: "secret",
    body: "0501111111",
    data: {
      guestName: "דנה",
      phone: "0501111111",
      token: "guest-secret",
      authorization: "Bearer abc",
    },
  });
  const serialized = JSON.stringify(payload);
  assert.equal(payload.data.type, "rsvp");
  assert.equal(payload.data.screen, "guests");
  assert.equal("guestName" in payload.data, false);
  assert.doesNotMatch(serialized, /דנה|0501111111|guest-secret|Bearer/);
});

test("mobile push registration is authorized and independent from website logout", async (t) => {
  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.APP_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-mobile-push";
  process.env.MONGO_URI = mongod.getUri();
  process.env.MONGODB_URI = process.env.MONGO_URI;
  resetLoginRateLimitForTests();
  await mongoose.connect(process.env.MONGO_URI);

  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);
  const owner = await User.create({
    name: "Push Owner",
    email: "mobile-push-owner@test.local",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    guests: 20,
    maxGuests: 20,
    needsPasswordSetup: false,
  });
  const other = await User.create({
    name: "Other Push User",
    email: "mobile-push-other@test.local",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    guests: 10,
    maxGuests: 10,
    needsPasswordSetup: false,
  });

  function bearer(userId: string) {
    return jwt.sign(
      { userId, role: "user", authVersion: 0 },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
  }

  try {
    await t.test("register requires auth and native client", async () => {
      const unauth = await registerPost(
        new Request("http://localhost/api/auth/mobile/push/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Invistimo-Client": "native",
          },
          body: JSON.stringify({ expoPushToken: TOKEN_A, client: "native" }),
        })
      );
      assert.equal(unauth.status, 401);

      const web = await registerPost(
        new Request("http://localhost/api/auth/mobile/push/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearer(String(owner._id))}`,
          },
          body: JSON.stringify({ expoPushToken: TOKEN_A }),
        })
      );
      assert.equal(web.status, 400);
    });

    await t.test("register upserts the same token and updates a changed token", async () => {
      const first = await registerPost(
        new Request("http://localhost/api/auth/mobile/push/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Invistimo-Client": "native",
            Authorization: `Bearer ${bearer(String(owner._id))}`,
          },
          body: JSON.stringify({
            client: "native",
            expoPushToken: TOKEN_A,
            deviceId: "iphone-1",
            platform: "ios",
          }),
        })
      );
      const firstBody = await first.json();
      assert.equal(first.status, 200);
      assert.equal(firstBody.success, true);

      await registerPost(
        new Request("http://localhost/api/auth/mobile/push/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Invistimo-Client": "native",
            Authorization: `Bearer ${bearer(String(owner._id))}`,
          },
          body: JSON.stringify({
            client: "native",
            expoPushToken: TOKEN_A,
            deviceId: "iphone-1",
            platform: "ios",
          }),
        })
      );
      assert.equal(await MobilePushDevice.countDocuments({ userId: owner._id, revokedAt: null }), 1);

      await registerPost(
        new Request("http://localhost/api/auth/mobile/push/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Invistimo-Client": "native",
            Authorization: `Bearer ${bearer(String(owner._id))}`,
          },
          body: JSON.stringify({
            client: "native",
            expoPushToken: TOKEN_B,
            deviceId: "iphone-1",
            platform: "ios",
          }),
        })
      );
      const active = await MobilePushDevice.find({ userId: owner._id, revokedAt: null });
      assert.equal(active.length, 1);
      assert.equal(active[0].expoPushToken, TOKEN_B);
    });

    await t.test("another user cannot revoke this device token", async () => {
      const res = await unregisterPost(
        new Request("http://localhost/api/auth/mobile/push/unregister", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Invistimo-Client": "native",
            Authorization: `Bearer ${bearer(String(other._id))}`,
          },
          body: JSON.stringify({
            client: "native",
            expoPushToken: TOKEN_B,
            deviceId: "iphone-1",
          }),
        })
      );
      assert.equal(res.status, 200);
      const still = await MobilePushDevice.findOne({
        userId: owner._id,
        expoPushToken: TOKEN_B,
        revokedAt: null,
      });
      assert.ok(still);
    });

    await t.test("owner logout of the website does not revoke native push", async () => {
      await websiteLogoutGet(new Request("http://localhost/api/logout"));
      const still = await MobilePushDevice.findOne({
        userId: owner._id,
        expoPushToken: TOKEN_B,
        revokedAt: null,
      });
      assert.ok(still);
    });

    await t.test("disabled preference skips Expo delivery", async () => {
      await MobilePushDevice.updateMany(
        { userId: owner._id },
        { $set: { enabled: false } }
      );
      const originalFetch = globalThis.fetch;
      let called = false;
      globalThis.fetch = (async () => {
        called = true;
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }) as typeof fetch;
      try {
        const result = await sendNativePushToUser(String(owner._id), { type: "rsvp" });
        assert.equal(result.sent, 0);
        assert.equal(called, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test("native login plus register does not create duplicate rows", async () => {
      await registerMobilePushDevice({
        userId: String(owner._id),
        expoPushToken: TOKEN_B,
        deviceId: "iphone-1",
        platform: "ios",
      });
      await registerMobilePushDevice({
        userId: String(owner._id),
        expoPushToken: TOKEN_B,
        deviceId: "iphone-1",
        platform: "ios",
      });
      assert.equal(
        await MobilePushDevice.countDocuments({ expoPushToken: TOKEN_B, revokedAt: null }),
        1
      );
      const loginRes = await loginPost(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Invistimo-Client": "native",
          },
          body: JSON.stringify({ email: owner.email, password, client: "native" }),
        })
      );
      const loginBody = await loginRes.json();
      assert.equal(loginBody.success, true);
      assert.equal(typeof loginBody.refreshToken, "string");
    });
  } finally {
    resetLoginRateLimitForTests();
    await mongoose.disconnect().catch(() => undefined);
    await mongod.stop();
  }
});
