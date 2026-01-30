import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { recalcGroupExpectedCount } from "@/lib/recalcGroupExpectedCount";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/* ============================================
   GET — שליפת אורח יחיד
============================================ */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();

    const guest = await InvitationGuest.findById(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("GET /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   PUT — עדכון אורח / RSVP / קבוצה
============================================ */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();
    const data = await req.json();

    const guest = await InvitationGuest.findById(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = auth.role === "admin";
    const isProducer = auth.role === "producer";


    if (!isOwner && !isAdmin && !isProducer) {

      return NextResponse.json(
        { error: "Not authorized to update this guest" },
        { status: 403 }
      );
    }

    // ✅ נשמור את groupId הקודם כדי לחשב expectedCount לקבוצה הישנה והחדשה
    const beforeGroupId = guest.groupId ? String(guest.groupId) : null;

    /* ===============================
       שדות כלליים
    =============================== */
    if (typeof data.name === "string") guest.name = data.name;
    if (typeof data.phone === "string") guest.phone = data.phone;
    if (typeof data.relation === "string") guest.relation = data.relation;
    if (typeof data.notes === "string") guest.notes = data.notes;

    /* ===============================
       ⭐ groupId — שיוך לקבוצה
       רק בעל האירוע / אדמין
    =============================== */
    if (
      "groupId" in data &&
      (data.groupId === null || typeof data.groupId === "string")
    ) {
      guest.groupId = data.groupId;
    }

    /* ===============================
       RSVP
    =============================== */
    if (["yes", "no", "pending"].includes(data.rsvp)) {
      guest.rsvp = data.rsvp;
    }

    /* ===============================
       🔒 guestsCount — רק בעל האירוע / אדמין
    =============================== */
    if (typeof data.guestsCount === "number" && data.guestsCount >= 1) {
      guest.guestsCount = data.guestsCount;
    }

    /* ===============================
       arrivedCount — נוכחות בפועל
    =============================== */
    if (typeof data.arrivedCount === "number" && data.arrivedCount >= 0) {
      guest.arrivedCount = data.arrivedCount;
    }

    /* ===============================
   ⭐ actualArrivedCount — מגיעים בפועל
   רק מפיק / אדמין
=============================== */
if (
  typeof data.actualArrivedCount === "number" &&
  data.actualArrivedCount >= 0
) {
  const isProducer = auth.role === "producer";

  if (!isProducer && !isAdmin) {
    return NextResponse.json(
      { error: "Not authorized to update actualArrivedCount" },
      { status: 403 }
    );
  }

  guest.actualArrivedCount = data.actualArrivedCount;
}


    await guest.save();

    // ✅ סנכרון expectedCount: רק למי שמגיעים (recalc מסנן rsvp:"yes")
    const afterGroupId = guest.groupId ? String(guest.groupId) : null;

    const affected = new Set<string>();
    if (beforeGroupId) affected.add(beforeGroupId);
    if (afterGroupId) affected.add(afterGroupId);

    for (const gid of affected) {
      await recalcGroupExpectedCount(gid);
    }

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("PUT /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   DELETE — מחיקת אורח
============================================ */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();

    const guest = await InvitationGuest.findById(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const auth = await getUserIdFromRequest();
    const isOwner = auth?.userId?.toString() === invitation.ownerId.toString();
    const isAdmin = auth?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Not authorized to delete this guest" },
        { status: 403 }
      );
    }

    // ✅ נשמור קבוצה לפני מחיקה כדי לעדכן expectedCount
    const groupId = guest.groupId ? String(guest.groupId) : null;

    await guest.deleteOne();

    if (groupId) {
      await recalcGroupExpectedCount(groupId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
