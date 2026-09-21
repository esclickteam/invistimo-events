import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

import {
  collectAuthTokenCandidates,
  loginJsonHasToken,
  readBearerToken,
} from "../../lib/auth/bearerToken";
import { resetLoginRateLimitForTests } from "../../lib/auth/loginRateLimit";
import { getUserIdFromRequest } from "../../lib/getUserIdFromRequest";
import { POST as loginPost } from "../../app/api/login/route";
import { GET as meGet } from "../../app/api/me/route";
import { GET as eventsGet } from "../../app/api/events/route";
import { GET as invitationGet } from "../../app/api/invitations/my/route";
import { GET as guestsGet } from "../../app/api/invitations/[id]/guests/route";
import User from "../../models/User";
import Event from "../../models/Event";
import Invitation from "../../models/Invitation";
import InvitationGuest from "../../models/InvitationGuest";
import {
  nativeAuthHeaders,
  readLoginTokenFromBody,
} from "../../mobile/src/authToken";

function parseSetCookies(res: Response) {
  const raw =
    (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ||
    [];
  const list: string[] = Array.isArray(raw) && raw.length
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

test("readBearerToken only accepts Authorization Bearer values", () => {
  assert.equal(readBearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(readBearerToken("bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(readBearerToken("Basic abc"), null);
  assert.equal(readBearerToken("Bearer "), null);
  assert.equal(readBearerToken("Bearer null"), null);
  assert.equal(readBearerToken(null), null);
});

test("cookie tokens stay ahead of the native Bearer token", () => {
  const ordered = collectAuthTokenCandidates({
    cookieAuthTokens: ["cookie-jwt", null, ""],
    bearerToken: "bearer-jwt",
  });
  assert.deepEqual(ordered, ["cookie-jwt", "bearer-jwt"]);
});

test("login JSON helper requires success and a token", () => {
  assert.equal(loginJsonHasToken({ success: true, token: "jwt" }), true);
  assert.equal(loginJsonHasToken({ success: false, error: "nope" }), false);
  assert.equal(loginJsonHasToken({ success: true }), false);
});

test("mobile client reads the JSON token and sends Authorization Bearer", () => {
  assert.equal(
    readLoginTokenFromBody({ success: true, token: " jwt-from-body " }),
    "jwt-from-body"
  );
  assert.equal(
    readLoginTokenFromBody({ success: false, error: "מייל/טלפון או סיסמה שגויים" }),
    null
  );
  assert.deepEqual(nativeAuthHeaders("jwt-from-body"), {
    Authorization: "Bearer jwt-from-body",
  });
});

test("website cookie login and native Bearer login", async (t) => {
  let mongod: MongoMemoryServer | null = null;

  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.APP_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-login-native-token";
  process.env.MONGO_URI = mongod.getUri();
  process.env.MONGODB_URI = process.env.MONGO_URI;
  resetLoginRateLimitForTests();

  await mongoose.connect(process.env.MONGO_URI);

  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);
  const owner = await User.create({
    name: "Native Login Owner",
    email: "native-login-owner@test.local",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    guests: 50,
    maxGuests: 50,
    needsPasswordSetup: false,
  });
  const other = await User.create({
    name: "Other Cookie User",
    email: "native-login-other@test.local",
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
    title: "Native Login Event",
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
    title: "Native Login Event",
    shareId: "nativeLoginShare",
    canvasData: {},
    maxGuests: 50,
    guests: [],
  });

  await InvitationGuest.create({
    invitationId: invitation._id,
    name: "אורח מהאתר",
    phone: "0501111111",
    rsvp: "yes",
    guestsCount: 2,
    token: "native-login-guest-token",
  });

  try {
    await t.test("failed login does not return a token", async () => {
      const res = await loginPost(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: owner.email,
            password: "wrong-password",
          }),
        })
      );
      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.token, undefined);
      assert.equal("token" in body, false);
    });

    await t.test("successful website login still sets the HttpOnly cookie", async () => {
      const res = await loginPost(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: owner.email,
            password,
          }),
        })
      );
      const body = await res.json();
      const cookies = parseSetCookies(res);
      const cookieToken = cookies.get("authToken");

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(typeof body.token, "string");
      assert.ok(body.token.length > 20);
      assert.ok(cookieToken);
      assert.equal(cookieToken, body.token);
      assert.equal(String(body.user._id), String(owner._id));

      const decoded = jwt.verify(body.token, process.env.JWT_SECRET!) as {
        userId: string;
      };
      assert.equal(decoded.userId, String(owner._id));

      const cookieAuth = await getUserIdFromRequest(
        new Request("http://localhost/api/events", {
          headers: { cookie: `authToken=${cookieToken}` },
        })
      );
      assert.equal(String(cookieAuth?.userId), String(owner._id));
    });

    await t.test("native JSON token loads me, event, invitation and guests without Set-Cookie", async () => {
      const loginRes = await loginPost(
        new Request("http://localhost/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: owner.email,
            password,
          }),
        })
      );
      const loginBody = await loginRes.json();
      const token = readLoginTokenFromBody(loginBody);
      assert.ok(token);

      const headers = nativeAuthHeaders(token);
      const meRes = await meGet(
        new Request("http://localhost/api/me", { headers })
      );
      const meBody = await meRes.json();
      assert.equal(meRes.status, 200);
      assert.equal(meBody.success, true);
      assert.equal(String(meBody.user._id), String(owner._id));

      const eventsRes = await eventsGet(
        new NextRequest("http://localhost/api/events", { headers })
      );
      const eventsBody = await eventsRes.json();
      assert.equal(eventsRes.status, 200);
      assert.equal(eventsBody.success, true);
      assert.equal(String(eventsBody.event._id), String(event._id));

      const invitationRes = await invitationGet(
        new Request("http://localhost/api/invitations/my", { headers })
      );
      const invitationBody = await invitationRes.json();
      assert.equal(invitationRes.status, 200);
      assert.equal(invitationBody.success, true);
      assert.equal(String(invitationBody.invitation._id), String(invitation._id));

      const guestsRes = await guestsGet(
        new NextRequest(
          `http://localhost/api/invitations/${invitation._id}/guests`,
          { headers }
        ),
        { params: Promise.resolve({ id: String(invitation._id) }) }
      );
      const guestsBody = await guestsRes.json();
      assert.equal(guestsRes.status, 200);
      assert.equal(guestsBody.success, true);
      assert.equal(guestsBody.guests.length, 1);
      assert.equal(guestsBody.guests[0].name, "אורח מהאתר");
    });

    await t.test("website cookie wins when a different Bearer token is also present", async () => {
      const ownerToken = jwt.sign(
        { userId: String(owner._id), role: "user", authVersion: 0 },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );
      const otherToken = jwt.sign(
        { userId: String(other._id), role: "user", authVersion: 0 },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      const auth = await getUserIdFromRequest(
        new Request("http://localhost/api/events", {
          headers: {
            cookie: `authToken=${otherToken}`,
            authorization: `Bearer ${ownerToken}`,
          },
        })
      );

      assert.equal(String(auth?.userId), String(other._id));
    });
  } finally {
    resetLoginRateLimitForTests();
    await mongoose.disconnect().catch(() => undefined);
    await mongod.stop();
  }
});
