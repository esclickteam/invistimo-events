/**
 * Admin entry into a customer account must use that customer's identity.
 * The same event, invitation, balance, and guest writes are visible to both.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

import User from "../../models/User";
import Event from "../../models/Event";
import Invitation from "../../models/Invitation";
import InvitationGuest from "../../models/InvitationGuest";
import AdminAuditLog from "../../models/AdminAuditLog";
import { getUserIdFromRequest } from "../../lib/getUserIdFromRequest";
import { POST as enterCustomer } from "../../app/api/admin/manage-user/route";
import { POST as stopImpersonation } from "../../app/api/admin/stop-impersonation/route";
import { GET as getEvents, PATCH as patchEvents } from "../../app/api/events/route";
import { GET as getMyInvitation } from "../../app/api/invitations/my/route";
import { PUT as updateGuest } from "../../app/api/guests/[id]/route";

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

function authed(path: string, token: string, init?: RequestInit) {
  return new NextRequest(`http://localhost${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      cookie: `authToken=${token}`,
    },
  });
}

test("admin customer account session matches the customer", async (t) => {
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
  process.env.JWT_SECRET = "test-jwt-secret-admin-customer-session";
  process.env.MONGO_URI = replset.getUri();
  process.env.MONGODB_URI = process.env.MONGO_URI;
  process.env.EXTERNAL_SENDS_MODE = "disabled";

  await mongoose.connect(process.env.MONGO_URI);
  await new Promise((r) => setTimeout(r, 600));

  try {
    const admin = await User.create({
      name: "Admin",
      email: "admin-customer-session@test.local",
      password: "hashed",
      role: "admin",
      isActive: true,
      hasPaid: true,
      authVersion: 0,
      maxMessages: 999,
      smsUsed: 1,
    });

    const customerA = await User.create({
      name: "לקוח א",
      email: "customer-a-session@test.local",
      password: "hashed",
      role: "user",
      isActive: true,
      hasPaid: true,
      authVersion: 2,
      plan: "premium",
      maxMessages: 40,
      smsUsed: 5,
      accessModules: { eventProduction: true, rsvpSeating: true },
      includeEventManagement: true,
    });

    const customerB = await User.create({
      name: "לקוח ב",
      email: "customer-b-session@test.local",
      password: "hashed",
      role: "client",
      isActive: true,
      hasPaid: true,
      authVersion: 1,
      plan: "basic",
      maxMessages: 8,
      smsUsed: 1,
    });

    const eventA = await Event.create({
      userId: customerA._id,
      email: customerA.email,
      title: "החתונה של לקוח א",
      date: "2026-11-01",
      status: "active",
      maxGuests: 100,
      budgetTotal: 1000,
      giftCreditUrl: "https://pay.example/a",
    });

    const eventB = await Event.create({
      userId: customerB._id,
      email: customerB.email,
      title: "בר המצווה של לקוח ב",
      date: "2026-12-01",
      status: "active",
      maxGuests: 80,
      budgetTotal: 50,
    });

    const invitationA = await Invitation.create({
      ownerId: customerA._id,
      eventId: eventA._id,
      title: "הזמנה של לקוח א",
      canvasData: {},
    });

    await Invitation.create({
      ownerId: customerB._id,
      eventId: eventB._id,
      title: "הזמנה של לקוח ב",
      canvasData: {},
    });

    const guestA = await InvitationGuest.create({
      invitationId: invitationA._id,
      name: "אורח מקורי",
      token: `token-${customerA._id}`,
      rsvp: "pending",
    });

    const customerToken = signToken({
      userId: String(customerA._id),
      role: "user",
      hasPaid: true,
      authVersion: 2,
    });

    const adminToken = signToken({
      userId: String(admin._id),
      role: "admin",
      hasPaid: true,
      authVersion: 0,
    });

    async function snapshot(token: string) {
      const auth = await getUserIdFromRequest(
        new Request("http://localhost/api/events", {
          headers: { cookie: `authToken=${token}` },
        })
      );
      const eventsRes = await getEvents(authed("/api/events", token));
      const eventsBody = await eventsRes.json();
      const invitationRes = await getMyInvitation(
        authed("/api/invitations/my", token)
      );
      const invitationBody = await invitationRes.json();
      const balanceUser = await User.findById(auth?.userId)
        .select("maxMessages smsUsed")
        .lean();

      return {
        auth,
        eventTitle: eventsBody?.event?.title || null,
        eventBudget: eventsBody?.event?.budgetTotal ?? null,
        invitationTitle: invitationBody?.invitation?.title || null,
        invitationStatus: invitationRes.status,
        maxMessages: (balanceUser as { maxMessages?: number } | null)?.maxMessages ?? null,
        smsUsed: (balanceUser as { smsUsed?: number } | null)?.smsUsed ?? null,
      };
    }

    const asCustomer = await snapshot(customerToken);

    const enterRes = await enterCustomer(
      new NextRequest("http://localhost/api/admin/manage-user", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `authToken=${adminToken}`,
        },
        body: JSON.stringify({ userId: String(customerA._id) }),
      })
    );
    assert.equal(enterRes.status, 200);
    const entered = await enterRes.json();
    assert.equal(entered.success, true);
    assert.equal(entered.redirectTo, "/dashboard");

    const sessionCookies = parseSetCookies(enterRes);
    const sessionToken = sessionCookies.get("authToken") || "";
    assert.ok(sessionToken);

    const asAdminInAccount = await snapshot(sessionToken);

    assert.equal(asAdminInAccount.auth?.userId, String(customerA._id));
    assert.equal(asAdminInAccount.auth?.role, "user");
    assert.equal(asAdminInAccount.auth?.impersonatedByAdmin, true);
    assert.equal(asAdminInAccount.auth?.impersonatedBy, String(admin._id));
    assert.equal(asAdminInAccount.auth?.impersonated, true);

    assert.equal(asCustomer.auth?.userId, String(customerA._id));
    assert.equal(asCustomer.auth?.role, "user");
    assert.equal(asCustomer.auth?.impersonated, false);
    assert.equal(asCustomer.eventTitle, "החתונה של לקוח א");
    assert.equal(asAdminInAccount.eventTitle, asCustomer.eventTitle);
    assert.equal(asAdminInAccount.eventBudget, asCustomer.eventBudget);
    assert.equal(asAdminInAccount.invitationTitle, "הזמנה של לקוח א");
    assert.equal(asCustomer.invitationTitle, asAdminInAccount.invitationTitle);
    assert.equal(asCustomer.maxMessages, 40);
    assert.equal(asAdminInAccount.maxMessages, 40);
    assert.equal(asAdminInAccount.smsUsed, 5);

    const adminPatch = await patchEvents(
      new NextRequest("http://localhost/api/events", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `authToken=${sessionToken}`,
        },
        body: JSON.stringify({ budgetTotal: 2222 }),
      })
    );
    assert.equal(adminPatch.status, 200);

    const customerSeesAdminEdit = await getEvents(authed("/api/events", customerToken));
    const customerEvent = await customerSeesAdminEdit.json();
    assert.equal(customerEvent.event.budgetTotal, 2222);
    assert.equal(String(customerEvent.event.userId), String(customerA._id));

    const customerPatch = await patchEvents(
      new NextRequest("http://localhost/api/events", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `authToken=${customerToken}`,
        },
        body: JSON.stringify({ budgetTotal: 3333, giftCreditUrl: "https://pay.example/updated" }),
      })
    );
    assert.equal(customerPatch.status, 200);

    const adminSeesCustomerEdit = await getEvents(
      authed("/api/events", sessionToken)
    );
    const adminEvent = await adminSeesCustomerEdit.json();
    assert.equal(adminEvent.event.budgetTotal, 3333);
    assert.equal(adminEvent.event.giftCreditUrl, "https://pay.example/updated");

    const guestFromAdmin = await updateGuest(
      new NextRequest(`http://localhost/api/guests/${guestA._id}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: `authToken=${sessionToken}`,
        },
        body: JSON.stringify({ name: "אורח שעודכן על ידי אדמין" }),
      }),
      { params: Promise.resolve({ id: String(guestA._id) }) }
    );
    assert.equal(guestFromAdmin.status, 200);
    const guestAfterAdmin = await InvitationGuest.findById(guestA._id).lean();
    assert.equal((guestAfterAdmin as any).name, "אורח שעודכן על ידי אדמין");

    const guestFromCustomer = await updateGuest(
      new NextRequest(`http://localhost/api/guests/${guestA._id}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: `authToken=${customerToken}`,
        },
        body: JSON.stringify({ name: "אורח שעודכן על ידי הלקוח" }),
      }),
      { params: Promise.resolve({ id: String(guestA._id) }) }
    );
    assert.equal(guestFromCustomer.status, 200);

    const guestAfterCustomer = await InvitationGuest.findById(guestA._id).lean();
    assert.equal((guestAfterCustomer as any).name, "אורח שעודכן על ידי הלקוח");

    const mutationLog = await AdminAuditLog.findOne({
      action: "customer_account_mutation",
      managedUserId: customerA._id,
      adminUserId: admin._id,
    }).lean();
    assert.ok(mutationLog);
    assert.match(String((mutationLog as any).summary), /אדמין/);

    const startLog = await AdminAuditLog.findOne({
      action: "admin_manage_start",
      managedUserId: customerA._id,
    }).lean();
    assert.ok(startLog);

    const switchRes = await enterCustomer(
      new NextRequest("http://localhost/api/admin/manage-user", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookieHeader({
            authToken: sessionToken,
            impersonationToken: sessionToken,
            adminAuthToken: sessionCookies.get("adminAuthToken"),
          }),
        },
        body: JSON.stringify({ userId: String(customerB._id) }),
      })
    );
    assert.equal(switchRes.status, 200);
    const switchedCookies = parseSetCookies(switchRes);
    const switchedToken = switchedCookies.get("authToken") || "";
    const switched = await snapshot(switchedToken);
    assert.equal(switched.auth?.userId, String(customerB._id));
    assert.equal(switched.auth?.role, "client");
    assert.equal(switched.eventTitle, "בר המצווה של לקוח ב");
    assert.equal(switched.invitationTitle, "הזמנה של לקוח ב");
    assert.notEqual(switched.eventTitle, "החתונה של לקוח א");

    const stopRes = await stopImpersonation(
      new Request("http://localhost/api/admin/stop-impersonation", {
        method: "POST",
        headers: {
          cookie: cookieHeader({
            authToken: switchedToken,
            impersonationToken: switchedToken,
            adminAuthToken: switchedCookies.get("adminAuthToken"),
          }),
        },
      })
    );
    assert.equal(stopRes.status, 200);
    const restoredCookies = parseSetCookies(stopRes);
    const restoredToken = restoredCookies.get("authToken") || "";
    const restored = await getUserIdFromRequest(
      new Request("http://localhost/api/events", {
        headers: {
          cookie: cookieHeader({
            authToken: restoredToken,
            adminAuthToken: restoredCookies.get("adminAuthToken"),
          }),
        },
      })
    );
    assert.equal(restored?.userId, String(admin._id));
    assert.equal(restored?.role, "admin");
    assert.equal(restored?.impersonated, false);
    assert.equal(restored?.impersonatedByAdmin, false);
    assert.equal(restored?.adminManagingUserId, null);

    const adminEvents = await getEvents(authed("/api/events", restoredToken));
    const adminEventsBody = await adminEvents.json();
    assert.equal(adminEventsBody.event, null);

    const customerStill = await snapshot(customerToken);
    assert.equal(customerStill.auth?.impersonated, false);
    assert.equal(customerStill.eventTitle, "החתונה של לקוח א");
    assert.equal(customerStill.eventBudget, 3333);

    const leaked = await getUserIdFromRequest(
      new Request("http://localhost/api/events", {
        headers: {
          cookie: cookieHeader({
            authToken: customerToken,
            adminAuthToken: adminToken,
            adminManageUserId: String(customerB._id),
          }),
        },
      })
    );
    assert.equal(leaked?.userId, String(customerA._id));
    assert.equal(leaked?.impersonated, false);
    assert.equal(leaked?.adminManagingUserId, null);

    const manageCookieOnly = await getEvents(
      new NextRequest("http://localhost/api/events", {
        headers: {
          cookie: cookieHeader({
            authToken: adminToken,
            adminManageUserId: String(customerA._id),
          }),
        },
      })
    );
    const manageCookieBody = await manageCookieOnly.json();
    assert.equal(manageCookieBody.event, null);
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }
});
