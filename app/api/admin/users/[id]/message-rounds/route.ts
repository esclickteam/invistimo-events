import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   AUTH
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

/* =========================================================
   HELPERS
========================================================= */
function getUnsetFieldsByRoundKey(key: string) {
  if (key.startsWith("rsvp_")) {
    const round = key.split("_")[1];

    return [
      `rsvpRound${round}SentAt`,
      `rsvpSmsRound${round}SentAt`,
      `rsvpWhatsappRound${round}SentAt`,

      `rsvpRound${round}ScheduledAt`,
      `rsvpSmsRound${round}ScheduledAt`,
      `rsvpWhatsappRound${round}ScheduledAt`,
    ];
  }

  if (key === "reminder") {
    return [
      "reminderSentAt",
      "reminderSmsSentAt",
      "reminderWhatsappSentAt",

      "reminderScheduledAt",
      "reminderSmsScheduledAt",
      "reminderWhatsappScheduledAt",
    ];
  }

  if (key === "thankyou") {
    return [
      "thankYouSentAt",
      "thankyouSentAt",
      "thankYouSmsSentAt",
      "thankYouWhatsappSentAt",

      "thankYouScheduledAt",
      "thankyouScheduledAt",
      "thankYouSmsScheduledAt",
      "thankYouWhatsappScheduledAt",
    ];
  }

  return [];
}

/* =========================================================
   PATCH – RESET / BLOCK / UNBLOCK MESSAGE ROUND
========================================================= */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    /* =====================================================
       AUTH
    ===================================================== */
    const auth = await getUserIdFromRequest(req as NextRequest);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* =====================================================
       PARAMS + BODY
    ===================================================== */
    const { id: userId } = await context.params;

    const body = await req.json().catch(() => null);

    const action = body?.action;
    const key = body?.key;

    if (!userId || !key || !["reset", "block", "unblock"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY" },
        { status: 400 }
      );
    }

    /* =====================================================
       USER
    ===================================================== */
    const user = await User.findById(userId).select("_id").lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =====================================================
       INVITATION
    ===================================================== */
    const invitation = await Invitation.findOne({
      ownerId: userId,
    })
      .select("_id")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =====================================================
       RESET – פתיחה מחדש
       מוחק sent/scheduled וגם מסיר חסימה
    ===================================================== */
    if (action === "reset") {
      const fields = getUnsetFieldsByRoundKey(key);

      const unset: Record<string, ""> = {};

      fields.forEach((field) => {
        unset[field] = "";
      });

      unset[`adminMessageRoundLocks.${key}`] = "";

      await Invitation.findByIdAndUpdate(invitation._id, {
        $unset: unset,
      });
    }

    /* =====================================================
       BLOCK – חסימה
    ===================================================== */
    if (action === "block") {
      await Invitation.findByIdAndUpdate(invitation._id, {
        $set: {
          [`adminMessageRoundLocks.${key}`]: true,
        },
      });
    }

    /* =====================================================
       UNBLOCK – ביטול חסימה
    ===================================================== */
    if (action === "unblock") {
      await Invitation.findByIdAndUpdate(invitation._id, {
        $unset: {
          [`adminMessageRoundLocks.${key}`]: "",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ ADMIN MESSAGE ROUND UPDATE ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}