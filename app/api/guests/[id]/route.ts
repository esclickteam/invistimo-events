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
    console.log("📥 GET /api/guests/[id]", id);

    const guest = await InvitationGuest.findById(id);
    if (!guest) {
      console.warn("⚠️ Guest not found", id);
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("❌ GET /guests/[id] error:", error);
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
    console.log("🚀 PUT /api/guests/[id] HIT", id);

    const data = await req.json();
    console.log("📦 Payload:", data);

    const guest = await InvitationGuest.findById(id);
    if (!guest) {
      console.warn("⚠️ Guest not found", id);
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const invitation = await Invitation.findById(guest.invitationId);
    if (!invitation) {
      console.warn("⚠️ Invitation not found", guest.invitationId);
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const auth = await getUserIdFromRequest();
    console.log("👤 Auth:", auth);

    if (!auth?.userId) {
      console.warn("⛔ Unauthorized – no userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = auth.role === "admin";
    const isProducer = auth.role === "producer";

    console.log("🔐 Permissions:", {
      isOwner,
      isAdmin,
      isProducer,
    });

    if (!isOwner && !isAdmin && !isProducer) {
      console.warn("⛔ Not authorized to update guest");
      return NextResponse.json(
        { error: "Not authorized to update this guest" },
        { status: 403 }
      );
    }

    // ⭐ groupId קודם
    const beforeGroupId = guest.groupId ? String(guest.groupId) : null;

    /* ===============================
       שדות כלליים
    =============================== */
    if (typeof data.name === "string") guest.name = data.name;
    if (typeof data.phone === "string") guest.phone = data.phone;
    if (typeof data.relation === "string") guest.relation = data.relation;
    if (typeof data.notes === "string") guest.notes = data.notes;

    if (
      "groupId" in data &&
      (data.groupId === null || typeof data.groupId === "string")
    ) {
      guest.groupId = data.groupId;
    }

    if (["yes", "no", "pending"].includes(data.rsvp)) {
      guest.rsvp = data.rsvp;
    }

    if (typeof data.guestsCount === "number" && data.guestsCount >= 1) {
      guest.guestsCount = data.guestsCount;
    }

    if (typeof data.arrivedCount === "number" && data.arrivedCount >= 0) {
      guest.arrivedCount = data.arrivedCount;
    }

    /* ===============================
       ⭐ actualArrivedCount — מגיעים בפועל
    =============================== */
    if (
  typeof data.actualArrivedCount === "number" &&
  data.actualArrivedCount >= 0
) {
  console.log("🟦 actualArrivedCount update requested", {
    guestId: guest._id.toString(),
    value: data.actualArrivedCount,
    role: auth.role,
    userId: auth.userId.toString(),
  });

  if (auth.role !== "producer" && auth.role !== "admin") {
    console.warn("⛔ Blocked actualArrivedCount update", {
      role: auth.role,
      userId: auth.userId.toString(),
    });

    return NextResponse.json(
      { error: "Not authorized to update actualArrivedCount" },
      { status: 403 }
    );
  }

  console.log("✅ actualArrivedCount updated");

  guest.actualArrivedCount = data.actualArrivedCount;
}

    await guest.save();
    console.log("💾 Guest saved", guest._id);

    // 🔁 סנכרון קבוצות
    const afterGroupId = guest.groupId ? String(guest.groupId) : null;
    const affected = new Set<string>();
    if (beforeGroupId) affected.add(beforeGroupId);
    if (afterGroupId) affected.add(afterGroupId);

    for (const gid of affected) {
      console.log("🔄 Recalc expectedCount for group", gid);
      await recalcGroupExpectedCount(gid);
    }

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("❌ PUT /guests/[id] error:", error);
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
    console.log("🗑️ DELETE /api/guests/[id]", id);

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

    const groupId = guest.groupId ? String(guest.groupId) : null;
    await guest.deleteOne();
    console.log("🗑️ Guest deleted", id);

    if (groupId) {
      await recalcGroupExpectedCount(groupId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ DELETE /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
