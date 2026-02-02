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

    const auth: any = await getUserIdFromRequest(req);

    console.log("👤 Auth:", auth);

    if (!auth?.userId) {
      console.warn("⛔ Unauthorized – no userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = auth.role === "admin";
    const isProducerRole = auth.role === "producer";

    // ✅ מפיק לפי ההזמנה (גם אם נכנס בתור client בדשבורד לקוח)
    const producerIdStr = invitation.producerId?.toString?.() || null;

const isProducerByInvitation =
  !!producerIdStr &&
  (auth.userId.toString() === producerIdStr ||
    auth.impersonatedBy?.toString?.() === producerIdStr);

    console.log("🔐 Permissions:", {
  isOwner,
  isAdmin,
  isProducerRole,
  isProducerByInvitation,
  producerIdStr,
  userId: auth.userId?.toString?.(),
  impersonatedBy: auth.impersonatedBy?.toString?.(),
});

    // הרשאה כללית לעדכן אורח
    if (!isOwner && !isAdmin && !isProducerRole && !isProducerByInvitation) {
      console.warn("⛔ Not authorized to update guest");
      return NextResponse.json(
        { error: "Not authorized to update this guest" },
        { status: 403 }
      );
    }

    // ⭐ groupId קודם (לריקלוקולציה)
    const beforeGroupId = guest.groupId ? String(guest.groupId) : null;

    /* ===============================
       שדות כלליים
    =============================== */
    if (typeof data.name === "string") guest.name = data.name;
    if (typeof data.phone === "string") guest.phone = data.phone;
    if (typeof data.relation === "string") guest.relation = data.relation;
    if (typeof data.notes === "string") guest.notes = data.notes;

    // ✅ groupId — או ObjectId תקין או להסיר שדה לגמרי
if ("groupId" in data) {
  const raw = data.groupId;

  // נרמול ערכי "אין קבוצה" (כולל מחרוזות בעייתיות)
  const cleaned =
    raw === null ||
    raw === undefined ||
    raw === "" ||
    raw === "null" ||
    raw === "undefined"
      ? null
      : String(raw).trim();

  if (cleaned) {
    guest.groupId = cleaned;
  } else {
    guest.groupId = undefined; // ⭐ בפועל: אין groupId במסד
  }
}


    // 1️⃣ קודם guestsCount
if (typeof data.guestsCount === "number" && data.guestsCount >= 1) {
  guest.guestsCount = data.guestsCount;
}

// 2️⃣ RSVP — סטטוס בלבד (לא משנה כמויות)
if (["yes", "no", "pending"].includes(data.rsvp)) {
  guest.rsvp = data.rsvp;

  // אם עבר ל-"לא מגיע" — מאפס מגיעים
  if (data.rsvp === "no") {
    guest.arrivedCount = 0;
  }
}


// 3️⃣ arrivedCount ידני — רק למפיק / אדמין
if (
  typeof data.arrivedCount === "number" &&
  data.arrivedCount >= 0 &&
  (isAdmin || isProducerRole || isProducerByInvitation)
) {
  guest.arrivedCount = data.arrivedCount;
}


    /* ===============================
       ⭐ actualArrivedCount — מגיעים בפועל
       הרשאה:
       - admin תמיד
       - producer role תמיד
       - producer של ההזמנה (userId === invitation.producerId) גם אם role=client
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
  impersonatedBy: auth.impersonatedBy?.toString?.(),
  invitationProducerId: invitation.producerId?.toString?.(),
  invitationOwnerId: invitation.ownerId.toString(),
});

      const canUpdateActualArrived =
        isAdmin || isProducerRole || isProducerByInvitation;

      if (!canUpdateActualArrived) {
        console.warn("⛔ Blocked actualArrivedCount update", {
  role: auth.role,
  userId: auth.userId.toString(),
  impersonatedBy: auth.impersonatedBy?.toString?.(),
  invitationProducerId: invitation.producerId?.toString?.(),
});

        return NextResponse.json(
          { error: "Not authorized to update actualArrivedCount" },
          { status: 403 }
        );
      }

      console.log("✅ actualArrivedCount updated", {
        guestId: guest._id.toString(),
        newValue: data.actualArrivedCount,
        mode: isProducerByInvitation ? "producer-by-invitation" : "role",
      });

      guest.actualArrivedCount = data.actualArrivedCount;
    }

    /* ===============================
   📞 callRounds — סבבי שיחה
   הרשאה:
   - owner
   - admin
   - producer role
   - producer של ההזמנה (impersonation)
=============================== */
if (Array.isArray(data.callRounds)) {
  const canUpdateCallRounds =
    isOwner || isAdmin || isProducerRole || isProducerByInvitation;

  if (!canUpdateCallRounds) {
    console.warn("⛔ Blocked callRounds update", {
      role: auth.role,
      userId: auth.userId.toString(),
      impersonatedBy: auth.impersonatedBy?.toString?.(),
    });

    return NextResponse.json(
      { error: "Not authorized to update callRounds" },
      { status: 403 }
    );
  }

  guest.callRounds = data.callRounds.map(
    (r: any, index: number) => ({
      roundNumber: Number(r.roundNumber ?? index + 1),

      status:
  r.status === "answered" ||
  r.status === "no_answer" ||
  r.status === "will_reply"
    ? r.status
    : null,
          
      notes: typeof r.notes === "string" ? r.notes : "",
      calledAt: r.calledAt ? new Date(r.calledAt) : null,
    })
  );

  console.log("📞 callRounds updated", {
    guestId: guest._id.toString(),
    count: guest.callRounds.length,
  });
}


    await guest.save();
    console.log("💾 Guest saved", guest._id);

    // 🔁 סנכרון קבוצות (expectedCount)
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

    const auth: any = await getUserIdFromRequest(req);

    const isOwner = auth?.userId?.toString() === invitation.ownerId.toString();
    const isAdmin = auth?.role === "admin";

    // (לא משנה את מדיניות המחיקה אצלך)
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
