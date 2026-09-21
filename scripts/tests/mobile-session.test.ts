import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { resetLoginRateLimitForTests } from "../../lib/auth/loginRateLimit";
import { wantsMobileSession } from "../../lib/auth/mobileClient";
import { getUserIdFromRequest } from "../../lib/getUserIdFromRequest";
import { POST as loginPost } from "../../app/api/login/route";
import { GET as meGet } from "../../app/api/me/route";
import { POST as mobileRefreshPost } from "../../app/api/auth/mobile/refresh/route";
import { POST as mobileLogoutPost } from "../../app/api/auth/mobile/logout/route";
import { GET as websiteLogoutGet } from "../../app/api/logout/route";
import User from "../../models/User";
import Event from "../../models/Event";
import Invitation from "../../models/Invitation";
import InvitationGuest from "../../models/InvitationGuest";
import MobileRefreshToken from "../../models/MobileRefreshToken";

function parseSetCookies(res: Response) {
  const raw =
    (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ||
    [];
  const list: string[] =
    Array.isArray(raw) && raw.length
      ? raw
      : String(res.headers.get("set-cookie") || "")
          .split(/,(?=\s*[^;]+=)/)
          .filter(Boolean);

  const map = new Map<string, string>();
  for (const entry of list) {
    const pair = String(entry).split(";")[0];
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return map;
}

test("wantsMobileSession is header or body based", () => {
  const nativeReq = new Request("http://localhost/api/login", {
    headers: { "x-invistimo-client": "native" },
  });
  assert.equal(wantsMobileSession(nativeReq), true);
  const webReq = new Request("http://localhost/api/login");
  assert.equal(wantsMobileSession(webReq, { email: "a" } as never), false);
  assert.equal(wantsMobileSession(webReq, { client: "native" }), true);
});

test("mobile refresh session is independent from website cookies", async (t) => {
  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.APP_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-mobile-session";
  process.env.MONGO_URI = mongod.getUri();
  process.env.MONGODB_URI = process.env.MONGO_URI;
  resetLoginRateLimitForTests();
  await mongoose.connect(process.env.MONGO_URI);

  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);
  const owner = await User.create({
    name: "Mobile Session Owner",
    email: "mobile-session-owner@test.local",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    guests: 50,
    maxGuests: 50,
    needsPasswordSetup: false,
    authVersion: 0,
  });
  const other = await User.create({
    name: "Other Mobile User",
    email: "mobile-session-other@test.local",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    guests: 10,
    maxGuests: 10,
    needsPasswordSetup: false,
  });
  const event = await Event.create({
    userId: owner._id,
    email: owner.email,
    eventType: "wedding",
    title: "Mobile Session Event",
    date: "2026-12-12",
    time: "19:00",
    status: "active",
    paymentStatus: "paid",
    location: { address: "" },
    zones: [],
    planning: {
      eventDefinition: { goal: "", vibe: "", size: "", notes: "" },
      concept: "",
    },
    maxGuests: 50,
  });
  const invitation = await Invitation.create({
    ownerId: owner._id,
    eventId: event._id,
    title: "Mobile Session Event",
    shareId: "mobileSessionShare",
    canvasData: {},
    maxGuests: 50,
    guests: [],
  });
  await InvitationGuest.create({
    invitationId: invitation._id,
    name: "אורח",
    phone: "0501111111",
    rsvp: "yes",
    guestsCount: 2,
    token: "mobile-session-guest-token",
  });

  try {
    await t.test("native login returns refresh token without changing cookie login", async () => {
      const res = await loginPost(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Invistimo-Client": "native",
          },
          body: JSON.stringify({
            email: owner.email,
            password,
            client: "native",
          }),
        })
      );
      const body = await res.json();
      const cookies = parseSetCookies(res);
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(typeof body.token, "string");
      assert.equal(typeof body.refreshToken, "string");
      assert.equal(body.refreshToken.length, 64);
      assert.equal(cookies.get("authToken"), body.token);
      assert.notEqual(body.refreshToken, body.token);
      assert.equal(await MobileRefreshToken.countDocuments({ userId: owner._id }), 1);
    });

    await t.test("website login still does not create a mobile refresh session", async () => {
      await MobileRefreshToken.deleteMany({});
      const res = await loginPost(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: owner.email, password }),
        })
      );
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.refreshToken, undefined);
      assert.equal(await MobileRefreshToken.countDocuments({}), 0);
    });

    await t.test("refresh rotates, reuse revokes the family, and expired access can be replaced", async () => {
      await MobileRefreshToken.deleteMany({});
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
      const firstRefresh = loginBody.refreshToken as string;
      const expiredAccess = jwt.sign(
        {
          userId: String(owner._id),
          role: "user",
          authVersion: 0,
          exp: Math.floor(Date.now() / 1000) - 30,
        },
        process.env.JWT_SECRET!
      );

      const expiredMe = await meGet(
        new Request("http://localhost/api/me", {
          headers: { Authorization: `Bearer ${expiredAccess}` },
        })
      );
      assert.equal(expiredMe.status, 401);

      const refreshRes = await mobileRefreshPost(
        new Request("http://localhost/api/auth/mobile/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: firstRefresh }),
        })
      );
      const refreshBody = await refreshRes.json();
      assert.equal(refreshRes.status, 200);
      assert.equal(refreshBody.success, true);
      assert.equal(typeof refreshBody.token, "string");
      assert.equal(typeof refreshBody.refreshToken, "string");
      assert.notEqual(refreshBody.refreshToken, firstRefresh);

      const meRes = await meGet(
        new Request("http://localhost/api/me", {
          headers: { Authorization: `Bearer ${refreshBody.token}` },
        })
      );
      const meBody = await meRes.json();
      assert.equal(meRes.status, 200);
      assert.equal(String(meBody.user._id), String(owner._id));

      const reused = await mobileRefreshPost(
        new Request("http://localhost/api/auth/mobile/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: firstRefresh }),
        })
      );
      const reusedBody = await reused.json();
      assert.equal(reused.status, 401);
      assert.equal(reusedBody.success, false);
      assert.equal(reusedBody.error, "INVALID_SESSION");
      assert.equal(reusedBody.token, undefined);

      const afterReuse = await mobileRefreshPost(
        new Request("http://localhost/api/auth/mobile/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refreshBody.refreshToken }),
        })
      );
      assert.equal(afterReuse.status, 401);
    });

    await t.test("mobile logout revokes refresh but does not delete website cookies", async () => {
      await MobileRefreshToken.deleteMany({});
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
      const cookieToken = parseSetCookies(loginRes).get("authToken");
      const refreshToken = loginBody.refreshToken as string;

      const logoutRes = await mobileLogoutPost(
        new Request("http://localhost/api/auth/mobile/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
      );
      const logoutBody = await logoutRes.json();
      assert.equal(logoutBody.success, true);
      assert.equal(parseSetCookies(logoutRes).has("authToken"), false);

      const refreshRes = await mobileRefreshPost(
        new Request("http://localhost/api/auth/mobile/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
      );
      assert.equal(refreshRes.status, 401);

      const cookieAuth = await getUserIdFromRequest(
        new Request("http://localhost/api/me", {
          headers: { cookie: `authToken=${cookieToken}` },
        })
      );
      assert.equal(String(cookieAuth?.userId), String(owner._id));
    });

    await t.test("website logout does not revoke the mobile refresh family", async () => {
      await MobileRefreshToken.deleteMany({});
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
      const websiteLogout = await websiteLogoutGet(
        new Request("http://localhost/api/logout", { method: "GET" })
      );
      assert.equal(websiteLogout.status, 303);

      const refreshRes = await mobileRefreshPost(
        new Request("http://localhost/api/auth/mobile/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: loginBody.refreshToken }),
        })
      );
      const refreshBody = await refreshRes.json();
      assert.equal(refreshRes.status, 200);
      assert.equal(refreshBody.success, true);
    });

    await t.test("authVersion change invalidates mobile refresh", async () => {
      await MobileRefreshToken.deleteMany({});
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
      await User.updateOne({ _id: owner._id }, { $inc: { authVersion: 1 } });
      const refreshRes = await mobileRefreshPost(
        new Request("http://localhost/api/auth/mobile/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: loginBody.refreshToken }),
        })
      );
      const refreshBody = await refreshRes.json();
      assert.equal(refreshRes.status, 401);
      assert.equal(refreshBody.error, "INVALID_SESSION");
      await User.updateOne({ _id: owner._id }, { $set: { authVersion: 0 } });
    });

    await t.test("malformed and foreign tokens cannot read another user's guests", async () => {
      const malformedMe = await meGet(
        new Request("http://localhost/api/me", {
          headers: { Authorization: "Bearer not-a-jwt" },
        })
      );
      const malformedBody = await malformedMe.json();
      assert.equal(malformedMe.status, 401);
      assert.equal(malformedBody.token, undefined);

      const otherToken = jwt.sign(
        { userId: String(other._id), role: "user", authVersion: 0 },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );
      const { GET: guestsGet } = await import(
        "../../app/api/invitations/[id]/guests/route"
      );
      const { NextRequest } = await import("next/server");
      const guestsRes = await guestsGet(
        new NextRequest(
          `http://localhost/api/invitations/${invitation._id}/guests`,
          { headers: { Authorization: `Bearer ${otherToken}` } }
        ),
        { params: Promise.resolve({ id: String(invitation._id) }) }
      );
      assert.notEqual(guestsRes.status, 200);
    });
  } finally {
    resetLoginRateLimitForTests();
    await mongoose.disconnect().catch(() => undefined);
    await mongod.stop();
  }
});
