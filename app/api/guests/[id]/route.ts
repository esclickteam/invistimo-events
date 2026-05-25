import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { recalcGroupExpectedCount } from "@/lib/recalcGroupExpectedCount";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const RSVP_VALUES = new Set(["yes", "no", "pending"]);

const CALL_ANSWER_VALUES = new Set(["answered", "no_answer"]);
const CALL_RESULT_VALUES = new Set([
  "yes",
  "no",
  "will_reply",
  "needs_correction",
]);

/* ============================================
   Helpers
============================================ */
async function getMaxGuestsForInvitationOwner(ownerId: string) {
  const owner = await User.findById(ownerId).lean();

  // ברירת מחדל בטוחה
  return owner?.planLimits?.maxGuests ?? 100;
}

async function getInvitationProducerPermission(auth: any, invitation: any) {
  const producerIdStr = invitation.producerId?.toString?.() || null;

  return {
    producerIdStr,
    isProducerByInvitation:
      !!producerIdStr &&
      (auth.userId?.toString?.() === producerIdStr ||
        auth.impersonatedBy?.toString?.() === producerIdStr),
  };
}

function toSafeNumber(value: any, fallback = 0) {
  const num = Number(value);

  if (!Number.isFinite(num)) return fallback;

  return num;
}

function normalizeCallRoundNotes(notes: any) {
  if (!Array.isArray(notes)) return [];

  return notes
    .map((note) => {
      if (typeof note === "string") {
        const text = note.trim();

        if (!text) return null;

        return {
          text,
          createdAt: new Date(),
          createdBy: "מערכת",
        };
      }

      const text = typeof note?.text === "string" ? note.text.trim() : "";

      if (!text) return null;

      return {
        text,
        createdAt: note?.createdAt ? new Date(note.createdAt) : new Date(),
        createdBy:
          typeof note?.createdBy === "string" && note.createdBy.trim()
            ? note.createdBy.trim()
            : "מערכת",
      };
    })
    .filter(Boolean);
}

function normalizeCallRounds(callRounds: any[]) {
  return callRounds.map((r: any, index: number) => {
    const roundNumber = Number(r?.roundNumber ?? index + 1);

    const answerStatus = CALL_ANSWER_VALUES.has(r?.answerStatus)
      ? r.answerStatus
      : CALL_ANSWER_VALUES.has(r?.status)
        ? r.status
        : null;

    const resultStatus =
      answerStatus === "answered" && CALL_RESULT_VALUES.has(r?.resultStatus)
        ? r.resultStatus
        : null;

    const amount =
      answerStatus === "answered" && resultStatus === "yes"
        ? Math.max(1, toSafeNumber(r?.amount, 1))
        : resultStatus === "no"
          ? 0
          : Math.max(0, toSafeNumber(r?.amount, 0));

    return {
      roundNumber,
      answerStatus,
      resultStatus,
      amount,
      notes: normalizeCallRoundNotes(r?.notes),
      calledAt: r?.calledAt ? new Date(r.calledAt) : answerStatus ? new Date() : null,
      updatedAt: r?.updatedAt ? new Date(r.updatedAt) : new Date(),
    };
  });
}

function getIncomingRsvp(data: any) {
  if (typeof data?.rsvp === "string" && RSVP_VALUES.has(data.rsvp)) {
    return data.rsvp;
  }

  if (
    typeof data?.rsvpStatus === "string" &&
    RSVP_VALUES.has(data.rsvpStatus)
  ) {
    return data.rsvpStatus;
  }

  if (typeof data?.status === "string" && RSVP_VALUES.has(data.status)) {
    return data.status;
  }

  return null;
}

function getIncomingArrivedCount(data: any) {
  if (typeof data?.arrivedCount === "number" && data.arrivedCount >= 0) {
    return data.arrivedCount;
  }

  if (typeof data?.amount === "number" && data.amount >= 0) {
    return data.amount;
  }

  return null;
}

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

    const effectiveRole =
      auth?.impersonationRole === "producer_staff"
        ? "producer"
        : auth?.impersonationRole || auth?.role;

    if (!auth?.userId) {
      console.warn("⛔ Unauthorized – no userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = effectiveRole === "admin";
    const isProducerRole = effectiveRole === "producer";
    const isWorkerRole = effectiveRole === "worker";

    // ✅ חדש: בעל אולם יכול לעדכן אורחים באירוע המשויך אליו,
    // כולל עדכון "מגיעים בפועל" במצב לייב.
    const isVenueOwnerRole = effectiveRole === "venue_owner";

    const { producerIdStr, isProducerByInvitation } =
      await getInvitationProducerPermission(auth, invitation);

    console.log("🔐 Permissions:", {
      isOwner,
      isAdmin,
      isProducerRole,
      isWorkerRole,
      isVenueOwnerRole,
      isProducerByInvitation,
      producerIdStr,
      userId: auth.userId?.toString?.(),
      impersonatedBy: auth.impersonatedBy?.toString?.(),
      effectiveRole,
    });

    // הרשאה כללית לעדכן אורח
    if (
      !isOwner &&
      !isAdmin &&
      !isProducerRole &&
      !isWorkerRole &&
      !isVenueOwnerRole &&
      !isProducerByInvitation
    ) {
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
    if (typeof data.notes === "string") guest.notes = data.notes;

    /* ===============================
       groupId — ידני קודם
    =============================== */
    if ("groupId" in data) {
      const raw = data.groupId;

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
        guest.groupId = undefined;
      }
    }

    /* ===============================
       relation — שיוך אוטומטי אם אין קבוצה
    =============================== */
    if (typeof data.relation === "string") {
      const newRelation = data.relation.trim();
      guest.relation = newRelation;

      // רק אם אחרי הטיפול הידני אין groupId
      if (!guest.groupId && newRelation) {
        const group = await Group.findOneAndUpdate(
          {
            eventId: invitation.eventId,
            name: newRelation,
          },
          {
            $setOnInsert: {
              invitationId: invitation._id,
              eventId: invitation.eventId,
              name: newRelation,
            },
          },
          {
            upsert: true,
            new: true,
          }
        );

        guest.groupId = group._id;
      }
    }

    /* ===============================
       הגבלת חבילה על guestsCount
       (סה"כ מוזמנים לפי guestsCount)
    =============================== */
    if (typeof data.guestsCount === "number" && data.guestsCount >= 1) {
      const nextGuestsCount = data.guestsCount;
      const prevGuestsCount = guest.guestsCount ?? 1;

      if (nextGuestsCount !== prevGuestsCount) {
        const maxGuests = await getMaxGuestsForInvitationOwner(
          invitation.ownerId.toString()
        );

        // סה"כ guestsCount בכל ההזמנה
        const aggregate = await InvitationGuest.aggregate([
          { $match: { invitationId: invitation._id } },
          { $group: { _id: null, total: { $sum: "$guestsCount" } } },
        ]);

        const currentTotalGuestsCount = aggregate?.[0]?.total ?? 0;

        // מורידים את הקודם ומוסיפים חדש
        const nextTotalGuestsCount =
          currentTotalGuestsCount - prevGuestsCount + nextGuestsCount;

        if (nextTotalGuestsCount > maxGuests) {
          return NextResponse.json(
            {
              success: false,
              code: "PLAN_GUEST_LIMIT_EXCEEDED",
              error: `לא ניתן לעדכן. חבילת המשתמש מוגבלת ל-${maxGuests} מוזמנים (כמות מוזמנים כוללת).`,
              limit: maxGuests,
              currentTotal: currentTotalGuestsCount,
              requestedTotal: nextTotalGuestsCount,
            },
            { status: 409 }
          );
        }

        guest.guestsCount = nextGuestsCount;
      }
    }

    /* ===============================
       RSVP — סטטוס + סנכרון מגיעים
    =============================== */
    const incomingRsvp = getIncomingRsvp(data);
    const incomingArrivedCount = getIncomingArrivedCount(data);

    // arrivedCount — מי אמורים להגיע
    if (incomingArrivedCount !== null) {
      guest.arrivedCount = incomingArrivedCount;

      if ("amount" in guest) {
        guest.amount = incomingArrivedCount;
      }
    }

    if (incomingRsvp) {
      guest.rsvp = incomingRsvp as "yes" | "no" | "pending";

      if ("status" in guest) {
        guest.status = incomingRsvp as "yes" | "no" | "pending";
      }

      if (incomingRsvp === "no") {
        guest.arrivedCount = 0;

        if ("amount" in guest) {
          guest.amount = 0;
        }
      }

      if (incomingRsvp === "yes") {
        const nextArrivedCount =
          incomingArrivedCount ??
          guest.arrivedCount ??
          guest.guestsCount ??
          1;

        guest.arrivedCount = Math.max(1, Number(nextArrivedCount || 1));

        if ("amount" in guest) {
          guest.amount = guest.arrivedCount;
        }
      }

      if (incomingRsvp === "pending") {
        const nextArrivedCount =
          incomingArrivedCount !== null
            ? incomingArrivedCount
            : guest.arrivedCount ?? 0;

        guest.arrivedCount = Math.max(0, Number(nextArrivedCount || 0));

        if ("amount" in guest) {
          guest.amount = guest.arrivedCount;
        }
      }
    }

    /* ===============================
       actualArrivedCount — מגיעים בפועל
    =============================== */
    if (
      typeof data.actualArrivedCount === "number" &&
      data.actualArrivedCount >= 0
    ) {
      const canUpdateActualArrived =
        isAdmin ||
        isProducerRole ||
        isWorkerRole ||
        isVenueOwnerRole ||
        isProducerByInvitation;

      if (!canUpdateActualArrived) {
        return NextResponse.json(
          { error: "Not authorized to update actualArrivedCount" },
          { status: 403 }
        );
      }

      guest.actualArrivedCount = data.actualArrivedCount;

      // ✅ רק במצב לייב
      const isLiveMode = invitation.seatingMode === "live";

      if (isLiveMode && data.actualArrivedCount > 0 && guest.rsvp !== "yes") {
        guest.rsvp = "yes";

        if ("status" in guest) {
          guest.status = "yes";
        }

        if (!guest.arrivedCount || guest.arrivedCount === 0) {
          guest.arrivedCount = guest.guestsCount ?? 1;

          if ("amount" in guest) {
            guest.amount = guest.arrivedCount;
          }
        }
      }
    }

    /* ===============================
       callRounds — סבבי שיחה
    =============================== */
    if (Array.isArray(data.callRounds)) {
      const canUpdateCallRounds =
        isOwner || isAdmin || isProducerRole || isProducerByInvitation;

      if (!canUpdateCallRounds) {
        return NextResponse.json(
          { error: "Not authorized to update callRounds" },
          { status: 403 }
        );
      }

      guest.callRounds = normalizeCallRounds(data.callRounds);
    }

    await guest.save();

    // 🔁 סנכרון קבוצות (expectedCount)
    const afterGroupId = guest.groupId ? String(guest.groupId) : null;
    const affected = new Set<string>();

    if (beforeGroupId) affected.add(beforeGroupId);
    if (afterGroupId) affected.add(afterGroupId);

    for (const gid of affected) {
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

    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveRole =
      auth?.impersonationRole === "producer_staff"
        ? "producer"
        : auth?.impersonationRole || auth?.role;

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = effectiveRole === "admin";
    const isProducerRole = effectiveRole === "producer";
    const isWorkerRole = effectiveRole === "worker";

    // ✅ חדש גם כאן: אם תרצי בהמשך שבעל אולם יוכל למחוק אורחים מהאירוע שלו.
    // כרגע זה כלול כדי לשמור על אותה מדיניות כמו PUT.
    const isVenueOwnerRole = effectiveRole === "venue_owner";

    const producerIdStr = invitation.producerId?.toString?.() || null;
    const isProducerByInvitation =
      !!producerIdStr &&
      (auth.userId.toString() === producerIdStr ||
        auth.impersonatedBy?.toString?.() === producerIdStr);

    // אותה מדיניות כמו PUT
    if (
      !isOwner &&
      !isAdmin &&
      !isProducerRole &&
      !isWorkerRole &&
      !isVenueOwnerRole &&
      !isProducerByInvitation
    ) {
      return NextResponse.json(
        { error: "Not authorized to delete this guest" },
        { status: 403 }
      );
    }

    const groupId = guest.groupId ? String(guest.groupId) : null;

    await guest.deleteOne();

    if (groupId) {
      await recalcGroupExpectedCount(groupId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ DELETE /guests/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}