import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

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

    console.log("🔵 GET GUEST →", {
      id: guest._id,
      arrivedCount: guest.arrivedCount,
    });

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error("❌ GET /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ============================================
   PUT — עדכון אורח
============================================ */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  try {
    await db();

    const data = await req.json();
    console.log("🟠 PUT BODY →", data);

    const guest = await InvitationGuest.findById(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    console.log("🟡 BEFORE UPDATE →", {
      id: guest._id,
      arrivedCount: guest.arrivedCount,
      rsvp: guest.rsvp,
      guestsCount: guest.guestsCount,
    });

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

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Not authorized to update this guest" },
        { status: 403 }
      );
    }

    /* ===============================
       עדכונים מותרים
    =============================== */

    if (typeof data.name === "string") guest.name = data.name;
    if (typeof data.phone === "string") guest.phone = data.phone;
    if (typeof data.relation === "string") guest.relation = data.relation;
    if (typeof data.notes === "string") guest.notes = data.notes;

    if (["yes", "no", "pending"].includes(data.rsvp)) {
      guest.rsvp = data.rsvp;
    }

    if (typeof data.guestsCount === "number" && data.guestsCount >= 1) {
      guest.guestsCount = data.guestsCount;
    }

    // ✅ מגיעים בפועל – קריטי
    if (typeof data.arrivedCount === "number" && data.arrivedCount >= 0) {
      console.log("🟣 SET arrivedCount →", data.arrivedCount);
      guest.arrivedCount = data.arrivedCount;
    }

    await guest.save();

    console.log("🟢 AFTER SAVE →", {
      id: guest._id,
      arrivedCount: guest.arrivedCount,
    });

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
    const isOwner =
      auth?.userId?.toString() === invitation.ownerId.toString();
    const isAdmin = auth?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Not authorized to delete this guest" },
        { status: 403 }
      );
    }

    await guest.deleteOne();

    console.log("🗑️ GUEST DELETED →", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ DELETE /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
