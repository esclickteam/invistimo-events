import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Group from "@/models/Group"; // 🔥 חדש
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { invitationId, guests } = await req.json();

    if (!invitationId) {
      return NextResponse.json(
        {
          success: false,
          error: "כדי להוסיף מוזמנים יש ליצור הזמנה תחילה",
          code: "NO_INVITATION",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(guests)) {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const invitation = await Invitation.findById(invitationId)
      .select("_id ownerId producerId eventId") // 🔥 חשוב eventId
      .lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "כדי להוסיף מוזמנים יש ליצור הזמנה תחילה",
          code: "NO_INVITATION",
        },
        { status: 404 }
      );
    }

    const ownerId = invitation.ownerId ? String((invitation as any).ownerId) : null;
    const producerId = invitation.producerId ? String((invitation as any).producerId) : null;

    const canAccess = ownerId === userId || producerId === userId;

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const user = await User.findById(userId).select("guests").lean();
    const limit = Number((user as any)?.guests || 0);

    if (!limit || limit < 1) {
      return NextResponse.json(
        { success: false, error: "GUEST_LIMIT_NOT_CONFIGURED" },
        { status: 400 }
      );
    }

    const current = await InvitationGuest.countDocuments({ invitationId });
    let remaining = Math.max(0, limit - current);

    if (remaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          code: "GUEST_LIMIT_REACHED",
          error: `הגעת למכסה המותרת (${limit}) ולא ניתן לייבא עוד רשומות.`,
          usage: { current, limit, remaining: 0 },
        },
        { status: 409 }
      );
    }

    const validPayloads: any[] = [];

    for (const g of guests) {
      const name = String(g?.name || "").trim();
      if (!name) continue;

      const phone =
        g.phone && String(g.phone).replace(/\D/g, "").trim()
          ? String(g.phone).replace(/\D/g, "")
          : null;

      const rawTable = g.tableNumber ?? g.table ?? g.tableName ?? null;
      const tableNumber =
        rawTable !== null && rawTable !== "" && Number.isFinite(Number(rawTable))
          ? Number(rawTable)
          : null;

      /* ====================================================
         🔥 יצירת קבוצה לפי relation (החלק החדש)
      ==================================================== */

      let groupId = null;

// 🔥 ניקוי אמיתי של relation מהאקסל
const relationRaw = String(g.relation || "")
  .replace(/\u00A0/g, " ") // תווים נסתרים מאקסל
  .trim();

if (relationRaw.length > 0) {
  const relation = relationRaw.toLowerCase();

  const group = await Group.findOneAndUpdate(
    {
      eventId: invitation._id,
      name: relation,
    },
    {
      $setOnInsert: {
        invitationId: invitation._id,
        eventId: invitation._id,
        name: relation,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  groupId = group._id;
}

      /* ==================================================== */

      validPayloads.push({
        invitationId,
        name,
        phone,
        relation: String(g.relation || "").trim() || null,
        groupId, // 🔥 חדש

        rsvp: ["yes", "no", "pending"].includes(g.rsvp) ? g.rsvp : "pending",

        guestsCount: Number.isFinite(Number(g.guestsCount))
          ? Math.max(1, Number(g.guestsCount))
          : 1,

        arrivedCount: 0,
        notes: String(g.notes || "").trim() || null,

        tableNumber,
        tableName: tableNumber !== null ? `שולחן ${tableNumber}` : null,

        token: crypto.randomUUID(),
      });
    }

    if (validPayloads.length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_VALID_GUESTS" },
        { status: 400 }
      );
    }

    const toImport = validPayloads.slice(0, remaining);
    const skippedByLimit = Math.max(0, validPayloads.length - toImport.length);

    await InvitationGuest.insertMany(toImport, { ordered: true });

    const importedCount = toImport.length;
    const newCurrent = current + importedCount;
    const newRemaining = Math.max(0, limit - newCurrent);

    return NextResponse.json({
      success: true,
      count: importedCount,
      skippedByLimit,
      usage: {
        current: newCurrent,
        limit,
        remaining: newRemaining,
      },
      message:
        skippedByLimit > 0
          ? `יובאו ${importedCount} רשומות. ${skippedByLimit} לא יובאו בגלל מגבלת מכסה.`
          : `יובאו ${importedCount} רשומות בהצלחה.`,
    });
  } catch (err) {
    console.error("❌ Import guests error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}