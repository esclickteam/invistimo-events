import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { Types } from "mongoose";
import crypto from "crypto";

export const dynamic = "force-dynamic";

type AuthLike = {
  userId?: string | Types.ObjectId;
  role?: string;
  impersonationRole?: string;
  impersonatedBy?: string | Types.ObjectId;
};

function normalizeEffectiveRole(auth: AuthLike) {
  if (auth?.impersonationRole === "producer_staff") return "producer";
  return auth?.impersonationRole || auth?.role || "";
}

async function getMaxGuestsForOwner(ownerId: string) {
  const owner = await User.findById(ownerId).select("planLimits").lean();
  return owner?.planLimits?.maxGuests ?? 100; // fallback בטוח
}

async function getCurrentGuestsTotal(invitationId: string) {
  const agg = await InvitationGuest.aggregate([
    { $match: { invitationId: new Types.ObjectId(invitationId) } },
    { $group: { _id: null, total: { $sum: "$guestsCount" } } },
  ]);
  return agg?.[0]?.total ?? 0;
}

/* ============================================================
   POST — ייבוא אורחים (Excel / CSV / Client)
============================================================ */
export async function POST(req: NextRequest) {
  try {
    const { invitationId, guests } = await req.json();

    if (!invitationId || !Array.isArray(guests)) {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    await db();

    /* ================= אימות משתמש ================= */
    const auth = (await getUserIdFromRequest(req)) as AuthLike;

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ================= הרשאות ================= */
    const effectiveRole = normalizeEffectiveRole(auth);

    const isOwner = auth.userId.toString() === invitation.ownerId.toString();
    const isAdmin = effectiveRole === "admin";
    const isProducerRole = effectiveRole === "producer";
    const isWorkerRole = effectiveRole === "worker";

    const producerIdStr = invitation.producerId?.toString?.() || null;
    const isProducerByInvitation =
      !!producerIdStr &&
      (auth.userId?.toString?.() === producerIdStr ||
        auth.impersonatedBy?.toString?.() === producerIdStr);

    if (
      !isOwner &&
      !isAdmin &&
      !isProducerRole &&
      !isWorkerRole &&
      !isProducerByInvitation
    ) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ================= הכנת שורות תקינות ================= */
    const normalizedRows = guests
      .map((g: any) => {
        const name = String(g?.name || "").trim();
        if (!name) return null;

        const phoneRaw = String(g?.phone ?? "").replace(/\D/g, "").trim();
        const phone = phoneRaw ? phoneRaw : null;

        const rawTable = g.tableNumber ?? g.table ?? g.tableName ?? null;
        const tableNumber =
          rawTable !== null && rawTable !== "" && Number.isFinite(Number(rawTable))
            ? Number(rawTable)
            : null;

        const guestsCount = Number.isFinite(Number(g.guestsCount))
          ? Math.max(1, Number(g.guestsCount))
          : 1;

        const rsvp = ["yes", "no", "pending"].includes(g?.rsvp)
          ? g.rsvp
          : "pending";

        // אם לא מגיע => arrivedCount = 0, אחרת ברירת מחדל 0 בייבוא
        const arrivedCount = rsvp === "no" ? 0 : 0;

        return {
          invitationId,
          name,
          phone,
          relation: String(g?.relation || "").trim() || null,
          rsvp,
          guestsCount,
          arrivedCount,
          notes: String(g?.notes || "").trim() || null,
          tableNumber,
          tableName: tableNumber !== null ? `שולחן ${tableNumber}` : null,
          token: crypto.randomUUID(),
          actualArrivedCount: 0,
        };
      })
      .filter(Boolean) as any[];

    if (normalizedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_VALID_GUESTS" },
        { status: 400 }
      );
    }

    /* ================= הגבלת חבילה (קריטי) =================
       מחשבים לפי SUM של guestsCount
    ======================================================= */
    const maxGuests = await getMaxGuestsForOwner(invitation.ownerId.toString());
    const currentTotalGuests = await getCurrentGuestsTotal(String(invitationId));
    const importTotalGuests = normalizedRows.reduce(
      (sum, row) => sum + (row.guestsCount || 1),
      0
    );
    const requestedTotalGuests = currentTotalGuests + importTotalGuests;

    if (requestedTotalGuests > maxGuests) {
      return NextResponse.json(
        {
          success: false,
          code: "PLAN_GUEST_LIMIT_EXCEEDED",
          error: `ייבוא חורג ממכסת החבילה. מותר עד ${maxGuests} מוזמנים.`,
          limit: maxGuests,
          currentTotal: currentTotalGuests,
          importTotal: importTotalGuests,
          requestedTotal: requestedTotalGuests,
        },
        { status: 409 }
      );
    }

    /* ================= יצירה ================= */
    await InvitationGuest.insertMany(normalizedRows, { ordered: false });

    return NextResponse.json({
      success: true,
      count: normalizedRows.length,
      importedGuestsCountSum: importTotalGuests,
    });
  } catch (err) {
    console.error("❌ Import guests error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
