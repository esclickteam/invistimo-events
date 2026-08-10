/**
 * READ-ONLY full audit of invite.users (expect 69).
 * Classifies inactive users; never writes unless CONFIRM_FIX_BUG_INACTIVE=1
 * and only for deterministic BUG_INACTIVE rows.
 */
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const uri = readFileSync("/tmp/prod-mongo-uri.txt", "utf8").trim();
const secret = readFileSync("/tmp/prod-jwt-secret.txt", "utf8").trim();
const BASE = "https://www.invistimo.com";
const confirmFix = process.env.CONFIRM_FIX_BUG_INACTIVE === "1";
const skipAccess = process.env.SKIP_ACCESS_PROBE === "1";

async function api(path: string, cookie: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json", Cookie: cookie },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function daysFromNow(dateVal: any): number | null {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / (24 * 3600 * 1000));
}

function classify(row: any): {
  classification: string;
  categoryFlags: string[];
  recommendedAction: string;
  reason: string;
} {
  const flags: string[] = [];
  const role = String(row.role || "user").toLowerCase();
  const isCustomerLike = role === "user" || role === "client";
  const isStaffLike = [
    "admin",
    "staff",
    "producer",
    "producer_staff",
    "venue_owner",
    "venue_user",
  ].includes(role);

  if (row.hasPaid === true && row.eventExists && row.invitationExists && row.isActive === false) {
    flags.push("A_PAID_WITH_EVENT_INV_INACTIVE");
  }
  if (row.hasPaid === true && !row.eventExists) flags.push("B_PAID_NO_EVENT");
  if (row.eventExists && !row.invitationExists) flags.push("C_EVENT_NO_INVITATION");
  if ((row.invitationExists || row.guestCount > 0) && !row.eventExists) {
    flags.push("D_INV_OR_GUESTS_WITHOUT_EVENT");
  }
  if (
    isCustomerLike &&
    row.isActive === true &&
    !row.eventExists &&
    !row.invitationExists &&
    row.hasPaid !== true
  ) {
    flags.push("E_ACTIVE_CUSTOMER_NO_ENTITLEMENT");
  }

  // Inactive classification
  if (row.isActive !== false) {
    let classification = "ACTIVE_OK";
    if (flags.includes("B_PAID_NO_EVENT")) classification = "ACTIVE_PAID_NO_EVENT";
    else if (flags.includes("C_EVENT_NO_INVITATION")) classification = "ACTIVE_EVENT_NO_INV";
    else if (flags.includes("D_INV_OR_GUESTS_WITHOUT_EVENT")) classification = "ACTIVE_ORPHAN_INV";
    else if (flags.includes("E_ACTIVE_CUSTOMER_NO_ENTITLEMENT")) classification = "ACTIVE_EMPTY_CUSTOMER";
    return {
      classification,
      categoryFlags: flags,
      recommendedAction: "NONE",
      reason: "user is active",
    };
  }

  // isActive === false
  // BUG: paid regular customer with both event+invitation still blocked
  if (
    isCustomerLike &&
    row.hasPaid === true &&
    row.eventExists &&
    row.invitationExists
  ) {
    return {
      classification: "BUG_INACTIVE",
      categoryFlags: flags,
      recommendedAction: "SET_IS_ACTIVE_TRUE",
      reason:
        "paid regular customer with Event+Invitation blocked only by isActive=false",
    };
  }

  // VALID: intentionally non-customer roles inactive
  if (isStaffLike && !row.eventExists && row.guestCount === 0) {
    return {
      classification: "VALID_INACTIVE",
      categoryFlags: flags,
      recommendedAction: "NONE",
      reason: `staff/admin/venue role inactive without customer event payload (role=${role})`,
    };
  }

  // VALID: unpaid and no event / no guests — likely abandoned signup
  if (
    row.hasPaid !== true &&
    !row.eventExists &&
    !row.invitationExists &&
    row.guestCount === 0
  ) {
    return {
      classification: "VALID_INACTIVE",
      categoryFlags: flags,
      recommendedAction: "NONE",
      reason: "unpaid account with no event/invitation/guests",
    };
  }

  // VALID: unpaid, event in past, no/low activity — possible intentional disable after completion
  const days = row.eventDaysFromNow;
  if (
    row.hasPaid !== true &&
    row.eventExists &&
    typeof days === "number" &&
    days < -30
  ) {
    return {
      classification: "VALID_INACTIVE",
      categoryFlags: flags,
      recommendedAction: "NONE",
      reason: `event ended ~${Math.abs(days)} days ago; unpaid inactive left unchanged`,
    };
  }

  // CRITICAL integrity: guests/invitation without event
  if (flags.includes("D_INV_OR_GUESTS_WITHOUT_EVENT")) {
    return {
      classification: "UNKNOWN",
      categoryFlags: flags,
      recommendedAction: "INVESTIGATE_NO_AUTOFIX",
      reason: "invitation/guests without event — integrity issue, no auto isActive flip",
    };
  }

  // Paid but missing event — don't auto-activate
  if (flags.includes("B_PAID_NO_EVENT")) {
    return {
      classification: "UNKNOWN",
      categoryFlags: flags,
      recommendedAction: "INVESTIGATE_NO_AUTOFIX",
      reason: "hasPaid=true but no Event — needs manual investigation",
    };
  }

  // Customer-like inactive with event but no invitation
  if (isCustomerLike && row.eventExists && !row.invitationExists) {
    return {
      classification: "UNKNOWN",
      categoryFlags: flags,
      recommendedAction: "INVESTIGATE_NO_AUTOFIX",
      reason: "inactive with event but no invitation",
    };
  }

  // Default unknown for remaining inactive
  return {
    classification: "UNKNOWN",
    categoryFlags: flags,
    recommendedAction: "INVESTIGATE_NO_AUTOFIX",
    reason: "inactive without deterministic paid+event+invitation evidence",
  };
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db!;
  if (db.databaseName !== "invite") throw new Error(`bad db ${db.databaseName}`);

  const users = await db.collection("users").find({}).sort({ createdAt: 1 }).toArray();
  const memberships = await db.collection("venuememberships").find({}).toArray();
  const memberByUser = new Set(memberships.map((m) => String(m.userId || "")));

  const eventIds = new Set(
    (await db.collection("events").find({}, { projection: { _id: 1 } }).toArray()).map((e) =>
      String(e._id)
    )
  );
  const userIds = new Set(users.map((u) => String(u._id)));

  // Integrity scans
  const allEvents = await db
    .collection("events")
    .find({})
    .project({
      _id: 1,
      userId: 1,
      email: 1,
      date: 1,
      status: 1,
      venueAccessStatus: 1,
      venueHallId: 1,
      title: 1,
    })
    .toArray();
  const allInvs = await db
    .collection("invitations")
    .find({})
    .project({
      _id: 1,
      ownerId: 1,
      userId: 1,
      eventId: 1,
      eventDate: 1,
      title: 1,
    })
    .toArray();

  const eventsWithoutUser = allEvents.filter((e) => !userIds.has(String(e.userId)));
  const orphanInvs = allInvs.filter(
    (i) => i.eventId && !eventIds.has(String(i.eventId))
  );
  const invIds = new Set(allInvs.map((i) => String(i._id)));
  const guestInvIds = await db.collection("invitationguests").distinct("invitationId");
  const orphanGuestInvGroups = guestInvIds
    .filter(Boolean)
    .map(String)
    .filter((id) => !invIds.has(id));

  // Duplicate invitations per event
  const invCountByEvent = new Map<string, number>();
  for (const inv of allInvs) {
    if (!inv.eventId) continue;
    const k = String(inv.eventId);
    invCountByEvent.set(k, (invCountByEvent.get(k) || 0) + 1);
  }
  const duplicateInvEvents = [...invCountByEvent.entries()].filter(([, n]) => n > 1);

  // Events per user
  const eventsByUser = new Map<string, any[]>();
  for (const e of allEvents) {
    const uid = String(e.userId || "");
    if (!eventsByUser.has(uid)) eventsByUser.set(uid, []);
    eventsByUser.get(uid)!.push(e);
  }
  const invsByOwner = new Map<string, any[]>();
  for (const inv of allInvs) {
    const oid = String(inv.ownerId || inv.userId || "");
    if (!invsByOwner.has(oid)) invsByOwner.set(oid, []);
    invsByOwner.get(oid)!.push(inv);
  }

  const rows: any[] = [];
  for (const u of users) {
    const uid = String(u._id);
    const userEvents = eventsByUser.get(uid) || [];
    // Prefer event linked from invitation.ownerId
    const ownedInvs = invsByOwner.get(uid) || [];
    let primaryInv = ownedInvs.find((i) => i.eventId && eventIds.has(String(i.eventId))) || ownedInvs[0] || null;
    let primaryEvent = null as any;
    if (primaryInv?.eventId) {
      primaryEvent = allEvents.find((e) => String(e._id) === String(primaryInv.eventId)) || null;
    }
    if (!primaryEvent && userEvents.length) primaryEvent = userEvents[0];

    const guestCount = primaryInv
      ? await db.collection("invitationguests").countDocuments({ invitationId: primaryInv._id })
      : 0;

    const seatingCount = primaryEvent
      ? await db.collection("seatingtables").countDocuments({ eventId: primaryEvent._id })
      : 0;

    // Also count guests via all owned invitations
    let guestsAllInvs = 0;
    for (const inv of ownedInvs) {
      guestsAllInvs += await db
        .collection("invitationguests")
        .countDocuments({ invitationId: inv._id });
    }

    const eventDate = primaryEvent?.date || primaryInv?.eventDate || u.eventDate || null;
    const rowBase = {
      userId: uid,
      email: u.email || null,
      role: u.role || null,
      plan: u.plan || u.priceKey || u.packageKey || null,
      hasPaid: u.hasPaid === true,
      paidAmount: u.paidAmount ?? u.amountPaid ?? null,
      billingSource: u.billingSource || null,
      isActiveBefore: u.isActive === true ? true : u.isActive === false ? false : null,
      isActive: u.isActive === true ? true : u.isActive === false ? false : null,
      eventExists: !!primaryEvent,
      invitationExists: !!ownedInvs.length,
      guestCount: guestsAllInvs || guestCount,
      eventId: primaryEvent ? String(primaryEvent._id) : null,
      invitationId: primaryInv ? String(primaryInv._id) : null,
      eventDate,
      eventDaysFromNow: daysFromNow(eventDate),
      eventStatus: primaryEvent?.status || null,
      venueAccessStatus: primaryEvent?.venueAccessStatus ?? null,
      venueHallId: primaryEvent?.venueHallId ? String(primaryEvent.venueHallId) : null,
      eventsOwnedCount: userEvents.length,
      invitationsOwnedCount: ownedInvs.length,
      seatingDocs: seatingCount,
      hasVenueMembership: memberByUser.has(uid),
      venueOwner: u.venueOwner === true,
      venueUser: u.venueUser === true,
      accessModules: u.accessModules || null,
      incidentReactivatedAt: u.incidentReactivatedAt || null,
      incidentReactivatedReason: u.incidentReactivatedReason || null,
      updatedAt: u.updatedAt || null,
      createdAt: u.createdAt || null,
    };

    const cls = classify(rowBase);
    rows.push({ ...rowBase, ...cls, actionTaken: "NONE", isActiveAfter: rowBase.isActive });
  }

  // Access probes for customer-like users with events (read-only)
  if (!skipAccess) {
    for (const row of rows) {
      const role = String(row.role || "user").toLowerCase();
      const isCustomerLike = role === "user" || role === "client";
      if (!isCustomerLike || !row.eventExists) {
        row.access = { tested: false, pass: null, detail: "not_customer_with_event" };
        continue;
      }

      const useImpersonation = row.isActive === false;
      const token = jwt.sign(
        useImpersonation
          ? {
              userId: row.userId,
              role: "user",
              hasPaid: row.hasPaid,
              authVersion: 0,
              impersonated: true,
              impersonatedByAdmin: true,
              impersonationSourceRole: "admin",
              impersonationRole: "user",
            }
          : {
              userId: row.userId,
              role: role === "client" ? "client" : "user",
              hasPaid: row.hasPaid,
              authVersion: 0,
            },
        secret,
        { expiresIn: "8m" }
      );
      const cookie = useImpersonation
        ? `impersonationToken=${token}`
        : `authToken=${token}`;

      const me = await api("/api/me", cookie);
      const events = await api("/api/events", cookie);
      const invitations = await api("/api/invitations/my", cookie);
      const eventId = events.json?.event?._id ? String(events.json.event._id) : null;
      const invitationId = invitations.json?.invitation?._id
        ? String(invitations.json.invitation._id)
        : null;

      const pass =
        me.json?.success === true &&
        !!eventId &&
        (!row.invitationId || invitationId === row.invitationId || !!invitationId);

      row.access = {
        tested: true,
        mode: useImpersonation ? "impersonation" : "self",
        me: me.status,
        events: events.status,
        invitations: invitations.status,
        eventId,
        invitationId,
        eventMatchesDb: eventId === row.eventId,
        invitationMatchesDb: row.invitationId ? invitationId === row.invitationId : null,
        pass,
      };
    }
  }

  // Optional fix for BUG_INACTIVE only
  const bugInactive = rows.filter((r) => r.classification === "BUG_INACTIVE");
  const fixResults: any[] = [];
  if (confirmFix && bugInactive.length) {
    for (const r of bugInactive) {
      const beforeEventId = r.eventId;
      const beforeInvId = r.invitationId;
      const beforeGuests = r.guestCount;

      const upd = await db.collection("users").updateOne(
        {
          _id: new mongoose.Types.ObjectId(r.userId),
          role: { $in: ["user", "client"] },
          isActive: false,
          hasPaid: true,
        },
        {
          $set: {
            isActive: true,
            incidentReactivatedAt: new Date(),
            incidentReactivatedReason: "audit69-BUG_INACTIVE-paid-event-invitation",
          },
        }
      );

      // verify ids unchanged
      const inv = await db.collection("invitations").findOne({
        _id: new mongoose.Types.ObjectId(beforeInvId),
      });
      const guests = await db
        .collection("invitationguests")
        .countDocuments({ invitationId: new mongoose.Types.ObjectId(beforeInvId) });
      const event = await db.collection("events").findOne({
        _id: new mongoose.Types.ObjectId(beforeEventId),
      });

      const ok =
        upd.modifiedCount === 1 &&
        !!event &&
        !!inv &&
        String(inv.eventId) === beforeEventId &&
        guests === beforeGuests;

      r.actionTaken = upd.modifiedCount === 1 ? "SET_IS_ACTIVE_TRUE" : "NO_CHANGE";
      r.isActiveAfter = upd.modifiedCount === 1 ? true : r.isActive;
      fixResults.push({
        email: r.email,
        matched: upd.matchedCount,
        modified: upd.modifiedCount,
        sameEventId: !!event && String(event._id) === beforeEventId,
        sameInvitationId: !!inv && String(inv._id) === beforeInvId,
        sameGuestCount: guests === beforeGuests,
        ok,
      });
    }
  }

  const counts = {
    TOTAL_USERS: rows.length,
    PAID: rows.filter((r) => r.hasPaid).length,
    WITH_EVENT: rows.filter((r) => r.eventExists).length,
    WITH_INVITATION: rows.filter((r) => r.invitationExists).length,
    WITH_GUESTS: rows.filter((r) => r.guestCount > 0).length,
    ACTIVE: rows.filter((r) => r.isActive === true).length,
    INACTIVE: rows.filter((r) => r.isActive === false).length,
    BUG_INACTIVE: rows.filter((r) => r.classification === "BUG_INACTIVE").length,
    VALID_INACTIVE: rows.filter((r) => r.classification === "VALID_INACTIVE").length,
    UNKNOWN: rows.filter((r) => r.classification === "UNKNOWN").length,
    ORPHAN_EVENTS_NO_USER: eventsWithoutUser.length,
    ORPHAN_INVITATIONS: orphanInvs.length,
    ORPHAN_GUEST_GROUPS: orphanGuestInvGroups.length,
    DUPLICATE_INV_PER_EVENT: duplicateInvEvents.length,
    ACCESS_TESTED: rows.filter((r) => r.access?.tested).length,
    ACCESS_PASS: rows.filter((r) => r.access?.pass === true).length,
    ACCESS_FAIL: rows.filter((r) => r.access?.pass === false).length,
  };

  const out = {
    generatedAt: new Date().toISOString(),
    database: db.databaseName,
    confirmFix,
    counts,
    integrity: {
      eventsWithoutUser: eventsWithoutUser.map((e) => ({
        eventId: String(e._id),
        userId: e.userId ? String(e.userId) : null,
        email: e.email,
      })),
      orphanInvitations: orphanInvs.map((i) => ({
        invitationId: String(i._id),
        eventId: String(i.eventId),
        ownerId: i.ownerId ? String(i.ownerId) : null,
      })),
      orphanGuestInvitationIds: orphanGuestInvGroups.slice(0, 50),
      orphanGuestInvitationIdCount: orphanGuestInvGroups.length,
      duplicateInvitationsPerEvent: duplicateInvEvents.map(([eventId, n]) => ({
        eventId,
        invitationCount: n,
      })),
    },
    fixResults,
    users: rows,
  };

  mkdirSync("/tmp/incident/exports", { recursive: true });
  writeFileSync("/tmp/incident/exports/audit-all-69.json", JSON.stringify(out, null, 2));

  // Compact table
  const table = rows.map((r) => ({
    email: r.email,
    role: r.role,
    hasPaid: r.hasPaid,
    isActiveBefore: r.isActiveBefore,
    isActiveAfter: r.isActiveAfter,
    event: r.eventExists ? "YES" : "NO",
    invitation: r.invitationExists ? "YES" : "NO",
    guestCount: r.guestCount,
    classification: r.classification,
    actionTaken: r.actionTaken,
    access: r.access?.pass === true ? "PASS" : r.access?.pass === false ? "FAIL" : "N/A",
    flags: r.categoryFlags,
    reason: r.reason,
  }));
  writeFileSync("/tmp/incident/exports/audit-all-69-table.json", JSON.stringify(table, null, 2));

  console.log(JSON.stringify({ counts, integrity: out.integrity, bugInactiveEmails: bugInactive.map((b) => b.email), unknownEmails: rows.filter(r=>r.classification==='UNKNOWN').map(r=>({email:r.email,reason:r.reason,flags:r.categoryFlags})), validInactiveEmails: rows.filter(r=>r.classification==='VALID_INACTIVE').map(r=>r.email), accessFails: rows.filter(r=>r.access?.pass===false).map(r=>({email:r.email,access:r.access})), fixResults }, null, 2));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
