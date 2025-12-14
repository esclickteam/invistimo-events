import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/* ============================================================
   POST — ייבוא אורחים (נתונים מנורמלים מה־Client)
============================================================ */
export async function POST(req: Request) {
  try {
    const { invitationId, guests } = await req.json();

    if (!invitationId || !Array.isArray(guests)) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    await db();

    // 🟢 אימות משתמש
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.ownerId.toString() !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: "Not authorized for this invitation" },
        { status: 403 }
      );
    }

    let importedCount = 0;

    for (const g of guests) {
      // 🛑 ולידציה בסיסית
      if (!g?.name || !g?.phone) continue;

      const phone = String(g.phone).replace(/\D/g, "");

      const payload = {
        invitationId,
        name: String(g.name).trim(),
        phone,
        relation: String(g.relation || "").trim(),

        // ✅ RSVP תקני בלבד
        rsvp: ["yes", "no", "pending"].includes(g.rsvp)
          ? g.rsvp
          : "pending",

        // ✅ מוזמנים (לא ממציאים ערכים)
        guestsCount: Number.isFinite(Number(g.guestsCount))
          ? Number(g.guestsCount)
          : 0,

        // 🚨 קריטי: מגיעים תמיד 0 בייבוא
        arrivedCount: 0,

        notes: String(g.notes || "").trim(),
        tableName: String(g.tableName || "").trim(),

        token: g.token || crypto.randomUUID(),
      };

      // 🔎 אם קיים אורח עם אותו טלפון — עדכון, אחרת יצירה
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
      return NextResponse.json({
        success: false,
        error: "No valid guests found in Excel file",
      });
    }

    return NextResponse.json({
      success: true,
      count: importedCount,
    });
  } catch (err) {
    console.error("❌ Import Excel error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
