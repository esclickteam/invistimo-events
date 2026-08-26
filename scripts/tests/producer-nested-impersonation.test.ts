/**
 * Nested impersonation: Admin → Producer → Client.
 *
 * Regression: POST /api/producer/impersonate returned 401 while an admin was
 * already impersonating the producer, even though /api/producer/clients worked.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import User from "../../models/User";
import { getUserIdFromRequest } from "../../lib/getUserIdFromRequest";
import { POST as producerImpersonate } from "../../app/api/producer/impersonate/route";
import { POST as producerStopImpersonation } from "../../app/api/producer/stop-impersonation/route";

function cookieHeader(cookies: Record<string, string | null | undefined>) {
  return Object.entries(cookies)
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

function parseSetCookies(res: Response) {
  const raw = (res.headers as any).getSetCookie?.() || [];
  const list: string[] = Array.isArray(raw)
    ? raw
    : String(res.headers.get("set-cookie") || "")
        .split(/,(?=\s*[^;]+=)/)
        .filter(Boolean);

  const map = new Map<string, string>();
  for (const entry of list) {
    const pair = String(entry).split(";")[0];
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value) map.set(name, value);
  }
  return map;
}

test("producer nested impersonation suite", async (t) => {
  let replset: MongoMemoryReplSet | null = null;

  try {
    replset = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.APP_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-producer-impersonation";
  process.env.MONGO_URI = replset.getUri();
  process.env.MONGODB_URI = process.env.MONGO_URI;

  await mongoose.connect(process.env.MONGO_URI);
  await new Promise((r) => setTimeout(r, 600));

  try {
    await User.createCollection();
  } catch {
    /* already exists */
  }

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await User.create({
    name: "Admin",
    email: "admin-impersonation@test.local",
    password: passwordHash,
    role: "admin",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
  });

  const producer = await User.create({
    name: "Producer",
    email: "producer-impersonation@test.local",
    password: passwordHash,
    role: "producer",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
  });

  const otherProducer = await User.create({
    name: "Other Producer",
    email: "other-producer-impersonation@test.local",
    password: passwordHash,
    role: "producer",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
  });

  const clientA = await User.create({
    name: "Client A",
    email: "client-a-impersonation@test.local",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    assignedProducerId: producer._id,
    assignedProducerIds: [producer._id],
  });

  const clientB = await User.create({
    name: "Client B",
    email: "client-b-impersonation@test.local",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    assignedProducerId: producer._id,
    assignedProducerIds: [producer._id],
  });

  const foreignClient = await User.create({
    name: "Foreign Client",
    email: "foreign-client-impersonation@test.local",
    password: passwordHash,
    role: "user",
    isActive: true,
    hasPaid: true,
    needsPasswordSetup: false,
    authVersion: 0,
    assignedProducerId: otherProducer._id,
    assignedProducerIds: [otherProducer._id],
  });

  const adminLoginToken = signToken({
    userId: String(admin._id),
    role: "admin",
    hasPaid: true,
    isTrial: false,
    authVersion: 0,
  });

  const producerLoginToken = signToken({
    userId: String(producer._id),
    role: "producer",
    hasPaid: true,
    isTrial: false,
    authVersion: 0,
  });

  const adminAsProducerToken = signToken({
    userId: String(producer._id),
    role: "producer",
    authVersion: 0,
    impersonated: true,
    impersonatedBy: String(admin._id),
    impersonatedByAdmin: true,
    adminId: String(admin._id),
    impersonationRole: "producer",
    originalTargetRole: "producer",
    impersonationSourceRole: "admin",
  });

  async function impersonateWithCookies(
    cookies: Record<string, string | null | undefined>,
    clientId: string
  ) {
    const req = new NextRequest("http://localhost/api/producer/impersonate", {
      method: "POST",
      headers: {
        cookie: cookieHeader(cookies),
        "content-type": "application/json",
      },
      body: JSON.stringify({ clientId }),
    });
    return producerImpersonate(req);
  }

  await t.test("Producer רגיל נכנס ללקוח שלו → PASS", async () => {
    const res = await impersonateWithCookies(
      { authToken: producerLoginToken },
      String(clientA._id)
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const setCookies = parseSetCookies(res);
    const nested = jwt.decode(setCookies.get("authToken") || "") as any;
    assert.equal(String(nested.userId), String(clientA._id));
    assert.equal(nested.impersonated, true);
    assert.equal(String(nested.impersonatedBy), String(producer._id));
    assert.equal(nested.authVersion, 0);
  });

  await t.test(
    "Admin מתחזה ל-Producer → ניהול לקוח ראשון לא מחזיר 401",
    async () => {
      const auth = await getUserIdFromRequest(
        new Request("http://localhost/api/producer/impersonate", {
          headers: {
            cookie: cookieHeader({
              adminAuthToken: adminLoginToken,
              authToken: adminAsProducerToken,
              impersonationToken: adminAsProducerToken,
            }),
          },
        })
      );

      assert.ok(auth);
      assert.equal(auth!.role, "producer");
      assert.equal(String(auth!.userId), String(producer._id));
      assert.notEqual(String(auth!.userId), String(admin._id));
      assert.equal(auth!.impersonated, true);
      assert.equal(auth!.impersonatedByAdmin, true);
      assert.equal(auth!.impersonationSourceRole, "admin");

      const res = await impersonateWithCookies(
        {
          adminAuthToken: adminLoginToken,
          authToken: adminAsProducerToken,
          impersonationToken: adminAsProducerToken,
        },
        String(clientA._id)
      );

      assert.equal(res.status, 200, await res.clone().text());
      const body = await res.json();
      assert.equal(body.success, true);

      const setCookies = parseSetCookies(res);
      const nested = jwt.decode(setCookies.get("impersonationToken") || "") as any;
      assert.equal(String(nested.userId), String(clientA._id));
      assert.equal(String(nested.impersonatedBy), String(producer._id));
      assert.equal(nested.impersonatedByAdmin, true);
      assert.equal(nested.impersonationSourceRole, "admin");
      assert.equal(nested.authVersion, 0);
      assert.ok(setCookies.get("producerAuthToken"));
    }
  );

  await t.test(
    "duplicate leftover admin authToken is not used as producer identity",
    async () => {
      const req = new Request("http://localhost/api/producer/impersonate", {
        headers: {
          cookie: [
            `authToken=${adminLoginToken}`,
            `authToken=${adminAsProducerToken}`,
            `impersonationToken=${adminAsProducerToken}`,
            `adminAuthToken=${adminLoginToken}`,
          ].join("; "),
        },
      });
      const auth = await getUserIdFromRequest(req);
      assert.equal(auth?.role, "producer");
      assert.equal(String(auth?.userId), String(producer._id));

      const duplicateReq = new NextRequest(
        "http://localhost/api/producer/impersonate",
        {
          method: "POST",
          headers: {
            cookie: [
              `authToken=${adminLoginToken}`,
              `authToken=${adminAsProducerToken}`,
              `impersonationToken=${adminAsProducerToken}`,
              `adminAuthToken=${adminLoginToken}`,
            ].join("; "),
            "content-type": "application/json",
          },
          body: JSON.stringify({ clientId: String(clientA._id) }),
        }
      );
      const duplicateRes = await producerImpersonate(duplicateReq);
      assert.equal(duplicateRes.status, 200, await duplicateRes.clone().text());

      const res = await impersonateWithCookies(
        {
          authToken: adminLoginToken,
        },
        String(clientA._id)
      );

      /*
        Only leftover admin token — must 401. Producer actions require the
        producer identity, not a raw admin session.
      */
      assert.equal(res.status, 401);
    }
  );

  await t.test(
    "session token can live on impersonationToken without authToken",
    async () => {
      const res = await impersonateWithCookies(
        {
          impersonationToken: adminAsProducerToken,
          adminAuthToken: adminLoginToken,
        },
        String(clientB._id)
      );
      assert.equal(res.status, 200, await res.clone().text());
      const body = await res.json();
      assert.equal(body.success, true);
    }
  );

  await t.test("מעבר בין כמה לקוחות של אותו מפיק → PASS", async () => {
    const first = await impersonateWithCookies(
      {
        authToken: adminAsProducerToken,
        impersonationToken: adminAsProducerToken,
        adminAuthToken: adminLoginToken,
      },
      String(clientA._id)
    );
    assert.equal(first.status, 200);
    const firstCookies = parseSetCookies(first);

    const stop = await producerStopImpersonation(
      new NextRequest("http://localhost/api/producer/stop-impersonation", {
        method: "POST",
        headers: {
          cookie: cookieHeader({
            producerAuthToken: firstCookies.get("producerAuthToken"),
            authToken: firstCookies.get("authToken"),
            impersonationToken: firstCookies.get("impersonationToken"),
            adminAuthToken: adminLoginToken,
          }),
        },
      })
    );
    assert.equal(stop.status, 200, await stop.clone().text());
    const restored = parseSetCookies(stop);
    const restoredAuth = jwt.decode(restored.get("authToken") || "") as any;
    assert.equal(String(restoredAuth.userId), String(producer._id));
    assert.equal(restoredAuth.impersonationSourceRole, "admin");
    assert.equal(restored.get("impersonationToken"), restored.get("authToken"));

    const second = await impersonateWithCookies(
      {
        authToken: restored.get("authToken"),
        impersonationToken: restored.get("impersonationToken"),
        adminAuthToken: adminLoginToken,
      },
      String(clientB._id)
    );
    assert.equal(second.status, 200, await second.clone().text());
    const secondNested = jwt.decode(
      parseSetCookies(second).get("authToken") || ""
    ) as any;
    assert.equal(String(secondNested.userId), String(clientB._id));
  });

  await t.test("Producer לא יכול להיכנס ללקוח שלא משויך אליו → 403", async () => {
    const asProducer = await impersonateWithCookies(
      { authToken: producerLoginToken },
      String(foreignClient._id)
    );
    assert.equal(asProducer.status, 403);

    const asAdminProducer = await impersonateWithCookies(
      {
        authToken: adminAsProducerToken,
        impersonationToken: adminAsProducerToken,
        adminAuthToken: adminLoginToken,
      },
      String(foreignClient._id)
    );
    assert.equal(asAdminProducer.status, 403);
  });

  await t.test("refresh בתוך חשבון הלקוח לא שובר את ה-session", async () => {
    const res = await impersonateWithCookies(
      {
        authToken: adminAsProducerToken,
        impersonationToken: adminAsProducerToken,
        adminAuthToken: adminLoginToken,
      },
      String(clientA._id)
    );
    assert.equal(res.status, 200);
    const nestedToken = parseSetCookies(res).get("authToken");
    assert.ok(nestedToken);

    const auth = await getUserIdFromRequest(
      new Request("http://localhost/api/me", {
        headers: {
          cookie: cookieHeader({
            authToken: nestedToken,
            impersonationToken: nestedToken,
            producerAuthToken: adminAsProducerToken,
            adminAuthToken: adminLoginToken,
          }),
        },
      })
    );

    assert.ok(auth);
    assert.equal(String(auth!.userId), String(clientA._id));
    assert.equal(auth!.impersonated, true);
    assert.equal(String(auth!.impersonatedBy), String(producer._id));
    assert.equal(auth!.impersonatedByAdmin, true);
  });
  } finally {
    await mongoose.disconnect().catch(() => undefined);
    await replset.stop();
  }
});
