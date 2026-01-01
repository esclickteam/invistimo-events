import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/* ============================================================
   POST — ייבוא אורחים (Excel / CSV / Client)
============================================================ */
export async function POST(req: Request) {
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

    const auth = await getUserIdFromRequest();

if (!auth?.userId) {
  return NextResponse.json(
    { success: false, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

const userId = auth.userId;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.ownerId.toString() !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    let importedCount = 0;

    /* ================= לולאת ייבוא ================= */

    for (const g of guests) {
      if (!g?.name || !g?.phone) continue;

      const phone = String(g.phone).replace(/\D/g, "");
      if (!phone) continue;

      /* ---------- נרמול מספר שולחן ---------- */
      const rawTable =
        g.tableNumber ?? g.table ?? g.tableName ?? null;

      const tableNumber =
        rawTable !== null && rawTable !== ""
          ? Number(rawTable)
          : null;

      const payload: any = {
        invitationId,

        name: String(g.name).trim(),
        phone,

        relation: String(g.relation || "").trim(),

        rsvp: ["yes", "no", "pending"].includes(g.rsvp)
          ? g.rsvp
          : "pending",

        guestsCount: Number.isFinite(Number(g.guestsCount))
          ? Number(g.guestsCount)
          : 1,

        notes: String(g.notes || "").trim(),

        /* 🪑 הושבה */
        tableNumber,
        tableName:
          tableNumber !== null ? `שולחן ${tableNumber}` : "",

        token: g.token || crypto.randomUUID(),
      };

      /* ---------- upsert לפי טלפון ---------- */
      const existing = await InvitationGuest.findOne({
        invitationId,
        phone,
      });

      if (existing) {
        await InvitationGuest.updateOne(
          { _id: existing._id },
          { $set: payload }
        );
      } else {
        await InvitationGuest.create(payload);
      }

      importedCount++;
    }

    if (importedCount === 0) {
      return NextResponse.json(
        { success: false, error: "NO_VALID_GUESTS" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      count: importedCount,
    });
  } catch (err) {
    console.error("❌ Import guests error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
